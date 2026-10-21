'use client';

import React, { useState } from 'react';
import { Header } from '../../components/Header';
import { useData } from '../../services/dataContext';
import { StatusBadge } from '../../components/StatusBadge';
import { 
  FileText, 
  ExternalLink, 
  ShieldAlert, 
  Check, 
  X, 
  Copy, 
  Sparkles,
  TrendingUp,
  Percent,
  Clock
} from 'lucide-react';

export default function QuotesPage() {
  const { quotes, agents, approveManagerOverride, rejectManagerOverride, updateQuoteStatus } = useData();
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
  const [copiedQuoteId, setCopiedQuoteId] = useState<string | null>(null);

  const selectedQuote = quotes.find(q => q.id === selectedQuoteId);

  const formatCurrency = (amt: number) => `₹${amt.toLocaleString('en-IN')}`;

  return (
    <>
      <Header 
        title="Quotes & Dynamic Margin Workbench" 
        subtitle="Active quotation ledger, margin guardrail governance and manager exception approvals"
      />

      <main className="p-8 max-w-[1600px] mx-auto w-full space-y-6">
        {/* Quotes Table Container */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-subtle overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                Quotation Ledger ({quotes.length} Quotes)
              </h2>
              <p className="text-xs text-slate-500">
                Deterministic margin calculation, FX buffer hedge and approval locks
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                ≥12% Approved
              </span>
              <span className="flex items-center gap-1 font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                8-11.9% Alert
              </span>
              <span className="flex items-center gap-1 font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                &lt;8% Locked
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Quote ID</th>
                  <th className="py-3 px-4">Retail Travel Agent</th>
                  <th className="py-3 px-4">Destination & Tier</th>
                  <th className="py-3 px-4">Selling Price</th>
                  <th className="py-3 px-4">Gross Margin</th>
                  <th className="py-3 px-4">Intent Score</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {quotes.map((quote) => {
                  const agent = agents.find(a => a.id === quote.agentId);
                  const activeVer = quote.versions.find(v => v.versionId === quote.currentVersionId) || quote.versions[0];
                  const marginPct = (activeVer?.markupPercentage || 0) * 100;
                  const isLocked = quote.status === 'PENDING_APPROVAL';

                  return (
                    <tr 
                      key={quote.id} 
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isLocked ? 'bg-amber-50/30' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 font-mono font-medium text-slate-900">
                        {quote.id}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{agent?.agencyName}</div>
                        <div className="text-[11px] text-slate-400">{agent?.city} • {agent?.tier.replace(/_/g, ' ')}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-800">{quote.destinationCorridor}</span>
                        <div className="text-[11px] text-slate-500">{activeVer?.tierDisplayName}</div>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {formatCurrency(activeVer?.totalSellingPriceInr || 0)}
                        <div className="text-[10px] text-slate-400 font-sans">
                          Net: {formatCurrency(activeVer?.totalNetCostInr || 0)}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono">
                        <span 
                          className={`font-bold px-2 py-0.5 rounded text-xs ${
                            marginPct >= 12 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : marginPct >= 8 
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {marginPct.toFixed(1)}%
                        </span>
                        <div className="text-[10px] text-slate-400 font-sans mt-0.5">
                          Profit: {formatCurrency(activeVer?.grossProfitInr || 0)}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <div className="w-12 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div 
                              className={`h-1.5 rounded-full ${
                                quote.intentScore >= 75 ? 'bg-rose-500' : quote.intentScore >= 50 ? 'bg-amber-500' : 'bg-slate-400'
                              }`} 
                              style={{ width: `${quote.intentScore}%` }} 
                            />
                          </div>
                          <span className="font-mono font-bold text-xs">{quote.intentScore}</span>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {quote.viewCount} Views • {quote.totalDwellSeconds}s dwell
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={quote.status} size="sm" />
                        {isLocked && (
                          <div className="text-[10px] font-bold text-rose-600 mt-1 flex items-center gap-1">
                            <ShieldAlert className="w-3 h-3" /> Approval Locked
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-2">
                        {isLocked ? (
                          <button
                            onClick={() => setSelectedQuoteId(quote.id)}
                            className="px-2.5 py-1 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-md shadow-sm transition-all"
                          >
                            Review Lock
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(quote.whatsappShareText);
                              setCopiedQuoteId(quote.id);
                              setTimeout(() => setCopiedQuoteId(null), 2000);
                            }}
                            className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 rounded-md transition-all inline-flex items-center gap-1"
                          >
                            {copiedQuoteId === quote.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedQuoteId === quote.id ? 'Copied' : 'Share'}</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Manager Approval Modal */}
        {selectedQuote && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-amber-600" />
                  <h3 className="text-sm font-bold text-slate-900">
                    Sales Manager Approval Required
                  </h3>
                </div>
                <button 
                  onClick={() => setSelectedQuoteId(null)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <span>Trigger: {selectedQuote.approvalState.triggerReason?.replace(/_/g, ' ')}</span>
                </div>
                <p>
                  The requested gross profit margin is below the company floor (8%) or uses a supplier tariff verified &gt; 30 days ago.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-lg border border-slate-100 bg-slate-50">
                  <span className="text-[10px] text-slate-400 block">Quote ID</span>
                  <strong className="text-slate-900 font-mono">{selectedQuote.id}</strong>
                </div>
                <div className="p-3 rounded-lg border border-slate-100 bg-slate-50">
                  <span className="text-[10px] text-slate-400 block">Requested Margin</span>
                  <strong className="text-rose-600 font-mono">
                    {((selectedQuote.versions[0]?.markupPercentage || 0) * 100).toFixed(1)}% (Floor: 8.0%)
                  </strong>
                </div>
              </div>

              <div className="text-xs text-slate-600">
                Reviewing as <strong>Rajesh Verma (Head of Sales)</strong>. Approving will unlock the quote and allow sales rep Priya Sharma to dispatch it to the retail agent.
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  onClick={() => {
                    rejectManagerOverride(selectedQuote.id, 'Counter-offer minimum 8% margin required');
                    setSelectedQuoteId(null);
                  }}
                  className="px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors"
                >
                  Reject & Enforce 8% Floor
                </button>
                <button
                  onClick={() => {
                    approveManagerOverride(selectedQuote.id, 'Manager 1-click strategic discount exception approved');
                    setSelectedQuoteId(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-all"
                >
                  Approve Exception
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
