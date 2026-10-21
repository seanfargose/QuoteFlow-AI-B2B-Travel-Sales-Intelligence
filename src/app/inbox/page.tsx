'use client';

import React, { useState } from 'react';
import { Header } from '../../components/Header';
import { useData } from '../../services/dataContext';
import { StatusBadge } from '../../components/StatusBadge';
import { 
  Inbox, 
  Sparkles, 
  ArrowRight, 
  MessageSquare, 
  AlertCircle, 
  Check, 
  Send,
  HelpCircle,
  Copy
} from 'lucide-react';
import { TravelRequirement } from '../../types';

export default function InboxPage() {
  const { requirements, agents, addRequirement } = useData();
  const [selectedReq, setSelectedReq] = useState<TravelRequirement>(requirements[0]);
  const [pastedText, setPastedText] = useState('');
  const [copiedClarification, setCopiedClarification] = useState(false);

  const handleSimulatedParse = () => {
    if (!pastedText.trim()) return;
    const newReq: TravelRequirement = {
      id: `req_${Date.now()}`,
      agentId: 'agt_rohit_surat',
      sourceChannel: 'WHATSAPP',
      rawInquiryText: pastedText,
      destinationCorridor: pastedText.toLowerCase().includes('dubai') ? 'DUBAI' : 'THAILAND',
      cities: [{ cityName: 'Phuket', nights: 3 }, { cityName: 'Krabi', nights: 2 }],
      tentativeTravelDate: '2026-11-20',
      flexibilityDays: 2,
      totalDurationNights: 5,
      passengers: [
        { id: 'p_new1', type: 'ADULT', age: 30, bedPreference: 'DOUBLE' },
        { id: 'p_new2', type: 'ADULT', age: 28, bedPreference: 'DOUBLE' },
      ],
      hotelCategoryRequested: '4_STAR_DELUXE',
      mealPlanRequested: 'BED_AND_BREAKFAST',
      transferPreference: 'PRIVATE',
      flightPreference: 'INCLUDE_FLIGHTS',
      departureAirport: 'BOM',
      budgetInrMax: 140000,
      preferences: { pace: 'MODERATE', vibes: ['FAMILY_FRIENDLY'] },
      completenessScore: 85,
      missingFields: [],
      status: 'PARSED_READY',
      extractedAt: new Date().toISOString(),
    };
    addRequirement(newReq);
    setSelectedReq(newReq);
    setPastedText('');
  };

  const currentAgent = agents.find(a => a.id === selectedReq?.agentId);

  return (
    <>
      <Header 
        title="Requirement Inbox & Intelligence Intake" 
        subtitle="Unstructured natural language extraction, ambiguity detection and missing parameter prompts"
      />

      <main className="p-8 max-w-[1600px] mx-auto w-full space-y-6">
        {/* Quick Paste Raw Inquiry Bar */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-subtle">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              Simulate Ingestion: Paste Raw WhatsApp / Email Message
            </span>
            <span className="text-[11px] text-slate-500">
              Deterministic Schema Extraction Engine
            </span>
          </div>
          <div className="flex gap-3">
            <textarea
              rows={2}
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder="e.g. 'Hey Priya, send best rate for 2 adults 1 kid Phuket Krabi 5N around Nov 15 budget 1.3L 4-star with flights ex-Mumbai'..."
              className="w-full text-xs p-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-sans"
            />
            <button
              onClick={handleSimulatedParse}
              disabled={!pastedText.trim()}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm shrink-0 flex items-center gap-2 transition-all active:scale-95"
            >
              <span>Parse Inquiry</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Two Column Layout: Inbox List & Detail Inspector */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Inquiries List (5 Cols) */}
          <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200/80 p-5 shadow-subtle flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Inbound Inquiries ({requirements.length})
                </h2>
                <span className="text-xs text-indigo-600 font-semibold">Sorted by Recency</span>
              </div>

              <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
                {requirements.map((req) => {
                  const isSelected = selectedReq?.id === req.id;
                  const agent = agents.find(a => a.id === req.agentId);
                  return (
                    <div
                      key={req.id}
                      onClick={() => setSelectedReq(req)}
                      className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                        isSelected 
                          ? 'border-indigo-500 bg-indigo-50/40 ring-1 ring-indigo-500/20' 
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-slate-900">
                          {agent?.agencyName || 'Direct Partner'}
                        </span>
                        <StatusBadge status={req.status} size="sm" />
                      </div>
                      <p className="text-xs text-slate-600 line-clamp-2 mb-2 font-mono text-[11px]">
                        &ldquo;{req.rawInquiryText}&rdquo;
                      </p>
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>{req.destinationCorridor} • {req.totalDurationNights}N</span>
                        <span className={`font-semibold ${req.completenessScore >= 80 ? 'text-emerald-600' : 'text-amber-600'}`}>
                          Completeness: {req.completenessScore}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right: Extracted Intelligence Inspector (7 Cols) */}
          <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200/80 p-6 shadow-subtle">
            {selectedReq ? (
              <div className="space-y-6">
                {/* Header */}
                <div className="flex items-start justify-between pb-4 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                        {selectedReq.destinationCorridor}
                      </span>
                      <h3 className="text-base font-bold text-slate-900">
                        {currentAgent?.agencyName} ({currentAgent?.city})
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500">
                      Channel: <strong className="text-slate-700">{selectedReq.sourceChannel}</strong> • Extracted: {new Date(selectedReq.extractedAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-400 mb-1">Completeness Score</div>
                    <div className={`text-xl font-bold ${selectedReq.completenessScore >= 85 ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {selectedReq.completenessScore}%
                    </div>
                  </div>
                </div>

                {/* Raw Ingested Text Box */}
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                    Raw Ingested Message
                  </label>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs font-mono text-slate-700">
                    {selectedReq.rawInquiryText}
                  </div>
                </div>

                {/* Structured Extraction Matrix */}
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-2">
                    Extracted Operational Parameters
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/60">
                      <span className="text-slate-400 text-[10px] block">Dates & Flexibility</span>
                      <strong className="text-slate-900">{selectedReq.tentativeTravelDate} (±{selectedReq.flexibilityDays}d)</strong>
                    </div>
                    <div className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/60">
                      <span className="text-slate-400 text-[10px] block">Duration / Split</span>
                      <strong className="text-slate-900">
                        {selectedReq.totalDurationNights} Nights ({selectedReq.cities.map(c => `${c.cityName} ${c.nights}N`).join(' + ')})
                      </strong>
                    </div>
                    <div className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/60">
                      <span className="text-slate-400 text-[10px] block">Passengers</span>
                      <strong className="text-slate-900">
                        {selectedReq.passengers.length} Pax ({selectedReq.passengers.filter(p => p.type === 'ADULT').length}A, {selectedReq.passengers.filter(p => p.type === 'CHILD').length}C)
                      </strong>
                    </div>
                    <div className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/60">
                      <span className="text-slate-400 text-[10px] block">Hotel Category</span>
                      <strong className="text-slate-900">{selectedReq.hotelCategoryRequested.replace(/_/g, ' ')}</strong>
                    </div>
                    <div className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/60">
                      <span className="text-slate-400 text-[10px] block">Flights</span>
                      <strong className="text-slate-900">
                        {selectedReq.flightPreference} {selectedReq.departureAirport ? `(ex-${selectedReq.departureAirport})` : ''}
                      </strong>
                    </div>
                    <div className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/60">
                      <span className="text-slate-400 text-[10px] block">Budget Cap</span>
                      <strong className="text-slate-900">
                        {selectedReq.budgetInrMax ? `₹${selectedReq.budgetInrMax.toLocaleString('en-IN')}` : 'Flexible'}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Missing Fields & Clarification Prompt Generator */}
                {selectedReq.missingFields.length > 0 ? (
                  <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/60 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                      <span>Missing Operational Data Flagged</span>
                    </div>
                    {selectedReq.missingFields.map((mf, idx) => (
                      <div key={idx} className="bg-white p-3 rounded-lg border border-amber-200/80 text-xs space-y-2">
                        <div className="text-slate-700 font-medium">
                          ⚠️ {mf.humanDescription}
                        </div>
                        <div className="p-2 bg-slate-50 rounded border border-slate-200 text-[11px] font-mono text-slate-800 flex items-center justify-between">
                          <span>&ldquo;{mf.clarificationPromptTemplate}&rdquo;</span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(mf.clarificationPromptTemplate);
                              setCopiedClarification(true);
                              setTimeout(() => setCopiedClarification(false), 2000);
                            }}
                            className="ml-2 text-indigo-600 hover:text-indigo-800 text-xs font-semibold shrink-0 flex items-center gap-1"
                          >
                            {copiedClarification ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedClarification ? 'Copied' : 'Copy'}</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/60 text-xs text-emerald-800 flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>All critical operational parameters present. Ready for quote generation.</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-20 text-slate-400 text-xs">
                Select an inquiry from the left to view extracted parameters.
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
