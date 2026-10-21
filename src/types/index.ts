// QuoteFlow AI Domain Models (Strict TypeScript)

export type AgentTier = 'TIER_1_ENTERPRISE' | 'TIER_2_PREFERRED' | 'TIER_3_STANDARD';

export interface TravelAgent {
  id: string;
  agencyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  tier: AgentTier;
  creditLimitInr: number;
  outstandingBalanceInr: number;
  lifetimeBookedGmvInr: number;
  historicalConversionRate: number; // e.g. 0.18 for 18%
  preferredCurrency: 'INR' | 'USD' | 'AED';
  whiteLabelConfig: {
    logoUrl?: string;
    brandColor?: string;
    displayPhone: string;
    displayEmail: string;
  };
  createdAt: string;
}

export type DestinationCorridor = 
  | 'THAILAND'
  | 'DUBAI'
  | 'VIETNAM'
  | 'BALI'
  | 'MALDIVES';

export type HotelStarCategory = '3_STAR' | '4_STAR_STANDARD' | '4_STAR_DELUXE' | '5_STAR_LUXURY';
export type MealPlan = 'ROOM_ONLY' | 'BED_AND_BREAKFAST' | 'HALF_BOARD' | 'FULL_BOARD' | 'ALL_INCLUSIVE';
export type TransferPreference = 'PRIVATE' | 'SHARED_SIC' | 'NOT_REQUIRED';
export type FlightPreference = 'INCLUDE_FLIGHTS' | 'LAND_ONLY' | 'QUOTE_BOTH';

export interface Passenger {
  id: string;
  type: 'ADULT' | 'CHILD' | 'INFANT';
  age: number;
  bedPreference: 'TWIN' | 'DOUBLE' | 'EXTRA_BED_CWB' | 'NO_BED_CNB';
  passportValidUntil?: string;
}

export interface TravellerPreferences {
  pace: 'RELAXED' | 'MODERATE' | 'PACKED';
  vibes: ('ROMANTIC' | 'FAMILY_FRIENDLY' | 'ADVENTURE' | 'NIGHTLIFE' | 'CULTURE')[];
  dietaryNeeds?: ('PURE_VEG' | 'JAIN' | 'HALAL' | 'NO_RESTRICTIONS')[];
  specialOccasion?: 'HONEYMOON' | 'ANNIVERSARY' | 'BIRTHDAY' | 'NONE';
}

export interface MissingFieldDiagnostic {
  fieldKey: string;
  severity: 'BLOCKING' | 'RECOMMENDED' | 'OPTIONAL';
  humanDescription: string;
  clarificationPromptTemplate: string;
}

export interface TravelRequirement {
  id: string;
  agentId: string;
  sourceChannel: 'WHATSAPP' | 'EMAIL' | 'PORTAL_QUICK_ENTRY';
  rawInquiryText: string;
  destinationCorridor: DestinationCorridor;
  cities: { cityName: string; nights: number }[];
  tentativeTravelDate: string;
  flexibilityDays: number;
  totalDurationNights: number;
  passengers: Passenger[];
  hotelCategoryRequested: HotelStarCategory;
  mealPlanRequested: MealPlan;
  transferPreference: TransferPreference;
  flightPreference: FlightPreference;
  departureAirport?: string;
  budgetInrMax?: number;
  preferences: TravellerPreferences;
  completenessScore: number; // 0 to 100
  missingFields: MissingFieldDiagnostic[];
  status: 'INGESTED' | 'CLARIFICATION_PENDING' | 'PARSED_READY' | 'QUOTED';
  extractedAt: string;
}

export type SupplierType = 'DMC' | 'HOTEL_PROPERTY' | 'AIRLINE' | 'TRANSFER_OPERATOR' | 'ACTIVITY_PROVIDER';

export interface Supplier {
  id: string;
  name: string;
  type: SupplierType;
  destination: DestinationCorridor;
  contactEmail: string;
  contactPhone: string;
  paymentTermsDays: number;
  reliabilityScore: number;
  baseCurrency: 'THB' | 'AED' | 'USD' | 'EUR' | 'INR';
}

export type InventorySourceType = 
  | 'PREPAID_COMMITMENT'
  | 'CONTRACTED_DIRECT'
  | 'THIRD_PARTY_ON_DEMAND';

export type AvailabilityStatus = 
  | 'CONFIRMED_ALLOTMENT'
  | 'AVAILABLE_ON_REQUEST'
  | 'SOLD_OUT';

