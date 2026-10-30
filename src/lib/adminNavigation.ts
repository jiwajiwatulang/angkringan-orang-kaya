export function adminNavigationHref(href:string,demo:boolean):string {
  if(!demo)return href;
  const url=new URL(href,'https://sakunota.my.id');
  url.searchParams.set('demo','true');
  return url.pathname+url.search+url.hash;
}

export const ADMIN_BACK_EVENT='sakunota:admin-back';
export const SETTINGS_LEAVE_EVENT='sakunota:settings-leave';
export function requestSettingsNavigation(event:{currentTarget:HTMLElement;preventDefault():void;defaultPrevented:boolean;ctrlKey?:boolean;metaKey?:boolean;shiftKey?:boolean;altKey?:boolean;button?:number}):boolean {
  if(event.defaultPrevented)return false;
  if(typeof window==='undefined'||!window.location.pathname.startsWith('/admin/pengaturan/')||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey||(event.button||0)!==0)return true;
  const target=event.currentTarget,href=target.getAttribute('href');
  if(!href||target.getAttribute('target')==='_blank'||target.hasAttribute('download'))return true;
  const url=new URL(href,window.location.href);
  if(url.origin!==window.location.origin||!(/^\/admin(?:\/|$)/.test(url.pathname)||url.pathname==='/pos'))return true;
  const allowed=window.dispatchEvent(new CustomEvent(SETTINGS_LEAVE_EVENT,{cancelable:true,detail:{href:url.pathname+url.search+url.hash}}));
  if(!allowed)event.preventDefault();
  return allowed;
}
