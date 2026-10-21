# Product & Architectural Decisions
## QuoteFlow AI — Trade-Off Analysis, Architectural Rationale & Strategic Decisions

---

| Document Metadata | Details |
| :--- | :--- |
| **Product** | QuoteFlow AI |
| **Document Version** | 1.0.0 (Pre-Implementation Baseline) |
| **Focus** | Strategic Trade-Offs, Failure Modes & Technology Selections |
| **Audience** | Technical Leads, Product Architects, Executive Sponsors |

---

## Decision Matrix Summary

```
┌─────────────────────────────────┬────────────────────────────────┬────────────────────────────────┐
│ Architectural Dilemma           │ Chosen Decision                │ Rejected Alternative           │
├─────────────────────────────────┼────────────────────────────────┼────────────────────────────────┤
│ 1. Automation Degree            │ Human-in-the-Loop Workbench    │ 100% Autonomous Bot Quoting    │
│ 2. Margin Enforcement           │ Tiered Guardrails + Mgr Lock   │ Unrestricted Rep Discounting   │
│ 3. Quote Delivery Format        │ Hybrid WhatsApp + Dynamic Web  │ Static PDF Only                │
│ 4. Rate Freshness Model         │ Cached Contracts + Dynamic FX  │ 100% Live Supplier API Only    │
│ 5. Lead Prioritization          │ Behavioral Telemetry Intent    │ FIFO (First-In, First-Out)     │
│ 6. Block Inventory Allocation   │ Algorithmic Promotion + Spiff  │ Passive Spreadsheet Lookup     │
│ 7. Revision Workflow            │ Granular Diff Engine           │ Full Quote Regeneration        │
│ 8. Travel Agent Trust & Brand   │ Strict White-Label Isolation   │ Direct Wholesaler Branding     │
└─────────────────────────────────┴────────────────────────────────┴────────────────────────────────┘
```

---

## 1. Decision 1: Human-in-the-Loop Workbench vs. 100% Autonomous Bot

### The Context
The company has an existing AI engine capable of generating quote drafts in two minutes from 70,000 historical records. The temptation is to hook an LLM directly to WhatsApp to auto-quote and auto-reply without human intervention.

### Evaluation of Options
- **Option A: Pure Autonomous Bot:** Incoming WhatsApp text ➔ LLM generates itinerary ➔ Auto-dispatches price to retail travel agent.
  - *Pros:* Near-zero response time (< 30 seconds); zero sales rep payroll for quoting.
  - *Cons:* Catastrophic financial risk. If the LLM quotes a high-season date using an off-peak historical tariff, the company is legally and commercially bound to honor a loss-making booking. Furthermore, B2B travel sales in India rely heavily on personal trust, credit terms, and negotiation rapport.
- **Option B: Human-in-the-Loop Workbench (CHOSEN):** Incoming WhatsApp text ➔ AI parses schema, matches inventory, and calculates multi-tier options ➔ Sales executive reviews in Workbench, verifies room allotments, tweaks margins, and hits dispatch.
  - *Pros:* Combines 90% time savings with 100% human accountability. Eliminates hallucinations and protects gross margins.
  - *Cons:* Requires sales rep attention (3 minutes per quote instead of 0 minutes).

### Strategic Rationale
In wholesale travel distribution, an itinerary is a **financial derivative contract** containing hotel commitments, transfer logistics, and flight fares. A single error on a 20-passenger family group can wipe out an entire month's operating profit. **The workbench model elevates the sales rep from a manual copy-paste typist to a high-leverage sales strategist.**

---

## 2. Decision 2: Margin Enforcement & Guardrail Architecture

### The Context
Sales executives are incentivized by gross booking volume (GMV). When retail agents push back (*"Competitor DMC is ₹5,000 cheaper"*), reps frequently slash markups down to 1–2% or even negative margins just to hit sales targets, eroding corporate profitability.

### The Guardrail Framework
We implement a three-tier deterministic threshold engine:

```
  Gross Margin %  │  System Action                       │  Authorization Required
 ─────────────────┼──────────────────────────────────────┼─────────────────────────
  ≥ 12.0%         │  🟢 GREEN: Auto-approved             │  None (Sales Rep)
  8.0% - 11.9%    │  🟡 YELLOW: Soft Alert (Warns Rep)   │  Rep Acknowledgment
  6.0% - 7.9%     │  🟠 ORANGE: Hard Lock                │  Sales Manager 1-Click Approval
  < 6.0%          │  🔴 RED: System Rejection            │  VP Sales / Managing Director
```

