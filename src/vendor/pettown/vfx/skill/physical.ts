// Weapon and Neutral skills — no elemental tint, readability comes from motion.
//
// Split out of skillVfx.ts; see core.ts for the shared pools.

import * as THREE from 'three';
import {
  activeVfxList,
  cfxrAuraRaysTexture,
  cfxrAuraRunicTexture,
  cfxrFlareTexture,
  cfxrHitTriangleTexture,
  cfxrMagicStarTexture,
  cfxrRayBlurTexture,
  cfxrRingElectricTexture,
  cfxrRingIceTexture,
  cfxrSpikeFadeTexture,
  cfxrWaterSplashTexture,
  flashVfxLight,
  hovlArrowTexture,
  hovlCircle2Texture,
  hovlCircleTexture,
  hovlFlareTexture,
  hovlFlashFree1Texture,
  hovlFlashTexture,
  hovlGlowTexture,
  hovlMagicCircle2Texture,
  hovlMagicCircleTexture,
  hovlPointTexture,
  hovlProjectileTexture,
  hovlSlashTexture,
  hovlSmokeFree1Texture,
  hovlStarTexture,
  hovlTechCircle2Texture,
  hovlTrailTexture,
  sharedCrystalGeo,
  sharedEmberCoreGeo,
  sharedPillarGeo,
  sharedPlaneGeo,
  sharedRayGeo,
  sharedSlashGeo,
  sharedSparkGeo,
  sparkCount,
  sparkVelocities,
  vfxScene,
} from './core.ts';

const BASIC_BOW_PROJECTILE_COLORS: Record<string, string> = {
  Fire: '#ff8d5b',
  Water: '#70dcff',
  Wind: '#b6ffc1',
  Earth: '#f0c978',
  Poison: '#b6f060',
  Holy: '#fff0a4',
  Shadow: '#b998ff',
  Ghost: '#8eeaff',
  Undead: '#bdc4aa',
  Neutral: '#ffe1a6',
};

const PUSHBACK_ARROW_CHARGE_DURATION = 0.22;
const PUSHBACK_ARROW_FALLBACK_CHARGE_DURATION = 0.08;

function getPushbackArrowTravelDuration(distance: number) {
  return distance > 0.05 ? THREE.MathUtils.clamp(distance / 24, 0.16, 0.42) : 0.01;
}

// Keep presentation consumers on the exact same timing contract as the travelling VFX.
export function getPushbackArrowImpactDelaySeconds(casterPos: THREE.Vector3 | undefined, targetPos: THREE.Vector3) {
  const origin = casterPos ?? targetPos;
  return (casterPos ? PUSHBACK_ARROW_CHARGE_DURATION : PUSHBACK_ARROW_FALLBACK_CHARGE_DURATION)
    + getPushbackArrowTravelDuration(origin.distanceTo(targetPos));
}

