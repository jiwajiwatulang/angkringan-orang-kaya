import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import StoreDataStatus from '../src/components/StoreDataStatus';
import QRCode from 'qrcode';
import {PathnameContext} from 'next/dist/shared/lib/hooks-client-context.shared-runtime';
import LoadingState,{BusyLabel} from '../src/components/LoadingState';

test('loading placeholders expose a short accessible status and hide decorative shapes',()=>{
  const html=renderToStaticMarkup(<LoadingState label="Memuat perangkat"/>);
  assert.ok(html.includes('role="status"'));assert.ok(html.includes('aria-label="Memuat perangkat"'));
  assert.ok(html.includes('aria-hidden="true"'));assert.ok(html.includes('sn-skeleton'));
  assert.ok(renderToStaticMarkup(<BusyLabel>Menyimpan</BusyLabel>).includes('sn-spinner'));
});

test('unknown remote state never claims every device has current data',()=>{
  const unknown=renderToStaticMarkup(<StoreDataStatus pending={0} online/>);
  assert.equal(unknown,'');
  assert.equal(renderToStaticMarkup(<StoreDataStatus pending={0} online allDevicesConfirmed/>),'');
  assert.ok(renderToStaticMarkup(<StoreDataStatus pending={3} online={false}/>).includes('3 Data Belum Terkirim'));
  const review=renderToStaticMarkup(<StoreDataStatus pending={3} online={false} needsReview/>);
  assert.ok(review.includes('Stok Perlu Dicek'));assert.ok(review.includes('Tidak Tersambung'));assert.ok(review.includes('3 Data Belum Terkirim'));
  for(const state of [{pending:0,online:true},{pending:3,online:false},{pending:1,online:true,failed:true},{pending:0,online:true,needsReview:true}]){
    assert.equal(/database|token|UUID|API|sync engine|Cloudflare|migration/.test(renderToStaticMarkup(<StoreDataStatus {...state}/>)),false);
  }
});
test('pairing image is generated locally from an opaque fragment without business data',async()=>{
  const url=new URL('https://example.test/hubungkan-perangkat');url.hash=new URLSearchParams({code:'a'.repeat(43)}).toString();
  const png=await QRCode.toDataURL(url.toString());assert.ok(png.startsWith('data:image/png;base64,'));
  assert.equal(url.search,'');assert.equal(/license|pin|storeId/.test(url.toString()),false);
});
test('public renewal/help pages remain accessible while POS and Admin wait for verified access',async()=>{
  const prior=Object.getOwnPropertyDescriptor(globalThis,'localStorage');process.env.NEXT_PUBLIC_SAKUNOTA_MULTI_DEVICE='enabled';
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:()=>JSON.stringify({storeId:'a'.repeat(64),deviceId:'device-1234567890123456'})}});
  try{
    const {default:Boundary}=await import('../src/components/PosSessionBoundary');
    const render=(path:string)=>renderToStaticMarkup(<PathnameContext.Provider value={path}><Boundary><p>Page content</p></Boundary></PathnameContext.Provider>);
    for(const path of ['/','/checkout','/panduan','/privacy'])assert.ok(render(path).includes('Page content'));
    for(const path of ['/pos','/admin','/admin/pengaturan']){const html=render(path);assert.equal(html.includes('Page content'),false);assert.ok(html.includes('Memuat data'));}
  }finally{delete process.env.NEXT_PUBLIC_SAKUNOTA_MULTI_DEVICE;if(prior)Object.defineProperty(globalThis,'localStorage',prior);else delete (globalThis as any).localStorage;}
});


test('owner portal shows both roles and receipt times without claiming live connectivity',async()=>{
  const {OwnerDeviceRows}=await import('../src/components/OwnerDeviceOverview');
  const html=renderToStaticMarkup(<OwnerDeviceRows data={{enabled:true,next:null,items:[{licenseKey:'SN-LOCAL-TEST',devices:[{id:'owner',name:'Laptop Pemilik',role:'owner',lastReceivedAt:100000},{id:'cashier',name:'Kasir Depan',role:'cashier',lastReceivedAt:null}]}]}}/>);
  for(const label of ['2 / 2 perangkat','Pemilik','Kasir','Data diterima','Belum ada data diterima'])assert.ok(html.includes(label));
  assert.equal(/Online|Semua Data Terbaru|PIN|publicKey/.test(html),false);
});
