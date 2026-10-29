'use client';
import Link from 'next/link';
import {useSearchParams} from 'next/navigation';
import {PageHeading,secondary} from '@/components/operations/Shared';
import EmployeeOperations from './EmployeeOperations';
import ShiftOperations from './ShiftOperations';

type Section='employees'|'shifts'|'cash';
const sections:{id:Section;label:string}[]=[
  {id:'employees',label:'Karyawan'},
  {id:'shifts',label:'Shift Kasir'},
  {id:'cash',label:'Kas & Biaya'},
];
export default function EmployeeShiftWorkspace({defaultTab}:{defaultTab:Section}){
  const search=useSearchParams();
  const requested=search.get('tab');
  const active=sections.some(section=>section.id===requested)?requested as Section:defaultTab;
  const href=(section:Section)=>{
    const query=new URLSearchParams(search.toString());
    query.set('tab',section);
    return '/admin/karyawan?'+query.toString();
  };
  const deviceQuery=new URLSearchParams(search.toString());deviceQuery.delete('tab');
  return <div className="sn-operations mx-auto max-w-6xl space-y-5 text-fg sm:space-y-6">
    <PageHeading title="Karyawan & Shift">
      {active==='employees'&&<Link href={'/admin/pengaturan/perangkat'+(deviceQuery.size?'?'+deviceQuery.toString():'')} className={secondary}>Nama &amp; PIN Karyawan</Link>}
    </PageHeading>
    <nav aria-label="Bagian Karyawan dan Shift" className="sn-tabs flex gap-1 overflow-x-auto">
      {sections.map(section=><Link key={section.id} href={href(section.id)} scroll={false} aria-current={active===section.id?'page':undefined} className={'min-h-11 shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 '+(active===section.id?'bg-blue-600 text-white shadow-sm':'text-muted hover:bg-blue-50 hover:text-blue-700')}>{section.label}</Link>)}
    </nav>
    <section aria-label={sections.find(section=>section.id===active)?.label}>
      {active==='employees'?<EmployeeOperations/>:<ShiftOperations activeTab={active==='cash'?'movements':'shifts'}/>}
    </section>
  </div>;
}
