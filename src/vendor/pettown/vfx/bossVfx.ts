import * as THREE from 'three';
import {
  flashVfxLight,
  vfxCamera,
  vfxConcurrencyBudget,
  vfxDetailCount,
  vfxLayerScale,
  vfxPeakScale,
  vfxSpawnDistance,
} from './skill/core.ts';

type BossVfx = { update: (dt: number) => boolean; dispose: () => void; presentation?: boolean };

let effectScene: THREE.Scene | null = null;
const activeEffects: BossVfx[] = [];
const warmedBossSkillIds = new Set<string>();
const retainedBossWarmMaterials: THREE.Material[] = [];
let bossVfxWarmupQueue: Promise<void> = Promise.resolve();
let bossVfxWarmupActive = false;
let failedBossVfxWarmups = 0;

// Geometries reused across many simultaneous, independently-animated instances (see cachedGeometry
// below) — never disposed per-instance, or the first of several concurrent effects to finish would
// destroy the buffer every other still-running one is still drawing from.
const sharedGeometries = new Set<THREE.BufferGeometry>();

function disposeObject(root: THREE.Object3D) {
  root.removeFromParent();
  root.traverse((object: any) => {
    if (object.geometry && !sharedGeometries.has(object.geometry)) object.geometry?.dispose?.();
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach((material: any) => material?.dispose?.());
  });
}

// Some casts land several projectiles within the same frame (e.g. the mummy's 5-bolt toxic
// bombardment), each spawning its own multi-mesh pool/impact effect. Building every geometry fresh
// per spawn — dozens of spheres/toruses/circles at once — is a real, measurable hitch right at the
// moment they land. The shapes here never vary by more than a couple of fixed radii, so they are
// safe and cheap to build once and hand every instance the same BufferGeometry.
const geometryCache = new Map<string, THREE.BufferGeometry>();
function cachedGeometry<T extends THREE.BufferGeometry>(key: string, factory: () => T): T {
  let geometry = geometryCache.get(key) as T | undefined;
  if (!geometry) { geometry = factory(); geometryCache.set(key, geometry); sharedGeometries.add(geometry); }
  return geometry;
}

// A toxic bombardment can land five pools in the same frame. Even a pre-allocated PointLight pool
// keeps eight point-light branches in every lit world shader and turns on five expensive lights at
// once. Poison now draws its glow with unlit additive materials instead: the same readable purple
// silhouette, but no whole-scene lighting work or first-cast shader stall.
// `pointer: coarse` answers "is this a phone", never "how fast is this machine" - the same gap the
// renderer's quality preset was added to close. It now defers to that preset first and only falls
// back to the touch test, so a desktop player who picked Low actually gets the reduced effect.
function useReducedToxicVfx() {
  if (typeof window === 'undefined') return false;
  if (vfxLayerScale < 1) return true;
  return window.matchMedia?.('(pointer: coarse)').matches || window.innerWidth <= 760;
}

function bossVfxTier() {
  if (vfxLayerScale >= 1) return 'high';
  return vfxLayerScale > 0 ? 'medium' : 'low';
}

function bossVfxSegments(low: number, medium: number, high: number) {
  return vfxLayerScale >= 1 ? high : vfxLayerScale > 0 ? medium : low;
}

function isBossVfxVisible(position: { x: number; y: number; z: number }, padding = 0) {
  if (!effectScene || !vfxCamera) return Boolean(effectScene);
  return Math.hypot(position.x - vfxCamera.position.x, position.z - vfxCamera.position.z) <= vfxSpawnDistance + Math.max(0, padding);
}

function flashBossVfxLight(color: string, position: { x: number; y: number; z: number }, duration: number, intensity: number) {
  if (bossVfxWarmupActive) return;
  flashVfxLight(color, position.x, position.y, position.z, duration, intensity * vfxPeakScale);
}

function track(effect: BossVfx, presentation = false) {
  if (presentation && !bossVfxWarmupActive) {
    // Keep the visual-only boss effects within the same runtime budget as player skills. Projectile
    // collision and mummy pools intentionally stay outside this cap because they own gameplay ticks.
    const presentationBudget = Math.max(2, Math.floor(vfxConcurrencyBudget * 0.5));
    let presentationCount = activeEffects.reduce((count, active) => count + (active.presentation ? 1 : 0), 0);
    while (presentationCount >= presentationBudget) {
      const oldestPresentation = activeEffects.findIndex((active) => active.presentation);
      if (oldestPresentation < 0) break;
      const [oldest] = activeEffects.splice(oldestPresentation, 1);
      try { oldest.dispose(); } catch (error) { console.warn('Boss presentation VFX disposal failed.', error); }
      presentationCount -= 1;
    }
  }
  effect.presentation = presentation;
  activeEffects.push(effect);
  return effect;
}

export function initBossVfx(scene: THREE.Scene) {
  effectScene = scene;
}

export function spawnSouthBossSlamImpact(position: { x: number; y: number; z: number }, radius: number) {
  if (!effectScene || !isBossVfxVisible(position, radius)) return;
  const root = new THREE.Group();
  root.position.set(position.x, position.y + 0.08, position.z);
  const tier = bossVfxTier();
  const ringSegments = bossVfxSegments(20, 32, 48);
  const ringCount = vfxDetailCount(3, 1);
  const ringColors = ['#fff0a8', '#ffc65c', '#9b5e32'];
  const rings = Array.from({ length: ringCount }, (_, index) => {
    const color = ringColors[index % ringColors.length];
    const ring = new THREE.Mesh(
      cachedGeometry(`southBossSlamRing:${tier}:${index}`, () => new THREE.RingGeometry(0.12 + index * 0.05, 0.18 + index * 0.05, ringSegments)),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.88 - index * 0.16, side: THREE.DoubleSide, depthWrite: false }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.scale.setScalar(radius * 0.35);
    ring.renderOrder = 13;
    root.add(ring);
    return ring;
  });
  const dustCount = vfxDetailCount(34, 0);
  const dust = Array.from({ length: dustCount }, (_, index) => {
    const angle = index / Math.max(1, dustCount) * Math.PI * 2 + (index % 3) * 0.13;
    const speed = radius * (0.65 + (index % 7) * 0.055);
    return {
      x: Math.cos(angle) * 0.45,
      y: 0.12,
      z: Math.sin(angle) * 0.45,
      size: 0.11 + (index % 4) * 0.035,
      vx: Math.cos(angle) * speed,
      vz: Math.sin(angle) * speed,
      vy: 2.2 + (index % 5) * 0.32,
      color: index % 3 === 0 ? '#ffd58a' : '#b67b4f',
    };
  });
  const dustState = dustCount > 0 ? (() => {
    const material = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.9, vertexColors: true, depthWrite: false });
    const cloud = new THREE.InstancedMesh(cachedGeometry(`southBossSlamDust:${tier}`, () => new THREE.IcosahedronGeometry(1, 0)), material, dustCount);
    const transform = new THREE.Object3D();
    const color = new THREE.Color();
    cloud.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    cloud.frustumCulled = false;
    dust.forEach((particle, index) => {
      transform.position.set(particle.x, particle.y, particle.z);
      transform.scale.setScalar(particle.size);
      transform.updateMatrix();
      cloud.setMatrixAt(index, transform.matrix);
      cloud.setColorAt(index, color.set(particle.color));
    });
    cloud.instanceMatrix.needsUpdate = true;
    if (cloud.instanceColor) cloud.instanceColor.needsUpdate = true;
    root.add(cloud);
    return { cloud, material, transform };
  })() : null;
  effectScene.add(root);
  flashBossVfxLight('#ffd16c', { x: position.x, y: position.y + 0.55, z: position.z }, 0.7, 5.2);
  let life = 0;
  track({
    update(dt) {
      life += dt;
      rings.forEach((ring, index) => {
        const progress = THREE.MathUtils.clamp(life / (0.62 + index * 0.14), 0, 1);
        ring.scale.setScalar(radius * (0.35 + progress * (3.5 - index * 0.35)));
        (ring.material as THREE.MeshBasicMaterial).opacity = (0.88 - index * 0.16) * (1 - progress);
      });
      if (dustState) {
        dust.forEach((particle, index) => {
          particle.x += particle.vx * dt;
          particle.z += particle.vz * dt;
          particle.y += particle.vy * dt;
          particle.vy -= 6.5 * dt;
          dustState.transform.position.set(particle.x, particle.y, particle.z);
          dustState.transform.scale.setScalar(particle.size * Math.max(0.4, 1 - life * 0.75));
          dustState.transform.updateMatrix();
          dustState.cloud.setMatrixAt(index, dustState.transform.matrix);
        });
        dustState.cloud.instanceMatrix.needsUpdate = true;
        dustState.material.opacity = Math.max(0, 0.9 - life * 0.72);
      }
      return life >= 1.25;
    },
    dispose: () => disposeObject(root),
  }, true);
}

