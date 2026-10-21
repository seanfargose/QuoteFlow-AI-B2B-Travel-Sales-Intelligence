# Product Requirements Document (PRD)
## QuoteFlow AI — B2B Travel Sales Intelligence & Conversion Workbench

---

| Document Metadata | Details |
| :--- | :--- |
| **Product Name** | QuoteFlow AI |
| **Document Version** | 1.0.0 (Pre-Implementation Baseline) |
| **Author** | Senior Product Manager & AI Automation Architect |
| **Target Audience** | Engineering, Product, Sales Leadership, Operations |
| **Status** | Awaiting Architectural Review |

---

## 1. Executive Summary & Market Context

The B2B leisure travel distribution market in India operates on thin margins (7% to 15% net gross margin) across outbound international holiday corridors, predominantly:
- **Thailand** (Phuket, Krabi, Bangkok, Koh Samui)
- **United Arab Emirates** (Dubai, Abu Dhabi)
- **Vietnam** (Da Nang, Hanoi, Halong Bay, Phu Quoc)
- **Indonesia** (Bali: Ubud, Seminyak, Nusa Penida)
- **Maldives** (Resort atolls, speedboats/seaplane transfers)

The operating company acts as a wholesale tour operator / B2B consolidator selling packaged itineraries to thousands of retail travel agents across Tier 1, Tier 2, and Tier 3 Indian cities.

### The "Two-Minute Quote" Paradox
The company already possesses an AI engine capable of assembling quote drafts in approximately two minutes leveraging a repository of 70,000+ historical quotations. However, **quote generation velocity has ceased to be a competitive differentiator**. In fact, unconstrained rapid quote generation has exacerbated several systemic operational failures:
1. **The Spray-and-Pray Trap:** Sales executives churn out 40–60 raw quotes daily without qualification, flooding retail travel agents with uncalibrated itineraries.
2. **Margin Erosion:** Relying on historical pricing without live foreign exchange calibration (USD/THB/AED vs INR) or real-time supplier tariff validation causes fatal under-quoting.
3. **Perishable Commitment Write-offs:** Wholesalers frequently pre-purchase seasonal hotel room blocks and airline charters in high-demand hubs (e.g., Bali Eid/Diwali holidays, Phuket New Year). Legacy AI quoting does not prioritize liquidating these sunk commitments, leading to 100% loss upon expiration.
4. **The WhatsApp "Black Hole":** Over 85% of B2B quotations are delivered as static PDF attachments into unmonitored WhatsApp threads. Sales reps have no visibility into whether the agent opened the proposal, shared it with the end-traveler, or discarded it for a competitor's quote.
5. **Quote Attrition & Follow-Up Collapse:** 55% of drafted quotes receive zero structured follow-up. Retail agents go silent, and sales executives cannot distinguish high-intent deals from dead inquiries.

QuoteFlow AI shifts the operational paradigm from **"how fast can we draft an itinerary"** to **"how effectively can we guide an inquiry from unstructured ingestion to profitable booking confirmation."**

---

## 2. Problem Statement & Root Cause Analysis

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               THE ROOT CAUSE CASCADE                                   │
└────────────────────────────────────────────────────────────────────────────────────────┘

  [Unstructured Ingestion] ────────► [Historical AI Hallucination & Stale Pricing]
         │                                            │
         ▼                                            ▼
  [Vague Requirements]                       [Margin Bleed / Price Shocks]
  - No pax ages                              - Stale DMC contracts
  - Unknown flight status                    - Currency shifts (USD/INR)
  - Vague budget tier                        - Non-promoted commitments
         │                                            │
         └────────────────────┬───────────────────────┘
                              ▼
                 [Blind PDF Generation]
                 - No interactive options
                 - Static PDF on WhatsApp
                              ▼
                 [The Follow-up Black Hole]
                 - Zero read telemetry
                 - Reps overwhelmed with 50+ chats
                 - High-value deals lost to silence
