'use client';

import React from 'react';
import Link from 'next/link';
import { 
  FileText, 
  PhoneCall, 
  CheckCircle2, 
  AlertTriangle, 
  TrendingUp, 
  Clock, 
  Sparkles, 
  ArrowUpRight, 
  ShieldAlert, 
  ExternalLink,
  Flame,
  Building,
  Users
} from 'lucide-react';
import { useData } from '../services/dataContext';
import { Header } from '../components/Header';
import { KpiCard } from '../components/KpiCard';
import { StatusBadge } from '../components/StatusBadge';
import dynamic from 'next/dynamic';

const FunnelChart = dynamic(
  () => import('../components/FunnelChart').then((mod) => mod.FunnelChart),
  { 
    ssr: false,
    loading: () => <div className="h-64 w-full flex items-center justify-center text-xs text-slate-400">Loading chart...</div> 
  }
);

export default function OverviewPage() {
  const { 
    requirements, 
    quotes, 
    followUps, 
    bookings, 
    hotelRates, 
    agents, 
    activityEvents,
    completeFollowUp
  } = useData();

  // Dynamic KPI Calculations
  const activeRequirementsCount = requirements.filter(r => r.status !== 'QUOTED').length;
  const quotesAwaitingResponse = quotes.filter(q => ['DELIVERED', 'VIEWED', 'ENGAGED'].includes(q.status));
  const quotesAtRisk = quotes.filter(q => q.status === 'PENDING_APPROVAL');
  const staleRatesCount = hotelRates.filter(r => !r.isFresh).length;

  const totalPipelineValueInr = quotes
    .filter(q => !['LOST', 'EXPIRED'].includes(q.status))
    .reduce((acc, q) => {
      const activeVer = q.versions.find(v => v.versionId === q.currentVersionId) || q.versions[0];
      return acc + (activeVer?.totalSellingPriceInr || 0);
    }, 0);

  const totalBookedGmvInr = bookings.reduce((acc, b) => acc + b.totalSellingPriceInr, 0);
  const avgRealizedMargin = bookings.length > 0
    ? (bookings.reduce((acc, b) => acc + b.realizedMarginPercentage, 0) / bookings.length) * 100
    : 12.8;

  const totalDeals = quotes.length + bookings.length;
  const conversionRate = totalDeals > 0 
    ? ((bookings.length / totalDeals) * 100).toFixed(1)
    : '18.2';

  const pendingFollowUps = followUps.filter(f => f.status === 'PENDING');

  // Dynamic Funnel Data for Recharts
  const funnelData = [
    { stage: 'Inquiries', count: requirements.length, fill: '#4f46e5' },
    { stage: 'Quotes Drafted', count: quotes.length, fill: '#6366f1' },
    { stage: 'Delivered', count: quotes.filter(q => q.status !== 'DRAFT').length, fill: '#818cf8' },
    { stage: 'Engaged (High Intent)', count: quotes.filter(q => q.intentScore >= 60).length, fill: '#f59e0b' },
    { stage: 'Bookings Confirmed', count: bookings.length, fill: '#10b981' },
  ];

  const formatCurrency = (amount: number) => {
    if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(1)}L`;
    }
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  return (
    <>
      <Header />

      <main className="p-8 space-y-8 max-w-[1600px] mx-auto w-full">
        {/* KPI Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            title="Active Requirements"
            value={activeRequirementsCount}
            subtitle={`${requirements.filter(r => r.status === 'INGESTED').length} need parsing`}
            change="+2 today"
            isPositive
            icon={FileText}
            badge={{ text: 'Inflow', variant: 'neutral' }}
          />
          <KpiCard
            title="Quotes in Pipeline"
            value={formatCurrency(totalPipelineValueInr)}
            subtitle={`${quotesAwaitingResponse.length} awaiting agent response`}
            change="+14.2% vs last week"
            isPositive
            icon={TrendingUp}
            badge={{ text: `${quotes.length} Quotes`, variant: 'success' }}
          />
          <KpiCard
            title="Quotes at Risk"
            value={quotesAtRisk.length}
            subtitle={`${staleRatesCount} stale supplier tariffs detected`}
            icon={ShieldAlert}
            badge={{ text: 'Action Required', variant: 'danger' }}
          />
          <KpiCard
            title="Confirmed Bookings"
            value={bookings.length}
            subtitle={`GMV: ${formatCurrency(totalBookedGmvInr)} • Realized Margin: ${avgRealizedMargin.toFixed(1)}%`}
            change={`${conversionRate}% Win Rate`}
            isPositive
            icon={CheckCircle2}
            badge={{ text: 'Healthy', variant: 'success' }}
          />
        </section>

        {/* Charts & Committed Inventory Alerts Row */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Funnel Chart (7 Cols) */}
          <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200/80 p-6 shadow-subtle flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                  Quote-to-Conversion Journey Funnel
                </h2>
                <p className="text-xs text-slate-500">
                  Tracking conversion velocity from messy WhatsApp ingestion to locked booking
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100">
                Live Conversion: {conversionRate}%
              </span>
            </div>

            <FunnelChart data={funnelData} />

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Goal: 22% Net Conversion</span>
              <span>Average Turnaround: <strong>3.8 mins</strong> (vs 45 mins manual)</span>
            </div>
          </div>

          {/* Prepaid Commitment Liquidation Monitor (5 Cols) */}
          <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200/80 p-6 shadow-subtle flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-amber-600" />
                  <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                    Pre-purchased Inventory At Risk
                  </h2>
                </div>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                  Cutoff in &lt;14 Days
                </span>
              </div>
              <p className="text-xs text-slate-500 mb-4">
                Prioritize these properties in quotes to avoid 100% sunk-cost forfeiture
              </p>

              {/* Inventory items */}
              <div className="space-y-4">
                {hotelRates
                  .filter(r => r.inventorySource.type === 'PREPAID_COMMITMENT' && r.inventorySource.commitmentDetails)
                  .map(hotel => {
                    const commit = hotel.inventorySource.commitmentDetails!;
                    const percentSold = Math.round((commit.roomsSold / commit.totalRoomsCommitted) * 100);
                    return (
                      <div key={hotel.id} className="p-3 rounded-lg border border-slate-100 bg-slate-50/70">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-slate-900">
                            {hotel.hotelName}
                          </span>
                          <span className="text-xs font-mono font-bold text-amber-700">
                            {commit.roomsRemaining} left
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-500 mb-2">
                          <span>{hotel.city}, {hotel.destination}</span>
                          <span className="text-emerald-600 font-semibold">
                            +₹{commit.repIncentiveKickerInr} Rep Bonus
                          </span>
                        </div>
                        {/* Progress Bar */}
                        <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className="bg-indigo-600 h-1.5 rounded-full transition-all"
                            style={{ width: `${percentSold}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                          <span>Sold: {commit.roomsSold}/{commit.totalRoomsCommitted} ({percentSold}%)</span>
                          <span>Release: Nov 10-15</span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 mt-3 flex items-center justify-between text-[11px]">
              <span className="text-slate-500">Auto-boosts to Curated Tier</span>
              <Link href="/inventory" className="text-indigo-600 font-semibold hover:underline flex items-center gap-1">
                View All Allocations <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </section>

        {/* Prioritized Action Queue & Recent Activity Stream */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Prioritized Action Queue (7 Cols) */}
          <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200/80 p-6 shadow-subtle">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-rose-500 animate-pulse" />
                  <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                    Prioritized Sales Action Queue
                  </h2>
                </div>
                <p className="text-xs text-slate-500">
                  Algorithmic follow-up triggers based on behavioral dwell time and proposal opens
                </p>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                {pendingFollowUps.length} Actions Due
              </span>
            </div>

            {pendingFollowUps.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                No pending follow-ups. All quotes are up to date!
              </div>
            ) : (
              <div className="space-y-3">
                {pendingFollowUps.map(task => {
                  const agent = agents.find(a => a.id === task.agentId);
                  const quote = quotes.find(q => q.id === task.quoteId);
                  return (
                    <div 
                      key={task.id}
                      className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 bg-white transition-all shadow-subtle flex flex-col justify-between gap-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold text-slate-900">
                              {agent?.agencyName || 'Travel Partner'}
                            </span>
                            <span className="text-[10px] text-slate-400">({agent?.city})</span>
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-100 text-rose-800">
                              🔥 Intent: {quote?.intentScore || 85}
                            </span>
                          </div>
                          <p className="text-xs font-medium text-slate-700">
                            {task.suggestedActionTitle}
                          </p>
                        </div>
                        <StatusBadge status={quote?.status || 'ENGAGED'} size="sm" />
                      </div>

                      {/* AI Suggested Message Copy */}
                      <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-2.5 text-xs text-slate-600 font-sans">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 block mb-1">
                          Suggested WhatsApp Nudge:
                        </span>
                        &ldquo;{task.suggestedMessageCopy}&rdquo;
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Due now • Rep: Priya Sharma
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => completeFollowUp(task.id)}
                            className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 border border-slate-200 rounded-md hover:bg-slate-50 transition-colors"
                          >
                            Mark Done
                          </button>
                          <Link
                            href={`/quotes`}
                            className="px-3 py-1 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md shadow-sm transition-all"
                          >
                            Open Quote
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right: Real-time Telemetry & Activity Stream (5 Cols) */}
          <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200/80 p-6 shadow-subtle flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                  Live Audit & Telemetry Beacon
                </h2>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              </div>
              <p className="text-xs text-slate-500 mb-4">
                Real-time signals capturing proposal opens, dwell heartbeats and confirmations
              </p>

              <div className="space-y-3.5">
                {activityEvents.slice(0, 6).map(evt => {
                  return (
                    <div key={evt.id} className="flex items-start gap-3 text-xs">
                      <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center shrink-0 mt-0.5 text-slate-500">
                        {evt.eventType.includes('OPEN') ? (
                          <ExternalLink className="w-3 h-3 text-blue-600" />
                        ) : evt.eventType.includes('BOOKING') ? (
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <ShieldAlert className="w-3 h-3 text-amber-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-900">
                            {evt.eventType.replace(/_/g, ' ')}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {evt.actorType} {evt.actorId ? `(${evt.actorId})` : ''} • Quote {evt.quoteId}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 mt-4 text-center">
              <Link href="/analytics" className="text-xs font-semibold text-indigo-600 hover:underline">
                View Full Telemetry Event Log →
              </Link>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
