'use client';
import {useEffect,useRef} from 'react';
import {ADMIN_BACK_EVENT,SETTINGS_LEAVE_EVENT} from '@/lib/adminNavigation';

export function useAdminBack(action:()=>void|false){
  const latest=useRef(action);
  useEffect(()=>{latest.current=action;});
  useEffect(()=>{const handle=(event:Event)=>{if(latest.current()!==false)event.preventDefault();};window.addEventListener(ADMIN_BACK_EVENT,handle);return()=>window.removeEventListener(ADMIN_BACK_EVENT,handle);},[]);
}
export function useSettingsLeaveGuard(dirty:boolean,confirm:(href:string)=>void){
  useEffect(()=>{
    if(!dirty)return;
    const handle=(event:Event)=>{
      const href=(event as CustomEvent<{href?:unknown}>).detail?.href;
      if(typeof href!=='string')return;
      const url=new URL(href,location.href);
      if(url.origin!==location.origin||!(/^\/admin(?:\/|$)/.test(url.pathname)||url.pathname==='/pos'))return;
      event.preventDefault();confirm(url.pathname+url.search+url.hash);
    };
    window.addEventListener(SETTINGS_LEAVE_EVENT,handle);return()=>window.removeEventListener(SETTINGS_LEAVE_EVENT,handle);
  },[dirty,confirm]);
}
