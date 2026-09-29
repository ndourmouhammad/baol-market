import React from 'react';
import { STATUS_LABELS, type OrderStatus } from '@/lib/orderStatus';

interface StatusBadgeProps {
  status: string;
}

const BADGE_STYLES: Record<OrderStatus, string> = {
  created:    'bg-white border border-gray-300 text-(--gris-texte)',
  paid:       'bg-emerald-100 text-emerald-800',
  preparing:  'bg-(--or-senegal) text-(--encre)',
  confirmed:  'bg-blue-100 text-blue-800',
  delivering: 'bg-purple-100 text-purple-800',
  delivered:  'bg-(--vert-baol) text-white',
  cancelled:  'bg-red-100 text-red-800',
  refunded:   'bg-gray-200 text-gray-700',
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const key = status.toLowerCase() as OrderStatus;
  const label = STATUS_LABELS[key] ?? status;
  const style = BADGE_STYLES[key] ?? 'bg-gray-100 text-gray-700';

  return (
    <span className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-xl inline-block ${style}`}>
      {label}
    </span>
  );
}
