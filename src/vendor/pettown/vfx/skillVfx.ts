// Skill Visual Effects (VFX) Manager for PetTown Three.js
// High-Performance 60 FPS Engine with Pre-allocated Pools & Zero Shader Recompilation Stutter
//
// This file is only the public surface and the skill -> effect dispatch. The effects themselves
// live in ./skill/<element>.ts and the shared pools in ./skill/core.ts.

import * as THREE from 'three';
import { activeVfxList, decayVfxLight, preloadVfxAssetsForSkills, useVfxWarmupScene, vfxCamera, vfxConcurrencyBudget, vfxLayerScale, vfxPeakScale, vfxRenderer, vfxScene, vfxSpawnDistance, vfxTextureWarmupSnapshot } from './skill/core.ts';
import { getPushbackArrowImpactDelaySeconds, spawnBasicBowProjectileVfx, spawnClearMindVfx, spawnFeatherRainVfx, spawnFeatherWardVfx, spawnPawStrikeVfx, spawnPushbackArrowVfx, spawnSneakySnatchVfx, spawnSteadyPawsVfx, spawnTauntingBarkVfx, spawnTwinFangShotVfx } from './skill/physical.ts';
import { spawnCinderBurstVfx, spawnEmberPopVfx, spawnEmberSlamVfx, spawnFlameFenceVfx, spawnMeteorVfx } from './skill/fire.ts';
import { spawnFrostPokeVfx, spawnIceSnareVfx, spawnLordOfVermilionVfx, spawnRootboundGazeVfx, spawnSparkLanceVfx, spawnStormGustVfx, spawnThunderBloomVfx } from './skill/elemental.ts';
import { spawnGentleMendVfx, spawnQuickPawsVfx, spawnSunlitBlessingVfx } from './skill/holy.ts';
import { spawnMindRippleVfx, spawnShadowPawsVfx, spawnSpiritPinVfx, spawnToxicPawsVfx, spawnVenomNibbleVfx } from './skill/dark.ts';

export { initSkillVfx, setVfxQuality } from './skill/core.ts';

/** DEV diagnostics: how loaded the VFX system is right now, and what the preset allows. */
export function activeSkillVfxCount() { return activeVfxList.length; }
export function vfxBudgetSnapshot() {
  return { concurrency: vfxConcurrencyBudget, layerScale: vfxLayerScale, peakScale: vfxPeakScale, spawnDistance: vfxSpawnDistance };
}

