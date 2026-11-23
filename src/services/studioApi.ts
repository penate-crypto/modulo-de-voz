import {
  EMOTIONS,
  PAUSE_OPTIONS,
  REGIONAL_OPTIONS,
  SPEED_PRESETS,
  STYLES,
} from "../data/studioCatalog";
import {
  AudioQualityMetrics,
  BackendCapabilities,
  EmotionId,
  StudioState,
  TranscriptionQaResult,
  VocalStyleId,
} from "../types";
import {
  analyzePcmQuality,
  blobToBase64,
  concatenatePcmClips,
  parseAudioBase64,
  pcmInt16ToWavBlob,
  processStudioPcm,
} from "../utils/audioUtils";
import { splitTextIntoChunks } from "../utils/scriptUtils";

export interface SynthesizedResult {
  samples: Int16Array;
  sampleRate: number;
  channels: number;
  bitDepth: number;
  wavBlob: Blob;
  wavUrl: string;
  rawBase64: string;
  quality: AudioQualityMetrics;
}

function resolveCues(
  state: StudioState,
  overrideStyle?: VocalStyleId,
  overrideEmotion?: EmotionId
) {
  const style = STYLES.find((s) => s.id === (overrideStyle || state.styleId)) || STYLES[0];
  const emotion = EMOTIONS.find((e) => e.id === (overrideEmotion || state.emotionId)) || EMOTIONS[0];
  const speed = SPEED_PRESETS.find((s) => s.id === state.speedPreset) || SPEED_PRESETS[1];
  const pause = PAUSE_OPTIONS.find((p) => p.id === state.pauseStyle) || PAUSE_OPTIONS[0];
  const regional =
    REGIONAL_OPTIONS.find((r) => r.id === state.regionalVariant) || REGIONAL_OPTIONS[0];
  return { style, emotion, speed, pause, regional };
}

function finalizePcmResult(
  state: StudioState,
  audioBase64: string,
  sampleRateHint: number,
  modelUsed: string,
  addMargins: boolean
): SynthesizedResult {
  const parsed = parseAudioBase64(audioBase64, sampleRateHint || 24000);
  const processed = processStudioPcm(parsed.samples, parsed.sampleRate, {
    normalize: state.normalizeOutput,
    trimDeadSilence: true,
  });

  const finalPcm = addMargins
    ? concatenatePcmClips(
        [{ samples: processed, pauseAfterMs: 0 }],
        parsed.sampleRate,
        state.leadInSilenceMs,
        state.leadOutSilenceMs
      )
    : processed;

  const wavBlob = pcmInt16ToWavBlob(finalPcm, parsed.sampleRate, parsed.channels);
  const wavUrl = URL.createObjectURL(wavBlob);
  const quality = analyzePcmQuality(
    finalPcm,
    parsed.sampleRate,
    parsed.channels,
    parsed.bitDepth,
    modelUsed
  );

  return {
    samples: finalPcm,
    sampleRate: parsed.sampleRate,
    channels: parsed.channels,
    bitDepth: parsed.bitDepth,
    wavBlob,
    wavUrl,
    rawBase64: audioBase64,
    quality,
  };
}

async function postJson<T = any>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const rawText = await response.text();
  let data: any;
  try {
    data = rawText ? JSON.parse(rawText) : null;
  } catch {
    throw new Error(
      `El servidor respondió con un error (HTTP ${response.status}). Revisa que el servidor esté corriendo y la clave GEMINI_API_KEY.`
    );
  }

  if (!data || typeof data !== "object") {
    throw new Error(
      `El servidor respondió con un error (HTTP ${response.status}). Revisa que el servidor esté corriendo y la clave GEMINI_API_KEY.`
    );
  }

  if (!response.ok) {
    throw new Error(
      data.error ||
        `El servidor respondió con un error (HTTP ${response.status}). Revisa que el servidor esté corriendo y la clave GEMINI_API_KEY.`
    );
  }

  return data as T;
}

export async function fetchCapabilities(): Promise<BackendCapabilities | null> {
  try {
    const res = await fetch("/api/capabilities");
    if (!res.ok) return null;
    const rawText = await res.text();
    return rawText ? (JSON.parse(rawText) as BackendCapabilities) : null;
  } catch {
    return null;
  }
}

