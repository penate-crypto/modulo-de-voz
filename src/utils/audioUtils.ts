import * as lamejs from "@breezystack/lamejs";
import { AudioQualityMetrics } from "../types";

export interface ParsedWav {
  samples: Int16Array;
  sampleRate: number;
  channels: number;
  bitDepth: number;
  durationSec: number;
}

/**
 * Decodes a Base64 string into a Uint8Array safely.
 */
export function base64ToBytes(base64Data: string): Uint8Array {
  const binaryString = atob(base64Data);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Parses a standard RIFF WAV buffer (or falls back to raw 24kHz 16-bit mono PCM if no RIFF header).
 * Properly scans chunks so extra metadata chunks never corrupt PCM extraction.
 */
export function parseAudioBase64(base64Data: string, fallbackSampleRate = 24000): ParsedWav {
  const bytes = base64ToBytes(base64Data);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  const isRiff =
    bytes.byteLength >= 44 &&
    view.getUint8(0) === 0x52 && // R
    view.getUint8(1) === 0x49 && // I
    view.getUint8(2) === 0x46 && // F
    view.getUint8(3) === 0x46 && // F
    view.getUint8(8) === 0x57 && // W
    view.getUint8(9) === 0x41 && // A
    view.getUint8(10) === 0x56 && // V
    view.getUint8(11) === 0x45; // E

  if (!isRiff) {
    // Raw 16-bit little-endian PCM
    const alignedLen = bytes.byteLength - (bytes.byteLength % 2);
    const samples = new Int16Array(alignedLen / 2);
    for (let i = 0; i < samples.length; i++) {
      samples[i] = view.getInt16(i * 2, true);
    }
    return {
      samples,
      sampleRate: fallbackSampleRate,
      channels: 1,
      bitDepth: 16,
      durationSec: samples.length / fallbackSampleRate,
    };
  }

  let sampleRate = fallbackSampleRate;
  let channels = 1;
  let bitDepth = 16;
  let dataOffset = 44;
  let dataSize = bytes.byteLength - 44;

  let offset = 12;
  while (offset + 8 <= bytes.byteLength) {
    const chunkId =
      String.fromCharCode(view.getUint8(offset)) +
      String.fromCharCode(view.getUint8(offset + 1)) +
      String.fromCharCode(view.getUint8(offset + 2)) +
      String.fromCharCode(view.getUint8(offset + 3));
    const chunkSize = view.getUint32(offset + 4, true);

    if (chunkId === "fmt " && offset + 8 + 16 <= bytes.byteLength) {
      channels = view.getUint16(offset + 10, true) || 1;
      sampleRate = view.getUint32(offset + 12, true) || fallbackSampleRate;
      bitDepth = view.getUint16(offset + 22, true) || 16;
    } else if (chunkId === "data") {
      dataOffset = offset + 8;
      dataSize = Math.min(chunkSize, bytes.byteLength - dataOffset);
      break;
    }

    offset += 8 + chunkSize + (chunkSize % 2);
  }

  const sampleCount = Math.floor(dataSize / 2);
  const samples = new Int16Array(sampleCount);
  for (let i = 0; i < sampleCount; i++) {
    samples[i] = view.getInt16(dataOffset + i * 2, true);
  }

  return {
    samples,
    sampleRate,
    channels,
    bitDepth,
    durationSec: sampleRate > 0 ? sampleCount / (sampleRate * channels) : 0,
  };
}

/**
 * Clean studio normalization: brings peaks cleanly to -1.5 dBFS without clipping,
 * and trims accidental excessive dead silence (>180ms) while preserving soft speech onset.
 */
export function processStudioPcm(
  samples: Int16Array,
  sampleRate: number,
  options: { normalize?: boolean; trimDeadSilence?: boolean } = {}
): Int16Array {
  if (samples.length === 0) return samples;

  let start = 0;
  let end = samples.length;

  if (options.trimDeadSilence) {
    const silenceThreshold = 260; // ~ -42 dBFS
    const padSamples = Math.floor(sampleRate * 0.08); // Keep 80ms natural air cushion

    while (start < samples.length && Math.abs(samples[start]) < silenceThreshold) {
      start++;
    }
    while (end > start && Math.abs(samples[end - 1]) < silenceThreshold) {
      end--;
    }

    if (start >= end) {
      // Entire clip is near-silent, return original so QA flags it honestly
      return samples;
    }

    start = Math.max(0, start - padSamples);
    end = Math.min(samples.length, end + padSamples);
  }

  const sliced = samples.subarray(start, end);
  if (!options.normalize) {
    return new Int16Array(sliced);
  }

  let maxAbs = 0;
  for (let i = 0; i < sliced.length; i++) {
    const abs = Math.abs(sliced[i]);
    if (abs > maxAbs) maxAbs = abs;
  }

  if (maxAbs < 100) {
    return new Int16Array(sliced);
  }

  // Target peak: -1.5 dBFS (~27550 on 32767 scale) to prevent distortion & keep level consistent
  const targetPeak = 27550;
  const gain = Math.min(2.8, targetPeak / maxAbs);

  const output = new Int16Array(sliced.length);
  for (let i = 0; i < sliced.length; i++) {
    const scaled = Math.round(sliced[i] * gain);
    output[i] = Math.max(-32767, Math.min(32767, scaled));
  }
  return output;
}

/**
 * Concatenates multiple ordered scene/dialogue PCM clips with explicit lead-in,
 * per-clip pause durations, and lead-out silence margins for video editing sync.
 */
export function concatenatePcmClips(
  clips: Array<{ samples: Int16Array; pauseAfterMs: number }>,
  sampleRate: number,
  leadInMs = 150,
  leadOutMs = 300
): Int16Array {
  const leadInSamples = Math.max(0, Math.floor((sampleRate * leadInMs) / 1000));
  const leadOutSamples = Math.max(0, Math.floor((sampleRate * leadOutMs) / 1000));

  let totalLength = leadInSamples + leadOutSamples;
  clips.forEach((clip, idx) => {
    totalLength += clip.samples.length;
    if (idx < clips.length - 1) {
      totalLength += Math.max(0, Math.floor((sampleRate * clip.pauseAfterMs) / 1000));
    }
  });

  const combined = new Int16Array(totalLength);
  let cursor = leadInSamples;

  clips.forEach((clip, idx) => {
    combined.set(clip.samples, cursor);
    cursor += clip.samples.length;
    if (idx < clips.length - 1) {
      cursor += Math.max(0, Math.floor((sampleRate * clip.pauseAfterMs) / 1000));
    }
  });

  return combined;
}

/**
 * Computes real normalized amplitude peaks (0..100) for honest waveform rendering.
 */
export function extractWaveformPeaks(samples: Int16Array, barCount = 48): number[] {
  if (samples.length === 0) return new Array(barCount).fill(4);
  const blockSize = Math.max(1, Math.floor(samples.length / barCount));
  const peaks: number[] = [];

  for (let i = 0; i < barCount; i++) {
    const start = i * blockSize;
    const end = Math.min(samples.length, start + blockSize);
    let maxVal = 0;
    for (let j = start; j < end; j++) {
      const abs = Math.abs(samples[j]);
      if (abs > maxVal) maxVal = abs;
    }
    const pct = Math.min(100, Math.max(6, Math.round((maxVal / 32767) * 100)));
    peaks.push(pct);
  }
  return peaks;
}

/**
 * Analyzes real PCM samples for objective audio quality metrics.
 */
export function analyzePcmQuality(
  samples: Int16Array,
  sampleRate: number,
  channels: number,
  bitDepth: number,
  modelUsed: string
): AudioQualityMetrics {
  const durationSec = sampleRate > 0 ? samples.length / (sampleRate * channels) : 0;
  if (samples.length === 0) {
    return {
      sampleRate,
      bitDepth,
      channels,
      durationSec: 0,
      rmsDb: -96,
      peakDb: -96,
      clippedSamples: 0,
      leadingSilenceMs: 0,
      trailingSilenceMs: 0,
      isEmpty: true,
      warnings: ["El archivo de audio recibido está vacío."],
      modelUsed,
    };
  }

  let sumSq = 0;
  let peak = 0;
  let clippedSamples = 0;

  for (let i = 0; i < samples.length; i++) {
    const abs = Math.abs(samples[i]);
    if (abs > peak) peak = abs;
    if (abs >= 32760) clippedSamples++;
    const norm = samples[i] / 32768;
    sumSq += norm * norm;
  }

  const rms = Math.sqrt(sumSq / samples.length);
  const rmsDb = rms > 0 ? Number((20 * Math.log10(rms)).toFixed(1)) : -96;
  const peakDb = peak > 0 ? Number((20 * Math.log10(peak / 32768)).toFixed(1)) : -96;

  const silenceThreshold = 260;
  let leadCount = 0;
  while (leadCount < samples.length && Math.abs(samples[leadCount]) < silenceThreshold) {
    leadCount++;
  }
  let trailCount = 0;
  while (
    trailCount < samples.length - leadCount &&
    Math.abs(samples[samples.length - 1 - trailCount]) < silenceThreshold
  ) {
    trailCount++;
  }

  const leadingSilenceMs = Math.round((leadCount / sampleRate) * 1000);
  const trailingSilenceMs = Math.round((trailCount / sampleRate) * 1000);
  const isEmpty = peak < 120 || durationSec < 0.25;

  const warnings: string[] = [];
  if (isEmpty) warnings.push("Nivel de señal extremadamente bajo o clip vacío.");
  if (clippedSamples > 12) warnings.push(`Se detectaron ${clippedSamples} muestras con posible recorte de pico.`);
  if (trailingSilenceMs < 20 && durationSec > 0.5) {
    warnings.push("El final del audio termina muy justo; revisa si alguna palabra quedó cortada.");
  }
  if (leadingSilenceMs > 1500) {
    warnings.push(`Silencio inicial prolongado (${(leadingSilenceMs / 1000).toFixed(1)} s).`);
  }

  return {
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
  };
}

/**
 * Encodes 16-bit PCM samples into a true uncompressed WAV Blob preserving original sample rate.
 */
export function pcmInt16ToWavBlob(
  samples: Int16Array,
  sampleRate = 24000,
  numChannels = 1
): Blob {
  const byteRate = sampleRate * numChannels * 2;
  const blockAlign = numChannels * 2;
  const dataSize = samples.length * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, "WAVE");

  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);

  writeString(view, 36, "data");
  view.setUint32(40, dataSize, true);

  const offset = 44;
  for (let i = 0; i < samples.length; i++) {
    view.setInt16(offset + i * 2, samples[i], true);
  }

  return new Blob([buffer], { type: "audio/wav" });
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

