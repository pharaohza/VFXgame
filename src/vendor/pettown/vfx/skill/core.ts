// Shared state and pooled resources for every skill VFX.
//
// Split out of skillVfx.ts so each element family can live in its own file. Everything here
// is process-wide and pre-allocated on purpose: allocating geometry or compiling a shader on
// the first cast of a skill is what causes the one-frame stutter this engine exists to avoid.
//
// Mutable values (`vfxScene`, the `hovl*Texture` handles that async loads fill in later) are
// exported as `let`. ES module bindings are live, so the family files observe those updates —
// but only this module may ASSIGN to them, which is why `flashVfxLight` exists.
import * as THREE from 'three';
import { VFX_TEXTURE_URL_BY_KEY, vfxTextureKeysForSkills } from './assetManifest.mjs';
import { loadRuntimeTexture } from '../../assets/runtimeTextures.ts';

export let vfxScene: THREE.Scene | null = null;
export let vfxCamera: THREE.Camera | null = null;
export let vfxRenderer: THREE.WebGLRenderer | null = null;
let vfxWarmupActive = false;

// Quality dials for skill VFX. These are `export let` on purpose: ES module bindings are live, so
// the per-element files see an updated value without importing a getter (see the note above).
//
// The dial that matters is vfxLayerScale, not particle counts. These effects are additive with
// depthWrite off, so nothing can be rejected early and every layer shades every pixel it covers -
// cost is screen area times layer count. A boss slam grows to ~7 units across, so dropping
// decorative layers buys far more than thinning any single one.
export let vfxLayerScale = 1;
export let vfxPeakScale = 1;
export let vfxConcurrencyBudget = 24;
// Effects further than this from the camera are not spawned at all. In a party fight most casts
// land off to the side of what the player is actually looking at.
export let vfxSpawnDistance = 46;

/** Scales an authored decorative count by the current quality, keeping at least `floor`. */
export function vfxDetailCount(full: number, floor = 0) {
  return Math.max(floor, Math.round(full * vfxLayerScale));
}

export function setVfxQuality(quality: string) {
  if (quality === 'low') { vfxLayerScale = 0; vfxPeakScale = 0.7; vfxConcurrencyBudget = 8; vfxSpawnDistance = 30; return; }
  if (quality === 'high') { vfxLayerScale = 1; vfxPeakScale = 1; vfxConcurrencyBudget = 24; vfxSpawnDistance = 46; return; }
  vfxLayerScale = 0.5; vfxPeakScale = 0.85; vfxConcurrencyBudget = 14; vfxSpawnDistance = 38;
}
// Shared light pool to avoid shader recompilation hitches
export let vfxPooledLight: THREE.PointLight | null = null;
export let vfxLightTimer = 0;
export let vfxLightMaxDuration = 0.35;
export let vfxLightMaxIntensity = 6;

// Shared pre-allocated geometries
export const sharedSlashGeo = new THREE.PlaneGeometry(1.6, 1.6);
export const sharedPlaneGeo = new THREE.PlaneGeometry(1.0, 1.0);
export const sharedRayGeo = new THREE.PlaneGeometry(0.8, 3.2);
export const sharedCrystalGeo = new THREE.ConeGeometry(0.4, 2.2, 6);
export const sharedBeamGeo = new THREE.PlaneGeometry(1.2, 10.0);
export const sharedPillarGeo = new THREE.CylinderGeometry(1.2, 1.2, 3.5, 16, 1, true);
export const sharedSnareBandGeo = new THREE.TorusGeometry(0.76, 0.035, 6, 24);
export const sharedEmberCoreGeo = new THREE.IcosahedronGeometry(0.42, 1);
// Toxic Paws needs a truly round silhouette from the high gameplay camera. Its old textured
// trail cards exposed their rectangular alpha bounds on some GPUs, so the orb and wake now
// share real sphere geometry instead of camera-facing quads.
export const sharedToxicOrbGeo = new THREE.SphereGeometry(0.42, 12, 8);

