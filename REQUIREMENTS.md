# Galent SalesPilot — Revenue Intelligence Platform

**Version:** 5.0 | **Date:** June 10, 2026 | **PRs Merged:** 26+ | **Live:** http://98.92.255.185:3000

---

## Platform Summary

Galent SalesPilot is an AI-native sales intelligence platform built on an **Agent Harness** architecture. Agents are first-class citizens with full tool access to the platform. Every capability is agent-invokable.

**Stack:** Next.js 15 · MongoDB · tRPC · Claude API (Anthropic) · Docker · EC2

---

## What's Built

### 23 Pages
| Route | Feature | Status |
|-------|---------|--------|
| `/` | Command Center — AI brief, KPIs, pipeline lifecycle, activity feed | Real |
| `/leads` | Lead Generation — Signal→Qualify→Enrich→Engage→Convert (AI) | Real |
| `/pipeline` | Kanban Board — drag-drop, gated stages, confirmation dialog | Real |
| `/table` | Pipeline Table — group-by, sort, biz segmentation, inline edit, CSV | Real |
| `/calendar` | Calendar — monthly grid, deal dates + task dates | Real |
| `/timeline` | Timeline — 90-day Gantt view | Real |
| `/tasks` | Tasks — add/delete/complete toggle, priority filters | Real |
| `/stakeholders` | Contacts — add/delete, toggle DM/Primary, linked to deals | Real |
| `/accounts` | Account 360 — CRUD, linked deals, knowledge graph visualization | Real |
| `/contracts` | Contracts — MSA/SOW/NDA, approvals, expiry alerts | Real |
| `/forecasting` | Forecasting — weighted pipeline, by rep/quarter, forecast categories | Real |
| `/dashboard` | Dashboard — funnel, conversion rates, biz segmentation | Real |
| `/integrations` | Integrations — 8 systems + AI Discovery | Real |
| `/agents` | Agent Registry — 5 agents, model/prompt/guardrails config | Real |
| `/workflows` | Workflows — trigger→action, 3 templates, auto-executes on events | Real |
| `/settings` | Settings — AI model, guardrails, notifications (persists to DB) | Real |
| `/admin/users` | User Management — invite, roles (6 types), delete | Real |
| `/ask` | Ask Galent — conversational dashboard with full pipeline context | Real |
| `/guide` | User Guide — role-based (AE, SDR, Manager, Presales, Exec) | Real |
| `/presales` | Presales Portal — 6-stage lifecycle (coming soon) | Placeholder |
| `/login` | Auth — credentials + Azure AD + signup | Real |

### Agent Harness Runtime
| Component | Description |
|-----------|-------------|
| Agent Runtime | Agents observe, reason, and execute using Claude tool calling |
| 17 Platform Tools | Every CRUD operation exposed as agent-callable tool |
| Tool Executor | Runs tools against MongoDB and returns results to agents |
| Reasoning Chains | Full visibility into agent thinking and tool calls |
| Quick Actions | 6 preset agent tasks (analyze pipeline, find risks, suggest next steps, etc.) |
| Copilot Modes | Chat (conversational) + Agent (tool-calling with reasoning) |

### 9 AI Features (Real Claude API)
1. Auto pipeline analysis on page load
2. Auto deal analysis (health ring + win probability bar)
3. Copilot chat with full pipeline context in every message
4. Lead qualification scoring (ICP/budget/timing)
5. Outreach email drafting (personalized)
6. SOW generation from deal context
7. Meeting transcript intelligence (Teams/Zoom/notes → extract insights)
8. AI integration discovery (type any service → Claude researches)
9. Agent harness with tool calling and reasoning chains

### 14 MongoDB Collections
Opportunity · Stakeholder · Task · ResourceLink · Account · Lead · Contract · EngagementType · Workflow · Notification · Activity · Settings · Approval · SalesStageTemplate · KnowledgeGraph · User · Integration

### Key Platform Features
- Gated stage transitions with gate criteria enforcement
- Executive approval workflows (CSO/CFO/CTO/CEO/COO chains)
- Scope switcher (My/Team/Org) on all views
- Forecast categories (Commit/Best Case/Pipeline per deal)
- Auto activity logging on every mutation
- Sales ontology with stage templates, gate criteria, roles
- Smart Kanban cards (weighted value, next step, time-in-stage, close date coloring)
- 16 engagement types (T&M, FP, Outcome, Pod, Staffing, Product, Hybrid, etc.)
- Global filters + saved views (My Deals, At Risk, Closing Soon, etc.)
- Meeting notes from Teams/Zoom/plain text → AI extraction
- Knowledge graph with force-directed visualization
- CSV import with column mapping
- Mobile responsive layout
- Dark/light theme toggle

---

## Backlog

### Next: Agent Builder + Proposal Engine
- Visual agent builder (LangFlow-style)
- Dynamic agent mashup (compose at runtime)
- Ontology builder through agents
- Proposal builder with QA, pricing engine
- Presales artifact database
- Multi-geo pricing with market intelligence

### Next+1: Integration Layer
- Microsoft Graph API (Outlook/Teams)
- Salesforce bidirectional sync
- MCP-based tool calling
- Power Platform widgets

### Next+2: Enterprise
- Real-time WebSocket
- Presales full lifecycle
- Bid management
- SOC 2 compliance
- Multi-tenant

---

**Repo:** https://github.com/ramkrissv/sales-board
**Live:** http://98.92.255.185:3000
**Login:** admin@galent.com
