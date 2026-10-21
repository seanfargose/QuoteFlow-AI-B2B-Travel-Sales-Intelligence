# Domain Data Model Specification
## QuoteFlow AI — Typed Domain Schemas & State Contracts

---

| Document Metadata | Details |
| :--- | :--- |
| **Product** | QuoteFlow AI |
| **Version** | 1.0.0 (Architecture Baseline) |
| **Standard** | TypeScript Strict Mode (`strict: true`) |
| **Persistence Target** | In-Memory Reactive State + LocalStorage Hydration (Production: Postgres/Prisma) |

---

## 1. Domain Model Overview & Relationships

```
┌─────────────────┐       1:N       ┌─────────────────────┐
│   TravelAgent   │ ───────────────►│  TravelRequirement  │
└─────────────────┘                 └──────────┬──────────┘
                                               │ 1:1
                                               ▼
┌─────────────────┐       1:N       ┌─────────────────────┐
│  FollowUpTask   │ ◄───────────────┤        Quote        │
└─────────────────┘                 └──────────┬──────────┘
                                               │ 1:N
                                               ▼
┌─────────────────┐       1:N       ┌─────────────────────┐       1:N       ┌───────────────────┐
│  ActivityEvent  │ ◄───────────────┤    QuoteVersion     │ ───────────────►│   QuoteLineItem   │
└─────────────────┘                 └──────────┬──────────┘                 └─────────┬─────────┘
                                               │                                      │
                                               │ 1:1 (When Won)                       ▼
                                               ▼                            ┌───────────────────┐
                                    ┌─────────────────────┐                 │ HotelRate / Supp. │
                                    │       Booking       │                 └───────────────────┘
                                    └─────────────────────┘
```

---

## 2. Core TypeScript Domain Interfaces

### 2.1 TravelAgent
Represents the B2B retail travel agency and its primary account manager.

```typescript
export type AgentTier = 'TIER_1_ENTERPRISE' | 'TIER_2_PREFERRED' | 'TIER_3_STANDARD';

export interface TravelAgent {
  id: string;                         // e.g., "agt_rohit_surat"
  agencyName: string;                 // e.g., "Rohit Travels"
  contactPerson: string;              // e.g., "Rohit Mehta"
  email: string;
  phone: string;                      // E.164 WhatsApp number: "+919825012345"
  city: string;                       // e.g., "Surat"
  state: string;                      // e.g., "Gujarat"
  tier: AgentTier;
  creditLimitInr: number;             // e.g., 200000 (₹2 Lakhs)
  outstandingBalanceInr: number;
  lifetimeBookedGmvInr: number;
  historicalConversionRate: number;   // e.g., 0.18 (18%)
  preferredCurrency: 'INR' | 'USD' | 'AED';
  whiteLabelConfig: {
    logoUrl?: string;
    brandColor?: string;
    displayPhone: string;
    displayEmail: string;
  };
  createdAt: string;                  // ISO 8601
}
```

---

### 2.2 TravelRequirement & Passenger Preferences
Represents the raw ingested inquiry and its parsed operational travel specifications.

