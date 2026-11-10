// Client-only texture recipes for Active Skill presentation.
//
// Keep this table next to the VFX router, not in shared/activeSkills.mjs: combat authority does
// not depend on presentation files. A new Active Skill must declare the textures its VFX touches
// here so the equipped loadout can fetch/decode/upload them before the first cast.

export const VFX_TEXTURE_URL_BY_KEY = Object.freeze({
  hovlSlashTexture: '/assets/fx/hovl-slash.png',
  hovlFlashTexture: '/assets/fx/hovl-flash.png',
  cfxrHitTriangleTexture: '/assets/fx/cfxr-hit-triangle.png',
  hovlMagicCircleTexture: '/assets/fx/hovl-magic-circle.png',
  hovlCrackTexture: '/assets/fx/hovl-crack.png',
  hovlCraterTexture: '/assets/fx/hovl-crater.png',
  hovlSplatTexture: '/assets/fx/hovl-splat.png',
  hovlSmoke26Texture: '/assets/fx/hovl-smoke26.png',
  cfxrRayBlurTexture: '/assets/fx/cfxr-ray-blur.png',
  cfxrFlareTexture: '/assets/fx/cfxr-flare.png',
  cfxrSpikeFadeTexture: '/assets/fx/cfxr-spike-fade.png',
  hovlSnowflakeTexture: '/assets/fx/hovl-snowflake.png',
  cfxrDebrisIceTexture: '/assets/fx/cfxr-debris-ice.png',
  cfxrRingIceTexture: '/assets/fx/cfxr-ring-ice.png',
  cfxrWaterSplashTexture: '/assets/fx/cfxr-water-splash.png',
  hovlElectroTexture: '/assets/fx/hovl-electro.png',
  cfxrElectricArcTexture: '/assets/fx/cfxr-electric-arc.png',
  cfxrElectricSparkTexture: '/assets/fx/cfxr-electric-spark.png',
  cfxrRingElectricTexture: '/assets/fx/cfxr-ring-electric.png',
  cfxrLineElectricTexture: '/assets/fx/cfxr-line-electric.png',
  cfxrAuraRaysTexture: '/assets/fx/cfxr-aura-rays.png',
  cfxrAuraRunicTexture: '/assets/fx/cfxr-aura-runic.png',
  cfxrMagicStarTexture: '/assets/fx/cfxr-magic-star.png',
  hovlMagicCircle2Texture: '/assets/fx/hovl-magic-circle2.png',
  hovlFlareTexture: '/assets/fx/hovl-flare.png',
  hovlGlowTexture: '/assets/fx/hovl-glow-free1.png',
  hovlStarTexture: '/assets/fx/hovl-star.png',
  hovlTechCircle2Texture: '/assets/fx/hovl-tech-circle2.png',
  hovlTrailTexture: '/assets/fx/hovl-trail67.png',
  hovlFlashFree2Texture: '/assets/fx/hovl-flash-free2.png',
  hovlArrowTexture: '/assets/fx/hovl-arrow1.png',
  hovlProjectileTexture: '/assets/fx/hovl-projectile-free1.png',
  hovlCircle2Texture: '/assets/fx/hovl-circle2.png',
  hovlFlashFree1Texture: '/assets/fx/hovl-flash-free1.png',
  hovlPointTexture: '/assets/fx/hovl-point1.png',
  hovlHeartTexture: '/assets/fx/hovl-heart.png',
  hovlStoneTexture: '/assets/fx/hovl-stone.png',
  hovlSmokeFree1Texture: '/assets/fx/hovl-smoke-free1.png',
  hovlCircleTexture: '/assets/fx/hovl-circle.png',
});

const recipe = (...keys) => Object.freeze(keys);

