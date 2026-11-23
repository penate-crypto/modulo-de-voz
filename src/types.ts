export type ProductionModeId =
  | "modo_a_natural"
  | "modo_b_cinematografico"
  | "modo_c_cuentos"
  | "modo_d_educativo"
  | "modo_e_dialogos"
  | "modo_f_emocional"
  | "modo_g_video_corto"
  | "modo_h_escenas";

export type VocalStyleId =
  | "narrador_cinematografico"
  | "narrador_calido"
  | "narrador_documental"
  | "voz_educativa"
  | "voz_juvenil"
  | "voz_infantil_estilizada"
  | "personaje_animado"
  | "voz_misteriosa"
  | "voz_suspenso"
  | "voz_emotiva"
  | "voz_alegre"
  | "voz_seria_profesional"
  | "voz_epica"
  | "voz_tranquila_reflexiva"
  | "conversacion_cotidiana"
  | "narracion_tecnica"
  | "interpretacion_dramatica"
  | "cuento_dormir";

export type EmotionId =
  | "alegria"
  | "curiosidad"
  | "asombro"
  | "entusiasmo"
  | "ternura"
  | "tristeza"
  | "preocupacion"
  | "miedo"
  | "suspenso"
  | "serenidad"
  | "confianza"
  | "urgencia"
  | "determinacion"
  | "humor"
  | "ironia_suave"
  | "misterio"
  | "orgullo"
  | "alivio";

export type EmotionIntensity = "sutil" | "moderada" | "marcada";

export type PauseStyleId =
  | "natural_ideas"
  | "conversacional"
  | "dramatica"
  | "emocional"
  | "revelacion"
  | "escena_video";

export type RegionalVariantId =
  | "es_latam_sv"
  | "es_latam_neutro"
  | "es_mx"
  | "es_co"
  | "es_ar"
  | "es_es";

export type TtsEngineModelId = "gemini-3.8-flash-tts" | "gemini-3.8-flash-lite-tts";

export type ExportFormat = "wav" | "mp3";

export interface ProductionMode {
  id: ProductionModeId;
  code: string;
  name: string;
  summary: string;
  useCases: string;
  defaultStyle: VocalStyleId;
  defaultEmotion: EmotionId;
  defaultIntensity: EmotionIntensity;
  defaultPauseStyle: PauseStyleId;
  defaultSpeed: number;
  defaultEngine: TtsEngineModelId;
  prefersScenes: boolean;
  prefersMultiSpeaker: boolean;
  directionPrompt: string;
}

export interface VocalStyleOption {
  id: VocalStyleId;
  name: string;
  description: string;
  directionCue: string;
  recommendedVoice: string;
  limitationNote?: string;
}

export interface EmotionOption {
  id: EmotionId;
  name: string;
  nuanceCue: string;
}

export interface VoiceModel {
  id: string;
  name: string;
  gender: "male" | "female";
  register: string;
  description: string;
  idealFor: string;
  isCore38: boolean;
}

export interface RegionalVariant {
  id: RegionalVariantId;
  name: string;
  description: string;
  directionCue: string;
}

export interface PronunciationEntry {
  id: string;
  term: string;
  spokenForm: string;
  notes?: string;
}

export interface CharacterCast {
  speaker: string;
  voiceId: string;
  defaultStyle: VocalStyleId;
  characterNote: string;
}

export interface AudioQualityMetrics {
  sampleRate: number;
  bitDepth: number;
  channels: number;
  durationSec: number;
  rmsDb: number;
  peakDb: number;
  clippedSamples: number;
  leadingSilenceMs: number;
  trailingSilenceMs: number;
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

export interface ScriptSegment {
  id: string;
  order: number;
  sceneLabel: string;
  speaker: string;
  voiceId: string;
  originalText: string;
  adaptedText: string;
  useAdapted: boolean;
  vocalStyle: VocalStyleId;
  emotion: EmotionId;
  emotionIntensity: EmotionIntensity;
  pauseStyle: PauseStyleId;
  pauseAfterMs: number;
  emphasisWords: string[];
  stageDirections: string[];
  visualSyncNote?: string;
  // Runtime synthesis state (not persisted in full base64 to localStorage if large)
  status: "idle" | "generating" | "ready" | "error";
  errorMessage?: string;
  audioWavUrl?: string;
  audioWavBase64?: string;
  waveformPeaks?: number[];
  quality?: AudioQualityMetrics;
  qaResult?: TranscriptionQaResult;
}

export interface ScriptAnalysisSummary {
  contentType: string;
  targetAudience: string;
  recommendedMode: ProductionModeId;
  emotionalArcSummary: string;
  detectedSpeakers: string[];
  detectedTechnicalTerms: Array<{ term: string; suggestedReading: string; reason: string }>;
  estimatedNaturalDurationSec: number;
  durationFitStatus: "ok" | "tight" | "overflow" | "unset";
  durationAdvice?: string;
}

export interface GeneratedTake {
  id: string;
  projectId: string;
  projectName: string;
  filenameBase: string;
  modeName: string;
  styleName: string;
  emotionSummary: string;
  voicesUsed: string[];
  segmentCount: number;
  textExcerpt: string;
  createdAt: string;
  durationSec: number;
  sampleRate: number;
  bitDepth: number;
  modelUsed: string;
  quality?: AudioQualityMetrics;
  qaResult?: TranscriptionQaResult;
  // In-memory runtime URLs/blobs for current session
  wavUrl?: string;
  wavBlob?: Blob;
  mp3Blob?: Blob;
  waveformPeaks?: number[];
  isDualNative?: boolean;
}

export interface StudioProject {
  id: string;
  name: string;
  updatedAt: string;
  modeId: ProductionModeId;
  engineModel: TtsEngineModelId;
  regionalVariant: RegionalVariantId;
  primaryVoiceId: string;
  vocalStyle: VocalStyleId;
  emotion: EmotionId;
  emotionIntensity: EmotionIntensity;
  pauseStyle: PauseStyleId;
  speed: number;
  targetDurationSec: number | null;
  leadInSilenceMs: number;
  leadOutSilenceMs: number;
  allowSubtleBreath: boolean;
  normalizeOutput: boolean;
  stripStageDirections: boolean;
  useNativeDualSpeaker: boolean;
  rawScript: string;
  cast: CharacterCast[];
  glossary: PronunciationEntry[];
  segments: ScriptSegment[];
  analysis: ScriptAnalysisSummary | null;
}

export interface StudioTemplate {
  id: string;
  testBadge: string;
  category: string;
  title: string;
  description: string;
  modeId: ProductionModeId;
  vocalStyle: VocalStyleId;
  emotion: EmotionId;
  emotionIntensity: EmotionIntensity;
  pauseStyle: PauseStyleId;
  primaryVoiceId: string;
  targetDurationSec: number | null;
  script: string;
  suggestedCast?: CharacterCast[];
  suggestedGlossary?: Array<{ term: string; spokenForm: string; notes: string }>;
}

export interface BackendCapabilities {
  models: {
    flagshipTts: string;
    fastTts: string;
    scriptDirector: string;
    transcriber: string;
  };
  voices: string[];
  supportsVoiceCloning: boolean;
  supportsWordLevelTimestamps: boolean;
  supportsNativeDualSpeaker: boolean;
  nativeAudioFormat: string;
  limitations: string[];
}
