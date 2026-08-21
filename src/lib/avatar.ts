/** Deterministic avatar helpers — same input always yields the same look. */

const PALETTE = [
  '#7A4A45', // clay
  '#4A5A6B', // slate blue
  '#4F6B57', // moss
  '#6B5B45', // umber
  '#5C5470', // heather
  '#7A4F5C', // mulberry
  '#43616B', // teal ink
  '#65674A', // olive
  '#5A4E63', // plum
  '#7A6248', // sand
  '#456B66', // pine
  '#6B4A5F', // damson
];

/** "Priya Sharma" -> "PS"; "Rahul" -> "RA"; "" -> "?" */
export function generateInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Stable hash -> palette colour. */
export function colorFromString(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

/** Readable foreground for a solid avatar background. */
export function contrastText(hex: string): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#0f172a' : '#ffffff';
}
