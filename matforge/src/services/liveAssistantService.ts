import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

function getAI() {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY is missing. AI features will be disabled.");
      return new GoogleGenAI({ apiKey: 'dummy-key-to-prevent-crash' });
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
}

export class LiveAssistantSession {
  private session: any = null;
  private audioContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private audioQueue: Int16Array[] = [];
  private isPlaying = false;

  constructor(
    private onTranscription: (text: string, role: 'user' | 'model') => void,
    private onInterrupted: () => void
  ) {}

  async connect() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("GEMINI_API_KEY is not defined in the environment.");
      throw new Error("API Key missing");
    }

    const ai = new GoogleGenAI({ apiKey });
    this.audioContext = new AudioContext({ sampleRate: 16000 });
    
    this.session = await ai.live.connect({
      model: "gemini-2.5-flash-native-audio-preview-09-2025",
      callbacks: {
        onopen: () => {
          this.startMic();
        },
        onmessage: async (message: LiveServerMessage) => {
          if (message.serverContent?.modelTurn?.parts[0]?.inlineData?.data) {
            const base64Audio = message.serverContent.modelTurn.parts[0].inlineData.data;
            this.handleAudioOutput(base64Audio);
          }
          
          if (message.serverContent?.interrupted) {
            this.stopPlayback();
            this.onInterrupted();
          }

          if (message.serverContent?.modelTurn?.parts[0]?.text) {
             this.onTranscription(message.serverContent.modelTurn.parts[0].text, 'model');
          }
        },
        onclose: () => {
          this.stopMic();
        },
        onerror: (err) => {
          console.error("Live API Error:", err);
        }
      },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
        },
        systemInstruction: "You are an elite athletic performance assistant for 'MatForge'. Help the user log workouts conversationally. Be concise and professional.",
      },
    });
  }

  private async startMic() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const source = this.audioContext!.createMediaStreamSource(stream);
    this.processor = this.audioContext!.createScriptProcessor(4096, 1, 1);

    this.processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      const pcmData = this.floatTo16BitPCM(inputData);
      const base64Data = this.arrayBufferToBase64(pcmData.buffer);
      
      this.session.sendRealtimeInput({
        media: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
      });
    };

    source.connect(this.processor);
    this.processor.connect(this.audioContext!.destination);
  }

  private stopMic() {
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
  }

  private handleAudioOutput(base64Data: string) {
    const binaryString = atob(base64Data);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    const pcmData = new Int16Array(bytes.buffer);
    this.audioQueue.push(pcmData);
    if (!this.isPlaying) {
      this.playNextInQueue();
    }
  }

  private async playNextInQueue() {
    if (this.audioQueue.length === 0) {
      this.isPlaying = false;
      return;
    }

    this.isPlaying = true;
    const pcmData = this.audioQueue.shift()!;
    const floatData = this.pcm16ToFloat32(pcmData);
    
    const buffer = this.audioContext!.createBuffer(1, floatData.length, 16000);
    buffer.getChannelData(0).set(floatData);
    
    const source = this.audioContext!.createBufferSource();
    source.buffer = buffer;
    source.connect(this.audioContext!.destination);
    source.onended = () => this.playNextInQueue();
    source.start();
  }

  private stopPlayback() {
    this.audioQueue = [];
    this.isPlaying = false;
  }

  private floatTo16BitPCM(output: Float32Array) {
    const buffer = new ArrayBuffer(output.length * 2);
    const view = new DataView(buffer);
    for (let i = 0; i < output.length; i++) {
      const s = Math.max(-1, Math.min(1, output[i]));
      view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    return new Int16Array(buffer);
  }

  private pcm16ToFloat32(pcm: Int16Array) {
    const float32 = new Float32Array(pcm.length);
    for (let i = 0; i < pcm.length; i++) {
      float32[i] = pcm[i] / 32768;
    }
    return float32;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  close() {
    this.stopMic();
    this.stopPlayback();
    if (this.session) this.session.close();
    if (this.audioContext) this.audioContext.close();
  }
}
