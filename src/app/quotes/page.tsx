'use client';

import React, { useState, useEffect } from 'react';
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
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Edit3,
  Eye,
  Layers,
  Send,
  RefreshCw,
  Sliders,
  Building,
  Car,
  Compass,
  Plane,
  Calendar,
  Users,
  DollarSign,
  CheckCircle2,
  Share2,
  Info,
  ArrowRight,
  History
} from 'lucide-react';
import { 
  Quote, 
  QuoteVersion, 
  QuoteLineItem, 
  LineItemCategory, 
  PackageTier,
  TravelRequirement
} from '../../types';
import { 
  checkQuoteRisks, 
  calculateQuoteVersionTotals,
  RiskWarning
} from '../../domain/pricingEngine';
import { 
  quoteRecommendationService, 
  QuoteRecommendationResult 
} from '../../services/quoteRecommendationService';

export default function QuotesPage() {
  const { 
    quotes, 
    requirements, 
    agents, 
    hotelRates,
    updateQuoteLineItem,
    addLineItemToQuote,
    removeLineItemFromQuote,
    updateQuoteMarkup,
    createQuoteNewVersion,
    createQuoteForRequirement,
    markQuoteAsSent,
    approveManagerOverride, 
    rejectManagerOverride, 
    updateQuoteStatus 
  } = useData();

  // Selected Quote & Active View
  const [selectedQuoteId, setSelectedQuoteId] = useState<string>(quotes[0]?.id || 'qte_th_84920');
  const [activeTab, setActiveTab] = useState<'WORKBENCH' | 'COMPARE' | 'PROPOSAL' | 'VERSIONS' | 'LEDGER'>('WORKBENCH');

  // Interactive editing states
  const [editingLineItem, setEditingLineItem] = useState<QuoteLineItem | null>(null);
  const [isAddingLineItem, setIsAddingLineItem] = useState<LineItemCategory | null>(null);
  const [newLineItemTitle, setNewLineItemTitle] = useState('');
  const [newLineItemCost, setNewLineItemCost] = useState(2000);
  const [newLineItemUnits, setNewLineItemUnits] = useState(2);
  const [newLineItemCurrency, setNewLineItemCurrency] = useState<'THB' | 'AED' | 'USD' | 'EUR' | 'INR'>('THB');

  // Modals
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);
  const [versionChangeReason, setVersionChangeReason] = useState('Adjusted hotel category and itinerary activities based on client feedback');
  const [isManagerModalOpen, setIsManagerModalOpen] = useState(false);
  const [isNewQuoteModalOpen, setIsNewQuoteModalOpen] = useState(false);
  const [selectedReqForNewQuote, setSelectedReqForNewQuote] = useState(requirements[0]?.id || '');
  const [selectedTierForNewQuote, setSelectedTierForNewQuote] = useState<PackageTier>('CURATED_RECOMMENDED');

  // Feedback states
  const [copiedShareText, setCopiedShareText] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // AI Recommendation State
  const [recommendation, setRecommendation] = useState<QuoteRecommendationResult | null>(null);
  const [isLoadingRecommendation, setIsLoadingRecommendation] = useState(false);

  // Current active quote & version
  const currentQuote = quotes.find(q => q.id === selectedQuoteId) || quotes[0];
  const activeVersion = currentQuote?.versions?.find(v => v.versionId === currentQuote.currentVersionId) || currentQuote?.versions?.[0];
  const currentReq = requirements.find(r => r.id === currentQuote?.requirementId);
  const currentAgent = agents.find(a => a.id === currentQuote?.agentId) || agents[0];

  const paxCount = (currentReq?.passengers?.adults || 2) + (currentReq?.passengers?.children || 0);

  // Trigger AI recommendation whenever requirement or quote versions change
  useEffect(() => {
    if (currentReq && currentQuote?.versions) {
      setIsLoadingRecommendation(true);
      quoteRecommendationService.generateRecommendation(currentReq, currentQuote.versions)
        .then(res => {
          setRecommendation(res);
          setIsLoadingRecommendation(false);
        })
        .catch(() => setIsLoadingRecommendation(false));
    }
  }, [currentReq?.id, currentQuote?.id]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const formatCurrency = (amt: number) => `₹${Math.round(amt || 0).toLocaleString('en-IN')}`;

  // Deterministic margin calculations for active version
  const netCost = activeVersion?.totalNetCostInr || 0;
  const sellingPrice = activeVersion?.totalSellingPriceInr || 0;
  const grossProfit = activeVersion?.grossProfitInr || 0;
  
  // Cost-based Markup % = (Profit / Net Cost) * 100
  const costBasedMarkupPct = netCost > 0 ? (grossProfit / netCost) * 100 : 0;
  // Selling-price Gross Margin % = (Profit / Selling Price) * 100
  const grossMarginPct = sellingPrice > 0 ? (grossProfit / sellingPrice) * 100 : 0;

  // Real-time risk warnings
  const riskWarnings: RiskWarning[] = activeVersion 
    ? checkQuoteRisks(
        activeVersion.lineItems, 
        hotelRates, 
        currentReq?.tentativeTravelDate, 
        grossMarginPct
      )
    : [];

  const isSubFloor = grossMarginPct < 8.0;
  const isLocked = currentQuote?.status === 'PENDING_APPROVAL' || isSubFloor;

  // Handle markup adjustment
  const handleMarkupChange = (newMarkupPercentage: number) => {
    if (!currentQuote || !activeVersion) return;
    updateQuoteMarkup(currentQuote.id, activeVersion.versionId, newMarkupPercentage);
  };

  // Handle line item edit submit
  const handleSaveLineItem = () => {
    if (!editingLineItem || !currentQuote || !activeVersion) return;
    updateQuoteLineItem(currentQuote.id, activeVersion.versionId, editingLineItem.id, editingLineItem);
    setEditingLineItem(null);
    showToast('Line item updated & totals recalculated');
  };

  // Handle add line item
  const handleAddLineItemSubmit = () => {
    if (!isAddingLineItem || !currentQuote || !activeVersion || !newLineItemTitle) return;
    const fxRate = newLineItemCurrency === 'THB' ? 2.42 : newLineItemCurrency === 'AED' ? 22.95 : newLineItemCurrency === 'USD' ? 84.2 : 1;
    const itemNetInr = Math.round(newLineItemUnits * newLineItemCost * fxRate * 1.015);
    const itemMarkup = activeVersion.markupPercentage || 0.12;

    const newItem: QuoteLineItem = {
      id: `li_${isAddingLineItem.toLowerCase()}_${Date.now()}`,
      category: isAddingLineItem,
      title: newLineItemTitle,
      supplierId: 'sup_asiaworld_th',
      inventorySourceType: 'CONTRACTED_DIRECT',
      units: newLineItemUnits,
      unitNetCostForeign: newLineItemCost,
      foreignCurrency: newLineItemCurrency,
      fxRateToInr: fxRate,
      totalNetCostInr: itemNetInr,
      markupPercentage: itemMarkup,
      sellingPriceInr: Math.round(itemNetInr * (1 + itemMarkup)),
      isPrepaidCommitment: false,
      isOptionalAddon: false,
    };

    addLineItemToQuote(currentQuote.id, activeVersion.versionId, newItem);
    setIsAddingLineItem(null);
    setNewLineItemTitle('');
    showToast(`Added ${isAddingLineItem} item`);
  };

  // Handle creating a new version
  const handleCreateNewVersion = () => {
    if (!currentQuote || !versionChangeReason) return;
    createQuoteNewVersion(currentQuote.id, versionChangeReason);
    setIsVersionModalOpen(false);
    showToast('New quote version created successfully (v' + ((activeVersion?.versionNumber || 1) + 1) + ')');
  };

  // Handle switch active tier
  const handleSwitchTier = (tier: PackageTier) => {
    if (!currentQuote) return;
    const targetVer = currentQuote.versions.find(v => v.packageTier === tier);
    if (targetVer) {
      currentQuote.currentVersionId = targetVer.versionId;
      currentQuote.activeTier = tier;
      showToast(`Switched active quote to ${tier.replace('_', ' ')} package`);
    }
  };

  return (
    <>
      <Header 
        title="Quote Workbench & Dynamic Margin Engine" 
        subtitle="Deterministic tariff calculations, multi-tier alternatives, rate freshness governance and travel agent proposal delivery"
      />

      {/* Floating Notification Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-xl border border-slate-700 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      <main className="p-8 max-w-[1700px] mx-auto w-full space-y-6">

        {/* TOP SELECTOR & REQUIREMENT SUMMARY CARD */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-subtle p-5 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Active Quote:
              </label>
              <select 
                value={selectedQuoteId}
                onChange={(e) => setSelectedQuoteId(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {quotes.map(q => {
                  const agt = agents.find(a => a.id === q.agentId);
                  const ver = q.versions.find(v => v.versionId === q.currentVersionId) || q.versions[0];
                  return (
                    <option key={q.id} value={q.id}>
                      {q.id} — {agt?.agencyName || 'Agent'} ({q.destinationCorridor} • v{ver?.versionNumber || 1}) [{q.status}]
                    </option>
                  );
                })}
              </select>

              <button
                onClick={() => setIsNewQuoteModalOpen(true)}
                className="px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Draft Quote from Requirement
              </button>
            </div>

            {/* View Mode Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold text-slate-600">
              <button
                onClick={() => setActiveTab('WORKBENCH')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  activeTab === 'WORKBENCH' ? 'bg-white text-indigo-700 shadow-xs' : 'hover:text-slate-900'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                Quote Workbench
              </button>
              <button
                onClick={() => setActiveTab('COMPARE')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  activeTab === 'COMPARE' ? 'bg-white text-indigo-700 shadow-xs' : 'hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                Compare Alternatives (3 Tiers)
              </button>
              <button
                onClick={() => setActiveTab('PROPOSAL')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  activeTab === 'PROPOSAL' ? 'bg-white text-indigo-700 shadow-xs' : 'hover:text-slate-900'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                Travel Agent Proposal
              </button>
              <button
                onClick={() => setActiveTab('VERSIONS')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  activeTab === 'VERSIONS' ? 'bg-white text-indigo-700 shadow-xs' : 'hover:text-slate-900'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                Version History ({currentQuote?.versions?.length || 1})
              </button>
              <button
                onClick={() => setActiveTab('LEDGER')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  activeTab === 'LEDGER' ? 'bg-white text-indigo-700 shadow-xs' : 'hover:text-slate-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                Quotes Ledger
              </button>
            </div>
          </div>

          {/* Requirement Metadata Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 text-xs">
            <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Retail Travel Agent</span>
              <span className="font-bold text-slate-900 truncate block">{currentAgent?.agencyName}</span>
              <span className="text-[11px] text-slate-500">{currentAgent?.city} • {currentAgent?.contactPerson}</span>
            </div>

            <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Corridor & Dates</span>
              <span className="font-bold text-slate-900">{currentQuote?.destinationCorridor}</span>
              <span className="text-[11px] text-slate-500 block">
                {currentReq?.tentativeTravelDate ? new Date(currentReq.tentativeTravelDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Flexible Dates'} 
                {currentReq?.totalDurationNights ? ` (${currentReq.totalDurationNights} Nights)` : ''}
              </span>
            </div>

            <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Traveller Counts</span>
              <span className="font-bold text-slate-900">
                {currentReq?.passengers?.adults || 2} Adults
                {currentReq?.passengers?.children ? `, ${currentReq.passengers.children} Child` : ''}
              </span>
              <span className="text-[11px] text-slate-500 block">
                {currentReq?.flightPreference === 'LAND_ONLY' ? 'Land Package Only' : 'Flights Included'}
              </span>
            </div>

            <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Completeness & Intake</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                  (currentReq?.completenessScore || 0) >= 80 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                }`}>
                  {currentReq?.completenessScore || 85}% Ready
                </span>
                {currentReq?.missingFields && currentReq.missingFields.length > 0 && (
                  <span className="text-[10px] text-amber-600 font-medium" title={currentReq.missingFields.join(', ')}>
                    ({currentReq.missingFields.length} missing)
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">Inquiry: {currentReq?.sourceChannel}</span>
            </div>

            <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Lifecycle & Approval</span>
              <div className="mt-0.5">
                <StatusBadge status={currentQuote?.status || 'DRAFT'} size="sm" />
              </div>
              {isLocked ? (
                <span className="text-[10px] font-bold text-rose-600 flex items-center gap-1 mt-1">
                  <ShieldAlert className="w-3 h-3" /> Manager Sign-off Needed
                </span>
              ) : (
                <span className="text-[10px] text-emerald-600 flex items-center gap-1 mt-1">
                  <Check className="w-3 h-3" /> Auto-Approved
                </span>
              )}
            </div>

            <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Quote Version</span>
              <div className="flex items-center justify-between mt-0.5">
                <span className="font-mono font-bold text-slate-900 text-xs">
                  v{activeVersion?.versionNumber || 1} ({activeVersion?.packageTier?.replace('_', ' ') || 'Curated'})
                </span>
                <button
                  onClick={() => setIsVersionModalOpen(true)}
                  className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800"
                >
                  + New Ver
                </button>
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Valid: {activeVersion?.validityExpiresAt ? new Date(activeVersion.validityExpiresAt).toLocaleDateString() : '7 Days'}
              </span>
            </div>
          </div>

          {/* Supplier confirmation caveat notice */}
          <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200/80 flex items-start gap-2 text-xs text-amber-900">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong className="font-semibold">Tariff & Availability Disclaimer:</strong> This quotation represents a dynamically calculated price model based on negotiated DMC contracts and committed hotel allotments. 
              <span className="font-semibold"> It does NOT constitute a confirmed booking with suppliers.</span> Final rates, room holding and flight taxes remain subject to re-verification at confirmation.
            </div>
          </div>
        </div>

        {/* VIEW 1: QUOTE WORKBENCH */}
        {activeTab === 'WORKBENCH' && (
          <div className="space-y-6">

            {/* MARGIN & FINANCIAL HERO RIBBON */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 rounded-2xl p-6 text-white shadow-xl space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-700/80">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      Tier: {activeVersion?.tierDisplayName || 'Curated Recommended'}
                    </span>
                    <span className="text-xs text-slate-400">
                      Pricing Currency: INR (₹)
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white mt-1">
                    Transparent Deterministic Pricing Engine
                  </h3>
                </div>

                <div className="flex items-center gap-3">
                  {isLocked && (
                    <button
                      onClick={() => setIsManagerModalOpen(true)}
                      className="px-3 py-1.5 text-xs font-bold text-amber-900 bg-amber-400 hover:bg-amber-300 rounded-lg shadow-sm transition-all flex items-center gap-1.5"
                    >
                      <ShieldAlert className="w-3.5 h-3.5" />
                      Manager 1-Click Approval
                    </button>
                  )}

                  <button
                    onClick={() => {
                      markQuoteAsSent(currentQuote.id);
                      showToast('Quote dispatched to agent & follow-up task scheduled');
                    }}
                    disabled={isLocked}
                    className={`px-4 py-2 text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-1.5 ${
                      isLocked 
                        ? 'bg-slate-700 text-slate-400 cursor-not-allowed' 
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    }`}
                  >
                    <Send className="w-3.5 h-3.5" />
                    Approve & Mark as Sent (Demo)
                  </button>
                </div>
              </div>

              {/* 5-Card Financial Breakdown */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {/* 1. Net Supplier Cost */}
                <div className="p-4 bg-slate-800/60 rounded-xl border border-slate-700">
                  <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">
                    Net Supplier Cost
                  </span>
                  <div className="text-xl font-bold font-mono text-white mt-1">
                    {formatCurrency(netCost)}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    Land: {formatCurrency(activeVersion?.totalLandNetCostInr || 0)} • Flights: {formatCurrency(activeVersion?.totalFlightNetCostInr || 0)}
                  </div>
                </div>

                {/* 2. Gross Profit */}
                <div className="p-4 bg-slate-800/60 rounded-xl border border-slate-700">
                  <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">
                    Gross Profit (Markup Amt)
                  </span>
                  <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
                    +{formatCurrency(grossProfit)}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    Selling Price minus Net Cost
                  </div>
                </div>

                {/* 3. Cost-based Markup % (Interactive) */}
                <div className="p-4 bg-slate-800/80 rounded-xl border border-indigo-500/30">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-indigo-300 block uppercase tracking-wider">
                      Cost-Based Markup %
                    </span>
                    <span className="font-mono font-bold text-white text-sm">
                      {costBasedMarkupPct.toFixed(1)}%
                    </span>
                  </div>
                  <input 
                    type="range"
                    min="5"
                    max="25"
                    step="0.5"
                    value={costBasedMarkupPct}
                    onChange={(e) => handleMarkupChange(parseFloat(e.target.value))}
                    className="w-full mt-2 accent-indigo-500 cursor-pointer"
                  />
                  <div className="text-[10px] text-slate-400 mt-1 flex justify-between">
                    <span>Profit ÷ Net Cost</span>
                    <span>Slider: 5% - 25%</span>
                  </div>
                </div>

                {/* 4. Selling-Price Gross Margin % */}
                <div className={`p-4 rounded-xl border ${
                  grossMarginPct >= 12 
                    ? 'bg-emerald-950/40 border-emerald-500/40' 
                    : grossMarginPct >= 8 
                    ? 'bg-amber-950/40 border-amber-500/40' 
                    : 'bg-rose-950/40 border-rose-500/50'
                }`}>
                  <span className="text-[11px] font-semibold text-slate-300 block uppercase tracking-wider">
                    Selling Gross Margin %
                  </span>
                  <div className="text-xl font-bold font-mono text-white mt-1 flex items-center gap-2">
                    <span>{grossMarginPct.toFixed(1)}%</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      grossMarginPct >= 12 
                        ? 'bg-emerald-500/20 text-emerald-300' 
                        : grossMarginPct >= 8 
                        ? 'bg-amber-500/20 text-amber-300' 
                        : 'bg-rose-500/30 text-rose-300'
                    }`}>
                      {grossMarginPct >= 12 ? 'Healthy' : grossMarginPct >= 8 ? 'Floor Alert' : 'Locked (<8%)'}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    Profit ÷ Selling Price (Floor: 8.0%)
                  </div>
                </div>

                {/* 5. Total Selling Price */}
                <div className="p-4 bg-indigo-900/40 rounded-xl border border-indigo-400/30">
                  <span className="text-[11px] font-semibold text-indigo-200 block uppercase tracking-wider">
                    Total Package Selling Price
                  </span>
                  <div className="text-2xl font-black font-mono text-white mt-1">
                    {formatCurrency(sellingPrice)}
                  </div>
                  <div className="text-[11px] font-semibold text-indigo-300 mt-1">
                    ₹{Math.round(activeVersion?.perPersonSellingPriceInr || 0).toLocaleString('en-IN')} / traveller
                  </div>
                </div>
              </div>

              {/* Mathematical Terminology Integrity Callout */}
              <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-700/60 text-[11px] text-slate-300 flex items-center justify-between">
                <div>
                  <strong className="text-indigo-300">Financial Integrity Standard: </strong>
                  <strong>Cost-based Markup</strong> ({costBasedMarkupPct.toFixed(1)}%) is the percentage added to net supplier cost. 
                  <strong> Selling-price Gross Margin</strong> ({grossMarginPct.toFixed(1)}%) is the share of the final price captured as profit. These are never used interchangeably.
                </div>
                <div className="font-mono text-[10px] text-slate-400">
                  Total Pax: {paxCount}
                </div>
              </div>
            </div>

            {/* RISK & RATE FRESHNESS WARNINGS (IF ANY) */}
            {riskWarnings.length > 0 && (
              <div className="space-y-2">
                {riskWarnings.map(warning => (
                  <div 
                    key={warning.id}
                    className={`p-4 rounded-xl border flex items-start gap-3 text-xs ${
                      warning.severity === 'CRITICAL' 
                        ? 'bg-rose-50 border-rose-200 text-rose-900' 
                        : 'bg-amber-50 border-amber-200 text-amber-900'
                    }`}
                  >
                    {warning.severity === 'CRITICAL' ? (
                      <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-1">
                      <div className="font-bold flex items-center gap-2">
                        <span>{warning.title}</span>
                        <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-white/70">
                          {warning.category}
                        </span>
                      </div>
                      <p className="text-slate-700">{warning.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* AI-ASSISTED TRADE-OFF RECOMMENDATION CARD */}
            {recommendation && (
              <div className="bg-gradient-to-r from-indigo-50/70 via-purple-50/50 to-white rounded-2xl border border-indigo-100 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">
                        AI Strategic Trade-Off Advisor
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        {recommendation.providerName} • {recommendation.isSimulated ? 'Deterministic Heuristic Mode' : 'Live LLM Provider'}
                      </p>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 text-xs font-bold text-indigo-700 bg-indigo-100 rounded-lg">
                    Recommended: {recommendation.recommendedTier.replace('_', ' ')}
                  </span>
                </div>

                <div className="p-3 bg-white/80 rounded-xl border border-indigo-100/80 text-xs text-slate-800 leading-relaxed">
                  <strong className="text-indigo-950 font-semibold block mb-1">Executive Rationale:</strong>
                  {recommendation.strategicRationale}
                </div>

                {/* 3 Tier Trade-offs summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {recommendation.tradeOffs.map(tradeOff => (
                    <div 
                      key={tradeOff.tier}
                      className={`p-3.5 rounded-xl border text-xs space-y-2 ${
                        tradeOff.tier === activeVersion?.packageTier 
                          ? 'bg-indigo-50/90 border-indigo-300 ring-1 ring-indigo-200' 
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{tradeOff.displayName}</span>
                        <span className="font-mono font-bold text-indigo-700">{formatCurrency(tradeOff.priceInr)}</span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        ₹{tradeOff.perPersonInr.toLocaleString('en-IN')}/person • {tradeOff.marginPercentage.toFixed(1)}% Gross Margin
                      </div>
                      {tradeOff.inventoryAdvantage && (
                        <div className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                          {tradeOff.inventoryAdvantage}
                        </div>
                      )}
                      <div className="text-[11px] text-slate-600">
                        <strong>Target: </strong>{tradeOff.recommendedAudience}
                      </div>
                      {tradeOff.tier !== activeVersion?.packageTier && (
                        <button
                          onClick={() => handleSwitchTier(tradeOff.tier)}
                          className="w-full mt-1 py-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 bg-slate-50 hover:bg-indigo-50 rounded border border-slate-200 transition-colors"
                        >
                          Switch to this Tier
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CATEGORIZED LINE ITEMS TABLE */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-subtle overflow-hidden space-y-0">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Quote Line Items ({activeVersion?.lineItems?.length || 0} Elements)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Inventory sources, FX conversions (+1.5% buffer), unit costs and selling price
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsAddingLineItem('HOTEL')}
                    className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Hotel
                  </button>
                  <button
                    onClick={() => setIsAddingLineItem('TRANSFER')}
                    className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Transfer
                  </button>
                  <button
                    onClick={() => setIsAddingLineItem('ACTIVITY')}
                    className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Activity
                  </button>
                  <button
                    onClick={() => setIsAddingLineItem('FLIGHT')}
                    className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Flight
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4">Item & Description</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Inventory Source</th>
                      <th className="py-3 px-4">Supplier Cost</th>
                      <th className="py-3 px-4">FX & Buffer</th>
                      <th className="py-3 px-4">Total Net (INR)</th>
                      <th className="py-3 px-4">Selling (INR)</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans">
                    {activeVersion?.lineItems?.map((item) => {
                      const isPrepaid = item.inventorySourceType === 'PREPAID_COMMITMENT';

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4 max-w-md">
                            <div className="font-bold text-slate-900">{item.title}</div>
                            {item.notes && (
                              <div className="text-[11px] text-slate-400 mt-0.5">{item.notes}</div>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="font-semibold text-slate-700 text-[11px] px-2 py-0.5 rounded bg-slate-100">
                              {item.category}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded inline-flex items-center gap-1 ${
                              isPrepaid 
                                ? 'bg-purple-50 text-purple-700 border border-purple-200' 
                                : item.inventorySourceType === 'CONTRACTED_DIRECT'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-600'
                            }`}>
                              {isPrepaid ? '★ Committed Allotment' : item.inventorySourceType.replace(/_/g, ' ')}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 font-mono">
                            {item.units} × {item.foreignCurrency} {item.unitNetCostForeign?.toLocaleString()}
                          </td>

                          <td className="py-3.5 px-4 text-[11px] text-slate-500 font-mono">
                            {item.foreignCurrency === 'INR' ? '1.00 (Local)' : `${item.fxRateToInr} (+1.5% hedged)`}
                          </td>

                          <td className="py-3.5 px-4 font-mono font-semibold text-slate-900">
                            {formatCurrency(item.totalNetCostInr)}
                          </td>

                          <td className="py-3.5 px-4 font-mono font-bold text-indigo-700">
                            {formatCurrency(item.sellingPriceInr)}
                          </td>

                          <td className="py-3.5 px-4 text-right space-x-1">
                            <button
                              onClick={() => setEditingLineItem(item)}
                              className="p-1 text-slate-400 hover:text-indigo-600 rounded transition-colors"
                              title="Edit item"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                removeLineItemFromQuote(currentQuote.id, activeVersion.versionId, item.id);
                                showToast('Removed line item');
                              }}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                              title="Delete item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ASSUMPTIONS, INCLUSIONS & EXCLUSIONS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Inclusions */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-600" />
                  Package Inclusions
                </h4>
                <ul className="space-y-1.5 text-xs text-slate-600">
                  {activeVersion?.inclusions?.map((inc, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-emerald-500 font-bold">•</span>
                      <span>{inc}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Exclusions */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <X className="w-4 h-4 text-rose-600" />
                  Package Exclusions
                </h4>
                <ul className="space-y-1.5 text-xs text-slate-600">
                  {activeVersion?.exclusions?.map((exc, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-rose-500 font-bold">•</span>
                      <span>{exc}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Assumptions & Unresolved Questions */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-indigo-600" />
                  Assumptions & Operational Notes
                </h4>
                <ul className="space-y-1.5 text-xs text-slate-600">
                  {activeVersion?.assumptions?.map((ass, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-indigo-500 font-bold">•</span>
                      <span>{ass}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

          </div>
        )}

        {/* VIEW 2: COMPARE 3 ALTERNATIVES */}
        {activeTab === 'COMPARE' && (
          <div className="space-y-6">
            <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-200 text-xs text-indigo-900 flex items-center justify-between">
              <div>
                <strong className="font-bold">Multi-Tier Alternative Comparison: </strong>
                Below are 3 proposed packages (Saver, Recommended, Luxury) modeled for this client inquiry. 
                These are simulated alternatives generated from historical and contracted inventory parameters.
              </div>
              <span className="text-[11px] font-mono text-indigo-700 bg-white px-2 py-1 rounded border border-indigo-200">
                Corridor: {currentQuote?.destinationCorridor} ({currentReq?.totalDurationNights || 5}N)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {currentQuote?.versions?.map((ver) => {
                const isSelected = ver.versionId === activeVersion?.versionId;
                const verMarginPct = ver.totalSellingPriceInr > 0 ? (ver.grossProfitInr / ver.totalSellingPriceInr) * 100 : 0;

                return (
                  <div 
                    key={ver.versionId}
                    className={`bg-white rounded-2xl border p-6 space-y-5 transition-all shadow-sm ${
                      isSelected 
                        ? 'border-indigo-600 ring-2 ring-indigo-500/20 shadow-md' 
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                        ver.packageTier === 'SAVER' 
                          ? 'bg-slate-100 text-slate-700' 
                          : ver.packageTier === 'CURATED_RECOMMENDED'
                          ? 'bg-indigo-100 text-indigo-800'
                          : 'bg-amber-100 text-amber-900'
                      }`}>
                        {ver.packageTier.replace('_', ' ')}
                      </span>
                      {isSelected && (
                        <span className="text-xs font-bold text-indigo-600 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Active Choice
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-slate-900">{ver.tierDisplayName}</h3>
                      <div className="mt-3">
                        <span className="text-3xl font-black font-mono text-slate-900">
                          {formatCurrency(ver.totalSellingPriceInr)}
                        </span>
                        <span className="text-xs text-slate-500 block mt-0.5">
                          ₹{Math.round(ver.perPersonSellingPriceInr).toLocaleString('en-IN')} / traveller
                        </span>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Net Supplier Cost:</span>
                        <span className="font-mono font-semibold text-slate-800">{formatCurrency(ver.totalNetCostInr)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Gross Margin:</span>
                        <span className="font-mono font-bold text-emerald-600">{verMarginPct.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Gross Profit:</span>
                        <span className="font-mono font-bold text-slate-900">{formatCurrency(ver.grossProfitInr)}</span>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs">
                      <strong className="text-slate-900 text-[11px] uppercase tracking-wider block">Key Inclusions:</strong>
                      <ul className="space-y-1.5 text-slate-600">
                        {ver.inclusions?.slice(0, 4).map((inc, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="text-indigo-500 font-bold">•</span>
                            <span>{inc}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="pt-3 border-t border-slate-100">
                      {isSelected ? (
                        <div className="w-full py-2 text-center text-xs font-bold text-indigo-600 bg-indigo-50 rounded-xl">
                          Currently Active in Workbench
                        </div>
                      ) : (
                        <button
                          onClick={() => handleSwitchTier(ver.packageTier)}
                          className="w-full py-2 text-xs font-bold text-white bg-slate-900 hover:bg-indigo-600 rounded-xl transition-colors"
                        >
                          Select this Package
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* VIEW 3: TRAVEL AGENT PROPOSAL (CUSTOMER-FACING WHITE-LABEL) */}
        {activeTab === 'PROPOSAL' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between">
              <div>
                <strong className="font-bold">Agent-Facing Proposal Preview: </strong>
                All internal DMC supplier costs, FX conversion buffers, markup percentages and confidential gross margins are strictly omitted.
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(currentQuote.whatsappShareText);
                  setCopiedShareText(true);
                  setTimeout(() => setCopiedShareText(false), 2000);
                }}
                className="px-3 py-1.5 text-xs font-bold text-emerald-800 bg-white border border-emerald-300 rounded-lg shadow-xs hover:bg-emerald-50 transition-colors flex items-center gap-1.5"
              >
                {copiedShareText ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedShareText ? 'Copied WhatsApp Text' : 'Copy WhatsApp Format'}
              </button>
            </div>

            {/* Travel Agent White-Label Document */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-8 md:p-12 space-y-8">
              {/* Header with Agency Branding */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
                <div>
                  <div className="text-xl font-black text-slate-900 tracking-tight">
                    {currentAgent?.agencyName}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Prepared for: {currentReq?.contactName || 'Valued Guests'} • Reference: {currentQuote?.id}
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs text-slate-400 block">Package Proposal</span>
                  <span className="text-sm font-bold text-indigo-700">
                    {currentQuote?.destinationCorridor} Holiday Itinerary
                  </span>
                </div>
              </div>

              {/* Trip Highlight Banner */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-5 bg-slate-50 rounded-2xl text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Destination</span>
                  <span className="font-bold text-slate-900 text-sm">{currentQuote?.destinationCorridor}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Travel Dates</span>
                  <span className="font-bold text-slate-900 text-sm">
                    {currentReq?.tentativeTravelDate ? new Date(currentReq.tentativeTravelDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Flexible'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Duration</span>
                  <span className="font-bold text-slate-900 text-sm">{currentReq?.totalDurationNights || 5} Nights</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Party Size</span>
                  <span className="font-bold text-slate-900 text-sm">{paxCount} Travellers</span>
                </div>
              </div>

              {/* Package Elements (NO INTERNAL COSTS) */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
                  Confirmed Itinerary Elements
                </h4>

                <div className="space-y-3">
                  {activeVersion?.lineItems?.map((item) => (
                    <div key={item.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 uppercase">
                            {item.category}
                          </span>
                          <span className="font-bold text-slate-900 text-xs">{item.title}</span>
                        </div>
                        {item.notes && (
                          <div className="text-[11px] text-slate-500">{item.notes}</div>
                        )}
                      </div>
                      <div className="text-xs font-semibold text-slate-600">
                        Included
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Inclusions & Exclusions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                <div className="p-4 bg-emerald-50/40 rounded-xl border border-emerald-100 space-y-2">
                  <h5 className="font-bold text-emerald-900 uppercase text-[11px]">Inclusions</h5>
                  <ul className="space-y-1 text-slate-700">
                    {activeVersion?.inclusions?.map((inc, i) => (
                      <li key={i}>✓ {inc}</li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 bg-rose-50/40 rounded-xl border border-rose-100 space-y-2">
                  <h5 className="font-bold text-rose-900 uppercase text-[11px]">Exclusions</h5>
                  <ul className="space-y-1 text-slate-700">
                    {activeVersion?.exclusions?.map((exc, i) => (
                      <li key={i}>✗ {exc}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Final Selling Price Callout (NO COST OR MARGIN DATA) */}
              <div className="p-6 bg-slate-900 text-white rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <span className="text-xs text-slate-400 block uppercase tracking-wider font-semibold">
                    Total Quotation for {paxCount} Travellers
                  </span>
                  <div className="text-3xl font-black font-mono text-white mt-1">
                    {formatCurrency(sellingPrice)}
                  </div>
                  <div className="text-xs text-indigo-300 mt-1">
                    Approx. ₹{Math.round(activeVersion?.perPersonSellingPriceInr || 0).toLocaleString('en-IN')} per person (Inclusive of Land Services & Applicable Taxes)
                  </div>
                </div>

                <div className="text-right text-xs text-slate-400 space-y-1">
                  <div>Valid Until: {new Date(activeVersion?.validityExpiresAt || Date.now()).toLocaleDateString()}</div>
                  <div className="text-[11px] text-slate-500">Standard cancellation terms apply</div>
                </div>
              </div>

              <div className="text-[11px] text-slate-400 text-center leading-relaxed">
                * Note: Airfares and hotel room allotments are subject to real-time availability at the time of final confirmation.
              </div>
            </div>
          </div>
        )}

        {/* VIEW 4: VERSION HISTORY & AUDIT LOG */}
        {activeTab === 'VERSIONS' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-subtle p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Version History & Modification Ledger
                </h3>
                <p className="text-xs text-slate-500">
                  Audit trail of quote revisions, price changes, and margin deltas
                </p>
              </div>

              <button
                onClick={() => setIsVersionModalOpen(true)}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Create New Version
              </button>
            </div>

            <div className="space-y-4">
              {currentQuote?.versions?.map((ver, idx) => {
                const isActive = ver.versionId === currentQuote.currentVersionId;
                const diff = ver.diffFromPreviousVersion;

                return (
                  <div 
                    key={ver.versionId}
                    className={`p-5 rounded-2xl border transition-all ${
                      isActive 
                        ? 'bg-indigo-50/40 border-indigo-200 ring-1 ring-indigo-200' 
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-slate-900">
                          v{ver.versionNumber} ({ver.packageTier})
                        </span>
                        {isActive && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-600 text-white">
                            Current Active
                          </span>
                        )}
                        <span className="text-xs text-slate-400">
                          Created {new Date(ver.createdAt).toLocaleString()} by {ver.createdByUserId}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-xs font-mono">
                        <div>
                          <span className="text-slate-400 text-[10px] block">Selling Price</span>
                          <strong className="text-slate-900 font-bold">{formatCurrency(ver.totalSellingPriceInr)}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[10px] block">Gross Margin</span>
                          <strong className="text-emerald-600 font-bold">
                            {ver.totalSellingPriceInr > 0 ? ((ver.grossProfitInr / ver.totalSellingPriceInr) * 100).toFixed(1) : 0}%
                          </strong>
                        </div>
                      </div>
                    </div>

                    {/* Diff breakdown if not v1 */}
                    {diff && (
                      <div className="mt-3 p-3 bg-slate-50 rounded-xl text-xs space-y-1">
                        <div className="font-semibold text-slate-700 flex items-center gap-2">
                          <span>Revision Delta:</span>
                          <span className={diff.priceDeltaInr >= 0 ? 'text-emerald-600 font-mono' : 'text-rose-600 font-mono'}>
                            {diff.priceDeltaInr >= 0 ? `+${formatCurrency(diff.priceDeltaInr)}` : formatCurrency(diff.priceDeltaInr)}
                          </span>
                          <span className="text-slate-400">•</span>
                          <span className={diff.marginDeltaPercentage >= 0 ? 'text-emerald-600 font-mono' : 'text-rose-600 font-mono'}>
                            {diff.marginDeltaPercentage >= 0 ? `+${diff.marginDeltaPercentage}%` : `${diff.marginDeltaPercentage}%`} Margin
                          </span>
                        </div>
                        <div className="text-slate-500 text-[11px]">
                          Modified Items: {diff.modifiedLineItemDescriptions.join(', ')}
                        </div>
                      </div>
                    )}

                    {!isActive && (
                      <div className="mt-3 flex justify-end">
                        <button
                          onClick={() => {
                            currentQuote.currentVersionId = ver.versionId;
                            showToast(`Switched active quote to v${ver.versionNumber}`);
                          }}
                          className="px-3 py-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-white border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors"
                        >
                          Switch to this Version
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* VIEW 5: QUOTES LEDGER (TABLE OF ALL QUOTES) */}
        {activeTab === 'LEDGER' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-subtle overflow-hidden space-y-4">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Quotation Ledger ({quotes.length} Quotes)
                </h3>
                <p className="text-xs text-slate-500">
                  Comprehensive listing of all active, draft, delivered and locked quotations
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  ≥12% Auto-Approved
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
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Quote ID</th>
                    <th className="py-3 px-4">Travel Agent</th>
                    <th className="py-3 px-4">Corridor & Tier</th>
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
                    const margin = activeVer?.totalSellingPriceInr > 0 ? (activeVer.grossProfitInr / activeVer.totalSellingPriceInr) * 100 : 0;
                    const isQuoteLocked = quote.status === 'PENDING_APPROVAL';

                    return (
                      <tr 
                        key={quote.id} 
                        className={`hover:bg-slate-50/80 transition-colors ${
                          quote.id === selectedQuoteId ? 'bg-indigo-50/30' : ''
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
                          <div className="text-[11px] text-slate-500">{activeVer?.packageTier}</div>
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
                              margin >= 12 
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : margin >= 8 
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {margin.toFixed(1)}%
                          </span>
                          <div className="text-[10px] text-slate-400 font-sans mt-0.5">
                            Profit: {formatCurrency(activeVer?.grossProfitInr || 0)}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-mono font-bold text-xs">{quote.intentScore}/100</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <StatusBadge status={quote.status} size="sm" />
                          {isQuoteLocked && (
                            <div className="text-[10px] font-bold text-rose-600 mt-1 flex items-center gap-1">
                              <ShieldAlert className="w-3 h-3" /> Approval Locked
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-2">
                          <button
                            onClick={() => {
                              setSelectedQuoteId(quote.id);
                              setActiveTab('WORKBENCH');
                            }}
                            className="px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 border border-indigo-200 rounded-md transition-colors"
                          >
                            Open in Workbench
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* MODAL 1: EDIT LINE ITEM */}
        {editingLineItem && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900">
                  Edit Quote Line Item
                </h3>
                <button onClick={() => setEditingLineItem(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Item Title</label>
                  <input 
                    type="text"
                    value={editingLineItem.title}
                    onChange={(e) => setEditingLineItem({ ...editingLineItem, title: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Units / Nights / Pax</label>
                    <input 
                      type="number"
                      min="1"
                      value={editingLineItem.units}
                      onChange={(e) => setEditingLineItem({ ...editingLineItem, units: parseInt(e.target.value) || 1 })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Unit Net Cost ({editingLineItem.foreignCurrency})</label>
                    <input 
                      type="number"
                      min="0"
                      value={editingLineItem.unitNetCostForeign}
                      onChange={(e) => setEditingLineItem({ ...editingLineItem, unitNetCostForeign: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Notes / Inclusions</label>
                  <textarea 
                    value={editingLineItem.notes || ''}
                    onChange={(e) => setEditingLineItem({ ...editingLineItem, notes: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  onClick={() => setEditingLineItem(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveLineItem}
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm"
                >
                  Save & Recalculate
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 2: ADD NEW LINE ITEM */}
        {isAddingLineItem && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900">
                  Add {isAddingLineItem} to Quote
                </h3>
                <button onClick={() => setIsAddingLineItem(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Title & Description</label>
                  <input 
                    type="text"
                    placeholder={`e.g. ${isAddingLineItem === 'HOTEL' ? '4★ Deluxe Resort Phuket' : isAddingLineItem === 'TRANSFER' ? 'Private SUV Transfer' : 'Phi Phi Island Speedboat Tour'}`}
                    value={newLineItemTitle}
                    onChange={(e) => setNewLineItemTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Units</label>
                    <input 
                      type="number"
                      min="1"
                      value={newLineItemUnits}
                      onChange={(e) => setNewLineItemUnits(parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Currency</label>
                    <select
                      value={newLineItemCurrency}
                      onChange={(e) => setNewLineItemCurrency(e.target.value as any)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono"
                    >
                      <option value="THB">THB</option>
                      <option value="AED">AED</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="INR">INR</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Unit Cost</label>
                    <input 
                      type="number"
                      min="0"
                      value={newLineItemCost}
                      onChange={(e) => setNewLineItemCost(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  onClick={() => setIsAddingLineItem(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddLineItemSubmit}
                  disabled={!newLineItemTitle}
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm disabled:opacity-50"
                >
                  Add Item
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 3: CREATE NEW VERSION */}
        {isVersionModalOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900">
                  Create Quote Version {((activeVersion?.versionNumber || 1) + 1)}
                </h3>
                <button onClick={() => setIsVersionModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <p className="text-slate-600">
                  Creating a new version preserves v{activeVersion?.versionNumber || 1} in audit history and increments the quotation version.
                </p>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Reason for Revision</label>
                  <textarea 
                    value={versionChangeReason}
                    onChange={(e) => setVersionChangeReason(e.target.value)}
                    rows={3}
                    placeholder="e.g. Agent requested 4-star beach resort alternative and removed day 3 private dinner"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  onClick={() => setIsVersionModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateNewVersion}
                  disabled={!versionChangeReason}
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm"
                >
                  Save Version {((activeVersion?.versionNumber || 1) + 1)}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 4: MANAGER 1-CLICK APPROVAL */}
        {isManagerModalOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-amber-600" />
                  <h3 className="text-sm font-bold text-slate-900">
                    Sales Manager Margin Override
                  </h3>
                </div>
                <button onClick={() => setIsManagerModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1">
                <div className="font-bold">
                  Margin Guardrail Triggered: Gross Margin {grossMarginPct.toFixed(1)}% is below 8.0% Floor
                </div>
                <p>
                  Company policy locks quotation dispatch when selling-price gross margin drops below 8.0%. 
                  Manager authorization is required to unlock dispatch to retail agent.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-[10px] text-slate-400 block">Current Selling Price</span>
                  <strong className="text-slate-900 font-mono text-sm">{formatCurrency(sellingPrice)}</strong>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-[10px] text-slate-400 block">Gross Profit</span>
                  <strong className="text-slate-900 font-mono text-sm">{formatCurrency(grossProfit)}</strong>
                </div>
              </div>

              <div className="text-xs text-slate-600">
                Reviewing as <strong>Rajesh Verma (Head of Sales)</strong>. Approving will unlock the quote and allow sales rep Priya Sharma to dispatch it.
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  onClick={() => {
                    rejectManagerOverride(currentQuote.id, 'Counter-offer minimum 8% margin required');
                    setIsManagerModalOpen(false);
                    showToast('Rejected: Enforced 8% margin floor');
                  }}
                  className="px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg"
                >
                  Reject & Enforce 8%
                </button>
                <button
                  onClick={() => {
                    approveManagerOverride(currentQuote.id, 'Manager 1-click strategic discount exception approved');
                    setIsManagerModalOpen(false);
                    showToast('Manager approval granted — Quote unlocked');
                  }}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm"
                >
                  Grant Manager Approval
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 5: DRAFT QUOTE FROM REQUIREMENT */}
        {isNewQuoteModalOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-sm font-bold text-slate-900">
                    Draft New Quote from Requirement
                  </h3>
                </div>
                <button onClick={() => setIsNewQuoteModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Select Confirmed Requirement</label>
                  <select
                    value={selectedReqForNewQuote}
                    onChange={(e) => setSelectedReqForNewQuote(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                  >
                    {requirements.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.id} — {r.contactName} ({r.destinationCorridor} • {r.totalDurationNights}N • {r.status})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Starting Package Tier</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['SAVER', 'CURATED_RECOMMENDED', 'ELITE_LUXURY'] as PackageTier[]).map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setSelectedTierForNewQuote(t)}
                        className={`p-2.5 rounded-xl border text-xs font-semibold text-center transition-all ${
                          selectedTierForNewQuote === t 
                            ? 'bg-indigo-50 border-indigo-600 text-indigo-800 ring-1 ring-indigo-500' 
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        {t === 'SAVER' ? 'Saver (3★)' : t === 'CURATED_RECOMMENDED' ? 'Curated (4-5★)' : 'Luxury (5★)'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  onClick={() => setIsNewQuoteModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const newId = createQuoteForRequirement(selectedReqForNewQuote, selectedTierForNewQuote);
                    setSelectedQuoteId(newId);
                    setIsNewQuoteModalOpen(false);
                    showToast('Draft quote synthesized with 3 package tiers');
                  }}
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm"
                >
                  Generate Quote
                </button>
              </div>
            </div>
          </div>
        )}

      </main>
    </>
  );
}
