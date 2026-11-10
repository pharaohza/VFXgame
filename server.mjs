import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const base=path.resolve(import.meta.dirname,'dist');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.json':'application/json; charset=utf-8','.css':'text/css','.webp':'image/webp','.png':'image/png','.gif':'image/gif','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{let p;try{p=path.resolve(base,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));}catch{res.writeHead(400).end();return;}if(p!==base&&!p.startsWith(base+path.sep)){res.writeHead(403).end();return;}if(p===base)p=path.join(base,'index.html');if(!fs.existsSync(p)||!fs.statSync(p).isFile()){res.writeHead(404).end('Not found');return;}res.writeHead(200,{'Content-Type':types[path.extname(p)]||'application/octet-stream','Cache-Control':'no-cache'});fs.createReadStream(p).pipe(res);});
server.listen(Number(process.env.PORT||5190),'127.0.0.1',()=>console.log('Local: http://127.0.0.1:'+server.address().port));
