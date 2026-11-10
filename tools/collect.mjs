import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { publicMetadata } from './public-metadata.mjs';
const require=createRequire(import.meta.url);
const sharp=require('sharp');
const ROOT=path.resolve(import.meta.dirname,'..'), STORE=path.resolve(process.env.VFX_ARCHIVE_DIR || path.join(ROOT,'artifacts/source-archive'));
function donor(name){const value=process.env[name];if(!value)throw Error('Set donor location in '+name);return value.replaceAll('\\','/');}
fs.mkdirSync(STORE,{recursive:true}); fs.mkdirSync(path.join(ROOT,'public/media'),{recursive:true});
const norm=p=>p.replaceAll('\\','/');
const skip=/^(?:node_modules|Library|Temp|Logs|\.git|\.plastic|\.godot.*|\.tools|\.codex.*|pr-workspaces|build|dist|artifacts|backups|\.terrain-backups)$/i;
function walk(root){const out=[]; if(!fs.existsSync(root))return out;function visit(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){if(e.isSymbolicLink())continue;const p=path.join(d,e.name);if(e.isDirectory()){if(!skip.test(e.name))visit(p);}else out.push(p);}}visit(root);return out;}
const records=[], byPath=new Map(), byHash=new Map(), entries=[], entryHashes=new Map();
function keep(p,source){p=norm(p);if(byPath.has(p))return byPath.get(p);const data=fs.readFileSync(p),hash=crypto.createHash('sha256').update(data).digest('hex'),ext=path.extname(p).toLowerCase();const object=`objects/${hash.slice(0,2)}/${hash}${ext}`;const dest=path.join(STORE,object);if(!fs.existsSync(dest)){fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(p,dest);}const r={source,path:p,sha256:hash,bytes:data.length,object};records.push(r);byPath.set(p,r);if(!byHash.has(hash))byHash.set(hash,r);return r;}
function add(e,key){if(key&&entryHashes.has(key)){const old=entryHashes.get(key);old.origins.push(...e.origins);return old;}e.id=e.id||crypto.createHash('sha256').update([e.origins[0],e.kind,e.skillId,e.version,e.name].join('|')).digest('hex').slice(0,16);e.origins=[...new Set(e.origins)];entries.push(e);if(key)entryHashes.set(key,e);return e;}
const imageRE=/\.(png|webp|jpe?g|gif)$/i;
const thumbCache=new Map();
async function media(p,animated=false){if(!p||!imageRE.test(p))return null;const r=keep(p,'Preview media');let key=r.sha256+(animated?'a':'s');if(thumbCache.has(key))return thumbCache.get(key);const name=`${key}.webp`,dest=path.join(ROOT,'public/media',name);try{if(!fs.existsSync(dest))await sharp(p,{animated}).resize(animated?620:360,animated?420:260,{fit:'inside',withoutEnlargement:true}).webp({quality:animated?66:78,effort:2,loop:0}).toFile(dest);const url=`/media/${name}`;thumbCache.set(key,url);return url;}catch(err){console.warn('Media unavailable:',p,err.message);return null;}}
const issues=[];
function tag(name){const s=name.toLowerCase();return /fire|flame|ember|meteor|inferno|cinder|burn|molten/.test(s)?'Fire':/ice|frost|snow|freeze|water|tide|splash/.test(s)?'Ice & Water':/lightning|electric|thunder|spark|storm|wind/.test(s)?'Storm':/heal|holy|bless|light|sun|heart|revive|resur/.test(s)?'Holy & Heal':/poison|toxic|venom|dark|shadow|ghost|haunt/.test(s)?'Dark & Poison':/shield|ward|aura|buff|circle|portal|protect/.test(s)?'Aura & Shield':/slash|hit|strike|sweep|bash|sword|arrow|physical|dust|smoke|explosion/.test(s)?'Physical':'Magic & Other';}

