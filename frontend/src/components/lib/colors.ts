/**
 * Converts a 6-digit hexadecimal color string (e.g., "#FF00AA") to its RGB components.
 * @param hex A 6-digit hex color string, optionally starting with '#'.
 * @returns An array [R, G, B] of numbers (0-255).
 * @throws Error if the hex string is not valid.
 */
const hexToRgb = (hex: string): [number, number, number] => {
  // Remove the hash if present
  const normalizedHex = hex.startsWith('#') ? hex.slice(1) : hex;

  if (normalizedHex.length !== 6 || !/^[0-9A-Fa-f]{6}$/.test(normalizedHex)) {
    // A production-ready component might handle this with a default color instead of throwing.
    throw new Error(`Invalid hex color format: ${hex}`);
  }

  const bigint = parseInt(normalizedHex, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  
  return [r, g, b];
};

// Define the valid return colors for clarity
type TextColor = '#000000' | '#ffffff';

/**
 * Determines the ideal text color (black or white) for maximum contrast
 * against a given background hex color using a simplified perceived brightness
 * calculation (luminance approximation).
 * * @param backgroundColor A 6-digit hex color string (e.g., "#3399CC").
 * @returns Either '#000000' (Black) or '#FFFFFF' (White).
 */
export const getTextColor = (backgroundColor: string, threshold: number = 128): TextColor => {
  try {
    const [r, g, b] = hexToRgb(backgroundColor);

    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > threshold ? '#000000' : '#ffffff'; 

  } catch (error) {
    console.error(error);
    return '#ffffff'; 
  }
};
