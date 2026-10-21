'use client';

import React, { useState } from 'react';
import { Header } from '../../components/Header';
import { useData } from '../../services/dataContext';
import { 
  Settings, 
  ShieldCheck, 
  Percent, 
  Clock, 
  DollarSign, 
  RotateCcw,
  Check
} from 'lucide-react';

export default function SettingsPage() {
  const { resetAllData } = useData();
  const [savedToast, setSavedToast] = useState(false);

  const handleSave = () => {
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2500);
  };

  return (
    <>
      <Header 
        title="Commercial Policy & System Governance" 
        subtitle="Manage deterministic margin floors, currency buffers, rate staleness limits, and audit defaults"
      />

      <main className="p-8 max-w-[1000px] mx-auto w-full space-y-6">
        {/* Margin Guardrails Policy Card */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-subtle space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Percent className="w-5 h-5 text-indigo-600" />
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Deterministic Margin Guardrails
              </h2>
              <p className="text-xs text-slate-500">
                Enforced in code to protect company profit margins against uncontrolled sales rep discounting
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-1">
              <span className="text-[10px] uppercase font-bold text-emerald-800">Target Standard Margin</span>
              <div className="text-xl font-bold font-mono text-emerald-900">≥ 12.0%</div>
              <p className="text-[11px] text-emerald-700">Auto-approved for direct quote dispatch without management review.</p>
            </div>
            <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 space-y-1">
              <span className="text-[10px] uppercase font-bold text-amber-800">Warning Soft Alert</span>
              <div className="text-xl font-bold font-mono text-amber-900">8.0% - 11.9%</div>
              <p className="text-[11px] text-amber-700">Dispatched with rep acknowledgment logged in telemetry stream.</p>
            </div>
            <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/50 space-y-1">
              <span className="text-[10px] uppercase font-bold text-rose-800">Mandatory Manager Lock</span>
              <div className="text-xl font-bold font-mono text-rose-900">&lt; 8.0%</div>
              <p className="text-[11px] text-rose-700">Hard lock. Transmit button disabled until Sales Manager 1-click override.</p>
            </div>
          </div>
        </div>

        {/* Currency Hedge & Tariff Freshness Card */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-subtle space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <DollarSign className="w-5 h-5 text-emerald-600" />
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Currency & Tariff Freshness Controls
              </h2>
              <p className="text-xs text-slate-500">
                Automated protections against rupee depreciation and outdated supplier contracts
              </p>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between p-3.5 rounded-lg border border-slate-100 bg-slate-50/70">
              <div>
                <strong className="text-slate-900 block">Mandatory FX Fluctuation Hedge</strong>
                <span className="text-slate-500 text-[11px]">Buffer automatically added to THB, AED, and USD net costs to hedge FX shifts</span>
              </div>
              <div className="font-mono font-bold text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-md">
                +1.5%
              </div>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-lg border border-slate-100 bg-slate-50/70">
              <div>
                <strong className="text-slate-900 block">Contracted Tariff Freshness Window</strong>
                <span className="text-slate-500 text-[11px]">Contracts verified beyond this window are flagged as stale tariffs</span>
              </div>
              <div className="font-mono font-bold text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-md">
                30 Days
              </div>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-lg border border-slate-100 bg-slate-50/70">
              <div>
                <strong className="text-slate-900 block">Spot / On-Demand Rate Expiration</strong>
                <span className="text-slate-500 text-[11px]">Third-party spot quotes marked expired after this duration</span>
              </div>
              <div className="font-mono font-bold text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-md">
                7 Days
              </div>
            </div>
          </div>
        </div>

        {/* System Administration & Demo Reset */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-subtle space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-slate-600" />
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Demonstration State Management
                </h2>
                <p className="text-xs text-slate-500">
                  Reset in-browser LocalStorage to initial seeded Thailand, Dubai, Bali and Maldives state
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                resetAllData();
                alert('Demo database reset to clean seeds successfully!');
              }}
              className="px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Demo State</span>
            </button>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-slate-400">QuoteFlow AI v1.0.0 • Strict TypeScript Mode</span>
            <button
              onClick={handleSave}
              className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-all"
            >
              {savedToast ? 'Settings Saved!' : 'Save Policy Changes'}
            </button>
          </div>
        </div>
      </main>
    </>
  );
}
