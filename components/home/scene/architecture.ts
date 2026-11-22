import * as THREE from "three";
import { Sky } from "three/examples/jsm/objects/Sky.js";
import { Water } from "three/examples/jsm/objects/Water.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { KEYFRAMES, type Keyframe } from "./keyframes";
import * as TX from "./textures";

/**
 * Procedural architecture scene: a concrete chapel (Ando), a floating-roof glass pavilion
 * (Mies), cantilevered terraces over water (Wright) and a flowing shell (Hadid).
 * No external assets: every PBR texture set is generated procedurally at start-up.
 */

export type SceneHandle = {
  setScroll(y: number): void;
  setAnchors(anchors: number[]): void;
  setPointer(x: number, y: number): void;
  setActive(active: boolean): void;
  resize(): void;
  dispose(): void;
};

type Options = { onReady?: () => void; reducedMotion?: boolean };

// ---------------------------------------------------------------- helpers

function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const smooth = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

/** Scale BoxGeometry UVs so a texture tiles every `tile` metres on every face. */
function boxGeo(w: number, h: number, d: number, tile = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  if (!tile) return g;
  const uv = g.attributes.uv as THREE.BufferAttribute;
  const dims: [number, number][] = [
    [d, h],
    [d, h],
    [w, d],
    [w, d],
    [w, h],
    [w, h],
  ];
  for (let f = 0; f < 6; f++) {
    for (let v = 0; v < 4; v++) {
      const i = f * 4 + v;
      uv.setXY(i, (uv.getX(i) * dims[f][0]) / tile, (uv.getY(i) * dims[f][1]) / tile);
    }
  }
  return g;
}

// ---------------------------------------------------------------- scene

