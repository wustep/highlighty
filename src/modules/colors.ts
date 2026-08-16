export function hexClean(hex: string): string {
  return hex.length === 9 && hex.slice(-2).toLowerCase() === 'ff' ? hex.slice(0, 7) : hex;
}

export function rgbaToHex(rgba: Array<number | string>): string {
  if (!Array.isArray(rgba) || rgba.length < 3 || rgba.length > 4) return '';

  const channels = rgba.map((value, index) => {
    const number = Number(value);
    if (!Number.isFinite(number)) return null;
    const scaled = index === 3 ? number * 255 : number;
    return Math.max(0, Math.min(255, Math.round(scaled)))
      .toString(16)
      .padStart(2, '0');
  });

  return channels.includes(null) ? '' : hexClean(`#${channels.join('')}`);
}

export function rgbaStringToHex(rgbaString: string): string {
  const match = rgbaString.match(
    /^rgba?\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)(?:\s*,\s*(\d*\.?\d+)\s*)?\)$/,
  );
  if (!match) return rgbaString;
  return rgbaToHex(match.slice(1).filter((channel) => channel !== undefined));
}

export function hexToRgbArray(hexString: string): number[] | null {
  const match = hexString.match(/^#([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})(?:[a-f\d]{2})?$/i);
  return match ? match.slice(1).map((channel) => Number.parseInt(channel, 16)) : null;
}

export function getTextColor(hex: string): '#000000' | '#ffffff' {
  const rgb = hexToRgbArray(hex);
  if (!rgb) return '#ffffff';
  const luminance = (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255;
  return luminance > 0.5 ? '#000000' : '#ffffff';
}
