import {Suspense} from 'react';
import EmployeeShiftWorkspace from '@/components/admin/EmployeeShiftWorkspace';
import LoadingState from '@/components/LoadingState';
export default function ShiftPage(){
  return <Suspense fallback={<LoadingState label="Menyiapkan karyawan dan shift"/>}><EmployeeShiftWorkspace defaultTab="shifts"/></Suspense>;
}
