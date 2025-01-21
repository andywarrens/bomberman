import Konva from "konva";

type KonvaFilter = (typeof Konva.Filters)[keyof typeof Konva.Filters];

export function greenToAlpha(tolerance: number): KonvaFilter {
  return function (imageData) {
    // make all pixels opaque 100%
    const nPixels = imageData.data.length;
    const { data } = imageData;
    for (let i = 0; i < nPixels - 4; i += 4) {
      const r = data[i] / 255; // Red
      const g = data[i + 1] / 255; // Green
      const b = data[i + 2] / 255; // Blue

      // Convert RGB to HSL
      const hsl = rgbToHsl(r, g, b);

      const targetHSL = { h: 137.65, s: 0.7391, l:0.2706 }

      const isGreen =
        Math.abs(hsl.h - targetHSL.h) < tolerance &&
        Math.abs(hsl.s - targetHSL.s) < tolerance &&
        Math.abs(hsl.l - targetHSL.l) < tolerance;
      if (isGreen) {
        imageData.data[i + 3] = 0;
      }
    }
  };
}

// in: r,g,b in [0,1]
// out: h in [0,360) and s,l in [0,1]
function rgbToHsl(r: number, g: number, b: number) {
  const v = Math.max(r, g, b),
    c = v - Math.min(r, g, b),
    f = 1 - Math.abs(v + v - c - 1);
  const h =
    c && (v == r ? (g - b) / c : v == g ? 2 + (b - r) / c : 4 + (r - g) / c);
  return { h: 60 * (h < 0 ? h + 6 : h),
           s: f ? c / f : 0,
           l: (v + v - c) / 2
  }
}
