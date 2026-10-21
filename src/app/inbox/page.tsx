'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  Copy,
  Phone,
  Mail,
  FileText,
  AlertTriangle,
  ShieldAlert,
  Edit3,
  Save,
  X,
  RotateCcw,
  Plus,
  ExternalLink,
  Calendar,
  Users,
  Hotel,
  Utensils,
  Car,
  Plane,
  DollarSign,
  History,
  Layers,
  CheckCircle2,
  ChevronRight,
  UserCheck,
  Search,
  Filter,
  Compass,
  Clock,
  Award,
  ShieldCheck,
  Info
} from 'lucide-react';
import { 
  TravelRequirement, 
  DestinationCorridor, 
  HotelStarCategory, 
  MealPlan, 
  TransferPreference, 
  FlightPreference,
  Passenger
} from '../../types';
import { extractionService } from '../../services/extractionService';
import { scoreRequirementCompleteness } from '../../domain/completenessEngine';

// 4 Realistic Indian B2B Travel Agent Presets for 1-Click Intake
const PRESET_INQUIRIES = [
  {
    title: '1. Incomplete Thailand (Missing Dates & Child Age)',
    channel: 'WHATSAPP' as const,
    agentId: 'agt_rohit_surat',
    text: 'Hi Priya, pls send Thailand package for client: 2 adults + 1 kid. Need good 4-star hotel and transfers. Budget around 1.1 Lakh total. Pls send fast.',
    scenario: 'Demonstrates low completeness (55%), blocking travel dates deduction (-20 pts), and hotel child policy CWB/CNB ambiguity deduction (-12 pts).',
  },
  {
    title: '2. Dubai Contradictory Pax Conflict (4 Pax vs 5)',
    channel: 'WHATSAPP' as const,
    agentId: 'agt_apex_delhi',
    text: 'Urgent: Please quote for 4 Pax Corporate VIP Dubai 4N 5D, 18-22 Nov. Wait, actually it is 2 couples and one child (6 yrs) also joining now. Quote 4 Pax in 2 twin rooms with Voco on SZR + Desert Safari VIP + flights ex-DEL.',
    scenario: 'Demonstrates critical conflict detection: stated "4 Pax" vs detailed traveler breakdown summing to 5 travelers (4 adults + 1 child), flagging room/extra bed risks.',
  },
  {
    title: '3. Bali Luxury Honeymoon Phone Call Notes (Jain Meals)',
    channel: 'PHONE_CALL_NOTES' as const,
    agentId: 'agt_skylink_mumbai',
    text: 'Call notes with Neha Merchant (Skylink Mumbai): VIP Honeymoon couple traveling to Bali 6N around 25 Nov. Requirements: 3N Private Pool Villa in Ubud (The Kayon or similar) + 3N 5-star beachfront Seminyak (W Bali preferred). Private luxury transfers, Nusa Penida island speedboat. Strictly Pure Jain/Veg breakfast options needed for wife. Budget 2.5L total ex-BOM.',
    scenario: 'Demonstrates high completeness (94%), dietary restriction extraction (Pure Jain/Veg), honeymoon split itinerary, and inferred bed preferences.',
  },
  {
    title: '4. Vietnam Forwarded RFP Email (Da Nang + Hoi An)',
    channel: 'EMAIL' as const,
    agentId: 'agt_royal_bangalore',
    text: 'FW: B2B RFP - Central Vietnam 5 Nights\nClient: 2 Adults traveling mid-Dec 2026. Route: Da Nang (3N) + Hoi An (2N). 4-star boutique beach resort, private airport & Ba Na Hills transfers, Ba Na Hills SunWorld Golden Bridge cable car pass. Land only, client booking own flights ex-BLR. Budget ~₹1.6 Lakh.',
    scenario: 'Demonstrates email channel parsing, Land-Only flight preference, split city detection, and activity extraction.',
  },
];

