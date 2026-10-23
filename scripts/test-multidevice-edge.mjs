import {unstable_dev} from 'wrangler';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const worker=await unstable_dev('tests/edge/multidevice.worker.ts',{config:'tests/edge/wrangler.jsonc',ip:'127.0.0.1',port:0,local:true,persist:false,logLevel:'error',vars:{MIGRATION:fs.readFileSync('migrations/0003_multidevice.sql','utf8')},experimental:{disableExperimentalWarning:true,showInteractiveDevSession:false,watch:false}});
try{const response=await worker.fetch('/api/runtime-regression');const result=await response.json();console.log(JSON.stringify(result,null,2));assert.equal(result.success,true);}finally{await worker.stop();}
