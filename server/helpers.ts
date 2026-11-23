import type { Request, Response, NextFunction } from "express";
import { GoogleGenAI } from "@google/genai";

// Real Gemini 2.5 models
export const TTS_DEFAULT_MODEL = "gemini-2.5-flash-preview-tts";
export const TTS_PRO_MODEL = "gemini-2.5-pro-preview-tts";
export const ANALYSIS_MODEL = "gemini-2.5-flash";
export const TRANSCRIPTION_MODEL = "gemini-2.5-flash";

export const MAX_TEXT_CHARS = 5000;
export const AVAILABLE_VOICES = [
  "Kore",
  "Zephyr",
  "Aoede",
  "Leda",
  "Fenrir",
  "Puck",
  "Charon",
  "Orus",
];

/**
 * Simple in-memory per-IP rate limiter for /api routes.
 */
export function createRateLimiter(maxPerWindow = 40, windowMs = 60_000) {
  const buckets = new Map<string, { count: number; resetAt: number }>();

  return (req: Request, res: Response, next: NextFunction) => {
    if (req.path === "/capabilities") return next();
    const now = Date.now();
    const ip =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.socket.remoteAddress ||
      "local";

    if (buckets.size > 500) {
      for (const [k, v] of buckets.entries()) {
        if (v.resetAt <= now) buckets.delete(k);
      }
    }

    const entry = buckets.get(ip);
    if (!entry || entry.resetAt <= now) {
      buckets.set(ip, { count: 1, resetAt: now + windowMs });
      return next();
    }

    entry.count += 1;
    if (entry.count > maxPerWindow) {
      return res.status(429).json({
        success: false,
        error: "Demasiadas solicitudes en un minuto. Espera unos segundos e inténtalo de nuevo.",
      });
    }
    return next();
  };
}

export function getGenAIClient() {
  const rawKey = process.env.GEMINI_API_KEY || process.env.API_KEY || "";
  const apiKey = rawKey.trim().replace(/^["']+|["']+$/g, "").trim();

  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    throw Object.assign(
      new Error(
        "No hay una clave GEMINI_API_KEY válida configurada en el servidor. Abre Settings > Secrets y selecciona o actualiza tu clave de API de Gemini."
      ),
      { status: 401 }
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
}

/**
 * Extracts sample rate from mimeType like "audio/L16;codec=pcm;rate=24000".
 */
export function parseSampleRateFromMime(mimeType?: string): number {
  const match = String(mimeType || "").match(/rate=(\d+)/i);
  const parsed = match ? Number(match[1]) : 24000;
  return Number.isFinite(parsed) && parsed >= 8000 && parsed <= 96000 ? parsed : 24000;
}

/**
 * Inspects raw 24 kHz 16-bit mono PCM (or RIFF WAV if present) for objective audio QA.
 */
export function inspectAudioBuffer(buffer: Buffer, modelUsed: string, defaultRate = 24000) {
  const isRiff =
    buffer.byteLength >= 44 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WAVE";

  let sampleRate = defaultRate;
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
        sampleRate = buffer.readUInt32LE(offset + 12) || defaultRate;
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

  for (let i = 0; i < sampleCount; i++) {
    const sample = buffer.readInt16LE(dataOffset + i * 2);
    const abs = Math.abs(sample);
    if (abs > peak) peak = abs;
    if (abs >= 32760) clippedSamples++;
    const norm = sample / 32768;
    sumSq += norm * norm;
  }

  const rms = sampleCount > 0 ? Math.sqrt(sumSq / sampleCount) : 0;
  const rmsDb = rms > 0 ? Number((20 * Math.log10(rms)).toFixed(1)) : -96;
  const peakDb = peak > 0 ? Number((20 * Math.log10(peak / 32768)).toFixed(1)) : -96;
  const isEmpty = peak < 120 || durationSec < 0.2;

  const warnings: string[] = [];
  if (isEmpty) warnings.push("El audio generado está vacío o presenta nivel inaudible.");
  if (clippedSamples > 12) warnings.push(`Se detectaron ${clippedSamples} muestras saturadas.`);

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
      isEmpty,
      warnings,
      modelUsed,
    },
  };
}

export function cleanStageDirections(raw: string, stripDirections: boolean): string {
  if (!stripDirections) return raw.trim();
  let text = raw.replace(/\[[^\]]+\]/g, " ");
  text = text.replace(/\(([^)]{2,60})\)/g, (match, dir) => {
    const lower = String(dir).toLowerCase();
    return /pausa|voz|tono|susurr|triste|alegre|curios|seren|enérgic|energic|tenso|aliviad|pensativ|sorprend|escena|sfx|efecto|música|musica/i.test(
      lower
    )
      ? " "
      : match;
  });
  text = text.replace(/^(?:ESCENA|SCENE|TOMA|CLIP)\s*\d+\s*[:\-–—]?.*$/gim, "");
  return text.replace(/[ \t]{2,}/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

export function applyPronunciationGlossary(
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
 * Extracts structured HTTP status and human-readable messages from Gemini SDK errors.
 */
export function classifyGeminiError(error: any): { status: number; message: string; isQuota: boolean } {
  let code = Number(error?.status ?? error?.code ?? error?.error?.code ?? 0);
  let reason = "";
  const rawMessage = String(error?.message || error || "Error interno al generar audio.");

  const jsonStart = rawMessage.indexOf("{");
  if (jsonStart >= 0) {
    try {
      const parsed = JSON.parse(rawMessage.slice(jsonStart));
      const errObj = parsed?.error || parsed;
      if (!code && errObj?.code) code = Number(errObj.code);
      if (errObj?.status) reason = String(errObj.status);
      const errorInfo = Array.isArray(errObj?.details)
        ? errObj.details.find((d: any) => d?.reason)
        : null;
      if (errorInfo?.reason) reason = String(errorInfo.reason);
    } catch {
      // Fall back to raw message
    }
  }

  if (code === 429 || reason === "RESOURCE_EXHAUSTED") {
    return {
      status: 429,
      isQuota: true,
      message:
        "Se alcanzó el límite de cuota o velocidad de la API de Gemini (429). Espera unos segundos o revisa tu plan en Settings > Secrets.",
    };
  }

  if (
    code === 401 ||
    code === 403 ||
    reason === "API_KEY_INVALID" ||
    reason === "PERMISSION_DENIED"
  ) {
    return {
      status: code === 401 ? 401 : 403,
      isQuota: false,
      message:
        "La clave GEMINI_API_KEY no es válida o no tiene permisos para este modelo. Verifica tu clave en Settings > Secrets.",
    };
  }

  if (code === 404 || reason === "NOT_FOUND") {
    return {
      status: 404,
      isQuota: false,
      message: `El modelo configurado no fue encontrado por la API: ${rawMessage}`,
    };
  }

  if (code === 400) {
    return {
      status: 400,
      isQuota: false,
      message: `Solicitud rechazada por la API de Gemini (400): ${rawMessage}`,
    };
  }

  return {
    status: code >= 400 && code < 600 ? code : 500,
    isQuota: false,
    message: rawMessage,
  };
}
