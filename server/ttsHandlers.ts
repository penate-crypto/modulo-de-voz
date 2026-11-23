import type { Request, Response } from "express";
import { Type } from "@google/genai";
import {
  ANALYSIS_MODEL,
  AVAILABLE_VOICES,
  MAX_TEXT_CHARS,
  TRANSCRIPTION_MODEL,
  TTS_DEFAULT_MODEL,
  TTS_PRO_MODEL,
  applyPronunciationGlossary,
  classifyGeminiError,
  cleanStageDirections,
  getGenAIClient,
  inspectAudioBuffer,
  parseSampleRateFromMime,
} from "./helpers.ts";

export function handleGetCapabilities(_req: Request, res: Response) {
  res.json({
    models: {
      ttsDefault: TTS_DEFAULT_MODEL,
      ttsPro: TTS_PRO_MODEL,
      scriptAnalysis: ANALYSIS_MODEL,
      transcription: TRANSCRIPTION_MODEL,
    },
    voices: AVAILABLE_VOICES,
    nativeAudioFormat: "PCM crudo 24 kHz · 16-bit Mono (exportado a WAV y MP3)",
    maxCharsPerRequest: MAX_TEXT_CHARS,
    supportsVoiceCloning: false,
    limitations: [
      "Usa exclusivamente las 8 voces originales predefinidas de Gemini TTS; no hay clonación de voz.",
      "El modo de diálogo nativo admite exactamente 2 personajes por llamada; para 3 o más voces usa el modo Por escenas.",
      "Los textos largos se dividen automáticamente en fragmentos (~850 caracteres) y se unen en un solo archivo.",
      "El motor no devuelve marcas de tiempo exactas por palabra ni sincronización labial automática.",
    ],
  });
}

export async function handleAnalyzeScript(req: Request, res: Response) {
  try {
    const { script } = req.body;
    if (!script || typeof script !== "string" || !script.trim()) {
      return res.status(400).json({ success: false, error: "Escribe un guion para analizar." });
    }
    if (script.length > MAX_TEXT_CHARS) {
      return res.status(400).json({
        success: false,
        error: `El guion supera el máximo de ${MAX_TEXT_CHARS} caracteres por solicitud.`,
      });
    }

    const ai = getGenAIClient();
    const prompt = `Divide el siguiente guion en escenas o intervenciones cortas para narración de video con IA.
Reglas:
1. Elimina acotaciones entre corchetes o paréntesis del texto hablado ("text") sin alterar las ideas del usuario.
2. Si hay diálogos ("Nombre: texto"), conserva exactamente el nombre del personaje en "speaker" y el orden original. Si es narración continua, usa "Narrador".
3. Sugiere para cada escena un estilo (narrador_calido, cinematografico, educativo, infantil, serio, alegre, suspenso, documental, conversacional, tecnico) y emoción (neutral_calido, confianza, alegria, curiosidad, asombro, ternura, suspenso, urgencia, serenidad, tristeza, humor).

GUION:
"""
${script.trim()}
"""`;

    const response = await ai.models.generateContent({
      model: ANALYSIS_MODEL,
      contents: prompt,
      config: {
        systemInstruction:
          "Eres un director de locución en español latinoamericano. Responde estrictamente en JSON válido según el esquema.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            scenes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  speaker: { type: Type.STRING },
                  text: { type: Type.STRING },
                  styleId: { type: Type.STRING },
                  emotionId: { type: Type.STRING },
                  pauseAfterMs: { type: Type.INTEGER },
                },
                required: ["title", "speaker", "text", "styleId", "emotionId", "pauseAfterMs"],
              },
            },
          },
          required: ["scenes"],
        },
      },
    });

    const parsed = JSON.parse((response.text ?? "{}").trim());
    const scenes = Array.isArray(parsed.scenes)
      ? parsed.scenes.map((s: any, idx: number) => ({
          title: String(s.title || `Escena ${idx + 1}`).trim(),
          speaker: String(s.speaker || "Narrador").trim(),
          text: String(s.text || "").trim(),
          styleId: String(s.styleId || "narrador_calido").trim(),
          emotionId: String(s.emotionId || "neutral_calido").trim(),
          pauseAfterMs: Math.max(0, Math.min(3000, Number(s.pauseAfterMs) || 350)),
        }))
      : [];

    return res.json({ success: true, scenes });
  } catch (error: any) {
    console.error("[/api/analyze-script] Error completo:", error);
    const classified = classifyGeminiError(error);
    return res.status(classified.status).json({
      success: false,
      isQuotaExceeded: classified.isQuota,
      error: classified.message,
    });
  }
}

