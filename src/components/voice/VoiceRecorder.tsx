'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, Square, Loader2, Play, Pause, Trash2, Sparkles } from 'lucide-react';

interface VoiceRecorderProps {
  onTranscript: (transcript: string, audioBlob?: Blob) => void;
  isProcessing?: boolean;
}

export function VoiceRecorder({ onTranscript, isProcessing }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [liveTranscript, setLiveTranscript] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playbackTimerRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionRef = useRef<any>(null);

  // Initialize Web Speech API for real-time transcription
  const startSpeechRecognition = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return; // Not supported

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    let finalTranscript = '';

    recognition.onresult = (event: any) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript + ' ';
          setTranscript(finalTranscript.trim());
        } else {
          interim += result[0].transcript;
        }
      }
      setLiveTranscript(interim);
    };

    recognition.onerror = () => { /* Silently handle — user can type manually */ };
    recognition.onend = () => {
      setLiveTranscript('');
      setIsTranscribing(false);
    };

    recognition.start();
    recognitionRef.current = recognition;
    setIsTranscribing(true);
  }, []);

  const stopSpeechRecognition = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setLiveTranscript('');
    setIsTranscribing(false);
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setDuration(0);
      setTranscript('');
      setLiveTranscript('');
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);

      // Start real-time transcription
      startSpeechRecognition();
    } catch (err) {
      console.error('Microphone access denied:', err);
      alert('Please allow microphone access to record voice notes.');
    }
  }, [startSpeechRecognition]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
      stopSpeechRecognition();
    }
  }, [isRecording, stopSpeechRecognition]);

  const togglePlayback = () => {
    if (!audioUrl) return;
    if (!audioRef.current) {
      audioRef.current = new Audio(audioUrl);
      audioRef.current.onended = () => {
        setIsPlaying(false);
        setPlaybackTime(0);
        if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
      };
    }
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
      playbackTimerRef.current = setInterval(() => {
        if (audioRef.current) setPlaybackTime(Math.floor(audioRef.current.currentTime));
      }, 200);
    }
  };

  const discard = () => {
    setAudioBlob(null);
    setAudioUrl(null);
    setDuration(0);
    setPlaybackTime(0);
    setTranscript('');
    setLiveTranscript('');
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
  };

  const handleSubmit = () => {
    const text = transcript.trim() || `[Voice recording — ${formatDuration(duration)}]`;
    onTranscript(text, audioBlob || undefined);
  };

  const formatDuration = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="space-y-4">
      {/* Recording controls */}
      <div className="flex items-center justify-center gap-4 py-6">
        {!isRecording && !audioBlob ? (
          <button onClick={startRecording}
            className="w-20 h-20 rounded-full bg-[#5B4FE9] hover:bg-[#4A3ED4] text-white flex items-center justify-center transition-all hover:scale-105 shadow-lg shadow-[#5B4FE9]/25">
            <Mic className="h-8 w-8" />
          </button>
        ) : isRecording ? (
          <div className="flex flex-col items-center gap-3 w-full">
            <button onClick={stopRecording}
              className="w-20 h-20 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-all animate-pulse shadow-lg shadow-red-500/25">
              <Square className="h-6 w-6" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-sm font-mono text-foreground">{formatDuration(duration)}</span>
              {isTranscribing && <span className="text-[10px] text-emerald-400">Transcribing live...</span>}
            </div>
            {/* Live transcript preview */}
            {(transcript || liveTranscript) && (
              <div className="w-full p-3 rounded-lg bg-card border border-border text-xs text-foreground max-h-24 overflow-y-auto">
                {transcript && <span>{transcript} </span>}
                {liveTranscript && <span className="text-muted-foreground italic">{liveTranscript}</span>}
              </div>
            )}
          </div>
        ) : (
          /* Post-recording: playback controls */
          <div className="w-full">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border">
              <button onClick={togglePlayback}
                className="w-10 h-10 rounded-full bg-[#5B4FE9] flex items-center justify-center text-white hover:bg-[#4A3ED4] transition-colors flex-shrink-0">
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
              </button>

              {/* Progress bar */}
              <div className="flex-1">
                <div className="w-full h-1.5 rounded-full bg-border overflow-hidden">
                  <div className="h-full rounded-full bg-[#5B4FE9] transition-all"
                    style={{ width: `${duration > 0 ? (playbackTime / duration) * 100 : 0}%` }} />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[10px] font-mono text-muted-foreground">{formatDuration(playbackTime)}</span>
                  <span className="text-[10px] font-mono text-muted-foreground">{formatDuration(duration)}</span>
                </div>
              </div>

              <button onClick={discard} className="p-2 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors flex-shrink-0">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {!isRecording && (
        <>
          <div className="text-center text-xs text-muted-foreground">
            {!audioBlob ? 'Click to start recording — auto-transcribes as you speak' :
             transcript ? 'Transcript captured — review and edit below' : 'Add notes or context below'}
          </div>

          {/* Transcript / notes input */}
          <textarea
            value={transcript}
            onChange={e => setTranscript(e.target.value)}
            placeholder={audioBlob
              ? "Review transcript, add context or key points..."
              : "Or paste your voice note transcript / meeting notes here..."
            }
            rows={4}
            className="w-full px-4 py-3 text-sm bg-card border border-border rounded-xl text-foreground placeholder:text-muted-foreground resize-y"
          />

          {/* Process button — enabled after recording OR transcript */}
          {(audioBlob || transcript.trim()) && (
            <button onClick={handleSubmit} disabled={isProcessing}
              className="w-full flex items-center gap-2 justify-center px-4 py-3 rounded-xl bg-[#5B4FE9] hover:bg-[#4A3ED4] text-white font-medium transition-colors disabled:opacity-50">
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {isProcessing ? 'Processing...' : 'Process with AI'}
            </button>
          )}
        </>
      )}
    </div>
  );
}
