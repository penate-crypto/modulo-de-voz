export function pcmToWav(pcmData: Uint8Array, sampleRate: number = 24000): Blob {
  const buffer = new ArrayBuffer(44 + pcmData.length);
  const view = new DataView(buffer);

  // 1. Chunk ID "RIFF"
  writeString(view, 0, "RIFF");
  // 2. Chunk Size (36 + data size)
  view.setUint32(4, 36 + pcmData.length, true);
  // 3. Format "WAVE"
  writeString(view, 8, "WAVE");

  // 4. Subchunk1 ID "fmt "
  writeString(view, 12, "fmt ");
  // 5. Subchunk1 Size (16 for PCM)
  view.setUint32(16, 16, true);
  // 6. Audio Format (1 = PCM)
  view.setUint16(20, 1, true);
  // 7. Num Channels (1 = Mono)
  view.setUint16(22, 1, true);
  // 8. Sample Rate (24000)
  view.setUint32(24, sampleRate, true);
  // 9. Byte Rate (SampleRate * NumChannels * BitsPerSample/8)
  view.setUint32(28, sampleRate * 1 * 2, true);
  // 10. Block Align (NumChannels * BitsPerSample/8)
  view.setUint16(32, 2, true);
  // 11. Bits Per Sample (16-bit)
  view.setUint16(34, 16, true);

  // 12. Subchunk2 ID "data"
  writeString(view, 36, "data");
  // 13. Subchunk2 Size (data length)
  view.setUint32(40, pcmData.length, true);

  // Copy raw PCM data into the buffer after the header
  const targetBuffer = new Uint8Array(buffer, 44);
  targetBuffer.set(pcmData);

  return new Blob([buffer], { type: "audio/wav" });
}

function writeString(view: DataView, offset: number, value: string) {
  for (let i = 0; i < value.length; i++) {
    view.setUint8(offset + i, value.charCodeAt(i));
  }
}

export function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}
