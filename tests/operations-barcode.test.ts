import {test} from 'node:test';
import assert from 'node:assert/strict';
import {setupHardwareBarcodeScanner} from '../src/lib/barcodeScanner';
test('hardware input rejects stale Enter, held keys, composing input and disabled checkout',()=>{
  const previous=Object.getOwnPropertyDescriptor(globalThis,'window'),realNow=Date.now;
  let handler:((event:any)=>void)|undefined,time=1000;
  const scans:string[]=[];
  Object.defineProperty(globalThis,'window',{configurable:true,value:{addEventListener:(_:string,fn:any)=>handler=fn,removeEventListener:()=>{handler=undefined;}}});Date.now=()=>time;
  const send=(key:string,extra:any={})=>{time+=10;handler!({key,target:{tagName:'BODY',dataset:{}},preventDefault(){},stopPropagation(){},...extra});};
  const scan=(extra:any={})=>{for(const key of ['0','0','1','2','3','Enter'])send(key,extra);};
  try{
    let dispose=setupHardwareBarcodeScanner(code=>scans.push(code));scan();scan();assert.deepEqual(scans,['00123','00123']);
    scan({repeat:true});scan({isComposing:true});scan({target:{tagName:'SELECT',dataset:{}}});assert.equal(scans.length,2);
    for(const key of ['4','5','6'])send(key);time+=1000;send('Enter');assert.equal(scans.length,2);dispose();
    dispose=setupHardwareBarcodeScanner(code=>scans.push(code),{enabled:false});scan();assert.equal(scans.length,2);dispose();
  }finally{Date.now=realNow;if(previous)Object.defineProperty(globalThis,'window',previous);else delete (globalThis as any).window;}
});
