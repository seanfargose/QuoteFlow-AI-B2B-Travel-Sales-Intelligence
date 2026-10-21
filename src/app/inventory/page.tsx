'use client';

import React from 'react';
import { Header } from '../../components/Header';
import { useData } from '../../services/dataContext';
import { StatusBadge } from '../../components/StatusBadge';
import { 
  Building, 
  Calendar, 
  AlertTriangle, 
  ShieldCheck, 
  Clock, 
  Flame, 
  CheckCircle,
  HelpCircle
} from 'lucide-react';

export default function InventoryPage() {
  const { hotelRates } = useData();

  const prepaidCount = hotelRates.filter(r => r.inventorySource.type === 'PREPAID_COMMITMENT').length;
  const staleCount = hotelRates.filter(r => !r.isFresh).length;

  const formatCurrency = (amt: number) => `₹${amt.toLocaleString('en-IN')}`;

  return (
    <>
      <Header 
        title="Supplier Inventory, Commitments & Rate Freshness" 
        subtitle="Tracking pre-purchased room block cutoff dates, tariff verification age, and availability confidence"
      />

      <main className="p-8 max-w-[1600px] mx-auto w-full space-y-6">
        {/* Risk Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-subtle">
            <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold block">Prepaid Room Blocks</span>
            <div className="text-2xl font-bold text-amber-600 mt-1">{prepaidCount} Contracts Active</div>
            <span className="text-xs text-slate-500">Subject to forfeiture if unsold</span>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-subtle">
            <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold block">Stale Rates (&gt;30 Days)</span>
            <div className="text-2xl font-bold text-rose-600 mt-1">{staleCount} Tariffs Alerted</div>
            <span className="text-xs text-rose-600 font-medium">Never assume confirmed availability</span>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-subtle">
            <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold block">Mandatory FX Risk Buffer</span>
            <div className="text-2xl font-bold text-slate-900 mt-1">+1.5% Hedged</div>
            <span className="text-xs text-emerald-600 font-medium">Applied to THB, AED, USD net rates</span>
          </div>
        </div>

        {/* Inventory Master Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-subtle overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Hotel Master Rate Schedule ({hotelRates.length} Properties)
              </h2>
              <p className="text-xs text-slate-500">
                Separating guaranteed block allotments from on-request and unverified contracts
              </p>
            </div>
            <span className="text-xs text-slate-400">Currency Hedge: +1.5%</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Hotel Property & Destination</th>
                  <th className="py-3 px-4">Room Category</th>
                  <th className="py-3 px-4">Inventory Tier</th>
                  <th className="py-3 px-4">Net Cost (Foreign)</th>
                  <th className="py-3 px-4">Hedged Net (INR)</th>
                  <th className="py-3 px-4">Last Verified</th>
                  <th className="py-3 px-4">Availability</th>
                  <th className="py-3 px-4">Confidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {hotelRates.map((rate) => {
                  const isPrepaid = rate.inventorySource.type === 'PREPAID_COMMITMENT';
                  const commit = rate.inventorySource.commitmentDetails;

                  return (
                    <tr key={rate.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          {rate.hotelName}
                          <span className="text-[10px] text-amber-500">{'★'.repeat(rate.starRating)}</span>
                        </div>
                        <div className="text-[11px] text-slate-400">{rate.city}, {rate.destination}</div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700">
                        {rate.roomCategory}
                        <div className="text-[10px] text-slate-400">{rate.mealPlan.replace(/_/g, ' ')}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        {isPrepaid ? (
                          <div>
                            <span className="font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-[10px] inline-flex items-center gap-1">
                              <Flame className="w-3 h-3 text-amber-600" />
                              PREPAID BLOCK ({commit?.roomsRemaining} Left)
                            </span>
                            <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">
                              +₹{commit?.repIncentiveKickerInr} Rep Bonus
                            </div>
                          </div>
                        ) : (
                          <span className="font-medium text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-[10px]">
                            {rate.inventorySource.type.replace(/_/g, ' ')}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                        {rate.netRatePerNightForeign} {rate.foreignCurrency}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {formatCurrency(rate.netRatePerNightInr)}
                        <div className="text-[10px] text-slate-400 font-sans">
                          fx: {rate.appliedFxRateToInr} (+1.5%)
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className={`font-medium flex items-center gap-1 ${rate.isFresh ? 'text-slate-700' : 'text-rose-600 font-bold'}`}>
                          {!rate.isFresh && <AlertTriangle className="w-3 h-3 text-rose-500" />}
                          <span>{new Date(rate.lastVerifiedAt).toLocaleDateString()}</span>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {rate.isFresh ? 'Fresh Contract' : '⚠️ Stale Tariff'}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={rate.availabilityStatus} size="sm" />
                      </td>
                      <td className="py-3.5 px-4 font-mono">
                        <div className="flex items-center gap-1 font-bold">
                          <span className={rate.confidenceScore >= 0.9 ? 'text-emerald-600' : 'text-amber-600'}>
                            {Math.round(rate.confidenceScore * 100)}%
                          </span>
                        </div>
                        <div className="w-16 bg-slate-100 rounded-full h-1 overflow-hidden mt-1">
                          <div 
                            className={`h-1 rounded-full ${rate.confidenceScore >= 0.9 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                            style={{ width: `${rate.confidenceScore * 100}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </>
  );
}
