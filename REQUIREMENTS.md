# Galent Sales Intelligence Platform
## Product Requirements Document (PRD)

**Version:** 2.0
**Date:** June 9, 2026
**Owner:** Galent Product & Engineering
**Status:** Active

---

## 1. Vision & Strategic Context

### 1.1 From Sales Tracker to AI-Native Revenue Platform

The current Galent Sales Board is a capable pipeline tracker with 7 views, stakeholder management, task tracking, and analytics. **The next evolution transforms it into an AI-native, agentic revenue intelligence platform** — where AI agents don't just display data but actively work alongside sales teams to research accounts, draft proposals, predict outcomes, and autonomously execute follow-up workflows.

### 1.2 Platform Thesis

> **"Every sales rep gets a tireless AI co-pilot that researches, reminds, drafts, and acts — so humans focus on relationships and strategy."**

The platform should feel like having a senior sales operations analyst, a research assistant, and a project manager embedded in every deal — powered by autonomous AI agents that operate on behalf of the team 24/7.

### 1.3 Target Users

| Persona | Role | Primary Need |
|---------|------|--------------|
| **Sales Rep / Account Exec** | Owns deals, drives pipeline | Deal execution, stakeholder tracking, next-best-action |
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

## 3. Brand Identity

### 3.1 Galent Logo

The app must use the official **Galent brand assets** throughout:

- **Logo (light theme):** `client/src/assets/logo-light.png` — Galent wordmark with green/purple gradient blob + orange accent
- **Logo (dark theme):** `client/src/assets/logo-dark.png` — Galent icon only (green/purple blob + orange accent) for dark backgrounds
- **Favicon:** Must be updated to match the Galent brand (current orange grid icon is a placeholder)

### 3.2 Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| Primary Purple | `#7c3aed` | Primary actions, headers, branding |
| Secondary Green | `#00dc82` | Success states, accents, highlights |
| Accent Orange | `#f97316` | Alerts, attention, CTA highlights |
| Background | Slate neutral palette | Professional base |

### 3.3 Typography

- Clean modern sans-serif (system stack or Inter)
- Serif accent for hero headings (landing page)
- Clear hierarchy: headings, subheadings, body, captions

---

## 4. Future Requirements — AI-Native & Agentic Capabilities

This section defines the platform evolution from a manual pipeline tracker into an **AI-native revenue intelligence platform**. Features are grouped by capability domain and prioritized into phases.

---

### 4.1 AI Agent Framework (Foundation Layer)

The platform needs a pluggable agent runtime that powers all AI features. Agents are autonomous units that observe, reason, and act on behalf of users.

#### 4.1.1 Agent Architecture

| Component | Description |
|-----------|-------------|
| **Agent Registry** | Catalog of available agents (Deal Coach, Research Agent, Outreach Agent, etc.) with capabilities, permissions, and configuration |
| **Agent Runtime** | Execution engine that runs agents on triggers (time-based, event-based, user-invoked) |
| **Agent Memory** | Per-deal and per-account persistent memory so agents retain context across interactions |
| **Tool Layer** | Functions agents can call: search web, query CRM data, draft emails, create tasks, update fields, call external APIs |
| **Human-in-the-Loop** | Approval gates for high-stakes actions (sending emails, changing deal stage, modifying TCV). Configurable trust levels per agent |
| **Audit Trail** | Every agent action logged with reasoning chain, tool calls, and outcomes — fully transparent |

#### 4.1.2 Agent Types

| Agent | Trigger | What It Does |
|-------|---------|-------------|
| **Deal Coach** | On every deal update, weekly digest | Analyzes deal health, flags risks, suggests next actions, recommends stage transitions |
| **Account Research Agent** | On new opportunity creation, on-demand | Scrapes company info (funding, news, leadership changes, tech stack), enriches stakeholder profiles from LinkedIn, builds account intelligence brief |
| **Outreach Drafting Agent** | User-invoked, or on deal stage change | Drafts follow-up emails, meeting agendas, proposal cover letters, thank-you notes — personalized to stakeholder context |
| **Pipeline Hygiene Agent** | Nightly cron | Identifies stale deals (no activity > X days), missing fields, duplicate opportunities, inconsistent data |
| **Forecast Agent** | Weekly, on-demand | Predicts close probability per deal using historical patterns, generates weighted pipeline forecast |
| **Competitive Intel Agent** | On-demand, on deal creation | Researches competitors mentioned in conversation logs, builds battle cards, flags competitive threats |
| **Meeting Prep Agent** | Before scheduled meetings (calendar integration) | Pulls together stakeholder bios, recent deal activity, open tasks, suggested talking points |
| **Handoff Agent** | On status change to "Won" | Generates delivery handoff document: SOW summary, key contacts, technical requirements, timeline, risks |

