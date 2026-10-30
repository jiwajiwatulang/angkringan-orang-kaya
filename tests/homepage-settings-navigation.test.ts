import {test} from 'node:test';
import assert from 'node:assert/strict';
import {requestSettingsNavigation,SETTINGS_LEAVE_EVENT,adminNavigationHref} from '../src/lib/adminNavigation';

test('settings can leave directly for Dashboard while unsaved changes can cancel that exact destination',()=>{
  const previous=Object.getOwnPropertyDescriptor(globalThis,'window'),target=new EventTarget();
  Object.assign(target,{location:new URL('https://example.test/admin/pengaturan/profil?demo=true')});
  Object.defineProperty(globalThis,'window',{configurable:true,value:target});
  let prevented=false,asked='';
  const event=(href:string,extra={})=>({currentTarget:{getAttribute:(name:string)=>name==='href'?href:null,hasAttribute:()=>false} as unknown as HTMLElement,preventDefault:()=>{prevented=true;},defaultPrevented:false,...extra});
  const guard=(event:Event)=>{asked=(event as CustomEvent).detail.href;event.preventDefault();};
  try{
    assert.equal(requestSettingsNavigation(event('/admin?demo=true')),true);
    target.addEventListener(SETTINGS_LEAVE_EVENT,guard);
    assert.equal(requestSettingsNavigation(event(adminNavigationHref('/admin',true))),false);
    assert.equal(prevented,true);assert.equal(asked,'/admin?demo=true');
    prevented=false;asked='';
    assert.equal(requestSettingsNavigation(event('/admin',{ctrlKey:true})),true);
    assert.equal(requestSettingsNavigation(event('https://external.test/admin')),true);
    assert.equal(prevented,false);assert.equal(asked,'');
    target.removeEventListener(SETTINGS_LEAVE_EVENT,guard);
    assert.equal(requestSettingsNavigation(event('/admin/menu')),true);
  }finally{if(previous)Object.defineProperty(globalThis,'window',previous);else delete (globalThis as any).window;}
});
