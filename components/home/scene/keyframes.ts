/**
 * Camera + light keyframes for the scroll story. Kept free of three.js so the page can
 * compute scroll anchors before the 3D bundle loads.
 *
 * Story sections (DOM order): 0 hero, 1 Light (Ando), 2 Less (Mies), 3 Nature (Wright),
 * 4 Flow (Hadid), 5 finale. `at` = [section index, fraction of that section's height].
 */
export type Vec3 = [number, number, number];

export type Keyframe = {
  at: [number, number];
  pos: Vec3;
  tgt: Vec3;
  /** Camera rests here (eases in/out). Pass-through points keep moving. */
  hold: boolean;
  sunEl: number; // degrees
  sunAz: number; // degrees
  exposure: number;
  ambient: number;
  env: number;
  glow: number; // interior lights
  beam: number; // Ando light shaft
  fog: string;
  fogDensity: number;
};

const ANDO = { sunEl: 18.7, sunAz: 171 };

export const KEYFRAMES: Keyframe[] = [
  // Hero — dusk over the whole site
  { at: [0, 0], pos: [64, 11, 60], tgt: [-2, 4.5, -6], hold: true, sunEl: 2.2, sunAz: 258, exposure: 0.8, ambient: 0.16, env: 0.22, glow: 1, beam: 0, fog: "#9a7a66", fogDensity: 0.0024 },
  { at: [0, 0.72], pos: [-4, 15, 16], tgt: [-30, 3, -12], hold: false, sunEl: 12, sunAz: 205, exposure: 0.75, ambient: 0.38, env: 0.38, glow: 0.4, beam: 0, fog: "#76726b", fogDensity: 0.004 },
  // 01 Light — inside the concrete chapel
  { at: [1, 0.02], pos: [-34, 2.3, 4], tgt: [-34, 3.2, -16], hold: false, ...ANDO, exposure: 1.0, ambient: 0.14, env: 0.14, glow: 0, beam: 0.6, fog: "#8a8a86", fogDensity: 0.004 },
  { at: [1, 0.2], pos: [-35.6, 1.9, -9.2], tgt: [-33.1, 3.8, -21], hold: true, ...ANDO, exposure: 1.45, ambient: 0.025, env: 0.035, glow: 0, beam: 1, fog: "#8a8a86", fogDensity: 0.004 },
  { at: [1, 0.6], pos: [-36.0, 1.6, -11.6], tgt: [-33.0, 3.6, -21], hold: true, ...ANDO, exposure: 1.45, ambient: 0.025, env: 0.035, glow: 0, beam: 1, fog: "#8a8a86", fogDensity: 0.004 },
  { at: [1, 0.78], pos: [-34.1, 2.0, -3.6], tgt: [-33, 2.6, -14], hold: false, ...ANDO, exposure: 1.1, ambient: 0.12, env: 0.12, glow: 0, beam: 0.5, fog: "#8a8a86", fogDensity: 0.004 },
  { at: [1, 0.95], pos: [-27, 2.8, 5], tgt: [-14, 2.2, -2], hold: false, sunEl: 24, sunAz: 150, exposure: 0.9, ambient: 0.32, env: 0.22, glow: 0.2, beam: 0, fog: "#aeb8bf", fogDensity: 0.0014 },
  // 02 Less — the glass pavilion
  { at: [2, 0.2], pos: [-21, 2.0, 25], tgt: [-3, 2.6, 1], hold: true, sunEl: 26, sunAz: 140, exposure: 0.92, ambient: 0.34, env: 0.2, glow: 0.3, beam: 0, fog: "#aeb8bf", fogDensity: 0.0011 },
  { at: [2, 0.6], pos: [-12, 1.8, 20], tgt: [1, 2.4, 0], hold: true, sunEl: 23, sunAz: 150, exposure: 0.92, ambient: 0.34, env: 0.2, glow: 0.35, beam: 0, fog: "#aeb8bf", fogDensity: 0.0011 },
  // 03 Nature — cantilevers over water
  { at: [3, 0.2], pos: [36, -1.6, 19], tgt: [17, 1.6, 0], hold: true, sunEl: 7, sunAz: 95, exposure: 0.85, ambient: 0.35, env: 0.4, glow: 0.7, beam: 0, fog: "#957f6b", fogDensity: 0.004 },
  { at: [3, 0.6], pos: [31, -1.0, 23.5], tgt: [16, 2.4, 1], hold: true, sunEl: 5, sunAz: 92, exposure: 0.85, ambient: 0.33, env: 0.38, glow: 0.8, beam: 0, fog: "#8f7764", fogDensity: 0.004 },
  // 04 Flow — the parametric pavilion at blue hour
  { at: [4, 0.2], pos: [10, 2.6, 49], tgt: [-4, 2.9, 30], hold: true, sunEl: -1.5, sunAz: 250, exposure: 1.05, ambient: 0.3, env: 0.3, glow: 1, beam: 0, fog: "#394155", fogDensity: 0.004 },
  { at: [4, 0.6], pos: [-16.5, 2.2, 46], tgt: [-4, 2.7, 30], hold: true, sunEl: -2.5, sunAz: 252, exposure: 1.05, ambient: 0.28, env: 0.28, glow: 1, beam: 0, fog: "#333a4d", fogDensity: 0.004 },
  // Finale — night, crane shot
  { at: [5, 0.45], pos: [34, 34, 64], tgt: [-3, 0, 4], hold: true, sunEl: -8, sunAz: 260, exposure: 1.25, ambient: 0.3, env: 0.25, glow: 1.3, beam: 0, fog: "#12141a", fogDensity: 0.0028 },
];