### Technical Implementation
- Guardrails are evaluated in the backend calculation engine prior to issuing a quote hash or sharing link.
- If a quote falls into the **ORANGE** zone, the `status` flips to `PENDING_MANAGER_APPROVAL`. An asynchronous push notification and in-app modal are routed to Rajesh Verma (Sales Manager) displaying:
  - *Net Cost:* ₹1,36,500
  - *Requested Price:* ₹1,45,000 (Margin: 5.8%)
  - *Agent Lifetime Value:* Rohit Travels (Total GMV: ₹42 Lakhs, Past Margin: 12.4%)
  - *Action:* `[Approve Exception]` or `[Counter: Min 8%]`

---

## 3. Decision 3: Quote Delivery: WhatsApp Interactive Card + Dynamic Web vs Static PDF

### The Context
Legacy workflows depend on generating 4-page PDF documents attached to WhatsApp messages. 

### Why Static PDFs are a Conversion Dead End
1. **Zero Behavioral Telemetry:** Wholesalers cannot tell if an agent read the PDF, discarded it, or forwarded it.
2. **Terrible Mobile UX:** Retail agents and end-travelers view quotes on smartphones. Pinching and zooming 4-point font PDFs on a 6-inch screen leads to high bounce rates.
3. **Stale Information:** Once a PDF is sent, hotel availability or pricing errors cannot be amended without sending "Quote_v2_FINAL_revised.pdf", creating customer confusion.

### The Chosen Solution: Hybrid Dynamic Delivery
- **Layer 1 (WhatsApp Teaser):** Clean, formatted WhatsApp message highlighting prices for 3 tiers with core inclusions and an encrypted micro-link (`quoteflow.ai/p/th-84920`).
- **Layer 2 (Dynamic Web Proposal):** High-speed, mobile-optimized web microsite featuring interactive resort photo carousels, day-by-day maps, clear inclusion badges, and direct **[Request Hold]** buttons.
- **Layer 3 (Instant Telemetry Beacon):** Background analytics fire when the web page is opened, tracking scroll depth, dwell time per hotel, and repeat visits.
- **Layer 4 (Fallback White-label PDF):** For conservative travel agents who demand a paper file, the web proposal includes a 1-click **[Export Client PDF]** button that dynamically generates a crisp branded PDF bearing the *retail travel agent's logo*, not the wholesaler's.

---

## 4. Decision 4: Rate Freshness Model: Real-Time APIs vs Cached Contracts with Dynamic Buffers

### The Context
Can we integrate live supplier APIs for all hotel and transfer components across Thailand, Bali, Vietnam, and Maldives?

### Industry Reality Check
- **The Myth:** Every DMC and boutique resort in Southeast Asia has a modern, ultra-reliable REST/GraphQL API.
- **The Reality:** 70% of inbound leisure travel inventory across Phuket, Krabi, Bali, and Da Nang is contracted via seasonal static Excel rate sheets, contracted room allotments, and weekly WhatsApp allocation sheets. Direct APIs exist primarily for global hotel chains (Marriott, Accor) and airfare aggregators.

### Architectural Choice: Hybrid Contract Engine
1. **Contracted Rate Master Table:** Ingests DMC seasonal contracts with defined validity windows (e.g., *Contract ID: TH-DMC-2026-WIN, Valid: 01 Nov - 15 Dec*).
2. **Dynamic Foreign Exchange (FX) Hedge:**
   - Real-time mid-market rate fetched via FX API (USD, THB, AED vs INR).
   - **Mandatory Risk Buffer:** System adds a deterministic **+1.5% currency fluctuation hedge** to all foreign-currency net rates to protect against rupee depreciation between quote issuance and supplier settlement.
3. **Quote Validity Timer:**
   - Land package price guaranteed for **48 hours**.
   - Flight component explicitly flagged as *"Dynamic Airline Fare — Subject to Seat Class Availability at Time of Booking"*.

---

## 5. Decision 5: Lead Prioritization & Conversion Telemetry Engine

### The Context
Sales executives typically handle incoming inquiries on a First-In, First-Out (FIFO) basis. When a rep has 30 open quotes, they follow up with whoever messaged most recently or whose name they remember, allowing high-value, hot-intent deals to slip away.

### The Behavioral Intent Scoring Algorithm ($I_{score}$)
QuoteFlow AI scores active quotes from 0 to 100 based on live interaction signals:

$$I_{score} = w_1 \cdot O_{views} + w_2 \cdot D_{dwell} + w_3 \cdot S_{shares} + w_4 \cdot T_{proximity} - w_5 \cdot T_{decay}$$