```typescript
export type DestinationCorridor = 
  | 'THAILAND'       // Phuket, Krabi, Bangkok, Samui
  | 'DUBAI'          // Dubai, Abu Dhabi
  | 'VIETNAM'        // Da Nang, Hanoi, Halong, Phu Quoc
  | 'BALI'           // Ubud, Seminyak, Kuta, Nusa Penida
  | 'MALDIVES';      // Male Atolls, Resort Islands

export type HotelStarCategory = '3_STAR' | '4_STAR_STANDARD' | '4_STAR_DELUXE' | '5_STAR_LUXURY';
export type MealPlan = 'ROOM_ONLY' | 'BED_AND_BREAKFAST' | 'HALF_BOARD' | 'FULL_BOARD' | 'ALL_INCLUSIVE';
export type TransferPreference = 'PRIVATE' | 'SHARED_SIC' | 'NOT_REQUIRED';
export type FlightPreference = 'INCLUDE_FLIGHTS' | 'LAND_ONLY' | 'QUOTE_BOTH';

export interface Passenger {
  id: string;
  type: 'ADULT' | 'CHILD' | 'INFANT';
  age: number;                        // Critical: Children > 6 often require extra bed (CWB)
  bedPreference: 'TWIN' | 'DOUBLE' | 'EXTRA_BED_CWB' | 'NO_BED_CNB';
  passportValidUntil?: string;        // ISO 8601 (Must have > 6 months validity)
}

export interface TravellerPreferences {
  pace: 'RELAXED' | 'MODERATE' | 'PACKED';
  vibes: ('ROMANTIC' | 'FAMILY_FRIENDLY' | 'ADVENTURE' | 'NIGHTLIFE' | 'CULTURE')[];
  dietaryNeeds?: ('PURE_VEG' | 'JAIN' | 'HALAL' | 'NO_RESTRICTIONS')[];
  specialOccasion?: 'HONEYMOON' | 'ANNIVERSARY' | 'BIRTHDAY' | 'NONE';
}

export interface MissingFieldDiagnostic {
  fieldKey: string;                   // e.g., "pax.children[0].age"
  severity: 'BLOCKING' | 'RECOMMENDED' | 'OPTIONAL';
  humanDescription: string;           // e.g., "Child age missing: cannot calculate Extra Bed vs No Bed tariff"
  clarificationPromptTemplate: string;// WhatsApp-ready 1-click text
}

export interface TravelRequirement {
  id: string;                         // e.g., "req_th_9021"
  agentId: string;
  sourceChannel: 'WHATSAPP' | 'EMAIL' | 'PORTAL_QUICK_ENTRY';
  rawInquiryText: string;             // Exact unstructured message received
  destinationCorridor: DestinationCorridor;
  cities: { cityName: string; nights: number }[];
  tentativeTravelDate: string;        // ISO Date YYYY-MM-DD
  flexibilityDays: number;            // e.g., 2 (+/- 2 days)
  totalDurationNights: number;
  passengers: Passenger[];
  hotelCategoryRequested: HotelStarCategory;
  mealPlanRequested: MealPlan;
  transferPreference: TransferPreference;
  flightPreference: FlightPreference;
  departureAirport?: string;          // e.g., "BOM", "DEL", "BLR"
  budgetInrMax?: number;              // Target budget cap if mentioned
  preferences: TravellerPreferences;
  completenessScore: number;          // 0 to 100 percentage
  missingFields: MissingFieldDiagnostic[];
  status: 'INGESTED' | 'CLARIFICATION_PENDING' | 'PARSED_READY' | 'QUOTED';
  extractedAt: string;
}
```

---

### 2.3 Supplier & Inventory Classification
Distinguishes between high-risk prepaid commitments and live/on-demand inventory.

