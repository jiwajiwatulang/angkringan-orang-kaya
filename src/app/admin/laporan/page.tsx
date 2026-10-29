import {Suspense} from 'react';
import DashboardWorkspace from '@/components/admin/DashboardWorkspace';
import LoadingState from '@/components/LoadingState';
export default function ReportPage(){
  return <Suspense fallback={<LoadingState label="Menyiapkan laporan"/>}><DashboardWorkspace defaultView="reports"/></Suspense>;
}
