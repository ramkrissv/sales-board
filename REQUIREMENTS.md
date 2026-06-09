# Galent AI — Revenue Intelligence Platform
## Product Requirements Document (PRD)

**Version:** 3.0
**Date:** June 9, 2026
**Owner:** Galent Product & Engineering
**Status:** Active

---

## 1. Vision & Strategic Context

### 1.1 From Sales Tracker to AI-Native Revenue Platform

The current Galent Sales Board is a capable pipeline tracker with 7 views, stakeholder management, task tracking, and analytics. **The next evolution transforms it into an AI-native, agentic revenue intelligence platform** — branded as **"Galent AI · Sales Intelligence"** — where AI agents don't just display data but actively work alongside sales teams to research accounts, draft proposals, predict outcomes, and autonomously execute follow-up workflows.

### 1.2 Platform Thesis

> **"Every sales rep gets a tireless AI co-pilot that researches, reminds, drafts, and acts — so humans focus on relationships and strategy."**

The platform should feel like having a senior sales operations analyst, a research assistant, and a project manager embedded in every deal — powered by autonomous AI agents that operate on behalf of the team 24/7.

### 1.3 Product Identity

| Attribute | Value |
|-----------|-------|
| **Product Name** | Galent AI |
| **Tagline** | Sales Intelligence |
| **Brand Personality** | Professional, Agentic, Modern |
| **Visual Language** | Modern Corporate + Glassmorphism accents to signify AI presence |
| **Core Metaphor** | "Neural" — agents are "Neural Nodes", integrations are "Neural Links", the AI engine is the "Neural Intelligence Core" |

### 1.4 Target Users

| Persona | Role | Primary Need |
|---------|------|--------------|
| **Sales Rep / Account Exec (AE)** | Owns deals, drives pipeline | Deal execution, stakeholder tracking, next-best-action |
| **Sales Development Rep (SDR)** | Top-of-funnel outreach | Campaign performance, outreach drafting, lead qualification |
| **Sales Leadership** | VP Sales, CRO, Sales Director | Pipeline visibility, forecasting, coaching |
| **Presales / Solution Architect** | Supports deal qualification | Technical scoping, proposal drafting, resource planning |
| **Sales Operations** | Process & data governance | Pipeline hygiene, reporting, process enforcement |
| **Delivery / Account Manager** | Post-win execution | Transition handoff, customer health, expansion |

---

## 2. Current State (v1.0) — What Exists Today

### 2.1 Core Data Model

#### Opportunities (Primary Entity)
| Field | Type | Notes |
|-------|------|-------|
| id | varchar PK | Format: OPP-YYYY-NNNN |
| customerName | text | Company name |
| opportunityName | text | Deal description |
| status | varchar | Discovery, Qualification, Proposal, Negotiation, Won, Lost, On Hold |
| tcv | integer | Total Contract Value (USD) |
| dealDuration | text | 3 months, 6 months, 12 months, 1 year, 2 years, 3+ years |
| expectedCloseDate | timestamp | Target close |
| startDate | timestamp | Engagement start |
| primaryOwner | text | Deal owner name |
| salesPOCs | text[] | Sales contacts |
| presalesPOCs | text[] | Presales contacts |
| conversationLog | text | Free-form deal notes |
| industry | varchar | Healthcare, Financial Services, Hospitality, Professional Services, Manufacturing, Retail, Technology, Other |
| region | varchar | North America, Europe, APAC, Latin America, Middle East |
| serviceLine | varchar | IT Services, Staffing |
| clientType | varchar | New, Existing |
| opportunityType | varchar | New Deal, Upsell, Cross-sell, Renewal, Enhancement |
| billingModel | varchar | Time & Material, Fixed Price, Retainer, Milestone-based |
| margin | integer | 0-100% |
| source | text | Lead source |
| customTags | text[] | Custom labels |
| activityLog | jsonb | Audit trail |
| createdAt / updatedAt | timestamp | Auto-managed |
| createdBy / updatedBy | text | User attribution |

#### Stakeholders (per Opportunity)
| Field | Type |
|-------|------|
| id | UUID PK |
| opportunityId | FK → opportunities |
| name, title | text |
| email, phone, linkedInUrl | text (optional) |
| isPrimaryContact, isDecisionMaker | boolean |
| notes | text |

#### Tasks (per Opportunity)
| Field | Type |
|-------|------|
| id | UUID PK |
| opportunityId | FK → opportunities |
| name, owner | text |
| dueDate | timestamp |
| status | pending, complete |
| priority | Low, Medium, High, Critical |
| notes | text |

#### Resource Links (per Opportunity)
| Field | Type |
|-------|------|
| id | UUID PK |
| opportunityId | FK → opportunities |
| title, url | text |
| type | file, folder, link |
| addedBy | text |
| addedAt | timestamp |

### 2.2 Existing Views

| View | Description | Key Capabilities |
|------|-------------|-----------------|
| **Kanban Board** | 7-column pipeline board | Drag-drop status change, TCV/margin/duration on cards, service line badges |
| **Timeline** | 90-day Gantt-style view | Start → close date bars, color-coded by status |
| **Schedule Board** | Time-bucket columns | Late/Today/Tomorrow/This Week/Next Week/Future/No Date; shows both opps and tasks |
| **Table** | Spreadsheet view | Sortable columns, CSV export, row actions |
| **Dashboard** | Analytics hub | Pipeline TCV, win rate, funnel by count & value, TCV trend, revenue forecast, owner treemap |
| **Tasks** | Cross-opp task list | Search, filter by status/priority, toggle complete, overdue highlighting |
| **Stakeholders** | Contact directory | Search, role filter (Decision Maker/Primary Contact), LinkedIn links |

### 2.3 Existing Capabilities

- Full CRUD on all entities (opportunities, stakeholders, tasks, resource links)
- Cascade deletes (opportunity deletion removes all children)
- Multi-axis filtering: status, owner, region, industry (AND logic)
- Full-text search across customer/opportunity/owner names
- Dark/light/system theme
- Authentication (Replit OIDC with standalone fallback)
- Conversation log per opportunity
- Activity audit trail (createdBy, updatedBy, timestamps)
- Auto-generated IDs (OPP-YYYY-NNNN)
- Responsive design with mobile support

### 2.4 Current Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Tailwind CSS 4, Radix UI / shadcn |
| State | TanStack React Query, React Context |
| Drag & Drop | @dnd-kit |
| Charts | Recharts |
| Forms | React Hook Form + Zod |
| Routing | Wouter |
| Backend | Express 4, Node.js 20 |
| Database | PostgreSQL 16, Drizzle ORM |
| Auth | Passport + OIDC (Replit), express-session |
| Build | Vite 7, esbuild, tsx |

