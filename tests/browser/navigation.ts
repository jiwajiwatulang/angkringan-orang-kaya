// Local fixture adapter for Next.js navigation; product components remain unchanged.
export const useRouter=()=>({push:(url:string)=>location.assign(url),replace:(url:string)=>location.replace(url),refresh:()=>location.reload(),back:()=>history.back(),prefetch:()=>{}});
export const usePathname=()=>location.pathname;
export const useSearchParams=()=>new URLSearchParams(location.search);
