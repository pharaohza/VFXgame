// Fire skills — ember particles, heat haze and the warm pooled light.
//
// Split out of skillVfx.ts; see core.ts for the shared pools.

import * as THREE from 'three';
import {
  activeVfxList,
  cfxrMagicStarTexture,
  cfxrRayBlurTexture,
  cfxrRingElectricTexture,
  cfxrSpikeFadeTexture,
  emberCount,
  emberVelocities,
  flashVfxLight,
  hovlCircleTexture,
  hovlCrackTexture,
  hovlCraterTexture,
  hovlFlareTexture,
  hovlFlashFree2Texture,
  hovlFlashTexture,
  hovlGlowTexture,
  hovlMagicCircle2Texture,
  hovlMagicCircleTexture,
  hovlPointTexture,
  hovlSmoke26Texture,
  hovlSmokeFree1Texture,
  hovlSplatTexture,
  hovlStarTexture,
  hovlStoneTexture,
  hovlTechCircle2Texture,
  magmaCount,
  magmaVelocities,
  sharedCrystalGeo,
  sharedEmberGeo,
  sharedMagmaGeo,
  sharedPlaneGeo,
  sharedRayGeo,
  vfxScene,
  vfxDetailCount,
  vfxPeakScale,
} from './core.ts';


// ==========================================
// SKILL 2: Ember Slam (ðŸ”¥) â€” GRAND Ultra Fiery AOE Burst
// ==========================================
export function spawnEmberSlamVfx(targetPos: THREE.Vector3) {
  if (!vfxScene) return;

  const group = new THREE.Group();
  group.position.copy(targetPos);
  vfxScene.add(group);

  const circleMat = new THREE.MeshBasicMaterial({
    map: hovlMagicCircleTexture,
    color: new THREE.Color('#ff5500'),
    transparent: true,
    opacity: 1,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const circleMesh = new THREE.Mesh(sharedPlaneGeo, circleMat);
  circleMesh.rotation.x = -Math.PI / 2;
  circleMesh.position.y = 0.03;
  circleMesh.scale.setScalar(1.0);
  group.add(circleMesh);

  const crackMat = new THREE.MeshBasicMaterial({
    map: hovlCrackTexture || hovlCraterTexture,
    color: new THREE.Color('#ff3300'),
    transparent: true,
    opacity: 1,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const crackMesh = new THREE.Mesh(sharedPlaneGeo, crackMat);
  crackMesh.rotation.x = -Math.PI / 2;
  crackMesh.rotation.z = Math.random() * Math.PI;
  crackMesh.position.y = 0.04;
  crackMesh.scale.setScalar(1.5);
  group.add(crackMesh);

  const shockMat = new THREE.MeshBasicMaterial({
    map: hovlFlashTexture,
    color: new THREE.Color('#ff7700'),
    transparent: true,
    opacity: 1,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const shockRing1 = new THREE.Mesh(sharedPlaneGeo, shockMat);
  shockRing1.rotation.x = -Math.PI / 2;
  shockRing1.position.y = 0.06;
  group.add(shockRing1);

  const shockRing2 = new THREE.Mesh(sharedPlaneGeo, shockMat);
  shockRing2.rotation.x = -Math.PI / 2;
  shockRing2.position.y = 0.12;
  group.add(shockRing2);

  const rayGroup = new THREE.Group();
  rayGroup.position.set(0, 0.4, 0);
  group.add(rayGroup);

  const rayMat = new THREE.MeshBasicMaterial({
    map: cfxrRayBlurTexture || cfxrSpikeFadeTexture,
    color: new THREE.Color('#ffaa11'),
    transparent: true,
    opacity: 1,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });

  const rayCount = vfxDetailCount(12);
  for (let i = 0; i < rayCount; i++) {
    const rayMesh = new THREE.Mesh(sharedRayGeo, rayMat);
    const angle = (i * Math.PI * 2) / rayCount;
    rayMesh.rotation.y = angle;
    rayMesh.rotation.x = Math.PI * 0.32;
    rayMesh.position.set(Math.sin(angle) * 0.4, 0.2, Math.cos(angle) * 0.4);
    rayGroup.add(rayMesh);
  }

  const smokeGroup = new THREE.Group();
  group.add(smokeGroup);

  const smokeMat = new THREE.MeshBasicMaterial({
    map: hovlSmoke26Texture || hovlFlashTexture,
    color: new THREE.Color('#ff4411'),
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const smokePuffs: Array<{ mesh: THREE.Mesh; rotSpeed: number; dir: THREE.Vector3 }> = [];
  const smokeCount = vfxDetailCount(8);
  for (let i = 0; i < smokeCount; i++) {
    const puff = new THREE.Mesh(sharedPlaneGeo, smokeMat);
    const a = (i * Math.PI * 2) / 8 + Math.random() * 0.3;
    const dist = 0.5 + Math.random() * 0.6;

    puff.position.set(Math.cos(a) * dist, 0.3 + Math.random() * 0.4, Math.sin(a) * dist);
    puff.rotation.z = Math.random() * Math.PI * 2;
    puff.scale.setScalar(1.2 + Math.random() * 0.8);
    smokeGroup.add(puff);

    smokePuffs.push({
      mesh: puff,
      rotSpeed: (Math.random() - 0.5) * 2.0,
      dir: new THREE.Vector3(Math.cos(a) * (2.0 + Math.random() * 2.0), 3.0 + Math.random() * 3.0, Math.sin(a) * (2.0 + Math.random() * 2.0)),
    });
  }

  const magmaAttr = sharedMagmaGeo.attributes.position as THREE.BufferAttribute;
  const magmaArray = magmaAttr.array as Float32Array;

  for (let i = 0; i < magmaCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 4.5 + Math.random() * 6.0;
    const upSpeed = 5.0 + Math.random() * 6.5;

    magmaArray[i * 3] = (Math.random() - 0.5) * 0.2;
    magmaArray[i * 3 + 1] = 0.2;
    magmaArray[i * 3 + 2] = (Math.random() - 0.5) * 0.2;

    magmaVelocities[i].set(Math.cos(angle) * speed, upSpeed, Math.sin(angle) * speed);
  }
  magmaAttr.needsUpdate = true;

  const magmaMat = new THREE.PointsMaterial({
    map: hovlSplatTexture || hovlFlashTexture,
    size: 0.75,
    transparent: true,
    opacity: 1,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const magmaPoints = new THREE.Points(sharedMagmaGeo, magmaMat);
  group.add(magmaPoints);

  const emberAttr = sharedEmberGeo.attributes.position as THREE.BufferAttribute;
  const emberArray = emberAttr.array as Float32Array;

  for (let i = 0; i < emberCount; i++) {
    const r = Math.random() * 1.5;
    const theta = Math.random() * Math.PI * 2;

    emberArray[i * 3] = Math.cos(theta) * r;
    emberArray[i * 3 + 1] = 0.2;
    emberArray[i * 3 + 2] = Math.sin(theta) * r;

    const speed = 2.0 + Math.random() * 3.5;
    const upSpeed = 5.5 + Math.random() * 7.5;
    emberVelocities[i].set(Math.cos(theta) * speed, upSpeed, Math.sin(theta) * speed);
  }
  emberAttr.needsUpdate = true;

  const emberMat = new THREE.PointsMaterial({
    map: hovlFlashTexture,
    size: 0.5,
    transparent: true,
    opacity: 1,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const emberPoints = new THREE.Points(sharedEmberGeo, emberMat);
  group.add(emberPoints);

  flashVfxLight('#ff4400', targetPos.x, targetPos.y + 0.8, targetPos.z, 0.7, 12.0);

  let elapsed = 0;
  const duration = 0.75;

  activeVfxList.push({
    update: (dt: number) => {
      elapsed += dt;
      const progress = elapsed / duration;

      circleMesh.rotation.z += dt * 4.0;
      circleMesh.scale.setScalar((1.0 + progress * 5.0) * vfxPeakScale);
      circleMat.opacity = Math.max(0, 1 - progress * 1.2);

      crackMesh.scale.setScalar((1.5 + progress * 3.8) * vfxPeakScale);
      crackMat.opacity = Math.max(0, 1 - progress * 1.3);

      shockRing1.scale.setScalar((0.4 + progress * 6.5) * vfxPeakScale);
      shockRing2.scale.setScalar((0.2 + progress * 7.5) * vfxPeakScale);
      shockMat.opacity = Math.max(0, 1 - progress * 1.6);

      rayGroup.scale.set(1 + progress * 2.8, 1 + progress * 3.5, 1 + progress * 2.8);
      rayMat.opacity = Math.max(0, 1 - progress * 1.5);

      smokePuffs.forEach(({ mesh, rotSpeed, dir }) => {
        mesh.position.x += dir.x * dt;
        mesh.position.y += dir.y * dt;
        mesh.position.z += dir.z * dt;
        mesh.rotation.z += rotSpeed * dt;
        mesh.scale.setScalar(1.2 + progress * 3.0);
      });
      smokeMat.opacity = Math.max(0, 1 - progress * 1.25);

      for (let i = 0; i < magmaCount; i++) {
        const vel = magmaVelocities[i];
        magmaArray[i * 3] += vel.x * dt;
        magmaArray[i * 3 + 1] += vel.y * dt;
        magmaArray[i * 3 + 2] += vel.z * dt;
        vel.y -= 14.0 * dt;
      }
      magmaAttr.needsUpdate = true;
      magmaMat.opacity = Math.max(0, 1 - progress * 1.4);

      for (let i = 0; i < emberCount; i++) {
        const vel = emberVelocities[i];
        emberArray[i * 3] += vel.x * dt;
        emberArray[i * 3 + 1] += vel.y * dt;
        emberArray[i * 3 + 2] += vel.z * dt;
        vel.y -= 6.0 * dt;
      }
      emberAttr.needsUpdate = true;
      emberMat.opacity = Math.max(0, 1 - progress * 1.2);

      return elapsed >= duration;
    },
    dispose: () => {
      vfxScene?.remove(group);
      circleMat.dispose();
      crackMat.dispose();
      shockMat.dispose();
      rayMat.dispose();
      smokeMat.dispose();
      magmaMat.dispose();
      emberMat.dispose();
    },
  });
}

// ==========================================
// Meteor — large descending fireball, impact shockwave and falling debris.
// The whole sequence is one short-lived VFX entry, so it cannot leave scene objects behind.
// ==========================================
export function spawnMeteorVfx(targetPos: THREE.Vector3) {
  if (!vfxScene) return;
  const group = new THREE.Group();
  group.position.copy(targetPos);
  vfxScene.add(group);

  // MagicCircle2 comes from Hovl Studio and has a genuine transparent alpha channel. The old
  // crater card was an opaque black square, so Meteor now uses this fire-tinted summoning sigil
  // for its ground telegraph and impact instead.
  const sigilMat = new THREE.MeshBasicMaterial({
    map: hovlMagicCircle2Texture,
    color: '#ff6a24',
    transparent: true,
    opacity: 0.62,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const sigil = new THREE.Mesh(sharedPlaneGeo, sigilMat);
  sigil.rotation.x = -Math.PI / 2;
  sigil.position.y = 0.055;
  sigil.scale.setScalar(8.9);
  group.add(sigil);

  const meteorGeo = new THREE.IcosahedronGeometry(1, 3);
  // Break the uniform sphere into an irregular basalt rock. The same geometry drives its lava
  // seams so the orange only appears along real facets instead of reading as a solid fireball.
  const meteorPositions = meteorGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < meteorPositions.count; i++) {
    const x = meteorPositions.getX(i), y = meteorPositions.getY(i), z = meteorPositions.getZ(i);
    const distortion = .78 + Math.abs(Math.sin(x * 9.1 + y * 5.7 + z * 7.3)) * .3;
    meteorPositions.setXYZ(i, x * distortion * 1.15, y * distortion * .86, z * distortion);
  }
  meteorPositions.needsUpdate = true;
  meteorGeo.computeVertexNormals();
  const meteorMat = new THREE.MeshStandardMaterial({ color: '#22100c', emissive: '#6e1607', emissiveIntensity: 0.72, roughness: 1, metalness: 0 });
  const meteor = new THREE.Mesh(meteorGeo, meteorMat);
  meteor.position.set(-2.6, 14, -4.5);
  meteor.scale.setScalar(2.25);
  group.add(meteor);

  const crackGeo = new THREE.EdgesGeometry(meteorGeo, 20);
  const crackMat = new THREE.LineBasicMaterial({ color: '#ff6a1b', transparent: true, opacity: .55, blending: THREE.AdditiveBlending, depthWrite: false });
  const cracks = new THREE.LineSegments(crackGeo, crackMat);
  cracks.scale.setScalar(1.006);
  meteor.add(cracks);
  const flameShellMat = new THREE.MeshBasicMaterial({ color: '#ff7d23', transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, side: THREE.BackSide, depthWrite: false });
  const flameShell = new THREE.Mesh(meteorGeo, flameShellMat);
  flameShell.scale.setScalar(1.22);
  meteor.add(flameShell);

  const tailMat = new THREE.MeshBasicMaterial({ map: cfxrRayBlurTexture || hovlFlareTexture, color: '#ff6a1a', transparent: true, opacity: 0.82, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const tail = new THREE.Mesh(sharedRayGeo, tailMat);
  tail.position.set(1.1, 1.5, 1.9);
  tail.rotation.set(-0.75, 0.45, 0.15);
  tail.scale.set(2.8, 5.2, 1);
  meteor.add(tail);
  const innerTailMat = new THREE.MeshBasicMaterial({ map: cfxrRayBlurTexture || hovlFlareTexture, color: '#ffe29a', transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const innerTail = new THREE.Mesh(sharedRayGeo, innerTailMat);
  innerTail.position.set(0.65, 0.9, 1.25);
  innerTail.rotation.set(-0.75, 0.45, 0.15);
  innerTail.scale.set(1.15, 3.6, 1);
  meteor.add(innerTail);

  const impactMat = new THREE.MeshBasicMaterial({ map: hovlFlashTexture, color: '#fff0af', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const impact = new THREE.Mesh(sharedPlaneGeo, impactMat);
  impact.rotation.x = -Math.PI / 2;
  impact.position.y = 0.12;
  group.add(impact);
  const shockMat = new THREE.MeshBasicMaterial({ map: cfxrRingElectricTexture || hovlFlareTexture, color: '#ff8d22', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const shock = new THREE.Mesh(sharedPlaneGeo, shockMat);
  shock.rotation.x = -Math.PI / 2;
  shock.position.y = 0.15;
  group.add(shock);
  const debrisMat = new THREE.MeshBasicMaterial({ color: '#9b260d', transparent: true, opacity: 0, blending: THREE.NormalBlending });
  const debris: Array<{ mesh: THREE.Mesh; velocity: THREE.Vector3; spin: THREE.Vector3 }> = [];
  for (let i = 0; i < 18; i++) {
    const angle = i / 18 * Math.PI * 2 + Math.random() * 0.2;
    const mesh = new THREE.Mesh(sharedCrystalGeo, debrisMat);
    mesh.position.set(0, 0.25, 0);
    mesh.scale.setScalar(0.18 + Math.random() * 0.24);
    group.add(mesh);
    debris.push({ mesh, velocity: new THREE.Vector3(Math.cos(angle) * (3.8 + Math.random() * 4.4), 5 + Math.random() * 5.5, Math.sin(angle) * (3.8 + Math.random() * 4.4)), spin: new THREE.Vector3(Math.random() * 8, Math.random() * 8, Math.random() * 8) });
  }

  let elapsed = 0;
  const impactAt = 1.05;
  const duration = 1.82;
  activeVfxList.push({
    update: (dt: number) => {
      elapsed += dt;
      const falling = THREE.MathUtils.clamp(elapsed / impactAt, 0, 1);
      const impactProgress = THREE.MathUtils.clamp((elapsed - impactAt) / (duration - impactAt), 0, 1);
      const easeFall = falling * falling;
      meteor.position.set(-2.6 * (1 - easeFall), 14 * (1 - easeFall), -4.5 * (1 - easeFall));
      meteor.rotation.x += dt * 7;
      meteor.rotation.z += dt * 5;
      meteor.scale.setScalar(2.25 - falling * 0.25);
      flameShell.scale.setScalar(1.18 + Math.sin(elapsed * 25) * 0.08);
      flameShellMat.opacity = .14 + Math.sin(elapsed * 31) * .055;
      crackMat.opacity = .38 + Math.sin(elapsed * 18) * .16;
      tailMat.opacity = Math.max(0, 0.82 - Math.max(0, (falling - 0.88) * 7));
      innerTailMat.opacity = Math.max(0, 0.9 - Math.max(0, (falling - 0.86) * 8));
      sigil.rotation.z -= dt * 0.82;
      sigil.scale.setScalar(8.9 + falling * .5);
      sigilMat.opacity = .46 + Math.sin(elapsed * 8) * .12;
      if (elapsed >= impactAt) {
        meteor.visible = false;
        const pulse = Math.sin(Math.min(1, impactProgress * 1.45) * Math.PI);
        impact.scale.setScalar(1.2 + impactProgress * 12);
        impactMat.opacity = Math.max(0, pulse * 0.98 - impactProgress * 0.28);
        shock.scale.setScalar(0.5 + impactProgress * 13);
        shockMat.opacity = Math.max(0, 0.92 - impactProgress * 1.08);
        sigil.scale.setScalar(9.4 + impactProgress * 4.2);
        sigilMat.opacity = Math.max(0, .9 - impactProgress * 1.08);
        debrisMat.opacity = Math.max(0, 0.92 - impactProgress * 1.2);
        debris.forEach(({ mesh, velocity, spin }) => {
          mesh.position.addScaledVector(velocity, dt);
          velocity.y -= 16 * dt;
          mesh.rotation.x += spin.x * dt;
          mesh.rotation.y += spin.y * dt;
          mesh.rotation.z += spin.z * dt;
        });
        if (elapsed - dt < impactAt) flashVfxLight('#ff5d19', targetPos.x, targetPos.y + 1.2, targetPos.z, 0.45, 22);
      }
      return elapsed >= duration;
    },
    dispose: () => {
      vfxScene?.remove(group);
      meteorGeo.dispose();
      crackGeo.dispose();
      meteorMat.dispose();
      crackMat.dispose();
      flameShellMat.dispose();
      tailMat.dispose();
      innerTailMat.dispose();
      impactMat.dispose();
      shockMat.dispose();
      sigilMat.dispose();
      debrisMat.dispose();
    },
  });
}

// ==========================================
// SKILL 16: Cinder Burst (ðŸ’¥) â€” Ground AOE (r=2.5m) Tri-burst Fire Eruption
// ==========================================
export function spawnCinderBurstVfx(targetPos: THREE.Vector3) {
  if (!vfxScene) return;
  const group = new THREE.Group();
  group.position.copy(targetPos);
  vfxScene.add(group);

  const circleMat = new THREE.MeshBasicMaterial({
    map: hovlMagicCircleTexture,
    color: new THREE.Color('#ff4400'),
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

  const crackMat = new THREE.MeshBasicMaterial({
    map: hovlCrackTexture || hovlCraterTexture,
    color: new THREE.Color('#ff2200'),
    transparent: true,
    opacity: 1,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const crackMesh = new THREE.Mesh(sharedPlaneGeo, crackMat);
  crackMesh.rotation.x = -Math.PI / 2;
  crackMesh.position.y = 0.06;
  crackMesh.scale.setScalar(4.6);
  group.add(crackMesh);

  const burstMat = new THREE.MeshBasicMaterial({
    map: hovlFlashTexture,
    color: new THREE.Color('#ff7700'),
    transparent: true,
    opacity: 1,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const burstMesh = new THREE.Mesh(sharedPlaneGeo, burstMat);
  burstMesh.rotation.x = -Math.PI / 2;
  burstMesh.position.y = 0.08;
  burstMesh.scale.setScalar(1.2);
  group.add(burstMesh);

  const outerRingMat = new THREE.MeshBasicMaterial({
    map: cfxrRingElectricTexture || hovlFlareTexture,
    color: new THREE.Color('#ff9d18'),
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const outerRing = new THREE.Mesh(sharedPlaneGeo, outerRingMat);
  outerRing.rotation.x = -Math.PI / 2;
  outerRing.position.y = 0.12;
  outerRing.scale.setScalar(0.35);
  group.add(outerRing);

  const heatMat = new THREE.MeshBasicMaterial({
    map: hovlGlowTexture || hovlFlareTexture,
    color: new THREE.Color('#ff4310'),
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const heatMesh = new THREE.Mesh(sharedPlaneGeo, heatMat);
  heatMesh.rotation.x = -Math.PI / 2;
  heatMesh.position.y = 0.1;
  heatMesh.scale.setScalar(1.15);
  group.add(heatMesh);

  const eruptionMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color('#e93d0b'),
    transparent: true,
    opacity: 0.86,
    depthWrite: false,
    blending: THREE.NormalBlending,
    side: THREE.DoubleSide,
  });
  const coreEruptionMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color('#ffbd35'),
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    blending: THREE.NormalBlending,
    side: THREE.DoubleSide,
  });
  const eruptions: Array<{ mesh: THREE.Mesh; delay: number; peak: number; sway: number }> = [];
  for (let i = 0; i < 11; i++) {
    const angle = i === 0 ? 0 : ((i - 1) * Math.PI * 2) / 10 + (Math.random() - 0.5) * 0.22;
    const distance = i === 0 ? 0 : 0.75 + (i % 3) * 0.48;
    const eruption = new THREE.Mesh(sharedCrystalGeo, i === 0 ? coreEruptionMat : eruptionMat);
    eruption.position.set(Math.cos(angle) * distance, 0.01, Math.sin(angle) * distance);
    eruption.rotation.set((Math.random() - 0.5) * 0.25, angle, (Math.random() - 0.5) * 0.24);
    eruption.scale.set(i === 0 ? 1.45 : 0.68 + Math.random() * 0.28, 0.01, 1);
    group.add(eruption);
    eruptions.push({
      mesh: eruption,
      delay: i === 0 ? 0.08 : 0.13 + (i % 5) * 0.055,
      peak: i === 0 ? 2.45 : 0.95 + Math.random() * 0.55,
      sway: (Math.random() - 0.5) * 1.2,
    });
  }

  const smokeMat = new THREE.MeshBasicMaterial({
    map: hovlSmoke26Texture || hovlFlashFree2Texture,
    color: new THREE.Color('#a01806'),
    transparent: true,
    opacity: 0.34,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const smokePuffs: Array<{ mesh: THREE.Mesh; direction: THREE.Vector3; spin: number }> = [];
  for (let i = 0; i < 7; i++) {
    const angle = (i * Math.PI * 2) / 7 + Math.random() * 0.35;
    const puff = new THREE.Mesh(sharedPlaneGeo, smokeMat);
    puff.position.set(Math.cos(angle) * (0.35 + Math.random() * 1.15), 0.45 + Math.random() * 0.35, Math.sin(angle) * (0.35 + Math.random() * 1.15));
    puff.rotation.set((Math.random() - 0.5) * 0.22, angle + Math.PI * 0.5, Math.random() * Math.PI);
    puff.scale.setScalar(0.7 + Math.random() * 0.5);
    group.add(puff);
    smokePuffs.push({ mesh: puff, direction: new THREE.Vector3(Math.cos(angle), 0.8 + Math.random() * 0.8, Math.sin(angle)), spin: (Math.random() - 0.5) * 2.5 });
  }

  const emberMat = new THREE.MeshBasicMaterial({
    map: hovlStarTexture || cfxrMagicStarTexture,
    color: new THREE.Color('#ffd56a'),
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const embers: Array<{ mesh: THREE.Mesh; velocity: THREE.Vector3; spin: number }> = [];
  for (let i = 0; i < 16; i++) {
    const angle = Math.random() * Math.PI * 2;
    const ember = new THREE.Mesh(sharedPlaneGeo, emberMat);
    ember.position.set((Math.random() - 0.5) * 0.6, 0.45 + Math.random() * 0.55, (Math.random() - 0.5) * 0.6);
    ember.rotation.set((Math.random() - 0.5) * 0.3, angle, Math.random() * Math.PI);
    ember.scale.setScalar(0.09 + Math.random() * 0.15);
    group.add(ember);
    embers.push({
      mesh: ember,
      velocity: new THREE.Vector3(Math.cos(angle) * (1.8 + Math.random() * 2.8), 3.2 + Math.random() * 3.3, Math.sin(angle) * (1.8 + Math.random() * 2.8)),
      spin: (Math.random() - 0.5) * 8,
    });
  }

  flashVfxLight('#ff5500', targetPos.x, targetPos.y + 0.85, targetPos.z, 0.65, 15.0);

  let elapsed = 0;
  const duration = 1.15;
  activeVfxList.push({
    update: (dt: number) => {
      elapsed += dt;
      const progress = elapsed / duration;
      const blastProgress = THREE.MathUtils.clamp((elapsed - 0.08) / 0.72, 0, 1);
      const collapse = THREE.MathUtils.clamp((elapsed - 0.72) / 0.43, 0, 1);

      circleMesh.rotation.z += dt * 2.8;
      circleMesh.scale.setScalar(5.0 + blastProgress * 0.35);
      circleMat.opacity = Math.max(0, 0.94 - progress * 1.02);

      crackMesh.rotation.z += dt * 0.35;
      crackMesh.scale.setScalar(4.4 + blastProgress * 1.1);
      crackMat.opacity = Math.max(0, 0.98 - progress * 0.95);

      burstMesh.scale.setScalar(0.9 + blastProgress * 4.0);
      burstMat.opacity = Math.max(0, 1 - blastProgress * 1.55);

      outerRing.scale.setScalar(0.35 + blastProgress * 5.65);
      outerRingMat.opacity = Math.max(0, 0.95 - blastProgress * 1.2);
      heatMesh.scale.setScalar(1.0 + blastProgress * 3.8);
      heatMat.opacity = Math.max(0, 0.9 - blastProgress * 1.15);

      eruptions.forEach((eruption) => {
        const localProgress = THREE.MathUtils.clamp((elapsed - eruption.delay) / 0.4, 0, 1);
        const plume = Math.sin(localProgress * Math.PI);
        const height = Math.max(0.01, plume * eruption.peak);
        eruption.mesh.scale.y = height;
        eruption.mesh.position.y = height * 1.1;
        eruption.mesh.rotation.z += dt * eruption.sway;
      });
      eruptionMat.opacity = Math.max(0, 0.86 - collapse * 1.02);
      coreEruptionMat.opacity = Math.max(0, 0.9 - collapse * 1.16);

      smokePuffs.forEach((puff) => {
        puff.mesh.position.addScaledVector(puff.direction, dt * (0.52 + progress * 0.55));
        puff.mesh.rotation.z += dt * puff.spin;
        puff.mesh.scale.multiplyScalar(1 + dt * 0.8);
      });
      smokeMat.opacity = Math.max(0, 0.34 - progress * 0.4);

      embers.forEach((ember) => {
        ember.mesh.position.addScaledVector(ember.velocity, dt);
        ember.velocity.y -= dt * 8.5;
        ember.mesh.rotation.z += dt * ember.spin;
      });
      emberMat.opacity = Math.max(0, 0.95 - progress * 1.05);
      return elapsed >= duration;
    },
    dispose: () => {
      vfxScene?.remove(group);
      circleMat.dispose();
      crackMat.dispose();
      burstMat.dispose();
      outerRingMat.dispose();
      heatMat.dispose();
      eruptionMat.dispose();
      coreEruptionMat.dispose();
      smokeMat.dispose();
      emberMat.dispose();
    },
  });
}

// ==========================================
// SKILL 17: Flame Fence (ðŸ”¥) â€” Ground AOE (r=3.0m) Fiery Wall Decal & Fire Jets
// ==========================================
export function spawnFlameFenceVfx(targetPos: THREE.Vector3) {
  if (!vfxScene) return;
  const group = new THREE.Group();
  group.position.copy(targetPos);
  vfxScene.add(group);

  const circleMat = new THREE.MeshBasicMaterial({
    map: hovlCrackTexture || hovlMagicCircleTexture,
    color: new THREE.Color('#ff3300'),
    transparent: true,
    opacity: 1,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const circleMesh = new THREE.Mesh(sharedPlaneGeo, circleMat);
  circleMesh.rotation.x = -Math.PI / 2;
  circleMesh.position.y = 0.04;
  circleMesh.scale.setScalar(6.0);
  group.add(circleMesh);

  const runeMat = new THREE.MeshBasicMaterial({
    map: hovlTechCircle2Texture || hovlMagicCircle2Texture,
    color: new THREE.Color('#ff9b1a'),
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const runeMesh = new THREE.Mesh(sharedPlaneGeo, runeMat);
  runeMesh.rotation.x = -Math.PI / 2;
  runeMesh.position.y = 0.07;
  runeMesh.scale.setScalar(5.75);
  group.add(runeMesh);

  const heatRingMat = new THREE.MeshBasicMaterial({
    map: cfxrRingElectricTexture || hovlFlareTexture,
    color: new THREE.Color('#ffd36a'),
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const heatRing = new THREE.Mesh(sharedPlaneGeo, heatRingMat);
  heatRing.rotation.x = -Math.PI / 2;
  heatRing.position.y = 0.12;
  heatRing.scale.setScalar(0.35);
  group.add(heatRing);

  const coreGlowMat = new THREE.MeshBasicMaterial({
    map: hovlFlareTexture,
    color: new THREE.Color('#ff4b12'),
    transparent: true,
    opacity: 0.1,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const coreGlow = new THREE.Mesh(sharedPlaneGeo, coreGlowMat);
  coreGlow.rotation.x = -Math.PI / 2;
  coreGlow.position.y = 0.09;
  coreGlow.scale.setScalar(1.35);
  group.add(coreGlow);

  const flameMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color('#e73b0a'),
    transparent: true,
    opacity: 0.84,
    depthWrite: false,
    blending: THREE.NormalBlending,
    side: THREE.DoubleSide,
  });

  const coreFlameMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color('#ff9810'),
    transparent: true,
    opacity: 0.55,
    depthWrite: true,
    blending: THREE.NormalBlending,
    side: THREE.DoubleSide,
  });

  const flames: Array<{ flame: THREE.Mesh; core: THREE.Mesh; delay: number; phase: number }> = [];
  for (let i = 0; i < 14; i++) {
    const flame = new THREE.Mesh(sharedCrystalGeo, flameMat);
    const a = (i * Math.PI * 2) / 14;
    flame.position.set(Math.cos(a) * 2.6, 1.35, Math.sin(a) * 2.6);
    flame.rotation.y = a + Math.PI * 0.5;
    flame.scale.set(0.76, 0.01, 1);
    group.add(flame);

    const core = new THREE.Mesh(sharedCrystalGeo, coreFlameMat);
    core.position.copy(flame.position);
    core.rotation.y = flame.rotation.y;
    core.scale.set(0.34, 0.01, 1);
    core.visible = i % 2 === 0;
    group.add(core);

    flames.push({ flame, core, delay: (i % 5) * 0.045, phase: i * 0.72 + Math.random() * 0.5 });
  }

  const emberMat = new THREE.MeshBasicMaterial({
    map: hovlStarTexture || cfxrMagicStarTexture,
    color: new THREE.Color('#ffe19a'),
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const embers: Array<{ mesh: THREE.Mesh; angle: number; rise: number }> = [];
  for (let i = 0; i < 18; i++) {
    const angle = (i * Math.PI * 2) / 18 + Math.random() * 0.25;
    const ember = new THREE.Mesh(sharedPlaneGeo, emberMat);
    ember.position.set(Math.cos(angle) * (1.15 + Math.random() * 1.25), 0.35 + Math.random() * 0.35, Math.sin(angle) * (1.15 + Math.random() * 1.25));
    ember.rotation.set((Math.random() - 0.5) * 0.2, angle, Math.random() * Math.PI);
    ember.scale.setScalar(0.06 + Math.random() * 0.13);
    group.add(ember);
    embers.push({ mesh: ember, angle, rise: 1.4 + Math.random() * 1.7 });
  }

  flashVfxLight('#ff4400', targetPos.x, targetPos.y + 0.85, targetPos.z, 0.8, 14.0);

  let elapsed = 0;
  const duration = 1.35;
  activeVfxList.push({
    update: (dt: number) => {
      elapsed += dt;
      const progress = elapsed / duration;
      const fenceProgress = THREE.MathUtils.clamp(elapsed / 0.28, 0, 1);
      const fadeProgress = THREE.MathUtils.clamp((elapsed - 0.82) / 0.53, 0, 1);
      circleMesh.rotation.z += dt * 1.7;
      circleMesh.scale.setScalar(6.0 + Math.sin(progress * Math.PI) * 0.22);
      circleMat.opacity = Math.max(0, 0.95 - progress * 0.96);

      runeMesh.rotation.z -= dt * 2.3;
      runeMesh.scale.setScalar(5.72 + Math.sin(elapsed * 4.5) * 0.13);
      runeMat.opacity = Math.max(0, 0.85 - progress * 0.95);

      heatRing.scale.setScalar(0.35 + fenceProgress * 5.55);
      heatRingMat.opacity = Math.max(0, 0.9 - fenceProgress * 1.08);
      coreGlow.scale.setScalar(1.1 + fenceProgress * 2.45);
      coreGlowMat.opacity = Math.max(0, 0.1 - progress * 0.14);

      flames.forEach((flame) => {
        const entry = THREE.MathUtils.clamp((elapsed - flame.delay) / 0.24, 0, 1);
        const wave = 0.8 + Math.sin(elapsed * 12 + flame.phase) * 0.22;
        const outerHeight = Math.max(0.01, entry * (0.96 + wave * 0.26));
        const innerHeight = Math.max(0.01, entry * (0.62 + wave * 0.18));
        flame.flame.scale.y = outerHeight;
        flame.core.scale.y = innerHeight;
        flame.flame.position.y = outerHeight * 1.1;
        flame.core.position.y = innerHeight * 1.1;
      });
      flameMat.opacity = Math.max(0, 0.84 - fadeProgress * 0.98);
      coreFlameMat.opacity = Math.max(0, 0.55 - fadeProgress * 0.68);

      embers.forEach((ember, index) => {
        ember.mesh.position.y += ember.rise * dt;
        ember.mesh.position.x += Math.cos(elapsed * 2.2 + ember.angle) * dt * 0.35;
        ember.mesh.position.z += Math.sin(elapsed * 2.2 + ember.angle) * dt * 0.35;
        ember.mesh.rotation.z += dt * (1.8 + index * 0.08);
      });
      emberMat.opacity = Math.max(0, 0.9 - progress * 1.02);
      return elapsed >= duration;
    },
    dispose: () => {
      vfxScene?.remove(group);
      circleMat.dispose();
      runeMat.dispose();
      heatRingMat.dispose();
      coreGlowMat.dispose();
      flameMat.dispose();
      coreFlameMat.dispose();
      emberMat.dispose();
    },
  });
}

// ==========================================
// SKILL 18: Ember Pop (âœ¨) â€” Circle Single (r=1.0m) Swift Fire Blast
// ==========================================
export function spawnEmberPopVfx(targetPos: THREE.Vector3) {
  if (!vfxScene) return;
  const group = new THREE.Group();
  group.position.copy(targetPos);
  group.scale.setScalar(1.26);
  vfxScene.add(group);

  // Match Ember Slam's ground language: additive Hovl rune + hot fractured decal. Using the
  // textures as color maps preserves their real alpha and removes the old red rectangle.
  const circleMat = new THREE.MeshBasicMaterial({ map: hovlMagicCircleTexture, color: '#ff5212', transparent: true, opacity: 0.88, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const circle = new THREE.Mesh(sharedPlaneGeo, circleMat);
  circle.rotation.x = -Math.PI / 2;
  circle.rotation.z = Math.random() * Math.PI;
  circle.position.y = 0.022;
  circle.scale.setScalar(0.46);
  group.add(circle);

  const crackMat = new THREE.MeshBasicMaterial({ map: hovlCraterTexture || hovlCrackTexture, color: '#ff3f0b', transparent: true, opacity: 0.96, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const crack = new THREE.Mesh(sharedPlaneGeo, crackMat);
  crack.rotation.x = -Math.PI / 2;
  crack.rotation.z = Math.random() * Math.PI;
  crack.position.y = 0.04;
  crack.scale.setScalar(0.16);
  group.add(crack);

  const pressureMat = new THREE.MeshBasicMaterial({ map: hovlFlashTexture, color: '#ff841f', transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const pressure = new THREE.Mesh(sharedPlaneGeo, pressureMat);
  pressure.rotation.x = -Math.PI / 2;
  pressure.position.y = 0.07;
  pressure.scale.setScalar(0.045);
  group.add(pressure);

  const heatMat = new THREE.MeshBasicMaterial({ map: hovlFlareTexture || hovlFlashFree2Texture, color: '#ff5a13', transparent: true, opacity: 0.76, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const heat = new THREE.Mesh(sharedPlaneGeo, heatMat);
  heat.rotation.x = -Math.PI / 2;
  heat.position.y = 0.09;
  heat.scale.setScalar(0.06);
  group.add(heat);

  // The Hovl Explosion prefab uses Circle for the pressure wave and Point1 for its hot flash.
  const shockMat = new THREE.MeshBasicMaterial({ map: hovlCircleTexture, color: '#ff7b1d', transparent: true, opacity: 0.92, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const shock = new THREE.Mesh(sharedPlaneGeo, shockMat);
  shock.rotation.x = -Math.PI / 2;
  shock.position.y = 0.11;
  shock.scale.setScalar(0.02);
  group.add(shock);

  const coreGlowMat = new THREE.SpriteMaterial({ map: hovlPointTexture, color: '#ff8c24', transparent: true, opacity: 0.96, depthWrite: false, blending: THREE.AdditiveBlending });
  const coreGlow = new THREE.Sprite(coreGlowMat);
  coreGlow.position.y = 0.48;
  coreGlow.scale.setScalar(0.01);
  coreGlow.renderOrder = 9;
  group.add(coreGlow);

  // SmokeFree1 is alpha-backed, so layered sprites give the blast a rounded Hovl smoke/fire
  // silhouette without the sharp crystal-cone look that made the old Ember Pop feel synthetic.
  const flameMat = new THREE.SpriteMaterial({ map: hovlSmokeFree1Texture, color: '#e94a12', transparent: true, opacity: 0.88, depthWrite: false, blending: THREE.NormalBlending });
  const flameCoreMat = new THREE.SpriteMaterial({ map: hovlSmoke26Texture, color: '#ffc044', transparent: true, opacity: 0.88, depthWrite: false, blending: THREE.AdditiveBlending });
  const flames: Array<{ outer: THREE.Sprite; inner: THREE.Sprite; angle: number; delay: number; peak: number; radius: number }> = [];
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI * 2) / 6 + Math.random() * 0.18;
    const outer = new THREE.Sprite(flameMat);
    const inner = new THREE.Sprite(flameCoreMat);
    outer.renderOrder = 7;
    inner.renderOrder = 8;
    outer.scale.setScalar(0.01);
    inner.scale.setScalar(0.01);
    group.add(outer, inner);
    flames.push({ outer, inner, angle, delay: 0.035 + (i % 3) * 0.028, peak: 0.84 + (i % 3) * 0.13, radius: 0.2 + (i % 2) * 0.14 });
  }

  const smokeMat = new THREE.SpriteMaterial({ map: hovlSmokeFree1Texture, color: '#63301f', transparent: true, opacity: 0.62, depthWrite: false, blending: THREE.NormalBlending });
  const smoke: Array<{ mesh: THREE.Sprite; velocity: THREE.Vector3; growth: number }> = [];
  for (let i = 0; i < 7; i++) {
    const angle = (i * Math.PI * 2) / 7 + Math.random() * 0.26;
    const puff = new THREE.Sprite(smokeMat);
    const distance = 0.25 + Math.random() * 0.42;
    puff.position.set(Math.cos(angle) * distance, 0.3 + Math.random() * 0.2, Math.sin(angle) * distance);
    puff.scale.setScalar(0.42 + Math.random() * 0.26);
    puff.renderOrder = 6;
    group.add(puff);
    smoke.push({ mesh: puff, velocity: new THREE.Vector3(Math.cos(angle) * (0.9 + Math.random() * 1.0), 1.65 + Math.random() * 1.45, Math.sin(angle) * (0.9 + Math.random() * 1.0)), growth: 0.7 + Math.random() * 0.45 });
  }

  const rockMat = new THREE.SpriteMaterial({ map: hovlStoneTexture, color: '#6d321d', transparent: true, opacity: 0.92, depthWrite: false, blending: THREE.NormalBlending });
  const rockChunks: Array<{ mesh: THREE.Sprite; velocity: THREE.Vector3; baseScale: number }> = [];
  for (let i = 0; i < 10; i++) {
    const angle = Math.random() * Math.PI * 2;
    const rock = new THREE.Sprite(rockMat);
    const baseScale = 0.12 + Math.random() * 0.11;
    rock.position.set((Math.random() - 0.5) * 0.25, 0.07, (Math.random() - 0.5) * 0.25);
    rock.scale.setScalar(baseScale);
    group.add(rock);
    rockChunks.push({
      mesh: rock,
      velocity: new THREE.Vector3(Math.cos(angle) * (1.8 + Math.random() * 1.7), 2.8 + Math.random() * 2.0, Math.sin(angle) * (1.8 + Math.random() * 1.7)),
      baseScale,
    });
  }

  const emberMat = new THREE.SpriteMaterial({ map: hovlPointTexture, color: '#ffd56a', transparent: true, opacity: 0.98, depthWrite: false, blending: THREE.AdditiveBlending });
  const embers: Array<{ mesh: THREE.Sprite; velocity: THREE.Vector3 }> = [];
  for (let i = 0; i < 22; i++) {
    const angle = Math.random() * Math.PI * 2;
    const ember = new THREE.Sprite(emberMat);
    ember.position.set((Math.random() - 0.5) * 0.36, 0.24 + Math.random() * 0.28, (Math.random() - 0.5) * 0.36);
    ember.scale.setScalar(0.045 + Math.random() * 0.055);
    group.add(ember);
    embers.push({ mesh: ember, velocity: new THREE.Vector3(Math.cos(angle) * (1.7 + Math.random() * 2.3), 3.4 + Math.random() * 3.1, Math.sin(angle) * (1.7 + Math.random() * 2.3)) });
  }

  flashVfxLight('#ff5712', targetPos.x, targetPos.y + 0.72, targetPos.z, 0.66, 13.0);

  let elapsed = 0;
  const duration = 0.86;
  activeVfxList.push({
    update: (dt: number) => {
      elapsed += dt;
      const progress = Math.min(1, elapsed / duration);
      const blast = THREE.MathUtils.clamp((elapsed - 0.035) / 0.28, 0, 1);
      const burst = Math.sin((blast * Math.PI) / 2);
      const fade = THREE.MathUtils.clamp((elapsed - 0.5) / 0.32, 0, 1);

      circle.rotation.z += dt * 2.8;
      circle.scale.setScalar(0.46 + burst * 2.25 + progress * 0.12);
      circleMat.opacity = Math.max(0, 0.88 - progress * 1.05);
      crack.rotation.z += dt * 0.48;
      crack.scale.setScalar(0.16 + burst * 2.55 + progress * 0.22);
      crackMat.opacity = Math.max(0, 0.98 - progress * 1.1);
      pressure.scale.setScalar(0.045 + burst * 3.7);
      pressureMat.opacity = Math.max(0, 0.96 - blast * 1.55);
      heat.scale.setScalar(0.06 + burst * 2.75);
      heatMat.opacity = Math.max(0, 0.82 - progress * 1.18);
      shock.scale.setScalar(0.02 + burst * 3.45);
      shockMat.opacity = Math.max(0, 0.92 - blast * 1.18);
      coreGlow.scale.setScalar(0.03 + Math.sin(blast * Math.PI) * 1.72);
      coreGlowMat.opacity = Math.max(0, 0.96 - blast * 1.18);

      flames.forEach(({ outer, inner, angle, delay, peak, radius }) => {
        const local = THREE.MathUtils.clamp((elapsed - delay) / 0.44, 0, 1);
        const plume = Math.sin(local * Math.PI);
        const distance = 0.08 + radius * local;
        const height = 0.22 + plume * peak;
        outer.position.set(Math.cos(angle) * distance, height, Math.sin(angle) * distance);
        inner.position.copy(outer.position);
        outer.scale.setScalar(0.08 + plume * (0.88 + radius * 0.7));
        inner.scale.setScalar(0.04 + plume * (0.5 + radius * 0.36));
      });
      flameMat.opacity = Math.max(0, 0.88 - fade * 1.2);
      flameCoreMat.opacity = Math.max(0, 0.9 - fade * 1.35);

      smoke.forEach(({ mesh, velocity, growth }) => {
        mesh.position.addScaledVector(velocity, dt);
        velocity.y -= 3.9 * dt;
        mesh.scale.multiplyScalar(1 + dt * growth);
      });
      smokeMat.opacity = Math.max(0, 0.62 - progress * 0.78);

      rockChunks.forEach(({ mesh, velocity, baseScale }) => {
        mesh.position.addScaledVector(velocity, dt);
        velocity.y -= 14.5 * dt;
        if (mesh.position.y < 0.035) {
          mesh.position.y = 0.035;
          velocity.y *= -0.18;
          velocity.x *= 0.68;
          velocity.z *= 0.68;
        }
        mesh.scale.setScalar(baseScale * (1 - fade * 0.4));
      });
      rockMat.opacity = Math.max(0, 0.94 - fade * 1.04);

      embers.forEach(({ mesh, velocity }) => {
        mesh.position.addScaledVector(velocity, dt);
        velocity.y -= 8.8 * dt;
      });
      emberMat.opacity = Math.max(0, 0.98 - progress * 1.12);
      return elapsed >= duration;
    },
    dispose: () => {
      vfxScene?.remove(group);
      circleMat.dispose();
      crackMat.dispose();
      pressureMat.dispose();
      heatMat.dispose();
      shockMat.dispose();
      coreGlowMat.dispose();
      flameMat.dispose();
      flameCoreMat.dispose();
      smokeMat.dispose();
      rockMat.dispose();
      emberMat.dispose();
    },
  });
}
