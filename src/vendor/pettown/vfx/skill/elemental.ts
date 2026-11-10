// Water, Wind and Earth skills.
//
// Split out of skillVfx.ts; see core.ts for the shared pools.

import * as THREE from 'three';
import {
  activeVfxList,
  bloomCount,
  bloomVelocities,
  cfxrAuraRunicTexture,
  cfxrElectricArcTexture,
  cfxrElectricSparkTexture,
  cfxrLineElectricTexture,
  cfxrMagicStarTexture,
  cfxrRayBlurTexture,
  cfxrRingElectricTexture,
  cfxrSpikeFadeTexture,
  flashVfxLight,
  hovlCircle2Texture,
  hovlCrackTexture,
  hovlCraterTexture,
  hovlElectroTexture,
  hovlFlareTexture,
  hovlFlashFree1Texture,
  hovlFlashFree2Texture,
  hovlFlashTexture,
  hovlGlowTexture,
  hovlMagicCircle2Texture,
  hovlMagicCircleTexture,
  hovlPointTexture,
  hovlSmokeFree1Texture,
  hovlSnowflakeTexture,
  hovlStarTexture,
  hovlStoneTexture,
  hovlTechCircle2Texture,
  sharedBeamGeo,
  sharedBloomGeo,
  sharedCrystalGeo,
  sharedPillarGeo,
  sharedPlaneGeo,
  sharedRayGeo,
  sharedSnareBandGeo,
  vfxScene,
} from './core.ts';