function spawnSkillEffect(
  skillId: string,
  cPos: THREE.Vector3,
  tPos: THREE.Vector3,
  element = 'Neutral',
  areaRadius?: number,
) {
  switch (skillId) {
    case 'basic_bow_shot':
      spawnBasicBowProjectileVfx(cPos, tPos, element);
      break;
    case 'paw_strike':
      spawnPawStrikeVfx(tPos);
      break;
    case 'taunting_bark':
      spawnTauntingBarkVfx(tPos, areaRadius);
      break;
    case 'ember_slam':
      spawnEmberSlamVfx(tPos);
      break;
    case 'steady_paws':
      spawnSteadyPawsVfx(cPos);
      break;
    case 'twin_fang_shot':
      spawnTwinFangShotVfx(tPos);
      break;
    case 'feather_rain':
      spawnFeatherRainVfx(tPos);
      break;
    case 'pushback_arrow':
      spawnPushbackArrowVfx(tPos, cPos);
      return getPushbackArrowImpactDelaySeconds(cPos, tPos);
    case 'mind_ripple':
      spawnMindRippleVfx(tPos);
      break;
    case 'spirit_pin':
      spawnSpiritPinVfx(tPos);
      break;
    case 'frost_poke':
      spawnFrostPokeVfx(tPos, cPos);
      break;
    case 'ice_snare':
      spawnIceSnareVfx(tPos);
      break;
    case 'rootbound_gaze':
      spawnRootboundGazeVfx(tPos);
      break;
    case 'cinder_burst':
      spawnCinderBurstVfx(tPos);
      break;
    case 'flame_fence':
      spawnFlameFenceVfx(tPos);
      break;
    case 'meteor':
      spawnMeteorVfx(tPos);
      break;
    case 'ember_pop':
      spawnEmberPopVfx(tPos);
      break;
    case 'spark_lance':
      spawnSparkLanceVfx(tPos);
      break;
    case 'thunder_bloom':
      spawnThunderBloomVfx(tPos);
      break;
    case 'lord_of_vermilion':
      spawnLordOfVermilionVfx(tPos);
      break;
    case 'storm_gust':
      spawnStormGustVfx(tPos);
      break;
    case 'feather_ward':
      spawnFeatherWardVfx(tPos, areaRadius);
      break;
    case 'gentle_mend':
      spawnGentleMendVfx(tPos);
      break;
    case 'quick_paws':
      spawnQuickPawsVfx(tPos);
      break;
    case 'increase_agi':
      spawnQuickPawsVfx(cPos);
      break;
    case 'swiftblade_paws':
      spawnQuickPawsVfx(cPos);
      spawnTwinFangShotVfx(cPos);
      break;
    case 'sunlit_blessing':
    case 'pawsurrection':
      spawnSunlitBlessingVfx(tPos);
      break;
    case 'clear_mind':
      spawnClearMindVfx(tPos);
      break;
    case 'sneaky_snatch':
      spawnSneakySnatchVfx(tPos, cPos);
      break;
    case 'shadow_paws':
      spawnShadowPawsVfx(cPos);
      break;
    case 'venom_nibble':
      spawnVenomNibbleVfx(tPos);
      break;
    case 'pure_paws':
      spawnToxicPawsVfx(tPos, cPos);
      break;
    default:
      spawnPawStrikeVfx(tPos);
      break;
  }
  return 0;
}

const warmedSkillVfxIds = new Set<string>();
// Material.dispose() releases its WebGLProgram reference and would undo the compile we just paid
// for. Keep only the detached materials (not the temporary meshes/controllers) for the session so
// Three's program cache retains every selected shader variant without keeping whole effects alive.
const retainedSkillVfxWarmMaterials: THREE.Material[] = [];
let skillVfxWarmupQueue: Promise<void> = Promise.resolve();
let failedSkillVfxWarmups = 0;

async function warmSkillVfxBatch(skillIds: string[]) {
  const textures = await preloadVfxAssetsForSkills(skillIds);
  if (!vfxRenderer || !vfxCamera || !vfxScene) return;
  for (const texture of textures) {
    if (!texture) continue;
    try { vfxRenderer.initTexture(texture); } catch (error) { console.warn('Skill VFX texture GPU warm-up failed.', error); }
  }

  const worldScene = vfxScene;
  const warmScene = new THREE.Scene();
  const effectStart = activeVfxList.length;
  const restoreScene = useVfxWarmupScene(warmScene);
  let warmEffects: typeof activeVfxList = [];
  let compile: Promise<unknown> = Promise.resolve();
  try {
    const caster = new THREE.Vector3(0, 0, 0);
    const target = new THREE.Vector3(0, 0, 3);
    for (const skillId of skillIds) {
      try { spawnSkillEffect(skillId, caster, target, 'Neutral', 3); }
      catch (error) { console.warn(`Skill VFX warm-up construction failed: ${skillId}`, error); }
    }
    // Warm effects must never enter the live update loop while compileAsync is yielding.
    warmEffects = activeVfxList.splice(effectStart);
    compile = typeof vfxRenderer.compileAsync === 'function'
      ? vfxRenderer.compileAsync(warmScene, vfxCamera, worldScene)
      : Promise.resolve(vfxRenderer.compile(warmScene, vfxCamera, worldScene));
  } finally {
    restoreScene();
  }

  try { await compile; }
  finally {
    const materials = new Set<THREE.Material>();
    warmScene.traverse((object: any) => {
      if (!object.material) return;
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) if (material) materials.add(material);
    });
    retainedSkillVfxWarmMaterials.push(...materials);
    warmScene.clear();
    // Drop controller closures now that their materials have independent strong references.
    warmEffects.length = 0;
  }
}

