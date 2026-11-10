// Ghost, Shadow and Poison skills.
//
// Split out of skillVfx.ts; see core.ts for the shared pools.

import * as THREE from 'three';
import {
  activeVfxList,
  cfxrAuraRunicTexture,
  cfxrMagicStarTexture,
  cfxrRayBlurTexture,
  cfxrRingElectricTexture,
  cfxrSpikeFadeTexture,
  flashVfxLight,
  hovlCircle2Texture,
  hovlCircleTexture,
  hovlCrackTexture,
  hovlCraterTexture,
  hovlFlashFree1Texture,
  hovlFlashFree2Texture,
  hovlGlowTexture,
  hovlMagicCircle2Texture,
  hovlMagicCircleTexture,
  hovlPointTexture,
  hovlSlashTexture,
  hovlSmoke26Texture,
  hovlSmokeFree1Texture,
  hovlSplatTexture,
  hovlStarTexture,
  hovlTechCircle2Texture,
  hovlTrailTexture,
  sharedCrystalGeo,
  sharedPlaneGeo,
  sharedRayGeo,
  sharedSlashGeo,
  sharedToxicOrbGeo,
  vfxLightMaxDuration,
  vfxLightMaxIntensity,
  vfxLightTimer,
  vfxPooledLight,
  vfxScene,
} from './core.ts';


