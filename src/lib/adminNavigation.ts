export function adminNavigationHref(href:string,demo:boolean):string {
  if(!demo)return href;
  const url=new URL(href,'https://sakunota.my.id');
  url.searchParams.set('demo','true');
  return url.pathname+url.search+url.hash;
}
