'use client';
import { useEffect } from 'react';
export default function LegacyStockPage() {
  useEffect(() => {
    const url = new URL(window.location.href);
    url.pathname = '/admin/menu'; url.searchParams.set('tab', 'stock');
    window.location.replace(url.pathname + url.search);
  }, []);
  return <p role="status" className="p-4 text-sm text-muted">Membuka Katalog &amp; Stok…</p>;
}