---

## 3. Design System — "Galent Intelligence System"

### 3.1 Brand & Style Philosophy

The design system is engineered for an AI-native sales intelligence environment where speed, precision, and agency are paramount. The brand personality is **Professional, Agentic, and Modern**. It avoids the clutter of traditional CRM systems in favor of a streamlined, "intelligence-first" interface that feels like an active partner rather than a static database.

The visual style blends **Modern Corporate** reliability with **Glassmorphism** accents to signify AI presence. We utilize a high-density information architecture balanced by generous whitespace to ensure data-rich views remain legible. The "Agentic" feel is achieved through purposeful motion, subtle "glow" states on AI-driven insights, and a clear distinction between human-input data and machine-generated intelligence.

### 3.2 Galent Logo

The app must use the official **Galent brand assets**:

- **Primary Logo SVG:** `client/src/assets/galent-logo.svg` — used in header, all themes
- **Wordmark SVG:** `client/src/assets/galent-wordmark.svg` — orange gradient "galent" text
- **Favicon:** Must be updated to match Galent brand (current orange grid icon is a placeholder)
- **Sidebar Branding:** Top-left shows "**Galent AI**" with subtitle "**Sales Intelligence**" in purple, with the Galent icon

### 3.3 Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| **Primary Purple** | `#7c3aed` (container), `#630ed4` (base) | Primary actions, branding, AI-active states, selected nav items |
| **Secondary Green** | `#00dc82` (container: `#4afd9f`) | Positive growth metrics, success states, "on track" signals, LIVE badges |
| **Accent Orange** | `#f97316` (container: `#aa4900`) | Attention-required alerts, high-priority CTAs, "at risk" signals |
| **Error Red** | `#ba1a1a` | Risk alerts, stale engagement, RISK ALERT badges |
| **Surface** | `#fef7ff` (light), `#020617` Slate-950 (dark) | Page background |
| **Surface Container** | `#f3ebfa` (light), Slate-900 (dark) | Cards, panels |
| **On Surface** | `#1d1a24` | Primary text |
| **Outline** | `#7b7487` | Borders, dividers |
| **Outline Variant** | `#ccc3d8` | Subtle borders |

**Dark Mode:** Background shifts to Slate-950 (`#020617`), surfaces to Slate-900, borders to Slate-800. AI glow effects increase in intensity (higher saturation, lower opacity) against dark backgrounds.

### 3.4 Typography

| Token | Font | Size | Weight | Usage |
|-------|------|------|--------|-------|
| `hero-display` | Source Serif 4 | 48px | 700 | Page titles ("Agent Registry", "Outreach Intelligence") |
| `headline-lg` | Inter | 30px | 600 | Section headers |
| `headline-md` | Inter | 20px | 600 | Card titles, widget headers |
| `body-lg` | Inter | 16px | 400 | Primary body text |
| `body-md` | Inter | 14px | 400 | Secondary text, descriptions |
| `label-md` | Inter | 12px | 500 | Metadata labels ("HEALTH", "WIN PROB.", "SENT") |
| `stats-number` | Inter | 24px | 700 | KPI numbers ($24.8M, 42d, 1,248) |

- **Source Serif 4** used exclusively for high-level hero sections to provide an authoritative "intelligence" feel
- **Bold/Semi-bold weights** distinguish machine-generated insights from user-entered text
- **Monospaced** for data IDs, API values, and system registry logs

### 3.5 Layout Architecture

| Zone | Width | Description |
|------|-------|-------------|
| **Left Navigation** | Fixed 280px (collapsible to icon-only 64px) | Primary nav + New Opportunity button + Settings/Support + user profile |
| **Main Content** | Fluid, 12-column grid | Dashboard, pipeline, accounts, forecasting content |
| **AI Copilot Sidebar** | Dynamic 320px (right) | Always-available AI assistant panel, collapsible |

- **8px linear scale** as primary spacing driver; 4px for tight component internals
- **AI Sidebars** feel "overlayed" — use `backdrop-blur: 20px` to let main data peer through
- **Mobile Reflow:** Sidebars collapse into bottom sheets or full-screen overlays triggered by a floating action button (FAB) in primary purple

### 3.6 Elevation & Depth

| Level | Treatment | Usage |
|-------|-----------|-------|
| Level 0 | Background surface | Page background |
| Level 1 | White + 1px border (Slate-200) | Cards, main surfaces |
| Level 2 | `box-shadow: 0 4px 12px rgba(15,23,42,0.08)` | Hover/active states |
| AI Elements | `box-shadow: 0 8px 20px rgba(124,58,237,0.12)` (purple tinted shadow) | AI-suggested actions, agent cards |
| Glassmorphism | `backdrop-blur: 12px; background: rgba(255,255,255,0.8)` | Floating AI tooltips, predictive bars |

### 3.7 Component Patterns

| Component | Specification |
|-----------|--------------|
| **Buttons (Primary)** | Solid Purple (`#7c3aed`), white text, 8px radius |
| **Buttons (Success)** | Green with dark green text for positive predictive outcomes |
| **Buttons (Ghost)** | Transparent + Slate-600 text; Surface-Hover on interaction |
| **AI Badges/Chips** | Fully rounded (pill-shaped) to distinguish from standard labels. Examples: `AI POWERED`, `LIVE`, `SYNCING`, `AGENT OPTIMIZING`, `STABLE` |
| **Health Score Circles** | Circular indicator with central numeric value. Green (>70), Yellow (40-70), Red (<40) stroke colors |
| **Progress Bars** | 4px tall, rounded. Green for health, purple for win probability, orange for medium health |
| **Agent Signal Cards** | Subtle purple-tinted background with sparkle icon. Left border gradient (purple → green) for "Live Agent" state |
| **Inputs** | Floating label style. Focus: 2px solid Purple with 4px soft outer glow |

---

## 4. Global Navigation & Shell

### 4.1 Left Sidebar Navigation

Based on the reference screens, the navigation restructures from the current header-dropdown to a **persistent left sidebar**:

| Icon | Label | Route | Description |
|------|-------|-------|-------------|
| ▦ | **Kanban** | `/` | Pipeline Kanban board (default view) |
| 📈 | **Timeline** | `/timeline` | Gantt-style timeline view |
| 🔗 | **Account 360** | `/accounts` | **NEW** — Account intelligence hub |
| ⚡ | **AI Forecasting** | `/forecasting` | **NEW** — AI-powered forecasting lab |
| 🤖 | **Agent Registry** | `/agents` | **NEW** — Manage autonomous agent fleet |
| ⚙ | **Integrations** | `/integrations` | **NEW** — System integrations hub |

