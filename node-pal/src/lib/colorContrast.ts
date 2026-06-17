function parseHex(hex: string): { r: number; g: number; b: number } | null {
  const normalized = hex.trim().replace("#", "");
  if (normalized.length === 3) {
    return {
      r: parseInt(normalized[0] + normalized[0], 16),
      g: parseInt(normalized[1] + normalized[1], 16),
      b: parseInt(normalized[2] + normalized[2], 16),
    };
  }
  if (normalized.length === 6) {
    return {
      r: parseInt(normalized.slice(0, 2), 16),
      g: parseInt(normalized.slice(2, 4), 16),
      b: parseInt(normalized.slice(4, 6), 16),
    };
  }
  return null;
}

/** Returns a high-contrast foreground color for text/icons on the given background. */
export function getContrastTextColor(background: string): "#ffffff" | "#0f172a" {
  const rgb = parseHex(background);
  if (!rgb) return "#0f172a";
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.55 ? "#0f172a" : "#ffffff";
}

/** Blend accent toward white for a softer, premium header tone. */
export function softenAccentColor(hex: string, mix = 0.22): string {
  const rgb = parseHex(hex);
  if (!rgb) return hex;
  const blend = (channel: number) => Math.round(channel + (255 - channel) * mix);
  const toHex = (value: number) => value.toString(16).padStart(2, "0");
  return `#${toHex(blend(rgb.r))}${toHex(blend(rgb.g))}${toHex(blend(rgb.b))}`;
}
