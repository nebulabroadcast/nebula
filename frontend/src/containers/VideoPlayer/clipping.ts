import type { OverlayRenderer } from './PlayerEngine';

/**
 * Highlights pixels riding the edge of the nominal broadcast Y'CbCr range,
 * once the displayed RGB is converted the way an output chain (CasparCG,
 * DeckLink, the downstream encoder) would convert it. Luma and chroma are
 * checked independently, since a pixel can have perfectly nominal luma while
 * its chroma, derived from a saturated color, is the one riding the edge.
 *
 * A genuine excursion *beyond* the nominal range can't actually be observed
 * here: the RGB -> Y'CbCr matrix is linear and, by construction of the
 * standard, maps the entire 8-bit RGB cube exactly onto [16,235] (luma) and
 * [16,240] (chroma) - a fully saturated color such as RGB(255,0,0) lands
 * exactly on the boundary (Cr=240), never past it, for any RGB whatsoever.
 * Whatever pushed a real signal further than that has already been clipped
 * by the time it reaches this decoded frame. So instead of checking for
 * "outside nominal range" (which never happens), this checks for "how close
 * to the edge of nominal range" - comfortably inside is safe, close to the
 * edge is a warning (some headroom left, but not much), and sitting right on
 * the edge is a danger (already at the limit; any further push - a
 * generation of re-encoding, a resample, a gain nudge - clips it for real).
 */

export interface ClippingOptions {
  luma: boolean;
  chroma: boolean;
}

const LUMA_MIN = 16;
const LUMA_MAX = 235;
const CHROMA_MIN = 16;
const CHROMA_MAX = 240;

// A pixel within this many code values of the edge is a warning; within
// EPSILON of the edge it's a danger. Real graded footage routinely dips into
// the warning band (shadow detail, bright highlights) - only content with
// zero headroom left should read as danger.
const WARN_MARGIN = 8;
const EPSILON = 0.5;

// Full-range RGB (0-255) to studio-range BT.709 Y'CbCr, coefficients scaled
// by 1/255 up front so the per-pixel work is a handful of multiply-adds.
const KY_R = 65.481 / 255;
const KY_G = 128.553 / 255;
const KY_B = 24.966 / 255;
const KCB_R = -37.797 / 255;
const KCB_G = -74.203 / 255;
const KCB_B = 112.0 / 255;
const KCR_R = 112.0 / 255;
const KCR_G = -93.786 / 255;
const KCR_B = -18.214 / 255;

const NONE = 0;
const WARNING = 1;
const DANGER = 2;

/** How close `value` is to `min` from inside [min, max], as a severity */
const proximityToMin = (value: number, min: number) => {
  const headroom = value - min;
  if (headroom > WARN_MARGIN) return NONE;
  return headroom > EPSILON ? WARNING : DANGER;
};

/** How close `value` is to `max` from inside [min, max], as a severity */
const proximityToMax = (value: number, max: number) => {
  const headroom = max - value;
  if (headroom > WARN_MARGIN) return NONE;
  return headroom > EPSILON ? WARNING : DANGER;
};

// One color per kind of proximity, so the cause is visible at a glance, with
// a lower-alpha variant for the warning tier.
const LUMA_LOW_COLOR: [number, number, number] = [0, 110, 255]; // near/at black: blue
const LUMA_HIGH_COLOR: [number, number, number] = [255, 30, 30]; // near/at white: red
const CHROMA_COLOR: [number, number, number] = [255, 0, 255]; // near/at chroma edge: magenta

const WARNING_ALPHA = 0.35;
const DANGER_ALPHA = 0.7;

export const makeClippingOverlay = (options: ClippingOptions): OverlayRenderer => {
  return (context, width, height, _scale) => {
    if (!options.luma && !options.chroma) return;

    const imageData = context.getImageData(0, 0, width, height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      let color: [number, number, number] | null = null;
      let severity = NONE;

      if (options.luma) {
        const y = 16 + KY_R * r + KY_G * g + KY_B * b;
        const low = proximityToMin(y, LUMA_MIN);
        const high = proximityToMax(y, LUMA_MAX);
        if (low > severity) {
          severity = low;
          color = LUMA_LOW_COLOR;
        }
        if (high > severity) {
          severity = high;
          color = LUMA_HIGH_COLOR;
        }
      }

      if (options.chroma) {
        const cb = 128 + KCB_R * r + KCB_G * g + KCB_B * b;
        const cr = 128 + KCR_R * r + KCR_G * g + KCR_B * b;
        const chromaSeverity = Math.max(
          proximityToMin(cb, CHROMA_MIN),
          proximityToMax(cb, CHROMA_MAX),
          proximityToMin(cr, CHROMA_MIN),
          proximityToMax(cr, CHROMA_MAX)
        );
        // chroma takes priority over luma at equal severity: it's the less
        // obvious case the luma check alone would miss
        if (chromaSeverity >= severity && chromaSeverity !== NONE) {
          severity = chromaSeverity;
          color = CHROMA_COLOR;
        }
      }

      if (!color || severity === NONE) continue;

      const alpha = severity === DANGER ? DANGER_ALPHA : WARNING_ALPHA;
      data[i] = r + (color[0] - r) * alpha;
      data[i + 1] = g + (color[1] - g) * alpha;
      data[i + 2] = b + (color[2] - b) * alpha;
    }

    context.putImageData(imageData, 0, 0);
  };
};
