let activeRecorder: MediaRecorder | null = null;
let activeStream: MediaStream | null = null;
let recordedChunks: Blob[] = [];
let recordedMimeType = 'audio/webm';
let currentAudioElement: HTMLAudioElement | null = null;
let currentAudioUrl: string | null = null;
let currentTtsRequestId = 0;
let currentTtsAbortController: AbortController | null = null;
let recordingSessionId = 0;
let isStartingRecording = false;

export function stopAndRevokeCurrentAudio(): void {
  currentTtsRequestId++;
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {}
  }
  if (currentTtsAbortController) {
    try {
      currentTtsAbortController.abort();
    } catch {}
    currentTtsAbortController = null;
  }
  if (currentAudioElement) {
    try {
      currentAudioElement.pause();
      currentAudioElement.src = '';
    } catch {}
    currentAudioElement = null;
  }
  if (currentAudioUrl) {
    URL.revokeObjectURL(currentAudioUrl);
    currentAudioUrl = null;
  }
}

export function cancelRecording(): void {
  recordingSessionId++;
  isStartingRecording = false;

  if (activeRecorder) {
    try {
      activeRecorder.ondataavailable = null;
      activeRecorder.onstop = null;
      if (activeRecorder.state !== 'inactive') {
        activeRecorder.stop();
      }
    } catch (e) {
      console.warn("Error stopping activeRecorder during cancelRecording:", e);
    }
    activeRecorder = null;
  }

  if (activeStream) {
    try {
      activeStream.getTracks().forEach((track) => track.stop());
    } catch (e) {
      console.warn("Error stopping tracks during cancelRecording:", e);
    }
    activeStream = null;
  }

  recordedChunks = [];
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
      try {
        activeStream.getTracks().forEach((track) => track.stop());
      } catch {}
      activeStream = null;
    }

    const currentSessionId = ++recordingSessionId;
    isStartingRecording = true;

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    // Guard against rapid press-and-release races while getUserMedia was in-flight
    if (currentSessionId !== recordingSessionId || !isStartingRecording) {
      console.warn("Recording was cancelled or stopped while getUserMedia was in-flight. Immediately stopping stream tracks.");
      try {
        stream.getTracks().forEach((track) => track.stop());
      } catch (e) {
        console.warn("Error stopping tracks on aborted recording start:", e);
      }
      return false;
    }

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
    isStartingRecording = false;
    // Collect timeslices every 200ms to ensure all chunks are flushed reliably
    recorder.start(200);
    return true;
  } catch (err) {
    isStartingRecording = false;
    console.error("Error accessing microphone or initializing recorder:", err);
    if (activeStream) {
      try {
        activeStream.getTracks().forEach((track) => track.stop());
      } catch {}
      activeStream = null;
    }
    activeRecorder = null;
    return false;
  }
}

export async function stopRecordingAndTranscribe(groqApiKey: string): Promise<TranscriptionResult> {
  recordingSessionId++;
  const wasStarting = isStartingRecording;
  isStartingRecording = false;

  return new Promise((resolve) => {
    const recorder = activeRecorder;
    const stream = activeStream;

    if (!recorder || recorder.state === 'inactive') {
      if (stream) {
        try {
          stream.getTracks().forEach((track) => track.stop());
        } catch {}
        activeStream = null;
      }
      activeRecorder = null;
      resolve({ text: null, error: wasStarting ? 'Audio recording cancelled or too short.' : 'Recorder not active' });
      return;
    }

    recorder.onstop = async () => {
      // Release microphone tracks immediately
      if (stream) {
        try {
          stream.getTracks().forEach((track) => track.stop());
        } catch {}
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
        try {
          stream.getTracks().forEach((track) => track.stop());
        } catch {}
      }
      activeStream = null;
      activeRecorder = null;
      resolve({ text: null, error: 'Failed to stop recorder' });
    }
  });
}

function playWebSpeechFallback(text: string, requestId: number): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return;
  }
  if (requestId !== currentTtsRequestId) {
    return;
  }
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  } catch (e) {
    console.warn("SpeechSynthesis fallback failed:", e);
  }
}

export async function playTTS(text: string, sarvamApiKey?: string): Promise<void> {
  if (!text || !text.trim()) {
    return;
  }

  // Stop and cleanup any ongoing speech
  stopAndRevokeCurrentAudio();

  const requestId = currentTtsRequestId;

  // Fall back to Web Speech API if Sarvam key is missing
  if (!sarvamApiKey || !sarvamApiKey.trim()) {
    playWebSpeechFallback(text.trim(), requestId);
    return;
  }

  const abortController = new AbortController();
  currentTtsAbortController = abortController;

  try {
    const response = await fetch('https://api.sarvam.ai/text-to-speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-subscription-key': sarvamApiKey.trim(),
      },
      signal: abortController.signal,
      body: JSON.stringify({
        inputs: [text.trim()],
        target_language_code: 'en-IN',
        speaker: 'meera',
        model: 'bulbul:v1',
        pace: 1.0,
        speech_sample_rate: 24000,
        enable_preprocessing: true,
      }),
    });

    if (requestId !== currentTtsRequestId) {
      return;
    }

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Sarvam API error ${response.status}: ${errText || response.statusText}`);
    }

    const data = (await response.json()) as { audios?: string[] };
    if (requestId !== currentTtsRequestId) {
      return;
    }

    if (data.audios && data.audios.length > 0 && data.audios[0]) {
      const binaryString = atob(data.audios[0]);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      if (requestId !== currentTtsRequestId) {
        return;
      }

      const blob = new Blob([bytes.buffer], { type: 'audio/wav' });
      const url = URL.createObjectURL(blob);

      if (requestId !== currentTtsRequestId) {
        URL.revokeObjectURL(url);
        return;
      }

      currentAudioUrl = url;
      const audio = new Audio(url);
      currentAudioElement = audio;

      const cleanup = () => {
        if (currentTtsRequestId === requestId) {
          stopAndRevokeCurrentAudio();
        }
      };

      audio.onended = cleanup;
      audio.onerror = cleanup;

      if (requestId !== currentTtsRequestId) {
        cleanup();
        return;
      }

      await audio.play().catch((playErr) => {
        console.warn("Audio playback blocked by autoplay policy, falling back to Web Speech:", playErr);
        cleanup();
        if (requestId === currentTtsRequestId) {
          playWebSpeechFallback(text.trim(), requestId);
        }
      });
    } else {
      playWebSpeechFallback(text.trim(), requestId);
    }
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return;
    }
    console.error("Error generating or playing TTS via Sarvam, falling back to Web Speech API:", err);
    if (requestId === currentTtsRequestId) {
      playWebSpeechFallback(text.trim(), requestId);
    }
  } finally {
    if (currentTtsAbortController === abortController) {
      currentTtsAbortController = null;
    }
  }
}