export async function handleGenerateAudio(req: Request, res: Response) {
  try {
    const {
      text = "",
      voice = "Kore",
      ttsModel = TTS_DEFAULT_MODEL,
      styleCue = "narrador cálido, humano y cercano",
      emotionCue = "naturalidad equilibrada",
      intensity = "moderada",
      speedCue = "ritmo natural de conversación",
      pauseCue = "pausas naturales respetando la puntuación",
      regionalCue = "español latinoamericano neutro claro para El Salvador y Latinoamérica",
      stripStageDirections = true,
      glossary = [],
      dualSpeaker = null,
    } = req.body;

    const chosenModel = ttsModel === TTS_PRO_MODEL ? TTS_PRO_MODEL : TTS_DEFAULT_MODEL;
    const ai = getGenAIClient();

    // MODE A: Native 2-speaker dialogue (single text + multiSpeakerVoiceConfig)
    if (
      dualSpeaker &&
      Array.isArray(dualSpeaker.speakers) &&
      dualSpeaker.speakers.length === 2 &&
      Array.isArray(dualSpeaker.turns) &&
      dualSpeaker.turns.length > 0
    ) {
      const sp1Name = String(dualSpeaker.speakers[0]?.speaker || "").trim();
      const sp2Name = String(dualSpeaker.speakers[1]?.speaker || "").trim();
      const sp1Voice = String(dualSpeaker.speakers[0]?.voiceId || "Kore").trim();
      const sp2Voice = String(dualSpeaker.speakers[1]?.voiceId || "Puck").trim();

      if (!sp1Name || !sp2Name || sp1Name === sp2Name) {
        return res.status(400).json({
          success: false,
          error: "El diálogo de 2 voces requiere dos nombres de personaje distintos.",
        });
      }

      const dialogueLines: string[] = [];
      for (const turn of dualSpeaker.turns) {
        const speaker = String(turn.speaker || "").trim();
        const cleaned = cleanStageDirections(String(turn.text || ""), stripStageDirections);
        if (!cleaned) continue;
        const pronounced = applyPronunciationGlossary(cleaned, glossary);
        const mappedSpeaker = speaker === sp2Name ? sp2Name : sp1Name;
        dialogueLines.push(`${mappedSpeaker}: ${pronounced}`);
      }

      const joinedDialogue = dialogueLines.join("\n");
      if (!joinedDialogue) {
        return res.status(400).json({
          success: false,
          error: "No hay líneas habladas válidas en el diálogo.",
        });
      }
      if (joinedDialogue.length > MAX_TEXT_CHARS) {
        return res.status(400).json({
          success: false,
          error: `El diálogo supera el límite de ${MAX_TEXT_CHARS} caracteres por solicitud.`,
        });
      }

      const promptText = `Interpreta este diálogo en ${regionalCue}, con estilo de ${styleCue}, ${speedCue} y ${pauseCue}:\n\n${joinedDialogue}`;

      const response = await ai.models.generateContent({
        model: chosenModel,
        contents: [{ parts: [{ text: promptText }] }],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            multiSpeakerVoiceConfig: {
              speakerVoiceConfigs: [
                {
                  speaker: sp1Name,
                  voiceConfig: { prebuiltVoiceConfig: { voiceName: sp1Voice } },
                },
                {
                  speaker: sp2Name,
                  voiceConfig: { prebuiltVoiceConfig: { voiceName: sp2Voice } },
                },
              ],
            },
          },
        },
      });

      const parts = response.candidates?.[0]?.content?.parts || [];
      const audioPart = parts.find((p: any) => Boolean(p?.inlineData?.data));
      const base64Audio = audioPart?.inlineData?.data;

      if (!base64Audio) {
        console.error("[/api/generate-audio] Respuesta sin inlineData (diálogo):", response);
        return res.status(500).json({
          success: false,
          error: "Gemini no devolvió datos de audio para este diálogo. Intenta de nuevo.",
        });
      }

      const rate = parseSampleRateFromMime(audioPart?.inlineData?.mimeType);
      const inspection = inspectAudioBuffer(Buffer.from(base64Audio, "base64"), chosenModel, rate);

      return res.json({
        success: true,
        audioBase64: base64Audio,
        format: inspection.isWav ? "wav" : "pcm",
        sampleRate: inspection.quality.sampleRate,
        quality: inspection.quality,
      });
    }

    // MODE B: Single-speaker narration
    if (!text || typeof text !== "string" || !text.trim()) {
      return res.status(400).json({ success: false, error: "Escribe un texto para generar audio." });
    }
    if (text.length > MAX_TEXT_CHARS) {
      return res.status(400).json({
        success: false,
        error: `El texto supera el límite de ${MAX_TEXT_CHARS} caracteres por solicitud.`,
      });
    }

    const cleanedText = cleanStageDirections(text, stripStageDirections);
    if (!cleanedText) {
      return res.status(400).json({
        success: false,
        error: "Al retirar las acotaciones escénicas no quedó texto hablado para narrar.",
      });
    }

    const preparedText = applyPronunciationGlossary(cleanedText, glossary);
    const intensityWord =
      intensity === "sutil" ? "sutil" : intensity === "marcada" ? "expresiva" : "equilibrada";

    // Natural-language style direction clearly separated from the spoken text
    const ttsPrompt = `Di en ${regionalCue}, como ${styleCue}, con ${emotionCue} (${intensityWord}), ${speedCue} y ${pauseCue}: "${preparedText}"`;

    const response = await ai.models.generateContent({
      model: chosenModel,
      contents: [{ parts: [{ text: ttsPrompt }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: String(voice).trim() || "Kore" },
          },
        },
      },
    });

    // Search all response parts (not just parts[0]) for inlineData
    const parts = response.candidates?.[0]?.content?.parts || [];
    const audioPart = parts.find((p: any) => Boolean(p?.inlineData?.data));
    const base64Audio = audioPart?.inlineData?.data;

    if (!base64Audio) {
      console.error("[/api/generate-audio] Respuesta sin inlineData:", response);
      return res.status(500).json({
        success: false,
        error: "Gemini no devolvió audio para este fragmento. Revisa el texto e inténtalo de nuevo.",
      });
    }

    const rate = parseSampleRateFromMime(audioPart?.inlineData?.mimeType);
    const inspection = inspectAudioBuffer(Buffer.from(base64Audio, "base64"), chosenModel, rate);

    return res.json({
      success: true,
      audioBase64: base64Audio,
      format: inspection.isWav ? "wav" : "pcm",
      sampleRate: inspection.quality.sampleRate,
      quality: inspection.quality,
    });
  } catch (error: any) {
    console.error("[/api/generate-audio] Error completo:", error);
    const classified = classifyGeminiError(error);
    return res.status(classified.status).json({
      success: false,
      isQuotaExceeded: classified.isQuota,
      error: classified.message,
    });
  }
}