```

### 2.1 Problem Decomposition

| # | Business Problem | Underlying Root Cause | Business Impact |
| :--- | :--- | :--- | :--- |
| **P1** | **High Ambiguity at Requirement Intake** | Retail agents communicate via colloquial, fragmented WhatsApp messages (e.g., *"Pls send 5N Phuket Krabi for 2 adults 1 child Nov 1st week budget good hotel"*). | Sales reps spend 30-45 minutes in back-and-forth messaging asking for child ages, flight inclusion, bed types, and transfer preferences. |
| **P2** | **Margin Erosion via Stale Historical Data** | The legacy engine drafts quotes using historical snapshots without verifying DMC contract seasonality, dynamic room supplements, or live FX rates. | If a quote is honored at stale rates, the company loses 3–8% net margin or is forced to renege on the quotation, destroying agent trust. |
| **P3** | **Unsold Prepaid / Committed Inventory** | Contracted block allotments (pre-purchased inventory with DMCs and airlines) are buried in separate spreadsheets, disconnected from the quotation engine. | Massive financial write-downs at month-end for unused hotel rooms and guaranteed flight seats in destinations like Bali and Maldives. |
| **P4** | **Zero Conversion Telemetry & Silent Agents** | Quotes are sent as static PDFs or raw text messages. Sales reps have no clue if the travel agent viewed the file, forwarded it to their client, or where they spent time. | Inability to prioritize follow-ups. Reps chase cold inquiries while high-intent travelers who opened the quote 5 times slip away to competitors. |
| **P5** | **Friction-Heavy Iterations & Haggling** | B2B travel sales involve 2 to 4 rounds of bargaining (*"Reduce price by 8k", "Change 4-star to 5-star", "Remove lunch"*). Reps calculate diffs manually on scratchpads. | High error rate during revisions, delayed turnaround time (TAT increases from 2 hours to 24 hours), and accidental omission of cost items. |
| **P6** | **Sales Team Overload & Cognitive Fatigue** | Each sales rep manages 30–50 active WhatsApp conversations across multiple browser tabs, leading to missed callbacks, unlogged lead stages, and burnout. | Rep turnover, inconsistent customer experience, and inability for management to forecast pipeline accurately. |

---

## 3. User Personas & Jobs To Be Done (JTBD)

```
┌─────────────────────────┐  ┌─────────────────────────┐  ┌─────────────────────────┐
│     Priya Sharma        │  │      Rajesh Verma       │  │     Ankit Kulkarni      │
│  Senior Sales Executive │  │   Head of Sales (Mgr)   │  │  Operations Executive   │
│  "Speed + Commission"   │  │  "Margin + Conversion"  │  │  "Zero Booking Errors"  │
└─────────────────────────┘  └─────────────────────────┘  └─────────────────────────┘
```

### 3.1 Persona 1: Priya Sharma — Senior B2B Sales Executive (Account Manager)
- **Demographics:** 28 years old, handles 45 travel agent accounts across Western India (Mumbai, Pune, Ahmedabad).
- **Core Motivation:** Maximizing monthly booking GMV to achieve commission incentives; minimizing tedious clerical tasks.
- **Pain Points:**
  - Juggling 40+ unstructured WhatsApp requests while on calls.
  - Manual recalculation of package prices when agents haggle over ₹3,000 discounts.
  - Forgetting which agent to follow up with after sending 15 PDFs in a morning.
- **Jobs To Be Done (JTBD):**
  > *"When an agent messages me a rough travel request, I want to paste their message and immediately get a clean, priced, multi-tier itinerary with clear missing-field prompts, so that I can respond in under 3 minutes with zero math errors."*
  > *"When an agent receives my quote, I want to know the exact moment they open it and what they linger on, so that I can call them at the psychological peak of interest."*

### 3.2 Persona 2: Rajesh Verma — Head of Sales / Sales Manager
- **Demographics:** 42 years old, manages a team of 14 sales executives across all 5 destinations.
- **Core Motivation:** Driving aggregate sales conversion rate from 12% to 22%, protecting minimum profit margins (10%+), and ensuring SLA compliance.
- **Pain Points:**
  - Complete lack of pipeline visibility; deals live in individual sales reps' personal WhatsApp chats.
  - Reps cutting margins below floor rates just to close deals and hit volume quotas.
  - Zero systematic data on why quotes are lost (pricing vs availability vs flight timings).
- **Jobs To Be Done (JTBD):**
  > *"When sales executives adjust margins or apply discounts, I want automated guardrails that enforce margin floors and route sub-threshold exceptions to me for 1-click approval, so that our blended company margin stays above 11%."*
  > *"When quotes expire or go silent, I want automated classification of loss reasons and sales rep response velocity, so that I can coach underperforming reps and identify supplier pricing disconnects."*

### 3.3 Persona 3: Ankit Kulkarni — Operations & Contracting Executive
- **Demographics:** 34 years old, coordinates bookings with local DMCs in Bangkok, Bali, Dubai, and Malé.
- **Core Motivation:** Ensuring 100% voucher accuracy, zero room-rate variance between quote and supplier confirmation, and zero perishable inventory write-offs.
- **Pain Points:**
  - Sales reps quoting hotels where our contracted allocation has already run out, forcing operations to buy at spot rates at a loss.
  - Receiving vague booking confirmations with missing traveler passport details or unstated bed types (twin vs double).
  - High stress during seasonal cut-off dates for prepaid block commitments.
- **Jobs To Be Done (JTBD):**
  > *"When sales reps generate quotes for destinations where we have committed prepaid inventory, I want the system to dynamically prioritize those exact properties with margin bonuses, so that our contracted commitments are 100% utilized before we book third-party hotels."*
  > *"When an agent confirms a booking, I want a structured handoff containing itemized supplier codes, net rates, room categories, and traveler identity documents, so that my team can issue vouchers in 15 minutes without manual re-keying."*

---

## 4. Product Vision & Architecture Overview

```
                                  QUOTEFLOW AI ARCHITECTURE
  
 ┌────────────────────────────────────────────────────────────────────────────────────────┐
 │ 1. INGESTION & PARSING LAYER                                                           │
 │  - WhatsApp Webhook / Copy-Paste Ingestion                                             │
 │  - Forwarded Email & PDF RFP Parser                                                    │
 └──────────────────────────────────────────┬─────────────────────────────────────────────┘
                                            ▼
 ┌────────────────────────────────────────────────────────────────────────────────────────┐
 │ 2. INTELLIGENCE & EXTRACTION ENGINE                                                    │
 │  - LLM Named Entity Recognition (Destinations, Dates, Pax, Ages, Budget, Tier)         │
 │  - Ambiguity Detector & Clarification Prompt Generator                                │
 └──────────────────────────────────────────┬─────────────────────────────────────────────┘
                                            ▼
 ┌────────────────────────────────────────────────────────────────────────────────────────┐
 │ 3. DYNAMIC PRICING, COMMITTED INVENTORY & GUARDRAILS ENGINE                            │
 │  - Contracted Inventory Allocator (Pre-purchased block priority)                       │
 │  - Real-Time Supplier Tariff & FX Calibration (USD/THB/AED to INR)                     │
 │  - Deterministic Margin Guardrail (Floor 8%, Target 12%, Hard Lock <6%)                │
 └──────────────────────────────────────────┬─────────────────────────────────────────────┘
                                            ▼
 ┌────────────────────────────────────────────────────────────────────────────────────────┐
 │ 4. MULTI-TIER QUOTE WORKBENCH & DIFF ENGINE                                            │
 │  - 3-Tier Assembly: Budget (Saver), Curated (Recommended), Luxury (Elite)              │
 │  - Real-Time Revision & Haggling Diff Engine                                           │
 └──────────────────────────────────────────┬─────────────────────────────────────────────┘
                                            ▼
 ┌────────────────────────────────────────────────────────────────────────────────────────┐
 │ 5. DELIVERY & TELEMETRY ENGINE                                                         │
 │  - WhatsApp Interactive Card + Dynamic Web Proposal Link                               │
 │  - Engagement Telemetry (Page Views, Dwell Time, Section Focus, PDF Download)          │
 └──────────────────────────────────────────┬─────────────────────────────────────────────┘
                                            ▼
 ┌────────────────────────────────────────────────────────────────────────────────────────┐
 │ 6. CONVERSION ACCELERATOR & OPS HANDOFF                                                │
 │  - Automated Intent Scoring & Priority Follow-Up Triggers                              │
 │  - Booking Confirmation Lock & Ops Voucher Handoff Package                             │
 │  - Lost / Silent Deal Post-Mortem Analytics                                            │
 └────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Automation Taxonomy: The 4-Pillar Operating Model

