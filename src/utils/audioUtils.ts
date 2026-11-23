import * as lamejs from "@breezystack/lamejs";
import { AudioQualityMetrics } from "../types";

export interface ParsedAudio {
  samples: Int16Array;
  sampleRate: number;
  channels: number;
  bitDepth: number;
  durationSec: number;
}

export function base64ToBytes(base64Data: string): Uint8Array {
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Parses either raw 16-bit mono PCM (Gemini 2.5 TTS default, 24 kHz) OR a RIFF WAV buffer.
 */
export function parseAudioBase64(base64Data: string, fallbackSampleRate = 24000): ParsedAudio {
  const bytes = base64ToBytes(base64Data);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  const isRiff =
    bytes.byteLength >= 44 &&
    view.getUint8(0) === 0x52 &&
    view.getUint8(1) === 0x49 &&
    view.getUint8(2) === 0x46 &&
    view.getUint8(3) === 0x46 &&
    view.getUint8(8) === 0x57 &&
    view.getUint8(9) === 0x41 &&
    view.getUint8(10) === 0x56 &&
    view.getUint8(11) === 0x45;

  if (!isRiff) {
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
      durationSec: fallbackSampleRate > 0 ? samples.length / fallbackSampleRate : 0,
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

    if (chunkId === "fmt " && offset + 24 <= bytes.byteLength) {
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
 * Clean normalization to -1.5 dBFS and optional dead-silence trim.
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
    const threshold = 240;
    const pad = Math.floor(sampleRate * 0.08);
    while (start < samples.length && Math.abs(samples[start]) < threshold) start++;
    while (end > start && Math.abs(samples[end - 1]) < threshold) end--;
    if (start >= end) return samples;
    start = Math.max(0, start - pad);
    end = Math.min(samples.length, end + pad);
  }

  const sliced = samples.subarray(start, end);
  if (!options.normalize) return new Int16Array(sliced);

  let maxAbs = 0;
  for (let i = 0; i < sliced.length; i++) {
    const abs = Math.abs(sliced[i]);
    if (abs > maxAbs) maxAbs = abs;
  }
  if (maxAbs < 100) return new Int16Array(sliced);

  const gain = Math.min(2.8, 27550 / maxAbs);
  const output = new Int16Array(sliced.length);
  for (let i = 0; i < sliced.length; i++) {
    output[i] = Math.max(-32767, Math.min(32767, Math.round(sliced[i] * gain)));
  }
  return output;
}

export function concatenatePcmClips(
  clips: Array<{ samples: Int16Array; pauseAfterMs: number }>,
  sampleRate: number,
  leadInMs = 150,
  leadOutMs = 250
): Int16Array {
  const leadIn = Math.max(0, Math.floor((sampleRate * leadInMs) / 1000));
  const leadOut = Math.max(0, Math.floor((sampleRate * leadOutMs) / 1000));

  let total = leadIn + leadOut;
  clips.forEach((c, idx) => {
    total += c.samples.length;
    if (idx < clips.length - 1) {
      total += Math.max(0, Math.floor((sampleRate * c.pauseAfterMs) / 1000));
    }
  });

  const combined = new Int16Array(total);
  let cursor = leadIn;
  clips.forEach((c, idx) => {
    combined.set(c.samples, cursor);
    cursor += c.samples.length;
    if (idx < clips.length - 1) {
      cursor += Math.max(0, Math.floor((sampleRate * c.pauseAfterMs) / 1000));
    }
  });
  return combined;
}

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
  const isEmpty = peak < 120 || durationSec < 0.2;
  const warnings: string[] = [];
  if (isEmpty) warnings.push("Nivel de señal muy bajo o audio vacío.");
  if (clippedSamples > 12) warnings.push(`Se detectaron ${clippedSamples} muestras saturadas.`);

  return {
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
  };
}

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

  for (let i = 0; i < samples.length; i++) {
    view.setInt16(44 + i * 2, samples[i], true);
  }
  return new Blob([buffer], { type: "audio/wav" });
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
}

export function pcmInt16ToMp3Blob(
  samples: Int16Array,
  sampleRate = 24000,
  channels = 1,
  kbps = 192
): Blob {
  const Mp3EncoderCtor =
    (lamejs as any).Mp3Encoder || (lamejs as any).default?.Mp3Encoder;
  if (typeof Mp3EncoderCtor !== "function") {
    throw new Error("Codificador MP3 no disponible.");
  }
  const encoder = new Mp3EncoderCtor(channels, sampleRate, kbps);
  const mp3Data: Uint8Array[] = [];
  for (let i = 0; i < samples.length; i += 1152) {
    const buf = encoder.encodeBuffer(samples.subarray(i, i + 1152));
    if (buf.length > 0) mp3Data.push(new Uint8Array(buf));
  }
  const tail = encoder.flush();
  if (tail.length > 0) mp3Data.push(new Uint8Array(tail));
  return new Blob(mp3Data, { type: "audio/mpeg" });
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      const idx = result.indexOf(",");
      resolve(idx >= 0 ? result.slice(idx + 1) : result);
    };
    reader.onerror = () => reject(new Error("No se pudo leer el archivo de audio."));
    reader.readAsDataURL(blob);
  });
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "00:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
