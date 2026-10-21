# MVP Specification & 2-Day Implementation Scope
## QuoteFlow AI — High-Impact B2B Travel Conversion Workbench

---

| Document Metadata | Details |
| :--- | :--- |
| **Product** | QuoteFlow AI |
| **Version** | 1.0.0 (MVP Baseline) |
| **Time Horizon** | 2-Day Rapid Prototyping & Demonstration Plan |
| **Architectural Focus** | Decision Quality, Commercial Impact & Conversion Telemetry |

---

## 1. Scope Strategy: High Impact Over Feature Bloat

The purpose of this 2-day MVP is **not** to build a throwaway toy or an incomplete fragment of an enterprise ERP. Instead, it is designed to demonstrate **comprehensive product thinking across the full quotation-to-conversion journey** by tackling the hardest operational friction points:

1. Translating messy Indian travel agent WhatsApp inquiries into structured operational packages.
2. Preventing margin bleed through real-time deterministic pricing guardrails.
3. Liquidating pre-purchased perishable room blocks before they expire.
4. Providing behavioral telemetry that tells sales reps exactly when and how to follow up.
5. Providing an interactive simulation harness so recruiters and stakeholders can experience the full end-to-end lifecycle in real time without external API bottlenecks.

---

## 2. In-Scope Modules (P0 Deliverables)

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 QUOTEFLOW AI MVP MODULES                               │
├──────────────────────────┬──────────────────────────┬──────────────────────────────────┤
│ MODULE 1: INGESTION &    │ MODULE 2: PRICING &      │ MODULE 3: 3-TIER VARIANT         │
│ INTELLIGENT EXTRACTION   │ MARGIN GUARDRAILS        │ BUILDER & WORKBENCH              │
│ • Raw WhatsApp paste box │ • Net land + flight cost │ • Saver / Curated / Elite tiers  │
│ • Entity extraction JSON │ • FX buffer (+1.5%)      │ • Day-by-day itinerary preview   │
│ • Completeness score     │ • Margin floor lock (<8%)│ • Contracted inventory badge     │
│ • 1-click clarification  │ • Manager approval modal │ • Inclusions / Exclusions        │
├──────────────────────────┼──────────────────────────┼──────────────────────────────────┤
│ MODULE 4: DUAL DELIVERY &│ MODULE 5: CONVERSION &   │ MODULE 6: REVISION DIFF &        │
│ DIGITAL PROPOSAL         │ TELEMETRY PIPELINE       │ SIMULATION STUDIO                │
│ • WhatsApp formatted card│ • Intent score (0 - 100) │ • Delta calculator for discounts │
│ • Interactive web micro- │ • Telemetry event stream │ • Visual strike-through diff     │
│   site with agent brand  │ • High-priority alerts   │ • Interactive test harness for   │
│ • 1-click PDF stylesheet │ • 1-click smart follow-up│   views, haggling & confirmation │
└──────────────────────────┴──────────────────────────┴──────────────────────────────────┘
```

### Module 1: Ingestion & Intelligent Extraction Workbench
- **Input Interface:** Quick-paste container accepting unstructured WhatsApp messages, forwarded emails, or sample test templates.
- **Extraction Engine:** Instant parsing into structured JSON fields:
  - Destination Corridor, Duration (Nights/Days), City Split.
  - Travel Dates & Flexibility Window.
  - Pax Breakdown (Adults, Children, Child Ages, Infants).
  - Hotel Star Tier, Flight Inclusions (BOM/DEL/BLR), Sightseeing requests.
- **Completeness & Ambiguity Diagnostics:**
  - Evaluates inquiry completeness percentage.
  - Highlights missing operational details (e.g., missing child age or unstated meal plan).
  - Generates a 1-click contextual WhatsApp clarification message.

### Module 2: Dynamic Pricing & Margin Guardrail Panel
- **Cost Calculation Engine:**
  - Land Net Cost (in THB, AED, USD converted to INR with 1.5% FX risk buffer).
  - Airfare Net Cost (BOM/DEL/BLR direct routes).
  - Gross Margin Slider (5% to 25%).
- **Deterministic Guardrails:**
  - `Margin ≥ 12%`: Green (Standard).
  - `8% ≤ Margin < 12%`: Yellow (Soft warning).
  - `Margin < 8%`: Red (Hard Lock) — Dispatches approval request to Rajesh Verma (Sales Manager).
  - Interactive **Manager Approval Modal** allowing 1-click override with audit notes.
- **Committed Inventory Interceptor:**
  - Scans active pre-purchased hotel blocks in Bali, Phuket, Dubai, and Maldives.
  - Promotes matching committed properties with a **"🔥 High Priority Commitment"** tag and sales commission kicker.

### Module 3: 3-Tier Multi-Variant Quote Assembler
- Assembles three packaged options side-by-side:
  1. **Saver Option:** 4-star standard, SIC tours, standard dining.
  2. **Curated Option (Recommended):** 4-star deluxe featuring pre-purchased block inventory, private transfers, premium excursions.
  3. **Elite Option:** 5-star luxury, private speedboat charters, fine dining.
- Generates transparent itemized inclusions and exclusions.

### Module 4: Multi-Channel Delivery & White-Label Web Proposal
- **WhatsApp Formatted Generator:** Generates a clean, emoji-spaced, copy-ready WhatsApp card with package highlights and dynamic proposal link.
- **Interactive Digital Web Proposal:**
  - Hosted digital proposal view accessible via `quoteflow.ai/p/:id`.
  - Dynamic white-labeling: Injects Retail Travel Agent’s name (e.g., *"Rohit Travels, Surat"*), contact details, and custom branding.
  - Tabbed navigation across Tiers, Day-by-Day Itinerary, Hotel Visuals, and Inclusions.
  - Client actions: **[Accept & Request Invoice]** and **[Request Customization]**.
  - Print-friendly CSS for instant 1-click PDF generation.

### Module 5: Conversion Telemetry & Priority Action Pipeline
- **Pipeline Kanban & Table View:**
  - Stages: `Drafted` ➔ `Delivered` ➔ `Viewed` ➔ `Engaged (High Intent)` ➔ `Revision Requested` ➔ `Booking Confirmed` ➔ `Silent / Abandoned`.
- **Behavioral Intent Scoring (0 to 100):**
  - Live calculated score based on open counts, dwell time, and tier focus.
- **Smart Follow-Up Queue:**
  - Flags quotes with Intent Score ≥ 75 that require immediate sales outreach.
  - Generates context-aware WhatsApp follow-up copy tailored to the agent's behavior.

### Module 6: Revision Diff Engine & Haggling Assistant
- Allows sales reps to enter a requested discount or accommodation downgrade.
- Automatically calculates:
  - New Net Cost, New Gross Margin %, Price Delta.
  - Generates a **Visual Diff Card** showing old vs new items with strike-throughs and clear savings callouts.

### Module 7: Interactive Simulation Studio (Recruiter & Reviewer Testbed)
- A built-in control panel allowing anyone evaluating the application to simulate live lifecycle events with 1 click:
  - 👁️ *"Simulate Agent Opening Web Proposal (Surat, IP: 103.21.x.x)"*
  - ⏱️ *"Simulate 3-Minute Dwell on Curated Hotel Tier"*
  - 📥 *"Simulate PDF Download by Retail Agent"*
  - 💬 *"Simulate WhatsApp Counter-Offer (Request ₹8,000 Discount)"*
  - 🔒 *"Simulate Agent Uploading Deposit & Confirming Booking"*
  - ❄️ *"Simulate 72h Agent Silence"*

---

## 3. Explicit Out-of-Scope (Deferred to Phase 2)

To ensure razor-sharp focus and zero demo friction within the 2-day timeline, the following elements are explicitly deferred:
- ❌ **Live WhatsApp Business API Key Provisioning:** Real-world Meta Cloud API setup requires 7-14 days for business verification. The MVP features 1-click clipboard integration, deep links, and the Simulation Studio.
- ❌ **Live GDS Flight Ticketing (Amadeus / Sabre):** Live PNR issuance is replaced with realistic cached airline fare tables and flight inclusion rules.
- ❌ **Full General Ledger / Accounting Integration:** Tally/Quickbooks integration is deferred; the system exports clean structured JSON/CSV booking dossiers for accounting handoff.

---

## 4. Realistic Seed Dataset Specifications

The MVP database will be pre-seeded with high-fidelity, production-grade travel industry records:

### 4.1 Destination Corridors & Sample Itineraries
1. **Thailand (Phuket 3N + Krabi 2N):**
   - *Committed Property:* Centara Grand Beach Resort Phuket (Deluxe Ocean Facing) + Dusit Thani Krabi Beach Resort.
   - *Tours:* Phi Phi Island Speedboat with National Park Fee, Krabi 4-Island Sunset Tour, Private Airport Transfers.
2. **Dubai (4N 5D):**
   - *Committed Property:* Voco Dubai Sheikh Zayed Road (Standard / Deluxe).
   - *Tours:* Burj Khalifa 124th Floor Off-Peak, Premium Desert Safari with BBQ Dinner, Marina Dhow Cruise with Transfers.
3. **Bali (Seminyak 3N + Ubud 3N):**
   - *Committed Property:* The Kayon Jungle Resort Ubud + W Bali Seminyak.
   - *Tours:* Nusa Penida West Coast Tour, Kintamani Volcano & Tegenungan Waterfall, Sacred Monkey Forest.
4. **Maldives (3N 4D Luxury):**
   - *Committed Property:* Oblu Select Lobigili / Sun Siyam Olhuveli (Water Villa with Pool, All-Inclusive).
   - *Transfers:* Shared Speedboat / Seaplane transfers from Malé Velana International Airport.

### 4.2 Seeded B2B Travel Agent Accounts
- **Rohit Travels (Surat, Gujarat):** Tier-2 Agent, Family & Budget focused, high negotiation frequency.
- **Apex Voyages (Connaught Place, New Delhi):** Tier-1 High Volume, Corporate & MICE focused, sensitive to turnaround time.
- **Skylink Luxury Holidays (Bandra, Mumbai):** Tier-1 Luxury Curators, Honeymoon packages, high margin tolerance.
- **Royal South Escapes (Indiranagar, Bangalore):** Tier-2 Growing Partner, Tech-savvy, high mobile proposal engagement.

---

## 5. Technology Stack & Architecture

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 QUOTEFLOW TECH STACK                                   │
├──────────────────────────┬──────────────────────────┬──────────────────────────────────┤
│ FRONTEND FRAMEWORK       │ STYLING & DESIGN SYSTEM  │ STATE & PERSISTENCE              │
│ • React 18 / Vite        │ • Modern Vanilla CSS /   │ • High-performance in-memory    │
│ • TypeScript             │   Tailwind Design Tokens │   reactive state manager with    │
│ • Lucide Icons           │ • Mobile-first responsive│   Local Storage hydration        │
│ • Responsive Dashboards  │ • Clean glassmorphism UI │ • Structured Seed JSON Store     │
├──────────────────────────┼──────────────────────────┼──────────────────────────────────┤
│ PARSING & AI ENGINE      │ PRICING & GUARDRAILS     │ TELEMETRY & SIMULATOR            │
│ • Zero-dependency Schema │ • Floating-point FX      │ • Event Bus tracking views, dwell│
│   Extraction Engine with │   converter with buffers │   time, and section focus        │
│   fallback heuristics    │ • Deterministic margin   │ • Live state-mutation harness    │
│ • Regex + NLP tokenizers │   rules & manager locks  │   for real-time demo events      │
└──────────────────────────┴──────────────────────────┴──────────────────────────────────┘
```

