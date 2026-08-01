type TextColor = '#000000' | '#ffffff';

const hexToRgb = (hex: string): [number, number, number] => {
  // Converts a 6-digit hexadecimal color string (e.g., "#FF00AA") to its RGB components.
  const normalizedHex = hex.startsWith('#') ? hex.slice(1) : hex;

  if (normalizedHex.length !== 6 || !/^[0-9A-Fa-f]{6}$/.test(normalizedHex)) {
    throw new Error(`Invalid hex color format: ${hex}`);
  }

  const bigint = parseInt(normalizedHex, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;

  return [r, g, b];
};

export const getTextColor = (backgroundColor: string, threshold = 128): TextColor => {
  // Determines the ideal text color (black or white) against a given background hex color
  try {
    const [r, g, b] = hexToRgb(backgroundColor);

    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > threshold ? '#000000' : '#ffffff';
  } catch (error) {
    console.error(error);
    return '#ffffff';
  }
};

const stringToHash = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to a 32bit integer
  }
  return Math.abs(hash);
};

const hslToHex = (h: number, s: number, l: number): string => {
  // Converts an HSL color to a standard 6-digit hex string (#RRGGBB).
  let r: number, g: number, b: number;

  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h / 360 + 1 / 3);
    g = hue2rgb(p, q, h / 360);
    b = hue2rgb(p, q, h / 360 - 1 / 3);
  }

  const toHex = (c: number): string => {
    const hex = Math.round(c * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

export const getColorFromString = (inputString: string): string => {
  // Deterministically generates a vivid hex color based on the input string.
  // The same string will *always* return the same color.

  if (!inputString || inputString.length === 0) {
    return '#808080';
  }

  const hash = stringToHash(inputString);
  const HUE = hash % 360;
  const SATURATION = 0.7;
  const LIGHTNESS = 0.5;
  return hslToHex(HUE, SATURATION, LIGHTNESS);
};