// ==========================================
// SKILL 12: Mind Ripple (ðŸŒ€) â€” Circle Single (r=1.0m) Violet Psychic Pulse
// ==========================================
export function spawnMindRippleVfx(targetPos: THREE.Vector3) {
  if (!vfxScene) return;
  const group = new THREE.Group();
  group.position.copy(targetPos);
  vfxScene.add(group);

  // Psychic damage reads as a thought pulse: concentric ripples, a suspended focus ring,
  // and orbiting fragments that briefly trap attention at the target.
  const glyphMat = new THREE.MeshBasicMaterial({
    map: hovlTechCircle2Texture || hovlMagicCircle2Texture,
    color: new THREE.Color('#9d4dff'),
    transparent: true,
    opacity: 0.86,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const glyphMesh = new THREE.Mesh(sharedPlaneGeo, glyphMat);
  glyphMesh.rotation.x = -Math.PI / 2;
  glyphMesh.position.y = 0.04;
  glyphMesh.scale.setScalar(1.85);
  group.add(glyphMesh);

  const auraMat = new THREE.MeshBasicMaterial({
    map: hovlGlowTexture || hovlFlashFree1Texture,
    color: new THREE.Color('#b87bff'),
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const auraMesh = new THREE.Mesh(sharedPlaneGeo, auraMat);
  auraMesh.rotation.x = -Math.PI / 2;
  auraMesh.position.y = 0.09;
  auraMesh.scale.setScalar(0.16);
  group.add(auraMesh);

  const ripples: Array<{ mesh: THREE.Mesh; material: THREE.MeshBasicMaterial; delay: number }> = [];
  for (let i = 0; i < 4; i++) {
    const rippleMat = new THREE.MeshBasicMaterial({
      map: hovlCircle2Texture || cfxrRingElectricTexture,
      color: new THREE.Color(i % 2 === 0 ? '#d6b5ff' : '#9a4dff'),
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    const ripple = new THREE.Mesh(sharedPlaneGeo, rippleMat);
    ripple.rotation.x = -Math.PI / 2;
    ripple.position.y = 0.1 + i * 0.02;
    ripple.scale.setScalar(0.01);
    group.add(ripple);
    ripples.push({ mesh: ripple, material: rippleMat, delay: i * 0.12 });
  }

  const focusMat = new THREE.MeshBasicMaterial({
    map: hovlCircle2Texture || hovlMagicCircle2Texture,
    color: new THREE.Color('#d9bdff'),
    transparent: true,
    opacity: 0.78,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const focusRing = new THREE.Mesh(sharedPlaneGeo, focusMat);
  focusRing.position.set(0, 1.05, 0);
  focusRing.rotation.y = Math.PI * 0.25;
  focusRing.scale.setScalar(0.48);
  group.add(focusRing);

  const shardMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color('#7c38d7'),
    transparent: true,
    opacity: 0.72,
    depthWrite: true,
    blending: THREE.NormalBlending,
  });
  const shards: Array<{ mesh: THREE.Mesh; angle: number; radius: number; height: number; speed: number }> = [];
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI * 2) / 6;
    const shard = new THREE.Mesh(sharedCrystalGeo, shardMat);
    const radius = 0.42 + (i % 2) * 0.16;
    const height = 0.4 + (i % 3) * 0.18;
    shard.position.set(Math.cos(angle) * radius, height, Math.sin(angle) * radius);
    shard.rotation.set(Math.random() * 0.35, angle, Math.random() * 0.35);
    shard.scale.set(0.22, 0.42 + (i % 2) * 0.12, 0.22);
    group.add(shard);
    shards.push({ mesh: shard, angle, radius, height, speed: 1.3 + Math.random() * 0.6 });
  }

  const moteMat = new THREE.MeshBasicMaterial({
    map: hovlPointTexture || hovlStarTexture,
    color: new THREE.Color('#efe3ff'),
    transparent: true,
    opacity: 0.88,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const motes: Array<{ mesh: THREE.Mesh; angle: number; radius: number; rise: number }> = [];
  for (let i = 0; i < 20; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 0.15 + Math.random() * 1.0;
    const mote = new THREE.Mesh(sharedPlaneGeo, moteMat);
    mote.position.set(Math.cos(angle) * radius, 0.12 + Math.random() * 0.75, Math.sin(angle) * radius);
    mote.rotation.set((Math.random() - 0.5) * 0.2, angle, Math.random() * Math.PI);
    mote.scale.setScalar(0.025 + Math.random() * 0.065);
    group.add(mote);
    motes.push({ mesh: mote, angle, radius, rise: 0.8 + Math.random() * 1.2 });
  }

  flashVfxLight('#cc00ff', targetPos.x, targetPos.y + 0.85, targetPos.z, 0.55, 11.0);

  let elapsed = 0;
  const duration = 1.08;
  activeVfxList.push({
    update: (dt: number) => {
      elapsed += dt;
      const progress = elapsed / duration;
      const pulseProgress = THREE.MathUtils.clamp(elapsed / 0.68, 0, 1);
      glyphMesh.rotation.z -= dt * 2.4;
      glyphMesh.scale.setScalar(1.85 + pulseProgress * 0.38);
      glyphMat.opacity = Math.max(0, 0.86 - progress * 0.98);
      auraMesh.scale.setScalar(0.16 + pulseProgress * 2.5);
      auraMat.opacity = Math.max(0, 0.72 - pulseProgress * 0.9);

      ripples.forEach((ripple) => {
        const rippleProgress = THREE.MathUtils.clamp((elapsed - ripple.delay) / 0.52, 0, 1);
        ripple.mesh.scale.setScalar(0.1 + rippleProgress * 2.5);
        ripple.material.opacity = Math.max(0, 0.82 - rippleProgress * 1.05);
      });

      focusRing.rotation.z += dt * 3.1;
      focusRing.scale.setScalar(0.48 + Math.sin(elapsed * 6.0) * 0.12 + pulseProgress * 0.3);
      focusMat.opacity = Math.max(0, 0.78 - progress * 0.96);

      shards.forEach((shard) => {
        const angle = shard.angle + elapsed * shard.speed;
        shard.mesh.position.x = Math.cos(angle) * (shard.radius + Math.sin(elapsed * 4.0 + shard.angle) * 0.12);
        shard.mesh.position.z = Math.sin(angle) * (shard.radius + Math.sin(elapsed * 4.0 + shard.angle) * 0.12);
        shard.mesh.position.y = shard.height + Math.sin(elapsed * 5.0 + shard.angle) * 0.22;
        shard.mesh.rotation.y += dt * shard.speed * 1.9;
      });
      shardMat.opacity = Math.max(0, 0.72 - progress * 0.86);

      motes.forEach((mote, index) => {
        const angle = mote.angle + elapsed * (1.5 + index * 0.025);
        mote.mesh.position.x = Math.cos(angle) * mote.radius;
        mote.mesh.position.z = Math.sin(angle) * mote.radius;
        mote.mesh.position.y += mote.rise * dt;
        mote.mesh.rotation.z += dt * (1 + index * 0.08);
      });
      moteMat.opacity = Math.max(0, 0.88 - progress * 1.04);
      return elapsed >= duration;
    },
    dispose: () => {
      vfxScene?.remove(group);
      glyphMat.dispose();
      auraMat.dispose();
      ripples.forEach((ripple) => ripple.material.dispose());
      focusMat.dispose();
      shardMat.dispose();
      moteMat.dispose();
    },
  });
}

// ==========================================
// SKILL 13: Spirit Pin (ðŸ”®) â€” Circle Single (r=1.0m) Spectral Pin Spike
// ==========================================
export function spawnSpiritPinVfx(targetPos: THREE.Vector3) {
  if (!vfxScene) return;
  const group = new THREE.Group();
  group.position.copy(targetPos);
  vfxScene.add(group);

  // Spirit Pin is an executed seal: a brief spectral lock, then a downward pinning strike.
  const circleMat = new THREE.MeshBasicMaterial({
    map: cfxrAuraRunicTexture || hovlMagicCircleTexture,
    color: new THREE.Color('#823bdf'),
    transparent: true,
    opacity: 0.88,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const circleMesh = new THREE.Mesh(sharedPlaneGeo, circleMat);
  circleMesh.rotation.x = -Math.PI / 2;
  circleMesh.position.y = 0.04;
  circleMesh.scale.setScalar(2.0);
  group.add(circleMesh);

  const lockMat = new THREE.MeshBasicMaterial({
    map: hovlTechCircle2Texture || hovlMagicCircle2Texture,
    color: new THREE.Color('#cfb0ff'),
    transparent: true,
    opacity: 0.74,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const lockMesh = new THREE.Mesh(sharedPlaneGeo, lockMat);
  lockMesh.rotation.x = -Math.PI / 2;
  lockMesh.position.y = 0.075;
  lockMesh.scale.setScalar(1.75);
  group.add(lockMesh);

  const pinMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color('#7534d0'),
    transparent: true,
    opacity: 0.78,
    depthWrite: true,
    blending: THREE.NormalBlending,
    side: THREE.DoubleSide,
  });

  const corePinMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color('#e6caff'),
    transparent: true,
    opacity: 0.76,
    depthWrite: true,
    blending: THREE.NormalBlending,
    side: THREE.DoubleSide,
  });
  const centralPin = new THREE.Group();
  centralPin.position.y = 9.0;
  centralPin.rotation.x = Math.PI;
  group.add(centralPin);
  const pinMesh = new THREE.Mesh(sharedCrystalGeo, pinMat);
  pinMesh.scale.set(1.15, 2.55, 1.15);
  const corePin = new THREE.Mesh(sharedCrystalGeo, corePinMat);
  corePin.scale.set(0.48, 2.7, 0.48);
  centralPin.add(pinMesh, corePin);

  const trailMat = new THREE.MeshBasicMaterial({
    map: hovlTrailTexture || cfxrRayBlurTexture,
    color: new THREE.Color('#c892ff'),
    transparent: true,
    opacity: 0.58,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const pinTrail = new THREE.Mesh(sharedRayGeo, trailMat);
  pinTrail.position.set(0, 5.2, 0);
  pinTrail.scale.set(0.86, 2.4, 1);
  group.add(pinTrail);

  const sidePins: Array<{ group: THREE.Group; targetY: number; delay: number; angle: number }> = [];
  for (let i = 0; i < 3; i++) {
    const angle = (i * Math.PI * 2) / 3 + Math.PI / 6;
    const pinGroup = new THREE.Group();
    pinGroup.position.set(Math.cos(angle) * 0.72, 5.2 + i * 0.55, Math.sin(angle) * 0.72);
    pinGroup.rotation.x = Math.PI;
    const outer = new THREE.Mesh(sharedCrystalGeo, pinMat);
    outer.scale.set(0.48, 1.25, 0.48);
    const inner = new THREE.Mesh(sharedCrystalGeo, corePinMat);
    inner.scale.set(0.2, 1.34, 0.2);
    pinGroup.add(outer, inner);
    group.add(pinGroup);
    sidePins.push({ group: pinGroup, targetY: 1.36, delay: 0.1 + i * 0.075, angle });
  }

  const impactGlowMat = new THREE.MeshBasicMaterial({
    map: hovlGlowTexture || hovlFlashFree1Texture,
    color: new THREE.Color('#a656ff'),
    transparent: true,
    opacity: 0.8,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const impactGlow = new THREE.Mesh(sharedPlaneGeo, impactGlowMat);
  impactGlow.rotation.x = -Math.PI / 2;
  impactGlow.position.y = 0.1;
  impactGlow.scale.setScalar(0.06);
  group.add(impactGlow);

  const ringMat = new THREE.MeshBasicMaterial({
    map: hovlCircle2Texture || cfxrRingElectricTexture,
    color: new THREE.Color('#c784ff'),
    transparent: true,
    opacity: 0.86,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const impactRings: Array<{ mesh: THREE.Mesh; delay: number }> = [];
  for (let i = 0; i < 2; i++) {
    const ring = new THREE.Mesh(sharedPlaneGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.12 + i * 0.02;
    ring.scale.setScalar(0.01);
    group.add(ring);
    impactRings.push({ mesh: ring, delay: 0.42 + i * 0.13 });
  }

  const soulMat = new THREE.MeshBasicMaterial({
    map: hovlSmoke26Texture || hovlFlashFree2Texture,
    color: new THREE.Color('#a05dff'),
    transparent: true,
    opacity: 0.46,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const souls: Array<{ mesh: THREE.Mesh; angle: number; radius: number; rise: number }> = [];
  for (let i = 0; i < 7; i++) {
    const angle = (i * Math.PI * 2) / 7 + Math.random() * 0.25;
    const radius = 0.2 + Math.random() * 0.78;
    const soul = new THREE.Mesh(sharedPlaneGeo, soulMat);
    soul.position.set(Math.cos(angle) * radius, 0.28 + Math.random() * 0.4, Math.sin(angle) * radius);
    soul.rotation.set((Math.random() - 0.5) * 0.2, angle, Math.random() * Math.PI);
    soul.scale.setScalar(0.45 + Math.random() * 0.35);
    group.add(soul);
    souls.push({ mesh: soul, angle, radius, rise: 0.9 + Math.random() * 1.25 });
  }

  const sparkMat = new THREE.MeshBasicMaterial({
    map: hovlStarTexture || cfxrMagicStarTexture,
    color: new THREE.Color('#f1deff'),
    transparent: true,
    opacity: 0.86,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const sparks: Array<{ mesh: THREE.Mesh; velocity: THREE.Vector3; spin: number }> = [];
  for (let i = 0; i < 15; i++) {
    const angle = Math.random() * Math.PI * 2;
    const spark = new THREE.Mesh(sharedPlaneGeo, sparkMat);
    spark.position.set((Math.random() - 0.5) * 0.25, 0.5 + Math.random() * 0.3, (Math.random() - 0.5) * 0.25);
    spark.rotation.set((Math.random() - 0.5) * 0.2, angle, Math.random() * Math.PI);
    spark.scale.setScalar(0.04 + Math.random() * 0.1);
    group.add(spark);
    sparks.push({
      mesh: spark,
      velocity: new THREE.Vector3(Math.cos(angle) * (1.3 + Math.random() * 2.0), 2.0 + Math.random() * 2.4, Math.sin(angle) * (1.3 + Math.random() * 2.0)),
      spin: (Math.random() - 0.5) * 9,
    });
  }

  flashVfxLight('#aa00ff', targetPos.x, targetPos.y + 0.85, targetPos.z, 0.6, 13.0);

  let elapsed = 0;
  const duration = 1.1;
  activeVfxList.push({
    update: (dt: number) => {
      elapsed += dt;
      const progress = elapsed / duration;
      const strikeProgress = THREE.MathUtils.clamp((elapsed - 0.14) / 0.42, 0, 1);
      const strikeEase = 1 - Math.pow(1 - strikeProgress, 3);
      const impactProgress = THREE.MathUtils.clamp((elapsed - 0.42) / 0.55, 0, 1);
      circleMesh.rotation.z += dt * 2.7;
      circleMesh.scale.setScalar(2.0 + impactProgress * 0.34);
      circleMat.opacity = Math.max(0, 0.88 - progress * 0.94);
      lockMesh.rotation.z -= dt * 4.1;
      lockMesh.scale.setScalar(1.75 + Math.sin(elapsed * 7.0) * 0.1);
      lockMat.opacity = Math.max(0, 0.74 - progress * 0.86);

      centralPin.position.y = 9.0 * (1 - strikeEase) + 2.82;
      centralPin.rotation.y += dt * 0.7;
      pinTrail.position.y = 6.0 * (1 - strikeEase) + 2.4;
      pinTrail.scale.y = Math.max(0.01, 2.4 * (1 - strikeProgress * 0.34));
      trailMat.opacity = Math.max(0, 0.58 - impactProgress * 0.78);

      sidePins.forEach((pin) => {
        const pinProgress = THREE.MathUtils.clamp((elapsed - pin.delay) / 0.36, 0, 1);
        const pinEase = 1 - Math.pow(1 - pinProgress, 3);
        pin.group.position.y = (5.2 + pin.delay * 5) * (1 - pinEase) + pin.targetY;
        pin.group.rotation.y += dt * (0.6 + Math.sin(pin.angle) * 0.2);
      });
      pinMat.opacity = Math.max(0, 0.78 - impactProgress * 0.92);
      corePinMat.opacity = Math.max(0, 0.76 - impactProgress * 0.95);

      impactGlow.scale.setScalar(0.06 + impactProgress * 2.5);
      impactGlowMat.opacity = Math.max(0, 0.8 - impactProgress * 1.05);
      impactRings.forEach((ring) => {
        const ringProgress = THREE.MathUtils.clamp((elapsed - ring.delay) / 0.4, 0, 1);
        ring.mesh.scale.setScalar(0.08 + ringProgress * 2.3);
      });
      ringMat.opacity = Math.max(0, 0.86 - impactProgress * 1.0);

      souls.forEach((soul, index) => {
        const angle = soul.angle + elapsed * (0.8 + index * 0.05);
        soul.mesh.position.x = Math.cos(angle) * soul.radius;
        soul.mesh.position.z = Math.sin(angle) * soul.radius;
        soul.mesh.position.y += soul.rise * dt;
        soul.mesh.rotation.z += dt * (0.7 + index * 0.12);
      });
      soulMat.opacity = Math.max(0, 0.46 - progress * 0.55);

      sparks.forEach((spark) => {
        spark.mesh.position.addScaledVector(spark.velocity, dt);
        spark.velocity.y -= 7.4 * dt;
        spark.mesh.rotation.z += dt * spark.spin;
      });
      sparkMat.opacity = Math.max(0, 0.86 - progress * 0.98);
      return elapsed >= duration;
    },
    dispose: () => {
      vfxScene?.remove(group);
      circleMat.dispose();
      lockMat.dispose();
      pinMat.dispose();
      corePinMat.dispose();
      trailMat.dispose();
      impactGlowMat.dispose();
      ringMat.dispose();
      soulMat.dispose();
      sparkMat.dispose();
    },
  });
}

// ==========================================
// SKILL 24: Shadow Paws (ðŸŒ‘) â€” Self Shadow Stealth (r=1.2m)
// ==========================================
export function spawnShadowPawsVfx(casterPos: THREE.Vector3) {
  if (!vfxScene) return;
  const group = new THREE.Group();
  group.position.copy(casterPos);
  vfxScene.add(group);

  const circleMat = new THREE.MeshBasicMaterial({ map: hovlMagicCircle2Texture || hovlMagicCircleTexture, color: '#7544d8', transparent: true, opacity: 0.82, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const circleMesh = new THREE.Mesh(sharedPlaneGeo, circleMat);
  circleMesh.rotation.x = -Math.PI / 2;
  circleMesh.position.y = 0.035;
  circleMesh.scale.setScalar(0.54);
  group.add(circleMesh);

  const innerMat = new THREE.MeshBasicMaterial({ map: hovlTechCircle2Texture || hovlMagicCircleTexture, color: '#b08cff', transparent: true, opacity: 0.68, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const inner = new THREE.Mesh(sharedPlaneGeo, innerMat);
  inner.rotation.x = -Math.PI / 2;
  inner.position.y = 0.055;
  inner.scale.setScalar(0.32);
  group.add(inner);

  const smokeMat = new THREE.SpriteMaterial({ map: hovlSmokeFree1Texture, color: '#2a1738', transparent: true, opacity: 0.66, depthWrite: false, blending: THREE.NormalBlending });

  const smokePuffs: THREE.Sprite[] = [];
  for (let i = 0; i < 8; i++) {
    const puff = new THREE.Sprite(smokeMat);
    const a = (i * Math.PI * 2) / 8;
    puff.position.set(Math.cos(a) * 0.36, 0.18 + (i % 4) * 0.2, Math.sin(a) * 0.36);
    puff.scale.setScalar(0.52 + (i % 2) * 0.12);
    group.add(puff);
    smokePuffs.push(puff);
  }

  const wispMat = new THREE.SpriteMaterial({ map: hovlTrailTexture, color: '#9d69ff', transparent: true, opacity: 0.68, depthWrite: false, blending: THREE.AdditiveBlending });
  const wisps: Array<{ sprite: THREE.Sprite; angle: number }> = [];
  for (let i = 0; i < 7; i++) {
    const angle = (i / 7) * Math.PI * 2;
    const sprite = new THREE.Sprite(wispMat);
    sprite.position.set(Math.cos(angle) * 0.52, 0.35 + (i % 3) * 0.31, Math.sin(angle) * 0.52);
    sprite.scale.set(0.22, 0.78, 1);
    group.add(sprite);
    wisps.push({ sprite, angle });
  }

  const eyeMat = new THREE.SpriteMaterial({ map: hovlPointTexture, color: '#d4b6ff', transparent: true, opacity: 0.72, depthWrite: false, blending: THREE.AdditiveBlending });
  const eye = new THREE.Sprite(eyeMat);
  eye.position.y = 0.85;
  eye.scale.set(0.7, 0.24, 1);
  group.add(eye);

  flashVfxLight('#6633cc', casterPos.x, casterPos.y + 0.8, casterPos.z, 0.65, 9.0);

  let elapsed = 0;
  const duration = 0.92;
  activeVfxList.push({
    update: (dt: number) => {
      elapsed += dt;
      const progress = Math.min(1, elapsed / duration);
      const veil = 1 - Math.pow(1 - Math.min(1, progress * 4), 3);
      circleMesh.rotation.z += dt * 3.6;
      circleMesh.scale.setScalar(0.54 + veil * 2.08 + progress * 0.25);
      circleMat.opacity = Math.max(0, 0.82 - progress * 0.96);
      inner.rotation.z -= dt * 5.8;
      inner.scale.setScalar(0.32 + veil * 1.62 + progress * 0.32);
      innerMat.opacity = Math.max(0, 0.68 - progress * 0.82);
      smokePuffs.forEach((p, i) => {
        const a = (i / smokePuffs.length) * Math.PI * 2 + progress * 2.2;
        const radius = 0.36 + progress * 0.52;
        p.position.x = Math.cos(a) * radius;
        p.position.z = Math.sin(a) * radius;
        p.position.y += dt * (0.65 + (i % 3) * 0.12);
        p.scale.setScalar(0.52 + (i % 2) * 0.12 + progress * 0.72);
      });
      smokeMat.opacity = Math.max(0, 0.66 - progress * 0.72);
      wisps.forEach((entry, i) => {
        const a = entry.angle - progress * (3.8 + (i % 2) * 0.6);
        entry.sprite.position.x = Math.cos(a) * (0.48 + progress * 0.4);
        entry.sprite.position.z = Math.sin(a) * (0.48 + progress * 0.4);
        entry.sprite.position.y += dt * (1.0 + (i % 3) * 0.18);
        entry.sprite.scale.set(0.22 + progress * 0.12, 0.78 + progress * 0.55, 1);
      });
      wispMat.opacity = Math.max(0, 0.68 - progress * 0.75);
      eye.scale.set(0.7 + veil * 0.75, 0.24 + Math.sin(progress * Math.PI) * 0.18, 1);
      eyeMat.opacity = Math.max(0, 0.72 - progress * 0.9);
      return elapsed >= duration;
    },
    dispose: () => {
      vfxScene?.remove(group);
      circleMat.dispose();
      innerMat.dispose();
      smokeMat.dispose();
      wispMat.dispose();
      eyeMat.dispose();
    },
  });
}

// ==========================================
// SKILL 25: Venom Nibble (ðŸ§ª) â€” Circle Single (r=1.0m) Toxic Bite & Poison Cloud
// ==========================================
// Ranged venom orb, corkscrew trail, and toxic rune impact. Kept separate from
// Venom Nibble so the nine-metre cast reads as a projectile rather than a bite.
export function spawnToxicPawsVfx(targetPos: THREE.Vector3, casterPos: THREE.Vector3) {
  if (!vfxScene) return;
  // A stale/dead target can briefly hand us an invalid world position. Letting NaN enter a
  // Three.js matrix poisons the whole render pass, which presents to the player as a frozen game.
  if (![targetPos.x, targetPos.y, targetPos.z, casterPos.x, casterPos.y, casterPos.z].every(Number.isFinite)) return;
  const group = new THREE.Group();
  vfxScene.add(group);

  const start = casterPos.clone().add(new THREE.Vector3(0, 0.82, 0));
  const end = targetPos.clone().add(new THREE.Vector3(0, 0.62, 0));
  const distance = start.distanceTo(end);
  const flightDuration = THREE.MathUtils.clamp(distance / 14, 0.34, 0.72);
  const impactDuration = 0.72;

  const coreMat = new THREE.MeshBasicMaterial({ color: '#62c81e', transparent: true, opacity: 0.98, depthWrite: false, blending: THREE.NormalBlending });
  const core = new THREE.Mesh(sharedToxicOrbGeo, coreMat);
  core.position.copy(start);core.scale.setScalar(0.78);core.renderOrder = 13;group.add(core);

  const shellMat = new THREE.MeshBasicMaterial({ color: '#3aa80e', wireframe: true, transparent: true, opacity: 0.82, depthWrite: false, blending: THREE.AdditiveBlending });
  const shell = new THREE.Mesh(sharedToxicOrbGeo, shellMat);
  shell.position.copy(start);shell.scale.setScalar(0.96);shell.renderOrder = 12;group.add(shell);

  const trailMat = new THREE.MeshBasicMaterial({ color: '#70e826', transparent: true, opacity: 0.58, depthWrite: false, blending: THREE.AdditiveBlending });
  const trails: Array<{ mesh: THREE.Mesh; delay: number; side: number; size: number }> = [];
  for (let i = 0; i < 4; i++) {
    const mesh = new THREE.Mesh(sharedToxicOrbGeo, trailMat),size = 0.31 - i * 0.025;
    mesh.position.copy(start);mesh.scale.setScalar(size);mesh.renderOrder = 11;group.add(mesh);
    trails.push({ mesh, delay: 0.035 + i * 0.045, side: i % 2 ? 1 : -1, size });
  }

  // Use the circular rune atlas here. MagicCircle2 has a bright square frame that reads like
  // a debug decal from the game's high camera angle.
  const runeMat = new THREE.MeshBasicMaterial({ map: hovlMagicCircleTexture, color: '#70e61c', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const rune = new THREE.Mesh(sharedPlaneGeo, runeMat);
  rune.rotation.x = -Math.PI / 2;rune.position.copy(targetPos).add(new THREE.Vector3(0, 0.05, 0));rune.scale.setScalar(0.1);group.add(rune);

  const crackMat = new THREE.MeshBasicMaterial({ map: hovlCrackTexture || hovlCraterTexture, color: '#3c9f12', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const crack = new THREE.Mesh(sharedPlaneGeo, crackMat);
  crack.rotation.x = -Math.PI / 2;crack.rotation.z = Math.random() * Math.PI;crack.position.copy(targetPos).add(new THREE.Vector3(0, 0.07, 0));crack.scale.setScalar(0.08);group.add(crack);

  const splatMat = new THREE.MeshBasicMaterial({ map: hovlSplatTexture, color: '#56c51b', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const splat = new THREE.Mesh(sharedPlaneGeo, splatMat);
  splat.rotation.x = -Math.PI / 2;splat.rotation.z = Math.random() * Math.PI;splat.position.copy(targetPos).add(new THREE.Vector3(0, 0.065, 0));splat.scale.setScalar(0.1);group.add(splat);

  const shockMat = new THREE.MeshBasicMaterial({ map: hovlCircleTexture, color: '#d7ff69', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const shock = new THREE.Mesh(sharedPlaneGeo, shockMat);
  shock.rotation.x = -Math.PI / 2;shock.position.copy(targetPos).add(new THREE.Vector3(0, 0.085, 0));shock.scale.setScalar(0.08);group.add(shock);

  const rayMat = new THREE.MeshBasicMaterial({ map: cfxrRayBlurTexture || cfxrSpikeFadeTexture, color: '#aaff35', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const rayGroup = new THREE.Group();rayGroup.position.copy(targetPos).add(new THREE.Vector3(0, 0.25, 0));rayGroup.scale.setScalar(0.02);group.add(rayGroup);
  for (let i = 0; i < 6; i++) {
    const ray = new THREE.Mesh(sharedRayGeo, rayMat),angle = (i / 6) * Math.PI * 2;
    ray.rotation.set(Math.PI * (0.23 + (i % 3) * 0.035), angle, 0);ray.position.set(Math.sin(angle) * 0.28, 0.12, Math.cos(angle) * 0.28);rayGroup.add(ray);
  }

  const cloudMat = new THREE.SpriteMaterial({ map: hovlSmokeFree1Texture, color: '#4e8f24', transparent: true, opacity: 0, depthWrite: false, blending: THREE.NormalBlending });
  const clouds: Array<{ sprite: THREE.Sprite; angle: number; radius: number; rise: number }> = [];
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2 + (i % 3) * 0.17;
    const sprite = new THREE.Sprite(cloudMat);
    sprite.position.copy(targetPos).add(new THREE.Vector3(Math.cos(angle) * 0.16, 0.2 + (i % 3) * 0.13, Math.sin(angle) * 0.16));
    sprite.scale.setScalar(0.25 + (i % 3) * 0.06);group.add(sprite);
    clouds.push({ sprite, angle, radius: 0.55 + (i % 4) * 0.13, rise: 0.5 + (i % 3) * 0.16 });
  }

  const dropMat = new THREE.SpriteMaterial({ map: hovlPointTexture, color: '#d8ff52', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const drops: Array<{ sprite: THREE.Sprite; velocity: THREE.Vector3 }> = [];
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2 + Math.random() * 0.2;
    const sprite = new THREE.Sprite(dropMat);
    sprite.position.copy(end);sprite.scale.set(0.085, 0.15, 1);group.add(sprite);
    drops.push({ sprite, velocity: new THREE.Vector3(Math.cos(angle) * (1 + (i % 4) * 0.22), 0.75 + (i % 5) * 0.2, Math.sin(angle) * (1 + (i % 4) * 0.22)) });
  }

  let elapsed = 0, impacted = false;
  const flightDirection = end.clone().sub(start).normalize();
  const sideVector = new THREE.Vector3(-flightDirection.z, 0, flightDirection.x);
  const flightPosition = new THREE.Vector3();
  activeVfxList.push({
    update: (dt: number) => {
      elapsed += dt;
      if (elapsed < flightDuration) {
        const progress = THREE.MathUtils.clamp(elapsed / flightDuration, 0, 1), eased = 1 - Math.pow(1 - progress, 2);
        const arc = Math.sin(progress * Math.PI) * Math.min(1.05, 0.32 + distance * 0.055);
        flightPosition.copy(start).lerp(end, eased);flightPosition.y += arc;core.position.copy(flightPosition);shell.position.copy(flightPosition);
        core.rotation.x += dt * 10;core.rotation.y += dt * 13;shell.rotation.x -= dt * 7;shell.rotation.z += dt * 9;
        core.scale.setScalar(0.76 + Math.sin(elapsed * 28) * 0.07);shell.scale.setScalar(0.96 + Math.sin(elapsed * 20 + 0.8) * 0.09);
        trails.forEach((entry, index) => {
          const delayed = THREE.MathUtils.clamp((elapsed - entry.delay) / flightDuration, 0, 1), trailEase = 1 - Math.pow(1 - delayed, 2);
          entry.mesh.position.copy(start).lerp(end, trailEase);entry.mesh.position.y += Math.sin(delayed * Math.PI) * Math.min(1.05, 0.32 + distance * 0.055);
          entry.mesh.position.addScaledVector(sideVector, Math.sin(delayed * Math.PI * 7 + index) * 0.11 * entry.side);
          entry.mesh.scale.setScalar(entry.size * (0.82 + Math.sin(elapsed * 22 - index) * 0.18));
        });
        trailMat.opacity = 0.42 + Math.sin(elapsed * 24) * 0.12;
        return false;
      }
      if (!impacted) {
        impacted = true;core.visible = false;shell.visible = false;trails.forEach((entry) => { entry.mesh.visible = false; });
        flashVfxLight('#86ff1f', targetPos.x, targetPos.y + 0.75, targetPos.z, 0.48, 12);
      }
      const impact = THREE.MathUtils.clamp((elapsed - flightDuration) / impactDuration, 0, 1), burst = 1 - Math.pow(1 - Math.min(1, impact * 4.2), 3);
      rune.rotation.z += dt * 5.4;rune.scale.setScalar(0.1 + burst * 3.15 + impact * 0.45);runeMat.opacity = Math.max(0, 0.94 - impact * 1.15);
      crack.scale.setScalar(0.08 + burst * 2.55 + impact * 0.7);crackMat.opacity = Math.max(0, 0.9 - impact * 0.86);
      splat.scale.setScalar(0.1 + burst * 2.15 + impact * 0.62);splatMat.opacity = Math.max(0, 0.78 - impact * 0.56);
      shock.rotation.z -= dt * 6.8;shock.scale.setScalar(0.08 + burst * 3.65 + impact * 0.72);shockMat.opacity = Math.max(0, 0.88 - impact * 1.16);
      rayGroup.rotation.y += dt * 2.6;rayGroup.scale.setScalar(0.02 + burst * 2.45 + impact * 0.32);rayMat.opacity = Math.max(0, 0.92 - impact * 1.3);
      cloudMat.opacity = Math.max(0, Math.sin(Math.min(1, impact * 2.3) * Math.PI) * 0.62);
      clouds.forEach((entry, index) => {
        const local = THREE.MathUtils.clamp((impact - index * 0.018) / 0.85, 0, 1);
        entry.sprite.position.x = targetPos.x + Math.cos(entry.angle + local * 0.8) * entry.radius * local;entry.sprite.position.z = targetPos.z + Math.sin(entry.angle + local * 0.8) * entry.radius * local;
        entry.sprite.position.y = targetPos.y + 0.2 + local * entry.rise;entry.sprite.scale.setScalar(0.25 + local * 0.78);
      });
      dropMat.opacity = Math.max(0, 0.95 - impact * 1.08);drops.forEach((entry) => { entry.velocity.y -= dt * 3.4;entry.sprite.position.addScaledVector(entry.velocity, dt); });
      return elapsed >= flightDuration + impactDuration;
    },
    dispose: () => {
      vfxScene?.remove(group);coreMat.dispose();shellMat.dispose();trailMat.dispose();runeMat.dispose();crackMat.dispose();splatMat.dispose();shockMat.dispose();rayMat.dispose();cloudMat.dispose();dropMat.dispose();
    },
  });
}

export function spawnVenomNibbleVfx(targetPos: THREE.Vector3) {
  if (!vfxScene) return;
  const group = new THREE.Group();
  group.position.copy(targetPos);
  vfxScene.add(group);

  const circleMat = new THREE.MeshBasicMaterial({ map: hovlMagicCircleTexture, color: '#75ef38', transparent: true, opacity: 0.94, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const circleMesh = new THREE.Mesh(sharedPlaneGeo, circleMat);
  circleMesh.rotation.x = -Math.PI / 2;
  circleMesh.position.y = 0.035;
  circleMesh.scale.setScalar(0.4);
  group.add(circleMesh);

  const splatMat = new THREE.MeshBasicMaterial({ map: hovlSplatTexture, color: '#4fbd24', transparent: true, opacity: 0.76, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const splat = new THREE.Mesh(sharedPlaneGeo, splatMat);
  splat.rotation.x = -Math.PI / 2;
  splat.rotation.z = Math.random() * Math.PI;
  splat.position.y = 0.055;
  splat.scale.setScalar(0.32);
  group.add(splat);

  const ringMat = new THREE.MeshBasicMaterial({ map: hovlCircleTexture, color: '#c8ff62', transparent: true, opacity: 0.76, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(sharedPlaneGeo, ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.075;
  ring.scale.setScalar(0.28);
  group.add(ring);

  const slashMat = new THREE.MeshBasicMaterial({
    map: hovlSlashTexture,
    color: new THREE.Color('#44ff00'),
    transparent: true,
    opacity: 1,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const slash = new THREE.Mesh(sharedSlashGeo, slashMat);
  slash.position.set(-0.12, 0.82, 0);
  slash.rotation.z = Math.PI * 0.2;
  slash.scale.setScalar(0.42);
  group.add(slash);

  const bite2 = new THREE.Mesh(sharedSlashGeo, slashMat);
  bite2.position.set(0.12, 0.82, 0.02);
  bite2.rotation.z = -Math.PI * 0.2;
  bite2.scale.setScalar(0.42);
  group.add(bite2);

  const smokeMat = new THREE.SpriteMaterial({ map: hovlSmokeFree1Texture, color: '#567a26', transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.NormalBlending });
  const smokePuffs: THREE.Sprite[] = [];
  for (let i = 0; i < 7; i++) {
    const puff = new THREE.Sprite(smokeMat);
    const a = (i * Math.PI * 2) / 7;
    puff.position.set(Math.cos(a) * 0.32, 0.25 + (i % 3) * 0.2, Math.sin(a) * 0.32);
    puff.scale.setScalar(0.42 + (i % 2) * 0.1);
    group.add(puff);
    smokePuffs.push(puff);
  }

  const dropletMat = new THREE.SpriteMaterial({ map: hovlPointTexture, color: '#c7ff54', transparent: true, opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending });
  const droplets: Array<{ sprite: THREE.Sprite; velocity: THREE.Vector3 }> = [];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + Math.random() * 0.3;
    const sprite = new THREE.Sprite(dropletMat);
    sprite.position.set(0, 0.62, 0);
    sprite.scale.set(0.1, 0.16, 1);
    group.add(sprite);
    droplets.push({ sprite, velocity: new THREE.Vector3(Math.cos(a) * (0.75 + (i % 3) * 0.18), 0.65 + (i % 4) * 0.22, Math.sin(a) * (0.75 + (i % 3) * 0.18)) });
  }

  flashVfxLight('#77ff00', targetPos.x, targetPos.y + 0.85, targetPos.z, 0.55, 11.0);

  let elapsed = 0;
  const duration = 0.86;
  activeVfxList.push({
    update: (dt: number) => {
      elapsed += dt;
      const progress = Math.min(1, elapsed / duration);
      const bite = 1 - Math.pow(1 - Math.min(1, progress * 5), 3);
      circleMesh.rotation.z += dt * 4.8;
      circleMesh.scale.setScalar(0.4 + bite * 2.12 + progress * 0.3);
      circleMat.opacity = Math.max(0, 0.94 - progress * 1.08);
      splat.scale.setScalar(0.32 + bite * 1.72 + progress * 0.42);
      splatMat.opacity = Math.max(0, 0.76 - progress * 0.76);
      ring.rotation.z -= dt * 6.5;
      ring.scale.setScalar(0.28 + bite * 2.0 + progress * 0.55);
      ringMat.opacity = Math.max(0, 0.76 - progress * 0.92);
      slash.scale.setScalar(0.42 + bite * 1.28 + progress * 0.12);
      bite2.scale.copy(slash.scale);
      slash.position.x = -0.12 - Math.sin(progress * Math.PI) * 0.18;
      bite2.position.x = 0.12 + Math.sin(progress * Math.PI) * 0.18;
      slashMat.opacity = Math.max(0, 1 - progress * 1.24);
      smokePuffs.forEach((p, i) => {
        const a = (i / smokePuffs.length) * Math.PI * 2 + progress * 1.2;
        const radius = 0.32 + progress * 0.54;
        p.position.x = Math.cos(a) * radius;
        p.position.z = Math.sin(a) * radius;
        p.position.y += dt * (0.5 + (i % 3) * 0.12);
        p.scale.setScalar(0.42 + (i % 2) * 0.1 + progress * 0.72);
      });
      smokeMat.opacity = Math.max(0, 0.6 - progress * 0.68);
      droplets.forEach((entry) => { entry.velocity.y -= dt * 2.6; entry.sprite.position.addScaledVector(entry.velocity, dt); entry.sprite.scale.multiplyScalar(1 + dt * 0.3); });
      dropletMat.opacity = Math.max(0, 0.95 - progress * 0.88);
      return elapsed >= duration;
    },
    dispose: () => {
      vfxScene?.remove(group);
      circleMat.dispose();
      splatMat.dispose();
      ringMat.dispose();
      slashMat.dispose();
      smokeMat.dispose();
      dropletMat.dispose();
    },
  });
}
