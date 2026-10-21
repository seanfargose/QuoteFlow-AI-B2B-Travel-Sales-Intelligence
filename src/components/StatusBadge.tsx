'use client';

import React from 'react';
import { QuoteLifecycleStatus, AvailabilityStatus } from '../types';

interface StatusBadgeProps {
  status: QuoteLifecycleStatus | AvailabilityStatus | string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const getBadgeStyle = (s: string) => {
    switch (s) {
      case 'APPROVED':
      case 'CONFIRMED_ALLOTMENT':
      case 'BOOKING_LOCKED':
      case 'VOUCHERS_ISSUED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-600/10';
      case 'ENGAGED':
      case 'VIEWED':
        return 'bg-blue-50 text-blue-700 border-blue-200 ring-blue-600/10';
      case 'DELIVERED':
        return 'bg-sky-50 text-sky-700 border-sky-200 ring-sky-600/10';
      case 'PENDING_APPROVAL':
      case 'AVAILABLE_ON_REQUEST':
      case 'CLARIFICATION_PENDING':
      case 'WARNING_SOFT':
        return 'bg-amber-50 text-amber-700 border-amber-200 ring-amber-600/10';
      case 'HARD_LOCK_REQUIRED':
      case 'REJECTED':
      case 'LOST':
      case 'SOLD_OUT':
      case 'EXPIRED':
        return 'bg-rose-50 text-rose-700 border-rose-200 ring-rose-600/10';
      case 'DRAFT':
      case 'INGESTED':
      case 'PARSED_READY':
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200 ring-slate-600/10';
    }
  };

  const formatText = (s: string) => {
    return s.replace(/_/g, ' ');
  };

  const sizeClasses = size === 'sm' ? 'px-1.5 py-0.5 text-[11px]' : 'px-2.5 py-0.5 text-xs';

  return (
    <span
      className={`inline-flex items-center font-medium rounded-md border ring-1 ring-inset ${sizeClasses} ${getBadgeStyle(
        status
      )}`}
    >
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-75" />
      {formatText(status)}
    </span>
  );
};
