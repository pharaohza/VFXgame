// Dust kicked up under the player while sprinting.
//
// Unlike every other effect in src/vfx, this one is CONTINUOUS - it is live for as long as the
// player holds shift, not for the third of a second a skill lasts. That rules out the spawn-an-
// object-per-event shape the skill files use: at one puff every ~90ms it would allocate a group, a
// material and a mesh several times a second for the entire session, and push an entry onto
// activeVfxList each time, which is the list the concurrency budget trims.
//
// So it is a fixed pool instead, allocated once:
//
// * ONE InstancedMesh for every puff, so the whole trail is a single draw call rather than one per
//   puff. Dead slots are scaled to zero, which costs a degenerate triangle and no fragments.
// * Per-puff fade rides on instanceColor rather than material opacity, because an instance cannot
//   carry its own opacity. The material is additive, so fading a puff's colour to black IS fading
//   it out - the two are the same operation for additive blending.
// * The mesh is hidden outright while no puff is alive, so walking and standing still cost nothing.
//
// Feeding on the quality preset is the point of vfxLayerScale here: dust is pure decoration, so Low
// switches it off completely rather than merely thinning it.

import * as THREE from 'three';
import { hovlSmokeFree1Texture, vfxLayerScale } from './skill/core.ts';

const MAX_PUFFS = 20;
const PUFF_LIFETIME = 0.5;
const EMIT_INTERVAL = 0.085;
// Behind the player and just off the centre line, so the trail reads as footfalls rather than as a
// single ribbon dragged along the ground.
const LATERAL_SPREAD = 0.17;
const BEHIND_OFFSET = 0.28;

type Puff = { life: number; x: number; y: number; z: number; rise: number; spin: number; seed: number; tint: THREE.Color };

let trailMesh: THREE.InstancedMesh | null = null;
let puffs: Puff[] = [];
let emitTimer = 0;
let liveCount = 0;
let printCount = 0;

const puffMatrix = new THREE.Matrix4();
const puffPosition = new THREE.Vector3();
const puffQuaternion = new THREE.Quaternion();
const puffScale = new THREE.Vector3();
const puffColor = new THREE.Color();
const flatOnGround = new THREE.Euler(-Math.PI / 2, 0, 0);
// The dust is tinted from the map's OWN ground colour, read live rather than from a copied table:
// several maps overwrite ground.material.color after the theme is applied (the desert, the meadow
// and the beach all do), so a duplicated table here would be wrong on exactly those maps.
//
// It is not used raw. An additive puff of the literal floor colour is invisible on the dark maps -
// moonveil's ground is #20263e - and muddy on the mid-tone ones, so the hue is kept while lightness
// is floored and saturation capped. Snow stays white, desert stays warm sand, moonveil becomes a
// pale violet that can actually be seen against its own floor.
const DUST_MIN_LIGHTNESS = 0.62;
const DUST_MAX_SATURATION = 0.34;
const dustTint = new THREE.Color('#d8c39a');
const groundHsl = { h: 0, s: 0, l: 0 };
let lastGroundHex = -1;
function refreshDustTint(groundColor: THREE.Color | null | undefined) {
  if (!groundColor) return;
  const hex = groundColor.getHex();
  if (hex === lastGroundHex) return;
  lastGroundHex = hex;
  groundColor.getHSL(groundHsl);
  dustTint.setHSL(groundHsl.h, Math.min(groundHsl.s, DUST_MAX_SATURATION), Math.max(groundHsl.l, DUST_MIN_LIGHTNESS));
}

// ---------------------------------------------------------------- paw prints

const MAX_PRINTS = 28;
const PRINT_LIFETIME = 2.4;
// Emission is by DISTANCE, not by time. A time-based stride bunches prints up when the player is
// slowed and stretches them out at full sprint; a distance-based one keeps the spacing of a stride
// no matter how fast the ground is going by.
const PRINT_STRIDE = 0.62;
const PRINT_SIDE_OFFSET = 0.13;

type Print = { life: number; tint: THREE.Color };

