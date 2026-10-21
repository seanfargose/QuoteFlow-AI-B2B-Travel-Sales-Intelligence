# User Journeys & State Transition Architecture
## QuoteFlow AI — End-to-End B2B Travel Sales Lifecycle

---

| Document Metadata | Details |
| :--- | :--- |
| **Product** | QuoteFlow AI |
| **Lifecycle Coverage** | Ingestion ➔ Extraction ➔ Clarification ➔ Pricing ➔ Delivery ➔ Telemetry ➔ Haggling ➔ Booking / Loss |
| **Version** | 1.0.0 (Pre-Implementation Baseline) |
| **Primary Actors** | Priya (Sales Executive), Rajesh (Sales Manager), Ankit (Ops), Retail Travel Agent (External) |

---

## 1. Journey Lifecycle Map

```
  [Stage 1: INTAKE]
  WhatsApp / Email Raw Ingestion
         │
         ▼
  [Stage 2: EXTRACTION]
  LLM Schema Parsing + Entity Resolution
         │
         ├─── Missing Critical Info? ──► [Stage 3: CLARIFICATION LOOP]
         │                               Agent Prompted for Child Age / Dates
         ▼
  [Stage 4: HISTORICAL RETRIEVAL & ASSEMBLY]
  70k Quote Vector Search + Contracted Block Inventory Match
         │
         ▼
  [Stage 5: DYNAMIC PRICING & GUARDRAILS]
  Net DMC Tariffs + FX Buffer + Tiered Markup + Margin Floor Check
         │
         ├─── Margin < 8%? ────────────► [EXPLICIT APPROVAL]
         │                               Manager Modal Sign-off
         ▼
  [Stage 6: WORKBENCH REVIEW & MULTI-TIER BUNDLING]
  Rep fine-tunes Saver / Curated / Elite Options
         │
         ▼
  [Stage 7: MULTI-CHANNEL DELIVERY]
  WhatsApp Interactive Card + Digital Web Proposal Link + PDF
         │
         ▼
  [Stage 8: TELEMETRY & INTENT-DRIVEN FOLLOW-UP]
  Open Tracking ➔ Dwell Heatmaps ➔ Algorithmic Rep Follow-Up Queue
         │
         ├──────────────────────────────────────────┐
         ▼                                          ▼
  [Stage 9: HAGGLING & REVISION DIFF]        [Stage 10B: LOST / SILENT AUTOPSY]
  Agent requests discount / hotel changes    No action in 72h ➔ Reason Tagging ➔
  Real-time Margin & Inclusion Delta View    Archival & Supplier Feedback
         │
         ▼
  [Stage 10A: BOOKING CONFIRMATION & OPS HANDOFF]
  Deposit Verification ➔ Inventory Decrement ➔ Supplier Voucher Pack
```

---

## 2. Detailed Lifecycle Stages (1 to 10)

### STAGE 1: Requirement Intake (Multi-Channel Ingestion)
- **Actor:** Retail Travel Agent (Sender) ➔ Priya Sharma (Sales Executive).
- **Channels:** WhatsApp Business Webhook, Copied WhatsApp Chat, Forwarded Email, or Manual Quick-Entry Form.
- **Realistic Scenario:**
  Agent *Rohit Travels (Surat)* pastes this message into Priya's WhatsApp:
  > *"Hey Priya, need best rate for client: Phuket Krabi 5N 6D, travel around 12 Nov, 2 adults + 1 kid (7 yrs). 4-star hotels with breakfast, private transfers, Phi Phi Island speed boat, 4 island Krabi. Also quote with and without flights from Mumbai. Budget around 1.3 to 1.5 Lakhs total."*
- **System Actions:**
  - Ingestion buffer normalizes text, strips emojis/formatting artifacts, and creates a new Lead Session with initial status `INGESTED`.
  - Timestamp, Agent Account ID, Source Channel, and Historical Agent Tier (`Tier-2 Partner, 14% past conversion`) are attached.
