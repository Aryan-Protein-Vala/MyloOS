let activeRecorder: MediaRecorder | null = null;
let activeStream: MediaStream | null = null;
let recordedChunks: Blob[] = [];
let recordedMimeType = 'audio/webm';
let currentAudioElement: HTMLAudioElement | null = null;
let currentAudioUrl: string | null = null;

function stopAndRevokeCurrentAudio() {
  if (currentAudioElement) {
    try {
      currentAudioElement.pause();
    } catch {}
    currentAudioElement = null;
  }
  if (currentAudioUrl) {
    URL.revokeObjectURL(currentAudioUrl);
    currentAudioUrl = null;
  }
}

export interface TranscriptionResult {
  text: string | null;
  error?: string;
}

function getOptimalMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return '';
  if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
    return 'audio/webm;codecs=opus';
  }
  if (MediaRecorder.isTypeSupported('audio/mp4')) {
    return 'audio/mp4';
  }
  if (MediaRecorder.isTypeSupported('audio/webm')) {
    return 'audio/webm';
  }
  return '';
}

export async function startRecording(): Promise<boolean> {
  try {
    // If a recording is already active, do not overwrite without cleanup
    if (activeRecorder && activeRecorder.state === 'recording') {
      return true;
    }

    // Release any previous lingering tracks
    if (activeStream) {
      activeStream.getTracks().forEach((track) => track.stop());
      activeStream = null;
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    activeStream = stream;

    const mimeType = getOptimalMimeType();
    const options: MediaRecorderOptions = mimeType ? { mimeType } : {};
    
    const recorder = new MediaRecorder(stream, options);
    recordedMimeType = recorder.mimeType || mimeType || 'audio/webm';
    recordedChunks = [];

    recorder.ondataavailable = (event: BlobEvent) => {
      if (event.data && event.data.size > 0) {
        recordedChunks.push(event.data);
      }
    };

    activeRecorder = recorder;
    // Collect timeslices every 200ms to ensure all chunks are flushed reliably
    recorder.start(200);
    return true;
  } catch (err) {
    console.error("Error accessing microphone or initializing recorder:", err);
    if (activeStream) {
      activeStream.getTracks().forEach((track) => track.stop());
      activeStream = null;
    }
    activeRecorder = null;
    return false;
  }
}

export async function stopRecordingAndTranscribe(groqApiKey: string): Promise<TranscriptionResult> {
  return new Promise((resolve) => {
    const recorder = activeRecorder;
    const stream = activeStream;

    if (!recorder || recorder.state === 'inactive') {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        activeStream = null;
      }
      activeRecorder = null;
      resolve({ text: null, error: 'Recorder not active' });
      return;
    }

    recorder.onstop = async () => {
      // Release microphone tracks immediately
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      activeStream = null;
      activeRecorder = null;

      const mimeType = recordedMimeType.split(';')[0] || 'audio/webm';
      const audioBlob = new Blob(recordedChunks, { type: mimeType });
      recordedChunks = [];

      if (audioBlob.size < 100) {
        // Ignored very short click / empty buffer
        resolve({ text: null, error: 'Audio recording too short or empty.' });
        return;
      }

      if (!groqApiKey || !groqApiKey.trim()) {
        console.warn("Groq API key not provided for transcription.");
        resolve({ text: null, error: 'Groq API Key required for voice.' });
        return;
      }

      try {
        const fileExt = mimeType.includes('mp4') ? 'm4a' : 'webm';
        const formData = new FormData();
        formData.append('file', audioBlob, `audio.${fileExt}`);
        formData.append('model', 'whisper-large-v3');

        const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${groqApiKey.trim()}`,
          },
          body: formData,
        });

        if (!response.ok) {
          const errText = await response.text();
          const errMsg = `Groq API error ${response.status}: ${errText || response.statusText}`;
          console.error(errMsg);
          resolve({ text: null, error: errMsg });
          return;
        }

        const data = (await response.json()) as { text?: string };
        resolve({ text: data.text || null });
      } catch (err) {
        console.error("Error transcribing audio with Groq:", err);
        resolve({ text: null, error: err instanceof Error ? err.message : String(err) });
      }
    };

    try {
      recorder.stop();
    } catch (e) {
      console.error("Error stopping MediaRecorder:", e);
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      activeStream = null;
      activeRecorder = null;
      resolve({ text: null, error: 'Failed to stop recorder' });
    }
  });
}

export async function playTTS(text: string, sarvamApiKey: string): Promise<void> {
  if (!text || !text.trim() || !sarvamApiKey || !sarvamApiKey.trim()) {
    return;
  }

  // Stop and cleanup any ongoing speech
  stopAndRevokeCurrentAudio();

  try {
    const response = await fetch('https://api.sarvam.ai/text-to-speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-subscription-key': sarvamApiKey.trim(),
      },
      body: JSON.stringify({
        inputs: [text.trim()],
        target_language_code: 'en-IN',
        speaker: 'meera',
        model: 'bulbul:v3',
        pace: 1.0,
        speech_sample_rate: 24000,
        enable_preprocessing: true,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Sarvam API error ${response.status}: ${errText || response.statusText}`);
    }

    const data = (await response.json()) as { audios?: string[] };
    if (data.audios && data.audios.length > 0 && data.audios[0]) {
      const binaryString = atob(data.audios[0]);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const blob = new Blob([bytes.buffer], { type: 'audio/wav' });
      const url = URL.createObjectURL(blob);
      currentAudioUrl = url;
      const audio = new Audio(url);
      currentAudioElement = audio;

      const cleanup = () => {
        stopAndRevokeCurrentAudio();
      };

      audio.onended = cleanup;
      audio.onerror = cleanup;

      await audio.play().catch((playErr) => {
        console.warn("Audio playback blocked by autoplay policy:", playErr);
        cleanup();
      });
    }
  } catch (err) {
    console.error("Error generating or playing TTS:", err);
  }
}