**Bottom section:**
- `+ New Opportunity` button (primary purple, full-width)
- Settings link
- Support link
- User profile card (avatar, name, role title) with online status indicator

### 4.2 Top Navigation Bar

| Element | Description |
|---------|-------------|
| **Tab Bar** | Context-sensitive tabs: "Dashboard", "Pipeline" / "Opportunities", "Accounts" |
| **SDR / AE View Toggle** | Role-based view switcher (seen in Outreach Intelligence screen) |
| **Search Bar** | Universal search: "Search pipeline, accounts, or agents..." / "Search accounts, deals, or neural maps..." |
| **Invoke Agent Button** | Top-right purple button: "⚡ Invoke Agent" — quick-launch any agent |
| **Notification Bell** | Activity notifications |
| **History Icon** | Recent activity / navigation history |
| **User Avatar** | Profile dropdown |

### 4.3 AI Copilot Sidebar (Right Panel — Persistent)

The **AI Copilot** is a fixed right-hand sidebar present on every screen. It serves as the primary interface between the user and the AI agent system.

#### Header
- Robot/agent avatar icon with green ring
- Title: "**AI Copilot**"
- Subtitle: "Active: Deal Coach" (shows which agent is primary)
- Green dot = "LIVE" / active status

#### Agent Switcher (4 modes)
| Mode | Icon | Description |
|------|------|-------------|
| **Deal Coach** | 🧠 | Strategy & tactics agent — always primary. Analyzes deal health, flags risks, suggests next actions |
| **Research Agent** | 🔍 | Intel & compliance — scrapes company info, enriches stakeholders, builds account briefs |
| **Live Insights** | ✨ | Real-time signal detection feed |
| **Activity Log** | 📋 | Chronological log of all agent and human actions |

The active agent is highlighted in solid purple; others are listed below.

#### Contextual Content (varies by screen)

**On Kanban Board:**
- **Deal Stream** (LIVE badge) — real-time feed of agent-generated events:
  - `STRATEGY GEN` (blue dot): "Drafted multi-thread approach for Wayne Ent. targeting the new CFO." → [Review Draft] [Dismiss]
  - `SIGNAL DETECTED` (green dot): "Cyberdyne updated their tech stack profile. Possible synergy with our API module."
  - `RISK ALERT` (red dot): "Staleness detected in Umbrella Corp. Engagement score dropped below 20%."
- **Strategic Insight**: Deep analysis cards with sparkle icon, purple-tinted background
- **Global Activity Log** button at bottom

**On Account 360:**
- **Strategic Move**: AI recommendation with "Apply Insight" / dismiss buttons
- **Live Updates**: "TechNova CFO mentioned 'Galent' in their earnings call", "Sarah Chen opened the latest proposal PDF"
- **Ask Copilot** text input at bottom

**On AI Forecasting:**
- **Neural Intelligence Core** visualization (dark card with animated ring)
- **Recommended Tasks**: Agent-drafted tasks with "Review required" status. E.g., "Draft outreach for CloudTech CTO — Agent drafted. Review required.", "Prep for Acme Executive QBR — Briefing doc generated."
- **Ask AI Copilot** command input (purple background)

**On Outreach Intelligence:**
- **Daily Suggestion**: "You have 4 'Closed-Lost' deals from last quarter that just raised Series B. Reach out with the 'Re-engagement' template?" → [Draft Messages]

**On Integrations:**
- **Health Monitor** mode (replaces Deal Coach)
- **Active Audit**: "I've identified a data mismatch in the Salesforce 'TCV' field mapping. I've prepared a correction to ensure your forecasting remains 99.4% accurate." → [Apply Correction]
- **Integration Insight**: "I noticed Salesforce sync latency increased by 14s. I recommend switching to the WebSocket listener to maintain real-time deal alerts." → [Apply Optimization]

---

## 5. Screen-by-Screen Requirements

### 5.1 Pipeline Board (Kanban) — Enhanced

**Reference screens:** `kanban_board_galent_lab_v3`, `agentic_kanban_deal_intelligence_hub`

#### Card Design (Enhanced)
Each opportunity card now shows:

| Element | Position | Description |
|---------|----------|-------------|
| **Company Name** | Top-left, bold | "Stark Industries", "Wayne Ent." |
| **AI Status Dot** | After company name | Green dot = on track, Red dot = at risk |
| **Status Icon** | Top-right | ✅ (on track) or ⚠️ (at risk) |
| **TCV** | Below name, large | "$240k", "$580,000" — abbreviated for large values |
| **Health Bar** | Labeled row | "HEALTH" label + colored progress bar + percentage (85%, 42%). Green >70, Yellow 40-70, Red <40 |
| **Win Probability Bar** | Labeled row | "WIN PROB." label + purple progress bar + percentage (70%, 25%) |
| **Agent Signal** | Below metrics | Purple sparkle icon + "AGENT SIGNAL" label + insight text. E.g., "Expansion signal detected in news.", "Decision maker has gone dark." |
| **Owner Avatars** | Bottom-left | Stacked avatar circles + AI bot badge (green robot icon) |
| **Status Label** | Bottom-right | "ON TRACK" (green) or "AT RISK" (red/orange) |
| **Invoke Agent** | Bottom-right | "Invoke Agent ⚡" link — click to trigger agent action on this deal |

#### Column Headers
- Status name in **uppercase label-md** with item count badge
- Three-dot menu (⋯) for column actions

#### New Deal Button
- "+ New Deal" with dashed border at bottom of each column

#### Horizontal Scroll
- "↔ HORIZONTAL SCROLL" indicator at bottom center when columns overflow

### 5.2 Neural Command Center — **NEW VIEW**

**Reference screen:** `neural_command_center_agentic_workspace`

This is a **new dedicated AI workspace** where users can have multi-agent conversations and receive deep strategic analysis.

#### Layout
- **Left panel**: Neural Core status card
- **Center panel**: Chat/conversation interface
- **Right panel**: AI Copilot sidebar

#### Neural Core Card (Left)
- Title: "⚙ Neural Core" with "LIVE AGENT LINK ACTIVE" subtitle
- **Inference Speed**: Real-time latency display (e.g., "42ms") with signal indicator
- **Signal Strength**: Confidence percentage (e.g., "98%") with broadcast icon
- **Actionable Insights** section below:
  - Cards with colored left-border tags: `STRATEGY` (green), `RISK` (red)
  - Insight text + source attribution ("Deal Coach Rec", "82% Match")
  - Action buttons: "Update Pipeline", "MANAGE NODE >"
  - Threat level indicators: "⚠ High Threat"

