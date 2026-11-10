// Holy skills — heals, buffs and cleanses.
//
// Split out of skillVfx.ts; see core.ts for the shared pools.

import * as THREE from 'three';
import {
  activeVfxList,
  cfxrAuraRaysTexture,
  flashVfxLight,
  hovlCircle2Texture,
  hovlCircleTexture,
  hovlFlashTexture,
  hovlGlowTexture,
  hovlHeartTexture,
  hovlMagicCircle2Texture,
  hovlMagicCircleTexture,
  hovlSmokeFree1Texture,
  hovlStarTexture,
  hovlTechCircle2Texture,
  hovlTrailTexture,
  sharedPillarGeo,
  sharedPlaneGeo,
  sharedSnareBandGeo,
  vfxScene,
} from './core.ts';


// ==========================================
// SKILL 5: Gentle Mend (ðŸ’š) â€” GRAND 3D Divine Healing Aura
// ==========================================
export function spawnGentleMendVfx(targetPos: THREE.Vector3) {
  if (!vfxScene) return;
  const group = new THREE.Group();
  group.position.copy(targetPos);
  vfxScene.add(group);

  const runeMat = new THREE.MeshBasicMaterial({ map: hovlMagicCircleTexture, color: '#58ff9b', transparent: true, opacity: 0.86, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const rune = new THREE.Mesh(sharedPlaneGeo, runeMat);
  rune.rotation.x = -Math.PI / 2;
  rune.position.y = 0.035;
  rune.scale.setScalar(0.94);
  group.add(rune);

  const haloMat = new THREE.MeshBasicMaterial({ map: hovlCircle2Texture, color: '#e4ffd8', transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const halo = new THREE.Mesh(sharedPlaneGeo, haloMat);
  halo.rotation.x = -Math.PI / 2;
  halo.position.y = 0.065;
  halo.scale.setScalar(0.14);
  group.add(halo);

  const pillarMat = new THREE.MeshBasicMaterial({ map: cfxrAuraRaysTexture || hovlGlowTexture, color: '#5cff9c', transparent: true, opacity: 0.72, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const pillar = new THREE.Mesh(sharedPillarGeo, pillarMat);
  pillar.position.set(0, 1.72, 0);
  pillar.scale.set(0.58, 1, 0.58);
  group.add(pillar);

  const bandMat = new THREE.MeshBasicMaterial({ color: '#4fe98a', transparent: true, opacity: 0.72, depthWrite: false, blending: THREE.NormalBlending, side: THREE.DoubleSide });
  const bands: THREE.Mesh[] = [];
  for (let i = 0; i < 3; i++) {
    const band = new THREE.Mesh(sharedSnareBandGeo, bandMat);
    band.rotation.x = Math.PI / 2;
    band.position.y = 0.32 + i * 0.48;
    band.scale.setScalar(0.24 + i * 0.09);
    group.add(band);
    bands.push(band);
  }

  const heartMat = new THREE.MeshBasicMaterial({ map: hovlHeartTexture, color: '#48e889', transparent: true, opacity: 0.92, depthWrite: false, blending: THREE.NormalBlending, side: THREE.DoubleSide });
  const hearts: Array<{ mesh: THREE.Mesh; angle: number; radius: number; rise: number; spin: number }> = [];
  for (let i = 0; i < 8; i++) {
    const mesh = new THREE.Mesh(sharedPlaneGeo, heartMat);
    mesh.scale.setScalar(0.32 + (i % 3) * 0.075);
    mesh.rotation.x = -Math.PI / 2;
    mesh.rotation.z = (i * Math.PI) / 4;
    group.add(mesh);
    hearts.push({ mesh, angle: (i * Math.PI * 2) / 8, radius: 0.46 + (i % 3) * 0.2, rise: 1.0 + (i % 4) * 0.28, spin: i % 2 ? 1 : -1 });
  }

  const starMat = new THREE.MeshBasicMaterial({ map: hovlStarTexture, color: '#fcffe5', transparent: true, opacity: 0.94, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const stars: Array<{ mesh: THREE.Mesh; angle: number; radius: number; height: number; spin: number }> = [];
  for (let i = 0; i < 13; i++) {
    const mesh = new THREE.Mesh(sharedPlaneGeo, starMat);
    mesh.scale.setScalar(0.09 + (i % 3) * 0.025);
    mesh.rotation.x = -Math.PI / 2;
    mesh.rotation.z = Math.random() * Math.PI * 2;
    group.add(mesh);
    stars.push({ mesh, angle: (i * Math.PI * 2) / 13 + Math.random() * 0.25, radius: 0.22 + (i % 4) * 0.15, height: 0.24 + (i % 5) * 0.16, spin: i % 2 ? 7 : -7 });
  }

  flashVfxLight('#22ff77', targetPos.x, targetPos.y + 0.85, targetPos.z, 1.0, 12.0);

  let elapsed = 0;
  const duration = 1.0;

  activeVfxList.push({
    update: (dt: number) => {
      elapsed += dt;
      const progress = Math.min(1, elapsed / duration);
      const bloom = Math.sin(progress * Math.PI);
      rune.rotation.z += dt * 2.9;
      rune.scale.setScalar(0.94 + progress * 1.34);
      runeMat.opacity = Math.max(0, 0.86 - progress * 1.02);
      halo.rotation.z -= dt * 4.8;
      halo.scale.setScalar(0.12 + bloom * 2.65 + progress * 0.82);
      haloMat.opacity = Math.max(0, 0.9 - progress * 1.12);
      pillar.rotation.y += dt * 3.2;
      pillar.scale.set(0.58 + bloom * 0.2, 0.58 + bloom * 0.42, 0.58 + bloom * 0.2);
      pillarMat.opacity = Math.max(0, 0.72 - progress * 0.94);
      bands.forEach((band, index) => {
        band.rotation.z += dt * (index % 2 ? -4.4 : 4.4);
        band.position.y = 0.28 + index * 0.46 + progress * 0.26;
        band.scale.setScalar(0.24 + index * 0.09 + bloom * 0.42);
      });
      bandMat.opacity = Math.max(0, 0.84 - progress * 1.05);
      hearts.forEach(({ mesh, angle, radius, rise, spin }) => {
        const orbit = angle + elapsed * 2.8 * spin;
        const distance = radius + progress * 0.44;
        mesh.position.set(Math.cos(orbit) * distance, 0.22 + rise * progress, Math.sin(orbit) * distance);
        mesh.rotation.z += dt * spin * 3.4;
      });
      heartMat.opacity = Math.max(0, 0.96 - progress * 1.07);
      stars.forEach(({ mesh, angle, radius, height, spin }) => {
        const orbit = angle - elapsed * 3.8 * spin;
        mesh.position.set(Math.cos(orbit) * (radius + progress * 0.36), height + progress * 0.52, Math.sin(orbit) * (radius + progress * 0.36));
        mesh.rotation.z += dt * spin;
      });
      starMat.opacity = Math.max(0, 0.94 - progress * 1.08);

      return elapsed >= duration;
    },
    dispose: () => {
      vfxScene?.remove(group);
      runeMat.dispose();
      haloMat.dispose();
      pillarMat.dispose();
      bandMat.dispose();
      heartMat.dispose();
      starMat.dispose();
    },
  });
}

// ==========================================
// SKILL 20: Quick Paws (ðŸ’¨) â€” Self Haste Wind Trails (r=1.2m)
// ==========================================
export function spawnQuickPawsVfx(casterPos: THREE.Vector3) {
  if (!vfxScene) return;
  const group = new THREE.Group();
  group.position.copy(casterPos);
  vfxScene.add(group);

  const circleMat = new THREE.MeshBasicMaterial({ map: hovlTechCircle2Texture || hovlMagicCircleTexture, color: '#ffd15c', transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const circleMesh = new THREE.Mesh(sharedPlaneGeo, circleMat);
  circleMesh.rotation.x = -Math.PI / 2;
  circleMesh.position.y = 0.035;
  circleMesh.scale.setScalar(0.65);
  group.add(circleMesh);

  const speedRingMat = new THREE.MeshBasicMaterial({ map: hovlCircleTexture, color: '#ffad16', transparent: true, opacity: 0.78, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const speedRing = new THREE.Mesh(sharedPlaneGeo, speedRingMat);
  speedRing.rotation.x = -Math.PI / 2;
  speedRing.position.y = 0.055;
  speedRing.scale.setScalar(0.48);
  group.add(speedRing);

  const bodyGlowMat = new THREE.SpriteMaterial({ map: hovlGlowTexture, color: '#ffb72d', transparent: true, opacity: 0.46, depthWrite: false, blending: THREE.AdditiveBlending });
  const bodyGlow = new THREE.Sprite(bodyGlowMat);
  bodyGlow.position.y = 0.78;
  bodyGlow.scale.set(0.38, 0.72, 1);
  group.add(bodyGlow);

  const pillarMat = new THREE.MeshBasicMaterial({ map: cfxrAuraRaysTexture || hovlFlashTexture, color: '#ffca3a', transparent: true, opacity: 0.62, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const pillarMesh = new THREE.Mesh(sharedPillarGeo, pillarMat);
  pillarMesh.position.set(0, 1.35, 0);
  pillarMesh.scale.set(0.72, 0.92, 0.72);
  group.add(pillarMesh);

  const trailMat = new THREE.SpriteMaterial({ map: hovlTrailTexture, color: '#ffe493', transparent: true, opacity: 0.82, depthWrite: false, blending: THREE.AdditiveBlending });
  const trails: Array<{ sprite: THREE.Sprite; angle: number; phase: number }> = [];
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const sprite = new THREE.Sprite(trailMat);
    sprite.position.set(Math.cos(angle) * 0.64, 0.28 + (i % 3) * 0.25, Math.sin(angle) * 0.64);
    sprite.scale.set(0.32, 1.05, 1);
    group.add(sprite);
    trails.push({ sprite, angle, phase: i * 0.37 });
  }

  const dustMat = new THREE.SpriteMaterial({ map: hovlSmokeFree1Texture, color: '#c8a761', transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.NormalBlending });
  const dust: THREE.Sprite[] = [];
  for (let i = 0; i < 5; i++) {
    const puff = new THREE.Sprite(dustMat);
    const a = (i / 5) * Math.PI * 2;
    puff.position.set(Math.cos(a) * 0.35, 0.12, Math.sin(a) * 0.35);
    puff.scale.setScalar(0.42);
    group.add(puff);
    dust.push(puff);
  }

  flashVfxLight('#ffbd35', casterPos.x, casterPos.y + 0.8, casterPos.z, 0.6, 10.0);

  let elapsed = 0;
  const duration = 0.86;
  activeVfxList.push({
    update: (dt: number) => {
      elapsed += dt;
      const progress = Math.min(1, elapsed / duration);
      const burst = 1 - Math.pow(1 - Math.min(1, progress * 4), 3);
      circleMesh.rotation.z += dt * 7.2;
      circleMesh.scale.setScalar(0.65 + burst * 2.2 + progress * 0.35);
      circleMat.opacity = Math.max(0, 0.9 - progress * 1.05);
      speedRing.rotation.z -= dt * 9;
      speedRing.scale.setScalar(0.48 + burst * 1.9 + progress * 0.55);
      speedRingMat.opacity = Math.max(0, 0.78 - progress * 0.95);
      bodyGlow.scale.set(0.38 + burst * 0.98, 0.72 + burst * 1.05, 1);
      bodyGlowMat.opacity = Math.max(0, 0.46 - progress * 0.52);
      pillarMesh.rotation.y += dt * 5.5;
      pillarMat.opacity = Math.max(0, 0.62 - progress * 0.78);
      trails.forEach((entry, i) => {
        const a = entry.angle + progress * 5.4;
        const radius = 0.58 + progress * 0.62;
        entry.sprite.position.x = Math.cos(a) * radius;
        entry.sprite.position.z = Math.sin(a) * radius;
        entry.sprite.position.y += dt * (1.25 + (i % 3) * 0.22);
        entry.sprite.scale.set(0.32 + progress * 0.18, 1.05 + progress * 0.75, 1);
      });
      trailMat.opacity = Math.max(0, 0.82 - progress * 0.9);
      dust.forEach((puff, i) => { puff.position.x *= 1 + dt * 1.9; puff.position.z *= 1 + dt * 1.9; puff.scale.setScalar(0.42 + progress * (0.55 + (i % 2) * 0.1)); });
      dustMat.opacity = Math.max(0, 0.35 - progress * 0.42);
      return elapsed >= duration;
    },
    dispose: () => {
      vfxScene?.remove(group);
      circleMat.dispose();
      speedRingMat.dispose();
      bodyGlowMat.dispose();
      pillarMat.dispose();
      trailMat.dispose();
      dustMat.dispose();
    },
  });
}

// ==========================================
// SKILL 21: Sunlit Blessing (â˜€ï¸) â€” Golden Blessing Crown (r=1.2m)
// ==========================================
export function spawnSunlitBlessingVfx(casterPos: THREE.Vector3) {
  if (!vfxScene) return;
  const group = new THREE.Group();
  group.position.copy(casterPos);
  vfxScene.add(group);

  const circleMat = new THREE.MeshBasicMaterial({ map: hovlMagicCircle2Texture || hovlMagicCircleTexture, color: '#ffd94a', transparent: true, opacity: 0.94, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const circleMesh = new THREE.Mesh(sharedPlaneGeo, circleMat);
  circleMesh.rotation.x = -Math.PI / 2;
  circleMesh.position.y = 0.035;
  circleMesh.scale.setScalar(0.58);
  group.add(circleMesh);

  const innerMat = new THREE.MeshBasicMaterial({ map: hovlCircleTexture, color: '#fff4a1', transparent: true, opacity: 0.82, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const inner = new THREE.Mesh(sharedPlaneGeo, innerMat);
  inner.rotation.x = -Math.PI / 2;
  inner.position.y = 0.055;
  inner.scale.setScalar(0.42);
  group.add(inner);

  const pillarMat = new THREE.MeshBasicMaterial({ map: cfxrAuraRaysTexture || hovlFlashTexture, color: '#ffc928', transparent: true, opacity: 0.72, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const pillarMesh = new THREE.Mesh(sharedPillarGeo, pillarMat);
  pillarMesh.position.set(0, 1.55, 0);
  pillarMesh.scale.set(0.88, 1.05, 0.88);
  group.add(pillarMesh);

  const haloGeo = new THREE.TorusGeometry(0.58, 0.035, 6, 32);
  const haloMat = new THREE.MeshBasicMaterial({ color: '#fff0a0', transparent: true, opacity: 0.86, depthWrite: false, blending: THREE.AdditiveBlending });
  const halos: THREE.Mesh[] = [];
  for (let i = 0; i < 2; i++) {
    const halo = new THREE.Mesh(haloGeo, haloMat);
    halo.rotation.x = Math.PI / 2;
    halo.position.y = 0.85 + i * 0.6;
    halo.scale.setScalar(0.45 + i * 0.2);
    group.add(halo);
    halos.push(halo);
  }

  const starMat = new THREE.SpriteMaterial({ map: hovlStarTexture, color: '#fff1a0', transparent: true, opacity: 0.92, depthWrite: false, blending: THREE.AdditiveBlending });
  const stars: Array<{ sprite: THREE.Sprite; angle: number; speed: number }> = [];
  for (let i = 0; i < 10; i++) {
    const angle = (i / 10) * Math.PI * 2;
    const sprite = new THREE.Sprite(starMat);
    sprite.position.set(Math.cos(angle) * (0.38 + (i % 3) * 0.12), 0.22 + (i % 4) * 0.32, Math.sin(angle) * (0.38 + (i % 3) * 0.12));
    sprite.scale.setScalar(0.17 + (i % 2) * 0.06);
    group.add(sprite);
    stars.push({ sprite, angle, speed: 2.4 + (i % 3) * 0.35 });
  }

  flashVfxLight('#ffee33', casterPos.x, casterPos.y + 0.8, casterPos.z, 0.75, 12.0);

  let elapsed = 0;
  const duration = 1.05;
  activeVfxList.push({
    update: (dt: number) => {
      elapsed += dt;
      const progress = Math.min(1, elapsed / duration);
      const bloom = 1 - Math.pow(1 - Math.min(1, progress * 3.7), 3);
      circleMesh.rotation.z += dt * 3.4;
      circleMesh.scale.setScalar(0.58 + bloom * 2.28 + progress * 0.18);
      circleMat.opacity = Math.max(0, 0.94 - progress * 1.0);
      inner.rotation.z -= dt * 4.6;
      inner.scale.setScalar(0.42 + bloom * 1.78 + progress * 0.28);
      innerMat.opacity = Math.max(0, 0.82 - progress * 0.9);
      pillarMesh.rotation.y += dt * 3.6;
      pillarMat.opacity = Math.max(0, 0.72 - progress * 0.74);
      halos.forEach((halo, i) => { halo.rotation.z += dt * (2.6 + i); halo.scale.setScalar(0.45 + i * 0.2 + bloom * 0.65 + progress * 0.2); });
      haloMat.opacity = Math.max(0, 0.86 - progress * 0.9);
      stars.forEach((entry, i) => {
        const a = entry.angle + progress * entry.speed;
        const radius = 0.42 + (i % 3) * 0.12 + progress * 0.28;
        entry.sprite.position.x = Math.cos(a) * radius;
        entry.sprite.position.z = Math.sin(a) * radius;
        entry.sprite.position.y += dt * (0.8 + (i % 3) * 0.2);
        entry.sprite.scale.setScalar(0.17 + Math.sin(progress * Math.PI) * 0.16 + (i % 2) * 0.05);
      });
      starMat.opacity = Math.max(0, 0.92 - progress * 0.86);
      return elapsed >= duration;
    },
    dispose: () => {
      vfxScene?.remove(group);
      circleMat.dispose();
      innerMat.dispose();
      pillarMat.dispose();
      haloMat.dispose();
      haloGeo.dispose();
      starMat.dispose();
    },
  });
}