---

## 6. Two-Day Implementation Roadmap

```
  DAY 1: FOUNDATION, EXTRACTION & DYNAMIC PRICING ENGINE
  ├── 09:00 - 11:00 : Architecture, Vite + React + TypeScript workspace setup, CSS tokens.
  ├── 11:00 - 13:30 : Seed data ingestion (Thailand, Bali, Dubai, Maldives packages & agents).
  ├── 13:30 - 15:30 : Module 1 (WhatsApp paste parser, schema extraction, ambiguity flags).
  ├── 15:30 - 18:00 : Module 2 (Dynamic pricing engine, FX buffer, margin floor lock & approval modal).
  └── 18:00 - 20:30 : Module 3 (3-tier package assembler: Saver / Curated / Elite).

  DAY 2: WORKBENCH UI, PROPOSAL, TELEMETRY & SIMULATION TESTBED
  ├── 09:00 - 12:00 : Module 4 (Sales Workbench UI + White-label Web Proposal Microsite + PDF styles).
  ├── 12:00 - 14:30 : Module 5 (Conversion pipeline board, Intent scoring, Follow-up queue).
  ├── 14:30 - 17:00 : Module 6 & 7 (Revision Diff Engine + Interactive Simulation Studio).
  ├── 17:00 - 19:00 : End-to-end integration testing, polish, responsive checks.
  └── 19:00 - 20:30 : Demo script verification, README documentation, and GitHub release push.
```

