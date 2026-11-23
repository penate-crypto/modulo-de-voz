/**
 * Splits long scripts into ~850-character chunks strictly at sentence boundaries.
 */
export function splitTextIntoChunks(text: string, maxChars = 850): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  if (trimmed.length <= maxChars) return [trimmed];

  const paragraphs = trimmed
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
  const chunks: string[] = [];
  let current = "";

  for (const para of paragraphs) {
    const sentences = para.match(/[^.!?…]+[.!?…]*\s*/g) || [para];
    for (const rawSentence of sentences) {
      const sentence = rawSentence.trim();
      if (!sentence) continue;

      if (sentence.length > maxChars) {
        if (current) {
          chunks.push(current.trim());
          current = "";
        }
        const words = sentence.split(/\s+/);
        let piece = "";
        for (const w of words) {
          if ((piece + " " + w).trim().length > maxChars && piece) {
            chunks.push(piece.trim());
            piece = w;
          } else {
            piece = (piece + " " + w).trim();
          }
        }
        if (piece) chunks.push(piece.trim());
        continue;
      }

      if ((current + " " + sentence).trim().length > maxChars && current) {
        chunks.push(current.trim());
        current = sentence;
      } else {
        current = current ? `${current} ${sentence}` : sentence;
      }
    }
  }

  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

export function stripStageDirectionsFromText(raw: string): string {
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

/**
 * Parses "Nombre: línea" dialogue text, normalizing speaker names with .trim().
 */
export function parseDialogueLines(
  rawScript: string,
  fallbackSpeaker1: string,
  fallbackSpeaker2: string
): Array<{ speaker: string; text: string }> {
  const s1 = fallbackSpeaker1.trim() || "Personaje 1";
  const s2 = fallbackSpeaker2.trim() || "Personaje 2";
  const lines = rawScript
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);

  const turns: Array<{ speaker: string; text: string }> = [];
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^([^:]{1,40}):\s*(.+)$/);
    if (match) {
      turns.push({ speaker: match[1].trim(), text: match[2].trim() });
    } else if (turns.length > 0) {
      turns[turns.length - 1].text += " " + lines[i];
    } else {
      turns.push({ speaker: i % 2 === 0 ? s1 : s2, text: lines[i] });
    }
  }
  return turns;
}

/**
 * Removes "Nombre: " speaker prefixes so transcription QA compares only spoken words.
 */
export function stripSpeakerLabels(text: string): string {
  return text
    .split(/\n+/)
    .map((line) => line.replace(/^[^:\n]{1,40}:\s*/, "").trim())
    .filter(Boolean)
    .join(" ");
}

export function buildFilename(base: string, ext: "wav" | "mp3"): string {
  const now = new Date();
  const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate()
  ).padStart(2, "0")}`;
  const safe =
    base
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 32) || "VozEscena";
  return `${safe}_${stamp}.${ext}`;
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