#### 4.1.3 Agent Interaction Model

- **Chat Interface**: Natural language interaction with agents in a deal-level or global chat panel
- **Agent Cards**: Proactive agent insights appear as cards in the opportunity detail view (e.g., "Deal Coach noticed: No stakeholder marked as decision maker. Win rate drops 40% without identified decision maker.")
- **Agent Actions Queue**: Pending agent-suggested actions that users can approve/reject/modify
- **Agent Settings**: Per-user and per-team configuration of agent frequency, autonomy level, notification preferences

---

### 4.2 Intelligent Deal Management

#### 4.2.1 AI Deal Scoring & Health

| Feature | Description |
|---------|-------------|
| **Deal Health Score** | 0-100 composite score per opportunity based on: stage velocity, stakeholder engagement depth, task completion rate, conversation recency, competitive pressure, decision-maker access |
| **Risk Signals** | Auto-detected risk flags: "No activity in 14 days", "No decision-maker identified", "Expected close date passed", "Single-threaded (only 1 stakeholder)", "Conversation log mentions competitor pivot" |
| **Stage Transition Recommendations** | AI suggests when a deal should move to the next stage based on qualification criteria met |
| **Win/Loss Prediction** | ML model trained on historical deal data predicting close probability. Shown as a confidence bar on each deal card |
| **Deal Velocity Tracking** | Average days in each stage vs. historical benchmarks. Highlight deals that are slower than normal |

#### 4.2.2 Smart Conversation Log

| Feature | Description |
|---------|-------------|
| **Structured Log Entries** | Replace free-text log with structured entries: type (Email, Call, Meeting, Note, Internal), timestamp, author, content, sentiment |
| **AI Summarization** | Auto-summarize long conversation threads into key takeaways |
| **Action Item Extraction** | AI parses conversation logs and auto-creates tasks from detected action items ("John said he'll send the RFP by Friday" → Task: "Receive RFP from John", due Friday) |
| **Sentiment Analysis** | Track stakeholder sentiment over time based on conversation content |
| **Meeting Notes Integration** | Paste or import meeting transcripts; AI extracts attendees, decisions, action items, next steps |

#### 4.2.3 Advanced Opportunity Fields (New)

| Field | Type | Description |
|-------|------|-------------|
| dealHealthScore | integer | AI-computed 0-100 |
| winProbability | integer | ML-predicted close % |
| competitorNames | text[] | Known competitors on this deal |
| lossReason | varchar | Why deal was lost (enum + free text) |
| championId | FK → stakeholders | Internal champion at customer |
| nextStep | text | AI-suggested or manually set next action |
| nextStepDueDate | timestamp | When next action is due |
| lastActivityDate | timestamp | Auto-updated on any interaction |
| stageEnteredDate | timestamp | When deal entered current stage |
| qualificationScore | jsonb | MEDDIC/BANT/SPICED scores |

---

### 4.3 Account Intelligence

#### 4.3.1 Account 360 View

| Feature | Description |
|---------|-------------|
| **Account Entity** | New first-class entity: Account (company). Multiple opportunities roll up to one account. Fields: company name, website, industry, employee count, annual revenue, HQ location, tech stack, description |
| **Account Timeline** | Unified timeline of all interactions across all opportunities for a given account |
| **Account Health** | Aggregate health score across all active opportunities |
| **Relationship Map** | Visual org chart of stakeholders at an account, showing reporting lines, influence, and engagement level |
| **Account Plan** | Strategic account plan document (AI-assisted): objectives, whitespace analysis, expansion opportunities, risk mitigation |
| **Revenue History** | Historical TCV by account over time — trend line showing account growth/contraction |

#### 4.3.2 Auto-Enrichment

| Feature | Description |
|---------|-------------|
| **Company Enrichment** | On account creation, auto-fill company data from public sources (website scraping, news, SEC filings, Crunchbase-style data) |
| **Stakeholder Enrichment** | Given a name + company, auto-populate title, LinkedIn URL, recent posts/activity, mutual connections |
| **News & Signals Feed** | Per-account feed of relevant news: funding rounds, leadership changes, M&A activity, earnings reports, layoffs, product launches |
| **Tech Stack Detection** | Identify technologies the account uses (BuiltWith / Wappalyzer style) to inform solution positioning |

---

### 4.4 Workflow Automation & Agentic Actions

#### 4.4.1 Workflow Engine