export interface InventorySource {
  type: InventorySourceType;
  supplierId: string;
  contractCode?: string;
  commitmentDetails?: {
    totalRoomsCommitted: number;
    roomsSold: number;
    roomsRemaining: number;
    releaseCutoffDate: string;
    sunkCostPenaltyPerRoomInr: number;
    repIncentiveKickerInr: number;
  };
}

export interface HotelRate {
  id: string;
  hotelName: string;
  city: string;
  destination: DestinationCorridor;
  starRating: 3 | 4 | 5;
  roomCategory: string;
  mealPlan: MealPlan;
  inventorySource: InventorySource;
  netRatePerNightForeign: number;
  foreignCurrency: 'THB' | 'AED' | 'USD' | 'EUR' | 'INR';
  appliedFxRateToInr: number;
  fxBufferPercentage: number;
  netRatePerNightInr: number;
  lastVerifiedAt: string;
  isFresh: boolean;
  availabilityStatus: AvailabilityStatus;
  confidenceScore: number;
  blackoutDates: string[];
}

export type LineItemCategory = 'HOTEL' | 'FLIGHT' | 'TRANSFER' | 'ACTIVITY' | 'VISA_INSURANCE';

export interface QuoteLineItem {
  id: string;
  category: LineItemCategory;
  dayNumber?: number;
  title: string;
  supplierId: string;
  inventorySourceType: InventorySourceType;
  rateId?: string;
  units: number;
  unitNetCostForeign: number;
  foreignCurrency: 'THB' | 'AED' | 'USD' | 'EUR' | 'INR';
  fxRateToInr: number;
  totalNetCostInr: number;
  markupPercentage: number;
  sellingPriceInr: number;
  isPrepaidCommitment: boolean;
  isOptionalAddon: boolean;
  notes?: string;
}

export type PackageTier = 'SAVER' | 'CURATED_RECOMMENDED' | 'ELITE_LUXURY';

export interface ItineraryDay {
  dayNumber: number;
  date: string;
  title: string;
  description: string;
  hotelLineItemId?: string;
  activityLineItemIds: string[];
  mealsIncluded: ('BREAKFAST' | 'LUNCH' | 'DINNER')[];
}

export interface QuoteVersion {
  versionId: string;
  versionNumber: number;
  createdAt: string;
  createdByUserId: string;
  packageTier: PackageTier;
  tierDisplayName: string;
  totalLandNetCostInr: number;
  totalFlightNetCostInr: number;
  totalNetCostInr: number;
  markupPercentage: number;
  grossProfitInr: number;
  totalSellingPriceInr: number;
  perPersonSellingPriceInr: number;
  lineItems: QuoteLineItem[];
  itineraryDays: ItineraryDay[];
  inclusions: string[];
  exclusions: string[];
  validityExpiresAt: string;
  cancellationPolicy: string;
  paymentSchedule: { dueDate: string; amountInr: number; description: string }[];
  assumptions: string[];
  diffFromPreviousVersion?: {
    previousVersionId: string;
    priceDeltaInr: number;
    marginDeltaPercentage: number;
    modifiedLineItemDescriptions: string[];
  };
}

export type QuoteLifecycleStatus = 
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'DELIVERED'
  | 'VIEWED'
  | 'ENGAGED'
  | 'REVISION_REQUESTED'
  | 'BOOKING_LOCKED'
  | 'LOST'
  | 'EXPIRED';

export interface ManagerApprovalState {
  isApprovalRequired: boolean;
  triggerReason?: 'MARGIN_BELOW_FLOOR' | 'STALE_SUPPLIER_RATE' | 'CREDIT_LIMIT_EXCEEDED';
  approvalStatus: 'NOT_REQUIRED' | 'PENDING' | 'APPROVED' | 'REJECTED';
  requestedAt?: string;
  respondedAt?: string;
  approverUserId?: string;
  approverNotes?: string;
}

export interface Quote {
  id: string;
  requirementId: string;
  agentId: string;
  destinationCorridor: DestinationCorridor;
  currentVersionId: string;
  versions: QuoteVersion[];
  activeTier: PackageTier;
  status: QuoteLifecycleStatus;
  approvalState: ManagerApprovalState;
  intentScore: number; // 0 - 100
  lastActivityAt: string;
  viewCount: number;
  totalDwellSeconds: number;
  clientForwardedDetected: boolean;
  webProposalSlug: string;
  whatsappShareText: string;
  createdAt: string;
  updatedAt: string;
}

export type TaskPriority = 'CRITICAL_CALL_NOW' | 'HIGH_ATTENTION' | 'MEDIUM_NUDGE' | 'LOW_AUTOMATED';