To avoid both **over-automation** (which creates liability and destroys supplier relationships) and **under-automation** (which overwhelms reps), QuoteFlow AI categorizes every action across four explicit operational pillars:

```
┌───────────────────────┬───────────────────────┬───────────────────────┬───────────────────────┐
│     Pillar 1:         │      Pillar 2:        │      Pillar 3:        │      Pillar 4:        │
│   DETERMINISTIC       │       AI / LLM        │     HUMAN JUDGMENT    │   EXPLICIT APPROVAL   │
│    AUTOMATION         │     INTELLIGENCE      │       (IN THE LOOP)   │     (MANAGERIAL)      │
├───────────────────────┼───────────────────────┼───────────────────────┼───────────────────────┤
│ • Math calculations   │ • Unstructured text   │ • Selecting final     │ • Margin discount     │
│ • Net rate lookup     │   entity extraction   │   itinerary variant   │   below floor (<8%)   │
│ • FX conversion       │ • Ambiguity detection │ • Personalizing note  │ • Credit limit        │
│ • Margin % verification│ • Natural language   │   to B2B travel agent │   extension for agent │
│ • Web proposal expiry │   clarification Qs    │ • Assessing agent     │ • Quoting non-contract│
│ • View tracking       │ • Follow-up message   │   creditworthiness    │   hotel during peak   │
│   telemetry           │   copy generation     │ • Negotiation &       │   blackout periods    │
│ • WhatsApp webhooks   │ • Lost deal autopsy   │   relationship rapport│                       │
└───────────────────────┴───────────────────────┴───────────────────────┴───────────────────────┘
```