export default function InboxPage() {
  const router = useRouter();
  const { requirements, agents, addRequirement, editRequirement, resolveConflict } = useData();

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [channelFilter, setChannelFilter] = useState<'ALL' | 'WHATSAPP' | 'EMAIL' | 'PHONE_CALL_NOTES'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'CLARIFICATION_PENDING' | 'CONFLICTS' | 'PARSED_READY'>('ALL');

  // Selected Requirement
  const [selectedReqId, setSelectedReqId] = useState<string>(requirements[0]?.id || '');
  const selectedReq = requirements.find(r => r.id === selectedReqId) || requirements[0];

  // Detail Inspector Tab
  const [inspectorTab, setInspectorTab] = useState<'PARAMETERS' | 'CLARIFICATION' | 'ASSUMPTIONS' | 'AUDIT_LOG'>('PARAMETERS');

  // Inline Edit Mode
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<{
    destinationCorridor: DestinationCorridor;
    tentativeTravelDate: string;
    flexibilityDays: number;
    totalDurationNights: number;
    adultCount: number;
    childCount: number;
    childAge: number;
    hotelCategoryRequested: HotelStarCategory;
    mealPlanRequested: MealPlan;
    transferPreference: TransferPreference;
    flightPreference: FlightPreference;
    departureAirport: string;
    budgetInrMax: string;
    editReason: string;
  }>({
    destinationCorridor: 'THAILAND',
    tentativeTravelDate: '',
    flexibilityDays: 2,
    totalDurationNights: 5,
    adultCount: 2,
    childCount: 0,
    childAge: 7,
    hotelCategoryRequested: '4_STAR_DELUXE',
    mealPlanRequested: 'BED_AND_BREAKFAST',
    transferPreference: 'PRIVATE',
    flightPreference: 'INCLUDE_FLIGHTS',
    departureAirport: 'BOM',
    budgetInrMax: '',
    editReason: '',
  });

  // Modal State for New Inbound Inquiry
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<'PRESETS' | 'PASTE_AI' | 'MANUAL'>('PRESETS');
  const [customText, setCustomText] = useState('');
  const [customChannel, setCustomChannel] = useState<TravelRequirement['sourceChannel']>('WHATSAPP');
  const [customAgentId, setCustomAgentId] = useState(agents[0]?.id || 'agt_rohit_surat');
  const [isParsing, setIsParsing] = useState(false);

  // Resolution modal state
  const [resolvingConflict, setResolvingConflict] = useState<string | null>(null);
  const [conflictResolutionNotes, setConflictResolutionNotes] = useState('Confirmed 4 adults only, child traveling separately.');

  // Toast notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedQuestion, setCopiedQuestion] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Populate edit form when toggling edit mode or switching requirement
  const startEditing = () => {
    if (!selectedReq) return;
    const adults = selectedReq.passengers.filter(p => p.type === 'ADULT').length;
    const children = selectedReq.passengers.filter(p => p.type === 'CHILD').length;
    const firstChild = selectedReq.passengers.find(p => p.type === 'CHILD');

    setEditForm({
      destinationCorridor: selectedReq.destinationCorridor,
      tentativeTravelDate: selectedReq.tentativeTravelDate || '2026-11-15',
      flexibilityDays: selectedReq.flexibilityDays,
      totalDurationNights: selectedReq.totalDurationNights,
      adultCount: adults || 2,
      childCount: children || 0,
      childAge: firstChild?.age || 7,
      hotelCategoryRequested: selectedReq.hotelCategoryRequested,
      mealPlanRequested: selectedReq.mealPlanRequested,
      transferPreference: selectedReq.transferPreference,
      flightPreference: selectedReq.flightPreference,
      departureAirport: selectedReq.departureAirport || 'BOM',
      budgetInrMax: selectedReq.budgetInrMax ? String(selectedReq.budgetInrMax) : '',
      editReason: '',
    });
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    if (!selectedReq) return;

    // Assemble new passengers
    const newPassengers: Passenger[] = [];
    for (let i = 0; i < editForm.adultCount; i++) {
      newPassengers.push({
        id: `p_a_${i + 1}`,
        type: 'ADULT',
        age: 32,
        bedPreference: editForm.adultCount === 2 ? 'DOUBLE' : 'TWIN',
      });
    }
    for (let i = 0; i < editForm.childCount; i++) {
      newPassengers.push({
        id: `p_c_${i + 1}`,
        type: 'CHILD',
        age: editForm.childAge,
        bedPreference: editForm.childAge >= 6 ? 'EXTRA_BED_CWB' : 'NO_BED_CNB',
      });
    }

    const updatedFields: Partial<TravelRequirement> = {
      destinationCorridor: editForm.destinationCorridor,
      tentativeTravelDate: editForm.tentativeTravelDate,
      flexibilityDays: editForm.flexibilityDays,
      totalDurationNights: editForm.totalDurationNights,
      passengers: newPassengers,
      hotelCategoryRequested: editForm.hotelCategoryRequested,
      mealPlanRequested: editForm.mealPlanRequested,
      transferPreference: editForm.transferPreference,
      flightPreference: editForm.flightPreference,
      departureAirport: editForm.departureAirport || undefined,
      budgetInrMax: editForm.budgetInrMax ? parseInt(editForm.budgetInrMax, 10) : undefined,
    };

    editRequirement(
      selectedReq.id,
      updatedFields,
      editForm.editReason || 'Sales executive manual confirmation with agent'
    );

    setIsEditing(false);
    triggerToast('✓ Structured parameters confirmed & completeness score updated');
  };

  const handleResolveConflict = (conflictId: string) => {
    if (!selectedReq) return;
    resolveConflict(selectedReq.id, conflictId, conflictResolutionNotes);
    setResolvingConflict(null);
    triggerToast('✓ Conflict resolved and audit log updated');
  };

  // Run AI extraction on custom pasted text
  const handleRunAiExtraction = async (text: string, channel: TravelRequirement['sourceChannel'], agentId: string) => {
    if (!text.trim()) return;
    setIsParsing(true);
    try {
      const newReq = await extractionService.parseRequirement(text, agentId, channel);
      addRequirement(newReq);
      setSelectedReqId(newReq.id);
      setIsNewModalOpen(false);
      setCustomText('');
      triggerToast('✓ New requirement parsed by Heuristic NLP Engine');
    } catch (e) {
      console.error(e);
      triggerToast('Error parsing inquiry');
    } finally {
      setIsParsing(false);
    }
  };

  // Filtered requirements
  const filteredRequirements = useMemo(() => {
    return requirements.filter(req => {
      const agent = agents.find(a => a.id === req.agentId);
      const matchesSearch = 
        !searchQuery ||
        req.rawInquiryText.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.destinationCorridor.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent?.agencyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent?.contactPerson.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent?.city.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesChannel = channelFilter === 'ALL' || req.sourceChannel === channelFilter;

      let matchesStatus = true;
      if (statusFilter === 'CLARIFICATION_PENDING') {
        matchesStatus = req.status === 'CLARIFICATION_PENDING' || req.completenessScore < 70;
      } else if (statusFilter === 'CONFLICTS') {
        matchesStatus = req.conflictFlags.length > 0;
      } else if (statusFilter === 'PARSED_READY') {
        matchesStatus = req.status === 'PARSED_READY' || req.completenessScore >= 80;
      }

      return matchesSearch && matchesChannel && matchesStatus;
    });
  }, [requirements, agents, searchQuery, channelFilter, statusFilter]);

  const currentAgent = agents.find(a => a.id === selectedReq?.agentId);

  // Completeness score breakdown for currently selected req
  const currentCompletenessDetails = useMemo(() => {
    if (!selectedReq) return null;
    return scoreRequirementCompleteness({
      destinationCorridor: selectedReq.destinationCorridor,
      tentativeTravelDate: selectedReq.tentativeTravelDate,
      totalDurationNights: selectedReq.totalDurationNights,
      passengers: selectedReq.passengers,
      flightPreference: selectedReq.flightPreference,
      departureAirport: selectedReq.departureAirport,
      mealPlanRequested: selectedReq.mealPlanRequested,
    });
  }, [selectedReq]);

  return (
    <>
      <Header 
        title="Requirement Inbox & Intelligence Intake" 
        subtitle="Unstructured natural language extraction, ambiguity diagnostics, and conflict detection"
      />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs px-4 py-3 rounded-lg shadow-xl border border-slate-700 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      <main className="p-8 max-w-[1700px] mx-auto w-full space-y-6">
        {/* Top Control Bar: Engine Transparency & Action Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-xl border border-slate-200/80 p-4 shadow-subtle">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900">Deterministic NLP Extraction Engine</span>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  Zero External API Credentials Needed
                </span>
                <span className="text-[10px] text-slate-500 font-mono bg-slate-100 px-2 py-0.5 rounded">
                  Rule-Based NLP Fallback Active
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Simulated AI extraction with 100% transparent scoring rules, assumption isolation, and explicit conflict flagging.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setModalTab('PRESETS');
                setIsNewModalOpen(true);
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-2 transition-all active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ New Inbound Requirement</span>
            </button>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-3 shadow-subtle flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search agent, agency, corridor, keyword..."
              className="w-full text-xs pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-sans"
            />
          </div>

          {/* Channel Filters */}
          <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            <span className="text-[11px] font-bold text-slate-400 mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Channel:
            </span>
            {(['ALL', 'WHATSAPP', 'EMAIL', 'PHONE_CALL_NOTES'] as const).map(channel => (
              <button
                key={channel}
                onClick={() => setChannelFilter(channel)}
                className={`text-[11px] font-semibold px-2.5 py-1 rounded-md transition-all shrink-0 ${
                  channelFilter === channel 
                    ? 'bg-slate-900 text-white' 
                    : 'text-slate-600 hover:bg-slate-100 bg-slate-50 border border-slate-200'
                }`}
              >
                {channel === 'ALL' ? 'All Channels' : channel === 'PHONE_CALL_NOTES' ? 'Phone Notes' : channel}
              </button>
            ))}
          </div>

          {/* Status Filters */}
          <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            <span className="text-[11px] font-bold text-slate-400 mr-1">Status:</span>
            {(['ALL', 'CLARIFICATION_PENDING', 'CONFLICTS', 'PARSED_READY'] as const).map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`text-[11px] font-semibold px-2.5 py-1 rounded-md transition-all shrink-0 ${
                  statusFilter === st 
                    ? 'bg-indigo-600 text-white' 
                    : 'text-slate-600 hover:bg-slate-100 bg-slate-50 border border-slate-200'
                }`}
              >
                {st === 'ALL' ? 'All Statuses' : st === 'CLARIFICATION_PENDING' ? 'Clarification' : st === 'CONFLICTS' ? '⚠️ Conflicts' : 'Ready to Quote'}
              </button>
            ))}
          </div>
        </div>

        {/* Two Column Layout: Inbox List & Detail Inspector */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Inbound Inquiries List (5 Cols) */}
          <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200/80 shadow-subtle overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Inbox className="w-4 h-4 text-slate-600" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Inbound Inquiries ({filteredRequirements.length})
                </h2>
              </div>
              <span className="text-[11px] text-slate-500 font-medium">Sorted by Priority & Recency</span>
            </div>

            <div className="divide-y divide-slate-100 max-h-[820px] overflow-y-auto">
              {filteredRequirements.length === 0 ? (
                <div className="p-10 text-center text-slate-400 text-xs">
                  No inquiries match the active search or filters.
                </div>
              ) : (
                filteredRequirements.map((req) => {
                  const isSelected = selectedReq?.id === req.id;
                  const agent = agents.find(a => a.id === req.agentId);
                  const hasConflict = req.conflictFlags && req.conflictFlags.length > 0;
                  const adultCount = req.passengers.filter(p => p.type === 'ADULT').length;
                  const childCount = req.passengers.filter(p => p.type === 'CHILD').length;

                  return (
                    <div
                      key={req.id}
                      onClick={() => {
                        setSelectedReqId(req.id);
                        setIsEditing(false);
                      }}
                      className={`p-4 cursor-pointer transition-all ${
                        isSelected 
                          ? 'bg-indigo-50/60 border-l-4 border-indigo-600 ring-1 ring-inset ring-indigo-500/10' 
                          : 'hover:bg-slate-50/80 border-l-4 border-transparent'
                      }`}
                    >
                      {/* Top Row: Channel Icon, Agency Name, Priority Badge */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {req.sourceChannel === 'WHATSAPP' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded border border-emerald-300">
                              <MessageSquare className="w-3 h-3 text-emerald-600" /> WhatsApp
                            </span>
                          )}
                          {req.sourceChannel === 'EMAIL' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-sky-700 bg-sky-100/80 px-2 py-0.5 rounded border border-sky-300">
                              <Mail className="w-3 h-3 text-sky-600" /> Email
                            </span>
                          )}
                          {req.sourceChannel === 'PHONE_CALL_NOTES' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-700 bg-purple-100/80 px-2 py-0.5 rounded border border-purple-300">
                              <Phone className="w-3 h-3 text-purple-600" /> Call Notes
                            </span>
                          )}

                          <span className="text-xs font-bold text-slate-900 truncate max-w-[180px]">
                            {agent?.agencyName}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {req.priority === 'CRITICAL' && (
                            <span className="text-[10px] font-bold text-red-700 bg-red-100 px-1.5 py-0.5 rounded border border-red-200">
                              CRITICAL
                            </span>
                          )}
                          {req.priority === 'HIGH' && (
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-200">
                              HIGH
                            </span>
                          )}
                          <StatusBadge status={req.status} size="sm" />
                        </div>
                      </div>

                      {/* Corridor & Operational Snapshot */}
                      <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-slate-800">
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-bold">
                          {req.destinationCorridor}
                        </span>
                        <span>•</span>
                        <span>{req.totalDurationNights}N</span>
                        <span>•</span>
                        <span>{adultCount}A {childCount > 0 ? `+ ${childCount}C` : ''}</span>
                        <span>•</span>
                        <span className="text-slate-600 font-normal">{req.hotelCategoryRequested.replace(/_/g, ' ')}</span>
                      </div>

                      {/* Snippet of raw inquiry text */}
                      <p className="text-[11px] text-slate-600 line-clamp-2 mb-2 font-mono bg-slate-50/80 p-1.5 rounded border border-slate-100">
                        &ldquo;{req.rawInquiryText}&rdquo;
                      </p>

                      {/* Conflict Flag Pill if any */}
                      {hasConflict && (
                        <div className="mb-2 p-1.5 rounded bg-red-50 border border-red-200 text-red-800 text-[11px] flex items-center gap-1.5 font-medium">
                          <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                          <span className="truncate">{req.conflictFlags[0].description}</span>
                        </div>
                      )}

                      {/* Completeness Bar & Timestamp */}
                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${
                                req.completenessScore >= 80 
                                  ? 'bg-emerald-500' 
                                  : req.completenessScore >= 60 
                                  ? 'bg-amber-500' 
                                  : 'bg-red-500'
                              }`}
                              style={{ width: `${req.completenessScore}%` }}
                            />
                          </div>
                          <span className={`font-bold ${
                            req.completenessScore >= 80 ? 'text-emerald-700' : req.completenessScore >= 60 ? 'text-amber-700' : 'text-red-700'
                          }`}>
                            {req.completenessScore}% Complete
                          </span>
                        </div>

                        <span className="text-[10px] text-slate-400">
                          {req.budgetInrMax ? `Budget: ₹${(req.budgetInrMax / 100000).toFixed(1)}L` : 'Budget: Open'}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right: Extracted Intelligence Detail Inspector (7 Cols) */}
          <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200/80 shadow-subtle overflow-hidden">
            {selectedReq ? (
              <div>
                {/* Inspector Header Banner */}
                <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-indigo-50/30">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-100 px-2.5 py-0.5 rounded-full border border-indigo-200">
                          {selectedReq.destinationCorridor} CORRIDOR
                        </span>
                        <StatusBadge status={selectedReq.status} size="sm" />
                        {selectedReq.conflictFlags.length > 0 && (
                          <span className="text-[10px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full border border-red-200 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-red-600" />
                            {selectedReq.conflictFlags.length} Conflict Active
                          </span>
                        )}
                      </div>

                      <h3 className="text-lg font-bold text-slate-900">
                        {currentAgent?.agencyName}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Agent: <strong className="text-slate-800">{currentAgent?.contactPerson}</strong> ({currentAgent?.city}, {currentAgent?.state}) • Tier: <span className="font-semibold text-indigo-600">{currentAgent?.tier}</span> • Credit: ₹{((currentAgent?.creditLimitInr || 0)/100000).toFixed(1)}L
                      </p>
                    </div>

                    {/* Actions: Open in Workbench / Edit */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          if (isEditing) {
                            handleSaveEdit();
                          } else {
                            startEditing();
                          }
                        }}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg border flex items-center gap-1.5 transition-all ${
                          isEditing 
                            ? 'bg-emerald-600 text-white hover:bg-emerald-700 border-emerald-600 shadow-sm' 
                            : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
                        }`}
                      >
                        {isEditing ? (
                          <>
                            <Save className="w-3.5 h-3.5" />
                            <span>Save & Confirm</span>
                          </>
                        ) : (
                          <>
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit Parameters</span>
                          </>
                        )}
                      </button>

                      <Link
                        href={`/quotes?reqId=${selectedReq.id}`}
                        className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition-all active:scale-95"
                      >
                        <span>Open in Workbench</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>

                  {/* Operational Snapshot Ribbon */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-200/60 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">Source Channel</span>
                      <strong className="text-slate-800">{selectedReq.sourceChannel}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">Dates & Duration</span>
                      <strong className="text-slate-800">
                        {selectedReq.tentativeTravelDate ? `${selectedReq.tentativeTravelDate} (${selectedReq.totalDurationNights}N)` : 'Unspecified Date'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">Headcount</span>
                      <strong className="text-slate-800">
                        {selectedReq.passengers.length} Pax ({selectedReq.passengers.filter(p => p.type === 'ADULT').length}A, {selectedReq.passengers.filter(p => p.type === 'CHILD').length}C)
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">Completeness</span>
                      <strong className={`font-bold ${
                        selectedReq.completenessScore >= 80 ? 'text-emerald-600' : selectedReq.completenessScore >= 60 ? 'text-amber-600' : 'text-red-600'
                      }`}>
                        {selectedReq.completenessScore}% {selectedReq.completenessScore >= 80 ? '(Ready)' : '(Incomplete)'}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex border-b border-slate-200 px-6 bg-white overflow-x-auto">
                  <button
                    onClick={() => setInspectorTab('PARAMETERS')}
                    className={`py-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
                      inspectorTab === 'PARAMETERS' 
                        ? 'border-indigo-600 text-indigo-600' 
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Extracted Parameters</span>
                    {isEditing && (
                      <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded font-semibold">
                        Editing
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => setInspectorTab('CLARIFICATION')}
                    className={`py-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
                      inspectorTab === 'CLARIFICATION' 
                        ? 'border-indigo-600 text-indigo-600' 
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>Clarification Loop</span>
                    {selectedReq.missingFields.length > 0 && (
                      <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded font-semibold">
                        {selectedReq.missingFields.length} Missing
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => setInspectorTab('ASSUMPTIONS')}
                    className={`py-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
                      inspectorTab === 'ASSUMPTIONS' 
                        ? 'border-indigo-600 text-indigo-600' 
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Assumptions & Conflicts</span>
                    {selectedReq.conflictFlags.length > 0 && (
                      <span className="text-[10px] bg-red-100 text-red-800 px-1.5 py-0.2 rounded font-semibold">
                        {selectedReq.conflictFlags.length} Conflict
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => setInspectorTab('AUDIT_LOG')}
                    className={`py-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
                      inspectorTab === 'AUDIT_LOG' 
                        ? 'border-indigo-600 text-indigo-600' 
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>Audit History ({selectedReq.editHistory?.length || 0})</span>
                  </button>
                </div>

                {/* Tab Content Area */}
                <div className="p-6 space-y-6">
                  {/* TAB 1: EXTRACTED PARAMETERS */}
                  {inspectorTab === 'PARAMETERS' && (
                    <div className="space-y-6">
                      {/* Original Inviolate Message Box */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-slate-400" />
                            Original Verbatim Inquiry (Inviolate)
                          </label>
                          <span className="text-[10px] text-slate-400">
                            Preserved verbatim across sales edits
                          </span>
                        </div>
                        <div className="p-3.5 bg-slate-900 rounded-lg text-emerald-400 font-mono text-xs leading-relaxed border border-slate-800 shadow-inner">
                          {selectedReq.rawInquiryText}
                        </div>
                      </div>

                      {/* View Mode vs Edit Mode */}
                      {!isEditing ? (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                              Normalized Operational Parameters
                            </h4>
                            <button
                              onClick={startEditing}
                              className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>Edit Parameters</span>
                            </button>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                            <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/60">
                              <span className="text-slate-400 text-[10px] font-bold block uppercase">Destination Corridor</span>
                              <strong className="text-slate-900">{selectedReq.destinationCorridor}</strong>
                              <span className="text-[11px] text-slate-500 block mt-0.5">
                                {selectedReq.cities.map(c => `${c.cityName} (${c.nights}N)`).join(' + ')}
                              </span>
                            </div>

                            <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/60">
                              <span className="text-slate-400 text-[10px] font-bold block uppercase">Travel Dates</span>
                              <strong className="text-slate-900">
                                {selectedReq.tentativeTravelDate || 'Unspecified (Tentative Nov 2026)'}
                              </strong>
                              <span className="text-[11px] text-slate-500 block mt-0.5">
                                Flexibility: ±{selectedReq.flexibilityDays} days
                              </span>
                            </div>

                            <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/60">
                              <span className="text-slate-400 text-[10px] font-bold block uppercase">Passengers</span>
                              <strong className="text-slate-900">
                                {selectedReq.passengers.length} Total Travelers
                              </strong>
                              <span className="text-[11px] text-slate-500 block mt-0.5">
                                {selectedReq.passengers.filter(p => p.type === 'ADULT').length} Adults, {selectedReq.passengers.filter(p => p.type === 'CHILD').length} Children
                                {selectedReq.passengers.some(p => p.type === 'CHILD') && ` (Age: ${selectedReq.passengers.find(p => p.type === 'CHILD')?.age || 'Unstated'})`}
                              </span>
                            </div>

                            <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/60">
                              <span className="text-slate-400 text-[10px] font-bold block uppercase">Hotel Standard</span>
                              <strong className="text-slate-900">{selectedReq.hotelCategoryRequested.replace(/_/g, ' ')}</strong>
                              <span className="text-[11px] text-slate-500 block mt-0.5">
                                Meal: {selectedReq.mealPlanRequested.replace(/_/g, ' ')}
                              </span>
                            </div>

                            <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/60">
                              <span className="text-slate-400 text-[10px] font-bold block uppercase">Transfers & Flights</span>
                              <strong className="text-slate-900">
                                {selectedReq.transferPreference} Transfers
                              </strong>
                              <span className="text-[11px] text-slate-500 block mt-0.5">
                                {selectedReq.flightPreference} {selectedReq.departureAirport ? `(ex-${selectedReq.departureAirport})` : ''}
                              </span>
                            </div>

                            <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/60">
                              <span className="text-slate-400 text-[10px] font-bold block uppercase">Budget Ceiling</span>
                              <strong className="text-slate-900">
                                {selectedReq.budgetInrMax ? `₹${selectedReq.budgetInrMax.toLocaleString('en-IN')}` : 'Flexible / No Cap'}
                              </strong>
                              <span className="text-[11px] text-slate-500 block mt-0.5">
                                {selectedReq.preferences.specialOccasion !== 'NONE' ? `Occasion: ${selectedReq.preferences.specialOccasion}` : 'Standard Leisure'}
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* Inline Edit Form for Sales Rep */
                        <div className="p-5 rounded-xl border border-indigo-200 bg-indigo-50/30 space-y-4">
                          <div className="flex items-center justify-between pb-3 border-b border-indigo-100">
                            <div>
                              <h4 className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                                <Edit3 className="w-4 h-4 text-indigo-600" />
                                Sales Executive Parameter Confirmation
                              </h4>
                              <p className="text-[11px] text-slate-500">
                                Confirming these fields logs an audit event and recalculates the completeness score.
                              </p>
                            </div>
                            <button
                              onClick={() => setIsEditing(false)}
                              className="text-xs text-slate-500 hover:text-slate-700 font-semibold"
                            >
                              Cancel
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 mb-1">Destination Corridor</label>
                              <select
                                value={editForm.destinationCorridor}
                                onChange={(e) => setEditForm(prev => ({ ...prev, destinationCorridor: e.target.value as DestinationCorridor }))}
                                className="w-full p-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500"
                              >
                                <option value="THAILAND">Thailand</option>
                                <option value="DUBAI">Dubai</option>
                                <option value="BALI">Bali</option>
                                <option value="VIETNAM">Vietnam</option>
                                <option value="MALDIVES">Maldives</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 mb-1">Tentative Travel Date</label>
                              <input
                                type="date"
                                value={editForm.tentativeTravelDate}
                                onChange={(e) => setEditForm(prev => ({ ...prev, tentativeTravelDate: e.target.value }))}
                                className="w-full p-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500"
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 mb-1">Total Duration (Nights)</label>
                              <input
                                type="number"
                                min={1}
                                max={30}
                                value={editForm.totalDurationNights}
                                onChange={(e) => setEditForm(prev => ({ ...prev, totalDurationNights: parseInt(e.target.value, 10) || 5 }))}
                                className="w-full p-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500"
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 mb-1">Adult Count</label>
                              <input
                                type="number"
                                min={1}
                                max={20}
                                value={editForm.adultCount}
                                onChange={(e) => setEditForm(prev => ({ ...prev, adultCount: parseInt(e.target.value, 10) || 2 }))}
                                className="w-full p-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500"
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 mb-1">Child Count</label>
                              <input
                                type="number"
                                min={0}
                                max={10}
                                value={editForm.childCount}
                                onChange={(e) => setEditForm(prev => ({ ...prev, childCount: parseInt(e.target.value, 10) || 0 }))}
                                className="w-full p-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500"
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 mb-1">Child Age (for hotel extra bed)</label>
                              <input
                                type="number"
                                min={0}
                                max={17}
                                value={editForm.childAge}
                                onChange={(e) => setEditForm(prev => ({ ...prev, childAge: parseInt(e.target.value, 10) || 0 }))}
                                className="w-full p-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500"
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 mb-1">Hotel Category</label>
                              <select
                                value={editForm.hotelCategoryRequested}
                                onChange={(e) => setEditForm(prev => ({ ...prev, hotelCategoryRequested: e.target.value as HotelStarCategory }))}
                                className="w-full p-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500"
                              >
                                <option value="3_STAR">3 Star Standard</option>
                                <option value="4_STAR_DELUXE">4 Star Deluxe</option>
                                <option value="5_STAR_LUXURY">5 Star Luxury</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 mb-1">Meal Plan</label>
                              <select
                                value={editForm.mealPlanRequested}
                                onChange={(e) => setEditForm(prev => ({ ...prev, mealPlanRequested: e.target.value as MealPlan }))}
                                className="w-full p-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500"
                              >
                                <option value="ROOM_ONLY">Room Only (EP)</option>
                                <option value="BED_AND_BREAKFAST">Bed & Breakfast (CP)</option>
                                <option value="HALF_BOARD">Half Board (MAP - Breakfast + Dinner)</option>
                                <option value="FULL_BOARD">Full Board (AP)</option>
                                <option value="ALL_INCLUSIVE">All Inclusive</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 mb-1">Transfer Preference</label>
                              <select
                                value={editForm.transferPreference}
                                onChange={(e) => setEditForm(prev => ({ ...prev, transferPreference: e.target.value as TransferPreference }))}
                                className="w-full p-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500"
                              >
                                <option value="PRIVATE">Private Transfers</option>
                                <option value="SHARED_SIC">Shared SIC Transfers</option>
                                <option value="NO_TRANSFERS">No Transfers (Self Drive / Direct)</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 mb-1">Flight Preference</label>
                              <select
                                value={editForm.flightPreference}
                                onChange={(e) => setEditForm(prev => ({ ...prev, flightPreference: e.target.value as FlightPreference }))}
                                className="w-full p-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500"
                              >
                                <option value="INCLUDE_FLIGHTS">Include Flights</option>
                                <option value="LAND_ONLY">Land Only (No Flights)</option>
                                <option value="QUOTE_BOTH">Quote Both Options</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 mb-1">Departure City (Airport)</label>
                              <select
                                value={editForm.departureAirport}
                                onChange={(e) => setEditForm(prev => ({ ...prev, departureAirport: e.target.value }))}
                                className="w-full p-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500"
                              >
                                <option value="BOM">Mumbai (BOM)</option>
                                <option value="DEL">Delhi (DEL)</option>
                                <option value="BLR">Bangalore (BLR)</option>
                                <option value="AMD">Ahmedabad (AMD)</option>
                                <option value="MAA">Chennai (MAA)</option>
                                <option value="HYD">Hyderabad (HYD)</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 mb-1">Max Budget (INR)</label>
                              <input
                                type="number"
                                step={5000}
                                placeholder="e.g. 150000"
                                value={editForm.budgetInrMax}
                                onChange={(e) => setEditForm(prev => ({ ...prev, budgetInrMax: e.target.value }))}
                                className="w-full p-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              Confirmation Notes / Edit Reason (Recorded in Audit Trail)
                            </label>
                            <input
                              type="text"
                              value={editForm.editReason}
                              onChange={(e) => setEditForm(prev => ({ ...prev, editReason: e.target.value }))}
                              placeholder="e.g., 'Confirmed dates are Nov 18-23 via WhatsApp; child is 7yo requiring Extra Bed CWB.'"
                              className="w-full p-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>

                          <div className="flex justify-end gap-2 pt-2">
                            <button
                              onClick={() => setIsEditing(false)}
                              className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleSaveEdit}
                              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition-all"
                            >
                              <Save className="w-3.5 h-3.5" />
                              <span>Save Changes & Log Audit</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 2: AMBIGUITY & CLARIFICATION LOOP */}
                  {inspectorTab === 'CLARIFICATION' && (
                    <div className="space-y-6">
                      {/* Transparent Completeness Deduction Breakdown */}
                      <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            <Award className="w-4 h-4 text-indigo-600" />
                            Transparent Completeness Scoring Engine (100-Point Rule Base)
                          </h4>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            selectedReq.completenessScore >= 80 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            Current Score: {selectedReq.completenessScore}/100
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-500">
                          Scores are not arbitrarily assigned. Every deduction corresponds to a missing operational parameter that would cause pricing errors, tariff misapplication, or hotel check-in friction.
                        </p>

                        {/* Deductions List */}
                        {currentCompletenessDetails && currentCompletenessDetails.deductions.length > 0 ? (
                          <div className="space-y-2 pt-1">
                            {currentCompletenessDetails.deductions.map((d, i) => (
                              <div key={i} className="p-3 bg-white rounded-lg border border-slate-200 text-xs flex items-start justify-between gap-3 shadow-subtle">
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-2">
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                      d.severity === 'BLOCKING' 
                                        ? 'bg-red-100 text-red-700 border border-red-200' 
                                        : 'bg-amber-100 text-amber-700 border border-amber-200'
                                    }`}>
                                      {d.severity}
                                    </span>
                                    <strong className="text-slate-900 font-mono text-[11px]">{d.fieldKey}</strong>
                                  </div>
                                  <p className="text-slate-600 text-[11px]">{d.reason}</p>
                                </div>
                                <span className="text-red-600 font-bold text-xs shrink-0 bg-red-50 px-2 py-1 rounded">
                                  -{d.pointsDeducted} pts
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>No points deducted! All critical operational parameters are locked.</span>
                          </div>
                        )}
                      </div>

                      {/* Smallest Useful Set of Clarification Prompts */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                            <HelpCircle className="w-4 h-4 text-amber-600" />
                            Targeted Agent Clarification Prompts
                          </h4>
                          <span className="text-[11px] text-slate-500">
                            Pre-formatted for 1-click WhatsApp copy
                          </span>
                        </div>

                        {selectedReq.clarificationQuestions.length > 0 ? (
                          <div className="space-y-2.5">
                            {selectedReq.clarificationQuestions.map((q, idx) => (
                              <div 
                                key={idx} 
                                className="p-3.5 bg-white rounded-lg border border-amber-200/80 hover:border-amber-300 text-xs flex items-center justify-between gap-3 shadow-subtle transition-all"
                              >
                                <div className="flex items-start gap-2.5">
                                  <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                                    {idx + 1}
                                  </span>
                                  <p className="text-slate-800 font-medium">
                                    &ldquo;{q}&rdquo;
                                  </p>
                                </div>

                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(q);
                                    setCopiedQuestion(q);
                                    setTimeout(() => setCopiedQuestion(null), 2000);
                                    triggerToast('Copied clarification prompt to clipboard');
                                  }}
                                  className="px-2.5 py-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded border border-indigo-200 shrink-0 flex items-center gap-1 transition-all"
                                >
                                  {copiedQuestion === q ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                  <span>{copiedQuestion === q ? 'Copied' : 'Copy'}</span>
                                </button>
                              </div>
                            ))}

                            {/* Composite WhatsApp Message Copy */}
                            <div className="mt-4 p-4 rounded-xl border border-indigo-200 bg-indigo-50/50 flex items-center justify-between">
                              <div>
                                <span className="text-xs font-bold text-indigo-900 block">
                                  Copy Combined WhatsApp Message
                                </span>
                                <span className="text-[11px] text-slate-500">
                                  Includes friendly salutation, all clarification points, and sales rep signature.
                                </span>
                              </div>
                              <button
                                onClick={() => {
                                  const text = `Hi ${currentAgent?.contactPerson || 'Partner'}! Priya here from QuoteFlow Reservations.\n\nQuick check to draft your ${selectedReq.destinationCorridor} package:\n` +
                                    selectedReq.clarificationQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n') +
                                    `\n\nOnce confirmed, I will send across the instant DMC quote with locked rates!`;
                                  navigator.clipboard.writeText(text);
                                  triggerToast('✓ Combined WhatsApp message copied to clipboard');
                                }}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 shrink-0 transition-all"
                              >
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copy Full Message</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/60 text-xs text-emerald-800 flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>No clarification required. All information is complete for pricing!</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* TAB 3: ASSUMPTIONS & CONFLICTS */}
                  {inspectorTab === 'ASSUMPTIONS' && (
                    <div className="space-y-6">
                      {/* Active Conflicts Section */}
                      {selectedReq.conflictFlags.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-red-700 flex items-center gap-1.5">
                            <AlertTriangle className="w-4 h-4 text-red-600" />
                            Detected Ambiguities & Conflicting Inputs
                          </h4>

                          <div className="space-y-3">
                            {selectedReq.conflictFlags.map((conf) => (
                              <div key={conf.id} className="p-4 rounded-xl border border-red-200 bg-red-50/60 space-y-3">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <span className="text-[10px] font-bold uppercase bg-red-200 text-red-900 px-2 py-0.5 rounded">
                                      {conf.category.replace(/_/g, ' ')}
                                    </span>
                                    <p className="text-xs font-bold text-red-950 mt-1">
                                      {conf.description}
                                    </p>
                                  </div>
                                  <button
                                    onClick={() => setResolvingConflict(conf.id)}
                                    className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded shadow-sm shrink-0 transition-all"
                                  >
                                    Resolve Conflict
                                  </button>
                                </div>

                                <div className="p-2.5 bg-white rounded border border-red-200 text-[11px] font-mono text-slate-700">
                                  <span className="text-slate-400 block text-[10px] uppercase font-sans font-bold">Conflicting Snippets:</span>
                                  {conf.conflictingSnippets.map((snip, i) => (
                                    <div key={i} className="text-red-700 font-semibold">• &ldquo;{snip}&rdquo;</div>
                                  ))}
                                </div>

                                {/* Modal for Resolving Conflict */}
                                {resolvingConflict === conf.id && (
                                  <div className="p-3 bg-white rounded-lg border border-red-300 space-y-2 mt-2">
                                    <label className="text-[11px] font-bold text-slate-800 block">
                                      How was this conflict resolved with the agent?
                                    </label>
                                    <input
                                      type="text"
                                      value={conflictResolutionNotes}
                                      onChange={(e) => setConflictResolutionNotes(e.target.value)}
                                      placeholder="e.g. Agent confirmed 4 adults + 1 child (5 travelers total). Extra bed added."
                                      className="w-full p-2 border border-slate-300 rounded text-xs focus:ring-2 focus:ring-red-500"
                                    />
                                    <div className="flex justify-end gap-2">
                                      <button
                                        onClick={() => setResolvingConflict(null)}
                                        className="text-xs text-slate-500 hover:text-slate-700"
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        onClick={() => handleResolveConflict(conf.id)}
                                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded shadow-sm"
                                      >
                                        Confirm Resolution & Clear Flag
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Explicit Requirements vs Inferred Assumptions Table */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                            <ShieldCheck className="w-4 h-4 text-indigo-600" />
                            Explicit Requirements vs. Inferred Assumptions
                          </h4>
                          <span className="text-[11px] text-slate-500">
                            Transparent provenance of every operational parameter
                          </span>
                        </div>

                        <div className="overflow-x-auto rounded-lg border border-slate-200">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead className="bg-slate-50 text-[10px] font-bold uppercase text-slate-500 border-b border-slate-200">
                              <tr>
                                <th className="p-3">Field</th>
                                <th className="p-3">Extracted / Inferred Value</th>
                                <th className="p-3">Classification</th>
                                <th className="p-3">Confidence</th>
                                <th className="p-3">Rationale</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {selectedReq.assumptions.map((ass, i) => (
                                <tr key={i} className="hover:bg-slate-50/60">
                                  <td className="p-3 font-mono text-[11px] font-semibold text-slate-800">
                                    {ass.field}
                                  </td>
                                  <td className="p-3 font-semibold text-slate-900">
                                    {ass.value}
                                  </td>
                                  <td className="p-3">
                                    {ass.isExplicit ? (
                                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                        <Check className="w-3 h-3 text-emerald-600" /> Explicit Demand
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                                        <Compass className="w-3 h-3 text-purple-600" /> Inferred by AI
                                      </span>
                                    )}
                                  </td>
                                  <td className="p-3 font-bold text-slate-700">
                                    {Math.round(ass.confidence * 100)}%
                                  </td>
                                  <td className="p-3 text-[11px] text-slate-500">
                                    {ass.rationale}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 4: AUDIT HISTORY & CHANGE LOG */}
                  {inspectorTab === 'AUDIT_LOG' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                          <History className="w-4 h-4 text-indigo-600" />
                          Requirement Edit & Confirmation Audit Log
                        </h4>
                        <span className="text-[11px] text-slate-500">
                          Complete accountability trail
                        </span>
                      </div>

                      {selectedReq.editHistory && selectedReq.editHistory.length > 0 ? (
                        <div className="space-y-2.5">
                          {selectedReq.editHistory.map((edit, idx) => (
                            <div key={idx} className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-slate-900">
                                  Field &apos;{edit.field}&apos; updated by {edit.editedBy}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {new Date(edit.timestamp).toLocaleString()}
                                </span>
                              </div>
                              <div className="text-[11px] font-mono text-slate-600 flex items-center gap-2">
                                <span className="text-red-600 line-through">Old: {JSON.stringify(edit.oldValue)}</span>
                                <ArrowRight className="w-3 h-3 text-slate-400" />
                                <span className="text-emerald-700 font-bold">New: {JSON.stringify(edit.newValue)}</span>
                              </div>
                              {edit.reason && (
                                <p className="text-[11px] text-slate-500 italic mt-0.5">
                                  Reason: &ldquo;{edit.reason}&rdquo;
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-8 text-center text-slate-400 text-xs border border-dashed rounded-lg">
                          No manual edits recorded yet. Structured fields currently match initial AI extraction.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-24 text-slate-400 text-xs">
                Select an inquiry from the left to inspect intelligence.
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Modal: New Inbound Requirement Intake */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">New Requirement Intake</h3>
                  <p className="text-[11px] text-slate-500">Simulate incoming agent message or paste freeform inquiry</p>
                </div>
              </div>
              <button
                onClick={() => setIsNewModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Tab Switcher */}
            <div className="flex border-b border-slate-200 px-5 bg-white">
              <button
                onClick={() => setModalTab('PRESETS')}
                className={`py-2.5 px-3 text-xs font-bold border-b-2 transition-all ${
                  modalTab === 'PRESETS' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500'
                }`}
              >
                1-Click Realistic Presets (4)
              </button>
              <button
                onClick={() => setModalTab('PASTE_AI')}
                className={`py-2.5 px-3 text-xs font-bold border-b-2 transition-all ${
                  modalTab === 'PASTE_AI' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500'
                }`}
              >
                Paste Custom Inquiry
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {modalTab === 'PRESETS' && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-600">
                    Select a realistic test inquiry to immediately verify completeness scoring, ambiguity questions, or passenger count conflict detection:
                  </p>
                  <div className="grid grid-cols-1 gap-2.5">
                    {PRESET_INQUIRIES.map((preset, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/20 transition-all space-y-2 cursor-pointer group"
                        onClick={() => handleRunAiExtraction(preset.text, preset.channel, preset.agentId)}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                            {preset.title}
                          </span>
                          <span className="text-[10px] font-bold uppercase bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                            {preset.channel}
                          </span>
                        </div>
                        <p className="text-[11px] font-mono text-slate-600 bg-slate-50 p-2 rounded border border-slate-100">
                          &ldquo;{preset.text}&rdquo;
                        </p>
                        <p className="text-[10px] text-slate-500 italic">
                          ℹ️ {preset.scenario}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {modalTab === 'PASTE_AI' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Source Channel</label>
                      <select
                        value={customChannel}
                        onChange={(e) => setCustomChannel(e.target.value as TravelRequirement['sourceChannel'])}
                        className="w-full p-2 rounded-lg border border-slate-300 text-xs"
                      >
                        <option value="WHATSAPP">WhatsApp</option>
                        <option value="EMAIL">Email</option>
                        <option value="PHONE_CALL_NOTES">Phone Call Notes</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Travel Agent</label>
                      <select
                        value={customAgentId}
                        onChange={(e) => setCustomAgentId(e.target.value)}
                        className="w-full p-2 rounded-lg border border-slate-300 text-xs"
                      >
                        {agents.map(a => (
                          <option key={a.id} value={a.id}>
                            {a.agencyName} ({a.contactPerson} - {a.city})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Paste Freeform Inquiry Text
                    </label>
                    <textarea
                      rows={5}
                      value={customText}
                      onChange={(e) => setCustomText(e.target.value)}
                      placeholder="e.g. 'Looking for 5 nights Thailand package for 2 adults and 1 kid, 4 star hotel, breakfast and private transfers. Client has not finalized dates yet.'..."
                      className="w-full p-3 rounded-lg border border-slate-300 text-xs font-mono focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      onClick={() => setIsNewModalOpen(false)}
                      className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleRunAiExtraction(customText, customChannel, customAgentId)}
                      disabled={!customText.trim() || isParsing}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{isParsing ? 'Running NLP Extraction...' : 'Extract & Intake'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
