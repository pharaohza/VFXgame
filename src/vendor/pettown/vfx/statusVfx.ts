import * as THREE from 'three';

type StatusEffect = {
  id: string;
  group: THREE.Group;
  materials: THREE.Material[];
  update: (time: number) => void;
};

type TargetStatusState = {
  target: THREE.Object3D;
  height: number;
  effects: Map<string, StatusEffect>;
};

const targetStates = new WeakMap<THREE.Object3D, TargetStatusState>();
const liveStates = new Set<TargetStatusState>();
const instanceDummy = new THREE.Object3D();
let statusTime = 0;

const sphereGeo = new THREE.SphereGeometry(0.11, 8, 6);
const iceGeo = new THREE.ConeGeometry(0.16, 1.25, 5);
const shardGeo = new THREE.ConeGeometry(0.14, 0.7, 5);
const flameGeo = new THREE.ConeGeometry(0.13, 0.65, 7);
const boltGeo = new THREE.BoxGeometry(0.075, 0.62, 0.075);
const diamondGeo = new THREE.OctahedronGeometry(0.14, 0);
const ringGeo = new THREE.TorusGeometry(0.64, 0.035, 6, 28);
const smallRingGeo = new THREE.TorusGeometry(0.42, 0.025, 6, 24);

const BODY_TINTS: Readonly<Record<string, string>> = Object.freeze({
  poison: '#8f38c9',
  freeze: '#83e9ff',
  petrify: '#817c72',
  burn: '#ff5b25',
  shock: '#fff04a',
  haunt: '#9447d8',
  fright: '#b468e8',
  stun: '#ffd74b',
});

const AURA_COLORS: Readonly<Record<string, string>> = Object.freeze({
  endure: '#62d9ff', swiftblade_quicken: '#ffc75b', increase_agi: '#ffe26b',
  ranged_ward: '#b9e9ff', haste: '#ffd968', blessing: '#ffe77c', hidden: '#8a62c9',
});

export function statusBodyTint(id: string): string | null {
  return BODY_TINTS[String(id || '').toLowerCase()] || null;
}

function glyphTexture(kind: 'star' | 'eye' | 'alert'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 96;
  const ctx = canvas.getContext('2d')!;
  ctx.translate(48, 48);
  if (kind === 'star') {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const radius = i % 2 ? 18 : 39, angle = -Math.PI / 2 + i * Math.PI / 5;
      const x = Math.cos(angle) * radius, y = Math.sin(angle) * radius;
      if (!i) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = '#fff36a';ctx.shadowColor = '#ffb92e';ctx.shadowBlur = 14;ctx.fill();
    ctx.lineWidth = 5;ctx.strokeStyle = '#fffbd0';ctx.stroke();
  } else if (kind === 'eye') {
    ctx.fillStyle = '#d9a1ff';ctx.shadowColor = '#8d39d8';ctx.shadowBlur = 15;
    ctx.beginPath();ctx.ellipse(0, 0, 39, 23, 0, 0, Math.PI * 2);ctx.fill();
    ctx.fillStyle = '#3a145b';ctx.beginPath();ctx.arc(0, 0, 12, 0, Math.PI * 2);ctx.fill();
    ctx.fillStyle = '#fff';ctx.beginPath();ctx.arc(-4, -4, 4, 0, Math.PI * 2);ctx.fill();
  } else {
    ctx.font = '900 70px system-ui';ctx.textAlign = 'center';ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffb54c';ctx.strokeStyle = '#fff6ce';ctx.lineWidth = 8;ctx.strokeText('!', 0, 2);ctx.fillText('!', 0, 2);
  }
  const texture = new THREE.CanvasTexture(canvas);texture.colorSpace = THREE.SRGBColorSpace;texture.minFilter = THREE.LinearFilter;
  return texture;
}

const starTexture = glyphTexture('star');
const eyeTexture = glyphTexture('eye');
const alertTexture = glyphTexture('alert');

function basicMaterial(color: string, opacity = 0.85, additive = true): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,blending:additive?THREE.AdditiveBlending:THREE.NormalBlending,side:THREE.DoubleSide});
}

