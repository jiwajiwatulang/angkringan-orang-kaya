'use client';

import { useState } from 'react';
import LineIcon from './LineIcon';

export default function ProductPhoto({ product, className = 'w-full h-full rounded-[inherit]', iconClassName = 'w-6 h-6' }: {
  product: { imageData?: string | null; nama?: string; kategori?: string }; className?: string; iconClassName?: string;
}) {
  const [failed, setFailed] = useState<string | null>(null);
  const { imageData, nama = '', kategori = '' } = product;
  if (imageData && imageData !== failed && /^data:image\/(webp|jpeg|png);base64,/.test(imageData)) {
    return <img src={imageData} alt={nama} loading="lazy" className={`object-cover ${className}`} onError={() => setFailed(imageData)} />;
  }
  const text = `${kategori} ${nama}`.toLowerCase();
  const icon = /minum|tea|teh|kopi|coffee|susu|matcha|milkshake|jeruk/.test(text) ? 'drink'
    : /sate|sunduk/.test(text) ? 'skewers' : /roti/.test(text) ? 'bread'
    : /snack|goreng|mendoan/.test(text) ? 'snack' : /nasi|makan|ayam|mie|bakso/.test(text) ? 'food' : 'catalog';
  return <span className={`inline-flex items-center justify-center ${className}`}><LineIcon name={icon} className={iconClassName} /></span>;
}
