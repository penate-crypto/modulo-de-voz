import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));

const FLAGSHIP_TTS_MODEL = "gemini-3.8-flash-tts";
const FAST_TTS_MODEL = "gemini-3.8-flash-lite-tts";
const SCRIPT_DIRECTOR_MODEL = "gemini-4-hydrogen";
const TRANSCRIBE_MODEL = "gemini-3.5-transcribe";

const AVAILABLE_VOICES = [
  "Kore",
  "Zephyr",
  "Puck",
  "Fenrir",
  "Charon",
  "Aoede",
  "Leda",
  "Orus",
];

const getGenAIClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "No se encontró GEMINI_API_KEY en el servidor. Configura la clave en el panel Settings > Secrets."
    );
  }
  return new GoogleGenAI({
    apiKey,
    apiVersion: "v1beta",
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
};

/**
 * Inspects a WAV or raw PCM buffer on the server for real objective audio QA metrics.
 */
function inspectAudioBuffer(buffer: Buffer, modelUsed: string) {
  const isRiff =
    buffer.byteLength >= 44 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WAVE";

  let sampleRate = 24000;
  let channels = 1;
  let bitDepth = 16;
  let dataOffset = 0;
  let dataSize = buffer.byteLength;

  if (isRiff) {
    dataOffset = 44;
    dataSize = buffer.byteLength - 44;
    let offset = 12;
    while (offset + 8 <= buffer.byteLength) {
      const chunkId = buffer.toString("ascii", offset, offset + 4);
      const chunkSize = buffer.readUInt32LE(offset + 4);
      if (chunkId === "fmt " && offset + 24 <= buffer.byteLength) {
        channels = buffer.readUInt16LE(offset + 10) || 1;
        sampleRate = buffer.readUInt32LE(offset + 12) || 24000;
        bitDepth = buffer.readUInt16LE(offset + 22) || 16;
      } else if (chunkId === "data") {
        dataOffset = offset + 8;
        dataSize = Math.min(chunkSize, buffer.byteLength - dataOffset);
        break;
      }
      offset += 8 + chunkSize + (chunkSize % 2);
    }
  }

  const sampleCount = Math.floor(dataSize / 2);
  const durationSec = sampleRate > 0 ? sampleCount / (sampleRate * channels) : 0;

  let sumSq = 0;
  let peak = 0;
  let clippedSamples = 0;
  const silenceThreshold = 260;
  let leadCount = 0;
  let trailCount = 0;
  let foundLead = false;

  for (let i = 0; i < sampleCount; i++) {
    const sample = buffer.readInt16LE(dataOffset + i * 2);
    const abs = Math.abs(sample);
    if (abs > peak) peak = abs;
    if (abs >= 32760) clippedSamples++;
    const norm = sample / 32768;
    sumSq += norm * norm;
    if (!foundLead) {
      if (abs < silenceThreshold) leadCount++;
      else foundLead = true;
    }
  }

  for (let i = sampleCount - 1; i >= leadCount; i--) {
    const sample = buffer.readInt16LE(dataOffset + i * 2);
    if (Math.abs(sample) < silenceThreshold) trailCount++;
    else break;
  }

  const rms = sampleCount > 0 ? Math.sqrt(sumSq / sampleCount) : 0;
  const rmsDb = rms > 0 ? Number((20 * Math.log10(rms)).toFixed(1)) : -96;
  const peakDb = peak > 0 ? Number((20 * Math.log10(peak / 32768)).toFixed(1)) : -96;
  const leadingSilenceMs = Math.round((leadCount / sampleRate) * 1000);
  const trailingSilenceMs = Math.round((trailCount / sampleRate) * 1000);
  const isEmpty = peak < 120 || durationSec < 0.25;

  const warnings: string[] = [];
  if (isEmpty) warnings.push("El audio generado está vacío o presenta nivel inaudible.");
  if (clippedSamples > 12) warnings.push(`Se detectaron ${clippedSamples} muestras cerca de saturación.`);
  if (trailingSilenceMs < 15 && durationSec > 0.5) {
    warnings.push("Final muy abrupto; conviene verificar que la última sílaba no haya sido cortada.");
  }

  return {
    isWav: isRiff,
    quality: {
      sampleRate,
      bitDepth,
      channels,
      durationSec: Number(durationSec.toFixed(2)),
      rmsDb,
      peakDb,
      clippedSamples,
      leadingSilenceMs,
      trailingSilenceMs,
      isEmpty,
      warnings,
      modelUsed,
    },
  };
}

/**
 * Strips non-spoken stage notes from text unless user explicitly requests literal reading.
 */
function cleanSpokenText(raw: string, stripDirections: boolean): {
  spoken: string;
  extractedNotes: string[];
} {
  if (!stripDirections) {
    return { spoken: raw.trim(), extractedNotes: [] };
  }
  const extractedNotes: string[] = [];
  let text = raw.replace(/\[([^\]]+)\]/g, (_, note) => {
    const t = String(note).trim();
    if (t) extractedNotes.push(t);
    return " ";
  });

  text = text.replace(/\(([^)]{2,60})\)/g, (match, note) => {
    const lower = String(note).toLowerCase().trim();
    if (
      /pausa|voz|tono|susurr|triste|alegre|curios|seren|enérgic|energic|tenso|aliviad|pensativ|sorprend|rápid|rapid|lent|escena|sfx|efecto|música|musica|respir/i.test(
        lower
      )
    ) {
      extractedNotes.push(String(note).trim());
      return " ";
    }
    return match;
  });

  text = text.replace(/^(?:ESCENA|SCENE|TOMA|CLIP)\s*\d+\s*[:\-–—]?.*$/gim, (line) => {
    extractedNotes.push(line.trim());
    return "";
  });

  return {
    spoken: text
      .replace(/[ \t]{2,}/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim(),
    extractedNotes,
  };
}