export function spawnSouthBossTideTelegraph(
  origin: { x: number; y: number; z: number },
  destinations: { x: number; y: number; z: number }[],
  durationSeconds: number,
  hitRadius: number,
) {
  if (!effectScene) return;
  const originVisible = isBossVfxVisible(origin, hitRadius);
  const visibleDestinations = destinations.filter((destination) => originVisible || isBossVfxVisible(destination, hitRadius));
  if (!visibleDestinations.length) return;
  const root = new THREE.Group();
  const lanes: THREE.Mesh[] = [];
  const rings: THREE.Mesh[] = [];
  const tier = bossVfxTier();
  const ringSegments = bossVfxSegments(20, 30, 40);
  for (const destination of visibleDestinations) {
    const dx = destination.x - origin.x;
    const dz = destination.z - origin.z;
    const length = Math.max(0.1, Math.hypot(dx, dz));
    if (vfxLayerScale > 0) {
      const lane = new THREE.Mesh(
        cachedGeometry('southBossTideTelegraphLane', () => new THREE.PlaneGeometry(1, 1)),
        new THREE.MeshBasicMaterial({ color: '#42dbff', transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false }),
      );
      lane.rotation.x = -Math.PI / 2;
      lane.rotation.z = Math.atan2(dx, dz);
      lane.scale.set(hitRadius * 1.25, length, 1);
      lane.position.set((origin.x + destination.x) / 2, Math.max(origin.y, destination.y) + 0.055, (origin.z + destination.z) / 2);
      lane.renderOrder = 11;
      root.add(lane);
      lanes.push(lane);
    }
    const ring = new THREE.Mesh(
      cachedGeometry(`southBossTideTelegraphRing:${tier}`, () => new THREE.RingGeometry(0.72, 1, ringSegments)),
      new THREE.MeshBasicMaterial({ color: '#b8f5ff', transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.scale.setScalar(hitRadius);
    ring.position.set(destination.x, destination.y + 0.07, destination.z);
    ring.renderOrder = 12;
    root.add(ring);
    rings.push(ring);
  }
  effectScene.add(root);
  let elapsed = 0;
  track({
    update(dt) {
      elapsed += dt;
      const progress = THREE.MathUtils.clamp(elapsed / Math.max(0.05, durationSeconds), 0, 1);
      lanes.forEach((lane, index) => {
        (lane.material as THREE.MeshBasicMaterial).opacity = 0.14 + Math.sin(elapsed * 10 + index) * 0.055 + progress * 0.17;
      });
      rings.forEach((ring, index) => {
        ring.rotation.z += dt * (1.8 + index * 0.25);
        ring.scale.setScalar(hitRadius * (0.88 + Math.sin(elapsed * 9 + index) * 0.1 + progress * 0.1));
      });
      return progress >= 1;
    },
    dispose: () => disposeObject(root),
  }, true);
}

function spawnWaterSplash(position: THREE.Vector3, radius: number) {
  if (!effectScene || !isBossVfxVisible(position, radius)) return;
  const root = new THREE.Group();
  root.position.copy(position);
  const tier = bossVfxTier();
  const rippleCount = vfxDetailCount(3, 1);
  const rippleSegments = bossVfxSegments(20, 32, 48);
  const rippleColors = ['#efffff', '#8ceeff', '#2cc9ee'];
  const ripples = Array.from({ length: rippleCount }, (_, index) => {
    const color = rippleColors[index % rippleColors.length];
    const ring = new THREE.Mesh(
      cachedGeometry(`southBossWaterSplashRipple:${tier}:${index}`, () => new THREE.RingGeometry(0.12 + index * 0.1, 0.2 + index * 0.1, rippleSegments)),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 - index * 0.16, side: THREE.DoubleSide, depthWrite: false }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.scale.setScalar(radius * 0.35);
    root.add(ring);
    return ring;
  });
  const foamRadius = Math.max(0.12, radius * 0.24);
  const foam = new THREE.Mesh(
    cachedGeometry(`southBossWaterSplashFoam:${tier}`, () => new THREE.TorusGeometry(1, 0.19, bossVfxSegments(6, 8, 8), bossVfxSegments(20, 32, 40))),
    new THREE.MeshBasicMaterial({ color: '#f3ffff', transparent: true, opacity: 0.82, side: THREE.DoubleSide, depthWrite: false }),
  );
  foam.rotation.x = Math.PI / 2;
  foam.scale.setScalar(foamRadius * 0.72);
  root.add(foam);
  const centerRadius = Math.max(0.14, radius * 0.22);
  const center = new THREE.Mesh(
    cachedGeometry(`southBossWaterSplashCenter:${tier}`, () => new THREE.SphereGeometry(1, bossVfxSegments(8, 12, 16), bossVfxSegments(6, 8, 10))),
    new THREE.MeshBasicMaterial({ color: '#45d9f4', transparent: true, opacity: 0.68, depthWrite: false }),
  );
  center.position.y = 0.12;
  center.scale.set(centerRadius * 1.5, centerRadius * 0.28, centerRadius * 1.5);
  root.add(center);
  const dropCount = vfxDetailCount(28, 4);
  const drops = Array.from({ length: dropCount }, (_, index) => {
    const angle = index / Math.max(1, dropCount) * Math.PI * 2 + (index % 4) * 0.08;
    const distance = radius * (0.16 + (index % 5) * 0.035);
    const speed = 1.6 + index % 5 * 0.38;
    return {
      x: Math.cos(angle) * distance,
      y: 0.14 + (index % 4) * 0.05,
      z: Math.sin(angle) * distance,
      size: 0.045 + (index % 4) * 0.018,
      vx: Math.cos(angle) * speed,
      vz: Math.sin(angle) * speed,
      vy: 1.65 + index % 6 * 0.22,
      color: index % 3 ? '#8eeeff' : '#f1ffff',
    };
  });
  const dropState = (() => {
    const material = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.9, vertexColors: true, depthWrite: false });
    const cloud = new THREE.InstancedMesh(cachedGeometry(`southBossWaterSplashDrop:${tier}`, () => new THREE.SphereGeometry(1, bossVfxSegments(5, 6, 8), bossVfxSegments(4, 5, 6))), material, dropCount);
    const transform = new THREE.Object3D();
    const color = new THREE.Color();
    cloud.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    cloud.frustumCulled = false;
    drops.forEach((drop, index) => {
      transform.position.set(drop.x, drop.y, drop.z);
      transform.scale.setScalar(drop.size);
      transform.updateMatrix();
      cloud.setMatrixAt(index, transform.matrix);
      cloud.setColorAt(index, color.set(drop.color));
    });
    cloud.instanceMatrix.needsUpdate = true;
    if (cloud.instanceColor) cloud.instanceColor.needsUpdate = true;
    root.add(cloud);
    return { cloud, material, transform };
  })();
  effectScene.add(root);
  flashBossVfxLight('#55e9ff', { x: position.x, y: position.y + 0.8, z: position.z }, 0.9, 3.8);
  let life = 0;
  track({
    update(dt) {
      life += dt;
      ripples.forEach((ring, index) => {
        const progress = THREE.MathUtils.clamp((life - index * 0.045) / (0.72 + index * 0.12), 0, 1);
        ring.scale.setScalar(radius * (0.35 + progress * (3.4 - index * 0.28)));
        (ring.material as THREE.MeshBasicMaterial).opacity = (0.9 - index * 0.16) * (1 - progress);
      });
      foam.rotation.z += dt * 4.5;
      foam.scale.setScalar(foamRadius * (0.72 + Math.sin(life * 18) * 0.08 + life * 1.3));
      center.scale.set(centerRadius * (1.5 + life * 1.8), centerRadius * Math.max(0.05, 0.28 - life * 0.2), centerRadius * (1.5 + life * 1.8));
      drops.forEach((drop) => {
        drop.x += drop.vx * dt;
        drop.z += drop.vz * dt;
        drop.y += drop.vy * dt;
        drop.vy -= 5.8 * dt;
      });
      drops.forEach((drop, index) => {
        dropState.transform.position.set(drop.x, drop.y, drop.z);
        dropState.transform.scale.setScalar(drop.size);
        dropState.transform.updateMatrix();
        dropState.cloud.setMatrixAt(index, dropState.transform.matrix);
      });
      dropState.cloud.instanceMatrix.needsUpdate = true;
      dropState.material.opacity = Math.max(0, 0.9 - life * 1.15);
      return life >= 1.15;
    },
    dispose: () => disposeObject(root),
  }, true);
}

export function spawnSouthBossTideProjectile(
  origin: { x: number; y: number; z: number },
  destination: { x: number; y: number; z: number },
  speed: number,
  hitRadius: number,
  onImpact: () => void,
  onTravel?: (position: THREE.Vector3, previousPosition: THREE.Vector3) => void,
) {
  if (!effectScene) return;
  const start = new THREE.Vector3(origin.x, origin.y + 2.25, origin.z);
  const end = new THREE.Vector3(destination.x, destination.y + 0.5, destination.z);
  const distance = Math.max(0.1, start.distanceTo(end));
  const duration = Math.max(0.32, distance / Math.max(1, speed));
  const position = start.clone();
  const previousPosition = start.clone();
  let updateVisual: ((dt: number, elapsed: number, progress: number, projectilePosition: THREE.Vector3) => void) | null = null;
  let disposeVisual = () => {};

  // The path is still tracked when it is off screen because it drives hit detection. Only the
  // presentation is culled; this keeps a remote teammate's projectile authoritative and cheap.
  if (isBossVfxVisible(origin, hitRadius) || isBossVfxVisible(destination, hitRadius)) {
    const tier = bossVfxTier();
    const root = new THREE.Group();
    const waterMaterial = new THREE.MeshBasicMaterial({ color: '#2ca9df', transparent: true, opacity: 0.78, depthWrite: false });
    const deepWaterMaterial = new THREE.MeshBasicMaterial({ color: '#1268b0', transparent: true, opacity: 0.62, depthWrite: false });
    const foamMaterial = new THREE.MeshBasicMaterial({ color: '#eaffff', transparent: true, opacity: 0.92, side: THREE.DoubleSide, depthWrite: false });
    const core = new THREE.Mesh(
      cachedGeometry(`southBossTideCore:${tier}`, () => new THREE.SphereGeometry(0.58, bossVfxSegments(10, 16, 22), bossVfxSegments(7, 10, 14))),
      waterMaterial,
    );
    core.scale.set(1.08, 0.82, 1.48);
    const inner = new THREE.Mesh(
      cachedGeometry(`southBossTideInner:${tier}`, () => new THREE.SphereGeometry(0.42, bossVfxSegments(8, 12, 16), bossVfxSegments(6, 8, 10))),
      deepWaterMaterial,
    );
    inner.scale.set(1.12, 0.75, 1.35);
    inner.position.z = 0.2;
    const waveFan = new THREE.Mesh(
      cachedGeometry(`southBossTideFan:${tier}`, () => new THREE.ConeGeometry(0.78, 1.5, bossVfxSegments(10, 16, 24), 1, true)),
      waterMaterial,
    );
    waveFan.rotation.x = Math.PI / 2;
    waveFan.position.z = 0.32;
    waveFan.scale.set(1, 1, 0.72);
    const crest = new THREE.Mesh(
      cachedGeometry(`southBossTideCrest:${tier}`, () => new THREE.TorusGeometry(0.7, 0.105, bossVfxSegments(6, 8, 10), bossVfxSegments(20, 24, 30), Math.PI * 1.38)),
      foamMaterial,
    );
    crest.position.z = 0.58;
    const crestHighlight = new THREE.Mesh(
      cachedGeometry(`southBossTideCrestHighlight:${tier}`, () => new THREE.TorusGeometry(0.48, 0.045, bossVfxSegments(5, 6, 7), bossVfxSegments(16, 20, 24), Math.PI * 1.2)),
      new THREE.MeshBasicMaterial({ color: '#9df5ff', transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false }),
    );
    crestHighlight.position.z = 0.64;
    const wakeRings = [0, 1].map((index) => {
      const ring = new THREE.Mesh(
        cachedGeometry(`southBossTideWake:${tier}:${index}`, () => new THREE.RingGeometry(0.28 + index * 0.12, 0.38 + index * 0.12, bossVfxSegments(16, 22, 28))),
        new THREE.MeshBasicMaterial({ color: index ? '#3fd3ed' : '#b8f7ff', transparent: true, opacity: index ? 0.3 : 0.52, side: THREE.DoubleSide, depthWrite: false }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.z = -0.65 - index * 0.32;
      root.add(ring);
      return ring;
    });
    const sprayCount = vfxDetailCount(18, 0);
    const spray = Array.from({ length: sprayCount }, (_, index) => {
      const angle = index / Math.max(1, sprayCount) * Math.PI * 2 + (index % 3) * 0.16;
      return {
        x: Math.cos(angle) * (0.34 + index % 3 * 0.06),
        y: 0.18 + index % 4 * 0.08,
        z: -0.16 - (index % 4) * 0.12,
        size: 0.045 + (index % 4) * 0.018,
        vx: Math.cos(angle) * (0.28 + index % 4 * 0.11),
        vy: 0.25 + index % 5 * 0.08,
        vz: -0.5 - index % 4 * 0.12,
        color: index % 3 ? '#6ee7fb' : '#efffff',
      };
    });
    const sprayState = sprayCount > 0 ? (() => {
      const material = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.72, vertexColors: true, depthWrite: false });
      const cloud = new THREE.InstancedMesh(cachedGeometry(`southBossTideSpray:${tier}`, () => new THREE.SphereGeometry(1, bossVfxSegments(5, 6, 7), bossVfxSegments(4, 4, 5))), material, sprayCount);
      const transform = new THREE.Object3D();
      const color = new THREE.Color();
      cloud.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      cloud.frustumCulled = false;
      spray.forEach((drop, index) => {
        transform.position.set(drop.x, drop.y, drop.z);
        transform.scale.setScalar(drop.size);
        transform.updateMatrix();
        cloud.setMatrixAt(index, transform.matrix);
        cloud.setColorAt(index, color.set(drop.color));
      });
      cloud.instanceMatrix.needsUpdate = true;
      if (cloud.instanceColor) cloud.instanceColor.needsUpdate = true;
      root.add(cloud);
      return { cloud, material, transform };
    })() : null;
    root.add(core, inner, waveFan, crest, crestHighlight);
    root.position.copy(start);
    root.lookAt(end);
    effectScene.add(root);
    flashBossVfxLight('#58dcff', { x: start.x, y: start.y + 0.35, z: start.z }, 0.25, 3.0);
    updateVisual = (dt, visualElapsed, progress, projectilePosition) => {
      root.position.copy(projectilePosition);
      core.scale.x = 1.08 + Math.sin(visualElapsed * 16) * 0.1;
      core.scale.y = 0.82 + Math.sin(visualElapsed * 13 + 0.8) * 0.06;
      inner.rotation.y += dt * 2.8;
      waveFan.scale.x = 1 + Math.sin(visualElapsed * 14) * 0.08;
      waveFan.scale.z = 0.72 + Math.sin(visualElapsed * 11 + 0.4) * 0.07;
      crest.rotation.z += dt * 5.5;
      crestHighlight.rotation.z -= dt * 7;
      wakeRings.forEach((ring, index) => {
        ring.rotation.z += dt * (2.4 + index * 0.8);
        ring.scale.setScalar(0.88 + Math.sin(visualElapsed * 12 + index) * 0.1);
        (ring.material as THREE.MeshBasicMaterial).opacity = (index ? 0.3 : 0.52) * (1 - progress * 0.7);
      });
      if (sprayState) {
        spray.forEach((drop, index) => {
          drop.x += drop.vx * dt;
          drop.y += drop.vy * dt;
          drop.z += drop.vz * dt;
          drop.vy -= 0.9 * dt;
          sprayState.transform.position.set(drop.x, drop.y, drop.z);
          sprayState.transform.scale.setScalar(drop.size);
          sprayState.transform.updateMatrix();
          sprayState.cloud.setMatrixAt(index, sprayState.transform.matrix);
        });
        sprayState.cloud.instanceMatrix.needsUpdate = true;
        sprayState.material.opacity = Math.max(0, 0.72 - progress * 0.5);
      }
    };
    disposeVisual = () => disposeObject(root);
  }

  let elapsed = 0;
  let impacted = false;
  track({
    update(dt) {
      elapsed += dt;
      const progress = THREE.MathUtils.clamp(elapsed / duration, 0, 1);
      previousPosition.copy(position);
      position.lerpVectors(start, end, progress);
      position.y += Math.sin(progress * Math.PI) * 0.7;
      onTravel?.(position, previousPosition);
      updateVisual?.(dt, elapsed, progress, position);
      if (progress >= 1 && !impacted) {
        impacted = true;
        spawnWaterSplash(new THREE.Vector3(end.x, destination.y + 0.03, end.z), hitRadius);
        onImpact();
      }
      return progress >= 1;
    },
    dispose: disposeVisual,
  });
}

export function spawnSouthBossHeal(anchor: THREE.Object3D) {
  if (!effectScene) return;
  const anchorPosition = anchor.getWorldPosition(new THREE.Vector3());
  if (!isBossVfxVisible(anchorPosition, 2)) return;
  const root = new THREE.Group();
  root.position.set(anchorPosition.x, anchorPosition.y + 2.8, anchorPosition.z);
  const tier = bossVfxTier();
  const bottle = new THREE.Group();
  const glassMaterial = new THREE.MeshBasicMaterial({ color: '#ff6fb1', transparent: true, opacity: 0.88, depthWrite: false });
  const glass = new THREE.Mesh(
    cachedGeometry(`southBossHealGlass:${tier}`, () => new THREE.SphereGeometry(0.34, bossVfxSegments(8, 12, 14), bossVfxSegments(6, 8, 10))),
    glassMaterial,
  );
  glass.scale.y = 1.18;
  const neck = new THREE.Mesh(cachedGeometry(`southBossHealNeck:${tier}`, () => new THREE.CylinderGeometry(0.11, 0.15, 0.3, bossVfxSegments(6, 8, 10))), glassMaterial);
  neck.position.y = 0.4;
  const cork = new THREE.Mesh(
    cachedGeometry(`southBossHealCork:${tier}`, () => new THREE.CylinderGeometry(0.1, 0.1, 0.13, bossVfxSegments(6, 8, 10))),
    new THREE.MeshBasicMaterial({ color: '#f4d276', depthWrite: false }),
  );
  cork.position.y = 0.61;
  bottle.add(glass, neck, cork);
  root.add(bottle);
  const ringCount = vfxDetailCount(3, 1);
  const rings = Array.from({ length: ringCount }, (_, index) => {
    const ring = new THREE.Mesh(
      cachedGeometry(`southBossHealRing:${tier}:${index}`, () => new THREE.TorusGeometry(0.9 + index * 0.32, 0.045, bossVfxSegments(6, 8, 8), bossVfxSegments(20, 28, 32))),
      new THREE.MeshBasicMaterial({ color: index % 2 ? '#a8ffcb' : '#ff96c8', transparent: true, opacity: 0.75, depthWrite: false }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = index * 0.4;
    root.add(ring);
    return ring;
  });
  effectScene.add(root);
  flashBossVfxLight('#ff73b6', { x: anchorPosition.x, y: anchorPosition.y + 4.2, z: anchorPosition.z }, 0.7, 4.5);
  let elapsed = 0;
  track({
    update(dt) {
      elapsed += dt;
      anchor.getWorldPosition(anchorPosition);
      root.position.set(anchorPosition.x, anchorPosition.y + 2.8, anchorPosition.z);
      bottle.position.y = Math.sin(Math.min(1, elapsed / 0.65) * Math.PI) * 0.8;
      bottle.rotation.z = -Math.min(1, elapsed / 0.65) * 1.05;
      bottle.visible = elapsed < 0.82;
      rings.forEach((ring, index) => {
        ring.rotation.z += dt * (2 + index * 0.5);
        ring.position.y += dt * 0.85;
        (ring.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.75 - elapsed * 0.42);
      });
      return elapsed >= 1.8;
    },
    dispose: () => disposeObject(root),
  }, true);
}

/** Stationary priest cast: an unmistakable green healing channel from the servant to its boss. */
export function spawnMummyPriestHeal(source: THREE.Object3D, target: THREE.Object3D, durationSeconds = 1.2) {
  if (!effectScene) return;
  const root = new THREE.Group();
  const beamMaterial = new THREE.MeshBasicMaterial({ color: '#53ff9d', transparent: true, opacity: 0.62, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const coreMaterial = new THREE.MeshBasicMaterial({ color: '#d9ffe8', transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.17, 1, 14, 1, true), beamMaterial);
  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.065, 1, 9, 1, true), coreMaterial);
  beam.renderOrder = 16; core.renderOrder = 17;
  const sourceRing = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.045, 8, 30), new THREE.MeshBasicMaterial({ color: '#5dffad', transparent: true, opacity: 0.82, blending: THREE.AdditiveBlending, depthWrite: false }));
  const targetRing = new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.055, 8, 34), new THREE.MeshBasicMaterial({ color: '#b8ffd2', transparent: true, opacity: 0.78, blending: THREE.AdditiveBlending, depthWrite: false }));
  sourceRing.rotation.x = targetRing.rotation.x = Math.PI / 2;
  sourceRing.renderOrder = targetRing.renderOrder = 15;
  const light = new THREE.PointLight('#56ff9c', 3.2, 8, 2);
  root.add(beam, core, sourceRing, targetRing, light);
  effectScene.add(root);
  const axis = new THREE.Vector3(0, 1, 0), sourceGround = new THREE.Vector3(), targetGround = new THREE.Vector3(), from = new THREE.Vector3(), to = new THREE.Vector3(), direction = new THREE.Vector3(), midpoint = new THREE.Vector3();
  let elapsed = 0;
  const updateBeam = () => {
    source.getWorldPosition(sourceGround); target.getWorldPosition(targetGround);
    from.copy(sourceGround); from.y += 1.05;
    to.copy(targetGround); to.y += 2.65;
    direction.subVectors(to, from);
    const length = Math.max(0.1, direction.length());
    midpoint.copy(from).add(to).multiplyScalar(0.5);
    beam.position.copy(midpoint); core.position.copy(midpoint);
    beam.scale.set(1, length, 1); core.scale.set(1, length, 1);
    direction.normalize(); beam.quaternion.setFromUnitVectors(axis, direction); core.quaternion.copy(beam.quaternion);
    sourceRing.position.copy(sourceGround); sourceRing.position.y += 0.06;
    targetRing.position.copy(targetGround); targetRing.position.y += 0.08;
  };
  track({
    update(dt) {
      elapsed += dt; updateBeam();
      const progress = THREE.MathUtils.clamp(elapsed / Math.max(0.4, durationSeconds), 0, 1), fade = progress > 0.78 ? (1 - progress) / 0.22 : 1, pulse = 0.82 + Math.sin(elapsed * 12) * 0.16;
      beamMaterial.opacity = pulse * 0.62 * fade; coreMaterial.opacity = pulse * 0.9 * fade;
      sourceRing.rotation.z += dt * 2.8; targetRing.rotation.z -= dt * 2.1;
      sourceRing.scale.setScalar(0.9 + Math.sin(elapsed * 8) * 0.12); targetRing.scale.setScalar(0.94 + Math.sin(elapsed * 9 + 0.6) * 0.1);
      (sourceRing.material as THREE.MeshBasicMaterial).opacity = 0.82 * fade; (targetRing.material as THREE.MeshBasicMaterial).opacity = 0.78 * fade;
      light.intensity = (2.6 + Math.sin(elapsed * 10) * 0.5) * fade;
      return progress >= 1;
    },
    dispose: () => disposeObject(root),
  });
}

