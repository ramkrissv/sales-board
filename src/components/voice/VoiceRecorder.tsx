'use client';

import { useState, useRef, useCallback } from 'react';
import { Mic, Square, Loader2, Play, Pause, Upload, Trash2 } from 'lucide-react';

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
  const [transcript, setTranscript] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
    } catch (err) {
      console.error('Microphone access denied:', err);
      alert('Please allow microphone access to record voice notes.');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [isRecording]);

  const togglePlayback = () => {
    if (!audioUrl) return;
    if (!audioRef.current) {
      audioRef.current = new Audio(audioUrl);
      audioRef.current.onended = () => setIsPlaying(false);
    }
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const discard = () => {
    setAudioBlob(null);
    setAudioUrl(null);
    setDuration(0);
    setTranscript('');
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
  };

  const handleSubmit = () => {
    if (transcript.trim()) {
      onTranscript(transcript.trim(), audioBlob || undefined);
    }
  };

  const formatDuration = (s: number) => `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;

  return (
    <div className="space-y-4">
      {/* Recording controls */}
      <div className="flex items-center justify-center gap-4 py-6">
        {!isRecording && !audioBlob ? (
          <button onClick={startRecording}
            className="w-20 h-20 rounded-full bg-[#7c3aed] hover:bg-[#6d28d9] text-white flex items-center justify-center transition-all hover:scale-105 shadow-lg shadow-[#7c3aed]/25">
            <Mic className="h-8 w-8" />
          </button>
        ) : isRecording ? (
          <div className="flex flex-col items-center gap-3">
            <button onClick={stopRecording}
              className="w-20 h-20 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-all animate-pulse shadow-lg shadow-red-500/25">
              <Square className="h-6 w-6" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-sm font-mono text-foreground">{formatDuration(duration)}</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <button onClick={togglePlayback}
              className="w-12 h-12 rounded-full bg-card border border-border flex items-center justify-center text-foreground hover:bg-secondary transition-colors">
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
            </button>
            <div>
              <div className="text-sm text-foreground">Recording captured</div>
              <div className="text-xs text-muted-foreground">{formatDuration(duration)}</div>
            </div>
            <button onClick={discard} className="p-2 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {!isRecording && (
        <>
          <div className="text-center text-xs text-muted-foreground">
            {!audioBlob ? 'Click to start recording \u00b7 or paste transcript below' : 'Add transcript or notes about this recording'}
          </div>

          {/* Transcript input */}
          <textarea
            value={transcript}
            onChange={e => setTranscript(e.target.value)}
            placeholder={audioBlob
              ? "Add context, key points, or full transcript of the recording..."
              : "Or paste your voice note transcript / meeting notes here..."
            }
            rows={5}
            className="w-full px-4 py-3 text-sm bg-card border border-border rounded-xl text-foreground placeholder:text-muted-foreground resize-y font-mono"
          />

          {transcript.trim() && (
            <button onClick={handleSubmit} disabled={isProcessing}
              className="w-full flex items-center gap-2 justify-center px-4 py-3 rounded-xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-medium transition-colors disabled:opacity-50">
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {isProcessing ? 'Processing...' : 'Process Voice Note'}
            </button>
          )}
        </>
      )}
    </div>
  );
}