export function createArchitectureScene(canvas: HTMLCanvasElement, opts: Options = {}): SceneHandle {
  const lowTier =
    window.matchMedia("(max-width: 820px)").matches || (navigator.hardwareConcurrency || 8) <= 4;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  let pixelRatio = Math.min(window.devicePixelRatio || 1, lowTier ? 1.25 : 1.75);
  renderer.setPixelRatio(pixelRatio);
  renderer.toneMapping = THREE.AgXToneMapping;
  renderer.toneMappingExposure = 0.7;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 6000);

  const pmrem = new THREE.PMREMGenerator(renderer);
  let envRT: THREE.WebGLRenderTarget | null = null;


  const fog = new THREE.FogExp2(0x5f5047, 0.004);
  scene.fog = fog;

  const disposables: { dispose(): void }[] = [pmrem];
  const track = <T extends { dispose(): void }>(x: T) => {
    disposables.push(x);
    return x;
  };

  // ---------------- materials (flat colours first; detailed PBR maps are generated after first paint)
  const std = (p: THREE.MeshStandardMaterialParameters) => track(new THREE.MeshStandardMaterial(p));
  const M = {
    concrete: std({ color: 0xffffff, roughness: 0.85 }),
    plaster: std({ color: 0xffffff, roughness: 0.8 }),
    travertine: std({ color: 0xffffff, roughness: 0.4 }),
    cream: std({ color: 0xffffff, roughness: 0.82 }),
    stone: std({ color: 0xffffff, roughness: 0.92 }),
    wood: std({ color: 0xffffff, roughness: 0.55 }),
    darkWood: std({ color: 0xffffff, roughness: 0.6 }),
    chrome: std({ color: 0xe2e2e2, metalness: 1, roughness: 0.08 }),
    steel: std({ color: 0x2a2b2e, metalness: 0.75, roughness: 0.38 }),
    fabric: std({ color: 0xffffff, roughness: 0.95 }),
    rug: std({ color: 0xffffff, roughness: 1 }),
    glass: track(
      new THREE.MeshPhysicalMaterial({
        color: 0xc4d4d6,
        transparent: true,
        opacity: 0.16,
        roughness: 0.02,
        metalness: 0,
        envMapIntensity: 1.6,
        specularIntensity: 1,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    ),
    onyx: std({ color: 0xffffff, roughness: 0.15, emissive: 0xffb36b, emissiveIntensity: 0.2 }),
    lamp: std({ color: 0x000000, emissive: 0xffc98a, emissiveIntensity: 6 }),
    uplight: std({ color: 0x000000, emissive: 0xffd2a0, emissiveIntensity: 2.5 }),
    interior: std({ color: 0x1d1814, emissive: 0xffcf9c, emissiveIntensity: 0.6 }),
    grass: std({ color: 0xffffff, roughness: 1 }),
    gravel: std({ color: 0xffffff, roughness: 0.95 }),
    hills: std({ color: 0x2c332a, roughness: 1, flatShading: true }),
    foliage: std({ color: 0xffffff, roughness: 0.85 }),
    cypress: std({ color: 0x8a9a86, roughness: 0.85 }),
    hedge: std({ color: 0xb8c4ae, roughness: 0.85 }),
    trunk: std({ color: 0xffffff, roughness: 0.95 }),
    shallowWater: std({ color: 0x0e171d, roughness: 0.03, metalness: 0.1, envMapIntensity: 1.4 }),
    shell: track(
      new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        roughness: 0.25,
        clearcoat: 0.55,
        clearcoatRoughness: 0.25,
        side: THREE.DoubleSide,
      }),
    ),
  };
  M.grass.color.set(0x7d8a6c);
  M.travertine.color.set(0xdccfba);
  M.concrete.color.set(0xa9a59f);
  M.cream.color.set(0xe6dccb);
  M.plaster.color.set(0xefebe4);
  M.stone.color.set(0x7a6f62);
  M.wood.color.set(0x9a7150);
  M.darkWood.color.set(0x5e4a3c);
  M.fabric.color.set(0x3a3632);
  M.rug.color.set(0x8a7b6c);
  M.gravel.color.set(0x8f897e);
  M.foliage.color.set(0x3a4a30);
  M.trunk.color.set(0x4a3d33);
  M.onyx.color.set(0xdcbc8e);
  M.shell.color.set(0xf3f1ec);

  /** Generate every PBR set, yielding between them so the loader keeps animating. */
  async function buildDetail() {
    const hi = !lowTier;
    const big = hi ? 2048 : 1024;
    const mid = hi ? 1024 : 512;
    // MessageChannel yields are not throttled in background tabs (setTimeout is).
    const channel = new MessageChannel();
    const tick = () =>
      new Promise<void>((r) => {
        channel.port1.onmessage = () => r();
        channel.port2.postMessage(0);
      });
    const apply = (m: THREE.MeshStandardMaterial, t: TX.TexSet, repeat?: [number, number], keepColor = false) => {
      for (const k of ["map", "normalMap", "roughnessMap"] as const) {
        const tex = t[k];
        if (repeat) tex.repeat.set(repeat[0], repeat[1]);
        track(tex);
      }
      m.map = t.map;
      m.normalMap = t.normalMap;
      m.roughnessMap = t.roughnessMap;
      m.roughness = 1;
      if (!keepColor) m.color.set(0xffffff);
      if (t.emissiveMap) m.emissiveMap = t.emissiveMap;
      m.needsUpdate = true;
    };
    const steps: (() => void)[] = [
      () => apply(M.concrete, TX.concrete(big)),
      () => apply(M.travertine, TX.travertine(big)),
      () => apply(M.wood, TX.oak(mid)),
      () => apply(M.darkWood, TX.oak(mid, [104, 80, 62])),
      () => apply(M.stone, TX.stone(mid)),
      () => apply(M.grass, TX.grass(mid)),
      () => apply(M.gravel, TX.gravel(mid)),
      () => apply(M.plaster, TX.plaster(mid, [240, 236, 229], 71)),
      () => apply(M.cream, TX.plaster(mid, [232, 221, 202], 75, 1.6)),
      () => apply(M.fabric, TX.fabric(512, [64, 60, 56])),
      () => apply(M.rug, TX.fabric(512, [150, 134, 116])),
      () => apply(M.onyx, TX.onyx(mid)),
      () => {
        const leaf = TX.leaves(512);
        apply(M.foliage, leaf, [2, 2]);
        apply(M.cypress, TX.leaves(512, [40, 54, 36]), [1, 3], true);
        apply(M.hedge, TX.leaves(512, [52, 70, 40]), [1, 1], true);
        M.foliage.color.set(0xd8e0cf);
      },
      () => apply(M.trunk, TX.bark(256), [2, 2]),
      () => apply(M.shell, TX.shellPanels(mid) as TX.TexSet),
    ];
    for (const s of steps) {
      if (disposed) return;
      s();
      await tick();
    }
    M.concrete.normalScale.set(1, 1);
    M.stone.normalScale.set(1.2, 1.2);
  }


  const root = new THREE.Group();
  scene.add(root);

  function mesh(geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = root) {
    track(geo);
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }

  /** Box from min/max corners (metres). */
  function block(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, mat: THREE.Material, tile = 0) {
    const w = x1 - x0;
    const h = y1 - y0;
    const d = z1 - z0;
    return mesh(boxGeo(w, h, d, tile), mat, x0 + w / 2, y0 + h / 2, z0 + d / 2);
  }

  // ---------------- terrain
  {
    const grassPlane = (w: number, d: number) => {
      const g = new THREE.PlaneGeometry(w, d);
      const uv = g.attributes.uv as THREE.BufferAttribute;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * w) / 6, (uv.getY(i) * d) / 6);
      return g;
    };
    const upper = mesh(grassPlane(320, 600), M.grass, 14 - 160, 0, 0);
    upper.rotation.x = -Math.PI / 2;
    upper.castShadow = false;
    const lower = mesh(grassPlane(300, 600), M.grass, 14 + 150, -3, 0);
    lower.rotation.x = -Math.PI / 2;
    lower.castShadow = false;
    block(13.6, 14.4, -3, 0.12, -160, 160, M.concrete, 3.6);

    // paving & gravel
    block(-16, 13.6, 0, 0.05, -11, 11, M.travertine, 3.2);
    block(-2, 2, 0, 0.04, 11, 22, M.gravel, 1.5);
    block(-45, -23, 0, 0.03, -27, 4, M.gravel, 1.5);
    block(-30, -16, 0, 0.035, -1.5, 1.5, M.travertine, 3.2);

    // distant hills
    const hills = new THREE.PlaneGeometry(1600, 1600, 90, 90);
    hills.rotateX(-Math.PI / 2);
    const p = hills.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const z = p.getZ(i);
      const r = Math.hypot(x, z);
      const n =
        Math.sin(x * 0.011) * Math.cos(z * 0.013) * 0.5 +
        Math.sin(x * 0.027 + 1.3) * Math.sin(z * 0.021) * 0.3 +
        Math.sin((x + z) * 0.005) * 0.6;
      p.setY(i, smooth(320, 900, r) * (10 + 26 * (n + 1)));
    }
    hills.computeVertexNormals();
    const h = mesh(hills, M.hills, 0, -3.6, 0);
    h.castShadow = false;
  }

  // ---------------- Mies pavilion + Wright cantilevers
  const pendants: THREE.Object3D[] = [];
  {
    block(-12, 13.6, 0.05, 0.35, -7.5, 7.5, M.travertine, 3.2); // floor
    block(-14, 13, 3.9, 4.3, -9, 9, M.plaster); // floating roof

    for (const x of [-9, -3, 3, 9])
      for (const z of [-4.5, 4.5]) {
        block(x - 0.11, x + 0.11, 0.35, 3.9, z - 0.025, z + 0.025, M.chrome);
        block(x - 0.025, x + 0.025, 0.35, 3.9, z - 0.11, z + 0.11, M.chrome);
      }

    // glass skin
    const glassH = 3.55;
    for (const z of [7, -7]) {
      const gx0 = z < 0 ? -2 : -12;
      const gm = mesh(new THREE.PlaneGeometry(12 - gx0, glassH), M.glass, (gx0 + 12) / 2, 0.35 + glassH / 2, z);
      gm.castShadow = false;
    }
    for (const x of [-12, 12]) {
      const gm = mesh(new THREE.PlaneGeometry(14, glassH), M.glass, x, 0.35 + glassH / 2, 0);
      gm.rotation.y = Math.PI / 2;
      gm.castShadow = false;
    }
    for (let x = -12; x <= 12; x += 2.4) {
      block(x - 0.03, x + 0.03, 0.35, 3.9, 6.97, 7.03, M.steel);
    }
    block(-12, -2, 0.35, 3.9, -7.2, -6.9, M.darkWood, 2.4); // back timber wall

    // interior
    block(-3, 3, 0.35, 3.55, -2.6, -2.35, M.onyx); // backlit onyx wall
    block(-7.8, -4.4, 0.35, 0.8, 0.6, 1.6, M.fabric); // sofa
    block(-7.8, -4.4, 0.8, 1.25, 0.6, 0.85, M.fabric);
    block(-7.4, -5.0, 0.35, 0.37, 2.0, 4.6, M.rug);
    mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.38, 40), M.travertine, -6.1, 0.55, 3.0).scale.set(1, 1, 1);
    block(4.4, 7.8, 1.05, 1.12, -0.2, 1.0, M.wood); // dining table
    for (const lx of [4.6, 7.6]) for (const lz of [0, 0.8]) block(lx - 0.04, lx + 0.04, 0.35, 1.05, lz - 0.04, lz + 0.04, M.steel);
    for (const cx of [4.9, 6.1, 7.3])
      for (const cz of [-0.65, 1.45]) {
        block(cx - 0.24, cx + 0.24, 0.75, 0.8, cz - 0.24, cz + 0.24, M.fabric);
        block(cx - 0.24, cx + 0.24, 0.8, 1.45, cz + (cz < 0 ? -0.24 : 0.2), cz + (cz < 0 ? -0.2 : 0.24), M.fabric);
      }
    block(6, 10.5, 0.35, 1.25, -5.4, -4.2, M.steel); // kitchen island
    block(5.95, 10.55, 1.25, 1.32, -5.45, -4.15, M.travertine, 3.2);

    // glass pendant cluster over the dining table
    const r = rng(5);
    const outerGeo = track(new THREE.SphereGeometry(0.2, 24, 16));
    const innerGeo = track(new THREE.SphereGeometry(0.075, 16, 12));
    for (let i = 0; i < 11; i++) {
      const g = new THREE.Group();
      const x = 4.6 + r() * 3;
      const z = -0.1 + r() * 1.0;
      const y = 2.15 + r() * 1.1;
      g.position.set(x, y, z);
      const outer = new THREE.Mesh(outerGeo, M.glass);
      const inner = new THREE.Mesh(innerGeo, M.lamp);
      const cordLen = 3.9 - y;
      const cord = new THREE.Mesh(track(new THREE.CylinderGeometry(0.006, 0.006, cordLen, 4)), M.steel);
      cord.position.y = cordLen / 2;
      g.add(outer, inner, cord);
      g.userData.phase = r() * Math.PI * 2;
      root.add(g);
      pendants.push(g);
    }

    // Wright: stone core, cantilevered terraces, upper volume
    block(-1.2, 0.6, 0, 9.8, -7.8, -5.6, M.stone, 2.5);
    block(12, 23, -0.3, 0.35, -4, 5, M.cream); // terrace A over the water
    block(22.6, 23, 0.35, 1.25, -4, 5, M.cream);
    block(12, 23, 0.35, 1.25, 4.6, 5, M.cream);
    block(12, 23, 0.35, 1.25, -4, -3.6, M.cream);
    block(14.2, 15.6, -3, -0.3, 0.2, 1.6, M.stone, 2.5); // pier
    block(-3, 11, 7.0, 7.45, -7, 3, M.cream); // upper roof
    block(-1.8, 9.8, 4.3, 7.0, -5.8, 1.8, M.interior); // lit interior
    const upGlass = mesh(new THREE.BoxGeometry(11.8, 2.7, 7.8), M.glass, 4, 5.65, -2);
    upGlass.castShadow = false;
    for (let x = -1.9; x <= 9.9; x += 1.5) block(x - 0.035, x + 0.035, 4.3, 7.0, 1.86, 1.94, M.steel);
    block(8, 20, 4.3, 4.78, -7, 1, M.cream); // terrace B
    block(19.6, 20, 4.78, 5.75, -7, 1, M.cream);
    block(8, 20, 4.78, 5.75, 0.6, 1, M.cream);
    block(8, 20, 4.78, 5.75, -7, -6.6, M.cream);
  }

  // interior warm lights
  const warmA = new THREE.PointLight(0xffbf85, 0, 16, 2);
  warmA.position.set(-5, 3.2, 0.5);
  const warmB = new THREE.PointLight(0xffbf85, 0, 14, 2);
  warmB.position.set(6.2, 2.4, 0.4);
  const warmC = new THREE.PointLight(0xffc690, 0, 14, 2);
  warmC.position.set(4, 6, -2);
  root.add(warmA, warmB, warmC);

  // ---------------- water: lower pool (rippled mirror with sun glints) + channel + waterfall
  let water: Water | null = null;
  const waterNormals = TX.waterNormals(lowTier ? 256 : 512);
  track(waterNormals);
  {
    const w = 19.6;
    const d = 20;
    const geo = track(new THREE.PlaneGeometry(w, d));
    water = new Water(geo, {
      textureWidth: lowTier ? 512 : 1024,
      textureHeight: lowTier ? 512 : 1024,
      waterNormals,
      sunDirection: new THREE.Vector3(0, 1, 0),
      sunColor: 0xfff1dc,
      waterColor: 0x0f1c22,
      distortionScale: 0.55,
      fog: true,
    });
    water.material.uniforms.size.value = 6;
    water.rotation.x = -Math.PI / 2;
    water.position.set(14.4 + w / 2, -2.8, 2);
    root.add(water);
    block(14.4, 34.6, -3, -2.72, 12, 12.6, M.travertine, 3.2);
    block(14.4, 34.6, -3, -2.72, -8.6, -8, M.travertine, 3.2);
    block(34, 34.6, -3, -2.72, -8, 12, M.travertine, 3.2);

    const ch = mesh(new THREE.PlaneGeometry(6, 3), M.shallowWater, 10.6, 0.07, 7.5);
    ch.rotation.x = -Math.PI / 2;
    ch.castShadow = false;
  }

  const fallMat = track(
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { uTime: { value: 0 }, uLight: { value: 1 } },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `
        varying vec2 vUv; uniform float uTime; uniform float uLight;
        float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
        float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
          return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
        void main(){
          float s = n(vec2(vUv.x*38.0, vUv.y*5.0 + uTime*3.2)) * 0.6 + n(vec2(vUv.x*90.0, vUv.y*12.0 + uTime*5.0)) * 0.4;
          float foam = smoothstep(0.25, 0.0, vUv.y);
          float a = (0.42 + s*0.45 + foam*0.3) * smoothstep(0.0, 0.08, vUv.x) * smoothstep(1.0, 0.92, vUv.x);
          vec3 c = mix(vec3(0.55,0.62,0.66), vec3(0.95), s*0.6 + foam);
          gl_FragColor = vec4(c * uLight, a);
        }`,
    }),
  );
  {
    const fall = new THREE.Mesh(track(new THREE.PlaneGeometry(3, 2.95)), fallMat);
    fall.position.set(14.45, -1.5, 7.5);
    fall.rotation.y = Math.PI / 2;
    root.add(fall);
  }

  // ---------------- Ando chapel
  const ANDO_SUN = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - 18.7), THREE.MathUtils.degToRad(171));
  const beamUniforms = { uIntensity: { value: 0 } };
  const dustUniforms = { uIntensity: { value: 0 }, uTime: { value: 0 }, uScale: { value: 1 } };
  {
    const cx = -34;
    const T = 0.5;
    block(-39, -38.5, 0, 8, -21.5, -6.5, M.concrete, 3.6);
    block(-29.5, -29, 0, 8, -21.5, -6.5, M.concrete, 3.6);
    block(-39, -29, 8, 8.5, -21.5, -6.5, M.concrete, 3.6);
    // front wall with door
    block(-38.5, cx - 1.2, 0, 8, -7, -6.5, M.concrete, 3.6);
    block(cx + 1.2, -29.5, 0, 8, -7, -6.5, M.concrete, 3.6);
    block(cx - 1.2, cx + 1.2, 3, 8, -7, -6.5, M.concrete, 3.6);

    // back wall with the cross of light
    const crossPts: [number, number][] = [
      [-0.18, 0.6], [0.18, 0.6], [0.18, 4.6], [2.3, 4.6], [2.3, 4.96], [0.18, 4.96],
      [0.18, 7.3], [-0.18, 7.3], [-0.18, 4.96], [-2.3, 4.96], [-2.3, 4.6], [-0.18, 4.6],
    ];
    const wall = new THREE.Shape();
    wall.moveTo(-4.5, 0);
    wall.lineTo(4.5, 0);
    wall.lineTo(4.5, 8);
    wall.lineTo(-4.5, 8);
    wall.closePath();
    const hole = new THREE.Path();
    crossPts.forEach(([x, y], i) => (i ? hole.lineTo(x, y) : hole.moveTo(x, y)));
    hole.closePath();
    wall.holes.push(hole);
    const wallGeo = new THREE.ExtrudeGeometry(wall, { depth: T, bevelEnabled: false });
    const uv = wallGeo.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 3.6, uv.getY(i) / 3.6);
    mesh(wallGeo, M.concrete, cx, 0, -21.5);

    // floor + pews
    block(-38.5, -29.5, 0.02, 0.06, -21, -7, M.darkWood, 2);
    for (let z = -18.6; z <= -9.5; z += 1.5) {
      for (const [a, b] of [
        [-37.8, -35.2],
        [-32.8, -30.2],
      ]) {
        block(a, b, 0.42, 0.5, z, z + 0.45, M.darkWood, 2);
        block(a, b, 0.5, 0.95, z + 0.4, z + 0.47, M.darkWood, 2);
        block(a + 0.05, a + 0.12, 0.06, 0.42, z, z + 0.45, M.darkWood);
        block(b - 0.12, b - 0.05, 0.06, 0.42, z, z + 0.45, M.darkWood);
      }
    }

    // light shaft: the cross extruded along the sun direction
    const crossShape = new THREE.Shape();
    crossPts.forEach(([x, y], i) => (i ? crossShape.lineTo(x, y) : crossShape.moveTo(x, y)));
    crossShape.closePath();
    const L = 15;
    const beamGeo = new THREE.ExtrudeGeometry(crossShape, { depth: L, bevelEnabled: false });
    const travel = ANDO_SUN.clone().negate();
    const kx = travel.x / travel.z;
    const ky = travel.y / travel.z;
    beamGeo.applyMatrix4(new THREE.Matrix4().set(1, 0, kx, 0, 0, 1, ky, 0, 0, 0, 1, 0, 0, 0, 0, 1));
    const beamMat = track(
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        uniforms: beamUniforms,
        vertexShader: `varying float vD; void main(){ vD = position.z / ${L.toFixed(1)}; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `varying float vD; uniform float uIntensity;
          void main(){ float a = pow(1.0 - clamp(vD,0.0,1.0), 1.6) * smoothstep(0.0, 0.04, vD) * 0.07 * uIntensity;
            gl_FragColor = vec4(vec3(1.0, 0.93, 0.82) * a, a); }`,
      }),
    );
    const beam = new THREE.Mesh(track(beamGeo), beamMat);
    beam.position.set(cx, 0, -21);
    beam.renderOrder = 2;
    root.add(beam);

    // dust motes drifting inside the shaft
    const count = 420;
    const pos = new Float32Array(count * 3);
    const seed = new Float32Array(count);
    const r = rng(9);
    for (let i = 0; i < count; i++) {
      const z = r() * 11;
      const onArm = r() > 0.6;
      const lx = onArm ? (r() - 0.5) * 4.6 : (r() - 0.5) * 0.5;
      const ly = onArm ? 4.6 + r() * 0.5 : 0.6 + r() * 6.7;
      pos[i * 3] = cx + lx + kx * z;
      pos[i * 3 + 1] = ly + ky * z;
      pos[i * 3 + 2] = -21 + z;
      seed[i] = r() * 100;
    }
    const dustGeo = track(new THREE.BufferGeometry());
    dustGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    dustGeo.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
    const dustMat = track(
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: dustUniforms,
        vertexShader: `attribute float aSeed; uniform float uTime; uniform float uScale; varying float vA;
          void main(){
            vec3 p = position;
            p.x += sin(uTime*0.13 + aSeed) * 0.12;
            p.y += sin(uTime*0.09 + aSeed*1.7) * 0.18;
            p.z += cos(uTime*0.11 + aSeed*0.6) * 0.12;
            vec4 mv = modelViewMatrix * vec4(p,1.0);
            gl_PointSize = uScale * (2.0 + fract(aSeed) * 3.0) * (6.0 / -mv.z);
            vA = 0.4 + 0.6 * fract(aSeed * 3.1);
            gl_Position = projectionMatrix * mv;
          }`,
        fragmentShader: `uniform float uIntensity; varying float vA;
          void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d) * vA * uIntensity * 0.8;
            gl_FragColor = vec4(vec3(1.0,0.94,0.85) * a, a); }`,
      }),
    );
    root.add(new THREE.Points(dustGeo, dustMat));
  }

  // ---------------- Hadid pavilion
  const uplights: THREE.Mesh[] = [];
  {
    const base = new THREE.Vector3(-4, 0, 30);
    function ribbon(points: [number, number, number][], widthFn: (u: number) => number, twistAmp: number, bulge: number) {
      const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p).add(base)), false, "centripetal");
      const U = 220;
      const V = 28;
      const positions: number[] = [];
      const uvs: number[] = [];
      const index: number[] = [];
      const up = new THREE.Vector3(0, 1, 0);
      for (let i = 0; i <= U; i++) {
        const u = i / U;
        const c = curve.getPointAt(u);
        const t = curve.getTangentAt(u);
        const s = new THREE.Vector3().crossVectors(up, t).normalize();
        s.applyAxisAngle(t, twistAmp * Math.sin(u * Math.PI * 2));
        const n = new THREE.Vector3().crossVectors(t, s).normalize();
        const w = widthFn(u);
        for (let j = 0; j <= V; j++) {
          const v = j / V;
          const p = c
            .clone()
            .addScaledVector(s, (v - 0.5) * w)
            .addScaledVector(n, bulge * Math.sin(Math.PI * v) * Math.sin(Math.PI * u));
          positions.push(p.x, Math.max(p.y, 0.02), p.z);
          uvs.push(u * 10, v);
        }
      }
      for (let i = 0; i < U; i++)
        for (let j = 0; j < V; j++) {
          const a = i * (V + 1) + j;
          const b = a + V + 1;
          index.push(a, b, a + 1, b, b + 1, a + 1);
        }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
      g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
      g.setIndex(index);
      g.computeVertexNormals();
      return mesh(g, M.shell, 0, 0, 0);
    }
    ribbon(
      [[-11, 0, 2], [-8, 2.6, 3.6], [-4, 5.3, 2.2], [1, 5.9, -1], [6, 4.3, -2.6], [9.5, 1.7, -0.6], [11.2, 0, 1.6]],
      (u) => 3 + 3.6 * Math.sin(Math.PI * u),
      0.55,
      0.9,
    );
    ribbon(
      [[-9, 0, -2.5], [-5.5, 3.1, -4], [-0.5, 3.9, -5], [4.5, 2.7, -4.4], [8.4, 0, -2.6]],
      (u) => 2 + 2.2 * Math.sin(Math.PI * u),
      -0.45,
      0.5,
    );
    const discUV = (g: THREE.BufferGeometry, metres: number) => {
      const uv = g.attributes.uv as THREE.BufferAttribute;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * metres) / 3.2, (uv.getY(i) * metres) / 3.2);
      return g;
    };
    const plaza = mesh(discUV(new THREE.CircleGeometry(17, 64), 34), M.travertine, base.x, 0.03, base.z);
    plaza.rotation.x = -Math.PI / 2;
    plaza.scale.set(1, 0.72, 1);
    plaza.castShadow = false;
    const pool = mesh(new THREE.CircleGeometry(5, 48), M.shallowWater, base.x + 4, 0.05, base.z + 6);
    pool.rotation.x = -Math.PI / 2;
    pool.scale.set(1.6, 0.6, 1);
    pool.castShadow = false;
    const dotGeo = track(new THREE.SphereGeometry(0.035, 8, 6));
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      const d = new THREE.Mesh(dotGeo, M.uplight);
      d.position.set(base.x + Math.cos(a) * 12, 0.08, base.z + Math.sin(a) * 8.4);
      root.add(d);
      uplights.push(d);
    }
  }
  const shellLight = new THREE.PointLight(0xffc48a, 0, 22, 2);
  shellLight.position.set(-4, 1.2, 30);
  root.add(shellLight);

  // ---------------- trees: clustered leafy crowns (instanced)
  const treeSpots: { x: number; y: number; z: number; s: number }[] = [];
  {
    const r = rng(42);
    const round: THREE.Vector3[] = [];
    const tall: THREE.Vector3[] = [];
    const blocked = (x: number, z: number) =>
      (x > -18 && x < 37 && z > -13 && z < 15) || // house, pool
      (x > -46 && x < -21 && z > -28 && z < 8) || // chapel court
      (x > -24 && x < 16 && z > 15 && z < 60) || // pavilion & camera paths
      (x > 6 && x < 44 && z > 12 && z < 56) || // camera path to the pool
      (x > -40 && x < -20 && z > 0 && z < 20) ||
      (x > 24 && x < 90 && z > 14 && z < 90) || // hero camera
      (x > -50 && x < -18 && z > -90 && z < -27); // sightline through the chapel cross
    let guard = 0;
    const nRound = lowTier ? 45 : 70;
    const nTall = lowTier ? 30 : 46;
    while ((round.length < nRound || tall.length < nTall) && guard++ < 6000) {
      const a = r() * Math.PI * 2;
      const d = 20 + r() * 110;
      const x = Math.cos(a) * d;
      const z = Math.sin(a) * d - 5;
      if (blocked(x, z)) continue;
      const y = x > 14 ? -3 : 0;
      if (r() > 0.45 && round.length < nRound) round.push(new THREE.Vector3(x, y, z));
      else if (tall.length < nTall) tall.push(new THREE.Vector3(x, y, z));
    }
    for (let i = 0; i < 5; i++) tall.push(new THREE.Vector3(-58 + i * 2.6, 0, -30 - r() * 2)); // cypress rows flanking the chapel
    for (let i = 0; i < 4; i++) tall.push(new THREE.Vector3(-22 + i * 2.6, 0, -31 - r() * 2));
    for (let i = 0; i < 5; i++) round.push(new THREE.Vector3(50 + r() * 8, -3, -22 + i * 5));

    // one organic leaf-cluster blob, reused for every cluster
    const blobGeo = track(new THREE.IcosahedronGeometry(1, 3));
    {
      const bp = blobGeo.attributes.position as THREE.BufferAttribute;
      const v = new THREE.Vector3();
      for (let i = 0; i < bp.count; i++) {
        v.fromBufferAttribute(bp, i);
        const n = Math.sin(v.x * 3.1) * Math.cos(v.y * 2.7) * Math.sin(v.z * 3.3);
        v.multiplyScalar(1 + n * 0.22);
        bp.setXYZ(i, v.x, v.y, v.z);
      }
      blobGeo.computeVertexNormals();
    }
    const trunkGeo = track(new THREE.CylinderGeometry(0.12, 0.22, 1, 7));
    const clusters: THREE.Matrix4[] = [];
    const clusterTall: THREE.Matrix4[] = [];
    const trunks: THREE.Matrix4[] = [];
    const dummy = new THREE.Object3D();
    const tint: THREE.Color[] = [];
    const tintTall: THREE.Color[] = [];
    const col = new THREE.Color();

    round.forEach((p) => {
      const s = 0.8 + r() * 0.7;
      const trunkH = 2.6 * s;
      dummy.position.set(p.x, p.y + trunkH / 2, p.z);
      dummy.scale.set(s, trunkH, s);
      dummy.rotation.set((r() - 0.5) * 0.1, 0, (r() - 0.5) * 0.1);
      dummy.updateMatrix();
      trunks.push(dummy.matrix.clone());
      const cy = p.y + trunkH + 1.6 * s;
      const n = lowTier ? 12 : 26;
      const hue = r();
      for (let k = 0; k < n; k++) {
        const th = r() * Math.PI * 2;
        const ph = Math.acos(2 * r() - 1);
        const rad = 1.7 * s * Math.cbrt(r());
        dummy.position.set(p.x + Math.sin(ph) * Math.cos(th) * rad * 1.15, cy + Math.cos(ph) * rad * 0.8, p.z + Math.sin(ph) * Math.sin(th) * rad * 1.15);
        const cs = s * (0.55 + r() * 0.45);
        dummy.scale.set(cs, cs * (0.8 + r() * 0.3), cs);
        dummy.rotation.set(r() * 6, r() * 6, r() * 6);
        dummy.updateMatrix();
        clusters.push(dummy.matrix.clone());
        tint.push(col.setHSL(0.24 + hue * 0.05, 0.25 + r() * 0.12, 0.62 + r() * 0.25).clone());
      }
      treeSpots.push({ x: p.x, y: p.y, z: p.z, s: 2.6 * s });
    });
    tall.forEach((p) => {
      const s = 0.75 + r() * 0.55;
      const h = 8 * s;
      dummy.position.set(p.x, p.y + 0.6, p.z);
      dummy.scale.set(0.7, 1.2, 0.7);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      trunks.push(dummy.matrix.clone());
      const n = lowTier ? 12 : 22;
      for (let k = 0; k < n; k++) {
        const t = k / (n - 1);
        const w = (0.85 - Math.pow(t, 1.8) * 0.7) * s * (0.85 + r() * 0.3);
        dummy.position.set(p.x + (r() - 0.5) * 0.3 * w, p.y + 1.2 + t * h, p.z + (r() - 0.5) * 0.3 * w);
        dummy.scale.set(w, (h / n) * 2.2, w);
        dummy.rotation.set(0, r() * 6, 0);
        dummy.updateMatrix();
        clusterTall.push(dummy.matrix.clone());
        tintTall.push(col.setHSL(0.27, 0.22, 0.5 + r() * 0.25).clone());
      }
      treeSpots.push({ x: p.x, y: p.y, z: p.z, s: 1.4 * s });
    });

    const mk = (geo: THREE.BufferGeometry, mat: THREE.Material, mats: THREE.Matrix4[], colors?: THREE.Color[]) => {
      const im = new THREE.InstancedMesh(geo, mat, mats.length);
      mats.forEach((m, i) => im.setMatrixAt(i, m));
      if (colors) colors.forEach((c, i) => im.setColorAt(i, c));
      im.castShadow = true;
      im.receiveShadow = true;
      root.add(im);
      return im;
    };
    mk(blobGeo, M.foliage, clusters, tint);
    mk(blobGeo, M.cypress, clusterTall, tintTall);
    mk(trunkGeo, M.trunk, trunks);
  }

  // ---------------- contact shadows (soft AO decals)
  {
    const aoTex = track(TX.aoBlob());
    const aoMat = track(
      new THREE.MeshBasicMaterial({ map: aoTex, transparent: true, depthWrite: false, color: 0x000000, polygonOffset: true, polygonOffsetFactor: -2 }),
    );
    const plane = track(new THREE.PlaneGeometry(1, 1));
    const blob = (x: number, y: number, z: number, w: number, d: number, o = 0.6) => {
      const m = new THREE.Mesh(plane, aoMat.clone());
      (m.material as THREE.MeshBasicMaterial).opacity = o;
      track(m.material as THREE.Material);
      m.rotation.x = -Math.PI / 2;
      m.position.set(x, y + 0.012, z);
      m.scale.set(w, d, 1);
      m.renderOrder = 1;
      root.add(m);
    };
    for (const t of treeSpots) blob(t.x, t.y, t.z, t.s * 2.2, t.s * 2.2, 0.55);
    blob(-6.1, 0.35, 1.1, 4.4, 2.2, 0.5); // sofa
    blob(-6.1, 0.37, 3.0, 2.0, 2.0, 0.45); // coffee table
    blob(6.1, 0.35, 0.4, 4.6, 3.0, 0.5); // dining
    blob(8.25, 0.35, -4.8, 5.6, 2.2, 0.55); // island
    blob(0, 0.35, -2.47, 7.4, 1.0, 0.5); // onyx wall
    blob(-0.5, 0.05, 0, 34, 24, 0.32); // pavilion footprint
    blob(-34, 0.03, -14, 13, 19, 0.45); // chapel
    blob(-4, 0.035, 30, 26, 15, 0.28); // shell
    blob(-0.3, 0.05, -6.7, 3.2, 3.2, 0.6); // stone core
  }

  // ---------------- garden bollards along the path (glow at night)
  {
    const bollGeo = track(new THREE.CylinderGeometry(0.06, 0.06, 0.5, 10));
    const capGeo = track(new THREE.CylinderGeometry(0.065, 0.065, 0.06, 10));
    for (let z = 12.5; z <= 21; z += 2.8)
      for (const x of [-1.85, 1.85]) {
        const b = new THREE.Mesh(bollGeo, M.steel);
        b.position.set(x, 0.25, z);
        const cap = new THREE.Mesh(capGeo, M.uplight);
        cap.position.set(x, 0.42, z);
        root.add(b, cap);
        uplights.push(cap);
      }
  }

  // ---------------- clipped hedges
  {
    block(-3.2, -2.3, 0, 0.9, 11.5, 21.5, M.hedge, 1.2);
    block(2.3, 3.2, 0, 0.9, 11.5, 21.5, M.hedge, 1.2);
    block(-16, -13.5, 0, 1.1, -10.5, 10.5, M.hedge, 1.2);
    block(-45, -23, 0, 1.4, -28.5, -27.5, M.hedge, 1.2);
    block(-23, -22, 0, 1.4, -27.5, -1.5, M.hedge, 1.2);
  }

  // ---------------- sky, stars, lights
  const sky = new Sky();
  sky.scale.setScalar(4500);
  scene.add(sky);
  const skyU = sky.material.uniforms;
  skyU.turbidity.value = 7;
  skyU.mieCoefficient.value = 0.0035;
  skyU.mieDirectionalG.value = 0.94;
  track(sky.geometry);
  track(sky.material);

  // Reflections come from the same sky (a small copy rendered into a PMREM cube), so glass,
  // water and polished stone pick up the real dusk / noon / night colours.
  const envScene = new THREE.Scene();
  const envSky = new Sky();
  envSky.scale.setScalar(50);
  envScene.add(envSky);
  const envU = envSky.material.uniforms;
  envU.turbidity.value = skyU.turbidity.value;
  envU.mieCoefficient.value = skyU.mieCoefficient.value;
  envU.mieDirectionalG.value = skyU.mieDirectionalG.value;
  const envGround = new THREE.Mesh(
    new THREE.CircleGeometry(40, 32).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0x2a2a24 }),
  );
  envGround.position.y = -2;
  envScene.add(envGround);
  track(envSky.geometry);
  track(envSky.material);
  track(envGround.geometry);
  track(envGround.material as THREE.Material);
  const lastEnvDir = new THREE.Vector3(9, 9, 9);
  let lastEnvTime = -1e9;
  function refreshEnv(dir: THREE.Vector3, day: number, now: number, force = false) {
    if (!force && (dir.angleTo(lastEnvDir) < 0.03 || now - lastEnvTime < 350)) return;
    envU.sunPosition.value.copy(dir);
    envU.rayleigh.value = skyU.rayleigh.value;
    (envGround.material as THREE.MeshBasicMaterial).color.setRGB(0.05 + day * 0.18, 0.05 + day * 0.17, 0.045 + day * 0.14);
    const next = pmrem.fromScene(envScene, 0, 0.1, 200);
    envRT?.dispose();
    envRT = next;
    scene.environment = next.texture;
    lastEnvDir.copy(dir);
    lastEnvTime = now;
  }

  const starGeo = track(new THREE.BufferGeometry());
  {
    const r = rng(77);
    const n = 1800;
    const p = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const th = r() * Math.PI * 2;
      const ph = Math.acos(0.05 + r() * 0.95);
      p.set([Math.sin(ph) * Math.cos(th) * 2200, Math.cos(ph) * 2200, Math.sin(ph) * Math.sin(th) * 2200], i * 3);
    }
    starGeo.setAttribute("position", new THREE.BufferAttribute(p, 3));
  }
  const starMat = track(new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false }));
  const stars = new THREE.Points(starGeo, starMat);
  stars.renderOrder = 2;
  scene.add(stars);

  // deep blue-hour / night dome over the physical sky (the sky model alone stays too grey)
  const nightUniforms = { uNight: { value: 0 } };
  const nightMat = track(
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
      fog: false,
      uniforms: nightUniforms,
      vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position = p.xyww; }`,
      fragmentShader: `varying vec3 vDir; uniform float uNight;
        void main(){ float h = clamp(vDir.y, 0.0, 1.0);
          vec3 c = mix(vec3(0.10,0.13,0.22), vec3(0.012,0.018,0.035), pow(h, 0.55));
          gl_FragColor = vec4(c, uNight); }`,
    }),
  );
  const nightGeo = track(new THREE.SphereGeometry(2000, 32, 16));
  const nightDome = new THREE.Mesh(nightGeo, nightMat);
  nightDome.renderOrder = 1;
  scene.add(nightDome);
  const envNight = new THREE.Mesh(nightGeo, nightMat);
  envNight.scale.setScalar(0.02);
  envScene.add(envNight);

  const sun = new THREE.DirectionalLight(0xffffff, 3);
  sun.castShadow = true;
  const shadowSize = lowTier ? 1024 : 2048;
  sun.shadow.mapSize.set(shadowSize, shadowSize);
  const sc = sun.shadow.camera;
  sc.left = -58;
  sc.right = 58;
  sc.top = 58;
  sc.bottom = -58;
  sc.near = 1;
  sc.far = 260;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  sun.target.position.set(-4, 0, 8);
  scene.add(sun, sun.target);

  const hemi = new THREE.HemisphereLight(0xbcd0e6, 0x3a3328, 0.4);
  scene.add(hemi);

  // ---------------- post
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.5, 0.5, 1.4);
  let useBloom = !lowTier;
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  bloom.enabled = useBloom;

  // ---------------- camera path
  const posCurve = new THREE.CatmullRomCurve3(KEYFRAMES.map((k) => new THREE.Vector3(...k.pos)), false, "centripetal");
  const tgtCurve = new THREE.CatmullRomCurve3(KEYFRAMES.map((k) => new THREE.Vector3(...k.tgt)), false, "centripetal");
  const fogA = new THREE.Color();
  const fogB = new THREE.Color();

  let anchors = KEYFRAMES.map((_, i) => i * 1000);
  let scrollTarget = 0;
  let scrollSmooth = 0;
  const pointer = new THREE.Vector2();
  const pointerSmooth = new THREE.Vector2();

  type Env = Omit<Keyframe, "at" | "pos" | "tgt" | "hold" | "fog"> & { fog: THREE.Color };
  const env: Env = { sunEl: 0, sunAz: 0, exposure: 1, ambient: 0.3, env: 0.3, glow: 1, beam: 0, fogDensity: 0.004, fog: new THREE.Color() };
  const camPos = new THREE.Vector3();
  const camTgt = new THREE.Vector3();

  function sample(y: number) {
    const n = KEYFRAMES.length;
    let i = 0;
    if (y <= anchors[0]) i = 0;
    else if (y >= anchors[n - 1]) i = n - 2;
    else while (i < n - 2 && y >= anchors[i + 1]) i++;
    const a = KEYFRAMES[i];
    const b = KEYFRAMES[i + 1];
    const span = Math.max(1, anchors[i + 1] - anchors[i]);
    let f = Math.min(1, Math.max(0, (y - anchors[i]) / span));
    if (a.hold && b.hold) f = f * f * (3 - 2 * f);
    else if (a.hold) f = f * f;
    else if (b.hold) f = 1 - (1 - f) * (1 - f);
    const u = (i + f) / (n - 1);
    posCurve.getPoint(u, camPos);
    tgtCurve.getPoint(u, camTgt);
    const L = (k: keyof Env) => (a[k as keyof Keyframe] as number) + ((b[k as keyof Keyframe] as number) - (a[k as keyof Keyframe] as number)) * f;
    env.sunEl = L("sunEl");
    env.sunAz = L("sunAz");
    env.exposure = L("exposure");
    env.ambient = L("ambient");
    env.env = L("env");
    env.glow = L("glow");
    env.beam = L("beam");
    env.fogDensity = L("fogDensity");
    env.fog.copy(fogA.set(a.fog)).lerp(fogB.set(b.fog), f);
  }

  const sunDir = new THREE.Vector3();
  const lightDir = new THREE.Vector3();
  const MOON_DIR = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - 38), THREE.MathUtils.degToRad(205));
  const moonColor = new THREE.Color(0x9fb4e0);
  const poolDay = new THREE.Color(0x0f1c22);
  const poolNight = new THREE.Color(0x1f6f7a);
  const lastSunDir = new THREE.Vector3(9, 9, 9);
  const warmSun = new THREE.Color(1.0, 0.56, 0.32);
  const whiteSun = new THREE.Color(1.0, 0.95, 0.88);
  const skyDay = new THREE.Color(0xbcd0e6);
  const skyNight = new THREE.Color(0x1d2537);

  function applyEnv(time: number) {
    sunDir.setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - env.sunEl), THREE.MathUtils.degToRad(env.sunAz));
    skyU.sunPosition.value.copy(sunDir);
    const day = smooth(-4, 14, env.sunEl);
    skyU.rayleigh.value = 1 + (1 - smooth(0, 25, env.sunEl)) * 2.2;
    skyU.turbidity.value = 8 - smooth(4, 22, env.sunEl) * 5.4;
    envU.turbidity.value = skyU.turbidity.value;
    bloom.strength = 0.12 + 0.5 * (1 - day);
    refreshEnv(sunDir, day, performance.now());
    if (water) {
      const wu = water.material.uniforms;
      wu.sunDirection.value.copy(sunDir);
      wu.sunColor.value.copy(sun.color).multiplyScalar(smooth(-2, 4, env.sunEl));
      wu.time.value = time * 0.35;
    }
    const night = smooth(2, -5.5, env.sunEl);
    nightUniforms.uNight.value = night;
    // the key light becomes moonlight once the sun has set
    const moonOn = env.sunEl < -3;
    lightDir.copy(moonOn ? MOON_DIR : sunDir);
    sun.position.copy(sun.target.position).addScaledVector(lightDir, 120);
    if (moonOn) {
      sun.intensity = 0.7 * smooth(-3, -7, env.sunEl);
      sun.color.copy(moonColor);
    } else {
      sun.intensity = 3.3 * smooth(-1.5, 6, env.sunEl);
      sun.color.copy(warmSun).lerp(whiteSun, smooth(2, 28, env.sunEl));
    }
    if (lightDir.distanceToSquared(lastSunDir) > 1e-6) {
      renderer.shadowMap.needsUpdate = true;
      lastSunDir.copy(lightDir);
    }
    if (water) water.material.uniforms.waterColor.value.copy(poolDay).lerp(poolNight, night * Math.min(1, env.glow));
    hemi.intensity = env.ambient * 2.0;
    hemi.groundColor.setRGB(0.23 - night * 0.15, 0.2 - night * 0.13, 0.16 - night * 0.08);
    hemi.color.copy(skyNight).lerp(skyDay, day);
    scene.environmentIntensity = env.env;
    renderer.toneMappingExposure = env.exposure;
    fog.color.copy(env.fog);
    fog.density = env.fogDensity;
    starMat.opacity = smooth(1, -7, env.sunEl) * 0.9;

    const glow = env.glow;
    M.lamp.emissiveIntensity = 0.3 + glow * 7;
    M.uplight.emissiveIntensity = glow * 2.6;
    M.onyx.emissiveIntensity = 0.05 + glow * 0.55;
    M.interior.emissiveIntensity = 0.06 + glow * 0.9 * (1 - day * 0.65);
    warmA.intensity = glow * 26;
    warmB.intensity = glow * 20;
    warmC.intensity = glow * 18;
    shellLight.intensity = glow * 9 * (1 - smooth(-3, 4, env.sunEl));
    fallMat.uniforms.uLight.value = 0.35 + day * 0.65 + glow * 0.15;
    beamUniforms.uIntensity.value = env.beam;
    dustUniforms.uIntensity.value = env.beam;
    dustUniforms.uTime.value = time;
    fallMat.uniforms.uTime.value = time;
    for (const d of uplights) d.visible = glow > 0.3;
  }

  // ---------------- loop
  let raf = 0;
  let active = true;
  let disposed = false;
  let last = performance.now();
  let start = last;
  let frames = 0;
  let slowFrames = 0;
  let ready = false;
  const reduced = Boolean(opts.reducedMotion);

  function frame(now: number) {
    if (disposed) return;
    raf = requestAnimationFrame(frame);
    if (!active) {
      last = now;
      return;
    }
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    const time = (now - start) / 1000;

    scrollSmooth += (scrollTarget - scrollSmooth) * (reduced ? 1 : 1 - Math.exp(-dt * 4.2));
    pointerSmooth.lerp(pointer, 1 - Math.exp(-dt * 2.5));
    sample(scrollSmooth);

    const breathe = reduced ? 0 : 1;
    camera.position.copy(camPos);
    camera.position.x += pointerSmooth.x * 0.6 * breathe + Math.sin(time * 0.21) * 0.08 * breathe;
    camera.position.y += -pointerSmooth.y * 0.3 * breathe + Math.sin(time * 0.17) * 0.05 * breathe;
    camTgt.x += pointerSmooth.x * 0.25 * breathe;
    camera.lookAt(camTgt);
    applyEnv(time);

    if (!reduced) {
      for (const p of pendants) p.rotation.z = Math.sin(time * 0.6 + p.userData.phase) * 0.015;
    }

    if (useBloom) composer.render(dt);
    else renderer.render(scene, camera);

    // adapt quality after warm-up if the GPU struggles
    frames++;
    if (frames > 30 && frames < 240) {
      if (dt > 0.034) slowFrames++;
      if (slowFrames > 60) {
        slowFrames = -1e9;
        pixelRatio = Math.max(1, pixelRatio * 0.75);
        renderer.setPixelRatio(pixelRatio);
        useBloom = false;
        resize();
      }
    }

  }

  function resize() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    composer.setPixelRatio(pixelRatio);
    composer.setSize(w, h);
    bloom.resolution.set(w / 2, h / 2);
    camera.aspect = w / h;
    camera.fov = w / h < 0.8 ? 52 : w / h < 1.2 ? 44 : 36;
    camera.updateProjectionMatrix();
  }

  resize();
  sample(0);
  applyEnv(0);
  renderer.shadowMap.needsUpdate = true;
  // Render the first frame now (not on the next animation frame) so the page can reveal
  // the scene immediately, even in a background tab.
  frame(performance.now());
  buildDetail()
    .catch(() => undefined)
    .then(() => {
      if (disposed) return;
      renderer.shadowMap.needsUpdate = true;
      ready = true;
      opts.onReady?.();
    });

  return {
    setScroll(y) {
      scrollTarget = y;
    },
    setAnchors(a) {
      if (a.length === KEYFRAMES.length) anchors = a;
    },
    setPointer(x, y) {
      pointer.set(x, y);
    },
    setActive(v) {
      active = v;
    },
    resize,
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      water?.geometry.dispose();
      water?.material.dispose();
      envRT?.dispose();
      composer.dispose();
      bloom.dispose();
      for (const d of disposables) d.dispose();
      renderer.dispose();
    },
  };
}
