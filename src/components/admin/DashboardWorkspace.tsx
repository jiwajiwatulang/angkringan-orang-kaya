'use client';
import Link from 'next/link';
import {useSearchParams} from 'next/navigation';
import {PageHeading} from '@/components/operations/Shared';
import DashboardOverview from './DashboardOverview';
import BusinessReports from './BusinessReports';

export default function DashboardWorkspace({defaultView}:{defaultView:'overview'|'reports'}){
  const search=useSearchParams();
  const requested=search.get('view');
  const view=requested==='overview'||requested==='reports'?requested:defaultView;
  const viewHref=(next:string)=>{
    const query=new URLSearchParams(search.toString());
    query.set('view',next);
    return '/admin?'+query.toString();
  };
  const destination=(pathname:string)=>{
    const query=new URLSearchParams(search.toString());query.delete('view');
    return pathname+(query.size?'?'+query.toString():'');
  };
  return <div className="sn-operations mx-auto max-w-6xl space-y-5 text-fg sm:space-y-6">
    <PageHeading title="Dashboard Usaha"/>
    <nav aria-label="Bagian Dashboard" className="sn-tabs flex gap-1 overflow-x-auto">
      {([{id:'overview',label:'Ringkasan'},{id:'reports',label:'Laporan'}] as const).map(item=><Link key={item.id} href={viewHref(item.id)} scroll={false} aria-current={view===item.id?'page':undefined} className={'min-h-11 shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 '+(view===item.id?'bg-blue-600 text-white shadow-sm':'text-muted hover:bg-blue-50 hover:text-blue-700')}>{item.label}</Link>)}
    </nav>
    <section aria-label={view==='reports'?'Laporan Usaha':'Ringkasan Usaha'}>
      {view==='reports'?<BusinessReports/>:<DashboardOverview cashierHref={destination('/pos')} catalogHref={destination('/admin/menu')}/>}
    </section>
  </div>;
}