```typescript
export type SupplierType = 'DMC' | 'HOTEL_PROPERTY' | 'AIRLINE' | 'TRANSFER_OPERATOR' | 'ACTIVITY_PROVIDER';

export interface Supplier {
  id: string;                         // e.g., "sup_asia_world_th"
  name: string;                       // e.g., "Asia World Enterprise (Thailand)"
  type: SupplierType;
  destination: DestinationCorridor;
  contactEmail: string;
  contactPhone: string;
  paymentTermsDays: number;           // e.g., 14 days credit
  reliabilityScore: number;           // 0.0 to 1.0 (historical voucher accuracy)
  baseCurrency: 'THB' | 'AED' | 'USD' | 'EUR' | 'INR';
}

export type InventorySourceType = 
  | 'PREPAID_COMMITMENT'             // Pre-purchased block inventory (Sunk cost risk)
  | 'CONTRACTED_DIRECT'              // Negotiated season rate sheet (Allocation guaranteed)
  | 'THIRD_PARTY_ON_DEMAND';         // Spot dynamic rate / Bedbank (Subject to instant re-verification)

export type AvailabilityStatus = 
  | 'CONFIRMED_ALLOTMENT'            // Guaranteed room in our block
  | 'AVAILABLE_ON_REQUEST'           // Subject to supplier confirmation (within 4 hours)
  | 'SOLD_OUT';

export interface InventorySource {
  type: InventorySourceType;
  supplierId: string;
  contractCode?: string;             // e.g., "TH-CENTARA-W26-COMMIT"
  commitmentDetails?: {
    totalRoomsCommitted: number;
    roomsSold: number;
    roomsRemaining: number;
    releaseCutoffDate: string;       // ISO 8601 (Date unsold rooms are forfeited)
    sunkCostPenaltyPerRoomInr: number;
    repIncentiveKickerInr: number;   // Bonus for sales rep selling this room
  };
}

export interface HotelRate {
  id: string;                         // e.g., "rate_centara_deluxe_nov26"
  hotelName: string;
  city: string;
  destination: DestinationCorridor;
  starRating: 3 | 4 | 5;
  roomCategory: string;              // e.g., "Deluxe Ocean Facing"
  mealPlan: MealPlan;
  inventorySource: InventorySource;
  
  // Financials
  netRatePerNightForeign: number;
  foreignCurrency: 'THB' | 'AED' | 'USD' | 'EUR' | 'INR';
  appliedFxRateToInr: number;
  fxBufferPercentage: number;         // Mandatory hedge: 1.5% (0.015)
  netRatePerNightInr: number;
  
  // Verification & Trust
  lastVerifiedAt: string;             // ISO 8601 timestamp
  isFresh: boolean;                   // Evaluated: (now - lastVerifiedAt) < 30 days
  availabilityStatus: AvailabilityStatus;
  confidenceScore: number;            // 0.0 to 1.0 (1.0 = pre-purchased block, 0.6 = stale spot rate)
  blackoutDates: string[];            // ISO Date strings YYYY-MM-DD
}
```

---

### 2.4 QuoteLineItem, QuoteVersion & Quote
Represents the itemized financial schedule, versioned iterations, and the root quotation lifecycle.

