import {Suspense} from 'react';
import EmployeeShiftWorkspace from '@/components/admin/EmployeeShiftWorkspace';
import LoadingState from '@/components/LoadingState';
export default function EmployeePage(){
  return <Suspense fallback={<LoadingState label="Menyiapkan karyawan dan shift"/>}><EmployeeShiftWorkspace defaultTab="employees"/></Suspense>;
}
