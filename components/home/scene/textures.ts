import * as THREE from "three";

/**
 * Procedural PBR texture sets (albedo + normal + roughness), generated on the CPU with
 * tileable value-noise so they repeat seamlessly. No downloads.
 */

export type TexSet = {
  map: THREE.DataTexture;
  normalMap: THREE.DataTexture;
  roughnessMap: THREE.DataTexture;
  emissiveMap?: THREE.DataTexture;
};

type RGB = [number, number, number];

// ---------------------------------------------------------------- noise

function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Periodic value noise in [0,1]: fx × fy lattice cells across the tile. */
function valueNoise(size: number, fx: number, fy: number, seed: number): Float32Array {
  const r = rng(seed);
  const lat = new Float32Array(fx * fy);
  for (let i = 0; i < lat.length; i++) lat[i] = r();
  const out = new Float32Array(size * size);
  const x0 = new Int32Array(size);
  const x1 = new Int32Array(size);
  const tx = new Float32Array(size);
  for (let x = 0; x < size; x++) {
    const f = (x / size) * fx;
    const i = Math.floor(f);
    const t = f - i;
    x0[x] = i % fx;
    x1[x] = (i + 1) % fx;
    tx[x] = t * t * (3 - 2 * t);
  }
  for (let y = 0; y < size; y++) {
    const f = (y / size) * fy;
    const j = Math.floor(f);
    let t = f - j;
    t = t * t * (3 - 2 * t);
    const r0 = (j % fy) * fx;
    const r1 = ((j + 1) % fy) * fx;
    const row = y * size;
    for (let x = 0; x < size; x++) {
      const a = lat[r0 + x0[x]];
      const b = lat[r0 + x1[x]];
      const c = lat[r1 + x0[x]];
      const d = lat[r1 + x1[x]];
      const top = a + (b - a) * tx[x];
      const bot = c + (d - c) * tx[x];
      out[row + x] = top + (bot - top) * t;
    }
  }
  return out;
}

/** Fractal noise, normalized to [0,1]. Frequencies must divide evenly to stay tileable. */
function fbm(size: number, fx: number, fy: number, octaves: number, seed: number, gain = 0.5): Float32Array {
  const out = new Float32Array(size * size);
  let amp = 1;
  let total = 0;
  for (let o = 0; o < octaves; o++) {
    const n = valueNoise(size, fx << o, fy << o, seed + o * 101);
    for (let i = 0; i < out.length; i++) out[i] += n[i] * amp;
    total += amp;
    amp *= gain;
  }
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < out.length; i++) {
    out[i] /= total;
    if (out[i] < min) min = out[i];
    if (out[i] > max) max = out[i];
  }
  const span = max - min || 1;
  for (let i = 0; i < out.length; i++) out[i] = (out[i] - min) / span;
  return out;
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const sstep = (e0: number, e1: number, x: number) => {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};

// ---------------------------------------------------------------- canvas helpers (for shapes)

function canvas(size: number) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  return c.getContext("2d", { willReadFrequently: true })!;
}

function luminance(ctx: CanvasRenderingContext2D, size: number): Float32Array {
  const d = ctx.getImageData(0, 0, size, size).data;
  const out = new Float32Array(size * size);
  for (let i = 0; i < out.length; i++) out[i] = d[i * 4] / 255;
  return out;
}

/** Draw `fn` at every wrap offset so shapes crossing the edge tile seamlessly. */
function wrapped(size: number, x: number, y: number, pad: number, fn: (x: number, y: number) => void) {
  for (const ox of [-size, 0, size])
    for (const oy of [-size, 0, size]) {
      const px = x + ox;
      const py = y + oy;
      if (px < -pad || px > size + pad || py < -pad || py > size + pad) continue;
      fn(px, py);
    }
}

// ---------------------------------------------------------------- packing

function dataTex(data: Uint8Array<ArrayBuffer>, size: number, srgb: boolean) {
  const t = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  return t;
}