```typescript
export type LineItemCategory = 'HOTEL' | 'FLIGHT' | 'TRANSFER' | 'ACTIVITY' | 'VISA_INSURANCE';

export interface QuoteLineItem {
  id: string;
  category: LineItemCategory;
  dayNumber?: number;                 // Day 1 to Day N (undefined for flights/insurance)
  title: string;                      // e.g., "Centara Grand Beach Resort Phuket (3 Nights)"
  supplierId: string;
  inventorySourceType: InventorySourceType;
  rateId?: string;
  
  // Cost breakdown
  units: number;                      // e.g., 3 nights or 2 pax
  unitNetCostForeign: number;
  foreignCurrency: 'THB' | 'AED' | 'USD' | 'EUR' | 'INR';
  fxRateToInr: number;
  totalNetCostInr: number;
  
  // Pricing
  markupPercentage: number;           // e.g., 0.12 (12%)
  sellingPriceInr: number;
  
  // Metadata
  isPrepaidCommitment: boolean;
  isOptionalAddon: boolean;
  notes?: string;
}

export type PackageTier = 'SAVER' | 'CURATED_RECOMMENDED' | 'ELITE_LUXURY';

export interface ItineraryDay {
  dayNumber: number;
  date: string;                       // YYYY-MM-DD
  title: string;                      // e.g., "Arrival in Phuket & Private Airport Transfer"
  description: string;
  hotelLineItemId?: string;
  activityLineItemIds: string[];
  mealsIncluded: ('BREAKFAST' | 'LUNCH' | 'DINNER')[];
}

export interface QuoteVersion {
  versionId: string;                  // e.g., "v1", "v2"
  versionNumber: number;
  createdAt: string;
  createdByUserId: string;            // Sales Rep ID
  packageTier: PackageTier;
  tierDisplayName: string;            // e.g., "Curated 4★ with Centara & Dusit"
  
  // Financial Totals
  totalLandNetCostInr: number;
  totalFlightNetCostInr: number;
  totalNetCostInr: number;
  markupPercentage: number;           // e.g., 0.118 (11.8%)
  grossProfitInr: number;
  totalSellingPriceInr: number;
  perPersonSellingPriceInr: number;
  
  // Line Items & Days
  lineItems: QuoteLineItem[];
  itineraryDays: ItineraryDay[];
  inclusions: string[];
  exclusions: string[];
  
  // Commercial Terms
  validityExpiresAt: string;          // ISO 8601 (Typically 48 hours for flights, 7 days land)
  cancellationPolicy: string;
  paymentSchedule: { dueDate: string; amountInr: number; description: string }[];
  assumptions: string[];              // e.g., "Rates based on 2 Adults sharing 1 Double Room"
  
  // Revision Tracking (If v2+)
  diffFromPreviousVersion?: {
    previousVersionId: string;
    priceDeltaInr: number;            // e.g., -8100
    marginDeltaPercentage: number;    // e.g., -0.006
    modifiedLineItemDescriptions: string[];
  };
}

export type QuoteLifecycleStatus = 
  | 'DRAFT'                          // Being assembled in workbench
  | 'PENDING_APPROVAL'               // Margin < 8% or stale supplier rate override
  | 'APPROVED'                       // Manager approved or passed guardrails
  | 'DELIVERED'                      // Dispatched via WhatsApp / Web Link
  | 'VIEWED'                         // Agent opened web proposal
  | 'ENGAGED'                        // Dwell time > 2 min or downloaded PDF
  | 'REVISION_REQUESTED'             // Agent asked for price cut / hotel changes
  | 'BOOKING_LOCKED'                 // Agent confirmed & uploaded payment receipt
  | 'LOST'                           // Agent declined or went silent > 72h
  | 'EXPIRED';                       // Past validity date without engagement

export interface ManagerApprovalState {
  isApprovalRequired: boolean;
  triggerReason?: 'MARGIN_BELOW_FLOOR' | 'STALE_SUPPLIER_RATE' | 'CREDIT_LIMIT_EXCEEDED';
  approvalStatus: 'NOT_REQUIRED' | 'PENDING' | 'APPROVED' | 'REJECTED';
  requestedAt?: string;
  respondedAt?: string;
  approverUserId?: string;            // e.g., "usr_rajesh_mgr"
  approverNotes?: string;
}

export interface Quote {
  id: string;                         // e.g., "qte_th_84920"
  requirementId: string;
  agentId: string;
  destinationCorridor: DestinationCorridor;
  currentVersionId: string;
  versions: QuoteVersion[];           // Array of multi-tier options or revisions
  activeTier: PackageTier;            // Primary tier highlighted to agent
  
  // Lifecycle & Governance
  status: QuoteLifecycleStatus;
  approvalState: ManagerApprovalState;
  
  // Conversion Intelligence
  intentScore: number;                // 0 to 100 calculated behavioral score
  lastActivityAt: string;
  viewCount: number;
  totalDwellSeconds: number;
  clientForwardedDetected: boolean;   // Multiple unique IPs viewed proposal
  
  // Sharing & Links
  webProposalSlug: string;            // e.g., "th-84920" for URL /p/th-84920
  whatsappShareText: string;          // Formatted copy snippet
  
  createdAt: string;
  updatedAt: string;
}
```

---

### 2.5 FollowUpTask
Automated, intent-driven sales action items queued for sales executives.

```typescript
export type TaskPriority = 'CRITICAL_CALL_NOW' | 'HIGH_ATTENTION' | 'MEDIUM_NUDGE' | 'LOW_AUTOMATED';

export interface FollowUpTask {
  id: string;                         // e.g., "task_902"
  quoteId: string;
  agentId: string;
  priority: TaskPriority;
  triggerEvent: 
    | 'HIGH_DWELL_TIME'              // Dwell > 180s on hotel section
    | 'REPEAT_VIEW'                  // Proposal opened 3+ times
    | 'CLIENT_FORWARD_DETECTED'      // Opened from second city/IP
    | 'VALIDITY_EXPIRING_SOON'       // 6 hours before room block release
    | 'AGENT_SILENT_24H';            // 24 hours post delivery with no open
  
  suggestedActionTitle: string;       // e.g., "Call Rohit Mehta — Client reviewing Centara Phuket"
  suggestedMessageCopy: string;       // Pre-composed WhatsApp text
  scheduledFor: string;               // ISO 8601
  status: 'PENDING' | 'EXECUTED' | 'DISMISSED';
  executedAt?: string;
  dismissedReason?: string;
}
```

