# Galent SalesPilot — Revenue Intelligence Platform

**Version:** 6.0 | **Date:** June 10, 2026 | **PRs:** 49 | **Routes:** 31

---

## Platform Overview

Galent SalesPilot is an AI-native sales intelligence platform built on an Agent Harness architecture. The platform covers the full revenue lifecycle: Lead Generation → Pipeline Management → Deal Room → Presales → Contracts → Pricing → Delivery.

**Stack:** Next.js 15 · MongoDB · tRPC · Claude API · Docker · EC2

**Live:** http://98.92.255.185:3000 | **Login:** admin@galent.com

---

## Architecture

### Agent Harness
- 17 platform tools exposed as agent-callable functions
- Claude tool calling with multi-step reasoning chains
- Agent fleet: Deal Coach, Research, Outreach, Hygiene, Forecast
- Configurable guardrails, approval requirements, blocked actions
- Visual reasoning chain display in Agent Command Center

### Data Layer
- 15+ MongoDB collections with Mongoose ODM
- Knowledge Graph (adjacency-list with $graphLookup)
- Full-text search, _id→id mapping for all sub-documents
- Database indexes on high-query fields

### API Layer
- tRPC with Zod validation on all mutations
- 22 routers covering all CRUD operations
- Auto activity logging on mutations
- Workflow execution on stage changes and deal creation

### Auth
- NextAuth.js with credentials + Azure AD
- Cookie-based middleware protection
- RBAC defined (admin, manager, rep, sdr, presales, viewer)
- New users default to 'rep' role

---

## Pages (31 Routes)

### Sales Lifecycle
| Route | Page | Description |
|-------|------|-------------|
| `/` | Command Center | AI pipeline brief, KPIs, critical actions, activity feed, scope switcher |
| `/leads` | Leads | AI-led pipeline: Signal→Qualify→Enrich→Engage→Convert |
| `/intake` | Signal | Omni-channel intake: voice, Teams, Outlook, desktop notes |
| `/pipeline` | Deals | Kanban board with smart cards, drag-drop with gate confirmation |
| `/pipeline/[stage]` | Stage Detail | All deals in a specific stage with ontology gates |
| `/deal-room` | Deal Room | Conversational AI-guided deal management |
| `/accounts` | Accounts | Account 360 with linked deals, knowledge graph viz, intent scoring |
| `/stakeholders` | Contacts | Add/delete/toggle DM-Primary, linked to deals |
| `/tasks` | Tasks | Add/delete/complete toggle, AI suggestions after completion |
| `/contracts` | Contracts | MSA/SOW/NDA with approvals, expiry alerts |
| `/pricing` | Pricing | Team composition, geo rates, margin calculator |
| `/presales` | Presales OS | Pursuits, Proposal Studio (AI drafting), Solutioning, Templates |

### Views
| Route | Page | Description |
|-------|------|-------------|
| `/table` | Table | Group-by, sort, biz segmentation, inline stage edit, CSV export/import |
| `/calendar` | Calendar | Monthly grid with deal close dates + task due dates |
| `/timeline` | Timeline | 90-day Gantt view |
| `/schedule` | Schedule | Deals bucketed by close date |

### Intelligence
| Route | Page | Description |
|-------|------|-------------|
| `/dashboard` | Dashboard | Interactive funnel (3 views), conversion rates, biz segmentation |
| `/forecasting` | Forecast | Weighted pipeline, by rep/quarter, forecast categories (Commit/Best Case/Pipeline) |
| `/graph` | Deal Graph | SVG flow visualization (Graph/Sankey/List), click-to-drill |
| `/agents` | AI Agents | Agent Command Center with live invocation, reasoning chains |
| `/agents/logs` | Analytics | Execution metrics, activity timeline, agent breakdown |
| `/ask` | Ask Galent | Conversational dashboard with full pipeline context |