function pack(size: number, albedo: Float32Array, height: Float32Array, rough: Float32Array, normalStrength: number, emissive = false): TexSet {
  const n = size * size;
  const col = new Uint8Array(n * 4);
  const nor = new Uint8Array(n * 4);
  const rou = new Uint8Array(n * 4);
  for (let i = 0; i < n; i++) {
    col[i * 4] = clamp01(albedo[i * 3]) * 255;
    col[i * 4 + 1] = clamp01(albedo[i * 3 + 1]) * 255;
    col[i * 4 + 2] = clamp01(albedo[i * 3 + 2]) * 255;
    col[i * 4 + 3] = 255;
    const g = clamp01(rough[i]) * 255;
    rou[i * 4] = g;
    rou[i * 4 + 1] = g; // roughnessMap reads G
    rou[i * 4 + 2] = g;
    rou[i * 4 + 3] = 255;
  }
  const s = normalStrength * (size / 1024);
  for (let y = 0; y < size; y++) {
    const ym = ((y - 1 + size) % size) * size;
    const yp = ((y + 1) % size) * size;
    const row = y * size;
    for (let x = 0; x < size; x++) {
      const xm = (x - 1 + size) % size;
      const xp = (x + 1) % size;
      const dx = (height[row + xp] - height[row + xm]) * s;
      const dy = (height[yp + x] - height[ym + x]) * s;
      const inv = 1 / Math.sqrt(dx * dx + dy * dy + 1);
      const i = (row + x) * 4;
      nor[i] = (-dx * inv * 0.5 + 0.5) * 255;
      nor[i + 1] = (-dy * inv * 0.5 + 0.5) * 255;
      nor[i + 2] = (inv * 0.5 + 0.5) * 255;
      nor[i + 3] = 255;
    }
  }
  const set: TexSet = { map: dataTex(col, size, true), normalMap: dataTex(nor, size, false), roughnessMap: dataTex(rou, size, false) };
  if (emissive) set.emissiveMap = set.map;
  return set;
}

function rgbField(size: number) {
  return new Float32Array(size * size * 3);
}
function put(a: Float32Array, i: number, c: RGB, k = 1) {
  a[i * 3] = (c[0] / 255) * k;
  a[i * 3 + 1] = (c[1] / 255) * k;
  a[i * 3 + 2] = (c[2] / 255) * k;
}
function lerpRGB(a: RGB, b: RGB, t: number): RGB {
  return [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];
}

// ---------------------------------------------------------------- materials