export async function handleVerifyAudio(req: Request, res: Response) {
  try {
    const { audioBase64, mimeType = "audio/wav", expectedText = "" } = req.body;
    if (!audioBase64 || typeof audioBase64 !== "string") {
      return res.status(400).json({ success: false, error: "Falta el audio para verificar." });
    }

    const ai = getGenAIClient();
    const response = await ai.models.generateContent({
      model: TRANSCRIPTION_MODEL,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType,
              data: audioBase64,
            },
          },
          {
            text: "Transcribe exactamente lo que se escucha en este audio en español, sin añadir comentarios ni nombres de hablante.",
          },
        ],
      },
    });

    const transcript = (response.text ?? "").trim();
    const normalizeWords = (str: string) =>
      str
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9ñ\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 1);

    const expectedWords = normalizeWords(String(expectedText));
    const transcribedSet = new Set(normalizeWords(transcript));
    const missingWords: string[] = [];
    let matched = 0;

    for (const w of expectedWords) {
      if (transcribedSet.has(w)) matched++;
      else if (!missingWords.includes(w)) missingWords.push(w);
    }

    const wordMatchPercent =
      expectedWords.length > 0 ? Math.round((matched / expectedWords.length) * 100) : 100;

    return res.json({
      success: true,
      qa: {
        transcript,
        wordMatchPercent,
        missingWords: missingWords.slice(0, 10),
        note: "Verificación orientativa con gemini-2.5-flash. Puede variar en siglas, números o puntuación.",
        checkedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    });
  } catch (error: any) {
    console.error("[/api/verify-audio] Error completo:", error);
    const classified = classifyGeminiError(error);
    return res.status(classified.status).json({
      success: false,
      error: classified.message,
    });
  }
}