/**
 * Applies user-confirmed pronunciation glossary replacements for TTS clarity
 * without altering factual technical meaning.
 */
function applyPronunciationGlossary(
  text: string,
  glossary: Array<{ term: string; spokenForm: string }> = []
): string {
  let result = text;
  const sorted = [...glossary]
    .filter((g) => g.term?.trim() && g.spokenForm?.trim())
    .sort((a, b) => b.term.length - a.term.length);

  for (const entry of sorted) {
    const escaped = entry.term.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(?<![A-Za-zÀ-ÿ0-9])${escaped}(?![A-Za-zÀ-ÿ0-9])`, "g");
    result = result.replace(regex, entry.spokenForm.trim());
  }
  return result;
}

/**
 * Builds a clean, compact, contradiction-free speechMetadata.style vocal direction prompt.
 */
function buildVocalDirection(params: {
  regionalCue: string;
  modeDirection: string;
  styleCue: string;
  emotionName: string;
  emotionNuanceCue: string;
  intensity: "sutil" | "moderada" | "marcada";
  pauseCue: string;
  speed: number;
  emphasisWords?: string[];
  stageNotes?: string[];
  continuityContext?: string;
  allowSubtleBreath?: boolean;
}): string {
  const intensityMap = {
    sutil: "subtle, understated emotional coloring",
    moderada: "balanced, believable emotional presence",
    marcada: "deep, expressive acting intensity conveyed through phrasing and tension rather than loudness or shouting",
  };

  const paceLabel =
    params.speed <= 0.85
      ? "deliberate, unhurried pace"
      : params.speed <= 0.96
      ? "slightly relaxed, thoughtful pace"
      : params.speed <= 1.04
      ? "natural human speaking pace"
      : params.speed <= 1.15
      ? "brisk, engaging natural pace"
      : "energetic fast-paced delivery while preserving crisp intelligibility";

  const parts: string[] = [
    `Language & accent: ${params.regionalCue}.`,
    `Mode: ${params.modeDirection}`,
    `Style: ${params.styleCue}.`,
    `Emotion: ${params.emotionName} (${intensityMap[params.intensity]}) — ${params.emotionNuanceCue}.`,
    `Pacing & rhythm: ${paceLabel}; ${params.pauseCue}.`,
    `Humanization: Speak like a real human voice actor, never robotic, never monotonous, never a generic radio commercial announcer unless explicitly requested; vary pitch contours and sentence endings naturally.`,
  ];

  if (params.allowSubtleBreath) {
    parts.push("Allow discreet, natural breathing only where a human speaker would genuinely pause.");
  } else {
    parts.push("Keep breathing clean and minimal without artificial gasps or sigh effects.");
  }

  if (params.emphasisWords && params.emphasisWords.length > 0) {
    parts.push(`Selective emphasis on: ${params.emphasisWords.slice(0, 8).join(", ")}.`);
  }

  if (params.stageNotes && params.stageNotes.length > 0) {
    parts.push(`Scene cues (interpret vocally, NEVER speak aloud): ${params.stageNotes.slice(0, 4).join("; ")}.`);
  }

  if (params.continuityContext) {
    parts.push(`Narrative continuity: ${params.continuityContext}.`);
  }

  return parts.join(" ");
}

function classifyGeminiError(error: any): { status: number; message: string; detail?: string; isQuota?: boolean } {
  const raw = String(error?.message || error || "Error interno al comunicarse con el motor de audio.");
  const lower = raw.toLowerCase();

  if (raw.includes("429") || lower.includes("quota") || raw.includes("RESOURCE_EXHAUSTED")) {
    return {
      status: 429,
      isQuota: true,
      detail: raw,
      message:
        "Se alcanzó el límite de solicitudes o cuota de la API de Gemini (429). Espera unos segundos o selecciona una clave API con facturación activa en Settings > Secrets.",
    };
  }
  if (raw.includes("403") || raw.includes("PERMISSION_DENIED") || raw.includes("API_KEY_INVALID")) {
    return {
      status: 403,
      detail: raw,
      message:
        "La clave API de Gemini no es válida o no tiene permisos para este modelo. Verifica tu clave en Settings > Secrets.",
    };
  }
  if (raw.includes("404") || raw.includes("NOT_FOUND")) {
    return {
      status: 404,
      detail: raw,
      message: `El modelo solicitado no está disponible en este momento (${raw}).`,
    };
  }
  return {
    status: 500,
    detail: raw,
    message: raw,
  };
}

// 1. Capabilities endpoint — honest disclosure of real model capabilities and limits
app.get("/api/capabilities", (_req, res) => {
  res.json({
    models: {
      flagshipTts: FLAGSHIP_TTS_MODEL,
      fastTts: FAST_TTS_MODEL,
      scriptDirector: SCRIPT_DIRECTOR_MODEL,
      transcriber: TRANSCRIBE_MODEL,
    },
    voices: AVAILABLE_VOICES,
    supportsVoiceCloning: false,
    supportsWordLevelTimestamps: false,
    supportsNativeDualSpeaker: true,
    nativeAudioFormat: "WAV 24 kHz · 16-bit PCM Mono",
    limitations: [
      "No existe clonación de voz ni entrenamiento con grabaciones personales; se utilizan únicamente las voces originales del motor Gemini TTS.",
      "El modo de diálogo nativo simultáneo (multiSpeakerVoiceConfig) admite exactamente 2 personajes por llamada; diálogos con 3 o más personajes se generan por fragmento manteniendo consistencia de voz y se ensamblan automáticamente.",
      "Los estilos vocales (incluida la voz infantil estilizada) son direcciones interpretativas sobre las voces disponibles; no garantizan timbres infantiles reales.",
      "El motor no devuelve marcas de tiempo exactas por palabra ni sincronización labial automática.",
      "La verificación por transcripción automática (gemini-3.5-transcribe) ayuda a detectar omisiones, pero también puede tener pequeñas diferencias ortográficas.",
    ],
  });
});

// 2. Intelligent Script Analysis & Vocal Direction (gemini-4-hydrogen)
app.post("/api/analyze-script", async (req, res) => {
  try {
    const {
      script,
      modeId = "modo_a_natural",
      targetDurationSec = null,
      regionalVariant = "es_latam_sv",
    } = req.body;

    if (!script || typeof script !== "string" || !script.trim()) {
      return res.status(400).json({ error: "Debes proporcionar un guion para analizar." });
    }

    const ai = getGenAIClient();

    const prompt = `Analiza el siguiente guion para producción de voz en video con IA.
Idioma objetivo: Español latinoamericano neutro (${regionalVariant}).
Modo actual seleccionado por el usuario: ${modeId}.
Duración objetivo del usuario (segundos, o null si no se fijó): ${targetDurationSec ?? "sin límite fijo"}.

REGLAS ESTRICTAS:
1. Separa limpiamente el texto que DEBE pronunciarse ("originalText") de las acotaciones escénicas, nombres de escena, efectos sonoros o notas entre corchetes/paréntesis ("stageDirections"). NUNCA dejes instrucciones como "[Pausa dramática]" o "(voz triste)" dentro de originalText ni adaptedText.
2. En "originalText", conserva fielmente las palabras y hechos del usuario (sin inventar datos).
3. En "adaptedText", ofrece una versión opcional ligeramente pulida en puntuación para lectura oral natural sin cambiar el sentido ni los términos técnicos.
4. Si hay diálogos (ej. "Elena: ...", "Mateo: ..."), crea un segmento por intervención manteniendo el orden exacto y el nombre exacto del personaje en "speaker". Si es un solo narrador, divide por escenas o cambios emocionales usando "Narrador".
5. Asigna a cada segmento una progresión emocional natural (emotion entre: alegria, curiosidad, asombro, entusiasmo, ternura, tristeza, preocupacion, miedo, suspenso, serenidad, confianza, urgencia, determinacion, humor, ironia_suave, misterio, orgullo, alivio), intensity (sutil, moderada, marcada), vocalStyle (entre: narrador_cinematografico, narrador_calido, narrador_documental, voz_educativa, voz_juvenil, voz_infantil_estilizada, personaje_animado, voz_misteriosa, voz_suspenso, voz_emotiva, voz_alegre, voz_seria_profesional, voz_epica, voz_tranquila_reflexiva, conversacion_cotidiana, narracion_tecnica, interpretacion_dramatica, cuento_dormir) y pauseStyle (natural_ideas, conversacional, dramatica, emocional, revelacion, escena_video).
6. Detecta términos técnicos, siglas, unidades o palabras extranjeras que conviene revisar en el glosario de pronunciación (sin inventar pronunciaciones dudosas).
7. Calcula si el texto cabe de forma natural (~138 palabras/min) en targetDurationSec sin acelerar artificialmente.

GUION DEL USUARIO:
"""
${script.trim()}
"""`;

    const response = await ai.models.generateContent({
      model: SCRIPT_DIRECTOR_MODEL,
      contents: prompt,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        systemInstruction:
          "Eres un director de doblaje, narración audiovisual y producción de audio en español latinoamericano. Responde estrictamente en el formato JSON solicitado, con criterio profesional, honestidad técnica y sin tono publicitario innecesario.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            contentType: { type: Type.STRING },
            targetAudience: { type: Type.STRING },
            recommendedMode: { type: Type.STRING },
            emotionalArcSummary: { type: Type.STRING },
            detectedSpeakers: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            detectedTechnicalTerms: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  term: { type: Type.STRING },
                  suggestedReading: { type: Type.STRING },
                  reason: { type: Type.STRING },
                },
                required: ["term", "suggestedReading", "reason"],
              },
            },
            durationAdvice: { type: Type.STRING },
            segments: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  sceneLabel: { type: Type.STRING },
                  speaker: { type: Type.STRING },
                  originalText: { type: Type.STRING },
                  adaptedText: { type: Type.STRING },
                  vocalStyle: { type: Type.STRING },
                  emotion: { type: Type.STRING },
                  emotionIntensity: { type: Type.STRING },
                  pauseStyle: { type: Type.STRING },
                  pauseAfterMs: { type: Type.INTEGER },
                  emphasisWords: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  stageDirections: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  visualSyncNote: { type: Type.STRING },
                },
                required: [
                  "sceneLabel",
                  "speaker",
                  "originalText",
                  "adaptedText",
                  "vocalStyle",
                  "emotion",
                  "emotionIntensity",
                  "pauseStyle",
                  "pauseAfterMs",
                  "emphasisWords",
                  "stageDirections",
                ],
              },
            },
          },
          required: [
            "contentType",
            "targetAudience",
            "recommendedMode",
            "emotionalArcSummary",
            "detectedSpeakers",
            "detectedTechnicalTerms",
            "segments",
          ],
        },
      },
    });

    const parsed = JSON.parse((response.text ?? "{}").trim());

    // Calculate objective natural duration estimate from spoken words
    const spokenWords = (parsed.segments || [])
      .map((s: any) => String(s.originalText || ""))
      .join(" ")
      .split(/\s+/)
      .filter(Boolean).length;
    const totalPauseSec =
      (parsed.segments || []).reduce((acc: number, s: any) => acc + (Number(s.pauseAfterMs) || 350), 0) /
      1000;
    const estimatedNaturalDurationSec = Math.max(
      2,
      Math.round((spokenWords / 138) * 60 + totalPauseSec)
    );

    let durationFitStatus: "ok" | "tight" | "overflow" | "unset" = "unset";
    let durationAdvice = parsed.durationAdvice || "";

    if (targetDurationSec && Number(targetDurationSec) > 0) {
      const target = Number(targetDurationSec);
      if (estimatedNaturalDurationSec <= target) {
        durationFitStatus = "ok";
        if (!durationAdvice) {
          durationAdvice = `El guion cabe con naturalidad (${estimatedNaturalDurationSec}s estimados frente a ${target}s objetivo).`;
        }
      } else if (estimatedNaturalDurationSec <= target * 1.15) {
        durationFitStatus = "tight";
        durationAdvice = `El guion queda ajustado (${estimatedNaturalDurationSec}s naturales vs ${target}s objetivo). Se recomienda acortar 1 frase o ampliar la escena para no acelerar la voz.`;
      } else {
        durationFitStatus = "overflow";
        durationAdvice = `El texto excede el tiempo objetivo (${estimatedNaturalDurationSec}s naturales vs ${target}s objetivo). No aceleres la voz artificialmente: divide el guion en más escenas, amplía la duración visual o resume el texto.`;
      }
    }

    res.json({
      success: true,
      analysis: {
        contentType: parsed.contentType || "Narración audiovisual",
        targetAudience: parsed.targetAudience || "Público general",
        recommendedMode: parsed.recommendedMode || modeId,
        emotionalArcSummary: parsed.emotionalArcSummary || "Interpretación natural progresiva",
        detectedSpeakers:
          Array.isArray(parsed.detectedSpeakers) && parsed.detectedSpeakers.length > 0
            ? parsed.detectedSpeakers
            : ["Narrador"],
        detectedTechnicalTerms: Array.isArray(parsed.detectedTechnicalTerms)
          ? parsed.detectedTechnicalTerms
          : [],
        estimatedNaturalDurationSec,
        durationFitStatus,
        durationAdvice,
      },
      segments: Array.isArray(parsed.segments) ? parsed.segments : [],
    });
  } catch (error: any) {
    console.error("Error in /api/analyze-script:", error);
    const classified = classifyGeminiError(error);
    res.status(classified.status).json({
      success: false,
      isQuotaExceeded: Boolean(classified.isQuota),
      error: classified.message,
      detail: classified.detail,
    });
  }
});

// 3. Humanized TTS Generation (Single-speaker OR Native Dual-Speaker with Gemini 3.8 TTS)
app.post("/api/generate-audio", async (req, res) => {
  try {
    const {
      text,
      voice = "Kore",
      engineModel = FLAGSHIP_TTS_MODEL,
      regionalCue = "Neutral Latin American Spanish suitable for El Salvador and Latin America",
      modeDirection = "Natural, human audiovisual narration",
      styleCue = "Warm, clear storyteller",
      emotionName = "Confianza",
      emotionNuanceCue = "grounded reassuring clarity",
      intensity = "moderada",
      pauseCue = "natural phrasing pauses between complete ideas",
      speed = 1.0,
      emphasisWords = [],
      stageDirections = [],
      continuityContext = "",
      allowSubtleBreath = false,
      stripStageDirections = true,
      glossary = [],
      // Optional native dual-speaker screenplay payload
      dualSpeakerDialogue = null,
    } = req.body;

    const ai = getGenAIClient();
    const chosenModel =
      engineModel === FAST_TTS_MODEL ? FAST_TTS_MODEL : FLAGSHIP_TTS_MODEL;

    // CASE A: Native Dual-Speaker Screenplay (gemini-3.8-flash-tts + multiSpeakerVoiceConfig)
    if (
      dualSpeakerDialogue &&
      Array.isArray(dualSpeakerDialogue.speakers) &&
      dualSpeakerDialogue.speakers.length === 2 &&
      Array.isArray(dualSpeakerDialogue.turns) &&
      dualSpeakerDialogue.turns.length > 0
    ) {
      const [sp1, sp2] = dualSpeakerDialogue.speakers;
      const parts = dualSpeakerDialogue.turns
        .map((turn: any) => {
          const cleaned = cleanSpokenText(String(turn.text || ""), stripStageDirections);
          if (!cleaned.spoken) return null;
          const pronouncedText = applyPronunciationGlossary(cleaned.spoken, glossary);
          const turnStyle = buildVocalDirection({
            regionalCue,
            modeDirection,
            styleCue: turn.styleCue || styleCue,
            emotionName: turn.emotionName || emotionName,
            emotionNuanceCue: turn.emotionNuanceCue || emotionNuanceCue,
            intensity: turn.intensity || intensity,
            pauseCue: turn.pauseCue || pauseCue,
            speed: Number(speed) || 1.0,
            emphasisWords: turn.emphasisWords || [],
            stageNotes: [...(turn.stageDirections || []), ...cleaned.extractedNotes],
            continuityContext: turn.characterNote || "",
            allowSubtleBreath,
          });
          return {
            text: `${turn.speaker}: ${pronouncedText}`,
            speechMetadata: {
              speaker: turn.speaker,
              style: turnStyle,
            },
          };
        })
        .filter(Boolean);

      if (parts.length === 0) {
        return res.status(400).json({ error: "No hay texto válido para generar el diálogo." });
      }

      const response = await ai.models.generateContent({
        model: FLAGSHIP_TTS_MODEL,
        contents: [{ role: "user", parts }],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            multiSpeakerVoiceConfig: {
              speakerVoiceConfigs: [
                {
                  speaker: sp1.speaker,
                  voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: sp1.voiceId || "Kore" },
                  },
                },
                {
                  speaker: sp2.speaker,
                  voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: sp2.voiceId || "Puck" },
                  },
                },
              ],
            },
          },
        },
      });

      const base64Audio =
        response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

      if (!base64Audio) {
        return res.status(500).json({
          error: "El motor de diálogo no devolvió audio. Revisa que el guion cumpla las políticas y reintenta.",
        });
      }

      const rawBuf = Buffer.from(base64Audio, "base64");
      const inspection = inspectAudioBuffer(rawBuf, FLAGSHIP_TTS_MODEL);

      return res.json({
        success: true,
        audioBase64: base64Audio,
        format: inspection.isWav ? "wav" : "pcm",
        sampleRate: inspection.quality.sampleRate,
        quality: inspection.quality,
        isDualNative: true,
      });
    }

    // CASE B: Single-Speaker High-Fidelity Narration / Scene Clip
    if (!text || typeof text !== "string" || !text.trim()) {
      return res.status(400).json({ error: "El texto a narrar es obligatorio." });
    }

    const { spoken, extractedNotes } = cleanSpokenText(text, stripStageDirections);
    if (!spoken) {
      return res.status(400).json({
        error: "Después de separar las acotaciones escénicas no quedó texto hablado en este fragmento.",
      });
    }

    const preparedText = applyPronunciationGlossary(spoken, glossary);
    const direction = buildVocalDirection({
      regionalCue,
      modeDirection,
      styleCue,
      emotionName,
      emotionNuanceCue,
      intensity,
      pauseCue,
      speed: Number(speed) || 1.0,
      emphasisWords,
      stageNotes: [...stageDirections, ...extractedNotes],
      continuityContext,
      allowSubtleBreath,
    });

    const response = await ai.models.generateContent({
      model: chosenModel,
      contents: [
        {
          role: "user",
          parts: [
            {
              text: preparedText,
              speechMetadata: {
                style: direction,
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice },
          },
        },
      },
    });

    const base64Audio =
      response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!base64Audio) {
      console.error("Empty audio response from Gemini TTS:", JSON.stringify(response));
      return res.status(500).json({
        error: "El modelo no devolvió datos de audio para este fragmento. Puedes reintentar o ajustar el texto.",
      });
    }

    const rawBuf = Buffer.from(base64Audio, "base64");
    const inspection = inspectAudioBuffer(rawBuf, chosenModel);

    return res.json({
      success: true,
      audioBase64: base64Audio,
      format: inspection.isWav ? "wav" : "pcm",
      sampleRate: inspection.quality.sampleRate,
      quality: inspection.quality,
      spokenTextUsed: preparedText,
      directionApplied: direction,
    });
  } catch (error: any) {
    console.error("Error in /api/generate-audio:", error);
    const classified = classifyGeminiError(error);
    res.status(classified.status).json({
      success: false,
      isQuotaExceeded: Boolean(classified.isQuota),
      error: classified.message,
      detail: classified.detail,
    });
  }
});

// 4. Audio Quality Verification via Transcription (gemini-3.5-transcribe)
app.post("/api/verify-audio", async (req, res) => {
  try {
    const { audioBase64, mimeType = "audio/wav", expectedText = "" } = req.body;

    if (!audioBase64 || typeof audioBase64 !== "string") {
      return res.status(400).json({ error: "Se requiere el audio en base64 para la verificación." });
    }

    const ai = getGenAIClient();

    const response = await ai.models.generateContent({
      model: TRANSCRIBE_MODEL,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType,
              data: audioBase64,
            },
          },
          {
            text: "Transcribe exactamente lo que se escucha en este audio en español, sin añadir notas ni comentarios.",
          },
        ],
      },
    });

    const transcript = (response.text ?? "").trim();

    // Compute honest lexical overlap against expected spoken text
    const normalizeWords = (str: string) =>
      str
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9ñ\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 1);

    const expectedWords = normalizeWords(expectedText);
    const transcribedSet = new Set(normalizeWords(transcript));
    const missingWords: string[] = [];
    let matched = 0;

    for (const w of expectedWords) {
      if (transcribedSet.has(w)) {
        matched++;
      } else if (!missingWords.includes(w)) {
        missingWords.push(w);
      }
    }

    const wordMatchPercent =
      expectedWords.length > 0 ? Math.round((matched / expectedWords.length) * 100) : 100;

    res.json({
      success: true,
      qa: {
        transcript,
        wordMatchPercent,
        missingWords: missingWords.slice(0, 12),
        note: "Verificación orientativa por transcripción automática (gemini-3.5-transcribe). La transcripción puede variar en números, siglas o puntuación; escucha siempre el audio final.",
        checkedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    });
  } catch (error: any) {
    console.error("Error in /api/verify-audio:", error);
    const classified = classifyGeminiError(error);
    res.status(classified.status).json({
      success: false,
      error: classified.message,
      detail: classified.detail,
    });
  }
});

async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
}

setupVite().then(() => {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});