/** Board-formed architectural concrete: 2 × 4 panels per tile, Ando tie holes, rain streaks, pores. */
export function concrete(size: number): TexSet {
  const n = size * size;
  const mott = fbm(size, 3, 3, 6, 11);
  const fine = fbm(size, 48, 48, 3, 12);
  const grain = valueNoise(size, 256, 256, 13);
  const streak = fbm(size, 24, 2, 4, 14);
  const r = rng(15);

  // shapes: tie holes, pores, streaks below holes
  const holes = canvas(size);
  holes.fillStyle = "#000";
  holes.fillRect(0, 0, size, size);
  const stains = canvas(size);
  stains.fillStyle = "#000";
  stains.fillRect(0, 0, size, size);
  const pw = size / 2;
  const ph = size / 4;
  const hr = size * 0.0052;
  for (let px = 0; px < 2; px++)
    for (let py = 0; py < 4; py++)
      for (let ix = 0; ix < 3; ix++)
        for (let iy = 0; iy < 2; iy++) {
          const cx = px * pw + (ix + 0.5) * (pw / 3);
          const cy = py * ph + (iy + 0.5) * (ph / 2);
          const g = holes.createRadialGradient(cx, cy, 0, cx, cy, hr * 1.5);
          g.addColorStop(0, "rgba(255,255,255,1)");
          g.addColorStop(0.55, "rgba(255,255,255,0.95)");
          g.addColorStop(0.7, "rgba(255,255,255,0.25)");
          g.addColorStop(1, "rgba(255,255,255,0)");
          holes.fillStyle = g;
          holes.beginPath();
          holes.arc(cx, cy, hr * 1.5, 0, Math.PI * 2);
          holes.fill();
          // rain staining drips under each hole
          const len = size * (0.03 + r() * 0.09);
          const sg = stains.createLinearGradient(cx, cy, cx, cy + len);
          sg.addColorStop(0, `rgba(255,255,255,${0.35 + r() * 0.3})`);
          sg.addColorStop(1, "rgba(255,255,255,0)");
          stains.fillStyle = sg;
          stains.fillRect(cx - hr * 0.9, cy, hr * 1.8, len);
        }
  const pores = canvas(size);
  pores.fillStyle = "#000";
  pores.fillRect(0, 0, size, size);
  const poreCount = (n / 900) | 0;
  for (let i = 0; i < poreCount; i++) {
    const x = r() * size;
    const y = r() * size;
    const rad = (0.4 + r() * r() * 2.2) * (size / 1024);
    pores.fillStyle = `rgba(255,255,255,${0.4 + r() * 0.6})`;
    pores.beginPath();
    pores.arc(x, y, rad, 0, Math.PI * 2);
    pores.fill();
  }
  const H = luminance(holes, size);
  const S = luminance(stains, size);
  const P = luminance(pores, size);

  const panelTone: number[] = [];
  for (let i = 0; i < 8; i++) panelTone.push((r() - 0.5) * 0.07);

  const albedo = rgbField(size);
  const height = new Float32Array(n);
  const rough = new Float32Array(n);
  const base: RGB = [176, 172, 165];
  const seamW = Math.max(1.2, size / 700);
  for (let y = 0; y < size; y++) {
    const pyIdx = Math.floor(y / ph);
    const dySeam = Math.min(y % ph, ph - (y % ph));
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      const pxIdx = Math.floor(x / pw);
      const dxSeam = Math.min(x % pw, pw - (x % pw));
      const seam = 1 - sstep(0, seamW, Math.min(dxSeam, dySeam));
      const tone = panelTone[pxIdx * 4 + pyIdx];
      const v =
        0.86 +
        0.2 * (mott[i] - 0.5) +
        0.07 * (fine[i] - 0.5) +
        0.035 * (grain[i] - 0.5) +
        tone -
        0.1 * sstep(0.55, 0.9, streak[i]) -
        0.16 * S[i] -
        0.06 * seam -
        0.3 * P[i];
      const holeDark = H[i];
      const c = lerpRGB(base, [62, 58, 55], holeDark * 0.92);
      const warm = 1 + (mott[i] - 0.5) * 0.04;
      put(albedo, i, [c[0] * warm, c[1], c[2] / warm], clamp01(v + holeDark * 0.3));
      height[i] = 0.5 + 0.05 * fine[i] + 0.03 * grain[i] - 0.35 * seam - 0.9 * holeDark - 0.07 * P[i];
      rough[i] = 0.8 + 0.1 * (fine[i] - 0.5) - 0.05 * (mott[i] - 0.5) + 0.15 * holeDark + 0.08 * S[i] + 0.15 * P[i];
    }
  }
  return pack(size, albedo, height, rough, 3.2);
}

/** Honed travertine in 0.8 × 0.4 m running bond (4 × 8 per tile): strata, pits, joints. */
export function travertine(size: number): TexSet {
  const n = size * size;
  const warp = fbm(size, 4, 4, 5, 21);
  const fine = fbm(size, 64, 64, 2, 22);
  const veinN = fbm(size, 2, 16, 5, 23);
  const r = rng(24);
  const pits = canvas(size);
  pits.fillStyle = "#000";
  pits.fillRect(0, 0, size, size);
  const count = (n / 2600) | 0;
  for (let i = 0; i < count; i++) {
    const x = r() * size;
    const y = r() * size;
    const w = (0.8 + r() * r() * 4.5) * (size / 1024);
    const h = w * (0.25 + r() * 0.35);
    wrapped(size, x, y, w * 2, (px, py) => {
      pits.fillStyle = `rgba(255,255,255,${0.5 + r() * 0.5})`;
      pits.beginPath();
      pits.ellipse(px, py, w, h, (r() - 0.5) * 0.3, 0, Math.PI * 2);
      pits.fill();
    });
  }
  const P = luminance(pits, size);
  const cols = 4;
  const rows = 8;
  const tw = size / cols;
  const th = size / rows;
  const toneT: number[] = [];
  for (let i = 0; i < cols * rows * 2; i++) toneT.push((r() - 0.5) * 0.08);

  const albedo = rgbField(size);
  const height = new Float32Array(n);
  const rough = new Float32Array(n);
  const light: RGB = [226, 213, 192];
  const dark: RGB = [192, 172, 141];
  const joint = Math.max(1, size / 900);
  for (let y = 0; y < size; y++) {
    const row = Math.floor(y / th);
    const off = row % 2 ? tw / 2 : 0;
    const dy = Math.min(y % th, th - (y % th));
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      const xs = (x + off) % size;
      const col = Math.floor(xs / tw);
      const dx = Math.min(xs % tw, tw - (xs % tw));
      const j = 1 - sstep(0, joint, Math.min(dx, dy));
      const tone = toneT[row * cols + col];
      const band = 0.5 + 0.5 * Math.sin((y / size) * Math.PI * 2 * 22 + warp[i] * 9 + veinN[i] * 4 + col * 1.7);
      const vein = sstep(0.6, 1, band) * 0.55 + sstep(0.62, 0.9, veinN[i]) * 0.35;
      const c = lerpRGB(light, dark, clamp01(vein + (fine[i] - 0.5) * 0.25));
      const k = 1 + tone - P[i] * 0.16 - j * 0.1;
      put(albedo, i, c, k);
      height[i] = 0.6 + fine[i] * 0.03 - P[i] * 0.45 - j * 0.6;
      rough[i] = 0.3 + vein * 0.06 + (fine[i] - 0.5) * 0.08 + P[i] * 0.55 + j * 0.4;
    }
  }
  return pack(size, albedo, height, rough, 2.4);
}