#### Chat Interface (Center)
- **Header**: "Neural Command Center — Active Collaboration: Deal Coach & Research Agent"
- **Multi-agent conversation** with distinct avatar/identity per agent:
  - **Deal Coach** messages (purple icon): Strategic analysis of transcripts, budget holder expressions, multi-year lock-in insights. Offers actionable buttons: [Show Slide Examples] [Compare Pricing Models]
  - **Research Agent** messages (green icon): CTO intelligence, drafted email snippets with purple-highlighted quote blocks. Offers: [Copy to Email] link
  - **User messages** (purple bubbles, right-aligned): Natural language commands
- **Quick Action Chips** above input: [Summarize last call] [Find stakeholders] [Draft proposal]
- **Input**: "Talk to your Command Center..." with ⊕ attachment button
- **Win Probability** footer: percentage bar with delta indicator ("+4% since last session analysis")

### 5.3 Account 360 Intelligence — **NEW VIEW**

**Reference screen:** `account_360_intelligence_galent_lab_v3`

A company-level intelligence hub that rolls up all opportunities, stakeholders, and AI signals for a single account.

#### Account Header
- **Account badge**: "STRATEGIC ACCOUNT" (green pill badge) for high-value accounts
- **Company name**: Large headline ("TechNova Corp")
- **Description**: "Enterprise SaaS Solutions | Global Logistics Domain"
- **Health Indicators** (top-right circles):
  - **Account Health**: 0-100 score in circular badge (green/yellow/red)
  - **Penetration**: Percentage showing account wallet share

#### Stakeholder Neural Map
- **Visual relationship map** showing stakeholders as nodes with role labels:
  - Green border = **Champion** (e.g., "Sarah Chen, CTO")
  - Red/orange border = **Evaluator** (e.g., "Marcus Vogt, VP Logistics")
  - Connecting lines show relationships
- Expand/collapse toggle and settings gear icon
- AI detects relationship dynamics and engagement levels

#### Opportunities Panel
- **Total TCV** header ("$4.2M Total")
- List of all opportunities at this account:
  - Name, TCV, Stage, Confidence % with progress bar
  - E.g., "Global API Rollout — $2.5M — Proposal Phase — 85% Conf."
  - "Supply Chain AI — $1.2M — Discovery — 40% Conf."
  - "Maintenance Q4 — $500k — Contracting — 99% Conf."

#### Health Indicators Panel
| Metric | Value | Trend | Context |
|--------|-------|-------|---------|
| Sentiment Score | +12% | ↑ | "Positive trajectory based on last 4 meetings" |
| Stakeholder Activity | -5% | ↓ | "Sarah Chen has missed the last two syncs" |

#### AI News Insights (Bottom Section)
Horizontal card carousel of AI-detected signals:

| Card Type | Badge Color | Example |
|-----------|-------------|---------|
| **Strategic Insight** | Purple | "TechNova Q3 Earnings Beat — Reported 20% growth in logistics vertical. Perfect alignment for the proposed API rollout expansion." → [Draft Email →] |
| **Industry News** | Gray | "New Competitor Contract — Competitor X signed with a TechNova subsidiary. AI recommends addressing multi-vendor risk." → [View Analysis] |
| **Personnel Shift** | Orange | "New Director of Infrastructure — James Wilson joins from GlobalFreight. Previously used our platform at his former role." → [Connect on LinkedIn] |

Each card shows timestamp ("2 hours ago", "Yesterday", "3 days ago") and a CTA button.

### 5.4 AI Forecasting Lab — **NEW VIEW**

**Reference screen:** `ai_forecasting_lab_galent_lab_v3`

AI-powered pipeline forecasting with scenario modeling and predictive analytics.

#### KPI Cards (Top Row)
| Metric | Example Value | Subtext | Border |
|--------|--------------|---------|--------|
| **Total Weighted Pipeline** | $24.8M | "Calculated from 142 active opportunities" | Purple left border |
| **AI Commit Forecast** | $18.2M | "94.2% AI Confidence Interval" | Green left border |
| **Days to Close (Avg)** | 42d | "↓ 5d — Shortened by agentic automation" | Orange left border |

#### Weighted Pipeline Waterfall
- **Period selector**: Q3 FY24 / Quarterly View toggle buttons
- **Waterfall chart** showing pipeline movement:
  - Opening → + New Pipeline → + Expansions → - Lost/Slipped → Current
  - Example: $21.4M → +$6.2M → +$3.1M → -$2.4M → $28.3M
  - Green for additions, red for losses

#### Scenario Modeling
Interactive sliders for "what-if" analysis:
| Parameter | Slider | Value |
|-----------|--------|-------|
| Lead Conversion Rate | ——●——— | 18% |
| Average Deal Size (k) | ———●—— | $125 |
| Quota Attainment Goal | ————●— | 85% |

**AI Impact Prediction** box below:
- "Projected Gap to Goal: **+$1.2M**" with lightning bolt icon and green progress bar

#### Agentic Insights Feed (Bottom)
Horizontal cards with signal type badges:

| Signal Type | Badge | Example |
|-------------|-------|---------|
| **Upside Potential** | Green arrow up | "Acme Global Expansion — Agent identified 3 unmapped..." |
| **Stalled Progress** | Red triangle | "Starlight Systems — Decision maker has not replied..." |
| **Closing Pattern** | Purple checkmark | "Horizon Retail — Procurement signatures..." |
| **Competitor Alert** | Orange radar | "CloudTech Corp — Agent detected competitor..." |

### 5.5 Revenue Funnel Intelligence — **NEW VIEW**

**Reference screen:** `ai_revenue_funnel_confidence_scoring`

Full-funnel view with AI-powered conversion analysis and lead-level intelligence.

#### Funnel Stage Cards (Top Row)
| Stage | Count | Progress Bar |
|-------|-------|-------------|
| LEAD | 1,248 | Purple |
| MQL | 842 | Purple |
| SQL | 315 | Purple |
| OPPORTUNITY | 124 | Purple |
| WON | 42 | Green |

Each card has an **AI micro-insight** below:
- "Inbound surge detected from SaaS Connect event."
- "Competitor X just raised Series B; 12 leads browsing comparison pages."
- "Approval lag in Mid-Market. Avg time to SQL increased by 2.4 days."
- "Expansion opportunity: Stellar Tech requested security docs."
- "Target Hit: 104% of monthly quota achieved via AI prioritization."

#### Priority Action Pipeline
Cards showing highest-priority leads with AI match scores:
- **Contact avatar** + Name + Title
- **AI Match Score**: "94% MATCH", "88% MATCH" (green badge)
- **Quote block**: Key buyer signal in context (e.g., "We need to consolidate our tech stack by Q3. Price is secondary to integration depth.")
- **Source badges**: `AI`, `SF` (Salesforce), `RE-ENGAGEMENT`
- **Action button**: "Generate Follow-up" (purple)