/**
 * Fetches, uploads and compiles only the VFX used by the current loadout. Calls are serialized so
 * changing a loadout while the game is live cannot redirect the shared VFX scene concurrently.
 */
export function warmSkillVfxAssets(skillIds: readonly string[]) {
  const requested = [...new Set(skillIds.map((skillId) => String(skillId || '')).filter((skillId) => skillId && skillId !== 'none'))];
  const task = skillVfxWarmupQueue.then(async () => {
    const pending = requested.filter((skillId) => !warmedSkillVfxIds.has(skillId));
    if (!pending.length) {
      await preloadVfxAssetsForSkills(requested);
      return;
    }
    try { await warmSkillVfxBatch(pending); }
    catch (error) { failedSkillVfxWarmups += 1; console.warn('Equipped Skill VFX warm-up failed; runtime fallback remains available.', error); }
    finally { pending.forEach((skillId) => warmedSkillVfxIds.add(skillId)); }
  });
  skillVfxWarmupQueue = task.then(() => undefined, () => undefined);
  return task;
}

export function skillVfxWarmupSnapshot() {
  return { skills: [...warmedSkillVfxIds], retainedMaterials: retainedSkillVfxWarmMaterials.length, failed: failedSkillVfxWarmups, textures: vfxTextureWarmupSnapshot() };
}

// Router for all active-skill VFX.
export function triggerSkillVfx(
  skillId: string,
  casterPos: { x: number; y: number; z: number },
  targetPos?: { x: number; y: number; z: number },
  element = 'Neutral',
  areaRadius?: number,
) {
  // Unknown/remote skills still get a safe procedural fallback for this cast, while their authored
  // texture recipe begins loading for subsequent casts. Equipped local skills are already warm.
  void preloadVfxAssetsForSkills([skillId]);
  if (!vfxScene) return 0;

  // Two guards that apply to every skill, before any of them allocates anything.
  //
  // Distance: in a party fight most casts land off to the side of what the player is looking at,
  // and a boss slam is ~24 large additive layers whether or not anyone sees it.
  if (vfxCamera && Math.hypot(targetPos ? targetPos.x - vfxCamera.position.x : casterPos.x - vfxCamera.position.x,
    targetPos ? targetPos.z - vfxCamera.position.z : casterPos.z - vfxCamera.position.z) > vfxSpawnDistance) return 0;
  // Budget: five players plus a boss casting into the same space is what actually stalls a frame.
  // The OLDEST effect goes, not the new one - dropping the newest would silently swallow the cast
  // the player just made, which reads as an input bug rather than as a quality setting.
  while (activeVfxList.length >= vfxConcurrencyBudget) {
    const oldest = activeVfxList.shift();
    try { oldest?.dispose(); } catch (error) { console.warn('Skill VFX dispose failed while trimming to budget.', error); }
  }

  const cPos = new THREE.Vector3(casterPos.x, casterPos.y, casterPos.z);
  const tPos = targetPos
    ? new THREE.Vector3(targetPos.x, targetPos.y, targetPos.z)
    : new THREE.Vector3(casterPos.x + Math.sin(0) * 3, casterPos.y, casterPos.z + Math.cos(0) * 3);

  return spawnSkillEffect(skillId, cPos, tPos, element, areaRadius);
}


export function updateSkillVfx(dt: number) {
  // Clamp tab-resume spikes and isolate each effect. One malformed optional VFX must never stop
  // the game's shared animation loop (movement, combat, input and rendering all use that loop).
  const safeDt = Number.isFinite(dt) ? THREE.MathUtils.clamp(dt, 0, 0.1) : 0;
  decayVfxLight(safeDt);

  for (let i = activeVfxList.length - 1; i >= 0; i--) {
    const vfx = activeVfxList[i];
    let finished = false;
    try {
      finished = vfx.update(safeDt);
    } catch (error) {
      console.warn('Skill VFX update failed; removing the effect so the game can continue.', error);
      finished = true;
    }
    if (finished) {
      try {
        vfx.dispose();
      } catch (error) {
        console.warn('Skill VFX cleanup failed.', error);
      }
      activeVfxList.splice(i, 1);
    }
  }
}