/** Oiled oak planks: 8 per tile, butt joints, distorted grain, pores. */
export function oak(size: number, tint: RGB = [158, 116, 80]): TexSet {
  const n = size * size;
  const warp = fbm(size, 2, 16, 4, 31);
  const pore = valueNoise(size, 4, 512, 32);
  const fine = fbm(size, 8, 128, 3, 33);
  const r = rng(34);
  const rows = 8;
  const ph = size / rows;
  const joints: number[][] = [];
  const tones: number[][] = [];
  for (let k = 0; k < rows; k++) {
    const js: number[] = [];
    let x = r() * size * 0.5;
    while (x < size) {
      js.push(x);
      x += size * (0.45 + r() * 0.5);
    }
    joints.push(js);
    tones.push(js.map(() => (r() - 0.5) * 0.22).concat([(r() - 0.5) * 0.22]));
  }
  const albedo = rgbField(size);
  const height = new Float32Array(n);
  const rough = new Float32Array(n);
  const darkC: RGB = [tint[0] * 0.68, tint[1] * 0.64, tint[2] * 0.6];
  const gap = Math.max(1, size / 700);
  for (let y = 0; y < size; y++) {
    const pk = Math.floor(y / ph);
    const vy = (y % ph) / ph;
    const dy = Math.min(y % ph, ph - (y % ph));
    const js = joints[pk];
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      let seg = 0;
      let dj = Infinity;
      for (let q = 0; q < js.length; q++) {
        if (x >= js[q]) seg = q + 1;
        dj = Math.min(dj, Math.abs(x - js[q]));
      }
      const g = 1 - sstep(0, gap, Math.min(dy, dj));
      const rings = 0.5 + 0.5 * Math.sin((vy * 7 + warp[i] * 6 + pk * 3.1 + seg * 1.3) * Math.PI * 2);
      const figure = Math.pow(rings, 3);
      const c = lerpRGB(tint, darkC, clamp01(figure * 0.7 + (fine[i] - 0.5) * 0.3));
      const pores = sstep(0.72, 0.95, pore[i]);
      const k = 1 + tones[pk][seg] - pores * 0.22 - g * 0.6;
      put(albedo, i, c, k);
      height[i] = 0.6 + figure * 0.06 - pores * 0.12 - g * 0.8;
      rough[i] = 0.5 + pores * 0.2 + (fine[i] - 0.5) * 0.08 + g * 0.3;
    }
  }
  return pack(size, albedo, height, rough, 2.0);
}