| Feature | Description |
|---------|-------------|
| **Trigger-Action Workflows** | Configurable automation: "When deal moves to Proposal, auto-create tasks: Draft SOW, Schedule pricing review, Assign presales architect" |
| **Approval Chains** | Deals above $X TCV require VP approval before stage transition. Configurable thresholds |
| **SLA Enforcement** | "Qualification stage must not exceed 14 days" — auto-escalation if breached |
| **Notification Engine** | Smart notifications: deal updates, overdue tasks, agent recommendations, @mentions — via in-app, email, Slack |
| **Scheduled Digests** | Daily/weekly pipeline digest email per user: new deals, stage changes, at-risk deals, upcoming closes, overdue tasks |

#### 4.4.2 Agentic Task Automation

| Feature | Description |
|---------|-------------|
| **Auto-Task Creation** | When a deal enters a stage, auto-create the standard task checklist for that stage (configurable templates per stage) |
| **Smart Reminders** | AI-powered reminders that consider context: "You haven't followed up with Sarah (Decision Maker) at Brightspeed in 12 days. Historically, deals where DMs go cold for >10 days have 30% lower win rate." |
| **Follow-Up Drafts** | Agent drafts follow-up email after every logged meeting, pre-populated with action items and next steps |
| **Recurring Tasks** | Weekly check-in tasks, monthly QBR prep, etc. Auto-created on schedule |

---

### 4.5 Forecasting & Analytics (v2)

#### 4.5.1 AI-Powered Forecasting

| Feature | Description |
|---------|-------------|
| **Weighted Pipeline** | Pipeline value weighted by AI win probability (not just stage-based multipliers) |
| **Forecast Categories** | Commit, Best Case, Pipeline, Omitted — per rep and rollup to team |
| **Forecast Accuracy Tracking** | Compare forecasted vs. actual closed revenue over time. Identify chronically optimistic/pessimistic reps |
| **Scenario Modeling** | "What if we lose the top 3 deals?" / "What if close dates slip by 30 days?" — interactive scenario calculator |
| **Revenue Waterfall** | Period-over-period revenue waterfall: new deals + expansions - contractions - churn = net change |

#### 4.5.2 Advanced Dashboard Widgets

| Widget | Description |
|--------|-------------|
| **Pipeline Movement** | Sankey diagram showing deal flow between stages over a time period |
| **Stage Conversion Rates** | Discovery→Qualification: X%, Qualification→Proposal: Y%, etc. with trend arrows |
| **Rep Leaderboard** | Ranked by: TCV won, win rate, avg deal cycle, pipeline created |
| **Cohort Analysis** | Deals created in month X — what % closed in 30/60/90/180 days? |
| **Activity Metrics** | Meetings logged, emails sent, tasks completed per rep per week |
| **AI Insights Panel** | Natural language summary: "Pipeline is up 12% vs. last month. 3 deals worth $2.1M are at risk due to inactivity. Brightspeed expansion has the highest win probability at 87%." |

---

### 4.6 Collaboration & Communication

#### 4.6.1 Team Collaboration

| Feature | Description |
|---------|-------------|
| **Deal Comments / Thread** | Per-opportunity comment thread (like GitHub issues). @mention team members. Replaces free-form conversation log |
| **@Mentions** | Tag team members in comments, tasks, or notes — triggers notification |
| **Deal Handoff** | Structured handoff flow: assign new owner, auto-generate briefing doc, transfer context |
| **Shared Views** | Save and share filtered views: "My Deals This Quarter", "APAC Pipeline", "At-Risk Deals" |
| **Team Activity Feed** | Global feed of pipeline activity across the team: new deals, stage changes, won/lost, comments |

#### 4.6.2 External Integrations

| Integration | Priority | Description |
|-------------|----------|-------------|
| **Email (Gmail / Outlook)** | P1 | Sync emails to deal conversation log. Draft and send from within the app |
| **Calendar (Google / O365)** | P1 | Show upcoming meetings per deal. Auto-log meeting outcomes. Meeting prep agent triggers |
| **Slack** | P1 | Deal update notifications, slash commands (/pipeline, /deal <name>), bot interactions |
| **LinkedIn Sales Navigator** | P2 | Stakeholder enrichment, relationship mapping, InMail integration |
| **Document Storage (Google Drive / SharePoint)** | P2 | Resource links auto-sync with cloud storage. Version tracking |
| **Proposal Tools (PandaDoc / DocuSign)** | P2 | Generate proposals from deal data. Track document status. E-signature workflow |
| **Accounting / ERP** | P3 | Post-win handoff: auto-create project in ERP, sync billing details |
| **Telephony (RingCentral / Zoom)** | P3 | Call logging, recording transcription, auto-summary |