export async function requestSingleAudio(
  state: StudioState,
  params: {
    text: string;
    voiceId: string;
    styleId?: VocalStyleId;
    emotionId?: EmotionId;
    addMargins?: boolean;
  }
): Promise<SynthesizedResult> {
  const { style, emotion, speed, pause, regional } = resolveCues(
    state,
    params.styleId,
    params.emotionId
  );

  const data = await postJson("/api/generate-audio", {
    text: params.text,
    voice: params.voiceId.trim(),
    ttsModel: state.ttsModel,
    styleCue: style.cue,
    emotionCue: emotion.cue,
    intensity: state.emotionIntensity,
    speedCue: speed.cue,
    pauseCue: pause.cue,
    regionalCue: regional.cue,
    stripStageDirections: state.stripStageDirections,
    glossary: state.glossary,
  });

  if (!data.success || !data.audioBase64) {
    throw new Error(data.error || "No se pudo generar el audio.");
  }

  return finalizePcmResult(
    state,
    data.audioBase64,
    data.sampleRate || 24000,
    data.quality?.modelUsed || state.ttsModel,
    Boolean(params.addMargins)
  );
}

/**
 * Generates narration of any length by splitting long scripts (~850 chars at sentence boundaries)
 * and joining the resulting PCM chunks seamlessly.
 */
export async function generateLongNarration(
  state: StudioState,
  text: string,
  onProgress?: (current: number, total: number) => void
): Promise<SynthesizedResult> {
  const chunks = splitTextIntoChunks(text, 850);
  if (chunks.length === 0) {
    throw new Error("Escribe un texto antes de generar el audio.");
  }

  if (chunks.length === 1) {
    onProgress?.(1, 1);
    return requestSingleAudio(state, {
      text: chunks[0],
      voiceId: state.voiceId,
      addMargins: true,
    });
  }

  const pcmClips: Array<{ samples: Int16Array; pauseAfterMs: number }> = [];
  let sampleRate = 24000;
  let channels = 1;
  let bitDepth = 16;

  for (let i = 0; i < chunks.length; i++) {
    onProgress?.(i + 1, chunks.length);
    const chunkRes = await requestSingleAudio(state, {
      text: chunks[i],
      voiceId: state.voiceId,
      addMargins: false,
    });
    URL.revokeObjectURL(chunkRes.wavUrl);
    sampleRate = chunkRes.sampleRate;
    channels = chunkRes.channels;
    bitDepth = chunkRes.bitDepth;
    pcmClips.push({ samples: chunkRes.samples, pauseAfterMs: 220 });
  }

  const stitched = concatenatePcmClips(
    pcmClips,
    sampleRate,
    state.leadInSilenceMs,
    state.leadOutSilenceMs
  );
  const wavBlob = pcmInt16ToWavBlob(stitched, sampleRate, channels);
  const wavUrl = URL.createObjectURL(wavBlob);
  const quality = analyzePcmQuality(stitched, sampleRate, channels, bitDepth, state.ttsModel);

  return {
    samples: stitched,
    sampleRate,
    channels,
    bitDepth,
    wavBlob,
    wavUrl,
    rawBase64: "",
    quality,
  };
}

export async function requestDualDialogue(
  state: StudioState,
  speakers: [
    { speaker: string; voiceId: string },
    { speaker: string; voiceId: string }
  ],
  turns: Array<{ speaker: string; text: string }>
): Promise<SynthesizedResult> {
  const { style, speed, pause, regional } = resolveCues(state);

  const data = await postJson("/api/generate-audio", {
    ttsModel: state.ttsModel,
    styleCue: style.cue,
    speedCue: speed.cue,
    pauseCue: pause.cue,
    regionalCue: regional.cue,
    stripStageDirections: state.stripStageDirections,
    glossary: state.glossary,
    dualSpeaker: {
      speakers: speakers.map((s) => ({
        speaker: s.speaker.trim(),
        voiceId: s.voiceId.trim(),
      })),
      turns: turns.map((t) => ({
        speaker: t.speaker.trim(),
        text: t.text.trim(),
      })),
    },
  });

  if (!data.success || !data.audioBase64) {
    throw new Error(data.error || "No se pudo generar el diálogo de 2 voces.");
  }

  return finalizePcmResult(
    state,
    data.audioBase64,
    data.sampleRate || 24000,
    data.quality?.modelUsed || state.ttsModel,
    true
  );
}

export async function analyzeScriptIntoScenes(script: string) {
  const data = await postJson("/api/analyze-script", { script });
  if (!data.success) {
    throw new Error(data.error || "No se pudo dividir el guion con IA.");
  }
  return data.scenes as Array<{
    title: string;
    speaker: string;
    text: string;
    styleId: string;
    emotionId: string;
    pauseAfterMs: number;
  }>;
}

export async function verifyTakeAudio(
  wavBlob: Blob,
  expectedText: string
): Promise<TranscriptionQaResult> {
  const audioBase64 = await blobToBase64(wavBlob);
  const data = await postJson("/api/verify-audio", {
    audioBase64,
    mimeType: "audio/wav",
    expectedText,
  });
  if (!data.success) {
    throw new Error(data.error || "No se pudo verificar el audio.");
  }
  return data.qa as TranscriptionQaResult;
}