export const VFX_TEXTURE_KEYS_BY_SKILL = Object.freeze({
  basic_bow_shot: recipe('cfxrFlareTexture', 'cfxrRayBlurTexture'),
  paw_strike: recipe('hovlSlashTexture', 'cfxrHitTriangleTexture'),
  taunting_bark: recipe('hovlTechCircle2Texture', 'hovlFlashFree1Texture', 'hovlCircle2Texture', 'hovlArrowTexture', 'hovlStarTexture'),
  steady_paws: recipe('cfxrAuraRunicTexture', 'hovlTechCircle2Texture', 'cfxrAuraRaysTexture', 'hovlStarTexture'),
  swiftblade_paws: recipe('hovlTechCircle2Texture', 'hovlCircleTexture', 'hovlGlowTexture', 'cfxrAuraRaysTexture', 'hovlTrailTexture', 'hovlSmokeFree1Texture', 'hovlSlashTexture', 'hovlFlashFree1Texture', 'hovlCircle2Texture', 'hovlStarTexture'),
  increase_agi: recipe('hovlTechCircle2Texture', 'hovlCircleTexture', 'hovlGlowTexture', 'cfxrAuraRaysTexture', 'hovlTrailTexture', 'hovlSmokeFree1Texture'),
  twin_fang_shot: recipe('hovlTechCircle2Texture', 'hovlSlashTexture', 'hovlFlashFree1Texture', 'hovlCircle2Texture', 'hovlStarTexture'),
  feather_rain: recipe('cfxrAuraRunicTexture', 'cfxrRingElectricTexture', 'hovlTechCircle2Texture', 'hovlGlowTexture', 'hovlTrailTexture', 'cfxrRingIceTexture', 'hovlStarTexture'),
  pushback_arrow: recipe('hovlCircle2Texture', 'hovlGlowTexture', 'hovlSlashTexture', 'hovlPointTexture', 'hovlFlashFree1Texture'),
  feather_ward: recipe('cfxrAuraRunicTexture', 'hovlTechCircle2Texture', 'hovlGlowTexture', 'cfxrSpikeFadeTexture', 'hovlStarTexture'),
  clear_mind: recipe('hovlMagicCircleTexture', 'cfxrWaterSplashTexture', 'hovlPointTexture'),
  sneaky_snatch: recipe('hovlTechCircle2Texture', 'hovlMagicCircle2Texture', 'hovlSlashTexture', 'hovlPointTexture', 'hovlStarTexture', 'hovlSmokeFree1Texture'),

  ember_slam: recipe('hovlMagicCircleTexture', 'hovlCrackTexture', 'hovlFlashTexture', 'cfxrRayBlurTexture', 'hovlSmoke26Texture', 'hovlSplatTexture'),
  meteor: recipe('hovlMagicCircle2Texture', 'cfxrRayBlurTexture', 'hovlFlashTexture', 'cfxrRingElectricTexture'),
  cinder_burst: recipe('hovlMagicCircleTexture', 'hovlCrackTexture', 'hovlFlashTexture', 'cfxrRingElectricTexture', 'hovlGlowTexture', 'hovlSmoke26Texture', 'hovlStarTexture'),
  flame_fence: recipe('hovlCrackTexture', 'hovlTechCircle2Texture', 'cfxrRingElectricTexture', 'hovlFlareTexture', 'hovlStarTexture'),
  ember_pop: recipe('hovlMagicCircleTexture', 'hovlCraterTexture', 'hovlFlashTexture', 'hovlFlareTexture', 'hovlCircleTexture', 'hovlPointTexture', 'hovlSmokeFree1Texture', 'hovlSmoke26Texture', 'hovlStoneTexture'),

  frost_poke: recipe('hovlMagicCircleTexture', 'hovlCircle2Texture', 'hovlFlashFree2Texture', 'hovlSnowflakeTexture'),
  lord_of_vermilion: recipe(),
  storm_gust: recipe(),
  spark_lance: recipe('hovlMagicCircleTexture', 'hovlCircle2Texture', 'hovlFlashFree1Texture', 'hovlElectroTexture', 'hovlStarTexture'),
  thunder_bloom: recipe('cfxrLineElectricTexture', 'cfxrElectricArcTexture', 'cfxrAuraRunicTexture', 'hovlMagicCircle2Texture', 'hovlTechCircle2Texture', 'hovlGlowTexture', 'cfxrRingElectricTexture', 'cfxrRayBlurTexture', 'hovlStarTexture', 'cfxrElectricSparkTexture'),
  ice_snare: recipe('hovlMagicCircleTexture', 'hovlCircle2Texture', 'hovlFlashFree1Texture', 'hovlSnowflakeTexture'),
  rootbound_gaze: recipe('hovlMagicCircleTexture', 'hovlCraterTexture', 'hovlFlashFree2Texture', 'hovlPointTexture', 'hovlStoneTexture', 'hovlSmokeFree1Texture'),

  gentle_mend: recipe('hovlMagicCircleTexture', 'hovlCircle2Texture', 'cfxrAuraRaysTexture', 'hovlHeartTexture', 'hovlStarTexture'),
  quick_paws: recipe('hovlTechCircle2Texture', 'hovlCircleTexture', 'hovlGlowTexture', 'cfxrAuraRaysTexture', 'hovlTrailTexture', 'hovlSmokeFree1Texture'),
  sunlit_blessing: recipe('hovlMagicCircle2Texture', 'hovlCircleTexture', 'cfxrAuraRaysTexture', 'hovlStarTexture'),
  pawsurrection: recipe('hovlMagicCircle2Texture', 'hovlCircleTexture', 'cfxrAuraRaysTexture', 'hovlStarTexture'),

  mind_ripple: recipe('hovlTechCircle2Texture', 'hovlGlowTexture', 'hovlCircle2Texture', 'hovlPointTexture'),
  spirit_pin: recipe('cfxrAuraRunicTexture', 'hovlTechCircle2Texture', 'hovlTrailTexture', 'hovlGlowTexture', 'hovlCircle2Texture', 'hovlSmoke26Texture', 'hovlStarTexture'),
  shadow_paws: recipe('hovlMagicCircle2Texture', 'hovlTechCircle2Texture', 'hovlSmokeFree1Texture', 'hovlTrailTexture', 'hovlPointTexture'),
  pure_paws: recipe('hovlMagicCircleTexture', 'hovlCrackTexture', 'hovlSplatTexture', 'hovlCircleTexture', 'cfxrRayBlurTexture', 'hovlSmokeFree1Texture', 'hovlPointTexture'),
  venom_nibble: recipe('hovlMagicCircleTexture', 'hovlSplatTexture', 'hovlCircleTexture', 'hovlSlashTexture', 'hovlSmokeFree1Texture', 'hovlPointTexture'),
});

export function vfxTextureKeysForSkills(skillIds) {
  const keys = new Set();
  for (const rawSkillId of Array.isArray(skillIds) ? skillIds : []) {
    const skillId = String(rawSkillId || '');
    if (!skillId || skillId === 'none') continue;
    const skillRecipe = VFX_TEXTURE_KEYS_BY_SKILL[skillId] || VFX_TEXTURE_KEYS_BY_SKILL.paw_strike;
    for (const key of skillRecipe) keys.add(key);
  }
  return [...keys];
}
