import {parseSpreadsheet} from '../lib/spreadsheetParser';
import {ImportFileError} from '../lib/importLimits';
self.onmessage=(event:MessageEvent<{data:ArrayBuffer;name:string}>)=>{
  try{self.postMessage({ok:true,rows:parseSpreadsheet(event.data.data,event.data.name)});}
  catch(error){self.postMessage({ok:false,error:error instanceof ImportFileError?error.message:'File tidak dapat dibaca. Simpan ulang atau gunakan template SakuNota.'});}
};