/** Coursed rubble stone with recessed mortar (Fallingwater-like). */
export function stone(size: number): TexSet {
  const n = size * size;
  const noise = fbm(size, 16, 16, 5, 41);
  const big = fbm(size, 4, 4, 3, 42);
  const chip = valueNoise(size, 192, 192, 43);
  const r = rng(44);
  const id = new Int32Array(n).fill(-1);
  const edge = new Float32Array(n);
  const tone: RGB[] = [];
  const palette: RGB[] = [
    [128, 118, 104],
    [112, 104, 94],
    [140, 128, 110],
    [100, 92, 82],
    [122, 108, 92],
    [134, 124, 114],
  ];
  const mortar = Math.max(2, size / 220);
  let y = 0;
  let sid = 0;
  while (y < size) {
    let h = size * (0.035 + r() * 0.05);
    if (size - y < h * 1.5) h = size - y;
    let x = -r() * size * 0.1;
    const startX = x;
    while (x < size + startX) {
      const w = size * (0.07 + r() * 0.12);
      const p = palette[(r() * palette.length) | 0];
      const t = 0.88 + r() * 0.24;
      tone.push([p[0] * t, p[1] * t, p[2] * t]);
      for (let yy = Math.floor(y); yy < Math.min(size, Math.floor(y + h)); yy++)
        for (let xx = Math.floor(x); xx < Math.floor(x + w); xx++) {
          const wx = ((xx % size) + size) % size;
          const i = yy * size + wx;
          const d = Math.min(xx - x, x + w - xx, yy - y, y + h - yy);
          id[i] = sid;
          edge[i] = d;
        }
      sid++;
      x += w;
    }
    y += h;
  }
  const albedo = rgbField(size);
  const height = new Float32Array(n);
  const rough = new Float32Array(n);
  const mortarC: RGB = [150, 144, 134];
  for (let i = 0; i < n; i++) {
    const inStone = sstep(mortar * 0.5, mortar * 1.6, edge[i]);
    const bevel = sstep(mortar * 0.5, mortar * 5, edge[i]);
    const t = id[i] >= 0 ? tone[id[i]] : mortarC;
    const face = lerpRGB(t, [t[0] * 0.8, t[1] * 0.8, t[2] * 0.8], noise[i] * 0.8);
    const c = lerpRGB(lerpRGB(mortarC, [120, 114, 104], noise[i]), face, inStone);
    put(albedo, i, c, 0.85 + big[i] * 0.25 - (chip[i] > 0.85 ? 0.1 : 0));
    height[i] = inStone * (0.45 + bevel * 0.3 + noise[i] * 0.3 + chip[i] * 0.05) + (1 - inStone) * (0.1 + noise[i] * 0.05);
    rough[i] = 0.82 + noise[i] * 0.12 + (1 - inStone) * 0.06;
  }
  return pack(size, albedo, height, rough, 4.5);
}

/** Lawn: layered greens, dry patches, blade-level speckle. */
export function grass(size: number): TexSet {
  const n = size * size;
  const patch = fbm(size, 4, 4, 5, 51);
  const mid = fbm(size, 16, 16, 4, 52);
  const blade = valueNoise(size, 512, 512, 53);
  const blade2 = valueNoise(size, 256, 1024 > size ? 256 : 512, 54);
  const albedo = rgbField(size);
  const height = new Float32Array(n);
  const rough = new Float32Array(n);
  const deep: RGB = [58, 74, 40];
  const fresh: RGB = [92, 112, 58];
  const dry: RGB = [128, 122, 78];
  for (let i = 0; i < n; i++) {
    let c = lerpRGB(deep, fresh, clamp01(mid[i] * 0.9 + blade[i] * 0.35 - 0.1));
    c = lerpRGB(c, dry, sstep(0.62, 0.86, patch[i]) * 0.55);
    const k = 0.78 + blade[i] * 0.32 + blade2[i] * 0.1;
    put(albedo, i, c, k);
    height[i] = blade[i] * 0.6 + blade2[i] * 0.3 + mid[i] * 0.1;
    rough[i] = 0.92 + blade[i] * 0.08;
  }
  return pack(size, albedo, height, rough, 1.8);
}