---

### 4.7 Access Control & Multi-Tenancy

#### 4.7.1 User Management

| Feature | Description |
|---------|-------------|
| **Role-Based Access Control (RBAC)** | Roles: Admin, Sales Manager, Sales Rep, Presales, Viewer. Configurable permissions per role |
| **Team Hierarchy** | Organization → Teams → Users. Pipeline visibility scoped by team unless elevated |
| **SSO Integration** | SAML 2.0 / OAuth 2.0 with corporate identity providers (Okta, Azure AD, Google Workspace) |
| **User Profiles** | Avatar, name, email, role, team assignment, notification preferences, timezone |
| **Audit Log** | Who did what, when. Full immutable audit trail of all changes |

#### 4.7.2 Data Visibility Rules

| Rule | Description |
|------|-------------|
| **Rep sees own deals** | Default: reps see only their opportunities |
| **Manager sees team deals** | Managers see all deals owned by their direct reports |
| **Admin sees everything** | Full visibility across all teams |
| **Shared deals** | Explicit sharing: grant another user read or edit access to a specific deal |
| **Field-level permissions** | Sensitive fields (margin, TCV) visible only to certain roles |

---

### 4.8 Platform & Infrastructure

#### 4.8.1 API-First Architecture

| Feature | Description |
|---------|-------------|
| **RESTful API** | All functionality exposed via versioned REST API (/api/v1/...) |
| **Webhook System** | Configurable webhooks for key events: deal stage change, deal won/lost, task overdue, new deal created |
| **API Keys & Rate Limiting** | Per-user API keys, rate limiting, usage tracking |
| **GraphQL (future)** | GraphQL endpoint for complex queries and real-time subscriptions |

#### 4.8.2 Real-Time Features

| Feature | Description |
|---------|-------------|
| **WebSocket Updates** | Live updates when another user modifies a deal you're viewing |
| **Presence Indicators** | Show who's currently viewing a deal |
| **Real-Time Notifications** | In-app notification bell with live updates (already scaffolded in NotificationPopover) |

#### 4.8.3 Data & Scale

| Feature | Description |
|---------|-------------|
| **Full-Text Search** | PostgreSQL tsvector-based search across all entities |
| **Pagination** | Server-side pagination for large datasets (table view, task list, stakeholders) |
| **Caching** | Redis caching layer for dashboard analytics and frequently-accessed data |
| **File Upload** | Direct file upload for resource attachments (S3 / GCS backend) |
| **Data Import/Export** | Bulk CSV import of opportunities. Full data export for migration/backup |
| **Multi-Region** | Deploy close to users (US, EU, APAC) with data residency compliance |

---

## 5. Phase Roadmap

### Phase 1: Platform Foundation (Current → v1.5)
*Goal: Harden the existing app into a production-grade SaaS*

- [ ] Replace Replit auth with proper SSO (Google OAuth / SAML)
- [ ] Update favicon to Galent brand icon
- [ ] Add user roles (Admin, Manager, Rep, Viewer)
- [ ] Server-side pagination on all list views
- [ ] Full-text search (PostgreSQL tsvector)
- [ ] Structured conversation log (typed entries with timestamp/author)
- [ ] Account entity (company-level, multi-opp rollup)
- [ ] Notification engine (in-app + email)
- [ ] Webhook system for key events
- [ ] Data import (CSV) and bulk export
- [ ] Mobile-responsive polish

### Phase 2: Intelligence Layer (v2.0)
*Goal: Add AI that augments every workflow*

- [ ] Agent runtime framework (trigger → reason → act → log)
- [ ] Deal Health Score (0-100, auto-computed)
- [ ] Win/Loss prediction model (trained on historical data)
- [ ] Pipeline Hygiene Agent (nightly: stale deals, missing fields, duplicates)
- [ ] Deal Coach Agent (risk signals, next-best-action, stage recommendations)
- [ ] AI chat panel (per-deal and global) — ask questions about your pipeline in natural language
- [ ] Action item extraction from conversation logs
- [ ] Smart conversation summarization
- [ ] AI insights panel on dashboard ("Your pipeline is up 12% this month...")
- [ ] Weighted pipeline forecasting (AI probability vs. stage-based)

### Phase 3: Agentic Automation (v2.5)
*Goal: Agents that act autonomously within human-approved boundaries*

