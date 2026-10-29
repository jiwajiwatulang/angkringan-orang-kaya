import {Suspense} from 'react';
import DashboardWorkspace from '@/components/admin/DashboardWorkspace';
import LoadingState from '@/components/LoadingState';
export default function DashboardPage(){
  return <Suspense fallback={<LoadingState label="Menyiapkan dashboard"/>}><DashboardWorkspace defaultView="overview"/></Suspense>;
}