| Variable | Signal | Weight | Logic |
| :--- | :--- | :--- | :--- |
| $O_{views}$ | Proposal Open Count | 25% | Opening 2+ times indicates serious deliberation. |
| $D_{dwell}$ | Dwell Time (>120s) | 25% | Deep reading indicates active evaluation. |
| $S_{shares}$ | Unique IP Fingerprints | 20% | Proposal opened from 2 distinct IP addresses (Retail Agent forwarded to End-Traveler!). |
| $T_{proximity}$ | Travel Date Urgency | 20% | Travel within 14 days receives urgency boost. |
| $T_{decay}$ | Time Since Last Event | -10% | Score degrades if no engagement in 48 hours. |

### Operational Impact
Instead of an unorganized WhatsApp inbox, Priya's dashboard ranks leads into three dynamic queues:
1. 🔥 **Call Now (Intent Score ≥ 75):** Client is actively viewing or just shared the quote.
2. ⏳ **Awaiting Response (Intent Score 40–74):** Sent, viewed once, within standard SLA.
3. ❄️ **Stale / Silent (Intent Score < 40 for > 48h):** Queued for automated conversational check-in or archival.

---

## 6. Decision 6: Algorithmic Promotion of Committed / Prepaid Inventory

### The Context
Wholesalers routinely commit to guaranteed hotel allocations (e.g., 50 room-nights/month at a Bali villa resort) and chartered flight seats. If these are not sold prior to release dates, the loss is **100% of the sunk cost**.

### The Solution: "Smart Commit Allocator"
- **Operational Data Feed:** Operations maintains a real-time ledger of active pre-purchased block commitments with expiration cutoff countdowns.
- **Quotation Matchmaker:** When a sales rep selects a destination corridor (e.g., *Bali 6D5N Seminyak + Ubud*), the system checks if active committed inventory exists for those dates.
- **Incentive Alignment:**
  1. *For the Retail Agent:* The committed property is priced 3% lower than open-market alternatives because the net contract was purchased at bulk wholesale discount.
  2. *For the Sales Rep:* A prominent banner appears: **"🔥 Priority Commitment: 12 unsold rooms remaining. Booking this property adds a ₹500 sales incentive kicker."**
  3. *For the Business:* Liquidates high-risk perishable inventory, directly eliminating balance sheet write-downs.

---

## 7. Decision 7: Multi-Turn Revision Management via Visual Diff Engine

### The Context
In Indian B2B travel, almost no quote is accepted without negotiation. Retail agents average **2.3 revisions per inquiry** (*"Client wants 4-star instead of 5-star", "Remove lunch", "Add private boat"*).

### The Flawed Alternative: Re-Drafting from Scratch
Regenerating an entire quote from the prompt re-runs historical AI models, which frequently alters hotel names, flips day tours, or changes transfer types unintentionally, confusing both the retail agent and the local DMC.

### The Chosen Solution: State-Preserving Semantic Diff
- The quote is stored as a structured, immutable state tree: `Quote_v1`.
- Revisions branch into `Quote_v2` with explicit change records:
  - `HOTEL_SUBSTITUTION`: Centara Phuket ➔ Holiday Inn Express (Delta: -₹8,100)
  - `MEAL_PLAN_REDUCTION`: Half-Board ➔ Bed & Breakfast (Delta: -₹3,200)
- **Visual Diff Card:** The generated proposal and WhatsApp message explicitly highlight:
  - *What Changed:* Clear strike-through of old items with green highlights on new selections.
  - *What Stayed Intact:* Reassures the agent that their confirmed sightseeing tours remain locked.
  - *Price Delta:* Shows exactly how much money was saved for their client.

---

## 8. Decision 8: Travel Agent Brand Protection & Data Isolation (White-Label Integrity)

### The Context
The biggest fear of retail travel agents in India is that the wholesale DMC will bypass them and contact their end-travelers directly (client poaching).

### Architectural Guardrails
1. **Zero Direct-to-Consumer Contact:** The system never solicits traveler contact information (phone/email) during the quoting phase. All proposals and links are routed strictly to the registered B2B agent.
2. **Dynamic White-Labeling:** The public-facing digital web proposal dynamically injects the **Retail Travel Agent's Business Name, Phone Number, and Logo** at the top of the page. The wholesale platform's name appears only in small print as the "Official Fulfillment Partner."
3. **Agent Confidence:** This feature empowers retail agents to confidently forward the live web link directly to their VIP clients without fear of losing their booking commission.