function spriteMaterial(texture: THREE.Texture, color = '#ffffff'): THREE.SpriteMaterial {
  return new THREE.SpriteMaterial({map:texture,color,transparent:true,opacity:.95,depthWrite:false,depthTest:false,blending:THREE.AdditiveBlending});
}

function orbitSprites(group: THREE.Group, texture: THREE.Texture, count: number, height: number, radius: number, scale: number, color = '#ffffff') {
  const material = spriteMaterial(texture, color), sprites: THREE.Sprite[] = [];
  for (let i = 0; i < count; i++) {
    const sprite = new THREE.Sprite(material);sprite.scale.setScalar(scale);sprite.renderOrder = 19;group.add(sprite);sprites.push(sprite);
  }
  return {material,sprites,update:(time:number,speed=2.4)=>sprites.forEach((sprite,index)=>{const angle=time*speed+index*Math.PI*2/count;sprite.position.set(Math.cos(angle)*radius,height+Math.sin(time*4+index)*.08,Math.sin(angle)*radius);sprite.scale.setScalar(scale*(.9+Math.sin(time*5+index)*.1));})};
}

function auraEffect(id: string, height: number): StatusEffect {
  const group = new THREE.Group(),color=AURA_COLORS[id]||'#ffffff',ringMat=basicMaterial(color,.72),sparkMat=basicMaterial(color,.82),materials=[ringMat,sparkMat];
  const lower=new THREE.Mesh(ringGeo,ringMat),upper=new THREE.Mesh(smallRingGeo,ringMat);lower.rotation.x=upper.rotation.x=Math.PI/2;lower.position.y=.12;upper.position.y=height*.58;group.add(lower,upper);
  const sparkCount=5,sparks=new THREE.InstancedMesh(diamondGeo,sparkMat,sparkCount);sparks.instanceMatrix.setUsage(THREE.DynamicDrawUsage);group.add(sparks);
  return {id,group,materials,update:(time)=>{lower.rotation.z=time*1.6;upper.rotation.z=-time*2.2;const pulse=1+Math.sin(time*4)*.07;lower.scale.setScalar(pulse);upper.scale.setScalar(2-pulse);for(let index=0;index<sparkCount;index++){const phase=time*.9+index*Math.PI*2/sparkCount;instanceDummy.position.set(Math.cos(phase)*.58,.24+((time*.35+index/sparkCount)%1)*height*.72,Math.sin(phase)*.58);instanceDummy.rotation.set(0,time*3+index,0);instanceDummy.scale.setScalar(.65);instanceDummy.updateMatrix();sparks.setMatrixAt(index,instanceDummy.matrix);}sparks.instanceMatrix.needsUpdate=true;}};
}

