import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..'),media=path.join(root,'public/media');
const catalog=JSON.parse(fs.readFileSync(path.join(root,'public/catalog.json'),'utf8'));
const used=new Set(JSON.stringify(catalog).match(/\/media\/[a-zA-Z0-9_-]+\.webp/g)||[]);
let removed=0;
for(const file of fs.readdirSync(media)){
 if(!/^(?:[a-f0-9]{64}[as]|native-[a-f0-9]{16})\.webp$/.test(file))continue;
 const candidate=path.resolve(media,file);
 if(path.dirname(candidate)!==media)throw Error('Invalid media path');
 if(!used.has('/media/'+file)){fs.unlinkSync(candidate);removed++;}
}
console.log({removed,retained:fs.readdirSync(media).length});