let printMesh: THREE.InstancedMesh | null = null;
let prints: Print[] = [];
let strideAccum = 0;
let strideSide = 1;
let hasLastFoot = false;
const lastFootPosition = new THREE.Vector3();
const printMatrix = new THREE.Matrix4();
const printQuaternion = new THREE.Quaternion();
const printLayFlat = new THREE.Quaternion();
const printHeading = new THREE.Quaternion();
const printAxisY = new THREE.Vector3(0, 1, 0);
const printAxisX = new THREE.Vector3(1, 0, 0);
// Written once per live print, so each keeps its own transform rather than sharing one.
const printTransforms: THREE.Matrix4[] = [];

/** A dog's paw: one pad and four toes, drawn rather than shipped as an asset. */
function createPawPrintTexture() {
  const size = 64, canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const c = canvas.getContext('2d')!;
  c.clearRect(0, 0, size, size);
  c.fillStyle = '#ffffff';
  // Toes sit at the TOP of the canvas. flipY maps canvas-top to the plane's +Y, which after the
  // lay-flat rotation points at world -Z - the direction the heading quaternion below rotates from.
  for (const [tx, ty, r] of [[20, 20, 5.4], [30, 15, 5.8], [41, 17, 5.6], [50, 25, 5]] as const) {
    c.beginPath(); c.ellipse(tx, ty, r, r * 1.15, 0, 0, Math.PI * 2); c.fill();
  }
  c.beginPath(); c.ellipse(size * 0.53, 44, 13, 11, 0, 0, Math.PI * 2); c.fill();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function initPawPrints(scene: THREE.Scene) {
  const material = new THREE.MeshBasicMaterial({
    map: createPawPrintTexture(),
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  printMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), material, MAX_PRINTS);
  printMesh.name = 'PlayerPawPrints';
  printMesh.frustumCulled = false;
  printMesh.visible = false;
  // Under the dust, which should read as being in the air above the ground it came from.
  printMesh.renderOrder = 5;
  prints = Array.from({ length: MAX_PRINTS }, () => ({ life: 0, tint: new THREE.Color() }));
  for (let i = 0; i < MAX_PRINTS; i++) {
    printTransforms.push(new THREE.Matrix4());
    printMesh.setColorAt(i, dustTint);
    printMatrix.compose(puffPosition.set(0, -999, 0), printQuaternion.identity(), puffScale.set(0, 0, 0));
    printMesh.setMatrixAt(i, printMatrix);
  }
  printMesh.instanceMatrix.needsUpdate = true;
  if (printMesh.instanceColor) printMesh.instanceColor.needsUpdate = true;
  scene.add(printMesh);
}

function spawnPrint(x: number, y: number, z: number, headingX: number, headingZ: number) {
  if (!printMesh) return;
  let slot = -1, oldest = Infinity;
  for (let i = 0; i < prints.length; i++) {
    if (prints[i].life <= 0) { slot = i; break; }
    if (prints[i].life < oldest) { oldest = prints[i].life; slot = i; }
  }
  if (slot < 0) return;
  prints[slot].life = PRINT_LIFETIME;
  prints[slot].tint.copy(dustTint);
  // Perpendicular to the heading, alternating, so the tracks read as two feet rather than one line.
  const sideX = headingZ * PRINT_SIDE_OFFSET * strideSide, sideZ = -headingX * PRINT_SIDE_OFFSET * strideSide;
  strideSide = -strideSide;
  // Lay the quad flat, THEN swing it to the heading about world Y. Composed explicitly rather than
  // through an Euler because the two rotations are in different frames and the order matters: the
  // texture's forward is world -Z once flat, so the yaw that carries -Z onto the heading is
  // atan2(-headingX, -headingZ).
  printLayFlat.setFromAxisAngle(printAxisX, -Math.PI / 2);
  printHeading.setFromAxisAngle(printAxisY, Math.atan2(-headingX, -headingZ));
  printQuaternion.copy(printHeading).multiply(printLayFlat);
  printTransforms[slot].compose(
    puffPosition.set(x + sideX, y + 0.022, z + sideZ),
    printQuaternion,
    puffScale.set(0.34, 0.34, 0.34),
  );
  printMesh.setMatrixAt(slot, printTransforms[slot]);
}

function updatePawPrints(dt: number, active: boolean, x: number, y: number, z: number, headingX: number, headingZ: number) {
  if (!printMesh) return 0;

  if (active && vfxLayerScale > 0) {
    if (hasLastFoot) strideAccum += Math.hypot(x - lastFootPosition.x, z - lastFootPosition.z);
    lastFootPosition.set(x, y, z);
    hasLastFoot = true;
    if (strideAccum >= PRINT_STRIDE) { strideAccum = 0; spawnPrint(x, y, z, headingX, headingZ); }
  } else {
    // Reset rather than keep accumulating, or stopping and restarting would drop a print instantly.
    hasLastFoot = false;
    strideAccum = 0;
  }

  let live = 0;
  for (let i = 0; i < prints.length; i++) {
    const print = prints[i];
    if (print.life <= 0) continue;
    print.life -= dt;
    if (print.life <= 0) {
      print.life = 0;
      printMatrix.compose(puffPosition.set(0, -999, 0), printQuaternion.identity(), puffScale.set(0, 0, 0));
      printMesh.setMatrixAt(i, printMatrix);
      continue;
    }
    live++;
    // Holds for most of its life then fades off the end, so a track stays readable behind the
    // player instead of dimming from the moment each print lands.
    const remaining = print.life / PRINT_LIFETIME;
    const fade = remaining > 0.55 ? 1 : remaining / 0.55;
    puffColor.copy(print.tint).multiplyScalar(fade * 0.4);
    printMesh.setColorAt(i, puffColor);
  }
  printMesh.instanceMatrix.needsUpdate = true;
  if (printMesh.instanceColor) printMesh.instanceColor.needsUpdate = true;
  printMesh.visible = live > 0;
  return live;
}

export function initRunTrail(scene: THREE.Scene) {
  if (trailMesh) return;
  const material = new THREE.MeshBasicMaterial({
    map: hovlSmokeFree1Texture,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  trailMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), material, MAX_PUFFS);
  trailMesh.name = 'PlayerRunTrail';
  trailMesh.frustumCulled = false;
  trailMesh.visible = false;
  trailMesh.renderOrder = 6;
  puffs = Array.from({ length: MAX_PUFFS }, () => ({ life: 0, x: 0, y: 0, z: 0, rise: 0, spin: 0, seed: 0, tint: new THREE.Color() }));
  // Allocate instanceColor up front. Left to setColorAt on first use it would appear mid-session,
  // which changes the material's defines and recompiles the shader at exactly the wrong moment.
  for (let i = 0; i < MAX_PUFFS; i++) {
    trailMesh.setColorAt(i, dustTint);
    puffScale.set(0, 0, 0);
    puffMatrix.compose(puffPosition.set(0, -999, 0), puffQuaternion.identity(), puffScale);
    trailMesh.setMatrixAt(i, puffMatrix);
  }
  trailMesh.instanceMatrix.needsUpdate = true;
  if (trailMesh.instanceColor) trailMesh.instanceColor.needsUpdate = true;
  scene.add(trailMesh);
  initPawPrints(scene);
}

function spawnPuff(x: number, y: number, z: number, headingX: number, headingZ: number) {
  // Oldest slot wins when the pool is full: a trail is read back-to-front, so recycling the
  // faintest tail puff is invisible while dropping the new one would break the line at the feet.
  let slot = -1;
  let oldest = Infinity;
  for (let i = 0; i < puffs.length; i++) {
    if (puffs[i].life <= 0) { slot = i; break; }
    if (puffs[i].life < oldest) { oldest = puffs[i].life; slot = i; }
  }
  if (slot < 0) return;
  const puff = puffs[slot];
  const lateral = (Math.random() - 0.5) * 2 * LATERAL_SPREAD;
  // Perpendicular to the heading, so the spread is across the stride rather than along it.
  puff.x = x - headingX * BEHIND_OFFSET - headingZ * lateral;
  puff.z = z - headingZ * BEHIND_OFFSET + headingX * lateral;
  puff.y = y + 0.04;
  puff.life = PUFF_LIFETIME;
  puff.rise = 0.35 + Math.random() * 0.4;
  puff.spin = (Math.random() - 0.5) * 2.4;
  puff.seed = Math.random() * Math.PI * 2;
  puff.tint.copy(dustTint);
}

/**
 * `speed` scales how hard the dust is thrown, so a slowed sprint kicks up less than a full one.
 * `sprinting` and `moving` should already account for anything that hides the player - a stealthed character
 * leaving a dust trail would give their position away.
 */
export function updateRunTrail(
  dt: number,
  sprinting: boolean,
  moving: boolean,
  x: number,
  y: number,
  z: number,
  headingX: number,
  headingZ: number,
  speed = 1,
  groundColor?: THREE.Color | null,
) {
  if (!trailMesh) return;
  // The hovl textures are `export let` filled in by an async load, and this pool is built during
  // boot - before that load resolves. Without this the material would keep the placeholder for the
  // whole session. The skill files never hit it because they read the texture at cast time.
  const material = trailMesh.material as THREE.MeshBasicMaterial;
  if (material.map !== hovlSmokeFree1Texture) { material.map = hovlSmokeFree1Texture; material.needsUpdate = true; }
  refreshDustTint(groundColor);

  // Low quality drops the effect entirely rather than thinning it: this is decoration with no
  // gameplay meaning, so it is the first thing that should go on a machine that cannot afford it.
  if (sprinting && vfxLayerScale > 0) {
    emitTimer -= dt;
    if (emitTimer <= 0) {
      emitTimer = EMIT_INTERVAL / Math.max(0.35, vfxLayerScale);
      spawnPuff(x, y, z, headingX, headingZ);
    }
  } else {
    emitTimer = 0;
  }

  liveCount = 0;
  for (let i = 0; i < puffs.length; i++) {
    const puff = puffs[i];
    if (puff.life <= 0) continue;
    puff.life -= dt;
    if (puff.life <= 0) {
      puff.life = 0;
      puffScale.set(0, 0, 0);
      puffMatrix.compose(puffPosition.set(0, -999, 0), puffQuaternion.identity(), puffScale);
      trailMesh.setMatrixAt(i, puffMatrix);
      continue;
    }
    liveCount++;
    const t = 1 - puff.life / PUFF_LIFETIME;
    const size = (0.3 + t * 0.75 * (0.7 + speed * 0.3)) * Math.max(0.6, vfxLayerScale);
    puffPosition.set(puff.x, puff.y + t * puff.rise * 0.42, puff.z);
    flatOnGround.z = puff.seed + t * puff.spin;
    puffQuaternion.setFromEuler(flatOnGround);
    puffScale.set(size, size, size);
    puffMatrix.compose(puffPosition, puffQuaternion, puffScale);
    trailMesh.setMatrixAt(i, puffMatrix);
    // Ease out so the puff holds its brightness briefly and then drops away, instead of dimming
    // linearly from the moment it appears.
    const fade = (1 - t) * (1 - t);
    puffColor.copy(puff.tint).multiplyScalar(fade * (0.55 + speed * 0.3));
    trailMesh.setColorAt(i, puffColor);
  }

  trailMesh.instanceMatrix.needsUpdate = true;
  if (trailMesh.instanceColor) trailMesh.instanceColor.needsUpdate = true;
  trailMesh.visible = liveCount > 0;

  // Prints are left by walking as well as sprinting - only the dust needs a sprint.
  printCount = updatePawPrints(dt, moving, x, y, z, headingX, headingZ);
}

/** DEV diagnostics, alongside the other vfx counters. */
export function runTrailPuffCount() {
  return liveCount;
}

export function pawPrintCount() {
  return printCount;
}