function createStatusEffect(id: string, height: number): StatusEffect | null {
  const group = new THREE.Group();group.name=`StatusVfx_${id}`;
  if (AURA_COLORS[id]) return auraEffect(id,height);

  if (id === 'stun') {
    const orbit=orbitSprites(group,starTexture,4,height+.2,.52,.42);
    return {id,group,materials:[orbit.material],update:(time)=>orbit.update(time,2.8)};
  }
  if (id === 'fright') {
    const orbit=orbitSprites(group,eyeTexture,3,height*.84,.48,.38,'#d6a2ff');
    return {id,group,materials:[orbit.material],update:(time)=>orbit.update(time,-1.8)};
  }
  if (id === 'taunt') {
    const orbit=orbitSprites(group,alertTexture,3,height+.14,.46,.34);
    return {id,group,materials:[orbit.material],update:(time)=>orbit.update(time,2.1)};
  }
  if (id === 'freeze') {
    const iceMat=basicMaterial('#a8f4ff',.82),materials=[iceMat],spikeCount=8,spikes=new THREE.InstancedMesh(iceGeo,iceMat,spikeCount),baseScales=Array.from({length:spikeCount},(_,i)=>.92+(i%4)*.12);spikes.instanceMatrix.setUsage(THREE.DynamicDrawUsage);group.add(spikes);
    const ring=new THREE.Mesh(ringGeo,iceMat);ring.rotation.x=Math.PI/2;ring.position.y=.08;group.add(ring);
    return {id,group,materials,update:(time)=>{ring.rotation.z=time*.9;const pulse=.95+Math.sin(time*3)*.05;for(let index=0;index<spikeCount;index++){const angle=index*Math.PI/4,scale=baseScales[index]*pulse;instanceDummy.position.set(Math.cos(angle)*.44,.64,Math.sin(angle)*.44);instanceDummy.rotation.set(Math.sin(angle)*.2,0,Math.cos(angle)*.2);instanceDummy.scale.set(scale*.95,scale*1.18,scale*.95);instanceDummy.updateMatrix();spikes.setMatrixAt(index,instanceDummy.matrix);}spikes.instanceMatrix.needsUpdate=true;}};
  }
  if (id === 'poison') {
    const poisonMat=basicMaterial('#a743d6',.76,false),glowMat=basicMaterial('#df73ff',.78),materials=[poisonMat,glowMat],bubbleCount=8,bubbles=new THREE.InstancedMesh(sphereGeo,poisonMat,bubbleCount),phases=Array.from({length:bubbleCount},(_,i)=>i/bubbleCount);bubbles.instanceMatrix.setUsage(THREE.DynamicDrawUsage);group.add(bubbles);
    const ring=new THREE.Mesh(smallRingGeo,glowMat);ring.rotation.x=Math.PI/2;ring.position.y=.12;group.add(ring);
    return {id,group,materials,update:(time)=>{ring.rotation.z=-time*1.5;ring.scale.setScalar(1.35+Math.sin(time*3)*.14);for(let index=0;index<bubbleCount;index++){const cycle=(time*.32+phases[index])%1,angle=time*.8+index*2.1,scale=(.9+(index%3)*.2)*(1-cycle*.48);instanceDummy.position.set(Math.cos(angle)*(.4+cycle*.2),.2+cycle*height*.88,Math.sin(angle)*(.4+cycle*.2));instanceDummy.rotation.set(0,0,0);instanceDummy.scale.setScalar(scale);instanceDummy.updateMatrix();bubbles.setMatrixAt(index,instanceDummy.matrix);}bubbles.instanceMatrix.needsUpdate=true;}};
  }
  if (id === 'burn') {
    const outer=basicMaterial('#ff5428',.78),inner=basicMaterial('#ffd75b',.88),materials=[outer,inner],flames:THREE.Mesh[]=[];
    for(let i=0;i<7;i++){const a=i*Math.PI*2/7,flame=new THREE.Mesh(flameGeo,i%2?outer:inner);flame.position.set(Math.cos(a)*.36,.3,Math.sin(a)*.36);flame.userData.base=.65+(i%3)*.16;group.add(flame);flames.push(flame);}
    return {id,group,materials,update:(time)=>flames.forEach((flame,index)=>{const flicker=flame.userData.base*(.85+Math.sin(time*11+index*2.4)*.2);flame.scale.set(.85,flicker, .85);flame.position.y=.24+flicker*.28;})};
  }
  if (id === 'shock') {
    const boltMat=basicMaterial('#fff04a',.96),materials=[boltMat],boltCount=6,bolts=new THREE.InstancedMesh(boltGeo,boltMat,boltCount);bolts.instanceMatrix.setUsage(THREE.DynamicDrawUsage);group.add(bolts);
    return {id,group,materials,update:(time)=>{boltMat.opacity=.42+Math.abs(Math.sin(time*15))*.54;for(let index=0;index<boltCount;index++){const angle=index*Math.PI/3,scale=.82+Math.sin(time*18+index)*.18;instanceDummy.position.set(Math.cos(angle)*.4,.45+(index%3)*height*.22,Math.sin(angle)*.4);instanceDummy.rotation.set(0,0,angle+(index%2?.48:-.48));instanceDummy.scale.setScalar(scale);instanceDummy.updateMatrix();bolts.setMatrixAt(index,instanceDummy.matrix);}bolts.instanceMatrix.needsUpdate=true;}};
  }
  if (id === 'petrify') {
    const stoneMat=basicMaterial('#aaa392',.8,false),edgeMat=basicMaterial('#e1d7bd',.64),materials=[stoneMat,edgeMat],shards:THREE.Mesh[]=[];
    for(let i=0;i<6;i++){const a=i*Math.PI/3,shard=new THREE.Mesh(shardGeo,i%2?stoneMat:edgeMat);shard.position.set(Math.cos(a)*.42,.25+(i%2)*.16,Math.sin(a)*.42);shard.rotation.z=Math.cos(a)*.25;shard.scale.setScalar(.8+(i%3)*.15);group.add(shard);shards.push(shard);}
    return {id,group,materials,update:(time)=>shards.forEach((shard,index)=>shard.rotation.y=Math.sin(time*.8+index)*.08)};
  }
  if (id === 'haunt') {
    const wispMat=basicMaterial('#a34de1',.66),coreMat=basicMaterial('#ead1ff',.8),materials=[wispMat,coreMat],wisps:THREE.Mesh[]=[];
    for(let i=0;i<4;i++){const wisp=new THREE.Mesh(sphereGeo,i%2?wispMat:coreMat);wisp.scale.set(.75,1.5,.75);group.add(wisp);wisps.push(wisp);}
    const ring=new THREE.Mesh(ringGeo,wispMat);ring.rotation.x=Math.PI/2;ring.position.y=height*.5;group.add(ring);
    return {id,group,materials,update:(time)=>{ring.rotation.z=time;ring.scale.setScalar(.78+Math.sin(time*2.4)*.08);wisps.forEach((wisp,index)=>{const a=-time*1.1+index*Math.PI/2;wisp.position.set(Math.cos(a)*.52,.45+Math.sin(time*2+index)*.16+index*.2,Math.sin(a)*.52);});}};
  }
  if (id === 'pushback') {
    const arrowMat=basicMaterial('#e8f4ff',.86),materials=[arrowMat],arrows:THREE.Mesh[]=[];
    for(let i=0;i<6;i++){const arrow=new THREE.Mesh(shardGeo,arrowMat),angle=i*Math.PI/3;arrow.userData.angle=angle;arrow.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(Math.cos(angle),0,Math.sin(angle)));group.add(arrow);arrows.push(arrow);}
    return {id,group,materials,update:(time)=>arrows.forEach((arrow,index)=>{const cycle=(time*2.4+index/6)%1,a=arrow.userData.angle,radius=.18+cycle*.75;arrow.position.set(Math.cos(a)*radius,.42,Math.sin(a)*radius);arrow.scale.setScalar(1-cycle*.45);})};
  }
  if (id === 'snatch') {
    const goldMat=basicMaterial('#ffd36e',.9),materials=[goldMat],diamonds:THREE.Mesh[]=[];
    for(let i=0;i<4;i++){const gem=new THREE.Mesh(diamondGeo,goldMat);group.add(gem);diamonds.push(gem);}
    return {id,group,materials,update:(time)=>diamonds.forEach((gem,index)=>{const a=time*1.7+index*Math.PI/2;gem.position.set(Math.cos(a)*.5,height*.72+Math.sin(time*3+index)*.1,Math.sin(a)*.5);gem.rotation.x=time*2;gem.rotation.y=time*3+index;})};
  }
  return null;
}