// ==========================================
// SKILL 3: Frost Poke (â„ï¸) â€” GRAND 3D Glacier Eruption & Blizzard Vortex
// ==========================================
export function spawnFrostPokeVfx(targetPos: THREE.Vector3, _casterPos: THREE.Vector3) {
  if (!vfxScene) return;

  const group = new THREE.Group();
  group.position.copy(targetPos);
  vfxScene.add(group);

  const runeMat = new THREE.MeshBasicMaterial({ map: hovlMagicCircleTexture, color: '#74f7ff', transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const rune = new THREE.Mesh(sharedPlaneGeo, runeMat);
  rune.rotation.x = -Math.PI / 2;
  rune.position.y = 0.035;
  rune.scale.setScalar(0.7);
  group.add(rune);

  const innerRingMat = new THREE.MeshBasicMaterial({ map: hovlCircle2Texture, color: '#d8ffff', transparent: true, opacity: 0.92, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const innerRing = new THREE.Mesh(sharedPlaneGeo, innerRingMat);
  innerRing.rotation.x = -Math.PI / 2;
  innerRing.position.y = 0.055;
  innerRing.scale.setScalar(0.16);
  group.add(innerRing);

  const outerRingMat = new THREE.MeshBasicMaterial({ map: hovlCircle2Texture, color: '#18ccff', transparent: true, opacity: 0.82, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const outerRing = new THREE.Mesh(sharedPlaneGeo, outerRingMat);
  outerRing.rotation.x = -Math.PI / 2;
  outerRing.position.y = 0.075;
  outerRing.scale.setScalar(0.12);
  group.add(outerRing);

  const flashMat = new THREE.MeshBasicMaterial({ map: hovlFlashFree2Texture, color: '#f1ffff', transparent: true, opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const flash = new THREE.Mesh(sharedPlaneGeo, flashMat);
  flash.rotation.x = -Math.PI / 2;
  flash.position.y = 0.1;
  flash.scale.setScalar(0.12);
  group.add(flash);

  const glacierMat = new THREE.MeshBasicMaterial({ color: '#38cffa', transparent: true, opacity: 0.76, depthWrite: false, blending: THREE.NormalBlending, side: THREE.DoubleSide });
  const glacierCoreMat = new THREE.MeshBasicMaterial({ color: '#e9ffff', transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const crystals: Array<{ outer: THREE.Mesh; core: THREE.Mesh; startY: number; endY: number; scale: THREE.Vector3; delay: number }> = [];
  const spikeCount = 7;
  for (let i = 0; i < spikeCount; i++) {
    const isCenter = i === 0;
    const angle = isCenter ? 0 : ((i - 1) * Math.PI * 2) / (spikeCount - 1) + 0.2;
    const radius = isCenter ? 0 : 0.48 + (i % 2) * 0.18;
    const scale = new THREE.Vector3(isCenter ? 1.35 : 0.52 + (i % 3) * 0.13, isCenter ? 1.95 : 0.82 + (i % 3) * 0.24, isCenter ? 1.35 : 0.52 + (i % 3) * 0.13);
    const startY = isCenter ? -1.35 : -0.9;
    const endY = isCenter ? 0.95 : 0.45 + (i % 2) * 0.18;
    const outer = new THREE.Mesh(sharedCrystalGeo, glacierMat);
    outer.position.set(Math.cos(angle) * radius, startY, Math.sin(angle) * radius);
    outer.rotation.set(Math.sin(angle) * 0.22, angle, Math.cos(angle) * 0.22);
    outer.scale.copy(scale);
    const core = new THREE.Mesh(sharedCrystalGeo, glacierCoreMat);
    core.position.copy(outer.position);
    core.rotation.copy(outer.rotation);
    core.scale.copy(scale).multiplyScalar(0.46);
    group.add(outer, core);
    crystals.push({ outer, core, startY, endY, scale, delay: isCenter ? 0 : 0.035 + (i % 3) * 0.035 });
  }

  // The hit is brief, but the cold hangs in the air afterwards.  These are deliberately
  // individual planes (rather than a dense point cloud) so their slow orbit reads as snow
  // even from the raised isometric camera.
  const snowMat = new THREE.MeshBasicMaterial({ map: hovlSnowflakeTexture, color: '#aeefff', transparent: true, opacity: 0.94, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const snowflakes: Array<{ mesh: THREE.Mesh; angle: number; radius: number; baseHeight: number; rise: number; drift: number; phase: number; spin: number; delay: number; scale: number }> = [];
  for (let i = 0; i < 22; i++) {
    const mesh = new THREE.Mesh(sharedPlaneGeo, snowMat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.rotation.z = Math.random() * Math.PI * 2;
    mesh.scale.setScalar(0.001);
    group.add(mesh);
    snowflakes.push({
      mesh,
      angle: (i * Math.PI * 2) / 22 + Math.random() * 0.26,
      radius: 0.3 + (i % 5) * 0.17,
      baseHeight: 0.22 + (i % 4) * 0.16,
      rise: 0.48 + (i % 4) * 0.16,
      drift: 0.65 + (i % 5) * 0.13,
      phase: Math.random() * Math.PI * 2,
      spin: (i % 2 ? 1 : -1) * (1.55 + i * 0.075),
      delay: (i % 7) * 0.028,
      scale: 0.13 + (i % 4) * 0.038,
    });
  }

  flashVfxLight('#40ddff', targetPos.x, targetPos.y + 0.9, targetPos.z, 1.0, 13.0);

  let elapsed = 0;
  const duration = 1.3;
  activeVfxList.push({
    update: (dt: number) => {
      elapsed += dt;
      const progress = Math.min(1, elapsed / duration);
      const primaryProgress = Math.min(1, elapsed / 0.88);
      const impact = Math.min(1, primaryProgress / 0.34);
      const impactEase = Math.sin((impact * Math.PI) / 2);
      rune.rotation.z += dt * 3.8;
      rune.scale.setScalar(0.7 + primaryProgress * 1.2);
      runeMat.opacity = Math.max(0, 0.9 - primaryProgress * 1.05);
      innerRing.rotation.z -= dt * 5.4;
      innerRing.scale.setScalar(0.12 + impactEase * 2.15);
      innerRingMat.opacity = Math.max(0, 0.92 - primaryProgress * 1.28);
      outerRing.rotation.z += dt * 2.6;
      outerRing.scale.setScalar(0.1 + impactEase * 3.45 + primaryProgress * 0.6);
      outerRingMat.opacity = Math.max(0, 0.82 - primaryProgress * 1.12);
      flash.scale.setScalar(0.08 + Math.sin(impact * Math.PI) * 2.1);
      flashMat.opacity = Math.max(0, 0.95 - primaryProgress * 2.45);

      crystals.forEach(({ outer, core, startY, endY, scale, delay }) => {
        const rise = Math.min(1, Math.max(0, (primaryProgress - delay) / 0.28));
        const eased = Math.sin((rise * Math.PI) / 2);
        const settle = Math.sin(Math.min(1, rise * 2.1) * Math.PI) * 0.1;
        outer.position.y = startY + (endY - startY) * eased + settle;
        core.position.y = outer.position.y + 0.02;
        outer.scale.copy(scale).multiplyScalar(0.58 + eased * 0.42);
        core.scale.copy(scale).multiplyScalar((0.23 + eased * 0.23) * (1 - primaryProgress * 0.16));
      });
      glacierMat.opacity = Math.max(0, 0.82 - primaryProgress * 0.9);
      glacierCoreMat.opacity = Math.max(0, 0.9 - primaryProgress * 1.05);

      const snowFade = THREE.MathUtils.clamp((elapsed - 0.72) / 0.58, 0, 1);
      snowflakes.forEach(({ mesh, angle, radius, baseHeight, rise, drift, phase, spin, delay, scale }) => {
        const entry = THREE.MathUtils.clamp((elapsed - delay) / 0.22, 0, 1);
        const orbit = angle + elapsed * drift;
        const radiusNow = radius + Math.sin(elapsed * 1.65 + phase) * 0.11 + progress * 0.3;
        const floatHeight = baseHeight + rise * progress + Math.sin(elapsed * 3.3 + phase) * 0.09;
        mesh.position.set(Math.cos(orbit) * radiusNow, floatHeight, Math.sin(orbit) * radiusNow);
        mesh.scale.setScalar(scale * (0.55 + entry * 1.05) * (1 - snowFade * 0.2));
        mesh.rotation.z += spin * dt;
      });
      snowMat.opacity = Math.max(0, 0.94 - snowFade * 1.04);
      return elapsed >= duration;
    },
    dispose: () => {
      vfxScene?.remove(group);
      runeMat.dispose();
      innerRingMat.dispose();
      outerRingMat.dispose();
      flashMat.dispose();
      glacierMat.dispose();
      glacierCoreMat.dispose();
      snowMat.dispose();
    },
  });
}

// ==========================================
// Lord of Vermilion — a sustained field of staggered sky-lightning strikes.
// ==========================================
export function spawnLordOfVermilionVfx(targetPos: THREE.Vector3) {
  if (!vfxScene) return;
  const group = new THREE.Group();
  group.position.copy(targetPos);
  vfxScene.add(group);

  const ringGeo = new THREE.RingGeometry(.78, 1, 72);
  const ringMat = new THREE.MeshBasicMaterial({ color: '#ffc928', transparent: true, opacity: .68, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = .07;
  ring.scale.setScalar(4.5);
  group.add(ring);
  const impactRingGeo = new THREE.RingGeometry(.62, 1, 40);
  const outerBoltMat = new THREE.MeshBasicMaterial({ color: '#ffb300', transparent: true, opacity: .72, blending: THREE.AdditiveBlending, depthWrite: false });
  const coreBoltMat = new THREE.MeshBasicMaterial({ color: '#fffde0', transparent: true, opacity: .98, blending: THREE.AdditiveBlending, depthWrite: false });
  const impactMat = new THREE.MeshBasicMaterial({ color: '#ffe46b', transparent: true, opacity: .9, blending: THREE.AdditiveBlending, depthWrite: false });
  const impactRingMat = new THREE.MeshBasicMaterial({ color: '#ffc21a', transparent: true, opacity: .85, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const impactGeo = new THREE.SphereGeometry(.45, 12, 8);
  const cloudGeo = new THREE.SphereGeometry(1, 12, 8);
  const cloudMat = new THREE.MeshStandardMaterial({ color: '#11151b', emissive: '#030405', emissiveIntensity: .35, roughness: 1, metalness: 0, transparent: true, opacity: .9, depthWrite: false });
  const cloudData = [[-2.8, 10.6, -.8, 2.2], [-1.1, 11.1, -1.2, 2.5], [.8, 10.8, -1, 2.6], [2.7, 10.5, -.45, 2.15], [-3.2, 10.8, 1.25, 1.9], [-1.6, 10.45, 1.15, 2.55], [.35, 10.65, 1.2, 2.7], [2.25, 10.7, 1.35, 2.3], [-.7, 11.45, .2, 2.35], [1.4, 11.25, .15, 2.15]];
  const clouds: Array<{ mesh: THREE.Mesh; size: number; phase: number }> = [];
  cloudData.forEach(([x, y, z, size], index) => {
    const mesh = new THREE.Mesh(cloudGeo, cloudMat);
    mesh.position.set(x, y, z);
    mesh.scale.set(size * 1.25, size * .55, size);
    group.add(mesh);
    clouds.push({ mesh, size, phase: index * .73 });
  });
  const offsets = [[0, 0], [2.5, .55], [-2.3, 1.1], [1.25, -2.5], [-1.05, -2.35], [3.0, -1.6], [-3.0, -1.25], [.25, 2.75]];
  const bolts: Array<{ outer: THREE.Mesh; core: THREE.Mesh; impact: THREE.Mesh; impactRing: THREE.Mesh; delay: number; x: number; z: number; geometries: THREE.BufferGeometry[] }> = [];
  offsets.forEach(([x, z], index) => {
    const points: THREE.Vector3[] = [];
    for (let step = 0; step <= 12; step++) {
      const t = step / 12;
      const envelope = Math.sin(t * Math.PI);
      const jitterX = (Math.random() - .5) * 1.15 * envelope;
      const jitterZ = (Math.random() - .5) * 1.15 * envelope;
      points.push(new THREE.Vector3(x + jitterX, 12 * (1 - t) + .12, z + jitterZ));
    }
    const curve = new THREE.CatmullRomCurve3(points);
    const outerGeo = new THREE.TubeGeometry(curve, 44, .13, 5, false);
    const coreGeo = new THREE.TubeGeometry(curve, 44, .045, 5, false);
    const outer = new THREE.Mesh(outerGeo, outerBoltMat);
    const core = new THREE.Mesh(coreGeo, coreBoltMat);
    const impact = new THREE.Mesh(impactGeo, impactMat);
    impact.position.set(x, .18, z);
    const impactRing = new THREE.Mesh(impactRingGeo, impactRingMat);
    impactRing.rotation.x = -Math.PI / 2;
    impactRing.position.set(x, .1, z);
    outer.visible = false; core.visible = false; impact.visible = false; impactRing.visible = false;
    group.add(outer, core, impact, impactRing);
    bolts.push({ outer, core, impact, impactRing, delay: .46 + index * .14, x, z, geometries: [outerGeo, coreGeo] });
  });

  let elapsed = 0;
  const duration = 2.12;
  activeVfxList.push({
    update: (dt: number) => {
      elapsed += dt;
      const progress = THREE.MathUtils.clamp(elapsed / duration, 0, 1);
      ring.rotation.z += dt * 3.4;
      ring.scale.setScalar(4.2 + Math.sin(elapsed * 9) * .22);
      ringMat.opacity = Math.max(0, .7 - progress * .74);
      const cloudEntry = THREE.MathUtils.clamp(elapsed / .32, 0, 1);
      const cloudFade = THREE.MathUtils.clamp((elapsed - 1.58) / .54, 0, 1);
      clouds.forEach(({ mesh, size, phase }) => {
        const pulse = .86 + Math.sin(elapsed * 2.4 + phase) * .07;
        mesh.scale.set(size * 1.25 * pulse * cloudEntry, size * .55 * pulse * cloudEntry, size * pulse * cloudEntry);
        mesh.position.x += Math.sin(elapsed * 1.1 + phase) * dt * .13;
        mesh.rotation.y += dt * (.12 + phase * .01);
      });
      cloudMat.opacity = Math.max(0, .9 - cloudFade * 1.05);
      bolts.forEach(({ outer, core, impact, impactRing, delay, x, z }) => {
        const age = elapsed - delay;
        const visible = age >= 0 && age < .3;
        outer.visible = visible;
        core.visible = visible;
        impact.visible = visible;
        impactRing.visible = age >= 0 && age < .46;
        if (visible) {
          const flicker = .84 + Math.sin(age * 125) * .14;
          outer.scale.setScalar(flicker);
          core.scale.setScalar(.9 + Math.sin(age * 157) * .08);
          impact.scale.setScalar(.7 + Math.sin(Math.min(1, age / .3) * Math.PI) * 2.4);
          if (age < dt) flashVfxLight('#ffd22e', targetPos.x + x, targetPos.y + .7, targetPos.z + z, .2, 20);
        }
        if (impactRing.visible) impactRing.scale.setScalar(.2 + age / .46 * 2.8);
      });
      outerBoltMat.opacity = .48 + Math.sin(elapsed * 71) * .2;
      coreBoltMat.opacity = .78 + Math.sin(elapsed * 93) * .18;
      impactMat.opacity = Math.max(0, .92 - progress * .36);
      impactRingMat.opacity = Math.max(0, .86 - progress * .5);
      return elapsed >= duration;
    },
    dispose: () => {
      vfxScene?.remove(group);
      ringGeo.dispose();
      impactRingGeo.dispose();
      impactGeo.dispose();
      cloudGeo.dispose();
      ringMat.dispose();
      outerBoltMat.dispose();
      coreBoltMat.dispose();
      impactMat.dispose();
      impactRingMat.dispose();
      cloudMat.dispose();
      bolts.forEach(({ geometries }) => geometries.forEach((geometry) => geometry.dispose()));
    },
  });
}

// ==========================================
// Storm Gust — an icy vortex with orbiting shards across the whole AOE field.
// ==========================================
export function spawnStormGustVfx(targetPos: THREE.Vector3) {
  if (!vfxScene) return;
  const group = new THREE.Group();
  group.position.copy(targetPos);
  vfxScene.add(group);

  const ringGeo = new THREE.RingGeometry(.7, 1, 72);
  const ringMat = new THREE.MeshBasicMaterial({ color: '#247cff', transparent: true, opacity: .72, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = .06;
  ring.scale.setScalar(4.5);
  group.add(ring);
  const windMat = new THREE.MeshBasicMaterial({ color: '#f2feff', transparent: true, opacity: .5, depthWrite: false, blending: THREE.AdditiveBlending });
  const windTrails: Array<{ mesh: THREE.Mesh; geometry: THREE.TubeGeometry; speed: number }> = [];
  for (let trailIndex = 0; trailIndex < 4; trailIndex++) {
    const points: THREE.Vector3[] = [];
    for (let step = 0; step <= 52; step++) {
      const t = step / 52;
      const angle = t * Math.PI * (5.2 + trailIndex * .35) + trailIndex * Math.PI * .5;
      const radius = 3.9 - t * 2.2 + Math.sin(t * Math.PI * 4) * .18;
      points.push(new THREE.Vector3(Math.cos(angle) * radius, .12 + t * 5.8, Math.sin(angle) * radius));
    }
    const geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 76, .035 + trailIndex * .009, 5, false);
    const mesh = new THREE.Mesh(geometry, windMat);
    group.add(mesh);
    windTrails.push({ mesh, geometry, speed: (trailIndex % 2 ? -1 : 1) * (.65 + trailIndex * .12) });
  }
  const frostRingGeo = new THREE.TorusGeometry(1, .035, 6, 48);
  const frostRingMat = new THREE.MeshBasicMaterial({ color: '#49c8ff', transparent: true, opacity: .52, depthWrite: false, blending: THREE.AdditiveBlending });
  const frostRings: Array<{ mesh: THREE.Mesh; base: number; speed: number }> = [];
  for (let i = 0; i < 4; i++) {
    const mesh = new THREE.Mesh(frostRingGeo, frostRingMat);
    mesh.rotation.x = Math.PI / 2;
    mesh.position.y = .65 + i * 1.25;
    const base = 3.5 - i * .48;
    mesh.scale.setScalar(base);
    group.add(mesh);
    frostRings.push({ mesh, base, speed: i % 2 ? -2.6 : 2.2 });
  }
  const shardGeo = new THREE.TetrahedronGeometry(.22, 0);
  const iceMat = new THREE.MeshStandardMaterial({ color: '#5fcfff', emissive: '#125dcc', emissiveIntensity: .8, transparent: true, opacity: .92, roughness: .24, metalness: .08 });
  const shards: Array<{ mesh: THREE.Mesh; angle: number; radius: number; height: number; speed: number; size: number; phase: number }> = [];
  for (let i = 0; i < 36; i++) {
    const mesh = new THREE.Mesh(shardGeo, iceMat);
    const size = .55 + (i % 5) * .13;
    group.add(mesh);
    shards.push({ mesh, angle: i / 36 * Math.PI * 2, radius: .8 + (i % 9) * .37, height: .25 + (i % 8) * .58, speed: 2.7 + (i % 6) * .31, size, phase: i * 1.73 });
  }
  const snowGeo = new THREE.SphereGeometry(.055, 5, 4);
  const snowMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: .82, blending: THREE.AdditiveBlending, depthWrite: false });
  const snow: Array<{ mesh: THREE.Mesh; angle: number; radius: number; height: number; speed: number; phase: number }> = [];
  for (let i = 0; i < 42; i++) {
    const mesh = new THREE.Mesh(snowGeo, snowMat);
    group.add(mesh);
    snow.push({ mesh, angle: i / 42 * Math.PI * 2, radius: .4 + (i % 11) * .34, height: .2 + (i % 10) * .52, speed: 3.4 + (i % 7) * .27, phase: i * 2.17 });
  }

  flashVfxLight('#3f9dff', targetPos.x, targetPos.y + 1.2, targetPos.z, 1.15, 14);
  let elapsed = 0;
  const duration = 2.05;
  activeVfxList.push({
    update: (dt: number) => {
      elapsed += dt;
      const progress = THREE.MathUtils.clamp(elapsed / duration, 0, 1);
      const fade = THREE.MathUtils.clamp((elapsed - 1.42) / .63, 0, 1);
      ring.rotation.z -= dt * 3.8;
      ring.scale.setScalar(3.75 + Math.sin(elapsed * 7) * .24 + progress * .36);
      ringMat.opacity = Math.max(0, .74 - fade * .9);
      windTrails.forEach(({ mesh, speed }, index) => {
        mesh.rotation.y += dt * speed;
        mesh.scale.setScalar(.92 + Math.sin(elapsed * 5 + index) * .06);
      });
      windMat.opacity = Math.max(0, .44 - fade * .54);
      frostRings.forEach(({ mesh, base, speed }, index) => {
        mesh.rotation.z += dt * speed;
        mesh.scale.setScalar(base * (.88 + Math.sin(elapsed * 4.8 + index) * .08));
      });
      frostRingMat.opacity = Math.max(0, .48 - fade * .58);
      shards.forEach(({ mesh, angle, radius, height, speed, size, phase }, index) => {
        const orbit = angle + elapsed * speed;
        const radiusNow = radius + Math.sin(elapsed * 4 + phase) * .24;
        const y = height + Math.sin(elapsed * 5 + phase) * .28;
        mesh.position.set(Math.cos(orbit) * radiusNow, y, Math.sin(orbit) * radiusNow);
        mesh.rotation.set(elapsed * speed, orbit, elapsed * 3.1 + index);
        const scale = 1 - fade * .55;
        mesh.scale.set(size * scale, size * 2.25 * scale, size * scale);
      });
      snow.forEach(({ mesh, angle, radius, height, speed, phase }) => {
        const orbit = angle + elapsed * speed;
        const radiusNow = radius + Math.sin(elapsed * 3.7 + phase) * .3;
        mesh.position.set(Math.cos(orbit) * radiusNow, height + Math.sin(elapsed * 6 + phase) * .38, Math.sin(orbit) * radiusNow);
      });
      iceMat.opacity = Math.max(0, .92 - fade * 1.08);
      snowMat.opacity = Math.max(0, .84 - fade * 1.02);
      return elapsed >= duration;
    },
    dispose: () => {
      vfxScene?.remove(group);
      ringGeo.dispose();
      windTrails.forEach(({ geometry }) => geometry.dispose());
      frostRingGeo.dispose();
      shardGeo.dispose();
      snowGeo.dispose();
      ringMat.dispose();
      windMat.dispose();
      frostRingMat.dispose();
      iceMat.dispose();
      snowMat.dispose();
    },
  });
}

// ==========================================
// SKILL 4: Spark Lance (âš¡) â€” Vertical Sky Lightning Bolt & High-Voltage Shockwave
// ==========================================
export function spawnSparkLanceVfx(targetPos: THREE.Vector3) {
  if (!vfxScene) return;
  const group = new THREE.Group();
  group.position.copy(targetPos);
  vfxScene.add(group);

  const runeMat = new THREE.MeshBasicMaterial({ map: hovlMagicCircleTexture, color: '#ffe95c', transparent: true, opacity: 0.88, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const rune = new THREE.Mesh(sharedPlaneGeo, runeMat);
  rune.rotation.x = -Math.PI / 2;
  rune.position.y = 0.04;
  rune.scale.setScalar(0.74);
  group.add(rune);

  const ringMat = new THREE.MeshBasicMaterial({ map: hovlCircle2Texture, color: '#74eaff', transparent: true, opacity: 0.94, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(sharedPlaneGeo, ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.07;
  ring.scale.setScalar(0.15);
  group.add(ring);

  const flashMat = new THREE.MeshBasicMaterial({ map: hovlFlashFree1Texture, color: '#ffffdd', transparent: true, opacity: 0.98, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const flash = new THREE.Mesh(sharedPlaneGeo, flashMat);
  flash.rotation.x = -Math.PI / 2;
  flash.position.y = 0.1;
  flash.scale.setScalar(0.12);
  group.add(flash);

  const boltOuterMat = new THREE.LineBasicMaterial({ color: '#65eaff', transparent: true, opacity: 0.78, depthWrite: false, blending: THREE.AdditiveBlending });
  const boltCoreMat = new THREE.LineBasicMaterial({ color: '#fff4a8', transparent: true, opacity: 0.98, depthWrite: false, blending: THREE.AdditiveBlending });
  const bolts: THREE.BufferGeometry[] = [];
  const boltStarts = [new THREE.Vector2(0, 0), new THREE.Vector2(0.95, -0.42), new THREE.Vector2(-0.72, 0.68)];
  boltStarts.forEach((start, boltIndex) => {
    const points: THREE.Vector3[] = [];
    const segments = 7;
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const jitter = i === 0 || i === segments ? 0 : (Math.random() - 0.5) * (0.36 - t * 0.18);
      points.push(new THREE.Vector3(start.x * (1 - t) + jitter, 7.2 * (1 - t) + 0.12, start.y * (1 - t) - jitter));
    }
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const outer = new THREE.Line(geometry, boltOuterMat);
    const core = new THREE.Line(geometry, boltCoreMat);
    outer.renderOrder = 2 + boltIndex;
    core.renderOrder = 5 + boltIndex;
    group.add(outer, core);
    bolts.push(geometry);
  });

  const sheetMat = new THREE.MeshBasicMaterial({ map: hovlElectroTexture, color: '#23bfff', transparent: true, opacity: 0.78, depthWrite: false, blending: THREE.NormalBlending, side: THREE.DoubleSide });
  const sheetA = new THREE.Mesh(sharedBeamGeo, sheetMat);
  sheetA.position.set(0, 3.45, 0);
  sheetA.scale.set(0.88, 0.66, 1);
  const sheetB = new THREE.Mesh(sharedBeamGeo, sheetMat);
  sheetB.position.copy(sheetA.position);
  sheetB.rotation.y = Math.PI / 2;
  sheetB.scale.copy(sheetA.scale);
  group.add(sheetA, sheetB);

  const lanceAuraMat = new THREE.MeshBasicMaterial({ color: '#2cbcff', transparent: true, opacity: 0.36, depthWrite: false, blending: THREE.NormalBlending, side: THREE.DoubleSide });
  const lanceAura = new THREE.Mesh(sharedPillarGeo, lanceAuraMat);
  lanceAura.position.set(0, 3.3, 0);
  lanceAura.scale.set(0.28, 1.88, 0.28);
  const lanceCoreMat = new THREE.MeshBasicMaterial({ color: '#fff1a0', transparent: true, opacity: 0.82, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const lanceCore = new THREE.Mesh(sharedPillarGeo, lanceCoreMat);
  lanceCore.position.copy(lanceAura.position);
  lanceCore.scale.set(0.1, 1.92, 0.1);
  group.add(lanceAura, lanceCore);

  const arcMat = new THREE.MeshBasicMaterial({ map: hovlElectroTexture, color: '#ffcc32', transparent: true, opacity: 0.88, depthWrite: false, blending: THREE.NormalBlending, side: THREE.DoubleSide });
  const arcs: Array<{ mesh: THREE.Mesh; angle: number; radius: number; height: number; spin: number }> = [];
  for (let i = 0; i < 7; i++) {
    const angle = (i * Math.PI * 2) / 7 + Math.random() * 0.2;
    const mesh = new THREE.Mesh(sharedPlaneGeo, arcMat);
    mesh.scale.set(0.36, 0.86 + (i % 2) * 0.24, 1);
    mesh.rotation.y = angle;
    group.add(mesh);
    arcs.push({ mesh, angle, radius: 0.32 + (i % 3) * 0.18, height: 0.24 + (i % 2) * 0.2, spin: i % 2 ? 1 : -1 });
  }

  const sparkMat = new THREE.MeshBasicMaterial({ map: hovlStarTexture, color: '#fbffb3', transparent: true, opacity: 0.94, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const sparks: Array<{ mesh: THREE.Mesh; angle: number; speed: number; lift: number; spin: number }> = [];
  for (let i = 0; i < 12; i++) {
    const mesh = new THREE.Mesh(sharedPlaneGeo, sparkMat);
    mesh.scale.setScalar(0.11 + (i % 3) * 0.04);
    mesh.rotation.x = -Math.PI / 2;
    mesh.rotation.z = Math.random() * Math.PI * 2;
    group.add(mesh);
    sparks.push({ mesh, angle: (i * Math.PI * 2) / 12 + Math.random() * 0.2, speed: 1.1 + (i % 4) * 0.28, lift: 0.3 + (i % 3) * 0.17, spin: i % 2 ? 8 : -8 });
  }

  flashVfxLight('#ffee22', targetPos.x, targetPos.y + 0.85, targetPos.z, 0.72, 17.0);

  let elapsed = 0;
  const duration = 0.72;

  activeVfxList.push({
    update: (dt: number) => {
      elapsed += dt;
      const progress = Math.min(1, elapsed / duration);
      const impact = Math.min(1, progress / 0.22);
      const flicker = 0.58 + Math.sin(elapsed * 58) * 0.26 + Math.sin(elapsed * 103) * 0.16;
      boltOuterMat.opacity = Math.max(0, (0.5 + flicker * 0.45) * (1 - progress * 1.34));
      boltCoreMat.opacity = Math.max(0, (0.72 + flicker * 0.28) * (1 - progress * 1.55));
      sheetA.rotation.y += dt * 6.4;
      sheetB.rotation.y -= dt * 5.2;
      sheetA.scale.x = 0.76 + flicker * 0.42;
      sheetB.scale.x = 0.76 + flicker * 0.42;
      sheetMat.opacity = Math.max(0, (0.5 + flicker * 0.42) * (1 - progress * 1.6));
      lanceAura.scale.set(0.2 + flicker * 0.16, 1.84, 0.2 + flicker * 0.16);
      lanceAuraMat.opacity = Math.max(0, (0.2 + flicker * 0.3) * (1 - progress * 1.34));
      lanceCore.scale.set(0.07 + flicker * 0.06, 1.9, 0.07 + flicker * 0.06);
      lanceCoreMat.opacity = Math.max(0, (0.55 + flicker * 0.36) * (1 - progress * 1.55));
      rune.rotation.z -= dt * 5.6;
      rune.scale.setScalar(0.74 + progress * 1.65);
      runeMat.opacity = Math.max(0, 0.88 - progress * 1.16);
      ring.rotation.z += dt * 7.2;
      ring.scale.setScalar(0.12 + Math.sin(impact * Math.PI * 0.5) * 2.7 + progress * 0.95);
      ringMat.opacity = Math.max(0, 0.94 - progress * 1.32);
      flash.scale.setScalar(0.08 + Math.sin(impact * Math.PI) * 2.2);
      flashMat.opacity = Math.max(0, 0.98 - progress * 2.55);
      arcs.forEach(({ mesh, angle, radius, height, spin }) => {
        const orbit = angle + elapsed * 4.8 * spin;
        mesh.position.set(Math.cos(orbit) * (radius + progress * 0.88), height + progress * 0.22, Math.sin(orbit) * (radius + progress * 0.88));
        mesh.rotation.z += dt * spin * 4.0;
      });
      arcMat.opacity = Math.max(0, 0.92 - progress * 1.45);
      sparks.forEach(({ mesh, angle, speed, lift, spin }) => {
        const distance = progress * speed;
        mesh.position.set(Math.cos(angle) * distance, 0.18 + lift * progress - progress * progress * 0.32, Math.sin(angle) * distance);
        mesh.rotation.z += spin * dt;
      });
      sparkMat.opacity = Math.max(0, 0.94 - progress * 1.25);

      return elapsed >= duration;
    },
    dispose: () => {
      vfxScene?.remove(group);
      bolts.forEach((geometry) => geometry.dispose());
      boltOuterMat.dispose();
      boltCoreMat.dispose();
      runeMat.dispose();
      ringMat.dispose();
      flashMat.dispose();
      sheetMat.dispose();
      lanceAuraMat.dispose();
      lanceCoreMat.dispose();
      arcMat.dispose();
      sparkMat.dispose();
    },
  });
}

// ==========================================
// SKILL 6: Thunder Bloom (ðŸŒ¸âš¡) â€” GRAND Sky Thunder Bolt & Electric Lotus Eruption
// ==========================================
export function spawnThunderBloomVfx(targetPos: THREE.Vector3) {
  if (!vfxScene) return;

  const group = new THREE.Group();
  group.position.copy(targetPos);
  vfxScene.add(group);

  // 1. Main Central Sky Lightning Beam (Vertical Thunder Strike from Sky y=12.0 down to y=0)
  const mainBeamGroup = new THREE.Group();
  mainBeamGroup.position.set(0, 6.0, 0);
  group.add(mainBeamGroup);

  const beamMat = new THREE.MeshBasicMaterial({
    map: cfxrLineElectricTexture || cfxrElectricArcTexture || hovlElectroTexture,
    color: new THREE.Color('#d044ff'), // Electric Violet / Magenta Thunder
    transparent: true,
    opacity: 1,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });

  // Cross plane X-geometry for 3D volumetric beam effect
  const beamMesh1 = new THREE.Mesh(sharedBeamGeo, beamMat);
  beamMesh1.scale.set(2.2, 1.3, 1.0);
  const beamMesh2 = new THREE.Mesh(sharedBeamGeo, beamMat);
  beamMesh2.rotation.y = Math.PI / 2;
  beamMesh2.scale.set(2.2, 1.3, 1.0);
  mainBeamGroup.add(beamMesh1, beamMesh2);

  // Core White-Cyan Lightning Core
  const coreBeamMat = new THREE.MeshBasicMaterial({
    map: cfxrLineElectricTexture || hovlFlashTexture,
    color: new THREE.Color('#ffffff'),
    transparent: true,
    opacity: 1,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const coreBeamMesh = new THREE.Mesh(sharedBeamGeo, coreBeamMat);
  coreBeamMesh.scale.set(1.1, 1.3, 1.0);
  mainBeamGroup.add(coreBeamMesh);

  // 2. 4 Angled Surrounding Sky Lightning Arcs striking inward across the 3.5m radius AOE
  const skyArcGroup = new THREE.Group();
  group.add(skyArcGroup);

  const arcMat = new THREE.MeshBasicMaterial({
    map: cfxrElectricArcTexture || cfxrLineElectricTexture,
    color: new THREE.Color('#00ffff'), // Cyan Electric
    transparent: true,
    opacity: 1,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });

  for (let i = 0; i < 4; i++) {
    const arcMesh = new THREE.Mesh(sharedBeamGeo, arcMat);
    const angle = (i * Math.PI) / 2 + Math.PI / 4;
    const dist = 2.2; // Spans across the r=3.5m circle
    arcMesh.position.set(Math.cos(angle) * dist, 6.0, Math.sin(angle) * dist);
    arcMesh.rotation.y = angle;
    arcMesh.rotation.z = Math.cos(angle) * 0.22;
    arcMesh.rotation.x = Math.sin(angle) * 0.22;
    arcMesh.scale.set(1.6, 1.3, 1.0);
    skyArcGroup.add(arcMesh);
  }

  // 3. Dual Ground Magic Circles (Outer Magenta Runic + Inner Cyan Lotus) + Ground Lightning Crack
  // 3a. Outer Magenta Runic Magic Circle (Starts big at r=2.25m, expands to r=3.5m / 7.0m diameter)
  const outerCircleMat = new THREE.MeshBasicMaterial({
    map: cfxrAuraRunicTexture || hovlMagicCircleTexture,
    color: new THREE.Color('#ff00ee'), // Vivid Electric Magenta
    transparent: true,
    opacity: 1,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const outerCircleMesh = new THREE.Mesh(sharedPlaneGeo, outerCircleMat);
  outerCircleMesh.rotation.x = -Math.PI / 2;
  outerCircleMesh.position.y = 0.04;
  outerCircleMesh.scale.setScalar(4.5);
  group.add(outerCircleMesh);

  // 3b. Inner Cyan Lotus Magic Circle (Counter-Rotating)
  const innerCircleMat = new THREE.MeshBasicMaterial({
    map: hovlMagicCircle2Texture || hovlMagicCircleTexture,
    color: new THREE.Color('#00f0ff'), // Bright Electric Cyan
    transparent: true,
    opacity: 1,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const innerCircleMesh = new THREE.Mesh(sharedPlaneGeo, innerCircleMat);
  innerCircleMesh.rotation.x = -Math.PI / 2;
  innerCircleMesh.position.y = 0.06;
  innerCircleMesh.scale.setScalar(3.0);
  group.add(innerCircleMesh);

  // The technological ring gives Thunder Bloom a large, readable magical footprint
  // while the inner glyph stays crisp at the point of impact.
  const stormGlyphMat = new THREE.MeshBasicMaterial({
    map: hovlTechCircle2Texture || cfxrAuraRunicTexture,
    color: new THREE.Color('#b477ff'),
    transparent: true,
    opacity: 0.82,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const stormGlyph = new THREE.Mesh(sharedPlaneGeo, stormGlyphMat);
  stormGlyph.rotation.x = -Math.PI / 2;
  stormGlyph.position.y = 0.025;
  stormGlyph.scale.setScalar(6.65);
  group.add(stormGlyph);

  const impactGlowMat = new THREE.MeshBasicMaterial({
    map: hovlGlowTexture || hovlFlareTexture,
    color: new THREE.Color('#e8c7ff'),
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const impactGlow = new THREE.Mesh(sharedPlaneGeo, impactGlowMat);
  impactGlow.rotation.x = -Math.PI / 2;
  impactGlow.position.y = 0.1;
  impactGlow.scale.setScalar(0.3);
  group.add(impactGlow);

  // 3c. Center Lightning Ground Impact Crack
  const crackMat = new THREE.MeshBasicMaterial({
    map: cfxrElectricArcTexture || hovlCrackTexture || hovlCraterTexture,
    color: new THREE.Color('#ffffff'), // White Electric Core
    transparent: true,
    opacity: 1,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const crackMesh = new THREE.Mesh(sharedPlaneGeo, crackMat);
  crackMesh.rotation.x = -Math.PI / 2;
  crackMesh.rotation.z = Math.random() * Math.PI;
  crackMesh.position.y = 0.08;
  crackMesh.scale.setScalar(2.0);
  group.add(crackMesh);

  // 4. Expanding Cyan Electric Shockwave Ring (Expands to r=3.5m / diameter 7.0m)
  const ringMat = new THREE.MeshBasicMaterial({
    map: cfxrRingElectricTexture || hovlFlashTexture,
    color: new THREE.Color('#00e5ff'),
    transparent: true,
    opacity: 1,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const ringMesh = new THREE.Mesh(sharedPlaneGeo, ringMat);
  ringMesh.rotation.x = -Math.PI / 2;
  ringMesh.position.y = 0.09;
  ringMesh.scale.setScalar(1.5);
  group.add(ringMesh);

  // 5. 8 Radial Petals Starburst Rays (Erupting Outward to r=3.5m)
  const petalGroup = new THREE.Group();
  petalGroup.position.set(0, 0.3, 0);
  group.add(petalGroup);

  const petalMat = new THREE.MeshBasicMaterial({
    map: cfxrRayBlurTexture || cfxrSpikeFadeTexture,
    color: new THREE.Color('#ff22e0'),
    transparent: true,
    opacity: 1,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });

  for (let i = 0; i < 8; i++) {
    const rayMesh = new THREE.Mesh(sharedRayGeo, petalMat);
    const angle = (i * Math.PI * 2) / 8;
    rayMesh.rotation.y = angle;
    rayMesh.rotation.x = Math.PI * 0.32;
    rayMesh.position.set(Math.sin(angle) * 0.5, 0.2, Math.cos(angle) * 0.5);
    petalGroup.add(rayMesh);
  }

  // Secondary bolts arrive just after the central strike, making the bloom fan out
  // across the whole AOE instead of reading as a single straight bolt.
  const branchMat = new THREE.MeshBasicMaterial({
    map: cfxrElectricArcTexture || cfxrLineElectricTexture,
    color: new THREE.Color('#a6f8ff'),
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const branches: Array<{ mesh: THREE.Mesh; delay: number; phase: number }> = [];
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI * 2) / 8 + Math.PI / 8;
    const branch = new THREE.Mesh(sharedBeamGeo, branchMat);
    branch.position.set(Math.cos(angle) * 2.25, 3.6, Math.sin(angle) * 2.25);
    branch.rotation.set(Math.sin(angle) * 0.16, angle, Math.cos(angle) * 0.22);
    branch.scale.set(0.52, 0.01, 1);
    group.add(branch);
    branches.push({ mesh: branch, delay: 0.12 + (i % 4) * 0.045, phase: i * 0.8 });
  }

  const starMat = new THREE.MeshBasicMaterial({
    map: hovlStarTexture || cfxrMagicStarTexture,
    color: new THREE.Color('#ffffff'),
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const stars: Array<{ mesh: THREE.Mesh; angle: number; radius: number; rise: number }> = [];
  for (let i = 0; i < 20; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.sqrt(Math.random()) * 3.1;
    const star = new THREE.Mesh(sharedPlaneGeo, starMat);
    star.position.set(Math.cos(angle) * radius, 0.18 + Math.random() * 0.6, Math.sin(angle) * radius);
    star.rotation.set((Math.random() - 0.5) * 0.2, angle, Math.random() * Math.PI);
    star.scale.setScalar(0.07 + Math.random() * 0.15);
    group.add(star);
    stars.push({ mesh: star, angle, radius, rise: 2.4 + Math.random() * 3.3 });
  }

  // 6. High-Voltage Sparkle & Lightning Particle Debris
  const bloomAttr = sharedBloomGeo.attributes.position as THREE.BufferAttribute;
  const bloomArray = bloomAttr.array as Float32Array;

  for (let i = 0; i < bloomCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 6.0 + Math.random() * 9.5;
    const upSpeed = 4.0 + Math.random() * 8.5;

    bloomArray[i * 3] = (Math.random() - 0.5) * 0.4;
    bloomArray[i * 3 + 1] = 0.5;
    bloomArray[i * 3 + 2] = (Math.random() - 0.5) * 0.4;

    bloomVelocities[i].set(Math.cos(angle) * speed, upSpeed, Math.sin(angle) * speed);
  }
  bloomAttr.needsUpdate = true;

  const bloomMat = new THREE.PointsMaterial({
    map: cfxrElectricSparkTexture || cfxrMagicStarTexture || hovlFlashTexture,
    size: 0.8,
    transparent: true,
    opacity: 1,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const bloomPoints = new THREE.Points(sharedBloomGeo, bloomMat);
  group.add(bloomPoints);

  // 7. Blinding Pooled Light Flash Peak (16.0 Intensity)
  flashVfxLight('#e544ff', targetPos.x, targetPos.y + 1.2, targetPos.z, 0.75, 16.0);

  let elapsed = 0;
  const duration = 1.05;

  activeVfxList.push({
    update: (dt: number) => {
      elapsed += dt;
      const progress = elapsed / duration;

      // Sky Thunder Bolt Impact animation: rapid drop and flicker fade
      const impactProgress = THREE.MathUtils.clamp(elapsed / 0.58, 0, 1);
      const fadeProgress = THREE.MathUtils.clamp((elapsed - 0.45) / 0.6, 0, 1);
      mainBeamGroup.position.y = Math.max(0, 6.0 - impactProgress * 5.5);
      beamMat.opacity = Math.max(0, (1 - fadeProgress * 1.35) * (Math.random() > 0.15 ? 1 : 0.4));
      coreBeamMat.opacity = Math.max(0, (1 - fadeProgress * 1.5) * (Math.random() > 0.1 ? 1 : 0.3));

      // Sky Arcs flicker & expand
      arcMat.opacity = Math.max(0, (1 - fadeProgress * 1.38) * (Math.random() > 0.2 ? 1 : 0.3));

      // Dual Ground Magic Circles spin & expand cleanly to r=3.5m (7.0m diameter)
      outerCircleMesh.rotation.z += dt * 3.1;
      outerCircleMesh.scale.setScalar(4.15 + impactProgress * 2.85); // expands to 7.0m diameter (r=3.5m)
      outerCircleMat.opacity = Math.max(0, 1 - progress * 0.9);

      innerCircleMesh.rotation.z -= dt * 6.0; // Counter-rotating inner lotus circle
      innerCircleMesh.scale.setScalar(3.0 + impactProgress * 3.15);
      innerCircleMat.opacity = Math.max(0, 1 - progress * 1.1);

      stormGlyph.rotation.z -= dt * 2.15;
      stormGlyph.scale.setScalar(6.65 + Math.sin(elapsed * 7.0) * 0.18);
      stormGlyphMat.opacity = Math.max(0, 0.82 - progress * 0.92);
      impactGlow.scale.setScalar(0.3 + impactProgress * 5.2);
      impactGlowMat.opacity = Math.max(0, 0.95 - impactProgress * 1.08);

      crackMesh.scale.setScalar(2.0 + progress * 3.0);
      crackMat.opacity = Math.max(0, 1 - progress * 1.2);

      ringMesh.scale.setScalar(1.0 + impactProgress * 6.0); // Expands out to 7.0m diameter
      ringMat.opacity = Math.max(0, 1 - impactProgress * 1.5);

      petalGroup.scale.set(1.2 + impactProgress * 3.7, 1 + impactProgress * 3.6, 1.2 + impactProgress * 3.7);
      petalMat.opacity = Math.max(0, 1 - progress * 1.4);

      branches.forEach((branch) => {
        const branchProgress = THREE.MathUtils.clamp((elapsed - branch.delay) / 0.3, 0, 1);
        branch.mesh.scale.y = Math.max(0.01, Math.sin(branchProgress * Math.PI) * 0.82);
        branch.mesh.rotation.z += dt * Math.sin(branch.phase) * 0.18;
      });
      branchMat.opacity = Math.max(0, 0.9 - fadeProgress * 1.22);

      stars.forEach((star, index) => {
        const swirlAngle = star.angle + elapsed * (1.2 + index * 0.018);
        star.mesh.position.x = Math.cos(swirlAngle) * (star.radius + impactProgress * 0.42);
        star.mesh.position.z = Math.sin(swirlAngle) * (star.radius + impactProgress * 0.42);
        star.mesh.position.y += star.rise * dt;
        star.mesh.rotation.z += dt * (1.5 + index * 0.05);
      });
      starMat.opacity = Math.max(0, 0.95 - progress * 1.05);

      for (let i = 0; i < bloomCount; i++) {
        const vel = bloomVelocities[i];
        bloomArray[i * 3] += vel.x * dt;
        bloomArray[i * 3 + 1] += vel.y * dt;
        bloomArray[i * 3 + 2] += vel.z * dt;
        vel.y -= 12.0 * dt;
      }
      bloomAttr.needsUpdate = true;
      bloomMat.opacity = Math.max(0, 1 - progress * 1.35);

      return elapsed >= duration;
    },
    dispose: () => {
      vfxScene?.remove(group);
      beamMat.dispose();
      coreBeamMat.dispose();
      arcMat.dispose();
      outerCircleMat.dispose();
      innerCircleMat.dispose();
      stormGlyphMat.dispose();
      impactGlowMat.dispose();
      crackMat.dispose();
      ringMat.dispose();
      petalMat.dispose();
      branchMat.dispose();
      starMat.dispose();
      bloomMat.dispose();
    },
  });
}

// ==========================================
// SKILL 14: Ice Snare (ðŸ§Š) â€” Circle Single (r=1.0m) Enclosing 3D Ice Crystal Cage
// ==========================================
export function spawnIceSnareVfx(targetPos: THREE.Vector3) {
  if (!vfxScene) return;
  const group = new THREE.Group();
  group.position.copy(targetPos);
  vfxScene.add(group);

  const runeMat = new THREE.MeshBasicMaterial({ map: hovlMagicCircleTexture, color: '#6cf6ff', transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const rune = new THREE.Mesh(sharedPlaneGeo, runeMat);
  rune.rotation.x = -Math.PI / 2;
  rune.position.y = 0.04;
  rune.scale.setScalar(0.92);
  group.add(rune);

  const ringMat = new THREE.MeshBasicMaterial({ map: hovlCircle2Texture, color: '#dcffff', transparent: true, opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(sharedPlaneGeo, ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.07;
  ring.scale.setScalar(0.12);
  group.add(ring);

  const freezeFlashMat = new THREE.MeshBasicMaterial({ map: hovlFlashFree1Texture, color: '#eaffff', transparent: true, opacity: 0.96, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const freezeFlash = new THREE.Mesh(sharedPlaneGeo, freezeFlashMat);
  freezeFlash.rotation.x = -Math.PI / 2;
  freezeFlash.position.y = 0.105;
  freezeFlash.scale.setScalar(0.1);
  group.add(freezeFlash);

  const iceMat = new THREE.MeshBasicMaterial({ color: '#31cfea', transparent: true, opacity: 0.74, depthWrite: false, blending: THREE.NormalBlending, side: THREE.DoubleSide });
  const iceCoreMat = new THREE.MeshBasicMaterial({ color: '#efffff', transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const cageCrystals: Array<{ outer: THREE.Mesh; core: THREE.Mesh; startY: number; endY: number; scale: THREE.Vector3; delay: number }> = [];
  const crystalCount = 8;
  for (let i = 0; i < crystalCount; i++) {
    const angle = (i * Math.PI * 2) / crystalCount + Math.PI / 8;
    const scale = new THREE.Vector3(0.42 + (i % 3) * 0.06, 0.9 + (i % 3) * 0.16, 0.42 + (i % 3) * 0.06);
    const startY = -1.15;
    const endY = 0.62 + (i % 2) * 0.12;
    const outer = new THREE.Mesh(sharedCrystalGeo, iceMat);
    outer.position.set(Math.cos(angle) * 0.76, startY, Math.sin(angle) * 0.76);
    outer.rotation.set(Math.sin(angle) * 0.16, angle, Math.cos(angle) * 0.16);
    outer.scale.copy(scale);
    const core = new THREE.Mesh(sharedCrystalGeo, iceCoreMat);
    core.position.copy(outer.position);
    core.rotation.copy(outer.rotation);
    core.scale.copy(scale).multiplyScalar(0.44);
    group.add(outer, core);
    cageCrystals.push({ outer, core, startY, endY, scale, delay: (i % 4) * 0.04 });
  }

  const bandMat = new THREE.MeshBasicMaterial({ color: '#a8ffff', transparent: true, opacity: 0.84, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const bands: THREE.Mesh[] = [];
  for (let i = 0; i < 3; i++) {
    const band = new THREE.Mesh(sharedSnareBandGeo, bandMat);
    band.rotation.x = -Math.PI / 2;
    band.position.y = 0.32 + i * 0.49;
    band.scale.setScalar(0.18 + i * 0.07);
    group.add(band);
    bands.push(band);
  }

  const snowMat = new THREE.MeshBasicMaterial({ map: hovlSnowflakeTexture, color: '#dfffff', transparent: true, opacity: 0.92, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const snowflakes: Array<{ mesh: THREE.Mesh; angle: number; radius: number; height: number; spin: number }> = [];
  for (let i = 0; i < 10; i++) {
    const mesh = new THREE.Mesh(sharedPlaneGeo, snowMat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.scale.setScalar(0.09 + (i % 3) * 0.035);
    group.add(mesh);
    snowflakes.push({ mesh, angle: (i * Math.PI * 2) / 10, radius: 0.42 + (i % 3) * 0.16, height: 0.14 + (i % 4) * 0.16, spin: i % 2 ? 4.2 : -4.2 });
  }

  flashVfxLight('#00ffff', targetPos.x, targetPos.y + 0.85, targetPos.z, 1.0, 14.0);

  let elapsed = 0;
  const duration = 1.0;
  activeVfxList.push({
    update: (dt: number) => {
      elapsed += dt;
      const progress = Math.min(1, elapsed / duration);
      const lock = Math.min(1, progress / 0.4);
      const lockEase = Math.sin((lock * Math.PI) / 2);
      rune.rotation.z += dt * 4.2;
      rune.scale.setScalar(0.92 + progress * 0.7);
      runeMat.opacity = Math.max(0, 0.9 - progress * 1.06);
      ring.rotation.z -= dt * 5.8;
      ring.scale.setScalar(0.1 + lockEase * 2.46);
      ringMat.opacity = Math.max(0, 0.95 - progress * 1.22);
      freezeFlash.scale.setScalar(0.08 + Math.sin(lock * Math.PI) * 1.55);
      freezeFlashMat.opacity = Math.max(0, 0.96 - progress * 2.15);
      cageCrystals.forEach(({ outer, core, startY, endY, scale, delay }) => {
        const rise = Math.min(1, Math.max(0, (progress - delay) / 0.34));
        const eased = Math.sin((rise * Math.PI) / 2);
        outer.position.y = startY + (endY - startY) * eased;
        core.position.y = outer.position.y + 0.02;
        outer.scale.copy(scale).multiplyScalar(0.58 + eased * 0.42);
        core.scale.copy(scale).multiplyScalar((0.22 + eased * 0.22) * (1 - progress * 0.12));
      });
      iceMat.opacity = Math.max(0, 0.8 - progress * 0.78);
      iceCoreMat.opacity = Math.max(0, 0.9 - progress * 0.96);
      bands.forEach((band, index) => {
        band.rotation.z += dt * (index % 2 ? -5.2 : 5.2);
        band.position.y = 0.28 + index * 0.49 + lockEase * 0.14;
        band.scale.setScalar(0.18 + index * 0.07 + lockEase * 0.78);
      });
      bandMat.opacity = Math.max(0, 0.84 - progress * 0.92);
      snowflakes.forEach(({ mesh, angle, radius, height, spin }) => {
        const orbit = angle + elapsed * spin;
        mesh.position.set(Math.cos(orbit) * radius, height + progress * 0.28, Math.sin(orbit) * radius);
        mesh.rotation.z += dt * spin;
      });
      snowMat.opacity = Math.max(0, 0.92 - progress * 1.05);
      return elapsed >= duration;
    },
    dispose: () => {
      vfxScene?.remove(group);
      runeMat.dispose();
      iceMat.dispose();
      iceCoreMat.dispose();
      ringMat.dispose();
      freezeFlashMat.dispose();
      bandMat.dispose();
      snowMat.dispose();
    },
  });
}

// ==========================================
// SKILL 15: Rootbound Gaze (ðŸŒ¿) â€” Circle Single (r=1.0m) Earthen Root Bind
// ==========================================
export function spawnRootboundGazeVfx(targetPos: THREE.Vector3) {
  if (!vfxScene) return;
  const group = new THREE.Group();
  group.position.copy(targetPos);
  group.scale.setScalar(1.18);
  vfxScene.add(group);

  const runeMat = new THREE.MeshBasicMaterial({ map: hovlMagicCircleTexture, color: '#93bd4f', transparent: true, opacity: 0.72, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const rune = new THREE.Mesh(sharedPlaneGeo, runeMat);
  rune.rotation.x = -Math.PI / 2;
  rune.rotation.z = Math.random() * Math.PI;
  rune.position.y = 0.022;
  rune.scale.setScalar(0.42);
  group.add(rune);

  // Keep the cast grounded: a fractured patch of soil and a muted impact flash replace the
  // bright energy bands. The restrained Hovl rune anchors the roots to the target area.
  const fractureMat = new THREE.MeshBasicMaterial({ alphaMap: hovlCraterTexture || hovlCrackTexture, color: '#70451f', transparent: true, opacity: 0.72, depthWrite: false, blending: THREE.NormalBlending, side: THREE.DoubleSide });
  const fracture = new THREE.Mesh(sharedPlaneGeo, fractureMat);
  fracture.rotation.x = -Math.PI / 2;
  fracture.rotation.z = Math.random() * Math.PI;
  fracture.position.y = 0.035;
  fracture.scale.setScalar(0.16);
  group.add(fracture);

  const impactMat = new THREE.MeshBasicMaterial({ map: hovlFlashFree2Texture || hovlFlashTexture, color: '#d7a55f', transparent: true, opacity: 0.62, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const impact = new THREE.Mesh(sharedPlaneGeo, impactMat);
  impact.rotation.x = -Math.PI / 2;
  impact.position.y = 0.055;
  impact.scale.setScalar(0.04);
  group.add(impact);

  // Hovl's Stones Hit prefab starts with a compact Point1 glow before the debris burst.
  const hitGlowMat = new THREE.SpriteMaterial({ map: hovlPointTexture, color: '#d2b36a', transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending });
  const hitGlow = new THREE.Sprite(hitGlowMat);
  hitGlow.position.y = 0.34;
  hitGlow.scale.setScalar(0.01);
  group.add(hitGlow);

  const rootMat = new THREE.MeshStandardMaterial({ color: '#6a3d1e', roughness: 0.98, metalness: 0, flatShading: true, transparent: true, opacity: 0.98, side: THREE.DoubleSide });
  const knotMat = new THREE.MeshStandardMaterial({ color: '#925c31', roughness: 1, metalness: 0, flatShading: true, transparent: true, opacity: 0.94 });
  const rootGeometries: THREE.BufferGeometry[] = [];
  const roots: Array<{ mesh: THREE.Mesh; delay: number; sway: number }> = [];
  const knots: Array<{ mesh: THREE.Mesh; delay: number; scale: number }> = [];
  const knotGeo = new THREE.DodecahedronGeometry(0.22, 0);

  // Six low, thick paths break out of the soil and curl tightly around the victim's ankles.
  // Their height stays below the waist so they read as physical roots rather than green energy bands.
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI * 2) / 6 + Math.PI / 10;
    const curl = (i % 2 ? 1 : -1) * (0.2 + (i % 3) * 0.035);
    const innerAngle = angle - curl * 1.45;
    const points = [
      new THREE.Vector3(Math.cos(angle) * 1.46, 0.025, Math.sin(angle) * 1.46),
      new THREE.Vector3(Math.cos(angle + curl) * 1.02, 0.07 + (i % 2) * 0.025, Math.sin(angle + curl) * 1.02),
      new THREE.Vector3(Math.cos(angle + curl * 0.42) * 0.62, 0.13 + (i % 3) * 0.035, Math.sin(angle + curl * 0.42) * 0.62),
      new THREE.Vector3(Math.cos(innerAngle) * 0.31, 0.5 + (i % 2) * 0.08, Math.sin(innerAngle) * 0.31),
    ];
    const rootGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 12, 0.11 + (i % 3) * 0.013, 5, false);
    rootGeometries.push(rootGeo);
    const root = new THREE.Mesh(rootGeo, rootMat);
    root.scale.setScalar(0.001);
    root.renderOrder = 3;
    group.add(root);
    roots.push({ mesh: root, delay: 0.045 + (i % 4) * 0.045, sway: (i % 2 ? 1 : -1) * (0.32 + (i % 3) * 0.08) });

    const knot = new THREE.Mesh(knotGeo, knotMat);
    knot.position.set(Math.cos(innerAngle) * 0.4, 0.075, Math.sin(innerAngle) * 0.4);
    knot.rotation.set(Math.random() * 1.2, angle, Math.random() * 1.2);
    knot.scale.setScalar(0.001);
    group.add(knot);
    knots.push({ mesh: knot, delay: 0.11 + (i % 3) * 0.05, scale: 0.72 + (i % 3) * 0.14 });
  }

  // The original Stones Hit prefab renders Stone.png as camera-facing particles. Sprites keep
  // that Hovl silhouette readable from the game's isometric camera without extra geometry.
  const stoneMat = new THREE.SpriteMaterial({ map: hovlStoneTexture, color: '#846041', transparent: true, opacity: 0.94, depthWrite: false, blending: THREE.NormalBlending });
  const soilChunks: Array<{ mesh: THREE.Sprite; velocity: THREE.Vector3; baseScale: number }> = [];
  for (let i = 0; i < 9; i++) {
    const angle = Math.random() * Math.PI * 2;
    const chunk = new THREE.Sprite(stoneMat);
    const size = 0.14 + Math.random() * 0.12;
    chunk.position.set(Math.cos(angle) * (0.15 + Math.random() * 0.38), 0.045, Math.sin(angle) * (0.15 + Math.random() * 0.38));
    chunk.scale.setScalar(size);
    group.add(chunk);
    soilChunks.push({
      mesh: chunk,
      velocity: new THREE.Vector3(Math.cos(angle) * (1.35 + Math.random() * 1.25), 2.25 + Math.random() * 1.7, Math.sin(angle) * (1.35 + Math.random() * 1.25)),
      baseScale: size,
    });
  }

  // SmokeFree1 is the exact alpha-backed texture used by the Hovl Dust Puff prefab.
  const dustMat = new THREE.SpriteMaterial({ map: hovlSmokeFree1Texture, color: '#8f6b45', transparent: true, opacity: 0.46, depthWrite: false, blending: THREE.NormalBlending });
  const dust: Array<{ mesh: THREE.Sprite; velocity: THREE.Vector3; growth: number }> = [];
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI * 2) / 8 + Math.random() * 0.22;
    const puff = new THREE.Sprite(dustMat);
    puff.position.set(Math.cos(angle) * 0.28, 0.08 + Math.random() * 0.08, Math.sin(angle) * 0.28);
    puff.scale.setScalar(0.32 + Math.random() * 0.2);
    group.add(puff);
    dust.push({ mesh: puff, velocity: new THREE.Vector3(Math.cos(angle) * (0.75 + Math.random() * 0.55), 0.72 + Math.random() * 0.55, Math.sin(angle) * (0.75 + Math.random() * 0.55)), growth: 0.7 + Math.random() * 0.38 });
  }

  const sparkMat = new THREE.SpriteMaterial({ map: hovlPointTexture, color: '#d8b858', transparent: true, opacity: 0.86, depthWrite: false, blending: THREE.AdditiveBlending });
  const sparks: Array<{ mesh: THREE.Sprite; velocity: THREE.Vector3 }> = [];
  for (let i = 0; i < 14; i++) {
    const angle = Math.random() * Math.PI * 2;
    const spark = new THREE.Sprite(sparkMat);
    spark.position.set((Math.random() - 0.5) * 0.3, 0.16 + Math.random() * 0.12, (Math.random() - 0.5) * 0.3);
    spark.scale.setScalar(0.045 + Math.random() * 0.04);
    group.add(spark);
    sparks.push({ mesh: spark, velocity: new THREE.Vector3(Math.cos(angle) * (1.0 + Math.random() * 1.3), 1.7 + Math.random() * 1.7, Math.sin(angle) * (1.0 + Math.random() * 1.3)) });
  }

  flashVfxLight('#c28a48', targetPos.x, targetPos.y + 0.55, targetPos.z, 0.52, 6.0);

  let elapsed = 0;
  const duration = 1.14;
  activeVfxList.push({
    update: (dt: number) => {
      elapsed += dt;
      const progress = Math.min(1, elapsed / duration);
      const burst = THREE.MathUtils.clamp(elapsed / 0.3, 0, 1);
      const burstEase = Math.sin((burst * Math.PI) / 2);
      const fade = THREE.MathUtils.clamp((elapsed - 0.68) / 0.42, 0, 1);

      rune.rotation.z -= dt * 1.45;
      rune.scale.setScalar(0.42 + burstEase * 2.05 + progress * 0.12);
      runeMat.opacity = Math.max(0, 0.72 - progress * 0.84);
      fracture.rotation.z += dt * 0.5;
      fracture.scale.setScalar(0.16 + burstEase * 2.4 + progress * 0.14);
      fractureMat.opacity = Math.max(0, 0.76 - progress * 0.94);
      impact.scale.setScalar(0.04 + Math.sin(burst * Math.PI) * 1.85);
      impactMat.opacity = Math.max(0, 0.62 - burst * 1.75);
      hitGlow.scale.setScalar(0.04 + Math.sin(burst * Math.PI) * 1.28);
      hitGlowMat.opacity = Math.max(0, 0.7 - burst * 1.1);

      roots.forEach(({ mesh, delay, sway }) => {
        const entry = THREE.MathUtils.clamp((elapsed - delay) / 0.32, 0, 1);
        const grow = 0.06 + Math.sin(entry * Math.PI * 0.5) * 0.94;
        mesh.scale.setScalar(grow);
        mesh.position.y = -0.16 * (1 - entry);
        mesh.rotation.y += dt * sway * (1 - fade) * 0.35;
      });
      rootMat.opacity = Math.max(0, 0.98 - fade * 0.92);

      knots.forEach(({ mesh, delay, scale }) => {
        const entry = THREE.MathUtils.clamp((elapsed - delay) / 0.2, 0, 1);
        mesh.scale.setScalar(scale * (0.15 + entry * 0.85));
        mesh.position.y = 0.045 + entry * 0.07;
      });
      knotMat.opacity = Math.max(0, 0.94 - fade * 1.02);

      soilChunks.forEach(({ mesh, velocity, baseScale }) => {
        mesh.position.addScaledVector(velocity, dt);
        velocity.y -= 12.5 * dt;
        if (mesh.position.y < 0.035) {
          mesh.position.y = 0.035;
          velocity.y *= -0.18;
          velocity.x *= 0.72;
          velocity.z *= 0.72;
        }
        mesh.scale.setScalar(baseScale * (1 - fade * 0.35));
      });
      stoneMat.opacity = Math.max(0, 0.94 - fade * 0.9);

      dust.forEach(({ mesh, velocity, growth }) => {
        mesh.position.addScaledVector(velocity, dt);
        velocity.y -= 1.25 * dt;
        mesh.scale.multiplyScalar(1 + dt * growth);
      });
      dustMat.opacity = Math.max(0, 0.46 - progress * 0.57);

      sparks.forEach(({ mesh, velocity }) => {
        mesh.position.addScaledVector(velocity, dt);
        velocity.y -= 5.5 * dt;
      });
      sparkMat.opacity = Math.max(0, 0.86 - progress * 1.04);
      return elapsed >= duration;
    },
    dispose: () => {
      vfxScene?.remove(group);
      rootGeometries.forEach((geometry) => geometry.dispose());
      knotGeo.dispose();
      runeMat.dispose();
      fractureMat.dispose();
      impactMat.dispose();
      hitGlowMat.dispose();
      rootMat.dispose();
      knotMat.dispose();
      stoneMat.dispose();
      dustMat.dispose();
      sparkMat.dispose();
    },
  });
}