### 5.1 Pillar 1: Deterministic Automation (Zero-Tolerance Rules)
- **Margin Calculations:** Gross Margin = `(Selling Price - Total Net Cost) / Selling Price`. Strict floating-point arithmetic with currency conversion buffers.
- **Contract Rates & Seasonality Dates:** Applying high-season, peak-season, and shoulder-season tariffs strictly based on travel date ranges.
- **Block Inventory Decrements:** When a quote is locked/confirmed, committed inventory counter decrements deterministically in the database.
- **Telemetry Event Logging:** Timestamped triggers for `quote_created`, `quote_delivered`, `link_opened`, `section_viewed`, `itinerary_downloaded`.

### 5.2 Pillar 2: AI & LLM Intelligence (Probabilistic Extraction & Synthesis)
- **Natural Language Parsing:** Ingests unformatted, multilingual (Hinglish/English) WhatsApp messages and extracts structured JSON schemas.
- **Ambiguity Detection:** Detects implicit risks (e.g., flight arrival after 23:00 requires private late-night transfer; child without age could mean infant or 11-year-old requiring adult extra bed).
- **Context-Aware Follow-Up Copywriting:** Generates personalized WhatsApp nudges based on client engagement behavior (e.g., *"Hi Rajesh, noticed you were reviewing the private pool villa in Ubud. Would you like me to hold the room allocation until 4 PM?"*).
- **Lost Deal Root Cause Classification:** Analyzes chat logs to categorize lost deals into: Price Objection, Flight Timing, Destination Pivot, Competitor DMC, or Agent Silence.

### 5.3 Pillar 3: Human Judgment (Sales Representative Autonomy)
- **Agent Relationship Calibration:** The sales rep knows if Agent X consistently demands a 2% rebate or if Agent Y only cares about 5-star Indian dining options.
- **Variant Selection:** Deciding whether to send all 3 tiers or a single customized option based on the agent's profile.
- **Direct Voice Calling:** Deciding when to pick up the phone when high-intent telemetry alerts fire.

### 5.4 Pillar 4: Explicit Approval (Governance & Risk Controls)
- **Sub-Floor Margin Override:** Any quote where gross profit margin drops below 8% is automatically locked. The sales rep cannot transmit the quote until the Sales Manager approves it via an in-app 1-click modal.
- **Stale Rate Override:** If a DMC net rate has not been updated within 30 days and the destination is in peak surge, operations sign-off is required before client quote dispatch.
- **Expired Commitment Allocation:** Releasing or re-allocating pre-purchased block inventory requires Operations Manager sign-off.

---

## 6. Business Risk Matrix & Mitigation Strategies

```
┌───────────────────────────┬────────────┬────────────┬──────────────────────────────────────────────────────────────┐
│ Business Risk             │ Likelihood │ Severity   │ Mitigation in QuoteFlow AI                                   │
├───────────────────────────┼────────────┼────────────┼──────────────────────────────────────────────────────────────┤
│ 1. Stale Supplier Rates   │ High       │ Critical   │ Deterministic rate expiration tags; auto-flag contracts >30  │
│    & Sudden Rate Hikes    │            │            │ days old; dynamic FX buffer of +1.5% on currency conversion. │
├───────────────────────────┼────────────┼────────────┼──────────────────────────────────────────────────────────────┤
│ 2. Margin Bleed from      │ High       │ High       │ Hard margin floor (8%) enforced in code; manager approval    │
│    Uncontrolled Haggling  │            │            │ workflow for exceptions; live margin calculator during edits.│
├───────────────────────────┼────────────┼────────────┼──────────────────────────────────────────────────────────────┤
│ 3. Perishable Commitment  │ Medium     │ Critical   │ "Push Inventory" recommendation badge in builder; 1.5% extra │
│    Write-Downs (Dead Inv) │            │            │ rep commission kicker for selling pre-purchased room blocks. │
├───────────────────────────┼────────────┼────────────┼──────────────────────────────────────────────────────────────┤
│ 4. LLM Hallucinations in  │ Medium     │ High       │ Strict JSON schema extraction; inclusions bound to validated │
│    Itinerary Inclusions   │            │            │ catalog items (no free-form hallucinated hotel amenities).   │
├───────────────────────────┼────────────┼────────────┼──────────────────────────────────────────────────────────────┤
│ 5. Sales Rep Burnout &    │ High       │ Medium     │ AI-prioritized action queue; replaces 50 scattered chats     │
│    Lead Drop-Off          │            │            │ with an intent-ranked Kanban; 1-click WhatsApp messaging.    │
└───────────────────────────┴────────────┴────────────┴──────────────────────────────────────────────────────────────┘
```

