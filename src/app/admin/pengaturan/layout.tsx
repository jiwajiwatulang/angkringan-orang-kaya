import SettingsNavigation from '@/components/admin/SettingsNavigation';
export default function SettingsLayout({children}:{children:React.ReactNode}){
  return <div><SettingsNavigation/>{children}</div>;
}
