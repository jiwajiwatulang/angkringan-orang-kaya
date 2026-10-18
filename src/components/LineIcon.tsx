import React from 'react';
import LockIcon from './LockIcon';

const paths: Record<string, string> = {
  cashier: 'M3 8h14v10H3zM17 9h4v5h-4M2 21h17M6 2v3M11 2v3',
  tables: 'M5 3h14v10H5zM3 13h18v4H3zM5 17v5M19 17v5',
  receipt: 'M5 3h14v18l-3-2-4 2-4-2-3 2zM8 7h8M8 11h8M8 15h5',
  shift: 'M3 7h18v14H3zM8 7V3h8v4M3 12h18M10 12v3h4v-3',
  catalog: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
  stock: 'M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10',
  settings: 'M14 3l1 4 4 1 2 4-3 3v4l-4 2-3-3-4 1-3-4 2-3-1-4 4-2zM14 12a2 2 0 1 0-4 0 2 2 0 0 0 4 0',
  chart: 'M4 20h16M7 16v-4M12 16V5M17 16V9',
  store: 'M3 10h18M4 10v11h16V10M2 10l3-7h14l3 7M9 21v-7h6v7',
  printer: 'M7 8V3h10v5M7 17H3V8h18v9h-4M7 14h10v7H7zM17 11h1',
  lock: 'M5 10h14v12H5zM8 10V6a4 4 0 0 1 8 0v4M12 15v3',
  tax: 'M2 5h20v14H2zM12 9v6M9 12h6',
  backup: 'M4 14v6h16v-6M12 3v12M7 10l5 5 5-5',
  info: 'M12 8h.01M12 11v6M22 12a10 10 0 1 0-20 0 10 10 0 0 0 20 0',
};

export default function LineIcon({ name, className = 'w-5 h-5' }: { name: string; className?: string }) {
  if (name === 'lock') return <LockIcon className={className} />;
  return <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={paths[name] || paths.info} /></svg>;
}