/**
 * Encodes 16-bit PCM samples into an MP3 Blob using @breezystack/lamejs.
 */
export function pcmInt16ToMp3Blob(
  samples: Int16Array,
  sampleRate = 24000,
  channels = 1,
  kbps = 192
): Blob {
  const Mp3EncoderCtor =
    (lamejs as any).Mp3Encoder || (lamejs as any).default?.Mp3Encoder;
  if (typeof Mp3EncoderCtor !== "function") {
    throw new Error("Codificador MP3 no disponible en este entorno.");
  }
  const encoder = new Mp3EncoderCtor(channels, sampleRate, kbps);
  const mp3Data: Uint8Array[] = [];
  const sampleBlockSize = 1152;

  for (let i = 0; i < samples.length; i += sampleBlockSize) {
    const chunk = samples.subarray(i, i + sampleBlockSize);
    const mp3buf = encoder.encodeBuffer(chunk);
    if (mp3buf.length > 0) {
      mp3Data.push(new Uint8Array(mp3buf));
    }
  }

  const endChunk = encoder.flush();
  if (endChunk.length > 0) {
    mp3Data.push(new Uint8Array(endChunk));
  }

  return new Blob(mp3Data, { type: "audio/mpeg" });
}

/**
 * Converts a WAV Blob to Base64 string for sending to transcription QA.
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      const commaIdx = result.indexOf(",");
      resolve(commaIdx >= 0 ? result.slice(commaIdx + 1) : result);
    };
    reader.onerror = () => reject(new Error("No se pudo leer el archivo de audio."));
    reader.readAsDataURL(blob);
  });
}

/**
 * Cleans production notes / stage directions from spoken text so they are never read aloud.
 */