#### Pipeline Velocity & Confidence Chart
- Monthly bar chart (Jan-May) showing pipeline confidence with growing bars
- "AI ANALYZING PIPELINE DATA..." loading indicator overlay

### 5.6 Outreach Intelligence — **NEW VIEW**

**Reference screen:** `campaign_assistant_outreach_registry`

AI-powered outreach management with campaign analytics and auto-drafted follow-ups.

#### View Toggle
- **SDR** / **AE View** toggle at top (role-specific dashboards)

#### Page Header
- Hero title: "Outreach **Intelligence**" (green accent on "Intelligence")
- Subtitle: "Leveraging active buyer signals and HubSpot intent to automate your high-conversion pipeline."

#### Campaign Performance (Top Cards)
| Metric | Value | Subtext |
|--------|-------|---------|
| SENT | 1,284 | ↑12% vs last week |
| OPENED | 842 | 65.6% Open Rate |
| REPLIED | 156 | ⚡12.1% Reply Rate |

Period selector: "Last 7 Days" dropdown.

#### Outreach Drafter (AI Powered)
- **Agent card**: "Outreach Drafter — Generating context-aware follow-ups based on HubSpot activity" with `AI POWERED` badge
- **Draft preview**: Full email text in italic serif, personalized to stakeholder context:
  > "Hi Sarah, I noticed you just viewed the Enterprise Security whitepaper from our LinkedIn ad. Given your current Q3 initiatives at Acme Corp, I thought you'd find our automated SOC2 compliance module particularly relevant..."
- **Source/Tone tags**: `Source: HubSpot Activity`, `Tone: Professional/Urgent`
- **Actions**: Purple "▶ Approve & Send" button + ✏️ Edit icon

### 5.7 Agent Registry — **NEW VIEW**

**Reference screen:** `ai_agent_registry_galent_lab_v3`

Management dashboard for the fleet of autonomous AI agents.

#### Page Header
- Hero title: "**Agent Registry**" (Source Serif 4, large)
- Subtitle: "Manage your fleet of autonomous sales agents. These entities observe signals, synthesize research, and provide proactive deal coaching across your entire pipeline."

#### System Health KPIs
| Metric | Value | Icon | Subtext |
|--------|-------|------|---------|
| ACTIVE NODES | 12/15 | ((●)) broadcast | — |
| TOTAL INFERENCES | 42.8k | 🧠 | "↗ +12% vs last 24h" |
| NEURAL LATENCY | 14ms | ⏱ | "Optimal System Health" |

#### Agent Cards
Each agent displayed as a card:

**Deal Coach** (Strategy & Tactics):
- **Status badge**: `LIVE` (green)
- **Neural Link Intensity**: 98% progress bar (green)
- **Power Output**: 4.2 kW
- **Uptime**: 99.9%
- **Recent Insight** (purple-bordered quote): "Opportunity #882: Prospect mentioning budget freeze. Recommend shifting to ROI-based case study by tomorrow."
- **Action**: "MANAGE NODE >"
- **Carousel dots**: Multiple insight cards

**Research Agent** (Intel & Compliance):
- **Status badge**: `IDLE` (gray)
- **Neural Link Intensity**: progress bar (lower)
- **Power Output**: 0.1 kW
- **Active Threads**: 0
- **Status text**: "Last seen 2h ago monitoring SEC filings for 12 accounts."
- **Action**: "WAKE AGENT" (green button)

#### System Registry Logs
Monospaced terminal-style log display with timestamps:
```
[09:42:11] INITIALIZING GALENT_AGENT_OS_V4.2.0...
[09:42:12] AUTH_SUCCESS: User Felix authenticated as ADMIN.
[09:42:15] NODE_LINK: Deal Coach established high-fidelity stream to SF_PIPELINE.
[09:43:01] SCRAPE_START: Research Agent beginning quarterly report synthesis for top 50 acc...
[09:45:22] SIGNAL_LOCK: Sentiment Link detected outlier in LinkedIn activity for Account_ID...
[09:46:00] INFERENCE_COMPLETE: Strategy recommendation pushed to Sales Dashboard for Opport...
[09:48:11] SYSTEM: All neural links operating within parameters (+/- 2ms variance).
```

#### Copilot Interaction (Right Panel)
- **Agent Thinking** indicator (green dot): "I'm analyzing the 3 new opportunities in your pipeline. Want me to draft outreach based on their latest funding rounds?"
- Action buttons: [Yes, Draft] (green) [Ignore] (outline)

### 5.8 System Integrations — **NEW VIEW**

**Reference screens:** `system_integrations_salesforce_hubspot_hub`, `ai_assisted_integrations_neural_sync`

AI-managed integration hub for connecting external systems.

#### Page Header
- Hero title: "System **Integrations**" (green accent) or "Integration **Intelligence**" (green accent)
- Subtitle: "Orchestrate your entire sales stack through Galent's neural sync engine. Monitor real-time data health and automated schema mappings across all connected platforms."

#### Integration Cards
| System | Type | Status Badge | Sync Health | Sync Freq | Health Score |
|--------|------|-------------|-------------|-----------|-------------|
| **Salesforce** | Enterprise CRM Sync | `ACTIVE` / `SYNCING` (green) | 94% bar | 2m | 98 |
| **HubSpot** | Marketing Pipeline / Inbound Pipeline Sync | `ACTIVE` / `STABLE` (green) | 81% bar | Real-time | 92 |

Each card includes:
- System icon + name + description
- "Neural Link Intensity" percentage bar
- **Agent Suggestion** (on Salesforce): "Latency detected (+14s). I recommend switching to WebSocket listener." → [FIX NOW]
- **Health Check** (on HubSpot): "Data integrity verified. Syncing 42 new leads with 100% confidence."

#### AI Schema Mapper
- Title: "AI Schema Mapper" or "Neural Schema Mapper"
- Description: "Galent is autonomously mapping 42 fields between Salesforce and your Internal Knowledge Base."
- **Conversational mapping interface**: Agent explains its reasoning in natural language:
  > "I've mapped `SFDC_Account_Name` to `Galent_Identity` because they share 98% types. Would you like me to also normalize the case format?"
  > → [Yes, normalize] [Explain logic more]
- **Visual field mapping**: Source field → colored confidence line → destination field
  - `SFDC_Account_Name` ——●—— `Galent_Identity` (high confidence, green)
  - `TCV_Projected` ————— `Forecast_TCV` (medium, purple)
  - `Primary_Stakeholder` ————— `Decision_Maker` (high, green)

#### Bottom Actions
| Card | Description |
|------|-------------|
| **Connect New Source** | "Add ZoomInfo, Outreach, or custom API endpoints." |
| **Data Health / Neural Audit Logs** | "Review 12 warnings" / "Review 12 automated optimizations from the last 24h." |