// Unity GUID closure: keep the whole authored VFX packs and any referenced assets outside them.
const unitySpecs=[
 ['Hovl Studio',donor('VFX_HOVL_ROOT'),donor('VFX_HOVL_ROOT')],
 ['JMO Assets',donor('VFX_PETNEW_ASSETS')+'/JMO Assets',donor('VFX_PETNEW_ASSETS')],
 ['PetTown Unity',donor('VFX_PETTOWN_ASSETS'),donor('VFX_PETTOWN_ASSETS')],
];
for(const [source,scanRoot,assetRoot] of unitySpecs){
 const all=walk(assetRoot),guidMap=new Map();for(const p of all.filter(p=>p.endsWith('.meta'))){const m=fs.readFileSync(p,'utf8').match(/^guid: (\w+)/m);if(m)guidMap.set(m[1],p.slice(0,-5));}
 const candidates=all.filter(p=>norm(p).startsWith(scanRoot)&&(/Hovl Studio|JMO Assets|ErbGameArt|(?:effects|particles|vfx)/i.test(norm(p))));
 // Also discover authored particle prefabs stored outside vendor/effects folders.
 for(const p of all.filter(p=>p.endsWith('.prefab')&&!candidates.includes(p))){if(/ParticleSystem:/.test(fs.readFileSync(p,'utf8')))candidates.push(p);}
 const queued=[...new Set(candidates)],done=new Set();
 for(let i=0;i<queued.length;i++){const p=queued[i];if(done.has(p)||!fs.existsSync(p)||!fs.statSync(p).isFile())continue;done.add(p);keep(p,source);if(fs.existsSync(p+'.meta')&&!done.has(p+'.meta'))queued.push(p+'.meta');if(/\.(prefab|mat|asset|unity|controller|anim|overrideController)$/i.test(p)){const txt=fs.readFileSync(p,'utf8');for(const m of txt.matchAll(/guid: ([a-f0-9]{32})/gi)){const ref=guidMap.get(m[1]);if(ref&&!done.has(ref))queued.push(ref);}}}
 const resolveGuid=guid=>guidMap.get(guid);
 function texturesFor(text,seen=new Set(),depth=0){if(depth>4)return [];const out=[];for(const m of text.matchAll(/guid: ([a-f0-9]{32})/gi)){const p=resolveGuid(m[1]);if(!p||seen.has(p)||!fs.existsSync(p))continue;seen.add(p);if(imageRE.test(p))out.push(p);else if(/\.(mat|prefab|asset)$/i.test(p))out.push(...texturesFor(fs.readFileSync(p,'utf8'),seen,depth+1));}return [...new Set(out)];}
 for(const p of [...done].filter(p=>p.endsWith('.prefab'))){const txt=fs.readFileSync(p,'utf8');if(!/ParticleSystem:/.test(txt)){
  if(/Hovl Studio|JMO Assets|ErbGameArt|Particle Effects/i.test(p)){const r=keep(p,source),name=path.basename(p,'.prefab'),textures=texturesFor(txt);const ts=[];for(const t of textures.slice(0,12))ts.push({name:path.basename(t),url:await media(t),path:norm(t)});add({name,source,engine:'Unity',kind:'prefab',category:tag(name),group:'Trails & nested prefabs',origins:[norm(p)],hash:r.sha256,thumbnail:ts[0]?.url,textures:ts,preview:'source',note:'Prefab ต้นฉบับแบบ TrailRenderer / mesh หรืออ้าง prefab แม่ แสดง texture ที่อ้างอิง; เล่นเอฟเฟกต์เต็มใน Unity'},'unity:'+r.sha256);}
  continue;
 }const r=keep(p,source),name=path.basename(p,'.prefab');let textures=texturesFor(txt);
 // Prefer authored diffuse/particle sprites over normal maps and distortion noise.
 textures.sort((a,b)=>Number(/normal|noise|distort|mask|dissolve/i.test(a))-Number(/normal|noise|distort|mask|dissolve/i.test(b)));
 const systems=[];const chunks=txt.split(/^--- !u!/m).filter(t=>t.startsWith('198 '));
 const scalar=(s,k,d)=>{const x=s.match(new RegExp('\\n[ ]+'+k+':\\s*\\n[\\s\\S]*?\\n[ ]+scalar: ([\\d.eE+-]+)'));return x?Number(x[1]):d;};
 const blocks=txt.split(/^--- !u!/m);const transforms=new Map(),renderers=new Map();
 for(const b of blocks){const go=b.match(/m_GameObject: \{fileID: (-?\d+)\}/)?.[1];if(!go)continue;if(b.startsWith('4 ')){const pos=b.match(/m_LocalPosition: \{x: ([^,]+), y: ([^,]+), z: ([^}]+)\}/);const scale=b.match(/m_LocalScale: \{x: ([^,]+), y: ([^,]+), z: ([^}]+)\}/);transforms.set(go,{position:pos?pos.slice(1).map(Number):[0,0,0],scale:scale?scale.slice(1).map(Number):[1,1,1]});}if(b.startsWith('199 '))renderers.set(go,b);}
 for(const b of chunks){const go=b.match(/m_GameObject: \{fileID: (-?\d+)\}/)?.[1];const renderer=renderers.get(go)||'';const tex=texturesFor(renderer)[0];const col=b.match(/maxColor: \{r: ([^,]+), g: ([^,]+), b: ([^,]+), a: ([^}]+)\}/);systems.push({duration:Number(b.match(/lengthInSec: ([\d.]+)/)?.[1]||2),life:scalar(b,'startLifetime',1),speed:scalar(b,'startSpeed',0),size:scalar(b,'startSize',1),delay:scalar(b,'startDelay',0),rate:scalar(b,'rateOverTime',12),loop:/looping: 1/.test(b),color:col?col.slice(1).map(Number):[1,1,1,1],position:transforms.get(go)?.position||[0,0,0],scale:transforms.get(go)?.scale||[1,1,1],texture:await media(tex),tilesX:Number(b.match(/tilesX: (\d+)/)?.[1]||1),tilesY:Number(b.match(/tilesY: (\d+)/)?.[1]||1),radius:Number(b.match(/\n    radius: ([\d.]+)/)?.[1]||.25)});}
 const previewTextures=[];for(const t of textures.slice(0,12))previewTextures.push({name:path.basename(t),url:await media(t),path:norm(t)});
 add({name,source,engine:'Unity',kind:'prefab',category:tag(name+' '+path.dirname(p)),group:norm(path.relative(scanRoot,path.dirname(p))).split('/').filter(Boolean).slice(-2).join(' / '),origins:[norm(p)],hash:r.sha256,thumbnail:previewTextures[0]?.url,textures:previewTextures,systems,duration:Math.max(1,...systems.map(s=>s.duration)),preview:'unity-adapted',note:'พรีวิวประมาณจาก texture และค่าของ ParticleSystem ต้นฉบับ การเคลื่อนไหวและ shader อาจต่างจาก Unity'},'unity:'+r.sha256);
 }
 console.log(source,done.size,'files;',entries.filter(e=>e.source===source).length,'unique prefabs');
}

