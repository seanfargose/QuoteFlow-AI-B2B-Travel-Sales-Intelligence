'use client';

import React from 'react';
import { Search, Bell, Sparkles, ShieldAlert, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { useData } from '../services/dataContext';

interface HeaderProps {
  title?: string;
  subtitle?: string;
}

export const Header: React.FC<HeaderProps> = ({ 
  title = 'Executive Sales Overview',
  subtitle = 'Real-time conversion pipeline, margin guardrails and prioritized action queue'
}) => {
  const { quotes } = useData();
  const pendingApprovals = quotes.filter(q => q.status === 'PENDING_APPROVAL');

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0 sticky top-0 z-10 shadow-subtle">
      {/* Title & Context */}
      <div>
        <h1 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
          {title}
        </h1>
        <p className="text-xs text-slate-500">{subtitle}</p>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-4">
        {/* FX Ticker Pill */}
        <div className="hidden lg:flex items-center gap-2 text-[11px] bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-full font-mono text-slate-600">
          <span className="text-slate-400 font-sans font-semibold">FX Buffer (+1.5%):</span>
          <span>1 THB = <strong className="text-slate-900">₹2.45</strong></span>
          <span className="text-slate-300">•</span>
          <span>1 AED = <strong className="text-slate-900">₹23.3</strong></span>
          <span className="text-slate-300">•</span>
          <span>1 USD = <strong className="text-slate-900">₹85.4</strong></span>
        </div>

        {/* Manager Approval Banner if pending */}
        {pendingApprovals.length > 0 && (
          <Link
            href="/quotes"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold hover:bg-amber-100 transition-colors animate-pulse"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
            <span>{pendingApprovals.length} Approval Required</span>
          </Link>
        )}

        {/* Fast Action */}
        <Link
          href="/inbox"
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-all shadow-indigo-600/20 active:scale-95"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>New Inquiry Intake</span>
        </Link>
      </div>
    </header>
  );
};