export interface FollowUpTask {
  id: string;
  quoteId: string;
  agentId: string;
  priority: TaskPriority;
  triggerEvent: 
    | 'HIGH_DWELL_TIME'
    | 'REPEAT_VIEW'
    | 'CLIENT_FORWARD_DETECTED'
    | 'VALIDITY_EXPIRING_SOON'
    | 'AGENT_SILENT_24H';
  suggestedActionTitle: string;
  suggestedMessageCopy: string;
  scheduledFor: string;
  status: 'PENDING' | 'EXECUTED' | 'DISMISSED';
  executedAt?: string;
  dismissedReason?: string;
}

export interface Booking {
  id: string;
  quoteId: string;
  quoteVersionId: string;
  requirementId: string;
  agentId: string;
  bookingReference: string;
  totalSellingPriceInr: number;
  totalCostInr: number;
  realizedGrossMarginInr: number;
  realizedMarginPercentage: number;
  tokenDepositAmountInr: number;
  tokenDepositProofUrl?: string;
  paymentStatus: 'DEPOSIT_RECEIVED' | 'FULL_PAYMENT_RECEIVED' | 'CREDIT_APPROVED';
  opsStatus: 'PENDING_SUPPLIER_CONFIRMATION' | 'VOUCHERS_ISSUED' | 'MODIFIED' | 'CANCELLED';
  assignedOpsExecutiveId: string;
  committedInventoryDeducted: boolean;
  passengers: Passenger[];
  opsHandoverDossier: {
    supplierReferenceCodes: { supplierId: string; refCode: string }[];
    hotelVoucherNumbers: string[];
    flightPnrCodes: string[];
    specialInstructions: string;
  };
  confirmedAt: string;
}

export type PrimaryLossCategory = 
  | 'PRICE_TOO_HIGH'
  | 'FLIGHT_TIMING_OR_AIRFARE_SURGE'
  | 'HOTEL_UNAVAILABLE_OR_DOWNGRADE_REJECTED'
  | 'COMPETITOR_DMC_WON'
  | 'TRAVELER_POSTPONED_OR_CANCELLED'
  | 'AGENT_WENT_SILENT'
  | 'PAYMENT_CREDIT_DISPUTE';

export interface QuoteOutcome {
  id: string;
  quoteId: string;
  agentId: string;
  destinationCorridor: DestinationCorridor;
  outcome: 'WON' | 'LOST' | 'EXPIRED' | 'CANCELLED';
  finalGrossMarginPercentage?: number;
  lostRevenuePotentialInr: number;
  primaryLossCategory?: PrimaryLossCategory;
  competitorName?: string;
  agentFeedbackNotes?: string;
  recordedAt: string;
}

export type ActivityEventType = 
  | 'QUOTE_INGESTED'
  | 'CLARIFICATION_SENT'
  | 'QUOTE_DRAFTED'
  | 'MARGIN_OVERRIDE_REQUESTED'
  | 'MARGIN_OVERRIDE_APPROVED'
  | 'PROPOSAL_DISPATCHED_WHATSAPP'
  | 'PROPOSAL_OPENED_BY_AGENT'
  | 'PROPOSAL_OPENED_BY_CLIENT'
  | 'DWELL_TIME_HEARTBEAT'
  | 'PDF_EXPORTED'
  | 'REVISION_REQUESTED'
  | 'REVISION_DISPATCHED'
  | 'BOOKING_CONFIRMED'
  | 'QUOTE_MARKED_LOST';

export interface ActivityEvent {
  id: string;
  quoteId: string;
  eventType: ActivityEventType;
  actorType: 'SALES_REP' | 'SALES_MANAGER' | 'RETAIL_AGENT' | 'END_CLIENT' | 'SYSTEM';
  actorId?: string;
  timestamp: string;
  metadata: Record<string, unknown>;
}

export type RiskSeverity = 'CRITICAL' | 'WARNING' | 'INFO';

export interface RiskFlag {
  id: string;
  quoteId: string;
  severity: RiskSeverity;
  category: 'MARGIN_FLOOR' | 'STALE_SUPPLIER_RATE' | 'COMMITTED_INVENTORY_EXPIRING' | 'FX_VOLATILITY';
  title: string;
  description: string;
  isResolved: boolean;
  triggeredAt: string;
}

export interface AIRecommendation {
  id: string;
  quoteId: string;
  category: 'INVENTORY_OPTIMIZATION' | 'PRICE_CONCESSION' | 'TIMELY_FOLLOW_UP' | 'UPSELL';
  headline: string;
  rationale: string;
  estimatedMarginImpactInr: number;
  actionButtonLabel: string;
  actionPayload: Record<string, unknown>;
}
