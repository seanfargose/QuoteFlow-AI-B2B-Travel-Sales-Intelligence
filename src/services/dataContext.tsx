'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { scoreRequirementCompleteness } from '../domain/completenessEngine';
import { 
  calculateQuoteVersionTotals, 
  createNewQuoteVersion, 
  generateInitialQuoteForRequirement,
  checkQuoteRisks
} from '../domain/pricingEngine';
import { 
  TravelRequirement, 
  Quote, 
  QuoteLineItem,
  QuoteVersion,
  PackageTier,
  FollowUpTask, 
  Booking, 
  HotelRate, 
  TravelAgent, 
  ActivityEvent,
  QuoteLifecycleStatus,
  RequirementEditLog
} from '../types';
import { 
  SEED_AGENTS, 
  SEED_REQUIREMENTS, 
  SEED_QUOTES, 
  SEED_FOLLOW_UPS, 
  SEED_BOOKINGS, 
  SEED_HOTEL_RATES, 
  SEED_ACTIVITY_EVENTS 
} from '../data/seedData';

interface DataContextType {
  requirements: TravelRequirement[];
  quotes: Quote[];
  followUps: FollowUpTask[];
  bookings: Booking[];
  hotelRates: HotelRate[];
  agents: TravelAgent[];
  activityEvents: ActivityEvent[];
  
  // Actions
  addRequirement: (req: TravelRequirement) => void;
  updateRequirementStatus: (id: string, status: TravelRequirement['status']) => void;
  editRequirement: (id: string, updatedFields: Partial<TravelRequirement>, reason?: string) => void;
  resolveConflict: (requirementId: string, conflictId: string, resolutionNotes: string) => void;
  addQuote: (quote: Quote) => void;
  updateQuoteStatus: (id: string, status: QuoteLifecycleStatus) => void;
  approveManagerOverride: (quoteId: string, notes?: string) => void;
  rejectManagerOverride: (quoteId: string, notes?: string) => void;
  completeFollowUp: (taskId: string) => void;
  addBooking: (booking: Booking) => void;
  recordActivityEvent: (event: Omit<ActivityEvent, 'id' | 'timestamp'>) => void;
  resetAllData: () => void;

  // Quote Workbench Actions
  updateQuoteLineItem: (quoteId: string, versionId: string, lineItemId: string, updatedFields: Partial<QuoteLineItem>) => void;
  addLineItemToQuote: (quoteId: string, versionId: string, newItem: QuoteLineItem) => void;
  removeLineItemFromQuote: (quoteId: string, versionId: string, lineItemId: string) => void;
  updateQuoteMarkup: (quoteId: string, versionId: string, markupPercentage: number) => void;
  createQuoteNewVersion: (quoteId: string, changeReason: string) => void;
  createQuoteForRequirement: (requirementId: string, tier?: PackageTier) => string;
  markQuoteAsSent: (quoteId: string) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const STORAGE_KEY_PREFIX = 'quoteflow_ai_state_v1';

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [requirements, setRequirements] = useState<TravelRequirement[]>(SEED_REQUIREMENTS);
  const [quotes, setQuotes] = useState<Quote[]>(SEED_QUOTES);
  const [followUps, setFollowUps] = useState<FollowUpTask[]>(SEED_FOLLOW_UPS);
  const [bookings, setBookings] = useState<Booking[]>(SEED_BOOKINGS);
  const [hotelRates, setHotelRates] = useState<HotelRate[]>(SEED_HOTEL_RATES);
  const [agents] = useState<TravelAgent[]>(SEED_AGENTS);
  const [activityEvents, setActivityEvents] = useState<ActivityEvent[]>(SEED_ACTIVITY_EVENTS);
  const [isHydrated, setIsHydrated] = useState(false);