---

### 2.6 Booking (Post-Quote Confirmation & Ops Handoff)
Represents a finalized, financially locked commercial booking.

```typescript
export interface Booking {
  id: string;                         // e.g., "bkg_2026_0941"
  quoteId: string;
  quoteVersionId: string;
  requirementId: string;
  agentId: string;
  bookingReference: string;           // Customer-facing PNR: "QF-TH-84920"
  
  // Commercials
  totalSellingPriceInr: number;
  totalCostInr: number;
  realizedGrossMarginInr: number;
  realizedMarginPercentage: number;   // e.g., 0.119 (11.9%)
  tokenDepositAmountInr: number;
  tokenDepositProofUrl?: string;
  paymentStatus: 'DEPOSIT_RECEIVED' | 'FULL_PAYMENT_RECEIVED' | 'CREDIT_APPROVED';
  
  // Operational Voucher Status
  opsStatus: 'PENDING_SUPPLIER_CONFIRMATION' | 'VOUCHERS_ISSUED' | 'MODIFIED' | 'CANCELLED';
  assignedOpsExecutiveId: string;     // e.g., "usr_ankit_ops"
  committedInventoryDeducted: boolean;
  
  // Passenger Manifest
  passengers: Passenger[];
  opsHandoverDossier: {
    supplierReferenceCodes: { supplierId: string; refCode: string }[];
    hotelVoucherNumbers: string[];
    flightPnrCodes: string[];
    specialInstructions: string;
  };
  
  confirmedAt: string;
}
```

---

### 2.7 QuoteOutcome & LossReason
Structured telemetry for lost or abandoned quotations to drive pricing and supplier intelligence.

```typescript
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
  competitorName?: string;            // e.g., "TravelBullz", "DidaTravel", "TBO"
  agentFeedbackNotes?: string;
  recordedAt: string;
}
```

---

### 2.8 ActivityEvent (Audit & Telemetry Beacon)
Immutable time-series event log capturing every human and digital touchpoint.

```typescript
export type ActivityEventType = 
  | 'QUOTE_INGESTED'
  | 'CLARIFICATION_SENT'
  | 'QUOTE_DRAFTED'
  | 'MARGIN_OVERRIDE_REQUESTED'
  | 'MARGIN_OVERRIDE_APPROVED'
  | 'PROPOSAL_DISPATCHED_WHATSAPP'
  | 'PROPOSAL_OPENED_BY_AGENT'
  | 'PROPOSAL_OPENED_BY_CLIENT'      // Second IP detected
  | 'DWELL_TIME_HEARTBEAT'
  | 'PDF_EXPORTED'
  | 'REVISION_REQUESTED'
  | 'REVISION_DISPATCHED'
  | 'BOOKING_CONFIRMED'
  | 'QUOTE_MARKED_LOST';

export interface ActivityEvent {
  id: string;                         // UUID
  quoteId: string;
  eventType: ActivityEventType;
  actorType: 'SALES_REP' | 'SALES_MANAGER' | 'RETAIL_AGENT' | 'END_CLIENT' | 'SYSTEM';
  actorId?: string;
  timestamp: string;                  // ISO 8601
  metadata: Record<string, unknown>;  // e.g., { dwellSeconds: 120, ip: "103.21.x.x", deltaInr: -8100 }
}
```

---

### 2.9 RiskFlag & AIRecommendation
Dynamic warnings and actionable intelligence surfaced directly within the workbench.

```typescript
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
  actionPayload: Record<string, unknown>; // e.g., { substituteHotelId: "rate_centara_deluxe" }
}
```