// Lightweight accent layer used by the hero skills below.  It gives every cast
// a readable anticipation/impact beat without allocating new geometry per cast.
export function makeVfxAccent(group: THREE.Group, texture: THREE.Texture, color: string, y = 0.09) {
  const mat = new THREE.MeshBasicMaterial({ map: texture, color: new THREE.Color(color), transparent: true, opacity: 1, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(sharedPlaneGeo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = y;
  mesh.scale.setScalar(0.18);
  group.add(mesh);
  return { mesh, mat };
}

// Spark particle pre-allocations for Paw Strike
export const sparkCount = 20;
export const sharedSparkGeo = new THREE.BufferGeometry();
export const sparkPositions = new Float32Array(sparkCount * 3);
export const sparkVelocities: Array<THREE.Vector3> = [];
for (let i = 0; i < sparkCount; i++) {
  sparkVelocities.push(new THREE.Vector3());
}
sharedSparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPositions, 3));

// Fire Ember particle pre-allocations for Ember Slam
export const emberCount = 45;
export const sharedEmberGeo = new THREE.BufferGeometry();
export const emberPositions = new Float32Array(emberCount * 3);
export const emberVelocities: Array<THREE.Vector3> = [];
for (let i = 0; i < emberCount; i++) {
  emberVelocities.push(new THREE.Vector3());
}
sharedEmberGeo.setAttribute('position', new THREE.BufferAttribute(emberPositions, 3));

// Magma Splatter particle pre-allocations for Ember Slam
export const magmaCount = 28;
export const sharedMagmaGeo = new THREE.BufferGeometry();
export const magmaPositions = new Float32Array(magmaCount * 3);
export const magmaVelocities: Array<THREE.Vector3> = [];
for (let i = 0; i < magmaCount; i++) {
  magmaVelocities.push(new THREE.Vector3());
}
sharedMagmaGeo.setAttribute('position', new THREE.BufferAttribute(magmaPositions, 3));

// Ice Shard particle pre-allocations for Frost Poke
export const iceCount = 40;
export const sharedIceGeo = new THREE.BufferGeometry();
export const icePositions = new Float32Array(iceCount * 3);
export const iceVelocities: Array<THREE.Vector3> = [];
for (let i = 0; i < iceCount; i++) {
  iceVelocities.push(new THREE.Vector3());
}
sharedIceGeo.setAttribute('position', new THREE.BufferAttribute(icePositions, 3));

// Snowflake particle pre-allocations for Frost Poke Blizzard Vortex
export const flakeCount = 35;
export const sharedFlakeGeo = new THREE.BufferGeometry();
export const flakePositions = new Float32Array(flakeCount * 3);
export const flakeVelocities: Array<THREE.Vector3> = [];
for (let i = 0; i < flakeCount; i++) {
  flakeVelocities.push(new THREE.Vector3());
}
sharedFlakeGeo.setAttribute('position', new THREE.BufferAttribute(flakePositions, 3));

// Lightning Spark particle pre-allocations for Spark Lance
export const electroCount = 45;
export const sharedElectroGeo = new THREE.BufferGeometry();
export const electroPositions = new Float32Array(electroCount * 3);
export const electroVelocities: Array<THREE.Vector3> = [];
for (let i = 0; i < electroCount; i++) {
  electroVelocities.push(new THREE.Vector3());
}
sharedElectroGeo.setAttribute('position', new THREE.BufferAttribute(electroPositions, 3));

// Heal Sparkle particle pre-allocations for Gentle Mend
export const healCount = 35;
export const sharedHealGeo = new THREE.BufferGeometry();
export const healPositions = new Float32Array(healCount * 3);
export const healVelocities: Array<THREE.Vector3> = [];
for (let i = 0; i < healCount; i++) {
  healVelocities.push(new THREE.Vector3());
}
sharedHealGeo.setAttribute('position', new THREE.BufferAttribute(healPositions, 3));

// Thunder Bloom Petal Sparkle pre-allocations
export const bloomCount = 45;
export const sharedBloomGeo = new THREE.BufferGeometry();
export const bloomPositions = new Float32Array(bloomCount * 3);
export const bloomVelocities: Array<THREE.Vector3> = [];
for (let i = 0; i < bloomCount; i++) {
  bloomVelocities.push(new THREE.Vector3());
}
sharedBloomGeo.setAttribute('position', new THREE.BufferAttribute(bloomPositions, 3));

// Procedural Fallback Textures
export function createFallbackSlashTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.strokeStyle = '#ffc844';
  ctx.lineWidth = 12;
  ctx.lineCap = 'round';
  ctx.shadowColor = '#ff5500';
  ctx.shadowBlur = 20;
  for (let i = 0; i < 3; i++) {
    const ox = (i - 1) * 28;
    ctx.beginPath();
    ctx.moveTo(35 + ox, 15);
    ctx.quadraticCurveTo(70 + ox, 64, 30 + ox, 110);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

export function createFallbackFlashTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255, 255, 255, 1)');
  g.addColorStop(0.3, 'rgba(255, 200, 60, 0.95)');
  g.addColorStop(0.7, 'rgba(255, 100, 20, 0.5)');
  g.addColorStop(1, 'rgba(255, 30, 0, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

export function createFallbackMagicCircleTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.strokeStyle = '#ff7700';
  ctx.lineWidth = 6;
  ctx.shadowColor = '#ff3300';
  ctx.shadowBlur = 15;
  ctx.beginPath();
  ctx.arc(128, 128, 110, 0, Math.PI * 2);
  ctx.stroke();
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

// Loaded Textures
export let hovlSlashTexture: THREE.Texture = createFallbackSlashTexture();
export let hovlFlashTexture: THREE.Texture = createFallbackFlashTexture();
export let cfxrHitTriangleTexture: THREE.Texture = createFallbackFlashTexture();
export let hovlMagicCircleTexture: THREE.Texture = createFallbackMagicCircleTexture();
export let hovlCrackTexture: THREE.Texture = createFallbackFlashTexture();
export let hovlCraterTexture: THREE.Texture = createFallbackFlashTexture();
export let hovlSplatTexture: THREE.Texture = createFallbackFlashTexture();
export let hovlSmoke26Texture: THREE.Texture = createFallbackFlashTexture();
export let cfxrRayBlurTexture: THREE.Texture = createFallbackFlashTexture();
export let cfxrFlareTexture: THREE.Texture = createFallbackFlashTexture();
export let cfxrSpikeFadeTexture: THREE.Texture = createFallbackFlashTexture();
export let hovlSnowflakeTexture: THREE.Texture = createFallbackFlashTexture();
export let cfxrDebrisIceTexture: THREE.Texture = createFallbackFlashTexture();
export let cfxrRingIceTexture: THREE.Texture = createFallbackFlashTexture();
export let cfxrWaterSplashTexture: THREE.Texture = createFallbackFlashTexture();
export let hovlElectroTexture: THREE.Texture = createFallbackFlashTexture();
export let cfxrElectricArcTexture: THREE.Texture = createFallbackFlashTexture();
export let cfxrElectricSparkTexture: THREE.Texture = createFallbackFlashTexture();
export let cfxrRingElectricTexture: THREE.Texture = createFallbackFlashTexture();
export let cfxrLineElectricTexture: THREE.Texture = createFallbackFlashTexture();
export let cfxrAuraRaysTexture: THREE.Texture = createFallbackFlashTexture();
export let cfxrAuraRunicTexture: THREE.Texture = createFallbackFlashTexture();
export let cfxrMagicStarTexture: THREE.Texture = createFallbackFlashTexture();
export let hovlMagicCircle2Texture: THREE.Texture = createFallbackMagicCircleTexture();
export let hovlFlareTexture: THREE.Texture = createFallbackFlashTexture();
export let hovlGlowTexture: THREE.Texture = createFallbackFlashTexture();
export let hovlStarTexture: THREE.Texture = createFallbackFlashTexture();
export let hovlTechCircle2Texture: THREE.Texture = createFallbackMagicCircleTexture();
export let hovlTrailTexture: THREE.Texture = createFallbackFlashTexture();
export let hovlFlashFree2Texture: THREE.Texture = createFallbackFlashTexture();
export let hovlArrowTexture: THREE.Texture = createFallbackFlashTexture();
export let hovlProjectileTexture: THREE.Texture = createFallbackFlashTexture();
export let hovlCircle2Texture: THREE.Texture = createFallbackFlashTexture();
export let hovlFlashFree1Texture: THREE.Texture = createFallbackFlashTexture();
export let hovlPointTexture: THREE.Texture = createFallbackFlashTexture();
export let hovlHeartTexture: THREE.Texture = createFallbackFlashTexture();
export let hovlStoneTexture: THREE.Texture = createFallbackFlashTexture();
export let hovlSmokeFree1Texture: THREE.Texture = createFallbackFlashTexture();
export let hovlCircleTexture: THREE.Texture = createFallbackFlashTexture();

const vfxTextureSetterByKey: Record<string, (texture: THREE.Texture) => void> = {
  hovlSlashTexture: (texture) => { hovlSlashTexture = texture; },
  hovlFlashTexture: (texture) => { hovlFlashTexture = texture; },
  cfxrHitTriangleTexture: (texture) => { cfxrHitTriangleTexture = texture; },
  hovlMagicCircleTexture: (texture) => { hovlMagicCircleTexture = texture; },
  hovlCrackTexture: (texture) => { hovlCrackTexture = texture; },
  hovlCraterTexture: (texture) => { hovlCraterTexture = texture; },
  hovlSplatTexture: (texture) => { hovlSplatTexture = texture; },
  hovlSmoke26Texture: (texture) => { hovlSmoke26Texture = texture; },
  cfxrRayBlurTexture: (texture) => { cfxrRayBlurTexture = texture; },
  cfxrFlareTexture: (texture) => { cfxrFlareTexture = texture; },
  cfxrSpikeFadeTexture: (texture) => { cfxrSpikeFadeTexture = texture; },
  hovlSnowflakeTexture: (texture) => { hovlSnowflakeTexture = texture; },
  cfxrDebrisIceTexture: (texture) => { cfxrDebrisIceTexture = texture; },
  cfxrRingIceTexture: (texture) => { cfxrRingIceTexture = texture; },
  cfxrWaterSplashTexture: (texture) => { cfxrWaterSplashTexture = texture; },
  hovlElectroTexture: (texture) => { hovlElectroTexture = texture; },
  cfxrElectricArcTexture: (texture) => { cfxrElectricArcTexture = texture; },
  cfxrElectricSparkTexture: (texture) => { cfxrElectricSparkTexture = texture; },
  cfxrRingElectricTexture: (texture) => { cfxrRingElectricTexture = texture; },
  cfxrLineElectricTexture: (texture) => { cfxrLineElectricTexture = texture; },
  cfxrAuraRaysTexture: (texture) => { cfxrAuraRaysTexture = texture; },
  cfxrAuraRunicTexture: (texture) => { cfxrAuraRunicTexture = texture; },
  cfxrMagicStarTexture: (texture) => { cfxrMagicStarTexture = texture; },
  hovlMagicCircle2Texture: (texture) => { hovlMagicCircle2Texture = texture; },
  hovlFlareTexture: (texture) => { hovlFlareTexture = texture; },
  hovlGlowTexture: (texture) => { hovlGlowTexture = texture; },
  hovlStarTexture: (texture) => { hovlStarTexture = texture; },
  hovlTechCircle2Texture: (texture) => { hovlTechCircle2Texture = texture; },
  hovlTrailTexture: (texture) => { hovlTrailTexture = texture; },
  hovlFlashFree2Texture: (texture) => { hovlFlashFree2Texture = texture; },
  hovlArrowTexture: (texture) => { hovlArrowTexture = texture; },
  hovlProjectileTexture: (texture) => { hovlProjectileTexture = texture; },
  hovlCircle2Texture: (texture) => { hovlCircle2Texture = texture; },
  hovlFlashFree1Texture: (texture) => { hovlFlashFree1Texture = texture; },
  hovlPointTexture: (texture) => { hovlPointTexture = texture; },
  hovlHeartTexture: (texture) => { hovlHeartTexture = texture; },
  hovlStoneTexture: (texture) => { hovlStoneTexture = texture; },
  hovlSmokeFree1Texture: (texture) => { hovlSmokeFree1Texture = texture; },
  hovlCircleTexture: (texture) => { hovlCircleTexture = texture; },
};
const vfxTextureLoads = new Map<string, Promise<THREE.Texture | null>>();
const loadedVfxTextureKeys = new Set<string>();
const failedVfxTextureKeys = new Set<string>();

function loadVfxTexture(key: string): Promise<THREE.Texture | null> {
  const inFlight = vfxTextureLoads.get(key);
  if (inFlight) return inFlight;
  const url = VFX_TEXTURE_URL_BY_KEY[key];
  const setter = vfxTextureSetterByKey[key];
  if (!url || !setter) return Promise.resolve(null);
  const load = loadRuntimeTexture(url, { flipY: true }).then((texture) => {
    setter(texture);
    loadedVfxTextureKeys.add(key);
    return texture;
  }).catch((error) => {
    failedVfxTextureKeys.add(key);
    console.warn(`Skill VFX texture failed to load: ${url}`, error);
    return null;
  });
  vfxTextureLoads.set(key, load);
  return load;
}

/** Fetches and decodes only the textures used by the supplied equipped/cast skills. */
export function preloadVfxAssetsForSkills(skillIds: readonly string[]) {
  return Promise.all(vfxTextureKeysForSkills([...skillIds]).map(loadVfxTexture));
}

export function vfxTextureWarmupSnapshot() {
  return {
    total: Object.keys(VFX_TEXTURE_URL_BY_KEY).length,
    requested: vfxTextureLoads.size,
    loaded: loadedVfxTextureKeys.size,
    failed: failedVfxTextureKeys.size,
    pending: Math.max(0, vfxTextureLoads.size - loadedVfxTextureKeys.size - failedVfxTextureKeys.size),
  };
}

export const activeVfxList: Array<{
  update: (dt: number) => boolean;
  dispose: () => void;
}> = [];

export function initSkillVfx(scene: THREE.Scene, camera?: THREE.Camera, renderer?: THREE.WebGLRenderer) {
  vfxScene = scene;
  if (camera) vfxCamera = camera;
  if (renderer) vfxRenderer = renderer;

  vfxPooledLight = new THREE.PointLight(0xffaa22, 0, 8);
  vfxPooledLight.position.set(0, -999, 0);
  vfxScene.add(vfxPooledLight);
}

/** Temporarily redirects effect construction into an off-screen scene for shader warm-up. */
export function useVfxWarmupScene(scene: THREE.Scene) {
  const previousScene = vfxScene;
  const previousWarmup = vfxWarmupActive;
  vfxScene = scene;
  vfxWarmupActive = true;
  return () => {
    vfxScene = previousScene;
    vfxWarmupActive = previousWarmup;
  };
}

/**
 * Flashes the shared point light at a world position.
 *
 * Every skill used to inline this block. It has to be a function now: the counters live in this
 * module, and an imported binding cannot be assigned to from another one.
 */
export function flashVfxLight(color: string, x: number, y: number, z: number, duration: number, intensity: number) {
  if (!vfxPooledLight || vfxWarmupActive) return;
  vfxPooledLight.color.set(color);
  vfxPooledLight.position.set(x, y, z);
  vfxLightMaxDuration = duration;
  vfxLightMaxIntensity = intensity;
  vfxPooledLight.intensity = intensity;
  vfxLightTimer = duration;
}

/** Drains the pooled light. Called once per frame by updateSkillVfx. */
export function decayVfxLight(dt: number) {
  if (!vfxPooledLight || vfxLightTimer <= 0) return;
  vfxLightTimer -= dt;
  vfxPooledLight.intensity = vfxLightMaxIntensity * Math.max(0, vfxLightTimer / vfxLightMaxDuration);
  if (vfxLightTimer <= 0) vfxPooledLight.position.set(0, -999, 0);
}