/** Pea gravel: overlapping rounded pebbles. */
export function gravel(size: number): TexSet {
  const n = size * size;
  const colC = canvas(size);
  const hC = canvas(size);
  colC.fillStyle = "#6e675d";
  colC.fillRect(0, 0, size, size);
  hC.fillStyle = "#000";
  hC.fillRect(0, 0, size, size);
  const r = rng(61);
  const count = (n / 26) | 0;
  const scale = size / 1024;
  for (let i = 0; i < count; i++) {
    const x = r() * size;
    const y = r() * size;
    const rad = (2.5 + r() * 5) * scale;
    const t = 120 + r() * 90;
    const warm = (r() - 0.3) * 18;
    const ang = r() * Math.PI;
    const sq = 0.65 + r() * 0.35;
    wrapped(size, x, y, rad * 2, (px, py) => {
      colC.fillStyle = `rgb(${t + warm},${t + warm * 0.5},${t - warm * 0.4})`;
      colC.beginPath();
      colC.ellipse(px, py, rad, rad * sq, ang, 0, Math.PI * 2);
      colC.fill();
      const g = hC.createRadialGradient(px - rad * 0.2, py - rad * 0.2, 0, px, py, rad);
      g.addColorStop(0, "rgba(255,255,255,1)");
      g.addColorStop(1, "rgba(255,255,255,0.05)");
      hC.fillStyle = g;
      hC.beginPath();
      hC.ellipse(px, py, rad, rad * sq, ang, 0, Math.PI * 2);
      hC.fill();
    });
  }
  const cd = colC.getImageData(0, 0, size, size).data;
  const H = luminance(hC, size);
  const albedo = rgbField(size);
  const rough = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const shade = 0.75 + H[i] * 0.35;
    albedo[i * 3] = (cd[i * 4] / 255) * shade;
    albedo[i * 3 + 1] = (cd[i * 4 + 1] / 255) * shade;
    albedo[i * 3 + 2] = (cd[i * 4 + 2] / 255) * shade;
    rough[i] = 0.72 + (1 - H[i]) * 0.25;
  }
  return pack(size, albedo, H, rough, 4);
}

/** Lime plaster / stucco in any colour. */
export function plaster(size: number, color: RGB, seed = 71, strength = 1): TexSet {
  const n = size * size;
  const low = fbm(size, 4, 4, 5, seed);
  const trowel = fbm(size, 24, 12, 4, seed + 1);
  const grit = valueNoise(size, 384, 384, seed + 2);
  const albedo = rgbField(size);
  const height = new Float32Array(n);
  const rough = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    put(albedo, i, color, 0.94 + (low[i] - 0.5) * 0.08 + (trowel[i] - 0.5) * 0.04 + (grit[i] - 0.5) * 0.03);
    height[i] = trowel[i] * 0.5 + grit[i] * 0.2 + low[i] * 0.3;
    rough[i] = 0.78 + (trowel[i] - 0.5) * 0.15;
  }
  return pack(size, albedo, height, rough, 0.9 * strength);
}

/** Woven upholstery. */
export function fabric(size: number, color: RGB): TexSet {
  const n = size * size;
  const slub = valueNoise(size, 8, 256, 81);
  const low = fbm(size, 4, 4, 3, 82);
  const albedo = rgbField(size);
  const height = new Float32Array(n);
  const rough = new Float32Array(n);
  const freq = size / 6;
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      const wx = Math.sin((x / size) * Math.PI * 2 * freq);
      const wy = Math.sin((y / size) * Math.PI * 2 * freq);
      const weave = (wx * 0.5 + 0.5) * (Math.sign(wy) > 0 ? 1 : 0.6) + (wy * 0.5 + 0.5) * (Math.sign(wx) > 0 ? 0.6 : 1);
      put(albedo, i, color, 0.85 + weave * 0.08 + (slub[i] - 0.5) * 0.12 + (low[i] - 0.5) * 0.06);
      height[i] = weave * 0.5 + slub[i] * 0.2;
      rough[i] = 0.95;
    }
  return pack(size, albedo, height, rough, 2.2);
}

/** Back-lit honey onyx: domain-warped veins; doubles as the emissive map. */
export function onyx(size: number): TexSet {
  const n = size * size;
  const w1 = fbm(size, 3, 3, 5, 91);
  const w2 = fbm(size, 3, 3, 5, 92);
  const albedo = rgbField(size);
  const height = new Float32Array(n);
  const rough = new Float32Array(n);
  const vein = fbm(size, 4, 4, 6, 93);
  const a: RGB = [244, 222, 182];
  const b: RGB = [214, 172, 118];
  const cream: RGB = [252, 244, 226];
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      const s = Math.sin(((x + w1[i] * size * 0.35) / size) * Math.PI * 2 * 3 + w2[i] * 7 + vein[i] * 5);
      const bands = 0.5 + 0.5 * s;
      let c = lerpRGB(a, b, Math.pow(bands, 3) * 0.75);
      c = lerpRGB(c, cream, sstep(0.7, 0.95, vein[i]) * 0.7);
      put(albedo, i, c, 1);
      height[i] = 0.5;
      rough[i] = 0.12 + bands * 0.06;
    }
  return pack(size, albedo, height, rough, 0.2, true);
}

