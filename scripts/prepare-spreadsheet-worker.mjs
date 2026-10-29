import {build} from 'esbuild';
await build({entryPoints:['src/workers/spreadsheetImport.ts'],outfile:'public/spreadsheet-import-worker.js',bundle:true,platform:'browser',format:'iife',target:'es2020',minify:true,legalComments:'eof'});
console.log('Spreadsheet import prepared locally.');