// Preserve all authored Godot VFX resources in both projects and their res:// dependency closure.
const war=donor('VFX_WAR_OF_PAWS_ROOT');
for(const part of ['apps/game','godot-prototype']){const project=`${war}/${part}`,all=walk(project);const seeds=all.filter(p=>/(?:\/|\\)(?:vfx|effects|particles)(?:\/|\\)|(?:vfx|effects|particle)[^/\\]*\.(?:gd|gdshader|tscn|tres|json|webp|png)$/i.test(p)&&!p.endsWith('.import'));const queued=[...seeds],done=new Set();for(let i=0;i<queued.length;i++){const p=queued[i];if(done.has(p)||!fs.existsSync(p)||!fs.statSync(p).isFile())continue;done.add(p);keep(p,'War of Paws');if(/\.(gd|gdshader|tscn|tres|json)$/i.test(p)){const t=fs.readFileSync(p,'utf8');for(const m of t.matchAll(/res:\/\/([^"'\s)]+)/g)){const q=path.join(project,m[1]);if(fs.existsSync(q)&&fs.statSync(q).isFile()&&!done.has(q))queued.push(q);else if(!fs.existsSync(q)&&!/[{}%]|\.import/.test(q))issues.push({source:norm(p),reference:m[0]});}}}console.log(part,done.size,'VFX files + dependencies');}
for(const sub of ['art/vfx_sources','art/source_assets/skill_rig_lab/vfx'])for(const p of walk(`${war}/${sub}`))keep(p,'War of Paws');
const catalog=JSON.parse(fs.readFileSync(`${war}/apps/game/assets/vfx/catalog.json`,'utf8'));
const skillById=new Map(catalog.flatMap(c=>c.skills.map(s=>[s.id,{...s,className:c.name,color:c.color}])));
// Genuine renderer recordings remain visually faithful; derivative raw frame sequences stay at source.
const reviewFiles=walk(`${war}/art/vfx_review`);
const motions=reviewFiles.filter(p=>/motion\.gif$/i.test(p));
for(const p of motions){const parent=path.dirname(p),rel=norm(path.relative(`${war}/art/vfx_review`,parent)),parts=rel.split('/'),variant=parts[0],skillId=parts.at(-1);const skill=skillById.get(skillId);const still=['after.png','peak.png','before.png'].map(n=>path.join(parent,n)).find(p=>fs.existsSync(p));
 const animated=await media(p,true),thumbnail=await media(still||p);add({name:skill?.name||skillId.replaceAll('_',' '),thai:skill?.thai||'',source:'War of Paws',engine:'Godot',kind:'recording',category:tag(`${skill?.name||skillId} ${skill?.recipe||''}`),group:skill?.className||'Special',version:variant,origins:[norm(p),`${war}/apps/game/assets/vfx/catalog.json`],skillId,description:skill?.description||'',duration:skill?.duration||3.5,color:skill?.color||'#a791ff',thumbnail,animation:animated,preview:'recording',note:'ภาพเคลื่อนไหวที่บันทึกจาก Godot ต้นฉบับ'});}
// Every catalogued skill appears even when a recording is missing.
for(const [id,s]of skillById){if(!entries.some(e=>e.source==='War of Paws'&&e.skillId===id))add({name:s.name,thai:s.thai,source:'War of Paws',engine:'Godot',kind:'recipe',category:tag(s.name+' '+s.recipe),group:s.className,origins:[`${war}/apps/game/assets/vfx/catalog.json`],skillId:id,description:s.description,duration:s.duration,color:s.color,preview:'source',note:'มี recipe ต้นฉบับ ไม่มีภาพบันทึกของรายการนี้'});}
// Extra native VFX (meteor, wizard and live combat) plus authored atlases are independently selectable.
for(const r of records.filter(r=>r.source==='War of Paws'&&/apps\/game\/(?:scripts\/vfx|scripts\/online|scenes\/vfx)\//.test(r.path)&&/\.gd$/.test(r.path)&&/effect|combat/.test(path.basename(r.path)))){const name=path.basename(r.path,'.gd');add({name:name.replaceAll('_',' '),source:'War of Paws',engine:'Godot',kind:'script',category:tag(name),group:'Native scripts',origins:[r.path],preview:'source',note:'เก็บสคริปต์และ dependency ต้นฉบับสำหรับนำไปใช้ใน Godot'});}

// Copy browser-native PetTown VFX intact. Only the texture loader adapter changes at integration.
const pet=donor('VFX_PETTOWN_THREE_ROOT');
for(const p of walk(`${pet}/src/vfx`)){keep(p,'PetTown Three');if(!/test\./.test(p)){const d=path.join(ROOT,'src/vendor/pettown/vfx',path.relative(`${pet}/src/vfx`,p));fs.mkdirSync(path.dirname(d),{recursive:true});fs.copyFileSync(p,d);}}
for(const p of walk(`${pet}/public/assets/fx`)){keep(p,'PetTown Three');const d=path.join(ROOT,'public/assets/fx',path.relative(`${pet}/public/assets/fx`,p));fs.mkdirSync(path.dirname(d),{recursive:true});fs.copyFileSync(p,d);}
keep(`${pet}/shared/activeSkills.mjs`,'PetTown Three');
const {ACTIVE_SKILLS}=await import(pathToFileURL(`${pet}/shared/activeSkills.mjs`));
const router=fs.readFileSync(`${pet}/src/vfx/skillVfx.ts`,'utf8');
for(const m of router.matchAll(/case '([^']+)':/g)){const id=m[1],s=ACTIVE_SKILLS.find(s=>s.id===id);const name=s?.name||id.replaceAll('_',' ');let thumbnail=null;const icon=s?.iconAsset?.split('?')[0]||`/assets/ui/skills/active/${id.replaceAll('_','-')}.webp`;const iconPath=`${pet}/public${icon}`;if(fs.existsSync(iconPath))thumbnail=await media(iconPath);add({name,source:'PetTown Three',engine:'Three.js',kind:'skill',skillId:id,category:tag(name+' '+(s?.element||'')),group:'Active skills',origins:[`${pet}/src/vfx/skillVfx.ts`],description:s?.description||'',element:s?.element||'Neutral',duration:4,thumbnail,preview:'native',note:'เล่นโค้ด VFX Three.js ต้นฉบับจาก PetTown'});}
const statusTxt=fs.readFileSync(`${pet}/src/vfx/statusVfx.ts`,'utf8'),statuses=new Set([...statusTxt.matchAll(/id === '([^']+)'/g)].map(m=>m[1]));for(const id of ['endure','swiftblade_quicken','increase_agi','ranged_ward','haste','blessing','hidden'])statuses.add(id);
for(const id of statuses)add({name:id.replaceAll('_',' '),source:'PetTown Three',engine:'Three.js',kind:'status',skillId:id,category:tag(id),group:'Status & buffs',origins:[`${pet}/src/vfx/statusVfx.ts`],preview:'native',duration:5,note:'สถานะและ buff จากโค้ด PetTown ต้นฉบับ'});
const boss=fs.readFileSync(`${pet}/src/vfx/bossVfx.ts`,'utf8');for(const m of boss.matchAll(/export function (spawn\w+)\(/g))add({name:m[1].replace(/^spawn/,'').replace(/([a-z])([A-Z])/g,'$1 $2'),source:'PetTown Three',engine:'Three.js',kind:'boss',skillId:m[1],category:tag(m[1]),group:'Boss effects',origins:[`${pet}/src/vfx/bossVfx.ts`],preview:'native',duration:5,note:'เล่นโค้ด boss VFX ต้นฉบับจาก PetTown'});
add({name:'Sprint dust & paw prints',source:'PetTown Three',engine:'Three.js',kind:'trail',category:'Physical',group:'Movement',origins:[`${pet}/src/vfx/runTrail.ts`],preview:'native',duration:5,note:'ฝุ่นวิ่งและรอยเท้าจากโค้ด PetTown ต้นฉบับ'});

// All loose VFX textures are browseable, including those unused by current skills.
const textureEntries=new Map();for(const r of records.filter(r=>imageRE.test(r.path)&&r.source!=='Preview media'&&!/vfx_review/.test(r.path)&&/vfx|fx|effects|particles|Hovl Studio|JMO Assets|ErbGameArt/i.test(r.path))){if(textureEntries.has(r.sha256)){textureEntries.get(r.sha256).origins.push(r.path);continue;}const e=add({name:path.basename(r.path),source:r.source,engine:/\.webp$/.test(r.path)&&r.source==='War of Paws'?'Godot':r.source==='PetTown Three'?'Three.js':'Unity',kind:'texture',category:tag(r.path),group:'Textures & atlases',origins:[r.path],hash:r.sha256,thumbnail:await media(r.path),preview:'texture',note:'แสดง texture / atlas ต้นฉบับ'},'texture:'+r.sha256);textureEntries.set(r.sha256,e);}
for(const e of entries){e.origins=[...new Set(e.origins)];e.search=[e.name,e.thai,e.source,e.engine,e.group,e.category,e.version,e.skillId,...e.origins].filter(Boolean).join(' ').toLowerCase();}
const summary={entries:entries.length,sourceFiles:records.length,uniqueFiles:byHash.size,sourceBytes:records.reduce((s,r)=>s+r.bytes,0),uniqueBytes:[...byHash.values()].reduce((s,r)=>s+r.bytes,0),duplicates:records.length-byHash.size,sources:Object.fromEntries([...new Set(entries.map(e=>e.source))].map(s=>[s,entries.filter(e=>e.source===s).length])),previews:Object.fromEntries([...new Set(entries.map(e=>e.preview))].map(s=>[s,entries.filter(e=>e.preview===s).length]))};
fs.writeFileSync(path.join(STORE,'inventory.json'),JSON.stringify({summary,files:records,unresolvedReferences:issues},null,2));
const order={native:0,'unity-adapted':1,recording:2,source:3,texture:4};entries.sort((a,b)=>order[a.preview]-order[b.preview]||(a.preview==='recording'?(b.version||'').localeCompare(a.version||''):0)||a.name.localeCompare(b.name));
const notes=['Identical prefab and texture bytes are merged; all origin paths are retained.','Unity previews adapt source particle settings and textures, not Unity shader execution.','Godot recordings use authored review captures. Raw per-frame QA sequences and engine caches are excluded.','Original source files are preserved in the configured local archive; inventory.json maps every source path to its content hash.','Only VFX textures are shown in the gallery; unrelated textures required by source dependency closure are preserved in the original archive.'];
const roots=[
 [donor('VFX_HOVL_ROOT'),'donor://hovl-studio'],
 [donor('VFX_PETNEW_ASSETS')+'/JMO Assets','donor://jmo-assets'],
 [donor('VFX_PETNEW_ASSETS'),'donor://petnew-unity'],
 [donor('VFX_PETTOWN_ASSETS'),'donor://pettown-unity'],
 [donor('VFX_WAR_OF_PAWS_ROOT'),'donor://war-of-paws'],
 [donor('VFX_PETTOWN_THREE_ROOT'),'donor://pettown-three'],
];
fs.writeFileSync(path.join(ROOT,'public/catalog.json'),JSON.stringify(publicMetadata({summary,entries,notes},roots),null,2));
fs.writeFileSync(path.join(ROOT,'public/collection-info.json'),JSON.stringify(publicMetadata({summary,notes},roots),null,2));
fs.mkdirSync(path.join(ROOT,'docs'),{recursive:true});
fs.writeFileSync(path.join(ROOT,'docs/source-inventory.json'),JSON.stringify(publicMetadata({summary,files:records,unresolvedReferences:issues},roots),null,2));
fs.writeFileSync(path.join(STORE,'README.txt'),'PetAI VFX Library\nOriginal sources are content-addressed under objects/.\nSee inventory.json for original paths, SHA-256, size, and stored object.\nNo source projects were modified. Identical files are stored once.\nDerived per-frame QA sequences, caches, builds and unrelated project files are excluded.\n');
console.log(JSON.stringify(summary,null,2));
