'use client';

import React from 'react';
import { Header } from '../../components/Header';
import { useData } from '../../services/dataContext';
import dynamic from 'next/dynamic';

const LossBreakdownChart = dynamic(
  () => import('../../components/AnalyticsCharts').then((mod) => mod.LossBreakdownChart),
  { 
    ssr: false, 
    loading: () => <div className="h-64 w-full flex items-center justify-center text-xs text-slate-400">Loading chart...</div> 
  }
);

const CorridorChart = dynamic(
  () => import('../../components/AnalyticsCharts').then((mod) => mod.CorridorChart),
  { 
    ssr: false, 
    loading: () => <div className="h-64 w-full flex items-center justify-center text-xs text-slate-400">Loading chart...</div> 
  }
);
import { 
  BarChart3, 
  TrendingDown, 
  Clock, 
  ExternalLink,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

export default function AnalyticsPage() {
  const { activityEvents, quotes, bookings } = useData();

  // Loss Reason data for B2B travel intelligence
  const lossReasonsData = [
    { name: 'Price Too High (Haggling)', count: 4, fill: '#ef4444' },
    { name: 'Flight Timing / Surge', count: 3, fill: '#f97316' },
    { name: 'Agent Went Silent (72h)', count: 5, fill: '#64748b' },
    { name: 'Competitor DMC Won', count: 2, fill: '#a855f7' },
    { name: 'Traveler Postponed', count: 2, fill: '#3b82f6' },
  ];

  const corridorData = [
    { corridor: 'Thailand', quotes: 6, won: 2 },
    { corridor: 'Dubai', quotes: 4, won: 1 },
    { corridor: 'Bali', quotes: 3, won: 1 },
    { corridor: 'Maldives', quotes: 2, won: 1 },
    { corridor: 'Vietnam', quotes: 2, won: 0 },
  ];

  return (
    <>
      <Header 
        title="Sales Intelligence & Win/Loss Autopsy" 
        subtitle="Telemetry analytics, lost deal categorization and corridor conversion benchmarks"
      />

      <main className="p-8 max-w-[1600px] mx-auto w-full space-y-6">
        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Lost Deal Autopsy (6 Cols) */}
          <div className="lg:col-span-6 bg-white rounded-xl border border-slate-200/80 p-6 shadow-subtle flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown className="w-4 h-4 text-rose-500" />
                <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                  Lost Deal Root-Cause Breakdown
                </h2>
              </div>
              <p className="text-xs text-slate-500 mb-4">
                Categorized reasons when agents go silent or decline quotes
              </p>

              <LossBreakdownChart data={lossReasonsData} />
            </div>

            <div className="pt-3 border-t border-slate-100 text-xs text-slate-500 flex justify-between">
              <span>Top Driver: <strong>Agent Silence (31%)</strong></span>
              <span>Solution: Intent-driven follow-ups within 2h</span>
            </div>
          </div>

          {/* Corridor Performance (6 Cols) */}
          <div className="lg:col-span-6 bg-white rounded-xl border border-slate-200/80 p-6 shadow-subtle flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <BarChart3 className="w-4 h-4 text-indigo-600" />
                <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                  Conversion by Destination Corridor
                </h2>
              </div>
              <p className="text-xs text-slate-500 mb-4">
                Quotes quoted vs confirmed bookings across leisure markets
              </p>

              <CorridorChart data={corridorData} />
            </div>

            <div className="pt-3 border-t border-slate-100 text-xs text-slate-500 flex justify-between">
              <span>Highest Conversion: <strong>Maldives (50%)</strong></span>
              <span>Fastest TAT: <strong>Thailand (2.4 mins)</strong></span>
            </div>
          </div>
        </div>

        {/* Telemetry Event Stream */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-subtle">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Granular Telemetry & Activity Stream ({activityEvents.length} Events)
              </h2>
              <p className="text-xs text-slate-500">
                Timestamped interactions across WhatsApp, web proposal beacons, and internal reviews
              </p>
            </div>
            <span className="text-xs text-slate-400">Zero-cookie privacy compliant</span>
          </div>

          <div className="divide-y divide-slate-100">
            {activityEvents.map((evt) => (
              <div key={evt.id} className="py-3 flex items-center justify-between text-xs hover:bg-slate-50/60 px-2 rounded transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-mono text-[10px]">
                    {evt.actorType.slice(0, 2)}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900">
                      {evt.eventType.replace(/_/g, ' ')}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Quote: {evt.quoteId} • Actor: {evt.actorType} {evt.actorId ? `(${evt.actorId})` : ''}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-mono text-slate-600 block">
                    {new Date(evt.timestamp).toLocaleString()}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {JSON.stringify(evt.metadata)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