---

## 6. New Data Models (Future)

### 6.1 Account Entity (NEW)
| Field | Type | Description |
|-------|------|-------------|
| id | UUID PK | Auto-generated |
| companyName | text | Company name |
| website | text | Company URL |
| industry | varchar | Industry vertical |
| employeeCount | integer | Company size |
| annualRevenue | integer | Annual revenue (USD) |
| hqLocation | text | Headquarters |
| techStack | text[] | Detected technologies |
| description | text | Company description |
| accountType | varchar | Strategic, Enterprise, Mid-Market, SMB |
| accountHealth | integer | AI-computed 0-100 |
| penetration | integer | Wallet share percentage |
| createdAt / updatedAt | timestamp | Auto-managed |

### 6.2 Enhanced Opportunity Fields
| Field | Type | Description |
|-------|------|-------------|
| accountId | FK → accounts | Links opportunity to account |
| dealHealthScore | integer | AI-computed 0-100 |
| winProbability | integer | ML-predicted close % |
| aiStatus | varchar | "on_track", "at_risk", "stale", "closing" |
| competitorNames | text[] | Known competitors |
| lossReason | varchar | Why deal was lost |
| championId | FK → stakeholders | Internal champion |
| nextStep | text | AI-suggested next action |
| nextStepDueDate | timestamp | When next action is due |
| lastActivityDate | timestamp | Auto-updated on any interaction |
| stageEnteredDate | timestamp | When entered current stage |
| qualificationScore | jsonb | MEDDIC/BANT scores |
| sentimentScore | integer | AI-computed from conversations |

### 6.3 Agent System Models

#### Agent Registry
| Field | Type | Description |
|-------|------|-------------|
| id | UUID PK | Agent identifier |
| name | varchar | "Deal Coach", "Research Agent" |
| type | varchar | strategy, research, outreach, hygiene, forecast |
| status | varchar | live, idle, sleeping, error |
| neuralLinkIntensity | integer | 0-100 connection strength |
| powerOutput | float | Processing load (kW metaphor) |
| uptime | float | Availability percentage |
| activeThreads | integer | Current parallel tasks |
| totalInferences | integer | Lifetime inference count |
| lastActiveAt | timestamp | Last activity |
| config | jsonb | Agent-specific configuration |

#### Agent Actions Queue
| Field | Type | Description |
|-------|------|-------------|
| id | UUID PK | Action identifier |
| agentId | FK → agents | Which agent generated this |
| opportunityId | FK → opportunities (nullable) | Related deal |
| accountId | FK → accounts (nullable) | Related account |
| actionType | varchar | strategy_gen, signal_detected, risk_alert, draft_outreach, task_suggestion |
| title | text | Short title |
| description | text | Full insight/recommendation |
| status | varchar | pending, approved, dismissed, auto_executed |
| confidence | integer | AI confidence percentage |
| suggestedActions | jsonb | Array of {label, action} buttons |
| createdAt | timestamp | When generated |
| resolvedAt | timestamp | When user acted |
| resolvedBy | text | Who approved/dismissed |

#### Agent Audit Log
| Field | Type | Description |
|-------|------|-------------|
| id | UUID PK | Log entry ID |
| agentId | FK → agents | Which agent |
| timestamp | timestamp | When it happened |
| eventType | varchar | inference_complete, scrape_start, signal_lock, node_link, auth_success, system |
| message | text | Log message |
| metadata | jsonb | Additional structured data |

### 6.4 Integration Models

#### Connected Systems
| Field | Type | Description |
|-------|------|-------------|
| id | UUID PK | Integration ID |
| systemName | varchar | "Salesforce", "HubSpot", "ZoomInfo" |
| systemType | varchar | crm, marketing, enrichment, telephony, storage |
| status | varchar | active, syncing, stable, error, disconnected |
| syncHealth | integer | 0-100 health score |
| syncFrequency | varchar | "2m", "real-time", "hourly" |
| healthScore | integer | Overall integration health |
| neuralLinkIntensity | integer | 0-100 |
| lastSyncAt | timestamp | Last successful sync |
| config | jsonb | Connection config (encrypted) |
| fieldMappings | jsonb | Schema mapping definitions |

### 6.5 Campaign / Outreach Models

#### Outreach Campaigns
| Field | Type | Description |
|-------|------|-------------|
| id | UUID PK | Campaign ID |
| name | text | Campaign name |
| type | varchar | email, linkedin, phone |
| status | varchar | active, paused, completed |
| sent | integer | Emails sent |
| opened | integer | Emails opened |
| replied | integer | Replies received |
| period | varchar | Date range |

#### Outreach Drafts
| Field | Type | Description |
|-------|------|-------------|
| id | UUID PK | Draft ID |
| campaignId | FK → campaigns (nullable) | Parent campaign |
| opportunityId | FK → opportunities (nullable) | Related deal |
| stakeholderId | FK → stakeholders (nullable) | Target contact |
| subject | text | Email subject |
| body | text | Draft content |
| source | varchar | "HubSpot Activity", "LinkedIn Signal", "Deal Coach" |
| tone | varchar | "Professional/Urgent", "Warm/Casual", "Executive" |
| aiGenerated | boolean | Whether AI-drafted |
| status | varchar | draft, approved, sent, bounced |
| createdAt / sentAt | timestamp | Timestamps |

---

## 7. Agent System Architecture

### 7.1 Agent Runtime Framework

| Component | Description |
|-----------|-------------|
| **Agent Registry** | Catalog of available agents with capabilities, permissions, config. Visual management in Agent Registry view |
| **Agent Runtime** | Execution engine that runs agents on triggers (time-based, event-based, user-invoked). Shows as "Neural Intelligence Core" in UI |
| **Agent Memory** | Per-deal and per-account persistent memory so agents retain context across interactions |
| **Tool Layer** | Functions agents can call: search web, query CRM data, draft emails, create tasks, update fields, call external APIs |
| **Human-in-the-Loop** | Approval gates: [Review Draft] [Approve & Send] [Apply Insight] [Dismiss] [Yes, Draft] [Ignore]. Configurable trust levels |
| **Neural Audit Trail** | Every agent action logged in terminal-style registry logs with timestamps and event types |

### 7.2 Agent Types (from Reference Screens)