export function stripStageDirectionsFromText(raw: string): {
  cleanText: string;
  extractedDirections: string[];
} {
  const extractedDirections: string[] = [];

  // Extract [bracketed notes] and (parenthetical directions)
  let text = raw.replace(/\[([^\]]+)\]/g, (_, dir) => {
    const trimmed = String(dir).trim();
    if (trimmed) extractedDirections.push(trimmed);
    return " ";
  });

  text = text.replace(/\(([^)]{2,60})\)/g, (match, dir) => {
    const lower = String(dir).toLowerCase().trim();
    const looksLikeDirection =
      /pausa|voz|tono|susurr|triste|alegre|curios|seren|enérgic|energic|tenso|aliviad|pensativ|sorprend|rápid|rapid|lent|escena|sfx|efecto|música|musica|respir/i.test(
        lower
      );
    if (looksLikeDirection) {
      extractedDirections.push(String(dir).trim());
      return " ";
    }
    return match;
  });

  // Remove standalone scene headers like "ESCENA 1:" or "Escena 2 -"
  text = text.replace(/^(?:ESCENA|SCENE|TOMA|CLIP)\s*\d+\s*[:\-–—]?.*$/gim, (line) => {
    extractedDirections.push(line.trim());
    return "";
  });

  const cleanText = text
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return { cleanText, extractedDirections };
}

/**
 * Builds clean slugged filename for audio exports.
 */
export function buildProjectFilename(
  projectName: string,
  suffix: string,
  ext: "wav" | "mp3"
): string {
  const now = new Date();
  const datePart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate()
  ).padStart(2, "0")}`;
  const safeProject =
    projectName
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 28) || "Proyecto_Audio";
  const safeSuffix = suffix
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return `${safeProject}_${safeSuffix}_${datePart}.${ext}`;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}