/** Dense leaf canopy for tree crowns and hedges. */
export function leaves(size: number, base: RGB = [48, 64, 38]): TexSet {
  const n = size * size;
  const colC = canvas(size);
  const hC = canvas(size);
  colC.fillStyle = `rgb(${base[0] * 0.5},${base[1] * 0.5},${base[2] * 0.5})`;
  colC.fillRect(0, 0, size, size);
  hC.fillStyle = "#000";
  hC.fillRect(0, 0, size, size);
  const r = rng(101);
  const count = (n / 40) | 0;
  const sc = size / 512;
  for (let i = 0; i < count; i++) {
    const x = r() * size;
    const y = r() * size;
    const len = (4 + r() * 6) * sc;
    const ang = r() * Math.PI * 2;
    const k = 0.6 + r() * 0.75;
    const yel = r() * 0.25;
    wrapped(size, x, y, len * 2, (px, py) => {
      colC.fillStyle = `rgb(${base[0] * k + yel * 60},${base[1] * k + yel * 40},${base[2] * k})`;
      colC.beginPath();
      colC.ellipse(px, py, len, len * 0.42, ang, 0, Math.PI * 2);
      colC.fill();
      const g = hC.createLinearGradient(px - len, py, px + len, py);
      g.addColorStop(0, `rgba(255,255,255,${0.3 + k * 0.4})`);
      g.addColorStop(1, `rgba(255,255,255,${0.1 + k * 0.3})`);
      hC.fillStyle = g;
      hC.beginPath();
      hC.ellipse(px, py, len, len * 0.42, ang, 0, Math.PI * 2);
      hC.fill();
    });
  }
  const cd = colC.getImageData(0, 0, size, size).data;
  const H = luminance(hC, size);
  const albedo = rgbField(size);
  const rough = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    albedo[i * 3] = cd[i * 4] / 255;
    albedo[i * 3 + 1] = cd[i * 4 + 1] / 255;
    albedo[i * 3 + 2] = cd[i * 4 + 2] / 255;
    rough[i] = 0.62 + (1 - H[i]) * 0.3;
  }
  return pack(size, albedo, H, rough, 3);
}

/** Bark for trunks. */
export function bark(size: number): TexSet {
  const n = size * size;
  const ridges = fbm(size, 16, 2, 5, 111);
  const fine = fbm(size, 64, 16, 3, 112);
  const albedo = rgbField(size);
  const height = new Float32Array(n);
  const rough = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const r = ridges[i];
    put(albedo, i, [86, 72, 60], 0.6 + r * 0.55 + (fine[i] - 0.5) * 0.15);
    height[i] = r * 0.8 + fine[i] * 0.2;
    rough[i] = 0.95;
  }
  return pack(size, albedo, height, rough, 5);
}

/** Glass-fibre shell panels for the flowing pavilion: soft seams + gel-coat orange peel. */
export function shellPanels(size: number): TexSet {
  const n = size * size;
  const peel = valueNoise(size, 256, 256, 121);
  const low = fbm(size, 4, 4, 3, 122);
  const albedo = rgbField(size);
  const height = new Float32Array(n);
  const rough = new Float32Array(n);
  const seam = Math.max(1.2, size / 600);
  const cols = 2;
  const rows = 8;
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      const dx = Math.min(x % (size / cols), size / cols - (x % (size / cols)));
      const dy = Math.min(y % (size / rows), size / rows - (y % (size / rows)));
      const s = 1 - sstep(0, seam, Math.min(dx, dy));
      put(albedo, i, [244, 242, 237], 0.97 + (low[i] - 0.5) * 0.04 - s * 0.2);
      height[i] = 0.6 + peel[i] * 0.04 - s * 0.5;
      rough[i] = 0.22 + (peel[i] - 0.5) * 0.06 + s * 0.3;
    }
  return pack(size, albedo, height, rough, 1.6);
}

/** Tileable ripple normals for the water shader (normal map only). */
export function waterNormals(size: number): THREE.DataTexture {
  const h = fbm(size, 8, 8, 5, 131, 0.55);
  const zero = new Float32Array(size * size * 3);
  const r = new Float32Array(size * size);
  return pack(size, zero, h, r, 6).normalMap;
}

/** Soft radial blob used as a fake contact shadow / ambient occlusion decal. */
export function aoBlob(size = 128): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(0,0,0,0.85)");
  g.addColorStop(0.45, "rgba(0,0,0,0.45)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(c);
}