| Agent | Status States | Neural Link | What It Does |
|-------|--------------|-------------|-------------|
| **Deal Coach** | LIVE, IDLE | High (98%) | Strategy & tactics. Analyzes deal health, flags risks, suggests next actions, drafts multi-thread approaches, recommends stage transitions. Always-on primary agent |
| **Research Agent** | LIVE, IDLE, SLEEPING | Variable | Intel & compliance. Scrapes company info, monitors SEC filings, detects tech stack changes, enriches stakeholder profiles, builds account intelligence briefs |
| **Outreach Drafter** | AI POWERED | On-demand | Generates context-aware follow-up emails based on CRM activity, buyer signals, and stakeholder context. Includes source attribution and tone tags |
| **Pipeline Hygiene Agent** | Nightly cron | Background | Identifies stale deals, missing fields, duplicate opportunities, inconsistent data |
| **Forecast Agent** | On-demand | Background | Generates weighted pipeline forecast, scenario modeling, gap-to-goal predictions |
| **Competitive Intel Agent** | Signal-triggered | Background | Detects competitor mentions in logs, monitors competitor funding/contracts, builds battle cards |

### 7.3 Agent Interaction Patterns

| Pattern | Description | Example from Screens |
|---------|-------------|---------------------|
| **Proactive Card** | Agent pushes insight card to Copilot sidebar | "Strategy for Wayne Ent. — Engagement risk detected..." |
| **Approval Gate** | Agent drafts action, waits for human approval | [Review Draft] [Dismiss] or [Approve & Send] [✏️ Edit] |
| **Quick Actions** | Agent suggests clickable actions | [Draft follow-up email →] [Schedule executive review →] |
| **Conversational** | Multi-turn dialogue in Neural Command Center | User asks → Deal Coach responds → Research Agent adds context → User refines |
| **Background Signal** | Agent detects signal, logs to stream | "SIGNAL DETECTED: Cyberdyne updated their tech stack profile." |
| **Agent Thinking** | Copilot shows agent's reasoning process | "I'm analyzing the 3 new opportunities in your pipeline..." |
| **Wake/Invoke** | User manually activates idle agent | "WAKE AGENT" button, "Invoke Agent ⚡" button |

---

## 8. Workflow Automation

### 8.1 Trigger-Action Workflows
| Trigger | Auto-Action |
|---------|-------------|
| Deal enters Proposal stage | Auto-create tasks: Draft SOW, Schedule pricing review, Assign presales architect |
| Deal inactive >14 days | Pipeline Hygiene Agent flags as stale, sends reminder to owner |
| Deal TCV > threshold | Require VP approval before stage transition |
| Deal moves to Won | Handoff Agent generates delivery briefing document |
| New opportunity created | Research Agent auto-enriches account and stakeholder data |
| Stakeholder viewed proposal | Signal detected → Copilot suggests follow-up |
| Competitor detected | Competitive Intel Agent builds battle card |

### 8.2 Notification Engine
| Channel | Events |
|---------|--------|
| **In-App (Copilot)** | All agent signals, task reminders, deal updates |
| **Email Digest** | Daily/weekly pipeline summary, at-risk deals, upcoming closes |
| **Slack** | Deal stage changes, won/lost notifications, agent alerts |

---

## 9. Access Control & Multi-Tenancy

### 9.1 User Management

| Feature | Description |
|---------|-------------|
| **RBAC** | Roles: Admin, Sales Manager, Sales Rep (AE), SDR, Presales, Viewer |
| **Team Hierarchy** | Organization → Teams → Users. Pipeline visibility scoped by team |
| **SSO** | SAML 2.0 / OAuth 2.0 (Okta, Azure AD, Google Workspace) |
| **User Profiles** | Avatar, name, email, role title (shown in sidebar: "Alex Chen, Director of Sales"), notification preferences, timezone |
| **Online Status** | Green dot on user avatar when active |

### 9.2 Data Visibility

| Rule | Description |
|------|-------------|
| Rep sees own deals | Default for AE/SDR roles |
| Manager sees team deals | All direct report opportunities |
| Admin sees everything | Full visibility + agent configuration |
| Field-level permissions | Sensitive fields (margin, TCV) restricted by role |

---

## 10. Platform & Infrastructure

### 10.1 API-First Architecture
| Feature | Description |
|---------|-------------|
| Versioned REST API | `/api/v1/...` for all functionality |
| Webhook System | Events: deal stage change, deal won/lost, agent signal, task overdue |
| API Keys & Rate Limiting | Per-user keys, usage tracking |

### 10.2 Real-Time Features
| Feature | Description |
|---------|-------------|
| WebSocket Updates | Live deal stream in Copilot sidebar |
| Presence Indicators | Who's viewing a deal |
| Agent Stream | Real-time agent signal feed with LIVE badge |

### 10.3 Data & Scale
| Feature | Description |
|---------|-------------|
| Full-Text Search | PostgreSQL tsvector across all entities |
| Server-side Pagination | For large datasets |
| Redis Caching | Dashboard analytics, agent inference cache |
| File Upload | S3/GCS backend for resource attachments |
| Data Import/Export | Bulk CSV import, full export |

---

## 11. Phase Roadmap

### Phase 1: Platform Foundation (Current → v1.5)
*Goal: Restructure shell, add Account entity, harden for production*

- [ ] Restructure navigation from header-dropdown to persistent left sidebar
- [ ] Implement new design system (colors, typography, spacing from DESIGN.md)
- [ ] Replace Replit auth with proper SSO (Google OAuth / SAML)
- [ ] Update favicon to Galent brand icon
- [ ] Add user roles (Admin, Manager, Rep, SDR, Viewer) with sidebar profile card
- [ ] Create Account entity with multi-opportunity rollup
- [ ] Server-side pagination on all list views
- [ ] Full-text search (PostgreSQL tsvector)
- [ ] Notification engine (in-app bell)
- [ ] Data import (CSV) and bulk export
- [ ] Dark mode polish per design system spec

### Phase 2: Intelligence Layer (v2.0)
*Goal: Add AI Copilot and Deal Intelligence to existing views*

- [ ] AI Copilot right sidebar (persistent, all screens)
- [ ] Agent runtime framework (trigger → reason → act → log)
- [ ] Deal Health Score (0-100, green/yellow/red bars on Kanban cards)
- [ ] Win Probability (purple bar on Kanban cards)
- [ ] AI Status indicators on cards (on track / at risk dots)
- [ ] Agent Signal cards on Kanban cards
- [ ] Deal Coach agent (risk signals, next-best-action, strategic insights)
- [ ] Pipeline Hygiene Agent (nightly: stale deals, missing fields)
- [ ] Smart conversation summarization
- [ ] AI insights in Copilot sidebar (Strategic Insight, Active Risks, Recommended Actions)

### Phase 3: Agentic Views (v2.5)
*Goal: Build the new AI-native views*

