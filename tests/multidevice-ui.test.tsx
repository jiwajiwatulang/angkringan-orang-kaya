import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import StoreDataStatus from '../src/components/StoreDataStatus';
import QRCode from 'qrcode';

test('unknown remote state never claims every device has current data',()=>{
  const unknown=renderToStaticMarkup(<StoreDataStatus pending={0} online/>);
  assert.ok(unknown.includes('Data Terakhir Diterima'));assert.equal(unknown.includes('Semua Data Terbaru'),false);
  assert.ok(renderToStaticMarkup(<StoreDataStatus pending={0} online allDevicesConfirmed/>).includes('Semua Data Terbaru'));
  assert.ok(renderToStaticMarkup(<StoreDataStatus pending={3} online={false}/>).includes('3 Data Belum Terkirim'));
  for(const state of [{pending:0,online:true},{pending:3,online:false},{pending:1,online:true,failed:true},{pending:0,online:true,needsReview:true}]){
    assert.equal(/database|token|UUID|API|sync engine|Cloudflare|migration/.test(renderToStaticMarkup(<StoreDataStatus {...state}/>)),false);
  }
});
test('pairing image is generated locally from an opaque fragment without business data',async()=>{
  const url=new URL('https://example.test/hubungkan-perangkat');url.hash=new URLSearchParams({code:'a'.repeat(43)}).toString();
  const png=await QRCode.toDataURL(url.toString());assert.ok(png.startsWith('data:image/png;base64,'));
  assert.equal(url.search,'');assert.equal(/license|pin|storeId/.test(url.toString()),false);
});
