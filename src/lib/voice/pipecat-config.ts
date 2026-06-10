/**
 * Pipecat Voice AI Configuration
 *
 * When a Pipecat Python server is running, the client connects via WebRTC/WebSocket
 * for real-time voice conversation with the sales AI agent.
 *
 * Setup:
 * 1. Run the Pipecat Python server (see /pipecat-server/README.md)
 * 2. Set PIPECAT_SERVER_URL in .env.local
 * 3. The VoiceRecorder component will auto-detect and use real-time mode
 */

export const PIPECAT_CONFIG = {
  // Server URL (set when Pipecat Python server is running)
  serverUrl: process.env.NEXT_PUBLIC_PIPECAT_SERVER_URL || '',

  // Whether real-time voice is available
  isRealTimeAvailable: !!process.env.NEXT_PUBLIC_PIPECAT_SERVER_URL,

  // Voice agent personality
  agentConfig: {
    name: 'Galent Sales AI',
    voice: 'alloy', // OpenAI TTS voice
    personality: 'Professional, concise, focused on extracting deal intelligence',
    systemPrompt: `You are Galent Sales AI, a voice assistant for sales professionals.
    When the user speaks about a deal, meeting, or sales activity:
    1. Extract the customer name, deal details, and action items
    2. Ask clarifying questions if key information is missing
    3. Confirm what you'll log before saving
    4. Keep responses short (under 30 seconds of speech)`,
  },

  // Audio settings
  audio: {
    sampleRate: 16000,
    channels: 1,
    encoding: 'pcm_s16le',
  },

  // Transcription settings
  transcription: {
    provider: 'deepgram', // or 'whisper'
    language: 'en',
    model: 'nova-2',
  },
};

/**
 * Check if Pipecat real-time voice is available
 */
export function isPipecatAvailable(): boolean {
  return PIPECAT_CONFIG.isRealTimeAvailable;
}
