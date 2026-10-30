import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {build} from 'esbuild';
async function main(){
const output=path.resolve('../qa-camera');fs.mkdirSync(output,{recursive:true});
await build({entryPoints:['tests/browser/camera.tsx'],bundle:true,platform:'browser',format:'esm',jsx:'automatic',outfile:path.join(output,'app.js'),define:{'process.env.NODE_ENV':'"development"'},tsconfig:'tsconfig.json'});
const styles=fs.readdirSync('out/_next/static/chunks').filter(name=>name.endsWith('.css')).map(name=>fs.readFileSync(path.join('out/_next/static/chunks',name),'utf8')).join('\n');
http.createServer((req,res)=>{
  if(req.url==='/app.js'){res.setHeader('Content-Type','text/javascript');res.end(fs.readFileSync(path.join(output,'app.js')));}
  else if(req.url==='/style.css'){res.setHeader('Content-Type','text/css');res.end(styles);}
  else {res.setHeader('Content-Type','text/html');res.end('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"></head><body><div id="root"></div><script type="module" src="/app.js"></script></body></html>');}
}).listen(4383,'127.0.0.1',()=>console.log('Local camera fixture: http://localhost:4383'));

}
void main().catch(error=>{console.error(error);process.exitCode=1;});
