'use client';

import React from 'react';
import { Header } from '../../components/Header';
import { useData } from '../../services/dataContext';
import { StatusBadge } from '../../components/StatusBadge';
import { 
  CheckCircle2, 
  FileCheck, 
  Receipt, 
  UserCheck, 
  Building2, 
  Users,
  ShieldCheck
} from 'lucide-react';

export default function BookingsPage() {
  const { bookings, agents } = useData();

  const totalGmv = bookings.reduce((acc, b) => acc + b.totalSellingPriceInr, 0);
  const totalMarginInr = bookings.reduce((acc, b) => acc + b.realizedGrossMarginInr, 0);
  const avgMarginPct = bookings.length > 0 
    ? (bookings.reduce((acc, b) => acc + b.realizedMarginPercentage, 0) / bookings.length) * 100 
    : 12.5;

  const formatCurrency = (amt: number) => `₹${amt.toLocaleString('en-IN')}`;

  return (
    <>
      <Header 
        title="Confirmed Bookings & Operations Handoff" 
        subtitle="Financial locks, deposit receipts, voucher status and committed inventory decrement ledger"
      />

      <main className="p-8 max-w-[1600px] mx-auto w-full space-y-6">
        {/* Commercial Summary Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-subtle">
            <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold block">Total Booked GMV</span>
            <div className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(totalGmv)}</div>
            <span className="text-xs text-emerald-600 font-medium">100% deposit verified</span>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-subtle">
            <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold block">Realized Gross Margin</span>
            <div className="text-2xl font-bold text-emerald-600 mt-1">{formatCurrency(totalMarginInr)}</div>
            <span className="text-xs text-slate-500">Average: <strong>{avgMarginPct.toFixed(1)}%</strong> profit</span>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-subtle">
            <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold block">Voucher Release SLA</span>
            <div className="text-2xl font-bold text-indigo-600 mt-1">100%</div>
            <span className="text-xs text-slate-500">Target &lt; 2h from confirmation</span>
          </div>
        </div>

        {/* Bookings Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-subtle overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">
              Booking Ledger & Voucher Dossiers ({bookings.length} Bookings)
            </h2>
            <span className="text-xs text-slate-400">Assigned Ops Lead: Ankit Kulkarni</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Booking Ref</th>
                  <th className="py-3 px-4">Travel Partner</th>
                  <th className="py-3 px-4">Passengers</th>
                  <th className="py-3 px-4">Selling Price</th>
                  <th className="py-3 px-4">Realized Margin</th>
                  <th className="py-3 px-4">Deposit Proof</th>
                  <th className="py-3 px-4">Ops Status</th>
                  <th className="py-3 px-4">Confirmed At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {bookings.map((bkg) => {
                  const agent = agents.find(a => a.id === bkg.agentId);
                  return (
                    <tr key={bkg.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-indigo-700">
                        {bkg.bookingReference}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{agent?.agencyName}</div>
                        <div className="text-[11px] text-slate-400">{agent?.city}</div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700">
                        {bkg.passengers.length} Pax ({bkg.passengers.filter(p => p.type === 'ADULT').length}A, {bkg.passengers.filter(p => p.type === 'CHILD').length}C)
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {formatCurrency(bkg.totalSellingPriceInr)}
                      </td>
                      <td className="py-3.5 px-4 font-mono">
                        <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          {(bkg.realizedMarginPercentage * 100).toFixed(1)}%
                        </span>
                        <div className="text-[10px] text-slate-400 mt-0.5 font-sans">
                          Profit: {formatCurrency(bkg.realizedGrossMarginInr)}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1 font-semibold text-emerald-600">
                          <Receipt className="w-3.5 h-3.5" />
                          <span>{formatCurrency(bkg.tokenDepositAmountInr)}</span>
                        </div>
                        <span className="text-[10px] text-slate-400">Token Locked</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={bkg.opsStatus} size="sm" />
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                        {new Date(bkg.confirmedAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
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