---

## 7. End-to-End Demonstration Script (The Recruiter Walkthrough)

| Step | Time | Screen / Action | What the Demonstrator Shows | Key Value Highlighted |
| :--- | :--- | :--- | :--- | :--- |
| **1** | 0:00 - 1:00 | **Ingestion Box** | Paste raw WhatsApp message from *Rohit Travels Surat*. Click **[Parse Inquiry]**. | Instant extraction of destination, pax, and dates. Missing child bed type auto-flagged with 1-click clarification copy. |
| **2** | 1:00 - 2:30 | **Pricing & Guardrails** | Review cost breakdown. View **"🔥 Priority Block Commitment"** badge for Centara Phuket. | Shows how system pushes pre-purchased inventory to avoid write-downs. |
| **3** | 2:30 - 3:15 | **Margin Lock Demo** | Slide margin down to 6%. Red lock triggers. Open **[Manager Approval Modal]** as Rajesh Verma. | Demonstrates governance preventing sales reps from rogue discounting. |
| **4** | 3:15 - 4:00 | **3-Tier Proposal Preview** | Preview Saver, Curated, Elite options. Show white-label header with *Rohit Travels* logo. | Elevates B2B agent trust; premium multi-tier upsell capability. |
| **5** | 4:00 - 5:00 | **Simulation Studio** | Tap *"Simulate Agent Opening Proposal 2x (Surat IP)"* and *"Simulate 3m Dwell on Curated Tier"*. | Quote leaps to Top of Follow-Up Queue with Intent Score 88. AI draft nudge pops up. |
| **6** | 5:00 - 6:00 | **Revision Diff Engine** | Agent asks for ₹8,000 discount. Run Revision Diff. Select Hotel swap option. | Shows instant strike-through diff preserving margin without rebuilding from scratch. |
| **7** | 6:00 - 6:45 | **Booking Lock & Handoff** | Click **[Confirm Booking]**. Pre-purchased block inventory decrements. View Ops Dossier. | Clean handover to Ankit in Operations with zero voucher discrepancies. |
