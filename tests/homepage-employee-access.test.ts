import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {SearchParamsContext} from 'next/dist/shared/lib/hooks-client-context.shared-runtime';
import {createRequire} from 'node:module';
const requireForTest=createRequire(import.meta.url);
requireForTest.extensions['.css']=()=>{};

test('employees open account setup first and cashier pairing is visible in the same workspace',async()=>{
 const {default:EmployeeShiftWorkspace}=await import('../src/components/admin/EmployeeShiftWorkspace');
 const previous=process.env.NEXT_PUBLIC_SAKUNOTA_MULTI_DEVICE;process.env.NEXT_PUBLIC_SAKUNOTA_MULTI_DEVICE='enabled';
 const render=(query:string)=>renderToStaticMarkup(React.createElement(SearchParamsContext.Provider,{value:new URLSearchParams(query)},React.createElement(EmployeeShiftWorkspace,{defaultTab:'employees'})));
 try{
  const first=render('demo=true');
  assert.ok(first.includes('Nama &amp; PIN'));assert.ok(first.includes('Hubungkan Kasir'));assert.ok(first.includes('Perangkat Kasir'));
  assert.equal(first.includes('Catat Kehadiran'),false);
  assert.ok(first.includes('/admin/karyawan?demo=true&amp;tab=devices'));
  const devices=render('tab=devices');assert.ok(devices.includes('Hubungkan Perangkat Kasir'));assert.equal(devices.includes('Catat Kehadiran'),false);
  assert.ok(first.includes('tab=shifts'));assert.ok(first.includes('tab=cash'));
 }finally{if(previous===undefined)delete process.env.NEXT_PUBLIC_SAKUNOTA_MULTI_DEVICE;else process.env.NEXT_PUBLIC_SAKUNOTA_MULTI_DEVICE=previous;}
});
