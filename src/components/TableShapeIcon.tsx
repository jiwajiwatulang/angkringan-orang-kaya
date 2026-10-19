import React from 'react';
import type { TableShape } from '@/lib/dexie';

interface TableShapeIconProps {
  shape?: TableShape | string;
  className?: string;
  size?: number;
}

export default function TableShapeIcon({ shape = 'square', className = 'w-5 h-5', size = 20 }: TableShapeIconProps) {
  switch (shape) {
    case 'round':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
          aria-label="Meja Bundar"
        >
          {/* Central round table */}
          <circle cx="12" cy="12" r="5.5" />
          {/* 4 chairs around */}
          <circle cx="12" cy="3.5" r="1.5" />
          <circle cx="12" cy="20.5" r="1.5" />
          <circle cx="3.5" cy="12" r="1.5" />
          <circle cx="20.5" cy="12" r="1.5" />
        </svg>
      );

    case 'rect':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
          aria-label="Meja Panjang / Sofa"
        >
          {/* Rectangular table */}
          <rect x="5" y="7" width="14" height="10" rx="2" />
          {/* Chairs top and bottom */}
          <line x1="8" y1="3.5" x2="10" y2="3.5" />
          <line x1="14" y1="3.5" x2="16" y2="3.5" />
          <line x1="8" y1="20.5" x2="10" y2="20.5" />
          <line x1="14" y1="20.5" x2="16" y2="20.5" />
          <line x1="2" y1="12" x2="2" y2="12" strokeWidth="3" />
          <line x1="22" y1="12" x2="22" y2="12" strokeWidth="3" />
        </svg>
      );

    case 'bar':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
          aria-label="Bar Stool / Kursi Bar"
        >
          {/* Bar stool seat */}
          <ellipse cx="12" cy="6" rx="6" ry="2.5" />
          {/* Tall stool legs */}
          <line x1="8" y1="8" x2="6" y2="21" />
          <line x1="16" y1="8" x2="18" y2="21" />
          <line x1="12" y1="8.5" x2="12" y2="21" />
          {/* Foot rest ring */}
          <ellipse cx="12" cy="15" rx="4.5" ry="1.5" />
        </svg>
      );

    case 'lesehan':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
          aria-label="Saung / Lesehan"
        >
          {/* Tatami / Mat boundary */}
          <rect x="3" y="4" width="18" height="16" rx="2" strokeDasharray="3 2" />
          {/* Low table inside */}
          <rect x="7" y="8" width="10" height="8" rx="1.5" fill="currentColor" fillOpacity="0.12" />
          {/* Floor cushion indicators */}
          <circle cx="12" cy="5.5" r="1" />
          <circle cx="12" cy="18.5" r="1" />
          <circle cx="4.5" cy="12" r="1" />
          <circle cx="19.5" cy="12" r="1" />
        </svg>
      );

    case 'square':
    default:
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
          aria-label="Meja Kotak"
        >
          {/* Central square table */}
          <rect x="6" y="6" width="12" height="12" rx="2" />
          {/* 4 chairs on sides */}
          <line x1="10" y1="3" x2="14" y2="3" />
          <line x1="10" y1="21" x2="14" y2="21" />
          <line x1="3" y1="10" x2="3" y2="14" />
          <line x1="21" y1="10" x2="21" y2="14" />
        </svg>
      );
  }
}
