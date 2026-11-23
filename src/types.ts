export type WorkspaceMode = "narration" | "dialogue" | "scenes";

export type TtsModelId =
  | "gemini-2.5-flash-preview-tts"
  | "gemini-2.5-pro-preview-tts";

export type SpeedPresetId = "slow" | "normal" | "fast";

export type VocalStyleId =
  | "narrador_calido"
  | "cinematografico"
  | "educativo"
  | "infantil"
  | "serio"
  | "alegre"
  | "suspenso"
  | "documental"
  | "conversacional"
  | "tecnico";

export type EmotionId =
  | "neutral_calido"
  | "confianza"
  | "alegria"
  | "curiosidad"
  | "asombro"
  | "ternura"
  | "suspenso"
  | "urgencia"
  | "serenidad"
  | "tristeza"
  | "humor";

export type EmotionIntensity = "sutil" | "moderada" | "marcada";

export type PauseStyleId = "natural" | "conversacional" | "dramatica" | "pausada";

export type RegionalVariantId =
  | "es_latam_sv"
  | "es_latam_neutro"
  | "es_mx"
  | "es_co"
  | "es_ar"
  | "es_es";

export interface VoiceOption {
  id: string;
  name: string;
  gender: "female" | "male";
  label: string;
  sampleLine: string;
}

export interface StyleOption {
  id: VocalStyleId;
  name: string;
  cue: string;
}

export interface EmotionOption {
  id: EmotionId;
  name: string;
  cue: string;
}

export interface PronunciationEntry {
  id: string;
  term: string;
  spokenForm: string;
}

export interface AudioQualityMetrics {
  sampleRate: number;
  bitDepth: number;
  channels: number;
  durationSec: number;
  rmsDb: number;
  peakDb: number;
  clippedSamples: number;
  isEmpty: boolean;
  warnings: string[];
  modelUsed: string;
}

export interface TranscriptionQaResult {
  transcript: string;
  wordMatchPercent: number;
  missingWords: string[];
  note: string;
  checkedAt: string;
}

export interface SceneItem {
  id: string;
  title: string;
  speaker: string;
  voiceId: string;
  text: string;
  styleId: VocalStyleId;
  emotionId: EmotionId;
  pauseAfterMs: number;
  status: "idle" | "generating" | "ready" | "error";
  errorMessage?: string;
  audioWavUrl?: string;
  audioWavBase64?: string;
  quality?: AudioQualityMetrics;
}

export interface GeneratedTake {
  id: string;
  title: string;
  mode: WorkspaceMode;
  voiceSummary: string;
  styleName: string;
  textForQa: string;
  createdAt: string;
  durationSec: number;
  sampleRate: number;
  modelUsed: string;
  quality?: AudioQualityMetrics;
  qaResult?: TranscriptionQaResult;
  wavUrl?: string;
  wavBlob?: Blob;
  mp3Blob?: Blob;
}

export interface StudioState {
  mode: WorkspaceMode;
  script: string;
  dialogueScript: string;
  speaker1Name: string;
  speaker1Voice: string;
  speaker2Name: string;
  speaker2Voice: string;
  voiceId: string;
  styleId: VocalStyleId;
  speedPreset: SpeedPresetId;
  ttsModel: TtsModelId;
  emotionId: EmotionId;
  emotionIntensity: EmotionIntensity;
  pauseStyle: PauseStyleId;
  regionalVariant: RegionalVariantId;
  leadInSilenceMs: number;
  leadOutSilenceMs: number;
  normalizeOutput: boolean;
  stripStageDirections: boolean;
  glossary: PronunciationEntry[];
  scenes: SceneItem[];
}

export interface BackendCapabilities {
  models: {
    ttsDefault: string;
    ttsPro: string;
    scriptAnalysis: string;
    transcription: string;
  };
  voices: string[];
  nativeAudioFormat: string;
  maxCharsPerRequest: number;
  supportsVoiceCloning: boolean;
  limitations: string[];
}