---

## 7. Comprehensive Success Metrics Framework

QuoteFlow AI measures impact across three strategic dimensions: **Commercial Performance**, **Operational Efficiency**, and **Risk/Quality Guardrails**.

```
                         SUCCESS METRICS ARCHITECTURE
  
       COMMERCIAL (North Star)          OPERATIONAL EFFICIENCY           RISK GUARDRAILS
  ┌──────────────────────────────┐  ┌──────────────────────────────┐  ┌──────────────────────────────┐
  │ • Quote-to-Book Conversion   │  │ • Ingestion-to-Quote TAT     │  │ • Sub-floor Margin Leaks     │
  │   Rate (Target: 14% -> 22%)  │  │   (Target: 45m -> 4m)        │  │   (Target: 0.0%)             │
  │ • Blended Net Margin %       │  │ • Revision TAT               │  │ • Supplier Rate Variance     │
  │   (Target: 9.2% -> 12.1%)    │  │   (Target: 3.5h -> 6m)       │  │   Disputes (<0.2%)           │
  │ • Committed Inventory Sales  │  │ • High-Intent Follow-Up      │  │ • Expired Quote Honored      │
  │   (Target: 68% -> 94%)       │  │   SLA within 30m (>90%)      │  │   Incidents (0 incidents)    │
  └──────────────────────────────┘  └──────────────────────────────┘  └──────────────────────────────┘
```

### 7.1 North Star Metric
- **Profitable Conversion Rate (%):** Defined as `(Confirmed Bookings with Net Margin ≥ 10%) / (Total Ingested Inquiries)`.
  - *Baseline:* 11.4%
  - *Target with QuoteFlow AI:* 21.5% within 90 days of deployment.

### 7.2 Secondary Operational Metrics
- **Revision Turnaround Time (TAT_rev):** Time taken from an agent requesting a change to the revised quote being delivered. Target: **< 5 minutes** (down from 3.5 hours).
- **Committed Inventory Liquidation Rate:** Percentage of pre-purchased room nights and seats sold before cut-off date. Target: **> 92%** (down from 28% unliquidated write-downs).
- **Follow-up SLA Execution:** Percentage of quotes viewed ≥ 2 times by an agent that receive a targeted rep follow-up within 60 minutes. Target: **> 85%**.

### 7.3 Guardrail Metrics
- **Margin Leakage Incidents:** Zero quotes dispatched with gross margin < 8% without explicit Sales Manager authorization.
- **Supplier Price Dispute Rate:** Under 0.5% of confirmed bookings experience rate discrepancies between quoted supplier cost and supplier voucher invoice.

---

## 8. Assumptions, Constraints & Non-Goals

### 8.1 Key Assumptions
1. **WhatsApp Remains the Primary B2B Channel:** Travel agents will not log into complex desktop portals to browse quotes. Quotations and alerts must be delivered directly into their WhatsApp workflow.
2. **Historical Quotes are Baseline References, Not Ground Truth:** The 70,000 historical quotes provide excellent day-by-day itinerary structures and activity combinations, but **never** definitive current pricing.
3. **Supplier Connectivity is Hybrid:** While some hotel chains offer direct APIs, local DMCs in Thailand, Bali, and Vietnam primarily operate via weekly contracted Excel sheets and offline allocations.

### 8.2 Explicit Non-Goals (What We Are NOT Building)
- ❌ **Direct B2C Consumer Booking Portal:** QuoteFlow AI is exclusively tailored for B2B wholesaler-to-retail-agent workflows.
- ❌ **Full Accounting & General Ledger:** We do not replace Tally, Zoho Books, or SAP. We export structured invoice/voucher payloads to downstream ERPs upon booking confirmation.
- ❌ **Autonomous Flight GDS Ticketing:** We calculate flight inclusions using live or budgeted airfare rules, but do not perform automatic PNR issuance via Amadeus/Sabre in this scope.
- ❌ **100% Unsupervised "No-Human" Autonomous Booking:** Travel distribution involves high liability; human confirmation is mandatory prior to non-refundable supplier voucher generation.