  // Hydrate from localStorage on client mount
  useEffect(() => {
    try {
      const storedReq = localStorage.getItem(`${STORAGE_KEY_PREFIX}_req`);
      const storedQuotes = localStorage.getItem(`${STORAGE_KEY_PREFIX}_quotes`);
      const storedFollowUps = localStorage.getItem(`${STORAGE_KEY_PREFIX}_followups`);
      const storedBookings = localStorage.getItem(`${STORAGE_KEY_PREFIX}_bookings`);
      const storedRates = localStorage.getItem(`${STORAGE_KEY_PREFIX}_rates`);
      const storedEvents = localStorage.getItem(`${STORAGE_KEY_PREFIX}_events`);

      if (storedReq) setRequirements(JSON.parse(storedReq));
      if (storedQuotes) setQuotes(JSON.parse(storedQuotes));
      if (storedFollowUps) setFollowUps(JSON.parse(storedFollowUps));
      if (storedBookings) setBookings(JSON.parse(storedBookings));
      if (storedRates) setHotelRates(JSON.parse(storedRates));
      if (storedEvents) setActivityEvents(JSON.parse(storedEvents));
    } catch (e) {
      console.warn('LocalStorage hydration error, using seeds', e);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  // Sync to localStorage
  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}_req`, JSON.stringify(requirements));
      localStorage.setItem(`${STORAGE_KEY_PREFIX}_quotes`, JSON.stringify(quotes));
      localStorage.setItem(`${STORAGE_KEY_PREFIX}_followups`, JSON.stringify(followUps));
      localStorage.setItem(`${STORAGE_KEY_PREFIX}_bookings`, JSON.stringify(bookings));
      localStorage.setItem(`${STORAGE_KEY_PREFIX}_rates`, JSON.stringify(hotelRates));
      localStorage.setItem(`${STORAGE_KEY_PREFIX}_events`, JSON.stringify(activityEvents));
    } catch (e) {
      console.warn('LocalStorage save error', e);
    }
  }, [requirements, quotes, followUps, bookings, hotelRates, activityEvents, isHydrated]);

  const addRequirement = (req: TravelRequirement) => {
    setRequirements(prev => [req, ...prev]);
  };

  const updateRequirementStatus = (id: string, status: TravelRequirement['status']) => {
    setRequirements(prev => prev.map(r => r.id === id ? { ...r, status, lastActivityAt: new Date().toISOString() } : r));
  };

  const editRequirement = (id: string, updatedFields: Partial<TravelRequirement>, reason?: string) => {
    setRequirements(prev => prev.map(r => {
      if (r.id !== id) return r;

      const editLogs: RequirementEditLog[] = [];
      const keys = Object.keys(updatedFields) as (keyof TravelRequirement)[];

      keys.forEach(k => {
        // Do not allow raw original inquiry text to be overwritten; preserve original verbatim message!
        if (k === 'rawInquiryText' || k === 'editHistory' || k === 'id') return;

        const oldVal = r[k];
        const newVal = updatedFields[k];

        if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
          editLogs.push({
            id: `edit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            timestamp: new Date().toISOString(),
            editedBy: 'Priya Sharma (Sales Executive)',
            field: String(k),
            oldValue: oldVal,
            newValue: newVal,
            reason: reason || 'Sales executive parameter confirmation',
          });
        }
      });

      const updatedRequirement: TravelRequirement = {
        ...r,
        ...updatedFields,
        rawInquiryText: r.rawInquiryText, // Preserved inviolate
        editHistory: [...(r.editHistory || []), ...editLogs],
        lastActivityAt: new Date().toISOString(),
      };

      // Recalculate completeness score transparently
      const completeness = scoreRequirementCompleteness({
        destinationCorridor: updatedRequirement.destinationCorridor,
        tentativeTravelDate: updatedRequirement.tentativeTravelDate,
        totalDurationNights: updatedRequirement.totalDurationNights,
        passengers: updatedRequirement.passengers,
        flightPreference: updatedRequirement.flightPreference,
        departureAirport: updatedRequirement.departureAirport,
        mealPlanRequested: updatedRequirement.mealPlanRequested,
      });

      updatedRequirement.completenessScore = completeness.score;
      updatedRequirement.missingFields = completeness.missingFields;

      // If all blocking fields resolved and no critical conflicts, elevate to PARSED_READY
      if (completeness.isReadyForQuoting && updatedRequirement.conflictFlags.length === 0) {
        if (updatedRequirement.status === 'CLARIFICATION_PENDING' || updatedRequirement.status === 'INGESTED') {
          updatedRequirement.status = 'PARSED_READY';
        }
      }

      return updatedRequirement;
    }));

    recordActivityEvent({
      type: 'REQUIREMENT_EDITED',
      entityType: 'REQUIREMENT',
      entityId: id,
      actor: 'Priya Sharma (Sales Executive)',
      description: `Updated structured fields: ${Object.keys(updatedFields).filter(k => k !== 'rawInquiryText').join(', ')} (${reason || 'Confirmed with agent'})`,
    });
  };

  const resolveConflict = (requirementId: string, conflictId: string, resolutionNotes: string) => {
    setRequirements(prev => prev.map(r => {
      if (r.id !== requirementId) return r;

      const remainingConflicts = r.conflictFlags.filter(c => c.id !== conflictId);
      const resolvedConflict = r.conflictFlags.find(c => c.id === conflictId);

      const log: RequirementEditLog = {
        id: `edit_conf_${Date.now()}`,
        timestamp: new Date().toISOString(),
        editedBy: 'Priya Sharma (Sales Executive)',
        field: 'conflictFlags',
        oldValue: resolvedConflict ? resolvedConflict.description : 'Conflict Active',
        newValue: `Resolved: ${resolutionNotes}`,
        reason: resolutionNotes,
      };

      const updatedRequirement: TravelRequirement = {
        ...r,
        conflictFlags: remainingConflicts,
        editHistory: [...(r.editHistory || []), log],
        lastActivityAt: new Date().toISOString(),
      };

      const completeness = scoreRequirementCompleteness({
        destinationCorridor: updatedRequirement.destinationCorridor,
        tentativeTravelDate: updatedRequirement.tentativeTravelDate,
        totalDurationNights: updatedRequirement.totalDurationNights,
        passengers: updatedRequirement.passengers,
        flightPreference: updatedRequirement.flightPreference,
        departureAirport: updatedRequirement.departureAirport,
        mealPlanRequested: updatedRequirement.mealPlanRequested,
      });

      if (remainingConflicts.length === 0 && completeness.isReadyForQuoting) {
        updatedRequirement.status = 'PARSED_READY';
      }

      return updatedRequirement;
    }));

    recordActivityEvent({
      type: 'CONFLICT_RESOLVED',
      entityType: 'REQUIREMENT',
      entityId: requirementId,
      actor: 'Priya Sharma (Sales Executive)',
      description: `Conflict resolved: ${resolutionNotes}`,
    });
  };

  const addQuote = (quote: Quote) => {
    setQuotes(prev => [quote, ...prev]);
  };

  const updateQuoteStatus = (id: string, status: QuoteLifecycleStatus) => {
    setQuotes(prev => prev.map(q => q.id === id ? { ...q, status, updatedAt: new Date().toISOString() } : q));
  };

  const approveManagerOverride = (quoteId: string, notes = 'Manager 1-click approval granted') => {
    setQuotes(prev => prev.map(q => {
      if (q.id === quoteId) {
        return {
          ...q,
          status: 'APPROVED',
          approvalState: {
            ...q.approvalState,
            approvalStatus: 'APPROVED',
            respondedAt: new Date().toISOString(),
            approverUserId: 'usr_rajesh_mgr',
            approverNotes: notes,
          },
          updatedAt: new Date().toISOString(),
        };
      }
      return q;
    }));
  };

  const rejectManagerOverride = (quoteId: string, notes = 'Counter-offer required: minimum 8% margin') => {
    setQuotes(prev => prev.map(q => {
      if (q.id === quoteId) {
        return {
          ...q,
          status: 'DRAFT',
          approvalState: {
            ...q.approvalState,
            approvalStatus: 'REJECTED',
            respondedAt: new Date().toISOString(),
            approverUserId: 'usr_rajesh_mgr',
            approverNotes: notes,
          },
          updatedAt: new Date().toISOString(),
        };
      }
      return q;
    }));
  };

  const completeFollowUp = (taskId: string) => {
    setFollowUps(prev => prev.map(t => t.id === taskId ? { ...t, status: 'EXECUTED', executedAt: new Date().toISOString() } : t));
  };

  const addBooking = (booking: Booking) => {
    setBookings(prev => [booking, ...prev]);
    // Also update associated quote status to BOOKING_LOCKED
    updateQuoteStatus(booking.quoteId, 'BOOKING_LOCKED');
  };

  const recordActivityEvent = (event: Omit<ActivityEvent, 'id' | 'timestamp'>) => {
    const newEvent: ActivityEvent = {
      ...event,
      id: `act_${Date.now()}`,
      timestamp: new Date().toISOString(),
    };
    setActivityEvents(prev => [newEvent, ...prev]);
  };

  // Quote Workbench Actions
  const updateQuoteLineItem = (
    quoteId: string, 
    versionId: string, 
    lineItemId: string, 
    updatedFields: Partial<QuoteLineItem>
  ) => {
    setQuotes(prev => prev.map(q => {
      if (q.id !== quoteId) return q;

      const req = requirements.find(r => r.id === q.requirementId);
      const paxCount = (req?.passengers?.adults || 2) + (req?.passengers?.children || 0);

      const updatedVersions = q.versions.map(v => {
        if (v.versionId !== versionId) return v;

        const updatedLineItems = v.lineItems.map(item => {
          if (item.id !== lineItemId) return item;
          const merged = { ...item, ...updatedFields };
          const unitCost = merged.unitNetCostForeign ?? 0;
          const qty = merged.units ?? 1;
          const fx = merged.fxRateToInr ?? 1;
          merged.totalNetCostInr = Math.round(unitCost * qty * fx * 1.015);
          merged.sellingPriceInr = Math.round(merged.totalNetCostInr * (1 + (merged.markupPercentage ?? v.markupPercentage ?? 0.12)));
          return merged;
        });

        const totals = calculateQuoteVersionTotals(
          updatedLineItems, 
          v.markupPercentage, 
          paxCount
        );

        return {
          ...v,
          lineItems: updatedLineItems,
          totalLandNetCostInr: totals.totalLandNetCostInr,
          totalFlightNetCostInr: totals.totalFlightNetCostInr,
          totalNetCostInr: totals.totalNetCostInr,
          grossProfitInr: totals.markupAmountInr,
          totalSellingPriceInr: totals.totalSellingPriceInr,
          perPersonSellingPriceInr: totals.perPersonSellingPriceInr,
        };
      });

      return {
        ...q,
        versions: updatedVersions,
        updatedAt: new Date().toISOString(),
      };
    }));

    recordActivityEvent({
      type: 'QUOTE_EDITED',
      entityType: 'QUOTE',
      entityId: quoteId,
      actor: 'Priya Sharma (Sales Executive)',
      description: `Modified line item in quote version ${versionId}`,
    });
  };

  const addLineItemToQuote = (quoteId: string, versionId: string, newItem: QuoteLineItem) => {
    setQuotes(prev => prev.map(q => {
      if (q.id !== quoteId) return q;

      const req = requirements.find(r => r.id === q.requirementId);
      const paxCount = (req?.passengers?.adults || 2) + (req?.passengers?.children || 0);

      const updatedVersions = q.versions.map(v => {
        if (v.versionId !== versionId) return v;

        const updatedLineItems = [...v.lineItems, newItem];
        const totals = calculateQuoteVersionTotals(
          updatedLineItems, 
          v.markupPercentage, 
          paxCount
        );

        return {
          ...v,
          lineItems: updatedLineItems,
          totalLandNetCostInr: totals.totalLandNetCostInr,
          totalFlightNetCostInr: totals.totalFlightNetCostInr,
          totalNetCostInr: totals.totalNetCostInr,
          grossProfitInr: totals.markupAmountInr,
          totalSellingPriceInr: totals.totalSellingPriceInr,
          perPersonSellingPriceInr: totals.perPersonSellingPriceInr,
        };
      });

      return {
        ...q,
        versions: updatedVersions,
        updatedAt: new Date().toISOString(),
      };
    }));

    recordActivityEvent({
      type: 'QUOTE_EDITED',
      entityType: 'QUOTE',
      entityId: quoteId,
      actor: 'Priya Sharma (Sales Executive)',
      description: `Added "${newItem.title}" to quote version ${versionId}`,
    });
  };

  const removeLineItemFromQuote = (quoteId: string, versionId: string, lineItemId: string) => {
    setQuotes(prev => prev.map(q => {
      if (q.id !== quoteId) return q;

      const req = requirements.find(r => r.id === q.requirementId);
      const paxCount = (req?.passengers?.adults || 2) + (req?.passengers?.children || 0);

      const updatedVersions = q.versions.map(v => {
        if (v.versionId !== versionId) return v;

        const updatedLineItems = v.lineItems.filter(item => item.id !== lineItemId);
        const totals = calculateQuoteVersionTotals(
          updatedLineItems, 
          v.markupPercentage, 
          paxCount
        );

        return {
          ...v,
          lineItems: updatedLineItems,
          totalLandNetCostInr: totals.totalLandNetCostInr,
          totalFlightNetCostInr: totals.totalFlightNetCostInr,
          totalNetCostInr: totals.totalNetCostInr,
          grossProfitInr: totals.markupAmountInr,
          totalSellingPriceInr: totals.totalSellingPriceInr,
          perPersonSellingPriceInr: totals.perPersonSellingPriceInr,
        };
      });

      return {
        ...q,
        versions: updatedVersions,
        updatedAt: new Date().toISOString(),
      };
    }));

    recordActivityEvent({
      type: 'QUOTE_EDITED',
      entityType: 'QUOTE',
      entityId: quoteId,
      actor: 'Priya Sharma (Sales Executive)',
      description: `Removed line item from quote version ${versionId}`,
    });
  };

  const updateQuoteMarkup = (quoteId: string, versionId: string, markupPercentage: number) => {
    setQuotes(prev => prev.map(q => {
      if (q.id !== quoteId) return q;

      const req = requirements.find(r => r.id === q.requirementId);
      const paxCount = (req?.passengers?.adults || 2) + (req?.passengers?.children || 0);

      const updatedVersions = q.versions.map(v => {
        if (v.versionId !== versionId) return v;

        const totals = calculateQuoteVersionTotals(
          v.lineItems, 
          markupPercentage / 100, 
          paxCount
        );

        return {
          ...v,
          markupPercentage: markupPercentage / 100,
          totalLandNetCostInr: totals.totalLandNetCostInr,
          totalFlightNetCostInr: totals.totalFlightNetCostInr,
          totalNetCostInr: totals.totalNetCostInr,
          grossProfitInr: totals.markupAmountInr,
          totalSellingPriceInr: totals.totalSellingPriceInr,
          perPersonSellingPriceInr: totals.perPersonSellingPriceInr,
        };
      });

      // Check if gross margin is below 8% floor
      const activeV = updatedVersions.find(v => v.versionId === versionId);
      const grossMarginPct = activeV && activeV.totalSellingPriceInr > 0 
        ? (activeV.grossProfitInr / activeV.totalSellingPriceInr) * 100 
        : 0;
      const isSubFloor = grossMarginPct < 8.0;

      return {
        ...q,
        versions: updatedVersions,
        status: isSubFloor ? 'PENDING_APPROVAL' : (q.status === 'PENDING_APPROVAL' ? 'DRAFT' : q.status),
        approvalState: {
          ...q.approvalState,
          isApprovalRequired: isSubFloor,
          triggerReason: isSubFloor ? 'MARGIN_BELOW_FLOOR' : undefined,
          approvalStatus: isSubFloor ? 'PENDING' : 'NOT_REQUIRED',
          approverNotes: isSubFloor ? 'Gross margin dropped below 8.0% company floor. Requires manager sign-off.' : undefined,
        },
        updatedAt: new Date().toISOString(),
      };
    }));

    recordActivityEvent({
      type: 'QUOTE_EDITED',
      entityType: 'QUOTE',
      entityId: quoteId,
      actor: 'Priya Sharma (Sales Executive)',
      description: `Adjusted cost-based markup to ${markupPercentage.toFixed(1)}%`,
    });
  };

  const createQuoteNewVersion = (quoteId: string, changeReason: string) => {
    setQuotes(prev => prev.map(q => {
      if (q.id !== quoteId) return q;

      const currentActive = q.versions.find(v => v.versionId === q.currentVersionId) || q.versions[q.versions.length - 1];
      if (!currentActive) return q;

      const req = requirements.find(r => r.id === q.requirementId);
      const paxCount = (req?.passengers?.adults || 2) + (req?.passengers?.children || 0);

      const newVer = createNewQuoteVersion(
        currentActive, 
        currentActive.lineItems, 
        currentActive.markupPercentage, 
        paxCount, 
        changeReason
      );

      return {
        ...q,
        currentVersionId: newVer.versionId,
        versions: [...q.versions, newVer],
        status: 'DRAFT',
        updatedAt: new Date().toISOString(),
      };
    }));

    recordActivityEvent({
      type: 'QUOTE_VERSION_CREATED',
      entityType: 'QUOTE',
      entityId: quoteId,
      actor: 'Priya Sharma (Sales Executive)',
      description: `Created new quote version. Reason: ${changeReason}`,
    });
  };

  const createQuoteForRequirement = (requirementId: string, tier: PackageTier = 'CURATED_RECOMMENDED'): string => {
    const requirement = requirements.find(r => r.id === requirementId);
    if (!requirement) throw new Error(`Requirement ${requirementId} not found`);

    const newQuote = generateInitialQuoteForRequirement(requirement);
    if (tier) {
      const matchVer = newQuote.versions.find((v: QuoteVersion) => v.packageTier === tier);
      if (matchVer) {
        newQuote.currentVersionId = matchVer.versionId;
        newQuote.activeTier = tier;
      }
    }

    setQuotes(prev => [newQuote, ...prev]);

    // Update requirement status to QUOTED
    setRequirements(prev => prev.map(r => r.id === requirementId ? { ...r, status: 'QUOTED', lastActivityAt: new Date().toISOString() } : r));

    recordActivityEvent({
      type: 'QUOTE_CREATED',
      entityType: 'QUOTE',
      entityId: newQuote.id,
      actor: 'QuoteFlow AI Engine',
      description: `Drafted ${tier.replace('_', ' ')} package quote for ${requirement.contactName || 'Agent'} (${requirement.destinationCorridor})`,
    });

    return newQuote.id;
  };

  const markQuoteAsSent = (quoteId: string) => {
    setQuotes(prev => prev.map(q => {
      if (q.id !== quoteId) return q;
      return {
        ...q,
        status: 'DELIVERED',
        updatedAt: new Date().toISOString(),
      };
    }));

    // Auto-create Follow-up task
    const targetQuote = quotes.find(q => q.id === quoteId);
    if (targetQuote) {
      const newFollowUp: FollowUpTask = {
        id: `fu_auto_${Date.now()}`,
        quoteId: quoteId,
        agentId: targetQuote.agentId,
        priority: 'HIGH_ATTENTION',
        triggerEvent: 'AGENT_SILENT_24H',
        suggestedActionTitle: 'WhatsApp Quote Dispatch Follow-up',
        suggestedMessageCopy: 'Hi, just following up on the quotation sent earlier. Let me know if you would like me to adjust any hotel options or hold inventory.',
        scheduledFor: new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
        status: 'PENDING',
      };
      setFollowUps(prev => [newFollowUp, ...prev]);
    }

    recordActivityEvent({
      type: 'QUOTE_SENT',
      entityType: 'QUOTE',
      entityId: quoteId,
      actor: 'Priya Sharma (Sales Executive)',
      description: `Sent proposal to travel agent via WhatsApp/Email demo dispatch`,
    });
  };

  const resetAllData = () => {
    localStorage.clear();
    setRequirements(SEED_REQUIREMENTS);
    setQuotes(SEED_QUOTES);
    setFollowUps(SEED_FOLLOW_UPS);
    setBookings(SEED_BOOKINGS);
    setHotelRates(SEED_HOTEL_RATES);
    setActivityEvents(SEED_ACTIVITY_EVENTS);
  };

  return (
    <DataContext.Provider
      value={{
        requirements,
        quotes,
        followUps,
        bookings,
        hotelRates,
        agents,
        activityEvents,
        addRequirement,
        updateRequirementStatus,
        editRequirement,
        resolveConflict,
        addQuote,
        updateQuoteStatus,
        approveManagerOverride,
        rejectManagerOverride,
        completeFollowUp,
        addBooking,
        recordActivityEvent,
        resetAllData,
        updateQuoteLineItem,
        addLineItemToQuote,
        removeLineItemFromQuote,
        updateQuoteMarkup,
        createQuoteNewVersion,
        createQuoteForRequirement,
        markQuoteAsSent,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
