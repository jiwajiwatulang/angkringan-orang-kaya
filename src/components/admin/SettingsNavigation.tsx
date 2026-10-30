'use client';
import Link from 'next/link';
import {useEffect,useState} from 'react';
import {usePathname} from 'next/navigation';
import {adminNavigationHref,requestSettingsNavigation} from '@/lib/adminNavigation';
import {isDemoMode} from '@/lib/demoMode';
export default function SettingsNavigation(){
  const pathname=usePathname(),[demo,setDemo]=useState(false);
  useEffect(()=>setDemo(isDemoMode()),[]);
  return <nav aria-label="Navigasi Pengaturan" className="mb-5 flex flex-wrap items-center gap-2 text-sm">
    <Link href={adminNavigationHref('/admin',demo)} onClick={event=>{requestSettingsNavigation(event);}} className="inline-flex min-h-11 items-center rounded-xl border border-line bg-surface px-4 font-semibold text-fg hover:border-blue-300 hover:text-blue-700">Dashboard</Link>
    <span aria-hidden="true" className="text-muted">/</span>
    {pathname==='/admin/pengaturan'?<span aria-current="page" className="font-semibold text-muted">Pengaturan POS</span>:<Link href={adminNavigationHref('/admin/pengaturan',demo)} onClick={event=>{requestSettingsNavigation(event);}} className="inline-flex min-h-11 items-center rounded-xl border border-line bg-surface px-4 font-semibold text-fg hover:border-blue-300 hover:text-blue-700">Pengaturan POS</Link>}
  </nav>;
}