export function spawnMummyToxicBombTelegraph(
  destinations: { x: number; y: number; z: number }[], durationSeconds: number, hitRadius: number,
) {
  if (!effectScene) return;
  const root = new THREE.Group();
  const rings = destinations.map((destination) => {
    const ring = new THREE.Mesh(
      cachedGeometry(`toxicBombTelegraph${hitRadius}`, () => new THREE.RingGeometry(hitRadius * 0.58, hitRadius, 32)),
      new THREE.MeshBasicMaterial({ color: '#c451f4', transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(destination.x, destination.y + 0.07, destination.z);
    root.add(ring);
    return ring;
  });
  effectScene.add(root);
  let elapsed = 0;
  track({
    update(dt) {
      elapsed += dt;
      const progress = THREE.MathUtils.clamp(elapsed / Math.max(0.05, durationSeconds), 0, 1);
      rings.forEach((ring, index) => {
        ring.rotation.z += dt * (1.8 + index * 0.22);
        ring.scale.setScalar(0.84 + Math.sin(elapsed * 9 + index) * 0.1 + progress * 0.18);
        (ring.material as THREE.MeshBasicMaterial).opacity = 0.38 + (1 - progress) * 0.42;
      });
      return progress >= 1;
    },
    dispose: () => disposeObject(root),
  });
}

export function spawnMummyToxicBomb(
  origin: { x: number; y: number; z: number }, destination: { x: number; y: number; z: number }, speed: number, hitRadius: number,
  toxicPoolRadius: number, onImpact: () => void, onTravel?: (position: THREE.Vector3, previousPosition: THREE.Vector3) => void, onPoolTick?: () => void,
) {
  if (!effectScene) return;
  const reducedDetail = useReducedToxicVfx();
  const fumeCount = reducedDetail ? 6 : 10;
  const start = new THREE.Vector3(origin.x, origin.y + 2.15, origin.z);
  const end = new THREE.Vector3(destination.x, destination.y + 0.12, destination.z);
  const distance = start.distanceTo(end);
  const apex = start.clone().lerp(end, 0.5);
  apex.y = Math.max(start.y, end.y) + Math.max(4.8, Math.min(8.4, distance * 0.28));
  const arc = new THREE.QuadraticBezierCurve3(start, apex, end);
  const root = new THREE.Group();
  const core = new THREE.Mesh(cachedGeometry('toxicBombCore', () => new THREE.SphereGeometry(0.54, 14, 8)), new THREE.MeshBasicMaterial({ color: '#a132d7', transparent: true, opacity: 0.86, blending: THREE.AdditiveBlending, depthWrite: false }));
  const inner = new THREE.Mesh(cachedGeometry('toxicBombInner', () => new THREE.SphereGeometry(0.32, 10, 7)), new THREE.MeshBasicMaterial({ color: '#f2a8ff', transparent: true, opacity: 0.72, blending: THREE.AdditiveBlending, depthWrite: false }));
  const shell = new THREE.Mesh(cachedGeometry('toxicBombShell', () => new THREE.IcosahedronGeometry(0.8, 1)), new THREE.MeshBasicMaterial({ color: '#df78ff', transparent: true, opacity: 0.42, wireframe: true, depthWrite: false }));
  const runes = [0, 1, 2].map((index) => {
    const ring = new THREE.Mesh(cachedGeometry(`toxicBombRune${index}`, () => new THREE.TorusGeometry(0.55 + index * 0.1, 0.025, 6, 16)), new THREE.MeshBasicMaterial({ color: index === 1 ? '#ffb8fa' : '#bd41ef', transparent: true, opacity: 0.58, blending: THREE.AdditiveBlending, depthWrite: false }));
    ring.rotation.x = Math.PI / 2 + index * 0.48; root.add(ring); return ring;
  });
  const fumeMaterial = new THREE.MeshBasicMaterial({ color: '#df78ff', transparent: true, opacity: 0.66, blending: THREE.AdditiveBlending, depthWrite: false });
  const fumeCloud = new THREE.InstancedMesh(cachedGeometry('toxicBombFume', () => new THREE.SphereGeometry(1, 6, 4)), fumeMaterial, fumeCount);
  fumeCloud.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  fumeCloud.frustumCulled = false;
  const fumes = Array.from({ length: fumeCount }, (_, index) => ({
    angle: index / fumeCount * Math.PI * 2,
    radius: 0.38 + index % 4 * 0.06,
    size: 0.065 + index % 3 * 0.025,
  }));
  const fumeTransform = new THREE.Object3D();
  const updateFumes = (elapsed: number) => {
    fumes.forEach((fume, index) => {
      const angle = fume.angle + elapsed * (1.7 + index % 3 * 0.2);
      fumeTransform.position.set(Math.cos(angle) * fume.radius, Math.sin(elapsed * 4 + index) * 0.3, Math.sin(angle) * fume.radius);
      fumeTransform.scale.setScalar(fume.size * (0.92 + Math.sin(elapsed * 8 + index) * 0.14));
      fumeTransform.updateMatrix();
      fumeCloud.setMatrixAt(index, fumeTransform.matrix);
    });
    fumeCloud.instanceMatrix.needsUpdate = true;
    fumeMaterial.opacity = 0.48 + Math.sin(elapsed * 8) * 0.14;
  };
  updateFumes(0);
  root.add(core, inner, shell, fumeCloud); root.position.copy(start); effectScene.add(root);
  const duration = Math.max(0.58, distance / Math.max(1, speed) * 1.28);
  const previousPosition = start.clone();
  const arcPoint = new THREE.Vector3();
  let elapsed = 0, impacted = false;
  track({
    update(dt) {
      elapsed += dt;
      const progress = THREE.MathUtils.clamp(elapsed / duration, 0, 1);
      previousPosition.copy(root.position);
      arc.getPoint(progress, arcPoint);
      root.position.copy(arcPoint);
      core.scale.setScalar(0.92 + Math.sin(elapsed * 15) * 0.1); inner.scale.setScalar(0.86 + Math.sin(elapsed * 20 + 1) * 0.16); shell.rotation.set(elapsed * 3, elapsed * 4, elapsed * 2);
      runes.forEach((ring, index) => { ring.rotation.z += dt * (3.4 + index); ring.scale.setScalar(0.94 + Math.sin(elapsed * 9 + index) * 0.1); });
      updateFumes(elapsed);
      onTravel?.(root.position, previousPosition);
      if (progress >= 1 && !impacted) {
        impacted = true; onImpact(); spawnMummyToxicPool(end, toxicPoolRadius, onPoolTick);
      }
      return progress >= 1;
    },
    dispose: () => disposeObject(root),
  });
}

function spawnMummyToxicPool(position: THREE.Vector3, radius: number, onTick?: () => void) {
  if (!effectScene) return;
  const reducedDetail = useReducedToxicVfx();
  const bubbleCount = reducedDetail ? 8 : 12;
  const root = new THREE.Group(); root.position.copy(position);
  const pool = new THREE.Mesh(cachedGeometry(`toxicPoolOuter${radius}:${reducedDetail ? 'low' : 'full'}`, () => new THREE.CircleGeometry(radius, reducedDetail ? 24 : 32)), new THREE.MeshBasicMaterial({ color: '#5e0e86', transparent: true, opacity: 0.34, side: THREE.DoubleSide, depthWrite: false }));
  pool.rotation.x = -Math.PI / 2;
  const innerPool = new THREE.Mesh(cachedGeometry(`toxicPoolInner${radius}:${reducedDetail ? 'low' : 'full'}`, () => new THREE.CircleGeometry(radius * 0.67, reducedDetail ? 20 : 28)), new THREE.MeshBasicMaterial({ color: '#ca49f3', transparent: true, opacity: 0.36, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false }));
  innerPool.rotation.x = -Math.PI / 2; innerPool.position.y = 0.012;
  const rings = (reducedDetail ? [0.55, 0.9] : [0.42, 0.7, 0.94]).map((scale, index) => {
    const ring = new THREE.Mesh(cachedGeometry(`toxicPoolRing${radius}:${reducedDetail ? 'low' : 'full'}:${index}`, () => new THREE.TorusGeometry(radius * scale, 0.032 + index * 0.008, 6, reducedDetail ? 24 : 32)), new THREE.MeshBasicMaterial({ color: index === 1 ? '#f19dff' : '#a32bd5', transparent: true, opacity: 0.76 - index * 0.12, blending: THREE.AdditiveBlending, depthWrite: false }));
    ring.rotation.x = Math.PI / 2; ring.position.y = 0.035 + index * 0.012; root.add(ring); return ring;
  });
  const bubbleMaterial = new THREE.MeshBasicMaterial({ color: '#e17bff', transparent: true, opacity: 0.66, blending: THREE.AdditiveBlending, depthWrite: false });
  const bubbleCloud = new THREE.InstancedMesh(cachedGeometry('toxicPoolBubble', () => new THREE.SphereGeometry(1, 6, 4)), bubbleMaterial, bubbleCount);
  bubbleCloud.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  bubbleCloud.frustumCulled = false;
  const bubbles = Array.from({ length: bubbleCount }, (_, index) => ({
    angle: index / bubbleCount * Math.PI * 2 + (index % 3) * 0.15,
    offset: index / bubbleCount,
    radius: radius * (0.18 + index % 5 * 0.12),
    size: 0.06 + index % 4 * 0.025,
  }));
  const bubbleTransform = new THREE.Object3D();
  const updateBubbles = (elapsed: number, alpha: number) => {
    bubbles.forEach((bubble, index) => {
      const cycle = (elapsed * 0.34 + bubble.offset) % 1;
      const angle = bubble.angle + elapsed * (index % 2 ? -0.65 : 0.65);
      bubbleTransform.position.set(Math.cos(angle) * bubble.radius * (0.75 + cycle * 0.35), 0.1 + cycle * 0.85, Math.sin(angle) * bubble.radius * (0.75 + cycle * 0.35));
      bubbleTransform.scale.setScalar(bubble.size * (0.55 + (1 - cycle) * 0.7) * alpha);
      bubbleTransform.updateMatrix();
      bubbleCloud.setMatrixAt(index, bubbleTransform.matrix);
    });
    bubbleCloud.instanceMatrix.needsUpdate = true;
    bubbleMaterial.opacity = alpha * 0.72;
  };
  updateBubbles(0, 0);
  root.add(pool, innerPool, bubbleCloud); effectScene.add(root);
  let elapsed = 0, nextTickAt = 0;
  track({
    update(dt) {
      elapsed += dt;
      // The pool is gameplay-active, not only a visual decal. Tick immediately when it appears,
      // then once per second so a player who walks into it later receives the same hit and poison.
      while (onTick && elapsed >= nextTickAt && nextTickAt <= 5) { onTick(); nextTickAt += 1; }
      const fadeIn = THREE.MathUtils.clamp(elapsed / 0.35, 0, 1), fadeOut = THREE.MathUtils.clamp((5 - elapsed) / 0.8, 0, 1), alpha = fadeIn * fadeOut;
      (pool.material as THREE.MeshBasicMaterial).opacity = alpha * (0.27 + Math.sin(elapsed * 4) * 0.05);
      (innerPool.material as THREE.MeshBasicMaterial).opacity = alpha * (0.28 + Math.sin(elapsed * 5 + 1) * 0.09);
      innerPool.scale.setScalar(0.95 + Math.sin(elapsed * 3) * 0.05);
      rings.forEach((ring, index) => { ring.rotation.z += dt * (index % 2 ? -1.8 : 1.35); ring.scale.setScalar(0.96 + Math.sin(elapsed * (3 + index) + index) * 0.07); (ring.material as THREE.MeshBasicMaterial).opacity = alpha * (0.72 - index * 0.12); });
      updateBubbles(elapsed, alpha);
      return elapsed >= 5;
    },
    dispose: () => disposeObject(root),
  });
}

export type MummyBandageSnare = { setHits: (hits: number, maxHits: number) => void; end: (reason: 'broken' | 'bite' | 'cancel') => void };

let mummyBandageFabricTexture: THREE.CanvasTexture | null = null;
function getMummyBandageFabricTexture() {
  if (mummyBandageFabricTexture) return mummyBandageFabricTexture;
  const fabricCanvas = document.createElement('canvas'); fabricCanvas.width = 96; fabricCanvas.height = 256;
  const fabricContext = fabricCanvas.getContext('2d');
  if (fabricContext) {
    fabricContext.fillStyle = '#d7c18d'; fabricContext.fillRect(0, 0, fabricCanvas.width, fabricCanvas.height);
    for (let row = 0; row < 62; row += 1) {
      const y = row * 4 + (row % 3); fabricContext.fillStyle = row % 5 === 0 ? 'rgba(77,54,29,.34)' : 'rgba(255,241,194,.22)';
      fabricContext.fillRect(5 + (row % 4), y, 82 - (row % 5) * 4, 1 + row % 2);
    }
    for (let edge = 0; edge < 20; edge += 1) fabricContext.clearRect(edge % 2 ? 0 : 90, edge * 13 + (edge % 3) * 2, 4 + edge % 4, 5 + edge % 6);
  }
  mummyBandageFabricTexture = new THREE.CanvasTexture(fabricCanvas);
  mummyBandageFabricTexture.wrapS = mummyBandageFabricTexture.wrapT = THREE.RepeatWrapping;
  return mummyBandageFabricTexture;
}

/** A live, server-timed mummy bandage: travelling strip, wrapped captive and tearable 10-layer bar. */
export function spawnMummyBandageSnare(
  sourcePosition: () => { x: number; y: number; z: number },
  targetPosition: () => { x: number; y: number; z: number } | null,
  options: { travelMs: number; startedAt: number; hits: number; maxHits: number },
): MummyBandageSnare | null {
  if (!effectScene) return null;
  const root = new THREE.Group();
  // A gauze texture makes the spell read as old linen rather than seven glowing rigid rods.
  // The darker broken fibres and uneven edges remain legible even at the game's distant camera.
  const fabricTexture = getMummyBandageFabricTexture();
  const strips = Array.from({ length: 24 }, (_, index) => {
    const material = new THREE.MeshBasicMaterial({ map: fabricTexture, color: index % 3 === 0 ? '#b99a60' : '#f1dfac', transparent: true, opacity: .92, side: THREE.DoubleSide, depthWrite: false, alphaTest: .08 });
    const strip = new THREE.Mesh(cachedGeometry('mummyBindFabricStrip', () => new THREE.PlaneGeometry(.52, 1, 1, 1)), material);
    strip.userData.ribbon = Math.floor(index / 6); strip.userData.segment = index % 6; root.add(strip); return strip;
  });
  const frays = Array.from({ length: 14 }, (_, index) => {
    const material = new THREE.MeshBasicMaterial({ map: fabricTexture, color: index % 2 ? '#9f7b45' : '#ead39b', transparent: true, opacity: .82, side: THREE.DoubleSide, depthWrite: false, alphaTest: .08 });
    const fray = new THREE.Mesh(cachedGeometry(`mummyBindFray:${index % 3}`, () => new THREE.PlaneGeometry(.08 + index % 3 * .04, .46 + index % 4 * .1)), material);
    root.add(fray); return { fray, angle: index / 14 * Math.PI * 2, phase: index * .71 };
  });
  const coils = [0, 1, 2].map((index) => {
    const coil = new THREE.Mesh(cachedGeometry(`mummyBindCoil:${index}`, () => new THREE.TorusGeometry(0.62 + index * 0.11, 0.055, 7, 22)), new THREE.MeshBasicMaterial({ color: index === 1 ? '#ffe7ae' : '#b98d53', transparent: true, opacity: 0.86, depthWrite: false }));
    coil.rotation.x = Math.PI / 2; root.add(coil); return coil;
  });
  const knot = new THREE.Mesh(cachedGeometry('mummyBindKnot', () => new THREE.IcosahedronGeometry(0.22, 1)), new THREE.MeshBasicMaterial({ color: '#f5dfaa', transparent: true, opacity: 0.9, depthWrite: false }));
  const burst = Array.from({ length: 12 }, (_, index) => {
    const shard = new THREE.Mesh(cachedGeometry(`mummyBindShard:${index % 3}`, () => new THREE.BoxGeometry(0.08 + index % 3 * 0.03, 0.2, 0.07)), new THREE.MeshBasicMaterial({ color: '#f6dc9e', transparent: true, opacity: 0, depthWrite: false }));
    root.add(shard); return { shard, angle: index / 12 * Math.PI * 2, lift: .25 + index % 4 * .12 };
  });
  const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 70;
  const texture = new THREE.CanvasTexture(canvas); texture.minFilter = THREE.LinearFilter;
  const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
  label.scale.set(2.45, 0.67, 1); root.add(label);
  let hits = Math.max(0, options.hits), maxHits = Math.max(1, options.maxHits), ending: 'broken' | 'bite' | 'cancel' | null = null, endingElapsed = 0;
  const drawLabel = () => {
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.fillStyle = 'rgba(38,25,12,.9)'; ctx.fillRect(8, 9, 240, 50);
    ctx.fillStyle = '#f2deb1'; ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(`ผ้าพันมัมมี่  ${hits}/${maxHits}`, 128, 31);
    ctx.fillStyle = '#382012'; ctx.fillRect(28, 40, 200, 11); ctx.fillStyle = hits > 3 ? '#dfc27d' : '#eb715f'; ctx.fillRect(30, 42, 196 * hits / maxHits, 7); texture.needsUpdate = true;
  };
  drawLabel(); effectScene.add(root);
  const axis = new THREE.Vector3(0, 1, 0), source = new THREE.Vector3(), target = new THREE.Vector3(), direction = new THREE.Vector3(), startTarget = new THREE.Vector3(), visibleTarget = new THREE.Vector3(), lateral = new THREE.Vector3(), segmentStart = new THREE.Vector3(), segmentEnd = new THREE.Vector3();
  const initialTarget = targetPosition(); if (initialTarget) startTarget.set(initialTarget.x, initialTarget.y, initialTarget.z);
  let elapsed = Math.max(0, (Date.now() - options.startedAt) / 1000);
  const controller: MummyBandageSnare = {
    setHits(nextHits, nextMaxHits) { hits = Math.max(0, nextHits); maxHits = Math.max(1, nextMaxHits); drawLabel(); },
    end(reason) { if (!ending) ending = reason; },
  };
  track({
    update(dt) {
      elapsed += dt; const sourceValue = sourcePosition(), targetValue = targetPosition();
      if (!targetValue) return true;
      source.set(sourceValue.x, sourceValue.y + 1.45, sourceValue.z); target.set(targetValue.x, targetValue.y + 1.25, targetValue.z);
      const travel = Math.max(.15, options.travelMs / 1000), flight = THREE.MathUtils.clamp(elapsed / travel, 0, 1);
      visibleTarget.copy(startTarget).lerp(target, flight);
      direction.copy(visibleTarget).sub(source); const length = Math.max(.001, direction.length()); direction.normalize();
      lateral.set(-direction.z, 0, direction.x).normalize();
      strips.forEach((strip, index) => {
        const ribbon = Number(strip.userData.ribbon), segment = Number(strip.userData.segment), startT = segment / 6, endT = (segment + 1) / 6;
        const flutter = (flight < .98 ? .26 : .095) * (1 - ribbon * .09), phase = elapsed * (6.5 + ribbon) + ribbon * 2.2;
        segmentStart.copy(source).lerp(visibleTarget, startT).addScaledVector(lateral, Math.sin(phase + startT * 8) * flutter);
        segmentEnd.copy(source).lerp(visibleTarget, endT).addScaledVector(lateral, Math.sin(phase + endT * 8) * flutter);
        direction.copy(segmentEnd).sub(segmentStart); const segmentLength = Math.max(.025, direction.length()); direction.normalize();
        strip.position.copy(segmentStart).add(segmentEnd).multiplyScalar(.5); strip.scale.set(.82 + ribbon * .08, segmentLength * 1.12, 1);
        strip.quaternion.setFromUnitVectors(axis, direction); (strip.material as THREE.MeshBasicMaterial).opacity = .28 + flight * (.66 - ribbon * .06);
      });
      const wrapped = flight >= .98;
      coils.forEach((coil, index) => { coil.visible = wrapped; coil.position.copy(target); coil.position.y += -.3 + index * .34; coil.rotation.z = elapsed * (index % 2 ? -5 : 4) + index; coil.scale.setScalar(.9 + Math.sin(elapsed * 8 + index) * .08); });
      knot.visible = wrapped; knot.position.copy(target); knot.position.y += .7; knot.rotation.set(elapsed * 5, elapsed * 7, 0); knot.scale.setScalar(.85 + Math.sin(elapsed * 12) * .14);
      frays.forEach((entry, index) => { const flare = .5 + Math.sin(elapsed * 12 + entry.phase) * .12; entry.fray.visible = wrapped; entry.fray.position.copy(target).add(new THREE.Vector3(Math.cos(entry.angle) * (.48 + index % 3 * .1), -.2 + index % 4 * .27, Math.sin(entry.angle) * (.48 + index % 3 * .1))); entry.fray.rotation.set(Math.sin(elapsed * 8 + entry.phase) * .5, -entry.angle, elapsed * 9 + entry.phase); entry.fray.scale.setScalar(flare); });
      label.visible = wrapped; label.position.copy(target); label.position.y += 2.4;
      if (ending) {
        endingElapsed += dt; const impact = THREE.MathUtils.clamp(endingElapsed / .55, 0, 1);
        strips.forEach((strip, index) => { strip.position.addScaledVector(direction, (index % 6 - 2.5) * dt * (ending === 'bite' ? 3 : -2)); (strip.material as THREE.MeshBasicMaterial).opacity = (1 - impact) * .8; });
        burst.forEach((piece, index) => { piece.shard.position.copy(target).add(new THREE.Vector3(Math.cos(piece.angle) * impact * (1.5 + index % 3 * .22), impact * piece.lift * 2, Math.sin(piece.angle) * impact * (1.5 + index % 3 * .22))); piece.shard.rotation.y += dt * 9; (piece.shard.material as THREE.MeshBasicMaterial).opacity = (1 - impact) * .9; });
        return endingElapsed >= .55;
      }
      return false;
    },
    dispose: () => { texture.dispose(); disposeObject(root); },
  });
  return controller;
}

/** Builds the exact boss effects off-screen so map entry pays their geometry/shader cost once. */
export function warmBossVfxAssets(preset: any, renderer: THREE.WebGLRenderer, camera: THREE.Camera, worldScene: THREE.Scene) {
  const configured = [...(Array.isArray(preset?.skills) ? preset.skills : []), ...(preset?.heal?.id ? [preset.heal] : [])];
  const requested = [...new Set(configured.map((skill) => String(skill?.id || '')).filter(Boolean))];
  const task = bossVfxWarmupQueue.then(async () => {
    const pending = requested.filter((skillId) => !warmedBossSkillIds.has(skillId));
    if (!pending.length) return;
    const skillById = new Map(configured.map((skill) => [String(skill?.id || ''), skill]));
    const warmScene = new THREE.Scene();
    const previousScene = effectScene;
    const effectStart = activeEffects.length;
    let warmEffects: BossVfx[] = [];
    let compile: Promise<unknown> = Promise.resolve();
    bossVfxWarmupActive = true;
    effectScene = warmScene;
    try {
      const x = Number(camera.position.x) || 0, z = Number(camera.position.z) || 0;
      const origin = { x, y: 0, z }, destination = { x: x + 4, y: 0, z: z + 4 };
      const sourceAnchor = new THREE.Group(), targetAnchor = new THREE.Group();
      sourceAnchor.position.set(x, 0, z); targetAnchor.position.set(x + 3, 0, z + 3);
      for (const skillId of pending) {
        const skill = skillById.get(skillId) || {};
        try {
          if (skillId === 'royal_tide_slam') spawnSouthBossSlamImpact(origin, Number(skill.radius) || 6);
          else if (skillId === 'triple_tidal_wave') {
            spawnSouthBossTideTelegraph(origin, [destination], 0.2, Number(skill.projectileRadius) || 1.35);
            spawnSouthBossTideProjectile(origin, destination, Number(skill.projectileSpeed) || 15, Number(skill.projectileRadius) || 1.35, () => {});
          } else if (skillId === 'mummy_toxic_bombardment') {
            const hitRadius = Number(skill.projectileRadius) || 1.45, poolRadius = Number(skill.toxicPoolRadius) || 3.8;
            spawnMummyToxicBombTelegraph([destination], 0.2, hitRadius);
            spawnMummyToxicBomb(origin, destination, Number(skill.projectileSpeed) || 13, hitRadius, poolRadius, () => {});
            spawnMummyToxicPool(new THREE.Vector3(destination.x, destination.y, destination.z), poolRadius);
          } else if (skillId === 'mummy_bandage_bind') {
            spawnMummyBandageSnare(() => origin, () => destination, { travelMs: 100, startedAt: Date.now(), hits: 10, maxHits: 10 });
          } else if (skillId === 'mummy_summon_servants') {
            spawnMummyPriestHeal(sourceAnchor, targetAnchor, 0.4);
          } else if (skillId === 'royal_elixir') spawnSouthBossHeal(sourceAnchor);
        } catch (error) { console.warn(`Boss VFX warm-up construction failed: ${skillId}`, error); }
      }
      warmEffects = activeEffects.splice(effectStart);
      compile = typeof renderer.compileAsync === 'function'
        ? renderer.compileAsync(warmScene, camera, worldScene)
        : Promise.resolve(renderer.compile(warmScene, camera, worldScene));
    } finally {
      effectScene = previousScene;
      bossVfxWarmupActive = false;
    }
    try { await compile; }
    finally {
      const materials = new Set<THREE.Material>();
      warmScene.traverse((object: any) => {
        if (!object.material) return;
        for (const material of Array.isArray(object.material) ? object.material : [object.material]) if (material) materials.add(material);
      });
      retainedBossWarmMaterials.push(...materials);
      warmScene.clear();
      warmEffects.length = 0;
    }
    pending.forEach((skillId) => warmedBossSkillIds.add(skillId));
  }).catch((error) => {
    failedBossVfxWarmups += 1;
    console.warn('Boss VFX warm-up failed; runtime presentation remains available.', error);
  });
  bossVfxWarmupQueue = task.then(() => undefined, () => undefined);
  return task;
}

export function bossVfxWarmupSnapshot() {
  return { skills: [...warmedBossSkillIds], retainedMaterials: retainedBossWarmMaterials.length, cachedGeometries: geometryCache.size, failed: failedBossVfxWarmups };
}

export function updateBossVfx(dt: number) {
  const safeDt = Number.isFinite(dt) ? THREE.MathUtils.clamp(dt, 0, 0.1) : 0;
  for (let index = activeEffects.length - 1; index >= 0; index -= 1) {
    const effect = activeEffects[index];
    let finished = false;
    try {
      finished = effect.update(safeDt);
    } catch (error) {
      console.warn('Boss VFX update failed; removing the effect.', error);
      finished = true;
    }
    if (!finished) continue;
    effect.dispose();
    activeEffects.splice(index, 1);
  }
}
