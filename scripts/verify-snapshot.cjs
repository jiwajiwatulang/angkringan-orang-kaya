const fs=require('fs'),path=require('path'),crypto=require('crypto');
const root=path.resolve(__dirname,'..');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const p=JSON.parse(fs.readFileSync(path.join(root,'evidence/provenance.json'),'utf8'));
function verify(file,expected){const resolved=path.resolve(root,file);if(!resolved.startsWith(root+path.sep))throw Error('Path outside snapshot');if(sha(fs.readFileSync(resolved))!==expected)throw Error('File changed: '+file);}
verify('runtime/worker.js',p.originalWorkerSha256);
for(const f of p.publicPaths)verify(f.file,f.sha256);
for(const f of p.sourceFiles)verify('recovered-source/'+f.path,f.sha256);
const map=JSON.parse(fs.readFileSync(path.join(root,'runtime/worker.js.map'),'utf8'));
for(const f of p.sourceFiles){const i=map.sources.findIndex(s=>s.replaceAll('\\','/')===f.path);if(i<0||sha(Buffer.from(map.sourcesContent[i]))!==f.sha256)throw Error('Source map mismatch: '+f.path);}
const config=JSON.parse(fs.readFileSync(path.join(root,'wrangler.jsonc'),'utf8'));
if(config.name==='angkringan-orang-kaya'||config.routes?.length||config.account_id||config.d1_databases.some(d=>d.remote||d.database_id!=='00000000-0000-0000-0000-000000000000')||config.r2_buckets.some(b=>b.remote))throw Error('Local config must not target production');
const live=JSON.parse(fs.readFileSync(path.join(root,'evidence/live-public-checks.json'),'utf8'));
if(live.failures.length||live.matchesPrevious!==190)throw Error('Live comparison was not successful');
console.log(JSON.stringify({workerUnchanged:true,publicFiles:p.publicPaths.length,originalSourceFiles:p.sourceFiles.length,sourceMapMatches:true,liveFilesChecked:live.checked,localConfigurationIsolated:true},null,2));
