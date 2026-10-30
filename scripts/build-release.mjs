import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
// Production exposes the same feature as the Worker. CI may explicitly disable it.
const env={...process.env,NEXT_PUBLIC_SAKUNOTA_MULTI_DEVICE:process.env.NEXT_PUBLIC_SAKUNOTA_MULTI_DEVICE||'enabled'};
for(const args of [[require.resolve('next/dist/bin/next'),'build'],['scripts/generate_offline_manifest.mjs']]){
  const result=spawnSync(process.execPath,args,{stdio:'inherit',env});
  if(result.error)throw result.error;
  if(result.status!==0)process.exit(result.status??1);
}