- **Failure Mode & Fallback:** Unreadable image/screenshot of handwritten itinerary ➔ OCR fallback engine triggers or flags manual review ticket to Priya within 60 seconds.

---

### STAGE 2: Information Extraction & Entity Resolution
- **Actor:** Intelligence Layer (AI) + Priya (Reviewer).
- **System Actions (AI):**
  - Prompted LLM parses unstructured text into strict JSON schema:
    ```json
    {
      "destination_corridor": "Thailand (Phuket + Krabi)",
      "duration": { "nights": 5, "days": 6 },
      "split": [ { "city": "Phuket", "nights": 3 }, { "city": "Krabi", "nights": 2 } ],
      "dates": { "tentative_start": "2026-11-12", "flexibility_days": 2 },
      "pax": { "adults": 2, "children": 1, "child_ages": [7], "infants": 0 },
      "hotel_tier_requested": "4-Star",
      "meal_plan": "Bed & Breakfast",
      "flight_preference": "Quote both (Mumbai BOM departure)",
      "transfer_type": "Private",
      "inclusions_requested": ["Phi Phi Island by Speedboat", "Krabi 4 Island Tour"],
      "budget_inr_max": 150000
    }
    ```
- **Ambiguity Detection:**
  - Evaluates completeness against travel operational requirements.
  - *Detected Completeness Score:* **94%**. (Dates, pax, child age 7, cities, transfers all specified).
  - *Potential Ambiguities:* Does 7-year-old child require an Extra Bed (CWB) or Child No Bed (CNB)?

---

### STAGE 3: Clarification & Missing Info Loop
- **Actor:** System (AI Generator) ➔ Priya (Sender) ➔ Retail Travel Agent.
- **Workflow:**
  - If completeness score < 80% (e.g., child age missing, no travel date range), the system **does not block** quotation. Instead, it generates a smart 1-click WhatsApp clarification message.
  - *Example AI Generated Message:*
    > *"Hi Rohit! Working on your Phuket + Krabi quote for 12 Nov right now. Just a quick check: Does the 7-year-old child need a separate extra bed in the hotel room, or will they share parents' bed? (Helps me save you ₹6,500 on the hotel cost)."*
  - Priya clicks **[Send via WhatsApp]** or toggles default assumption (`Child With Bed - CWB`) to proceed immediately without delay.

---

### STAGE 4: Historical Retrieval & Dynamic Assembly
- **Actor:** System (Semantic Engine + Inventory Allocator).
- **Workflow:**
  1. **Historical Quote Query:** System searches 70,000+ past quote vectors for `Phuket (3N) + Krabi (2N)` family packages with 4-star ratings in November.
  2. **Top Candidate Matches:** Finds 3 high-converting historical itineraries with optimal day-by-day routing (e.g., Day 1: Arrive HKT, private transfer; Day 2: Phi Phi Island; Day 3: Phuket City Tour; Day 4: Ferry to Krabi; Day 5: 4 Island Tour; Day 6: Departure via KBV).
  3. **Committed Inventory Interceptor:**
     - Operations currently has **18 unsold pre-purchased room nights** at *Centara Grand Beach Resort Phuket* and *Dusit Thani Krabi* for November with expiry cutoff in 10 days.
     - System automatically injects these properties into the **"Recommended / Curated"** tier and flags a *Committed Inventory Margin Bonus* to the sales rep.

---

### STAGE 5: Dynamic Pricing, Margin Guardrails & FX Calibration
- **Actor:** Pricing Engine (Deterministic) + Rajesh Verma (Manager if triggered).
- **Deterministic Math Flow:**
  ```
  Total Net Cost (INR) = [
    (Hotel Net THB * FX_Rate * 1.015 buffer) +
    (DMC Transfers & Sightseeing THB * FX_Rate * 1.015 buffer) +
    (BOM-HKT / KBV-BOM Airfare Net INR)
  ]
  ```