// Basic bow attacks need a readable travel path, but they must remain cosmetic: the server
// still owns hit validation and damage. CFXR's flare is the bolt core and its ray texture makes
// a short, directional wake without allocating particle buffers for every F press.
export function spawnBasicBowProjectileVfx(casterPos: THREE.Vector3, targetPos: THREE.Vector3, element = 'Neutral') {
  if (!vfxScene) return;
  const start = casterPos.clone();
  const end = targetPos.clone();
  const displacement = end.clone().sub(start);
  if (![start.x, start.y, start.z, end.x, end.y, end.z].every(Number.isFinite) || displacement.lengthSq() < 0.0025) return;

  const distance = displacement.length();
  const direction = displacement.normalize();
  const flightDuration = THREE.MathUtils.clamp(distance / 14, 0.22, 0.45);
  const color = new THREE.Color(BASIC_BOW_PROJECTILE_COLORS[element] || BASIC_BOW_PROJECTILE_COLORS.Neutral);
  const group = new THREE.Group();
  group.position.copy(start);
  group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
  vfxScene.add(group);

  const coreMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.98, depthWrite: false, blending: THREE.AdditiveBlending });
  const core = new THREE.Mesh(sharedEmberCoreGeo, coreMat);
  core.scale.setScalar(0.28);
  group.add(core);

  const flareMat = new THREE.SpriteMaterial({ map: cfxrFlareTexture, color: color.clone().lerp(new THREE.Color('#fffdf0'), 0.58), transparent: true, opacity: 0.86, depthWrite: false, blending: THREE.AdditiveBlending });
  const flare = new THREE.Sprite(flareMat);
  flare.scale.set(0.32, 0.14, 1);
  group.add(flare);

  const trailMat = new THREE.MeshBasicMaterial({ map: cfxrRayBlurTexture, color, transparent: true, opacity: 0.64, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const trail = new THREE.Mesh(sharedRayGeo, trailMat);
  trail.position.y = -0.42;
  trail.rotation.z = Math.PI;
  trail.scale.set(0.13, 0.28, 1);
  group.add(trail);

  let elapsed = 0;
  activeVfxList.push({
    update: (dt: number) => {
      elapsed += dt;
      const flight = THREE.MathUtils.clamp(elapsed / flightDuration, 0, 1);
      const eased = flight * flight * (3 - 2 * flight);
      group.position.lerpVectors(start, end, eased);
      const fade = flight < 0.84 ? 1 : 1 - (flight - 0.84) / 0.16;
      const pulse = 1 + Math.sin(elapsed * 36) * 0.08;
      core.scale.setScalar((0.28 + flight * 0.04) * pulse);
      flare.scale.set(0.32 + flight * 0.06, 0.14 + flight * 0.03, 1);
      trail.scale.set(0.13, 0.28 + flight * 0.06, 1);
      coreMat.opacity = 0.98 * Math.max(0, fade);
      flareMat.opacity = 0.86 * Math.max(0, fade);
      trailMat.opacity = 0.64 * Math.max(0, fade * fade);
      if (flight >= 1 && elapsed - flightDuration < dt) flashVfxLight(color.getStyle(), end.x, end.y, end.z, 0.12, 2.6);
      return elapsed >= flightDuration;
    },
    dispose: () => {
      vfxScene?.remove(group);
      coreMat.dispose();
      flareMat.dispose();
      trailMat.dispose();
    },
  });
}

export function spawnPawStrikeVfx(targetPos: THREE.Vector3) {
  if (!vfxScene) return;

  const group = new THREE.Group();
  group.position.copy(targetPos);
  vfxScene.add(group);

  const clawGroup = new THREE.Group();
  clawGroup.position.set(0, 0.85, 0);
  group.add(clawGroup);

  const slashMat = new THREE.MeshBasicMaterial({
    map: hovlSlashTexture,
    color: new THREE.Color('#ffaa22'),
    transparent: true,
    opacity: 1,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });

  const clawAngles = [-0.35, 0, 0.35];
  clawAngles.forEach((angle, index) => {
    const mesh = new THREE.Mesh(sharedSlashGeo, slashMat);
    mesh.position.set((index - 1) * 0.3, (index % 2) * 0.12, 0);
    mesh.rotation.z = angle - 0.25;
    mesh.rotation.y = (Math.random() - 0.5) * 0.25;
    clawGroup.add(mesh);
  });

  const posAttr = sharedSparkGeo.attributes.position as THREE.BufferAttribute;
  const posArray = posAttr.array as Float32Array;

  for (let i = 0; i < sparkCount; i++) {
    posArray[i * 3] = (Math.random() - 0.5) * 0.15;
    posArray[i * 3 + 1] = 0.85 + (Math.random() - 0.5) * 0.15;
    posArray[i * 3 + 2] = (Math.random() - 0.5) * 0.15;

    const angle = Math.random() * Math.PI * 2;
    const speed = 2.8 + Math.random() * 3.5;
    const up = (Math.random() - 0.1) * 2.5;
    sparkVelocities[i].set(Math.cos(angle) * speed, up, Math.sin(angle) * speed);
  }
  posAttr.needsUpdate = true;

  const sparkMat = new THREE.PointsMaterial({
    map: cfxrHitTriangleTexture || hovlFlashTexture,
    size: 0.45,
    transparent: true,
    opacity: 1,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const sparkPoints = new THREE.Points(sharedSparkGeo, sparkMat);
  group.add(sparkPoints);

  flashVfxLight('#ffaa22', targetPos.x, targetPos.y + 0.85, targetPos.z, 0.35, 6);

  let elapsed = 0;
  const duration = 0.38;

  activeVfxList.push({
    update: (dt: number) => {
      elapsed += dt;
      const progress = elapsed / duration;

      slashMat.opacity = Math.max(0, 1 - progress * 1.6);
      clawGroup.scale.setScalar(1 + progress * 0.65);

      for (let i = 0; i < sparkCount; i++) {
        const vel = sparkVelocities[i];
        posArray[i * 3] += vel.x * dt;
        posArray[i * 3 + 1] += vel.y * dt;
        posArray[i * 3 + 2] += vel.z * dt;
        vel.y -= 10.5 * dt;
      }
      posAttr.needsUpdate = true;
      sparkMat.opacity = Math.max(0, 1 - progress * 1.5);

      return elapsed >= duration;
    },
    dispose: () => {
      vfxScene?.remove(group);
      slashMat.dispose();
      sparkMat.dispose();
    },
  });
}

// ==========================================
// SKILL 7: Taunting Bark (ðŸ“£) â€” Ground AOE Sonic Wave & Gold Taunt Ring
// ==========================================
export function spawnTauntingBarkVfx(targetPos: THREE.Vector3, radius = 1.5) {
  if (!vfxScene) return;
  // The former 1.5m visual radius remains the fallback. Scale the readable
  // ground ring to the gameplay AOE radius (3m at Lv.1 through 6m at Lv.10).
  const tauntRadius = Math.max(0.5, Number(radius) || 1.5);
  const radiusScale = tauntRadius / 1.5;
  const group = new THREE.Group();
  group.position.copy(targetPos);
  vfxScene.add(group);

  // Bark is a call that spreads from the enemy: a compact taunt seal followed by
  // several readable sound waves, rather than a generic spell explosion.
  const sealMat = new THREE.MeshBasicMaterial({
    map: hovlTechCircle2Texture || hovlMagicCircleTexture,
    color: new THREE.Color('#ffb526'),
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const sealMesh = new THREE.Mesh(sharedPlaneGeo, sealMat);
  sealMesh.rotation.x = -Math.PI / 2;
  sealMesh.position.y = 0.04;
  sealMesh.scale.setScalar(2.25 * radiusScale);
  group.add(sealMesh);

  const barkCoreMat = new THREE.MeshBasicMaterial({
    map: hovlFlashFree1Texture || hovlFlareTexture,
    color: new THREE.Color('#ffe4a0'),
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const barkCore = new THREE.Mesh(sharedPlaneGeo, barkCoreMat);
  barkCore.rotation.x = -Math.PI / 2;
  barkCore.position.y = 0.09;
  barkCore.scale.setScalar(0.2 * radiusScale);
  group.add(barkCore);

  const soundWaves: Array<{ mesh: THREE.Mesh; material: THREE.MeshBasicMaterial; delay: number }> = [];
  for (let i = 0; i < 3; i++) {
    const waveMat = new THREE.MeshBasicMaterial({
      map: hovlCircle2Texture || cfxrRingElectricTexture,
      color: new THREE.Color(i === 0 ? '#fff0b5' : '#ffbd34'),
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    const wave = new THREE.Mesh(sharedPlaneGeo, waveMat);
    wave.rotation.x = -Math.PI / 2;
    wave.position.y = 0.1 + i * 0.025;
    wave.scale.setScalar(0.01);
    group.add(wave);
    soundWaves.push({ mesh: wave, material: waveMat, delay: i * 0.13 });
  }

  const callMat = new THREE.MeshBasicMaterial({
    map: hovlArrowTexture || hovlTrailTexture,
    color: new THREE.Color('#ffd05c'),
    transparent: true,
    opacity: 0.8,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const calls: Array<{ mesh: THREE.Mesh; angle: number; delay: number; drift: number }> = [];
  for (let i = 0; i < 10; i++) {
    const angle = (i * Math.PI * 2) / 10 + Math.random() * 0.12;
    const call = new THREE.Mesh(sharedPlaneGeo, callMat);
    call.rotation.x = -Math.PI / 2;
    call.rotation.z = angle;
    call.position.set(Math.cos(angle) * 0.2 * radiusScale, 0.15, Math.sin(angle) * 0.2 * radiusScale);
    call.scale.set(0.01, 0.01, 1);
    group.add(call);
    calls.push({ mesh: call, angle, delay: 0.08 + (i % 4) * 0.04, drift: 1.35 + Math.random() * 0.7 });
  }

  const sparkMat = new THREE.MeshBasicMaterial({
    map: hovlStarTexture || cfxrMagicStarTexture,
    color: new THREE.Color('#fff4c9'),
    transparent: true,
    opacity: 0.88,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const sparks: Array<{ mesh: THREE.Mesh; angle: number; rise: number }> = [];
  for (let i = 0; i < 12; i++) {
    const angle = Math.random() * Math.PI * 2;
    const spark = new THREE.Mesh(sharedPlaneGeo, sparkMat);
    const sparkDistance = (0.18 + Math.random() * 0.8) * radiusScale;
    spark.position.set(Math.cos(angle) * sparkDistance, 0.22 + Math.random() * 0.26, Math.sin(angle) * sparkDistance);
    spark.rotation.set((Math.random() - 0.5) * 0.2, angle, Math.random() * Math.PI);
    spark.scale.setScalar(0.06 + Math.random() * 0.11);
    group.add(spark);
    sparks.push({ mesh: spark, angle, rise: 0.7 + Math.random() * 1.2 });
  }

  flashVfxLight('#ffcc00', targetPos.x, targetPos.y + 0.8, targetPos.z, 0.55, 10.0 * radiusScale);

  let elapsed = 0;
  const duration = 0.9;
  activeVfxList.push({
    update: (dt: number) => {
      elapsed += dt;
      const progress = elapsed / duration;
      const callProgress = THREE.MathUtils.clamp(elapsed / 0.55, 0, 1);
      sealMesh.rotation.z += dt * 2.6;
      sealMesh.scale.setScalar((2.25 + callProgress * 0.34) * radiusScale);
      sealMat.opacity = Math.max(0, 0.9 - progress * 1.05);
      barkCore.scale.setScalar((0.18 + callProgress * 1.8) * radiusScale);
      barkCoreMat.opacity = Math.max(0, 0.9 - callProgress * 1.4);

      soundWaves.forEach((wave) => {
        const waveProgress = THREE.MathUtils.clamp((elapsed - wave.delay) / 0.55, 0, 1);
        wave.mesh.scale.setScalar((0.18 + waveProgress * 2.85) * radiusScale);
        wave.material.opacity = Math.max(0, 0.88 - waveProgress * 1.05);
      });

      calls.forEach((call) => {
        const localProgress = THREE.MathUtils.clamp((elapsed - call.delay) / 0.5, 0, 1);
        const distance = (0.22 + localProgress * call.drift) * radiusScale;
        call.mesh.position.x = Math.cos(call.angle) * distance;
        call.mesh.position.z = Math.sin(call.angle) * distance;
        call.mesh.position.y = 0.14 + Math.sin(localProgress * Math.PI) * 0.18;
        call.mesh.scale.setScalar(Math.max(0.01, 0.1 + Math.sin(localProgress * Math.PI) * 0.22));
      });
      callMat.opacity = Math.max(0, 0.8 - progress * 0.9);

      sparks.forEach((spark, index) => {
        spark.mesh.position.y += spark.rise * dt;
        spark.mesh.position.x += Math.cos(spark.angle + elapsed * 3.0) * dt * 0.14;
        spark.mesh.position.z += Math.sin(spark.angle + elapsed * 3.0) * dt * 0.14;
        spark.mesh.rotation.z += dt * (1.2 + index * 0.12);
      });
      sparkMat.opacity = Math.max(0, 0.88 - progress * 0.98);
      return elapsed >= duration;
    },
    dispose: () => {
      vfxScene?.remove(group);
      sealMat.dispose();
      barkCoreMat.dispose();
      soundWaves.forEach((wave) => wave.material.dispose());
      callMat.dispose();
      sparkMat.dispose();
    },
  });
}

// ==========================================
// SKILL 8: Steady Paws (ðŸ›¡ï¸) â€” Divine Endure Shield Dome (r=1.4m)
// ==========================================
export function spawnSteadyPawsVfx(casterPos: THREE.Vector3) {
  if (!vfxScene) return;
  const group = new THREE.Group();
  group.position.copy(casterPos);
  vfxScene.add(group);

  // A defensive brace needs a low, readable anchor and a brief protective shell.
  const circleMat = new THREE.MeshBasicMaterial({
    map: cfxrAuraRunicTexture || hovlMagicCircleTexture,
    color: new THREE.Color('#ffd26c'),
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const circleMesh = new THREE.Mesh(sharedPlaneGeo, circleMat);
  circleMesh.rotation.x = -Math.PI / 2;
  circleMesh.position.y = 0.04;
  circleMesh.scale.setScalar(2.8);
  group.add(circleMesh);

  const braceMat = new THREE.MeshBasicMaterial({
    map: hovlTechCircle2Texture || hovlMagicCircle2Texture,
    color: new THREE.Color('#fff1bc'),
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const braceMesh = new THREE.Mesh(sharedPlaneGeo, braceMat);
  braceMesh.rotation.x = -Math.PI / 2;
  braceMesh.position.y = 0.075;
  braceMesh.scale.setScalar(2.55);
  group.add(braceMesh);

  const shieldGeo = new THREE.SphereGeometry(1.45, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2);
  const shieldMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color('#ffe6a0'),
    transparent: true,
    opacity: 0.075,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending,
  });
  const shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
  shieldMesh.position.y = 0.03;
  shieldMesh.scale.setScalar(0.04);
  group.add(shieldMesh);

  const pillarMat = new THREE.MeshBasicMaterial({
    map: cfxrAuraRaysTexture || hovlFlashTexture,
    color: new THREE.Color('#ffcf57'),
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const pillarMesh = new THREE.Mesh(sharedPillarGeo, pillarMat);
  pillarMesh.position.set(0, 1.6, 0);
  group.add(pillarMesh);

  const anchorMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color('#f4a923'),
    transparent: true,
    opacity: 0.72,
    depthWrite: true,
    blending: THREE.NormalBlending,
  });
  const anchors: Array<{ mesh: THREE.Mesh; delay: number }> = [];
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2 + Math.PI / 4;
    const anchor = new THREE.Mesh(sharedCrystalGeo, anchorMat);
    anchor.position.set(Math.cos(angle) * 1.04, 0.02, Math.sin(angle) * 1.04);
    anchor.scale.set(0.24, 0.01, 0.24);
    group.add(anchor);
    anchors.push({ mesh: anchor, delay: i * 0.055 });
  }

  const moteMat = new THREE.MeshBasicMaterial({
    map: hovlStarTexture || cfxrMagicStarTexture,
    color: new THREE.Color('#fff6d2'),
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const motes: Array<{ mesh: THREE.Mesh; angle: number; radius: number; rise: number }> = [];
  for (let i = 0; i < 12; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 0.25 + Math.random() * 0.95;
    const mote = new THREE.Mesh(sharedPlaneGeo, moteMat);
    mote.position.set(Math.cos(angle) * radius, 0.18 + Math.random() * 0.55, Math.sin(angle) * radius);
    mote.rotation.set((Math.random() - 0.5) * 0.18, angle, Math.random() * Math.PI);
    mote.scale.setScalar(0.06 + Math.random() * 0.11);
    group.add(mote);
    motes.push({ mesh: mote, angle, radius, rise: 0.45 + Math.random() * 0.75 });
  }

  flashVfxLight('#ffcc22', casterPos.x, casterPos.y + 0.8, casterPos.z, 0.75, 11.0);

  let elapsed = 0;
  const duration = 1.25;
  activeVfxList.push({
    update: (dt: number) => {
      elapsed += dt;
      const progress = elapsed / duration;
      const reveal = THREE.MathUtils.clamp(elapsed / 0.26, 0, 1);
      const fade = THREE.MathUtils.clamp((elapsed - 0.72) / 0.53, 0, 1);
      const domeScale = Math.sin(reveal * Math.PI * 0.5);
      circleMesh.rotation.z += dt * 1.9;
      circleMesh.scale.setScalar(2.8 + Math.sin(elapsed * 4.5) * 0.08);
      circleMat.opacity = Math.max(0, 0.9 - progress * 0.92);
      braceMesh.rotation.z -= dt * 2.7;
      braceMat.opacity = Math.max(0, 0.72 - progress * 0.86);

      shieldMesh.scale.setScalar(domeScale);
      shieldMesh.rotation.y += dt * 0.45;
      shieldMat.opacity = Math.max(0, 0.075 - fade * 0.1);

      pillarMesh.rotation.y -= dt * 2.2;
      pillarMesh.scale.set(0.82 + Math.sin(elapsed * 4.5) * 0.08, 0.75 + reveal * 0.34, 0.82 + Math.sin(elapsed * 4.5) * 0.08);
      pillarMat.opacity = Math.max(0, 0.55 - progress * 0.72);

      anchors.forEach((anchor) => {
        const localProgress = THREE.MathUtils.clamp((elapsed - anchor.delay) / 0.24, 0, 1);
        const height = Math.sin(localProgress * Math.PI * 0.5) * 0.7;
        anchor.mesh.scale.y = Math.max(0.01, height);
        anchor.mesh.position.y = height * 0.4;
      });
      anchorMat.opacity = Math.max(0, 0.72 - progress * 0.8);

      motes.forEach((mote, index) => {
        const orbitalAngle = mote.angle + elapsed * (0.75 + index * 0.02);
        mote.mesh.position.x = Math.cos(orbitalAngle) * mote.radius;
        mote.mesh.position.z = Math.sin(orbitalAngle) * mote.radius;
        mote.mesh.position.y += mote.rise * dt;
        mote.mesh.rotation.z += dt * (1.1 + index * 0.07);
      });
      moteMat.opacity = Math.max(0, 0.85 - progress * 0.93);
      return elapsed >= duration;
    },
    dispose: () => {
      vfxScene?.remove(group);
      circleMat.dispose();
      braceMat.dispose();
      shieldMat.dispose();
      shieldGeo.dispose();
      pillarMat.dispose();
      anchorMat.dispose();
      moteMat.dispose();
    },
  });
}

// ==========================================
// SKILL 9: Twin Fang Shot (ðŸ¹) â€” Circle Single (r=1.0m) Dual Energy Cross Slash
// ==========================================
export function spawnTwinFangShotVfx(targetPos: THREE.Vector3) {
  if (!vfxScene) return;
  const group = new THREE.Group();
  group.position.copy(targetPos);
  vfxScene.add(group);

  // Twin Fang is two distinct cuts. The first primes the target, the second snaps across it.
  const sealMat = new THREE.MeshBasicMaterial({
    map: hovlTechCircle2Texture || hovlMagicCircleTexture,
    color: new THREE.Color('#35ffd0'),
    transparent: true,
    opacity: 0.86,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const sealMesh = new THREE.Mesh(sharedPlaneGeo, sealMat);
  sealMesh.rotation.x = -Math.PI / 2;
  sealMesh.position.y = 0.04;
  sealMesh.scale.setScalar(1.85);
  group.add(sealMesh);

  const firstSlashMat = new THREE.MeshBasicMaterial({
    map: hovlSlashTexture,
    color: new THREE.Color('#50ffd8'),
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const secondSlashMat = new THREE.MeshBasicMaterial({
    map: hovlSlashTexture,
    color: new THREE.Color('#d6fff6'),
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });

  const firstGroup = new THREE.Group();
  firstGroup.position.set(-0.08, 0.95, 0);
  firstGroup.rotation.y = Math.PI * 0.18;
  group.add(firstGroup);
  const firstSlashA = new THREE.Mesh(sharedSlashGeo, firstSlashMat);
  firstSlashA.position.set(-0.26, 0.04, 0);
  firstSlashA.rotation.z = Math.PI * 0.31;
  const firstSlashB = new THREE.Mesh(sharedSlashGeo, firstSlashMat);
  firstSlashB.position.set(0.22, 0.02, 0);
  firstSlashB.rotation.z = Math.PI * 0.24;
  firstGroup.add(firstSlashA, firstSlashB);

  const secondGroup = new THREE.Group();
  secondGroup.position.set(0.08, 1.08, 0);
  secondGroup.rotation.y = -Math.PI * 0.22;
  group.add(secondGroup);
  const secondSlashA = new THREE.Mesh(sharedSlashGeo, secondSlashMat);
  secondSlashA.position.set(-0.24, 0.04, 0);
  secondSlashA.rotation.z = -Math.PI * 0.32;
  const secondSlashB = new THREE.Mesh(sharedSlashGeo, secondSlashMat);
  secondSlashB.position.set(0.24, -0.03, 0);
  secondSlashB.rotation.z = -Math.PI * 0.24;
  secondGroup.add(secondSlashA, secondSlashB);

  const impactMat = new THREE.MeshBasicMaterial({
    map: hovlFlashFree1Texture || hovlFlareTexture,
    color: new THREE.Color('#b7fff0'),
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const impactMesh = new THREE.Mesh(sharedPlaneGeo, impactMat);
  impactMesh.rotation.x = -Math.PI / 2;
  impactMesh.position.y = 0.1;
  impactMesh.scale.setScalar(0.01);
  group.add(impactMesh);

  const ringMat = new THREE.MeshBasicMaterial({
    map: hovlCircle2Texture || cfxrRingElectricTexture,
    color: new THREE.Color('#4affd6'),
    transparent: true,
    opacity: 0.84,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const cutRings: Array<{ mesh: THREE.Mesh; delay: number }> = [];
  for (let i = 0; i < 2; i++) {
    const ring = new THREE.Mesh(sharedPlaneGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.12 + i * 0.02;
    ring.scale.setScalar(0.01);
    group.add(ring);
    cutRings.push({ mesh: ring, delay: i * 0.2 + 0.06 });
  }

  const shardMat = new THREE.MeshBasicMaterial({
    map: hovlStarTexture || cfxrMagicStarTexture,
    color: new THREE.Color('#a8ffed'),
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const shards: Array<{ mesh: THREE.Mesh; velocity: THREE.Vector3; spin: number }> = [];
  for (let i = 0; i < 16; i++) {
    const angle = Math.random() * Math.PI * 2;
    const shard = new THREE.Mesh(sharedPlaneGeo, shardMat);
    shard.position.set((Math.random() - 0.5) * 0.25, 0.55 + Math.random() * 0.35, (Math.random() - 0.5) * 0.25);
    shard.rotation.set((Math.random() - 0.5) * 0.2, angle, Math.random() * Math.PI);
    shard.scale.setScalar(0.05 + Math.random() * 0.11);
    group.add(shard);
    shards.push({
      mesh: shard,
      velocity: new THREE.Vector3(Math.cos(angle) * (1.5 + Math.random() * 2.5), 1.8 + Math.random() * 2.1, Math.sin(angle) * (1.5 + Math.random() * 2.5)),
      spin: (Math.random() - 0.5) * 10,
    });
  }

  flashVfxLight('#00ffcc', targetPos.x, targetPos.y + 0.8, targetPos.z, 0.45, 12.0);

  let elapsed = 0;
  const duration = 0.78;
  activeVfxList.push({
    update: (dt: number) => {
      elapsed += dt;
      const progress = elapsed / duration;
      const firstProgress = THREE.MathUtils.clamp((elapsed - 0.04) / 0.32, 0, 1);
      const secondProgress = THREE.MathUtils.clamp((elapsed - 0.22) / 0.36, 0, 1);
      const finalPulse = THREE.MathUtils.clamp((elapsed - 0.3) / 0.34, 0, 1);

      sealMesh.rotation.z += dt * 3.5;
      sealMesh.scale.setScalar(1.85 + finalPulse * 0.4);
      sealMat.opacity = Math.max(0, 0.86 - progress * 1.06);

      firstGroup.scale.setScalar(0.65 + Math.sin(firstProgress * Math.PI * 0.5) * 1.5);
      firstGroup.rotation.z += dt * 1.1;
      firstSlashMat.opacity = Math.max(0, Math.sin(firstProgress * Math.PI) * 0.9);
      secondGroup.scale.setScalar(0.4 + Math.sin(secondProgress * Math.PI * 0.5) * 1.8);
      secondGroup.rotation.z -= dt * 1.35;
      secondSlashMat.opacity = Math.max(0, Math.sin(secondProgress * Math.PI) * 1.0);

      impactMesh.scale.setScalar(0.1 + finalPulse * 2.25);
      impactMat.opacity = Math.max(0, 0.9 - finalPulse * 1.2);
      cutRings.forEach((ring) => {
        const ringProgress = THREE.MathUtils.clamp((elapsed - ring.delay) / 0.38, 0, 1);
        ring.mesh.scale.setScalar(0.1 + ringProgress * 2.1);
      });
      ringMat.opacity = Math.max(0, 0.84 - progress * 1.12);

      shards.forEach((shard) => {
        shard.mesh.position.addScaledVector(shard.velocity, dt);
        shard.velocity.y -= 6.5 * dt;
        shard.mesh.rotation.z += dt * shard.spin;
      });
      shardMat.opacity = Math.max(0, 0.9 - progress * 1.08);
      return elapsed >= duration;
    },
    dispose: () => {
      vfxScene?.remove(group);
      sealMat.dispose();
      firstSlashMat.dispose();
      secondSlashMat.dispose();
      impactMat.dispose();
      ringMat.dispose();
      shardMat.dispose();
    },
  });
}

// ==========================================
// SKILL 10: Feather Rain (ðŸª¶) â€” Ground AOE (r=2.5m) Sky Feather Barrage
// ==========================================
export function spawnFeatherRainVfx(targetPos: THREE.Vector3) {
  if (!vfxScene) return;
  const group = new THREE.Group();
  group.position.copy(targetPos);
  vfxScene.add(group);

  const circleMat = new THREE.MeshBasicMaterial({
    map: cfxrAuraRunicTexture || hovlMagicCircleTexture,
    color: new THREE.Color('#00e5ff'),
    transparent: true,
    opacity: 1,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const circleMesh = new THREE.Mesh(sharedPlaneGeo, circleMat);
  circleMesh.rotation.x = -Math.PI / 2;
  circleMesh.position.y = 0.04;
  circleMesh.scale.setScalar(5.0);
  group.add(circleMesh);

  const ringMat = new THREE.MeshBasicMaterial({
    map: cfxrRingElectricTexture || hovlFlashTexture,
    color: new THREE.Color('#88ffff'),
    transparent: true,
    opacity: 1,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const ringMesh = new THREE.Mesh(sharedPlaneGeo, ringMat);
  ringMesh.rotation.x = -Math.PI / 2;
  ringMesh.position.y = 0.07;
  ringMesh.scale.setScalar(0.8);
  group.add(ringMesh);

  // A second, high runic circle makes the rain feel as though it is being called down
  // from the sky rather than simply appearing at the impact point.
  const skyCircleMat = new THREE.MeshBasicMaterial({
    map: hovlTechCircle2Texture || hovlMagicCircle2Texture,
    color: new THREE.Color('#d8ffff'),
    transparent: true,
    opacity: 0.82,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const skyCircle = new THREE.Mesh(sharedPlaneGeo, skyCircleMat);
  skyCircle.rotation.x = -Math.PI / 2;
  skyCircle.position.y = 8.6;
  skyCircle.scale.setScalar(4.25);
  group.add(skyCircle);

  const rainPulseMat = new THREE.MeshBasicMaterial({
    map: hovlGlowTexture || hovlFlareTexture,
    color: new THREE.Color('#b8ffff'),
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const rainPulse = new THREE.Mesh(sharedPlaneGeo, rainPulseMat);
  rainPulse.rotation.x = -Math.PI / 2;
  rainPulse.position.y = 0.1;
  rainPulse.scale.setScalar(0.35);
  group.add(rainPulse);

  const featherMat = new THREE.MeshBasicMaterial({
    map: hovlTrailTexture || cfxrSpikeFadeTexture,
    color: new THREE.Color('#a8f7ff'),
    transparent: true,
    opacity: 0.74,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });

  const impactMat = new THREE.MeshBasicMaterial({
    map: cfxrRingIceTexture || cfxrRingElectricTexture,
    color: new THREE.Color('#a9efff'),
    transparent: true,
    opacity: 0.58,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });

  const feathers: Array<{ mesh: THREE.Mesh; impact: THREE.Mesh; startY: number; delay: number; spin: number }> = [];
  for (let i = 0; i < 14; i++) {
    const feather = new THREE.Mesh(sharedRayGeo, featherMat);
    const angle = (i * Math.PI * 2) / 14 + (Math.random() - 0.5) * 0.3;
    const distance = Math.sqrt(Math.random()) * 2.25;
    const startY = 9.5 + Math.random() * 3.4;
    feather.position.set(Math.cos(angle) * distance, startY, Math.sin(angle) * distance);
    feather.rotation.set((Math.random() - 0.5) * 0.1, angle + Math.PI * 0.5, (Math.random() - 0.5) * 0.13);
    feather.scale.set(0.5 + Math.random() * 0.14, 1.24 + Math.random() * 0.38, 0.8);
    group.add(feather);

    const impact = new THREE.Mesh(sharedPlaneGeo, impactMat);
    impact.rotation.x = -Math.PI / 2;
    impact.position.set(feather.position.x, 0.11, feather.position.z);
    impact.scale.setScalar(0.01);
    group.add(impact);

    feathers.push({
      mesh: feather,
      impact,
      startY,
      delay: (i % 6) * 0.055 + Math.random() * 0.1,
      spin: (Math.random() - 0.5) * 1.8,
    });
  }

  const glintMat = new THREE.MeshBasicMaterial({
    map: hovlStarTexture || cfxrMagicStarTexture,
    color: new THREE.Color('#ffffff'),
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const glints: THREE.Mesh[] = [];
  for (let i = 0; i < 12; i++) {
    const angle = (i * Math.PI * 2) / 12 + Math.random() * 0.3;
    const glint = new THREE.Mesh(sharedPlaneGeo, glintMat);
    glint.rotation.x = -Math.PI / 2;
    glint.position.set(Math.cos(angle) * (0.35 + Math.random() * 1.7), 0.14, Math.sin(angle) * (0.35 + Math.random() * 1.7));
    glint.scale.setScalar(0.1 + Math.random() * 0.12);
    group.add(glint);
    glints.push(glint);
  }

  flashVfxLight('#00e5ff', targetPos.x, targetPos.y + 1.0, targetPos.z, 0.75, 13.0);

  let elapsed = 0;
  const duration = 1.2;
  activeVfxList.push({
    update: (dt: number) => {
      elapsed += dt;
      const progress = elapsed / duration;
      const impactProgress = THREE.MathUtils.clamp((elapsed - 0.22) / 0.85, 0, 1);

      circleMesh.rotation.z += dt * 2.8;
      circleMesh.scale.setScalar(5.0 + impactProgress * 0.35);
      circleMat.opacity = Math.max(0, 0.95 - progress * 0.92);

      ringMesh.scale.setScalar(0.7 + impactProgress * 4.45);
      ringMat.opacity = Math.max(0, 1 - impactProgress * 1.18);

      skyCircle.rotation.z -= dt * 1.8;
      skyCircle.scale.setScalar(4.25 + Math.sin(Math.min(1, elapsed / 0.36) * Math.PI) * 0.7);
      skyCircleMat.opacity = Math.max(0, 0.82 - progress * 0.9);

      rainPulse.scale.setScalar(0.25 + impactProgress * 4.5);
      rainPulseMat.opacity = Math.max(0, 0.95 - impactProgress * 1.15);

      feathers.forEach((drop) => {
        const fallProgress = THREE.MathUtils.clamp((elapsed - drop.delay) / 0.43, 0, 1);
        const easedFall = fallProgress * fallProgress;
        drop.mesh.position.y = drop.startY * (1 - easedFall) + 0.75;
        drop.mesh.rotation.z += dt * drop.spin;
        drop.mesh.scale.y = (1.55 + Math.sin(fallProgress * Math.PI) * 0.9) * (1 - Math.max(0, fallProgress - 0.88) * 5.5);

        const splashProgress = THREE.MathUtils.clamp((elapsed - drop.delay - 0.33) / 0.52, 0, 1);
        drop.impact.scale.setScalar(0.05 + splashProgress * 1.05);
      });
      featherMat.opacity = Math.max(0, 0.74 - progress * 0.7);
      impactMat.opacity = Math.max(0, 0.58 - impactProgress * 0.7);

      glints.forEach((glint, index) => {
        const twinkle = Math.max(0, Math.sin((elapsed * 7.5) + index * 0.8));
        glint.scale.setScalar(0.08 + twinkle * 0.34 * (1 - progress));
        glint.rotation.z += dt * (1.4 + index * 0.08);
      });
      glintMat.opacity = Math.max(0, 0.9 - progress * 0.82);
      return elapsed >= duration;
    },
    dispose: () => {
      vfxScene?.remove(group);
      circleMat.dispose();
      ringMat.dispose();
      skyCircleMat.dispose();
      rainPulseMat.dispose();
      featherMat.dispose();
      impactMat.dispose();
      glintMat.dispose();
    },
  });
}

// ==========================================
// SKILL 11: Pushback Arrow (âž¶) â€” Circle Single (r=1.0m) Purple Charge Slash
// ==========================================
export function spawnPushbackArrowVfx(targetPos: THREE.Vector3, casterPos?: THREE.Vector3) {
  if (!vfxScene) return;
  const originPos = casterPos?.clone() ?? targetPos.clone();
  const travelOffset = targetPos.clone().sub(originPos);
  const travelDistance = travelOffset.length();
  const group = new THREE.Group();
  group.position.copy(originPos);
  vfxScene.add(group);

  // Adapted from Hovl's "Charge slash purple": a charging Circle2 seal, layered slash arcs,
  // a forward glow, and a compact burst of point sparks. The seal stays on the caster; the slash
  // crosses the gap, then the hit burst lands at the target so knockback direction stays readable.
  const incoming = casterPos
    ? targetPos.clone().sub(casterPos)
    : new THREE.Vector3(0, 0, 1);
  incoming.y = 0;
  if (incoming.lengthSq() < 0.001) incoming.set(0, 0, 1);
  incoming.normalize();
  const incomingAngle = Math.atan2(incoming.x, incoming.z);

  const chargeRingMat = new THREE.MeshBasicMaterial({
    map: hovlCircle2Texture || hovlMagicCircleTexture,
    color: new THREE.Color('#9b4dff'),
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const chargeRing = new THREE.Mesh(sharedPlaneGeo, chargeRingMat);
  chargeRing.rotation.x = -Math.PI / 2;
  chargeRing.position.y = 0.05;
  chargeRing.scale.setScalar(0.08);
  group.add(chargeRing);

  const chargeGlowMat = new THREE.MeshBasicMaterial({
    map: hovlGlowTexture || hovlFlashFree1Texture,
    color: new THREE.Color('#d5a8ff'),
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const chargeGlow = new THREE.Mesh(sharedPlaneGeo, chargeGlowMat);
  chargeGlow.rotation.x = -Math.PI / 2;
  chargeGlow.position.y = 0.075;
  chargeGlow.scale.setScalar(0.08);
  group.add(chargeGlow);

  const slashGroup = new THREE.Group();
  slashGroup.position.set(0, 0.92, 0);
  slashGroup.rotation.y = incomingAngle;
  group.add(slashGroup);

  const outerSlashMat = new THREE.MeshBasicMaterial({
    map: hovlSlashTexture,
    color: new THREE.Color('#7429d6'),
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const coreSlashMat = new THREE.MeshBasicMaterial({
    map: hovlSlashTexture,
    color: new THREE.Color('#e5bcff'),
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const outerSlash = new THREE.Mesh(sharedSlashGeo, outerSlashMat);
  outerSlash.position.set(-0.13, -0.02, -0.035);
  outerSlash.rotation.z = -Math.PI * 0.38;
  outerSlash.scale.set(0.08, 0.08, 1);
  slashGroup.add(outerSlash);

  const coreSlash = new THREE.Mesh(sharedSlashGeo, coreSlashMat);
  coreSlash.position.set(0.12, 0.1, 0.04);
  coreSlash.rotation.z = -Math.PI * 0.29;
  coreSlash.scale.set(0.08, 0.08, 1);
  slashGroup.add(coreSlash);

  const flashMat = new THREE.SpriteMaterial({
    map: hovlPointTexture || hovlFlashFree1Texture,
    color: new THREE.Color('#f0d8ff'),
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const forwardGlow = new THREE.Sprite(flashMat);
  forwardGlow.position.set(0, 0.08, 0.3);
  forwardGlow.scale.setScalar(0.01);
  slashGroup.add(forwardGlow);

  const impactGroup = new THREE.Group();
  impactGroup.position.copy(travelOffset);
  group.add(impactGroup);

  const impactMat = new THREE.MeshBasicMaterial({
    map: hovlFlashFree1Texture || hovlFlareTexture,
    color: new THREE.Color('#c98aff'),
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const impact = new THREE.Mesh(sharedPlaneGeo, impactMat);
  impact.rotation.x = -Math.PI / 2;
  impact.position.y = 0.1;
  impact.scale.setScalar(0.01);
  impactGroup.add(impact);

  const sparkMat = new THREE.SpriteMaterial({
    map: hovlPointTexture || hovlFlashTexture,
    color: new THREE.Color('#c887ff'),
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const sparks: Array<{ sprite: THREE.Sprite; angle: number; distance: number; height: number; delay: number }> = [];
  for (let i = 0; i < 12; i++) {
    const angle = incomingAngle + (i - 5.5) * 0.32 + ((i * 17) % 5 - 2) * 0.035;
    const sprite = new THREE.Sprite(sparkMat);
    sprite.position.set(0, 0.42 + (i % 3) * 0.14, 0);
    sprite.scale.setScalar(0.01);
    impactGroup.add(sprite);
    sparks.push({
      sprite,
      angle,
      distance: 0.68 + (i % 4) * 0.18,
      height: 0.28 + (i % 5) * 0.1,
      delay: (i % 4) * 0.025,
    });
  }

  let elapsed = 0;
  const chargeDuration = casterPos ? PUSHBACK_ARROW_CHARGE_DURATION : PUSHBACK_ARROW_FALLBACK_CHARGE_DURATION;
  const travelDuration = getPushbackArrowTravelDuration(travelDistance);
  const impactStart = chargeDuration + travelDuration;
  const duration = impactStart + 0.34;
  let impactLightFired = false;
  activeVfxList.push({
    update: (dt: number) => {
      elapsed += dt;
      const chargeProgress = THREE.MathUtils.clamp(elapsed / chargeDuration, 0, 1);
      const charged = 1 - Math.pow(1 - chargeProgress, 3);
      const flightProgress = THREE.MathUtils.clamp((elapsed - chargeDuration) / travelDuration, 0, 1);
      const flown = flightProgress * flightProgress * (3 - 2 * flightProgress);
      const launchPulse = Math.sin(Math.min(1, flightProgress / 0.16) * Math.PI * 0.5);
      const impactProgress = THREE.MathUtils.clamp((elapsed - impactStart) / 0.34, 0, 1);
      const impactPulse = Math.sin(impactProgress * Math.PI);
      const chargeFade = 1 - THREE.MathUtils.clamp((elapsed - chargeDuration * 0.58) / 0.34, 0, 1);
      const slashFade = Math.max(0, 1 - impactProgress * 1.2);

      chargeRing.rotation.z += dt * 6.2;
      chargeRing.scale.setScalar(0.14 + charged * 1.55);
      chargeRingMat.opacity = Math.max(0, 0.84 * chargeFade);
      chargeGlow.scale.setScalar(0.12 + charged * 1.6);
      chargeGlowMat.opacity = Math.max(0, 0.56 * chargeFade);

      slashGroup.position.set(
        travelOffset.x * flown,
        travelOffset.y * flown + 0.82 + Math.sin(flightProgress * Math.PI) * 0.18,
        travelOffset.z * flown,
      );
      slashGroup.scale.setScalar(0.42 + flightProgress * 0.92);
      slashGroup.rotation.z = -0.18 + (flown - 0.35) * 0.48;
      outerSlash.rotation.z = -Math.PI * 0.38 + flown * 0.5;
      coreSlash.rotation.z = -Math.PI * 0.29 + flown * 0.63;
      outerSlash.scale.set(0.7 + flown * 0.62, 0.52 + flown * 0.54, 1);
      coreSlash.scale.set(0.62 + flown * 0.72, 0.48 + flown * 0.62, 1);
      outerSlashMat.opacity = Math.max(0, launchPulse * slashFade * 0.92);
      coreSlashMat.opacity = Math.max(0, launchPulse * slashFade);

      forwardGlow.position.set(0, 0.08, 0.3 + flightProgress * 0.5);
      forwardGlow.scale.setScalar(0.08 + launchPulse * 1.42);
      flashMat.opacity = Math.max(0, launchPulse * slashFade * 0.9);

      impact.scale.setScalar(0.08 + impactProgress * 2.3);
      impactMat.opacity = Math.max(0, impactPulse * 0.78);
      if (!impactLightFired && elapsed >= impactStart) {
        impactLightFired = true;
        flashVfxLight('#b45cff', targetPos.x, targetPos.y + 0.95, targetPos.z, 0.48, 13.0);
      }

      sparks.forEach((spark) => {
        const sparkProgress = THREE.MathUtils.clamp((elapsed - impactStart - spark.delay) / 0.32, 0, 1);
        const distance = spark.distance * sparkProgress;
        spark.sprite.position.x = Math.cos(spark.angle) * distance;
        spark.sprite.position.z = Math.sin(spark.angle) * distance;
        spark.sprite.position.y = 0.36 + spark.height * sparkProgress - sparkProgress * sparkProgress * 0.22;
        spark.sprite.scale.setScalar(Math.max(0.01, Math.sin(sparkProgress * Math.PI) * 0.24));
      });
      sparkMat.opacity = Math.max(0, 0.92 - impactProgress * 1.2);
      return elapsed >= duration;
    },
    dispose: () => {
      vfxScene?.remove(group);
      chargeRingMat.dispose();
      chargeGlowMat.dispose();
      outerSlashMat.dispose();
      coreSlashMat.dispose();
      flashMat.dispose();
      impactMat.dispose();
      sparkMat.dispose();
    },
  });
}

// ==========================================
// SKILL 19: Feather Ward (ðŸª½) â€” Ground AOE (scales from r=3.0m to r=6.0m)
// ==========================================
export function spawnFeatherWardVfx(targetPos: THREE.Vector3, radius = 3) {
  if (!vfxScene) return;
  const wardRadius = Math.max(0.5, Number(radius) || 3);
  const radiusScale = wardRadius / 3;
  const circleScale = 6 * radiusScale;
  const haloScale = 5.72 * radiusScale;
  const group = new THREE.Group();
  group.position.copy(targetPos);
  vfxScene.add(group);

  const circleMat = new THREE.MeshBasicMaterial({
    map: cfxrAuraRunicTexture || hovlMagicCircleTexture,
    color: new THREE.Color('#44ffff'),
    transparent: true,
    opacity: 1,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const circleMesh = new THREE.Mesh(sharedPlaneGeo, circleMat);
  circleMesh.rotation.x = -Math.PI / 2;
  circleMesh.position.y = 0.04;
  circleMesh.scale.setScalar(circleScale);
  group.add(circleMesh);

  const haloMat = new THREE.MeshBasicMaterial({
    map: hovlTechCircle2Texture || hovlMagicCircle2Texture,
    color: new THREE.Color('#f2ffff'),
    transparent: true,
    opacity: 0.88,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const haloMesh = new THREE.Mesh(sharedPlaneGeo, haloMat);
  haloMesh.rotation.x = -Math.PI / 2;
  haloMesh.position.y = 0.075;
  haloMesh.scale.setScalar(haloScale);
  group.add(haloMesh);

  const wardPulseMat = new THREE.MeshBasicMaterial({
    map: hovlGlowTexture || hovlFlareTexture,
    color: new THREE.Color('#baffff'),
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
    blending: THREE.NormalBlending,
    side: THREE.DoubleSide,
  });
  const wardPulse = new THREE.Mesh(sharedPlaneGeo, wardPulseMat);
  wardPulse.rotation.x = -Math.PI / 2;
  wardPulse.position.y = 0.1;
  wardPulse.scale.setScalar(0.4 * radiusScale);
  group.add(wardPulse);

  const shieldGeo = new THREE.SphereGeometry(wardRadius, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2);
  const shieldMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color('#7cffff'),
    transparent: true,
    opacity: 0.075,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending,
  });
  const shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
  shieldMesh.position.y = 0.05;
  shieldMesh.scale.setScalar(0.04);
  group.add(shieldMesh);

  const shieldWireMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color('#eaffff'),
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
    wireframe: true,
    blending: THREE.NormalBlending,
  });
  const shieldWire = new THREE.Mesh(shieldGeo, shieldWireMat);
  shieldWire.position.y = 0.05;
  shieldWire.scale.setScalar(0.04);
  group.add(shieldWire);

  const featherMat = new THREE.MeshBasicMaterial({
    map: cfxrSpikeFadeTexture || hovlTrailTexture,
    color: new THREE.Color('#d6ffff'),
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const wardFeathers: Array<{ mesh: THREE.Mesh; baseY: number; angle: number; speed: number }> = [];
  for (let i = 0; i < 14; i++) {
    const angle = (i * Math.PI * 2) / 14;
    const feather = new THREE.Mesh(sharedRayGeo, featherMat);
    feather.position.set(Math.cos(angle) * wardRadius * 0.83, 1.25 + (i % 3) * 0.24, Math.sin(angle) * wardRadius * 0.83);
    feather.rotation.set((Math.random() - 0.5) * 0.28, angle + Math.PI * 0.5, (Math.random() - 0.5) * 0.22);
    feather.scale.set(0.38 + (i % 2) * 0.1, 0.01, 1);
    group.add(feather);
    wardFeathers.push({ mesh: feather, baseY: feather.position.y, angle, speed: 1.4 + Math.random() * 0.9 });
  }

  const moteMat = new THREE.MeshBasicMaterial({
    map: hovlStarTexture || cfxrMagicStarTexture,
    color: new THREE.Color('#ffffff'),
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const motes: Array<{ mesh: THREE.Mesh; angle: number; radius: number; rise: number }> = [];
  for (let i = 0; i < 18; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.sqrt(Math.random()) * wardRadius * 0.75;
    const mote = new THREE.Mesh(sharedPlaneGeo, moteMat);
    mote.position.set(Math.cos(angle) * radius, 0.18 + Math.random() * 0.7, Math.sin(angle) * radius);
    mote.rotation.set((Math.random() - 0.5) * 0.25, angle, Math.random() * Math.PI);
    mote.scale.setScalar(0.06 + Math.random() * 0.13);
    group.add(mote);
    motes.push({ mesh: mote, angle, radius, rise: 0.7 + Math.random() * 1.2 });
  }

  flashVfxLight('#00ffff', targetPos.x, targetPos.y + 1.0, targetPos.z, 0.8, wardRadius * 4);

  let elapsed = 0;
  const duration = 1.4;
  activeVfxList.push({
    update: (dt: number) => {
      elapsed += dt;
      const progress = elapsed / duration;
      const reveal = THREE.MathUtils.clamp(elapsed / 0.32, 0, 1);
      const settle = THREE.MathUtils.clamp((elapsed - 0.78) / 0.62, 0, 1);
      const domeScale = Math.sin(reveal * Math.PI * 0.5);

      circleMesh.rotation.z += dt * 1.9;
      circleMesh.scale.setScalar(circleScale + Math.sin(elapsed * 4.2) * 0.16 * radiusScale);
      circleMat.opacity = Math.max(0, 0.96 - progress * 0.88);
      haloMesh.rotation.z -= dt * 2.8;
      haloMesh.scale.setScalar(haloScale + Math.sin(elapsed * 3.4) * 0.13 * radiusScale);
      haloMat.opacity = Math.max(0, 0.88 - progress * 0.92);
      wardPulse.scale.setScalar((0.4 + reveal * 5.25) * radiusScale);
      wardPulseMat.opacity = Math.max(0, 0.35 - reveal * 0.42);

      shieldMesh.scale.setScalar(domeScale);
      shieldWire.scale.setScalar(domeScale);
      shieldMesh.rotation.y += dt * 0.5;
      shieldWire.rotation.y -= dt * 0.85;
      shieldMat.opacity = Math.max(0, 0.075 - settle * 0.09);
      shieldWireMat.opacity = Math.max(0, 0.42 - settle * 0.52);

      wardFeathers.forEach((feather) => {
        const featherReveal = THREE.MathUtils.clamp((elapsed - (feather.angle / (Math.PI * 2)) * 0.16) / 0.3, 0, 1);
        feather.mesh.scale.y = Math.max(0.01, featherReveal * (0.78 + Math.sin(elapsed * feather.speed * 5) * 0.12));
        feather.mesh.position.y = feather.baseY + Math.sin(elapsed * feather.speed * 4 + feather.angle) * 0.18;
        feather.mesh.rotation.z += dt * (0.5 + feather.speed * 0.22);
      });
      featherMat.opacity = Math.max(0, 0.42 - progress * 0.5);

      motes.forEach((mote, index) => {
        const orbitAngle = mote.angle + elapsed * (0.65 + index * 0.018);
        mote.mesh.position.x = Math.cos(orbitAngle) * mote.radius;
        mote.mesh.position.z = Math.sin(orbitAngle) * mote.radius;
        mote.mesh.position.y += mote.rise * dt;
        mote.mesh.rotation.z += dt * (1.2 + index * 0.06);
      });
      moteMat.opacity = Math.max(0, 0.9 - progress * 0.94);
      return elapsed >= duration;
    },
    dispose: () => {
      vfxScene?.remove(group);
      circleMat.dispose();
      haloMat.dispose();
      wardPulseMat.dispose();
      shieldMat.dispose();
      shieldWireMat.dispose();
      featherMat.dispose();
      moteMat.dispose();
      shieldGeo.dispose();
    },
  });
}

// ==========================================
// SKILL 22: Clear Mind (ðŸ’§) â€” Purifying Water Bubble (r=1.2m)
// ==========================================
export function spawnClearMindVfx(casterPos: THREE.Vector3) {
  if (!vfxScene) return;
  const group = new THREE.Group();
  group.position.copy(casterPos);
  vfxScene.add(group);

  const circleMat = new THREE.MeshBasicMaterial({ map: hovlMagicCircleTexture, color: '#39dfff', transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const circleMesh = new THREE.Mesh(sharedPlaneGeo, circleMat);
  circleMesh.rotation.x = -Math.PI / 2;
  circleMesh.position.y = 0.035;
  circleMesh.scale.setScalar(0.52);
  group.add(circleMesh);

  const rippleMat = new THREE.MeshBasicMaterial({ map: cfxrWaterSplashTexture || hovlCircleTexture, color: '#a8f7ff', transparent: true, opacity: 0.78, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const ripple = new THREE.Mesh(sharedPlaneGeo, rippleMat);
  ripple.rotation.x = -Math.PI / 2;
  ripple.position.y = 0.06;
  ripple.scale.setScalar(0.35);
  group.add(ripple);

  const bubbleGeo = new THREE.SphereGeometry(1.05, 20, 14);
  const bubbleMat = new THREE.MeshBasicMaterial({ color: '#6fefff', transparent: true, opacity: 0.14, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.BackSide });
  const bubbleMesh = new THREE.Mesh(bubbleGeo, bubbleMat);
  bubbleMesh.position.y = 0.92;
  bubbleMesh.scale.setScalar(0.18);
  group.add(bubbleMesh);

  const dropMat = new THREE.SpriteMaterial({ map: hovlPointTexture, color: '#d5fbff', transparent: true, opacity: 0.88, depthWrite: false, blending: THREE.AdditiveBlending });
  const drops: Array<{ sprite: THREE.Sprite; angle: number; radius: number }> = [];
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    const radius = 0.32 + (i % 4) * 0.1;
    const sprite = new THREE.Sprite(dropMat);
    sprite.position.set(Math.cos(angle) * radius, 0.12 + (i % 5) * 0.23, Math.sin(angle) * radius);
    sprite.scale.set(0.1, 0.22, 1);
    group.add(sprite);
    drops.push({ sprite, angle, radius });
  }

  flashVfxLight('#22ddff', casterPos.x, casterPos.y + 0.8, casterPos.z, 0.65, 10.0);

  let elapsed = 0;
  const duration = 0.92;
  activeVfxList.push({
    update: (dt: number) => {
      elapsed += dt;
      const progress = Math.min(1, elapsed / duration);
      const clean = 1 - Math.pow(1 - Math.min(1, progress * 4), 3);
      circleMesh.rotation.z += dt * 4.2;
      circleMesh.scale.setScalar(0.52 + clean * 2.18 + progress * 0.18);
      circleMat.opacity = Math.max(0, 0.9 - progress * 1.02);
      ripple.rotation.z -= dt * 5.6;
      ripple.scale.setScalar(0.35 + clean * 2.0 + progress * 0.6);
      rippleMat.opacity = Math.max(0, 0.78 - progress * 0.9);
      bubbleMesh.rotation.y += dt * 1.8;
      bubbleMesh.rotation.z += dt * 0.8;
      bubbleMesh.scale.setScalar(0.18 + clean * 0.9 + Math.sin(progress * Math.PI) * 0.12);
      bubbleMat.opacity = Math.max(0, 0.14 - progress * 0.135);
      drops.forEach((entry, i) => {
        const a = entry.angle - progress * (2.2 + (i % 3) * 0.2);
        entry.sprite.position.x = Math.cos(a) * (entry.radius + progress * 0.24);
        entry.sprite.position.z = Math.sin(a) * (entry.radius + progress * 0.24);
        entry.sprite.position.y += dt * (1.05 + (i % 4) * 0.15);
        entry.sprite.scale.set(0.1 + progress * 0.04, 0.22 + progress * 0.13, 1);
      });
      dropMat.opacity = Math.max(0, 0.88 - progress * 0.86);
      return elapsed >= duration;
    },
    dispose: () => {
      vfxScene?.remove(group);
      circleMat.dispose();
      rippleMat.dispose();
      bubbleMat.dispose();
      bubbleGeo.dispose();
      dropMat.dispose();
    },
  });
}

// ==========================================
// SKILL 23: Sneaky Snatch (ðŸ§¤) â€” Circle Single (r=1.0m) Gold Coin Snatch
// ==========================================
export function spawnSneakySnatchVfx(targetPos: THREE.Vector3, casterPos: THREE.Vector3) {
  if (!vfxScene) return;
  const group = new THREE.Group();
  group.position.copy(targetPos);
  vfxScene.add(group);

  const circleMat = new THREE.MeshBasicMaterial({ map: hovlTechCircle2Texture || hovlMagicCircleTexture, color: '#ffc928', transparent: true, opacity: 0.96, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const circleMesh = new THREE.Mesh(sharedPlaneGeo, circleMat);
  circleMesh.rotation.x = -Math.PI / 2;
  circleMesh.position.y = 0.035;
  circleMesh.scale.setScalar(0.38);
  group.add(circleMesh);

  const shadowCircleMat = new THREE.MeshBasicMaterial({ map: hovlMagicCircle2Texture || hovlMagicCircleTexture, color: '#8d45ff', transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const shadowCircle = new THREE.Mesh(sharedPlaneGeo, shadowCircleMat);
  shadowCircle.rotation.x = -Math.PI / 2;
  shadowCircle.position.y = 0.055;
  shadowCircle.scale.setScalar(0.28);
  group.add(shadowCircle);

  const slashMat = new THREE.MeshBasicMaterial({
    map: hovlSlashTexture,
    color: new THREE.Color('#ffea00'),
    transparent: true,
    opacity: 1,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const slash = new THREE.Mesh(sharedSlashGeo, slashMat);
  slash.position.set(0, 0.82, 0);
  slash.rotation.z = Math.PI * 0.15;
  slash.scale.setScalar(0.45);
  group.add(slash);

  const flashMat = new THREE.SpriteMaterial({ map: hovlPointTexture, color: '#fff19b', transparent: true, opacity: 0.94, depthWrite: false, blending: THREE.AdditiveBlending });
  const flash = new THREE.Sprite(flashMat);
  flash.position.y = 0.72;
  flash.scale.setScalar(0.25);
  group.add(flash);

  const coinMat = new THREE.SpriteMaterial({ map: hovlStarTexture, color: '#ffd84a', transparent: true, opacity: 0.96, depthWrite: false, blending: THREE.AdditiveBlending });
  const coins: Array<{ sprite: THREE.Sprite; offset: THREE.Vector3 }> = [];
  const pull = casterPos.clone().sub(targetPos); pull.y = 0.75; if (pull.lengthSq() < 0.01) pull.set(0, 0.75, 1); pull.normalize();
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const sprite = new THREE.Sprite(coinMat);
    const offset = new THREE.Vector3(Math.cos(a) * (0.28 + (i % 3) * 0.09), 0.38 + (i % 4) * 0.17, Math.sin(a) * (0.28 + (i % 3) * 0.09));
    sprite.position.copy(offset);
    sprite.scale.set(0.13, 0.2, 1);
    group.add(sprite);
    coins.push({ sprite, offset });
  }

  const smokeMat = new THREE.SpriteMaterial({ map: hovlSmokeFree1Texture, color: '#4b235f', transparent: true, opacity: 0.48, depthWrite: false, blending: THREE.NormalBlending });
  const smoke: THREE.Sprite[] = [];
  for (let i = 0; i < 5; i++) {
    const puff = new THREE.Sprite(smokeMat);
    const a = (i / 5) * Math.PI * 2;
    puff.position.set(Math.cos(a) * 0.3, 0.22 + (i % 2) * 0.2, Math.sin(a) * 0.3);
    puff.scale.setScalar(0.38);
    group.add(puff);
    smoke.push(puff);
  }

  flashVfxLight('#ffcc00', targetPos.x, targetPos.y + 0.85, targetPos.z, 0.5, 11.0);

  let elapsed = 0;
  const duration = 0.78;
  activeVfxList.push({
    update: (dt: number) => {
      elapsed += dt;
      const progress = Math.min(1, elapsed / duration);
      const snap = 1 - Math.pow(1 - Math.min(1, progress * 5), 3);
      circleMesh.rotation.z += dt * 6;
      circleMesh.scale.setScalar(0.38 + snap * 2.05 + progress * 0.28);
      circleMat.opacity = Math.max(0, 0.96 - progress * 1.14);
      shadowCircle.rotation.z -= dt * 7.5;
      shadowCircle.scale.setScalar(0.28 + snap * 1.62 + progress * 0.4);
      shadowCircleMat.opacity = Math.max(0, 0.7 - progress * 0.86);
      slash.scale.setScalar(0.45 + snap * 1.48 + progress * 0.2);
      slash.rotation.z += dt * 0.8;
      slashMat.opacity = Math.max(0, 1 - progress * 1.28);
      flash.scale.setScalar(0.25 + snap * 1.18);
      flashMat.opacity = Math.max(0, 0.94 - progress * 1.4);
      coins.forEach((entry, i) => {
        const pullProgress = Math.max(0, (progress - 0.14 - i * 0.015) / 0.72);
        entry.sprite.position.copy(entry.offset).lerp(pull.clone().multiplyScalar(1.25 + i * 0.035), Math.min(1, pullProgress));
        entry.sprite.position.y += Math.sin(progress * Math.PI) * (0.18 + (i % 3) * 0.06);
      });
      coinMat.opacity = Math.max(0, 0.96 - Math.max(0, progress - 0.72) * 3.5);
      smoke.forEach((puff, i) => { puff.position.y += dt * (0.55 + i * 0.05); puff.scale.setScalar(0.38 + progress * 0.62); });
      smokeMat.opacity = Math.max(0, 0.48 - progress * 0.55);
      return elapsed >= duration;
    },
    dispose: () => {
      vfxScene?.remove(group);
      circleMat.dispose();
      shadowCircleMat.dispose();
      slashMat.dispose();
      flashMat.dispose();
      coinMat.dispose();
      smokeMat.dispose();
    },
  });
}