function removeEffect(state: TargetStatusState, id: string) {
  const effect=state.effects.get(id);if(!effect)return;
  state.target.remove(effect.group);effect.materials.forEach(material=>material.dispose());state.effects.delete(id);
}

export function syncStatusVfx(target: THREE.Object3D, statusIds: Iterable<string>, height = 2) {
  let state=targetStates.get(target);
  if(!state){state={target,height,effects:new Map()};targetStates.set(target,state);liveStates.add(state);}else state.height=height;
  const wanted=new Set([...statusIds].map(id=>String(id||'').toLowerCase()).filter(Boolean));
  for(const id of [...state.effects.keys()])if(!wanted.has(id))removeEffect(state,id);
  for(const id of wanted){if(state.effects.has(id))continue;const effect=createStatusEffect(id,height);if(!effect)continue;state.effects.set(id,effect);target.add(effect.group);}
  if(state.effects.size)liveStates.add(state);else liveStates.delete(state);
}

export function clearStatusVfx(target: THREE.Object3D) {
  const state=targetStates.get(target);if(!state)return;
  for(const id of [...state.effects.keys()])removeEffect(state,id);
  liveStates.delete(state);targetStates.delete(target);
}

export function updateStatusVfx(dt: number) {
  statusTime+=Number.isFinite(dt)?Math.min(.1,Math.max(0,dt)):0;
  for(const state of liveStates)for(const effect of state.effects.values())effect.update(statusTime);
}