### Platform
| Route | Page | Description |
|-------|------|-------------|
| `/integrations` | Integrations | 8 systems + AI Discovery (type any service→Claude researches) |
| `/workflows` | Workflows | Trigger→Action engine, 3 templates, auto-executes on events |
| `/settings` | Settings | AI model, guardrails, notifications (persists to DB) |
| `/admin/users` | Users | Invite, role management, delete |
| `/guide` | Guide | Role-based walkthrough (AE, SDR, Manager, Presales, Exec) |
| `/login` | Login | Credentials + Azure AD + signup |

---

## AI Features (10 Claude Integrations)

1. **Auto Pipeline Analysis** — AI brief on Command Center load
2. **Auto Deal Analysis** — Health ring + win probability on deal open
3. **Copilot Chat** — Full pipeline context in every message, GenUI rendering
4. **Lead Qualification** — ICP/budget/timing scoring
5. **Outreach Drafting** — Personalized emails from deal context
6. **SOW Generation** — Full Statement of Work from deal data
7. **Meeting Transcript Intelligence** — Teams/Zoom/notes→extract insights
8. **Integration Discovery** — Type service name→Claude researches→add to platform
9. **Agent Harness** — 17-tool runtime with reasoning chains
10. **Intake Processing** — Omni-channel content→extract deal intelligence

---

## Key Features

### Deal Management
- Smart Kanban cards: weighted value, next step, time-in-stage, close date coloring
- Drag-drop with gate criteria confirmation dialog
- Flexible lifecycle: Opportunity→Deal→Engagement→Delivery→Closed
- Create contract or follow-on deal from any deal
- Executive approval chains (CSO/CFO/CEO) for high-value deals

### Sales Ontology
- Stage-specific templates, gate criteria, roles
- 5 stages seeded: Discovery→Qualification→Proposal→Negotiation→Won
- Gate criteria evaluation (checkmark/cross) shown in deal detail
- Required/optional artifacts with AI-generable tags

### Presales OS
- Pursuits pipeline (RFP/RFI/Proactive) with coverage scores
- Proposal Studio: 10-section editor with per-section AI drafting
- Solutioning: effort estimator + SA bench allocation
- Templates & assets library

### Pricing Engine
- 11 roles (PM, Architect, Developer, QA, DevOps, etc.)
- 6 geo regions with rate multipliers (US 1.0x → India 0.35x)
- Margin calculator + blended rate
- Link to deal (updates TCV)

### Workflow Engine
- Trigger→Condition→Action workflows
- Auto-executes on deal stage change, deal creation, lead qualification
- 3 pre-built templates (Discovery Checklist, Stale Deal Alert, Win Handoff)
- Active workflows shown in deal detail

### Scope & Filtering
- My/Team/Org scope switcher on all views
- Global filters: status, owner, industry, region
- Saved views: My Deals, At Risk, Closing Soon, etc.
- Business segmentation: Net New/Existing/Services/Product/Hybrid

### Data
- 31 seed opportunities with stakeholders and tasks
- 5 accounts (Brightspeed, Motion Industries, HNI, Wells Fargo, Fannie Mae)
- 16 engagement types (T&M, FP, Outcome, Pod, Staffing, etc.)
- Knowledge graph with force-directed visualization

---

## Data Models (15+ Collections)

Opportunity · Stakeholder · Task · ResourceLink · Account · Lead · Contract · EngagementType · Workflow · Notification · Activity · Settings · Approval · SalesStageTemplate · KnowledgeNode · User · Integration

---

## Deployment

- **Docker**: Next.js app + MongoDB 7 + Redis 7
- **EC2**: t3.medium, Ubuntu, Docker Compose
- **CI/CD**: GitHub PRs → merge → SSM deploy

---

## Backlog

### Next Phase
- Fully generative UI (AI composes every view dynamically)
- Real Microsoft Graph plugins (Outlook/Teams)
- Pipecat Python voice server (real-time conversational AI)
- Salesforce bidirectional sync
- Real-time WebSocket updates

### Future
- Multi-tenant architecture
- SOC 2 compliance
- Mobile native app
- Advanced knowledge graph (Neo4j)
- Revenue waterfall / Sankey diagrams