- [ ] Account Research Agent (auto-enrich on opportunity creation)
- [ ] Stakeholder Enrichment Agent (LinkedIn data, title, recent activity)
- [ ] Outreach Drafting Agent (follow-up emails, meeting agendas, proposals)
- [ ] Meeting Prep Agent (pre-meeting briefing packets)
- [ ] Auto-task creation on stage transitions (configurable templates)
- [ ] Smart reminders with contextual reasoning
- [ ] Approval chains for high-value deals
- [ ] SLA enforcement with auto-escalation
- [ ] News & signals feed per account
- [ ] Competitive intelligence agent

### Phase 4: Connected Platform (v3.0)
*Goal: Integrate with the tools sales teams already use*

- [ ] Gmail / Outlook email sync (bidirectional)
- [ ] Google Calendar / O365 calendar integration
- [ ] Slack integration (notifications, slash commands, bot)
- [ ] Google Drive / SharePoint resource sync
- [ ] LinkedIn Sales Navigator integration
- [ ] Proposal generation (PandaDoc / DocuSign)
- [ ] Telephony integration (call logging, transcription)
- [ ] API marketplace for custom integrations

### Phase 5: Scale & Optimize (v3.5+)
*Goal: Enterprise readiness and advanced analytics*

- [ ] Multi-tenant architecture
- [ ] Team hierarchy and org-level pipeline views
- [ ] Field-level permissions
- [ ] Forecast categories (Commit / Best Case / Pipeline / Omitted)
- [ ] Scenario modeling ("What if we lose the top 3 deals?")
- [ ] Cohort analysis and stage conversion tracking
- [ ] Rep leaderboard and coaching insights
- [ ] Revenue waterfall visualization
- [ ] Pipeline movement Sankey diagrams
- [ ] SOC 2 compliance and data residency
- [ ] White-label / custom branding options

---

## 6. Non-Functional Requirements

| Category | Requirement |
|----------|-------------|
| **Performance** | Page load < 2s. API response < 200ms (p95). Dashboard renders < 3s for 10K opportunities |
| **Availability** | 99.9% uptime SLA. Graceful degradation if AI services are unavailable |
| **Security** | HTTPS everywhere. Encrypted at rest (AES-256). RBAC enforced server-side. OWASP Top 10 mitigated. API rate limiting |
| **Privacy** | GDPR-compliant data handling. Right to deletion. Data export on request. No training on customer data without consent |
| **Scalability** | Support 10K concurrent users, 1M opportunities, 10M tasks. Horizontal scaling via containerization |
| **Observability** | Structured logging, APM tracing, error tracking (Sentry), uptime monitoring |
| **Accessibility** | WCAG 2.1 AA compliance. Keyboard navigable. Screen reader compatible |
| **Browser Support** | Chrome, Firefox, Safari, Edge (latest 2 versions) |
| **Mobile** | Responsive web. Native app considered for Phase 5 |

---

## 7. Success Metrics

| Metric | Target | How Measured |
|--------|--------|-------------|
| **Pipeline Visibility** | 100% of active deals tracked in platform | Deal count vs. known pipeline |
| **Rep Adoption** | >80% DAU among sales team | Login frequency |
| **Deal Velocity** | 15% reduction in avg days to close | Stage timestamp analysis |
| **Forecast Accuracy** | <15% variance between forecast and actual | Quarterly forecast vs. actuals |
| **Win Rate** | 5% improvement within 6 months of AI features | Won / (Won + Lost) |
| **Data Quality** | <5% of deals with missing critical fields | Hygiene agent reports |
| **Agent Engagement** | >50% of agent suggestions acted upon | Suggestion accept/dismiss rate |
| **Time Saved** | 5+ hours/week/rep on manual research and admin | User survey + activity tracking |

---

## 8. Glossary

| Term | Definition |
|------|------------|
| TCV | Total Contract Value — full deal value over contract lifetime |
| POC | Point of Contact |
| MEDDIC | Metrics, Economic Buyer, Decision Criteria, Decision Process, Identify Pain, Champion |
| BANT | Budget, Authority, Need, Timeline |
| T&M | Time & Material billing model |
| FP | Fixed Price billing model |
| MB | Milestone-based billing model |
| RET | Retainer billing model |
| ITS | IT Services (service line) |
| STF | Staffing (service line) |
| DAU | Daily Active Users |
| RBAC | Role-Based Access Control |
| SSO | Single Sign-On |
| SLA | Service Level Agreement |
| SOW | Statement of Work |
| QBR | Quarterly Business Review |

---

*This is a living document. Updated as requirements evolve and user feedback is incorporated.*

*Maintained by Galent Product & Engineering*
