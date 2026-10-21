'use client';

import React, { useState } from 'react';
import { MERCHANT_LOGIN_URL, openMerchantCashier } from '@/lib/merchantEntry';

export default function MerchantLoginButton({ className = '' }: { className?: string }) {
  const [error, setError] = useState('');
  return <>
    <a href={MERCHANT_LOGIN_URL} title="Sudah punya lisensi? Masuk ke kasir usaha" className={className}
      onClick={event => {
        if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        try { openMerchantCashier(); }
        catch { setError('Login belum dapat dibuka. Izinkan penyimpanan browser, lalu coba kembali.'); }
      }}>Login</a>
    {error && <span role="alert" className="text-xs text-rose-700">{error}</span>}
  </>;
}
