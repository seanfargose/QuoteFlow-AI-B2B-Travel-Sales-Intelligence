'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Inbox, 
  FileText, 
  PhoneCall, 
  CheckCircle2, 
  Building2, 
  BarChart3, 
  Settings, 
  Compass,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { useData } from '../services/dataContext';

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { requirements, quotes, followUps, hotelRates, resetAllData } = useData();

  // Dynamic counts
  const pendingReqCount = requirements.filter(r => r.status === 'INGESTED' || r.status === 'CLARIFICATION_PENDING').length;
  const pendingFollowUpCount = followUps.filter(f => f.status === 'PENDING').length;
  const quotesAtRiskCount = quotes.filter(q => q.status === 'PENDING_APPROVAL').length;
  const staleRatesCount = hotelRates.filter(r => !r.isFresh).length;

  const navItems = [
    {
      name: 'Overview',
      href: '/',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      name: 'Requirement Inbox',
      href: '/inbox',
      icon: Inbox,
      badge: pendingReqCount > 0 ? pendingReqCount : null,
      badgeColor: 'bg-indigo-500 text-white',
    },
    {
      name: 'Quotes',
      href: '/quotes',
      icon: FileText,
      badge: quotesAtRiskCount > 0 ? `${quotesAtRiskCount} Alert` : null,
      badgeColor: 'bg-amber-500 text-slate-950',
    },
    {
      name: 'Follow-ups',
      href: '/follow-ups',
      icon: PhoneCall,
      badge: pendingFollowUpCount > 0 ? pendingFollowUpCount : null,
      badgeColor: 'bg-rose-500 text-white',
    },
    {
      name: 'Bookings',
      href: '/bookings',
      icon: CheckCircle2,
      badge: null,
    },
    {
      name: 'Inventory & Rates',
      href: '/inventory',
      icon: Building2,
      badge: staleRatesCount > 0 ? `${staleRatesCount} Stale` : null,
      badgeColor: 'bg-amber-500/20 text-amber-300 border border-amber-500/40',
    },
    {
      name: 'Analytics',
      href: '/analytics',
      icon: BarChart3,
      badge: null,
    },
    {
      name: 'Settings',
      href: '/settings',
      icon: Settings,
      badge: null,
    },
  ];

  return (
    <aside className="w-64 bg-sidebar-bg border-r border-sidebar-border flex flex-col justify-between shrink-0 select-none">
      <div>
        {/* Brand Header */}
        <div className="h-16 flex items-center px-6 border-b border-sidebar-border gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
            <Compass className="w-5 h-5 animate-spin-slow" />
          </div>
          <div>
            <div className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
              QuoteFlow <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded font-mono border border-indigo-500/30">AI</span>
            </div>
            <div className="text-[11px] text-slate-400">B2B Sales Intelligence</div>
          </div>
        </div>

        {/* Destination Corridors Ticker */}
        <div className="px-6 py-2.5 bg-slate-900/40 border-b border-sidebar-border/60">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
            Active Corridors
          </div>
          <div className="flex flex-wrap gap-1 text-[10px] text-slate-300">
            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">Thailand</span>
            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">Dubai</span>
            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">Bali</span>
            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">Vietnam</span>
            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">Maldives</span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-slate-800 text-white font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 ${
                      isActive ? 'text-indigo-400' : 'text-slate-400'
                    }`}
                  />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold leading-none ${
                      item.badgeColor || 'bg-slate-700 text-slate-200'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Profile & Demo Controls */}
      <div className="p-4 border-t border-sidebar-border bg-slate-900/30">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white shadow">
              PS
            </div>
            <div>
              <div className="text-xs font-semibold text-white">Priya Sharma</div>
              <div className="text-[10px] text-slate-400">Senior Sales Exec</div>
            </div>
          </div>
          <button
            onClick={resetAllData}
            title="Reset Seed Data"
            className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="text-[10px] text-slate-500 flex items-center justify-between pt-2 border-t border-slate-800">
          <span>Target Margin: <strong className="text-emerald-400 font-mono">≥12%</strong></span>
          <span>Floor: <strong className="text-rose-400 font-mono">8%</strong></span>
        </div>
      </div>
    </aside>
  );
};