- **Live Tariff & FX Calibration:**
  - Base DMC net rate: 26,400 THB per couple + 7,200 THB for 7yo CWB = 33,600 THB.
  - FX Rate: 1 THB = 2.42 INR + 1.5% currency hedge = 2.456 INR.
  - Land Net Cost: ₹82,521.
  - BOM Flight Component (Indicative 3 pax): ₹54,000.
  - Total Net Cost: ₹136,521.
- **Margin Guardrails Check:**
  - Standard Agent Tier Markup: +12% target = ₹155,000 gross price (Within agent's ₹1.5L budget).
  - Net Margin: ₹18,479 (11.9% gross margin) ➔ **GREEN STATUS**.
  - *Sub-Floor Check:* If rep tries to discount below 8% (e.g., ₹146,000 price = 6.4% margin), system locks the quote and triggers an instant approval request to Rajesh Verma.

---

### STAGE 6: Quote Review & Customization Workbench
- **Actor:** Priya Sharma (Sales Executive).
- **Workbench Interface:**
  - Three distinct package tiers assembled in side-by-side cards:
    1. **Saver Tier (₹1,32,000):** 4-Star Standard Hotels, SIC (Seat-in-Coach) Tours, Non-refundable flights.
    2. **Curated Tier (₹1,49,500) [Recommended]:** 4-Star Deluxe featuring Pre-purchased Room Blocks (Centara/Dusit), Private Transfers, Phi Phi Speedboat with National Park fee included.
    3. **Elite Tier (₹1,78,000):** 5-Star Beachfront Resort, Private Speedboat Charter, Romantic Beach Dinner.
  - Priya toggles inclusions with 1 click (e.g., adds "Free Sim Cards for 2 Adults" and "Ferry Tickets Included").
  - System automatically calculates margin in real time as items are toggled.

---

### STAGE 7: Multi-Channel Quote Delivery
- **Actor:** Priya Sharma ➔ Retail Agent (Rohit Travels).
- **Format Options:**
  1. **WhatsApp Smart Interactive Card:** Rich text snippet with pricing breakdown, key inclusions, and an encrypted dynamic link: `quoteflow.ai/p/th-84920`.
  2. **Mobile-Responsive Digital Web Proposal:** Clean, visual web micro-page featuring high-resolution resort photos, day-by-day interactive map, meal icons, and an instant **[Accept & Request Invoice]** or **[Request Customization]** button.
  3. **Branded White-Label PDF:** 1-click downloadable PDF with Rohit Travels' retail branding on top and wholesaler assurance below.

---

### STAGE 8: Behavioral Telemetry & Follow-Up Orchestration
- **Actor:** Retail Agent (Consumer) ➔ Telemetry Engine ➔ Priya (Action).
- **Telemetry Event Log:**
  - `14:02` — Quote delivered to Rohit on WhatsApp.
  - `14:38` — Rohit opens web proposal on mobile (Location: Surat, Gujarat).
  - `14:41` — Dwell time: 2 minutes 14 seconds on *Curated Tier Hotel Details (Centara Phuket)*.
  - `14:45` — Rohit downloads PDF brochure (indicating he is forwarding it to his end-client).
  - `18:10` — Second visit: Web proposal opened again from a different IP address (End-client reviewing proposal at home).
- **Intent Scoring Engine:**
  - Lead Intent Score leaps from `40 (Warm)` to `88 (High Priority)`.
- **System Action (AI Follow-Up Queue):**
  - Pops an alert on Priya’s workbench:
    > 🔥 *Rohit Travels' client just re-opened the Phuket-Krabi proposal for the 2nd time! Dwell time: 4m on Curated Tier.*
  - Generates recommended WhatsApp message:
    > *"Hi Rohit, saw you're reviewing the Phuket proposal. The ocean-view rooms at Centara are filling fast for 12 Nov. Should I put a provisional 24-hour hold on the rooms for your family?"*
  - Priya taps **[Send Nudge]** at the exact moment of peak buyer attention.

---

### STAGE 9: Iterations, Haggling & Revision Diff Engine
- **Actor:** Retail Agent ➔ Priya Sharma.
- **Scenario:** Rohit messages:
  > *"Priya, client likes Curated package, but budget is strict ₹1,42,000 max. Can you reduce ₹7,500? Otherwise they might book through another agent."*
- **Revision Diff Engine in Workbench:**
  - Priya opens quote `th-84920` in the Workbench.
  - Rather than rebuilding from scratch, she inputs the target reduction: `-₹7,500`.
  - System dynamically simulates 3 smart concession options:
    - *Option A:* Keep hotels, swap Private transfers to shared Speedboat for Phi Phi (-₹4,200) + Rep accepts 1.5% margin trim (-₹3,300) = Price ₹1,42,000, Margin **9.8% (Approved)**.
    - *Option B:* Keep all tours private, swap Krabi hotel from Dusit Thani to Holiday Inn Express (-₹8,100) = Price ₹1,41,400, Margin **11.2% (Approved)**.
  - Priya selects Option B. The system generates an instant **Visual Diff Summary**:
    ```
    ┌─────────────────────────────────────────────────────────────┐
    │ REVISION V2 DELTA SUMMARY                                   │
    ├─────────────────────────────────────────────────────────────┤
    │ [Changed] Krabi Hotel: Dusit Thani ➔ Holiday Inn Express    │
    │ [Unchanged] Phuket Hotel: Centara Grand Beach Resort (3N)   │
    │ [Unchanged] Tours: Phi Phi Speedboat & 4 Island Private     │
    │ [Price] ₹1,49,500 ➔ ₹1,41,400 (Saved ₹8,100 for Client)     │
    │ [Margin] 11.2% (Protected)                                  │
    └─────────────────────────────────────────────────────────────┘
    ```
  - Dispatches Revision V2 to Rohit in under 90 seconds.

---

### STAGE 10A: Booking Confirmation & Operations Handoff (Won Path)
- **Actor:** Retail Agent ➔ Priya ➔ Ankit Kulkarni (Operations).
- **Workflow:**
  1. Rohit taps **[Confirm Booking]** on the web proposal and uploads the traveler passport copies + ₹30,000 token deposit receipt.
  2. System changes status to `BOOKING_LOCKED`.
  3. Pre-purchased block inventory counter at *Centara Grand Phuket* is decremented by 1 room (3 nights).
  4. System compiles the **Operations Handoff Dossier**:
     - Itemized DMC Net Tariffs, Confirmation Voucher Reference Codes.
     - Passenger manifests with passport validity verification (>6 months).
     - Automated handoff ticket assigned to Ankit Kulkarni in Operations with 2-hour SLA for voucher release.

---

### STAGE 10B: Lost / Silent Deal Post-Mortem (Lost Path)
- **Actor:** System (AI Analyzer) ➔ Rajesh Verma (Sales Manager).
- **Workflow:**
  1. If an agent does not interact with a quote for 72 hours despite 2 automated follow-up nudges, status updates to `SILENT_ABANDONED`.
  2. System triggers an automated casual feedback prompt on WhatsApp:
     > *"Hi Rohit, noticed we didn't proceed with the Phuket holiday for 12 Nov. Was it due to price, flight timings, or did the client postpone? Just 1 tap helps us quote better next time!"*
     > `[A: Budget was high]` `[B: Booked elsewhere]` `[C: Trip postponed]` `[D: No response from traveler]`
  3. Rohit taps `[A: Budget was high]`.
  4. Data point is ingested into the **Pricing Intelligence Dashboard**. Rajesh Verma observes that 4-star packages for Phuket in mid-November are losing deals due to rising airfares from BOM, prompting a review of air-inclusive group block charters.
