# QuoteFlow AI — B2B Travel Sales Intelligence

> An AI-assisted B2B quotation, dynamic pricing, and booking-conversion workbench built for outbound holiday wholesalers and destination management companies (DMCs).

---

## 🧭 Executive Overview

In B2B travel distribution across high-volume leisure corridors (e.g., **Thailand, Dubai, Vietnam, Bali, Maldives**), the primary revenue bottleneck is **not** quote generation speed. While legacy AI engines can draft raw itineraries in under two minutes using historical repositories, travel wholesalers face an acute conversion crisis:

- **Information Ambiguity:** 68% of inbound inquiries arrive as fragmented WhatsApp messages or forwarded client emails missing critical parameters (traveler age distributions, flight inclusions, room sharing).
- **Margin Erosion & Stale Supplier Rates:** Fluctuating foreign exchange (USD/THB/AED vs INR), seasonal dynamic supplier tariffs, and uncontrolled sales rep discounting cause severe margin leakage.
- **Perishable Inventory Write-downs:** Failure to prioritize pre-purchased hotel allotments and chartered flight seats leads to unrecoverable inventory expiration.
- **The Follow-Up Black Hole:** Over 60% of quotes are sent as static PDFs into unmonitored WhatsApp threads with zero open telemetry, uncoordinated follow-ups, and eventual agent silence.

**QuoteFlow AI** transforms quotation from an unmonitored drafting utility into an **intelligent conversion workbench**. It couples automated entity extraction and dynamic margin guardrails with multi-variant quote generation, client engagement telemetry, and an automated follow-up engine.

---

## 📚 Product Documentation Suite

Explore the foundational architectural and product strategy documents:

| Document | Description |
| :--- | :--- |
| **[PRD.md](file:///Users/seananandfargose/Desktop/QuoteFlow%20AI%20%E2%80%94%20B2B%20Travel%20Sales%20Intelligence/docs/PRD.md)** | **Product Requirements Document:** Comprehensive business problem dissection, root causes, user personas (Sales Rep, Sales Manager, Ops), 4-pillar automation matrix, risk register, success metrics, and non-goals. |
| **[USER_JOURNEYS.md](file:///Users/seananandfargose/Desktop/QuoteFlow%20AI%20%E2%80%94%20B2B%20Travel%20Sales%20Intelligence/docs/USER_JOURNEYS.md)** | **End-to-End User Journeys:** Detailed 10-stage lifecycle mapping from requirement ingestion and entity extraction to haggling/revisions, booking confirmation, and silent deal autopsies. |
| **[PRODUCT_DECISIONS.md](file:///Users/seananandfargose/Desktop/QuoteFlow%20AI%20%E2%80%94%20B2B%20Travel%20Sales%20Intelligence/docs/PRODUCT_DECISIONS.md)** | **Architectural & Product Trade-offs:** Detailed analysis of 8 critical architectural dilemmas including AI vs Deterministic guardrails, live API vs cached DMC rates, and WhatsApp-first delivery. |
| **[MVP_SCOPE.md](file:///Users/seananandfargose/Desktop/QuoteFlow%20AI%20%E2%80%94%20B2B%20Travel%20Sales%20Intelligence/docs/MVP_SCOPE.md)** | **2-Day MVP Specification:** High-leverage execution roadmap, system architecture, seed data schemas (Thailand, Bali, Dubai, Maldives), simulation testbed, and demo script. |

---

## ⚡ Core Value Propositions

1. **Intelligent Ingestion & Clarification:** Parses messy, natural-language travel agent inquiries from WhatsApp or email into structured travel specifications, auto-flagging missing data.
2. **Margin Guardrails & Committed Inventory Push:** Enforces minimum margin thresholds, flags stale DMC supplier rates, and highlights pre-committed/contracted inventory blocks to eliminate perishability loss.
3. **Multi-Tier Variant Packaging:** Generates *Budget, Recommended, and Premium* options in seconds, increasing agent conversion and average booking values.
4. **Behavioral Telemetry & Actionable Follow-Up:** Tracks proposal views, dwell time, and interaction heatmaps, automatically queueing high-probability sales follow-ups.
5. **Revision Diff Engine:** Calculates instant cost, inclusion, and margin deltas when travel agents request itinerary changes or budget reductions.

---

## 🛠️ Repository Status

This repository is currently under active architecture review. Full source code implementation will commence following product specification sign-off.
