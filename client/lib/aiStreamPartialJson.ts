/**
 * Extrait une valeur string d'un JSON incomplet pendant le streaming SSE.
 * Permet d'afficher la réflexion IA avant que le JSON entier soit valide.
 */
export function extractPartialJsonString(
  raw: string,
  field: string,
): string {
  const marker = `"${field}"`;
  const keyIndex = raw.indexOf(marker);
  if (keyIndex === -1) return "";

  const colonIndex = raw.indexOf(":", keyIndex + marker.length);
  if (colonIndex === -1) return "";

  let index = colonIndex + 1;
  while (index < raw.length && /\s/.test(raw[index] ?? "")) {
    index += 1;
  }
  if (raw[index] !== '"') return "";

  index += 1;
  let result = "";
  while (index < raw.length) {
    const char = raw[index];
    if (char === "\\") {
      const next = raw[index + 1];
      if (next === "n") result += "\n";
      else if (next === "t") result += "\t";
      else if (next === "r") result += "\r";
      else if (next === '"') result += '"';
      else if (next === "\\") result += "\\";
      else if (next !== undefined) result += next;
      index += 2;
      continue;
    }
    if (char === '"') break;
    result += char;
    index += 1;
  }
  return result;
}

export function hasPartialJsonField(raw: string, field: string): boolean {
  return extractPartialJsonString(raw, field).length > 0;
}