- [ ] Account 360 Intelligence view (stakeholder neural map, health indicators, AI news insights)
- [ ] AI Forecasting Lab (weighted pipeline waterfall, scenario modeling, agentic insights feed)
- [ ] Revenue Funnel Intelligence (funnel stage cards with AI micro-insights, priority action pipeline)
- [ ] Neural Command Center (multi-agent chat, actionable insights, neural core status)
- [ ] Agent Registry (agent management, system health KPIs, registry logs)
- [ ] Research Agent (auto-enrich accounts, stakeholder data, news signals)
- [ ] Outreach Drafter agent (context-aware follow-ups with approve/send flow)
- [ ] Competitive Intelligence agent

### Phase 4: Connected Platform (v3.0)
*Goal: System integrations with AI-managed sync*

- [ ] System Integrations view (integration cards, sync health, neural link intensity)
- [ ] AI Schema Mapper (natural language field mapping between systems)
- [ ] Salesforce integration (Enterprise CRM Sync, bidirectional)
- [ ] HubSpot integration (Marketing Pipeline, inbound lead sync)
- [ ] Outreach Intelligence view (campaign performance, SDR/AE toggle)
- [ ] Gmail / Outlook email sync
- [ ] Google Calendar / O365 integration
- [ ] Slack integration (notifications, slash commands)
- [ ] Connect New Source flow (ZoomInfo, custom API endpoints)
- [ ] Neural Audit Logs for integration health monitoring

### Phase 5: Scale & Optimize (v3.5+)
*Goal: Enterprise readiness*

- [ ] Multi-tenant architecture
- [ ] Team hierarchy and org-level pipeline views
- [ ] Field-level permissions
- [ ] Forecast categories (Commit / Best Case / Pipeline / Omitted)
- [ ] Rep leaderboard and coaching insights
- [ ] Revenue waterfall visualization
- [ ] SOC 2 compliance and data residency
- [ ] White-label / custom branding
- [ ] Mobile native app

---

## 12. Non-Functional Requirements

| Category | Requirement |
|----------|-------------|
| **Performance** | Page load < 2s. API response < 200ms (p95). Dashboard renders < 3s for 10K opportunities. Agent inference < 50ms (target: 14ms as shown in screens) |
| **Availability** | 99.9% uptime SLA. Agent uptime target: 99.9%. Graceful degradation if AI services unavailable |
| **Security** | HTTPS everywhere. Encrypted at rest (AES-256). RBAC enforced server-side. OWASP Top 10 mitigated. API rate limiting. Integration credentials encrypted |
| **Privacy** | GDPR-compliant. Right to deletion. No training on customer data without consent |
| **Scalability** | 10K concurrent users, 1M opportunities, 10M tasks. Horizontal scaling |
| **Observability** | Structured logging, APM tracing, Sentry error tracking. Agent-specific telemetry (power output, inference count, latency) |
| **Accessibility** | WCAG 2.1 AA. Keyboard navigable. Screen reader compatible |
| **Browser Support** | Chrome, Firefox, Safari, Edge (latest 2 versions) |

---

## 13. Success Metrics

| Metric | Target | How Measured |
|--------|--------|-------------|
| **Pipeline Visibility** | 100% deals tracked | Deal count vs. known pipeline |
| **Rep Adoption** | >80% DAU | Login frequency |
| **Deal Velocity** | 15% reduction in avg days to close | Stage timestamp analysis |
| **Forecast Accuracy** | <15% variance | Quarterly forecast vs. actuals |
| **Win Rate** | 5% improvement in 6 months | Won / (Won + Lost) |
| **Data Quality** | <5% missing critical fields | Hygiene agent reports |
| **Agent Engagement** | >50% of suggestions acted upon | Accept/dismiss rate |
| **Time Saved** | 5+ hours/week/rep | User survey + activity tracking |
| **Agent System Health** | >95% agent uptime | Neural link intensity monitoring |
| **Integration Sync Health** | >90% across all systems | Sync health scores |
| **Outreach Effectiveness** | >10% reply rate on AI drafts | Campaign performance metrics |

---

## 14. Glossary

| Term | Definition |
|------|------------|
| TCV | Total Contract Value — full deal value over contract lifetime |
| POC | Point of Contact |
| MEDDIC | Metrics, Economic Buyer, Decision Criteria, Decision Process, Identify Pain, Champion |
| Neural Link | AI-managed connection between Galent and an external system |
| Neural Intelligence Core | The central AI engine that powers all agent inferences |
| Agent Signal | A proactive insight or alert generated by an AI agent |
| Deal Stream | Real-time feed of agent-generated events in the Copilot sidebar |
| Schema Mapper | AI-powered field mapping between external systems and Galent's data model |
| Health Score | AI-computed 0-100 composite metric (for deals, accounts, or integrations) |
| T&M | Time & Material billing model |
| FP | Fixed Price billing model |
| ITS | IT Services (service line) |
| STF | Staffing (service line) |
| SDR | Sales Development Representative |
| AE | Account Executive |
| DAU | Daily Active Users |
| RBAC | Role-Based Access Control |
| SSO | Single Sign-On |
| QBR | Quarterly Business Review |

---

## 15. Reference Screens Index

| Screen | File | Key Features Defined |
|--------|------|---------------------|
| Kanban Board | `kanban_board_galent_lab_v3` | Health bars, win probability, AI copilot with strategic insight, active risks, recommended actions |
| Agentic Kanban | `agentic_kanban_deal_intelligence_hub` | Agent signals on cards, deal stream (LIVE), invoke agent, strategy gen with approval |
| Neural Command Center | `neural_command_center_agentic_workspace` | Multi-agent chat, neural core status, actionable insights, quick action chips |
| Account 360 | `account_360_intelligence_galent_lab_v3` | Stakeholder neural map, opportunities rollup, health indicators, AI news insights |
| Agent Registry | `ai_agent_registry_galent_lab_v3` | Agent cards (LIVE/IDLE), system health KPIs, registry logs, wake/manage agents |
| AI Forecasting | `ai_forecasting_lab_galent_lab_v3` | Weighted pipeline waterfall, scenario modeling sliders, agentic insights feed |
| Revenue Funnel | `ai_revenue_funnel_confidence_scoring` | Funnel stages with AI micro-insights, priority action pipeline, velocity chart |
| Outreach Intelligence | `campaign_assistant_outreach_registry` | Campaign performance, outreach drafter, approve & send flow, daily suggestions |
| Integration Intelligence | `ai_assisted_integrations_neural_sync` | AI schema mapper, sync health, agent suggestions, active audit |
| System Integrations | `system_integrations_salesforce_hubspot_hub` | Integration cards, neural link intensity, schema mapper, connect new source |

---

*This is a living document. Updated as requirements evolve and user feedback is incorporated.*

*Maintained by Galent Product & Engineering*
