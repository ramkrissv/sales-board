# Galent AI — Revenue Intelligence Platform
## Product Requirements Document (PRD)

**Version:** 4.0
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

### 2.4 Current Tech Stack (v1.0 — to be migrated)

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

> **IMPORTANT:** All existing v1.0 features, data models, views, and seed data MUST be preserved during migration. No functionality loss is acceptable. The migration is additive — new architecture wraps and extends existing capabilities.

### 2.5 Target Tech Stack (v4.0)

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Frontend** | Next.js 15 (App Router), React 19, TypeScript 5.6 | SSR/SSG, file-based routing, server components, streaming |
| **UI Framework** | Tailwind CSS 4, Radix UI / shadcn, Framer Motion | Consistent with current; add motion for AI states |
| **State** | TanStack React Query v5, Zustand | Replace Context with Zustand for complex agent state |
| **Real-time** | Socket.IO / SSE | Agent stream, live deal updates, presence |
| **Backend** | Next.js API Routes + tRPC | Type-safe API layer, end-to-end TypeScript |
| **Database (Primary)** | MongoDB Atlas (with Mongoose ODM) | Flexible schema for deals, agents, workflows; native JSON storage for activity logs, agent memory, conversation threads |
| **Knowledge Graph** | MongoDB Atlas + GraphQL layer (or Neo4j for Phase 5) | Stakeholder relationships, account hierarchies, agent context graphs stored as adjacency lists in MongoDB; GraphQL for traversal queries |
| **Vector Store** | MongoDB Atlas Vector Search | Semantic search across conversation logs, agent memory, account intelligence. Embeddings via OpenAI/Anthropic |
| **Agent Runtime** | LangGraph / CrewAI + Claude API (Anthropic) | Coordinator pattern, composable agent graphs, tool calling |
| **LLM Provider** | Anthropic Claude (primary), OpenAI (fallback) | Agent reasoning, summarization, drafting, analysis |
| **Auth** | NextAuth.js v5 (Auth.js) | SSO (Google, Azure AD, Okta), JWT sessions, RBAC middleware |
| **Cache** | Redis (Upstash) | Session store, agent inference cache, real-time pub/sub |
| **File Storage** | AWS S3 / Cloudflare R2 | Resource attachments, generated documents |
| **Search** | MongoDB Atlas Search + Vector Search | Full-text + semantic hybrid search |
| **Queue** | BullMQ (Redis-backed) | Background agent jobs, webhook delivery, scheduled tasks |
| **Deployment** | Vercel (frontend) + AWS ECS/Fargate (agent runtime) | Edge-optimized frontend; dedicated compute for agents |
| **Monitoring** | Sentry, Datadog, LangSmith | Error tracking, APM, LLM observability |

---

## 2A. Full-Stack Architecture

### 2A.1 System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          CLIENT (Next.js 15)                            │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐    │
│  │ Kanban   │ │Account360│ │Forecasting│ │ Agent    │ │Integra-  │    │
│  │ Board    │ │   View   │ │   Lab    │ │ Registry │ │  tions   │    │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘    │
│       │             │            │             │            │          │
│  ┌────┴─────────────┴────────────┴─────────────┴────────────┴─────┐    │
│  │              Zustand Store + TanStack Query + Socket.IO         │    │
│  └────────────────────────────────┬────────────────────────────────┘    │
└───────────────────────────────────┼────────────────────────────────────┘
                                    │ tRPC / REST / WebSocket
┌───────────────────────────────────┼────────────────────────────────────┐
│                          API LAYER (Next.js + tRPC)                    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐    │
│  │ Deal API │ │Account   │ │Workflow  │ │ Agent    │ │Integra-  │    │
│  │ Router   │ │  API     │ │  API     │ │   API    │ │tion API  │    │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘    │
│       │             │            │             │            │          │
│  ┌────┴─────────────┴────────────┴─────────────┴────────────┴─────┐    │
│  │                    Service Layer (Business Logic)                │    │
│  │  DealService │ AccountService │ WorkflowEngine │ AgentOrch.     │    │
│  └────────────────────────────────┬────────────────────────────────┘    │
└───────────────────────────────────┼────────────────────────────────────┘
                                    │
┌───────────────────────────────────┼────────────────────────────────────┐
│                     AGENT RUNTIME (Coordinator Pattern)                │
│                                                                        │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    COORDINATOR AGENT                            │    │
│  │  Receives user intent / system trigger → decomposes into       │    │
│  │  sub-tasks → dispatches to specialist agents → aggregates      │    │
│  │  results → returns unified response                            │    │
│  └────────┬──────────┬──────────┬──────────┬──────────┬───────────┘    │
│           │          │          │          │          │                │
│  ┌────────┴──┐ ┌─────┴────┐ ┌──┴───────┐ ┌┴────────┐ ┌┴──────────┐   │
│  │Deal Coach │ │Research  │ │Outreach  │ │Forecast │ │Hygiene    │   │
│  │  Agent   │ │  Agent   │ │  Agent   │ │  Agent  │ │  Agent    │   │
│  └─────┬────┘ └────┬─────┘ └────┬─────┘ └────┬────┘ └─────┬─────┘   │
│        │           │            │             │            │          │
│  ┌─────┴───────────┴────────────┴─────────────┴────────────┴─────┐    │
│  │                      TOOL LAYER                                │    │
│  │  MongoDB Query │ Web Search │ Email Draft │ Task Create │ ...  │    │
│  └────────────────────────────────┬────────────────────────────────┘    │
└───────────────────────────────────┼────────────────────────────────────┘
                                    │
┌───────────────────────────────────┼────────────────────────────────────┐
│                        DATA LAYER (MongoDB Atlas)                      │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                    MongoDB Collections                           │   │
│  │                                                                  │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌──────────┐  │   │
│  │  │opportun-│ │accounts │ │stake-   │ │tasks    │ │workflows │  │   │
│  │  │  ities  │ │         │ │holders  │ │         │ │          │  │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └──────────┘  │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌──────────┐  │   │
│  │  │agents   │ │agent_   │ │agent_   │ │integra- │ │campaigns │  │   │
│  │  │         │ │actions  │ │memory   │ │  tions  │ │          │  │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └──────────┘  │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐                           │   │
│  │  │knowledge│ │context_ │ │users /  │                           │   │
│  │  │_graph   │ │embeddings│ │sessions │                           │   │
│  │  └─────────┘ └─────────┘ └─────────┘                           │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                        │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐      │
│  │ Atlas Search     │  │ Atlas Vector     │  │ Redis Cache      │      │
│  │ (Full-text)      │  │ Search (Semantic)│  │ (Sessions/Queue) │      │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘      │
└────────────────────────────────────────────────────────────────────────┘
```

### 2A.2 Agent Architecture — Coordinator Pattern

The agent system uses a **Coordinator Pattern** (also called Orchestrator pattern) where a central coordinator agent decomposes complex requests and delegates to specialist agents.

```
                        User Request / System Trigger
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │      COORDINATOR AGENT         │
                    │                                │
                    │  1. Parse intent               │
                    │  2. Load context from KG       │
                    │  3. Select specialist agents   │
                    │  4. Build execution plan       │
                    │  5. Dispatch & monitor         │
                    │  6. Aggregate results          │
                    │  7. Return to user / store     │
                    └──────────┬────────────────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
              ▼                ▼                ▼
    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
    │  Deal Coach   │  │  Research    │  │  Outreach    │
    │              │  │  Agent       │  │  Agent       │
    │  Tools:      │  │  Tools:      │  │  Tools:      │
    │  - query_db  │  │  - web_search│  │  - draft_email│
    │  - score_deal│  │  - scrape_url│  │  - send_email │
    │  - flag_risk │  │  - enrich_co │  │  - create_task│
    │  - suggest   │  │  - news_feed │  │  - log_activity│
    └──────────────┘  └──────────────┘  └──────────────┘
```

#### Coordinator Responsibilities
| Step | What It Does | Implementation |
|------|-------------|----------------|
| **Intent Parsing** | Understands what the user/trigger wants | Claude with structured output (tool_use) |
| **Context Loading** | Pulls relevant context from Knowledge Graph | MongoDB aggregation pipeline on `knowledge_graph` collection |
| **Agent Selection** | Picks which specialist agents to invoke | Rule-based + LLM reasoning based on intent classification |
| **Plan Building** | Creates DAG of agent tasks (parallel where possible) | LangGraph state machine or custom DAG executor |
| **Dispatch** | Runs agents in parallel or sequence as needed | BullMQ jobs with dependency chains |
| **Aggregation** | Combines specialist outputs into unified response | Claude summarization with structured output |
| **Human-in-the-Loop** | Gates high-stakes actions for approval | Agent action queue with WebSocket notification |

#### Agent Composability
Each agent is a **composable unit** with a standard interface:

```typescript
interface Agent {
  id: string;
  name: string;
  type: 'specialist' | 'coordinator';
  capabilities: string[];          // What this agent can do
  tools: Tool[];                   // Functions it can call
  systemPrompt: string;            // Agent personality & rules
  contextRequirements: string[];   // What context it needs from KG
  outputSchema: ZodSchema;         // Structured output format

  // Execution
  invoke(input: AgentInput, context: AgentContext): Promise<AgentOutput>;

  // Lifecycle
  status: 'live' | 'idle' | 'sleeping' | 'error';
  wake(): Promise<void>;
  sleep(): Promise<void>;
}

interface AgentInput {
  trigger: 'user_command' | 'system_event' | 'scheduled' | 'coordinator';
  payload: Record<string, any>;
  parentAgentId?: string;          // If dispatched by coordinator
}

interface AgentOutput {
  actions: AgentAction[];          // Suggested actions (with approval gates)
  insights: AgentInsight[];        // Generated insights
  artifacts: AgentArtifact[];      // Drafts, documents, etc.
  memoryUpdates: MemoryUpdate[];   // What to persist in agent memory
  graphUpdates: GraphUpdate[];     // Knowledge graph mutations
}
```

### 2A.3 Knowledge Graph (MongoDB)

The Knowledge Graph is stored in MongoDB as adjacency-list documents, enabling relationship traversal without a dedicated graph database. For Phase 5, Neo4j can be added as a dedicated graph layer.

#### `knowledge_graph` Collection Schema

```typescript
// Node document
{
  _id: ObjectId,
  nodeId: string,           // "account:technova", "person:sarah-chen", "opp:opp-001"
  nodeType: string,         // "account", "person", "opportunity", "product", "service_line", "competitor"
  label: string,            // Display name
  properties: {             // Entity-specific properties
    // For accounts: industry, revenue, health, etc.
    // For persons: title, email, sentiment, engagement_level
    // For opportunities: tcv, stage, health_score, etc.
  },
  edges: [                  // Outgoing relationships
    {
      targetNodeId: string,
      relationship: string, // "HAS_STAKEHOLDER", "OWNS_OPPORTUNITY", "COMPETES_WITH",
                           // "REPORTS_TO", "CHAMPIONS", "EVALUATES", "SOLD_SERVICE",
                           // "USES_PRODUCT", "INFLUENCED_BY"
      properties: {
        weight: number,     // Relationship strength (0-1)
        since: Date,
        lastInteraction: Date,
        context: string     // How they're related
      }
    }
  ],
  embedding: [number],      // Vector embedding for semantic search
  updatedAt: Date,
  updatedBy: string         // "agent:research" or "user:admin"
}
```

#### Relationship Types

| Relationship | From → To | Description |
|-------------|-----------|-------------|
| `HAS_STAKEHOLDER` | Account → Person | Company employs this person |
| `REPORTS_TO` | Person → Person | Org hierarchy |
| `CHAMPIONS` | Person → Opportunity | This person is the internal champion |
| `EVALUATES` | Person → Opportunity | Involved in evaluation |
| `DECIDES` | Person → Opportunity | Decision maker |
| `OWNS_OPPORTUNITY` | User → Opportunity | Sales rep ownership |
| `BELONGS_TO_ACCOUNT` | Opportunity → Account | Deal at this company |
| `COMPETES_WITH` | Account → Account | Competitive relationship |
| `USES_PRODUCT` | Account → Product | Customer uses this product |
| `SOLD_SERVICE` | Opportunity → ServiceLine | Service line sold in this deal |
| `INFLUENCED_BY` | Opportunity → Opportunity | Cross-sell / reference relationship |
| `SIMILAR_TO` | Account → Account | AI-detected similarity |

#### Graph Queries (MongoDB Aggregation)

```javascript
// Find all decision makers for an account, 2 hops deep
db.knowledge_graph.aggregate([
  { $match: { nodeId: "account:technova" } },
  { $graphLookup: {
      from: "knowledge_graph",
      startWith: "$edges.targetNodeId",
      connectFromField: "edges.targetNodeId",
      connectToField: "nodeId",
      as: "connected",
      maxDepth: 2,
      restrictSearchWithMatch: {
        "edges.relationship": { $in: ["HAS_STAKEHOLDER", "DECIDES"] }
      }
  }}
]);

// Semantic similarity: find accounts similar to a given account
db.knowledge_graph.aggregate([
  { $vectorSearch: {
      index: "vector_index",
      path: "embedding",
      queryVector: accountEmbedding,
      numCandidates: 100,
      limit: 10,
      filter: { nodeType: "account" }
  }}
]);
```

### 2A.4 Agent Context Graph

Each agent session builds a **context graph** — a subgraph of the Knowledge Graph relevant to the current task. This is loaded by the Coordinator before dispatching to specialists.

```typescript
interface AgentContext {
  // Subgraph of relevant nodes and edges
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];

  // Agent-specific memory (persisted between sessions)
  memory: {
    shortTerm: Record<string, any>;  // Current session state
    longTerm: Record<string, any>;   // Persisted insights, preferences
    episodic: AgentEpisode[];        // Past interaction summaries
  };

  // Conversation history (for multi-turn interactions)
  conversationHistory: Message[];

  // Current user context
  user: { id: string; role: string; team: string; preferences: Record<string, any> };
}
```

#### `agent_memory` Collection

```typescript
{
  _id: ObjectId,
  agentId: string,         // "deal-coach", "research-agent"
  scopeType: string,       // "global", "account", "opportunity", "user"
  scopeId: string,         // The specific entity ID
  memoryType: string,      // "insight", "preference", "pattern", "fact"
  content: string,         // Natural language memory
  embedding: [number],     // For semantic retrieval
  confidence: number,      // 0-1
  expiresAt: Date | null,  // Null = permanent
  createdAt: Date,
  accessCount: number      // How often this memory is retrieved
}
```

### 2A.5 Feature Composability Architecture

Every feature in the platform is a **composable module** that can be independently developed, deployed, and composed with other features.

```
┌──────────────────────────────────────────────────────────────┐
│                    FEATURE REGISTRY                           │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │ Pipeline     │  │ Account 360 │  │ Forecasting │          │
│  │ Management   │  │             │  │             │          │
│  │ ──────────── │  │ ──────────── │  │ ──────────── │          │
│  │ UI: Kanban,  │  │ UI: Neural  │  │ UI: Waterfall│         │
│  │   Table,     │  │   Map,      │  │   Scenario,  │         │
│  │   Timeline   │  │   Health    │  │   Insights   │         │
│  │ API: deals/* │  │ API: acct/* │  │ API: forecast│         │
│  │ Agents: Deal │  │ Agents: Res │  │ Agents: Fore │         │
│  │   Coach      │  │   earch     │  │   cast       │         │
│  │ Workflows:   │  │ Workflows:  │  │ Workflows:   │         │
│  │   Stage gate │  │   Enrich    │  │   Digest     │         │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │ Outreach     │  │ Integrations│  │ Workflow     │          │
│  │ Intelligence │  │             │  │ Engine       │          │
│  │ ──────────── │  │ ──────────── │  │ ──────────── │          │
│  │ UI: Campaign │  │ UI: Sync    │  │ UI: Builder  │          │
│  │   Drafter    │  │   Mapper    │  │   Canvas     │          │
│  │ API: outreach│  │ API: integ/*│  │ API: workflow│          │
│  │ Agents: Out- │  │ Agents:     │  │ Engine:      │          │
│  │   reach      │  │   Schema    │  │   Trigger →  │          │
│  │ Workflows:   │  │ Workflows:  │  │   Condition →│          │
│  │   Sequence   │  │   Sync      │  │   Action     │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
└──────────────────────────────────────────────────────────────┘
```

Each feature module exposes:
- **UI Components** (React, lazy-loaded)
- **API Routes** (tRPC routers, composable)
- **Agent Definitions** (specialist agents, composable into coordinator plans)
- **Workflow Templates** (pre-built automation recipes)
- **Data Models** (MongoDB schemas, registered in central registry)

---

## 2B. Service Lines, Products, and POC-Based Pipeline

### 2B.1 Multi-Dimensional Pipeline Organization

Opportunities must be viewable and filterable across multiple dimensions — not just by status, but by **service line**, **product/solution**, and **POC ownership**.

#### Service Line Entity (Enhanced)
| Field | Type | Description |
|-------|------|-------------|
| id | string | e.g., "its", "staffing", "consulting", "managed-services" |
| name | string | "IT Services", "Staffing", "Consulting", "Managed Services" |
| code | string | Abbreviation: "ITS", "STF", "CON", "MS" |
| color | string | Badge color for visual distinction |
| description | text | What this service line covers |
| leads | string[] | Service line leadership POCs |
| isActive | boolean | Whether available for new deals |

#### Product / Solution Catalog
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Product identifier |
| name | string | "AI Platform", "QA CoE", "DevSecOps", "Cloud Migration", "Data Analytics" |
| serviceLine | FK → service_lines | Which service line owns this product |
| category | string | "Platform", "Service", "Accelerator", "IP" |
| description | text | Product description |
| defaultMargin | integer | Typical margin for this product |
| defaultBillingModel | string | Typical billing approach |
| techStack | string[] | Technologies involved |
| isActive | boolean | Available for new deals |

#### Enhanced Opportunity Fields (Service/Product)
| Field | Type | Description |
|-------|------|-------------|
| serviceLineId | FK → service_lines | Primary service line |
| secondaryServiceLines | FK[] → service_lines | Cross-sell service lines |
| products | FK[] → products | Solutions being sold |
| primaryProduct | FK → products | Lead product in the deal |

#### POC-Based Pipeline Views
| View | Filter | What It Shows |
|------|--------|--------------|
| **My Pipeline** | `primaryOwner = currentUser` | Rep's own deals |
| **By Sales POC** | `salesPOCs includes X` | All deals where a specific sales POC is involved |
| **By Presales POC** | `presalesPOCs includes X` | All deals where a presales POC is involved |
| **By Service Line** | `serviceLineId = X` | Pipeline for IT Services, Staffing, etc. |
| **By Product** | `products includes X` | Pipeline for a specific solution |
| **By Account** | `accountId = X` | All deals at a specific company |
| **Cross-sell View** | `secondaryServiceLines.length > 0` | Deals spanning multiple service lines |

### 2B.2 Customizable Pipeline Stages (per Service Line)

Different service lines may have different pipeline stages:

```typescript
interface PipelineConfig {
  serviceLineId: string;
  stages: {
    id: string;
    name: string;
    order: number;
    color: string;
    requiredFields: string[];      // Fields that must be filled before entering this stage
    autoTasks: TaskTemplate[];     // Tasks auto-created on stage entry
    approvalRequired: boolean;     // Needs manager approval to enter
    maxDaysAllowed: number | null; // SLA for time in stage
    exitCriteria: string[];        // Conditions to move to next stage
  }[];
}

// Example: IT Services pipeline
{
  serviceLineId: "its",
  stages: [
    { id: "discovery", name: "Discovery", order: 1, requiredFields: ["industry", "region"], ... },
    { id: "qualification", name: "Qualification", order: 2, requiredFields: ["tcv", "billingModel"], ... },
    { id: "solutioning", name: "Solutioning", order: 3, ... },  // ITS-specific stage
    { id: "proposal", name: "Proposal", order: 4, ... },
    { id: "negotiation", name: "Negotiation", order: 5, ... },
    { id: "won", name: "Won", order: 6, ... },
    { id: "lost", name: "Lost", order: 7, ... },
  ]
}

// Example: Staffing pipeline (different stages)
{
  serviceLineId: "staffing",
  stages: [
    { id: "requirement", name: "Requirement", order: 1, ... },
    { id: "sourcing", name: "Sourcing", order: 2, ... },
    { id: "submission", name: "Submission", order: 3, ... },
    { id: "interview", name: "Interview", order: 4, ... },
    { id: "offer", name: "Offer", order: 5, ... },
    { id: "placement", name: "Placement", order: 6, ... },
    { id: "lost", name: "Lost", order: 7, ... },
  ]
}
```

---

## 2C. Customizable Workflow Engine

### 2C.1 Overview

The Workflow Engine is a visual, configurable automation system that lets users (and AI agents) build **trigger → condition → action** workflows. It operates in both manual and **agentic mode** (AI auto-creates and optimizes workflows).

### 2C.2 Workflow Data Model

```typescript
interface Workflow {
  id: string;
  name: string;                    // "Auto-task on Proposal Entry"
  description: string;
  isActive: boolean;
  mode: 'manual' | 'agentic';     // Who created/manages this workflow
  createdBy: string;               // User ID or "agent:deal-coach"
  serviceLineId?: string;          // Scoped to service line (optional)

  trigger: WorkflowTrigger;
  conditions: WorkflowCondition[];  // ALL must be true (AND logic)
  actions: WorkflowAction[];        // Executed in sequence

  // Execution stats
  executionCount: number;
  lastExecutedAt: Date;
  successRate: number;

  // Agentic mode fields
  agentSuggested: boolean;         // AI recommended this workflow
  agentConfidence: number;         // How confident the agent is
  agentRationale: string;          // Why the agent created this
}
```

### 2C.3 Triggers

| Trigger Type | Event | Configuration |
|-------------|-------|---------------|
| `deal_stage_change` | Opportunity moves to a new stage | `{ fromStage?, toStage, serviceLineId? }` |
| `deal_created` | New opportunity created | `{ serviceLineId?, minTcv? }` |
| `deal_field_update` | Specific field changed | `{ fieldName, oldValue?, newValue? }` |
| `deal_inactive` | No activity for N days | `{ inactiveDays: number }` |
| `task_overdue` | Task passes due date | `{ priorityFilter? }` |
| `task_completed` | Task marked complete | `{ taskNamePattern? }` |
| `stakeholder_added` | New stakeholder on a deal | `{ roleFilter? }` |
| `agent_signal` | Agent detects a signal | `{ signalType, minConfidence }` |
| `schedule` | Cron-based | `{ cronExpression }` — daily, weekly, monthly |
| `integration_event` | External system event | `{ system, eventType }` — e.g., Salesforce field update |
| `manual` | User-invoked | Button click or slash command |

### 2C.4 Conditions

| Condition Type | Check | Example |
|---------------|-------|---------|
| `field_equals` | Field matches value | `tcv > 500000` |
| `field_contains` | Array field contains value | `customTags includes "strategic"` |
| `field_in_range` | Numeric range | `margin between 20 and 40` |
| `time_in_stage` | Days in current stage | `daysInStage > 14` |
| `stakeholder_check` | Stakeholder criteria | `hasDecisionMaker = false` |
| `task_check` | Task criteria | `overdueTasks > 0` |
| `ai_score_check` | AI metric threshold | `dealHealthScore < 50` |
| `service_line_match` | Service line filter | `serviceLineId = "its"` |
| `product_match` | Product filter | `products includes "ai-platform"` |
| `user_role_check` | User role | `owner.role = "SDR"` |

### 2C.5 Actions

| Action Type | What It Does | Configuration |
|------------|-------------|---------------|
| `create_tasks` | Auto-create tasks from template | `{ tasks: [{ name, owner, dueDaysFromNow, priority }] }` |
| `update_field` | Set opportunity field | `{ field, value }` |
| `change_stage` | Move to next/specific stage | `{ targetStage }` |
| `send_notification` | Notify users | `{ channels: ['in_app', 'email', 'slack'], recipients, message }` |
| `assign_owner` | Change deal ownership | `{ newOwner: string \| 'round_robin' \| 'manager' }` |
| `invoke_agent` | Trigger an AI agent | `{ agentId, prompt, approvalRequired }` |
| `create_draft` | Generate outreach draft | `{ templateId, stakeholderId, tone }` |
| `log_activity` | Add to activity log | `{ message, type }` |
| `webhook` | Call external URL | `{ url, method, payload }` |
| `approval_gate` | Require approval to proceed | `{ approvers: ['manager', 'vp_sales'], timeout }` |
| `escalate` | Escalate to manager | `{ reason, deadline }` |
| `tag_deal` | Add custom tag | `{ tag }` |
| `score_update` | Recalculate AI scores | `{ metrics: ['health', 'win_probability'] }` |

### 2C.6 Agentic Workflow Mode

In **Agentic Mode**, the AI Coordinator Agent can:

1. **Observe** pipeline patterns ("Deals that get stuck in Qualification for >10 days with no decision-maker identified have a 70% loss rate")
2. **Propose** new workflows ("I suggest creating a workflow: When a deal enters Qualification and has no decision-maker stakeholder after 5 days, auto-create a task 'Identify decision maker' and alert the owner")
3. **Optimize** existing workflows ("Workflow 'Auto-task on Proposal' has a 90% task-completion rate but 3 of the 5 auto-tasks are always deleted by users. I suggest removing them.")
4. **A/B test** workflow variants ("I'm testing two different follow-up timing strategies for deals entering Negotiation")

The user always has final approval:
- **[Apply Workflow]** / **[Dismiss]** for new workflow suggestions
- **[Approve Optimization]** / **[Keep Current]** for modification proposals
- Dashboard showing workflow performance metrics

### 2C.7 Pre-Built Workflow Templates

| Template | Trigger | Actions |
|----------|---------|---------|
| **Discovery Checklist** | Deal enters Discovery | Create tasks: Research company, Identify stakeholders, Schedule intro call, Qualify budget |
| **Qualification Gate** | Deal moves to Qualification | Check: TCV filled, Decision maker identified, Budget confirmed. If not → block + notify |
| **Proposal Auto-Prep** | Deal enters Proposal | Create tasks: Draft SOW, Pricing review, Presales architecture review, Legal review |
| **Stale Deal Alert** | No activity > 14 days | Notify owner, invoke Deal Coach agent, log risk signal |
| **Win Handoff** | Deal moves to Won | Invoke Handoff Agent, create delivery onboarding tasks, notify delivery team |
| **Loss Analysis** | Deal moves to Lost | Prompt for loss reason, invoke Research Agent for win-back analysis, log to analytics |
| **Executive Escalation** | TCV > $1M + stage = Negotiation | Require VP approval, create executive briefing task, invoke Meeting Prep agent |
| **Competitor Alert** | Agent detects competitor | Invoke Competitive Intel agent, create battle card task, notify sales manager |

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

## 11. Implementation Roadmap

### Phase 1: Architecture & Design
*Goal: Define domain boundaries, migrate to target stack, preserve all v1 features*

**Domain Decomposition:**
- [ ] Define service boundaries: Identity, Deals/Pipeline, Accounts, Tasks, Stakeholders, Workflows, Agents, Integrations
- [ ] Design MongoDB schema for all collections (migrate from PostgreSQL preserving all v1 data)
- [ ] Set up MongoDB Atlas cluster (primary DB + Atlas Search + Vector Search indexes)
- [ ] Implement centralized data schema with Mongoose ODM and Zod validation
- [ ] Design Knowledge Graph schema (adjacency-list model in MongoDB)

**Stack Migration:**
- [ ] Scaffold Next.js 15 App Router project with TypeScript 5.6
- [ ] Set up tRPC routers mirroring all existing Express API endpoints (zero functionality loss)
- [ ] Migrate auth to NextAuth.js v5 (Google OAuth + SAML SSO)
- [ ] Set up Redis (Upstash) for session store, cache, and pub/sub
- [ ] Configure API gateway layer (rate limiting, API key management)
- [ ] Set up BullMQ job queue for background tasks

**Design System Implementation:**
- [ ] Implement Galent Intelligence System design tokens (colors, typography, spacing)
- [ ] Restructure navigation: persistent left sidebar + top nav + AI Copilot right panel
- [ ] Update all components to new design system (Source Serif 4 headers, Inter body, glassmorphism)
- [ ] Update favicon and branding to proper Galent assets
- [ ] Implement dark mode per design system spec

**Data Migration:**
- [ ] Write PostgreSQL → MongoDB migration scripts (all 31 seed opportunities + schema)
- [ ] Validate: every v1 feature works identically on new stack
- [ ] All existing views preserved: Kanban, Timeline, Schedule Board, Table, Dashboard, Tasks, Stakeholders

**API Tooling:**
- [ ] Interactive API documentation (Swagger/OpenAPI via tRPC-openapi)
- [ ] Developer portal with pre-built TypeScript SDK
- [ ] Webhook delivery system (BullMQ + retry logic)

### Phase 2: Core Engine & Intelligence Layer
*Goal: Build agent runtime, Knowledge Graph, and Workflow Engine*

**Agent Runtime (Coordinator Pattern):**
- [ ] Implement Coordinator Agent using LangGraph / CrewAI + Claude API
- [ ] Build composable Agent interface (invoke, wake, sleep, tools, memory, output schema)
- [ ] Implement Deal Coach specialist agent (risk signals, next-best-action, strategic insights)
- [ ] Implement Pipeline Hygiene Agent (nightly cron: stale deals, missing fields, duplicates)
- [ ] Build Agent Actions Queue (pending → approved → executed, with WebSocket notifications)
- [ ] Implement agent audit trail (terminal-style registry logs)

**Knowledge Graph:**
- [ ] Populate knowledge_graph collection from existing data (accounts, stakeholders, opportunities)
- [ ] Implement relationship types: HAS_STAKEHOLDER, REPORTS_TO, CHAMPIONS, COMPETES_WITH, etc.
- [ ] Build MongoDB $graphLookup aggregation queries for relationship traversal
- [ ] Set up vector embeddings pipeline (OpenAI/Anthropic) for semantic search
- [ ] Implement agent_memory collection with semantic retrieval

**Deal Intelligence:**
- [ ] Deal Health Score computation (0-100, multi-signal composite)
- [ ] Win Probability prediction (historical pattern matching + LLM reasoning)
- [ ] AI Status indicators on Kanban cards (on track / at risk / stale / closing)
- [ ] Agent Signal cards embedded on opportunity cards
- [ ] Smart conversation summarization (LLM-powered)

**AI Copilot Sidebar:**
- [ ] Persistent right panel on all screens with agent switcher (Deal Coach, Research, Live Insights, Activity Log)
- [ ] Real-time Deal Stream with LIVE badge (WebSocket/SSE)
- [ ] Strategic Insight cards, Active Risks, Recommended Actions
- [ ] "Ask Copilot" natural language input

**Integration Platform:**
- [ ] Build iPaaS layer (event-driven message broker using BullMQ / Redis Streams)
- [ ] Implement async sync framework for ERP/CRM/Fulfillment connections
- [ ] Design webhook system for real-time upstream/downstream updates

**Workflow Engine (v1):**
- [ ] Implement trigger → condition → action engine (MongoDB-backed)
- [ ] Build pre-built workflow templates (Discovery Checklist, Qualification Gate, Proposal Auto-Prep, etc.)
- [ ] Implement customizable pipeline stages per service line
- [ ] Build Service Line and Product/Solution catalog entities
- [ ] POC-based pipeline views (My Pipeline, By Sales POC, By Service Line, By Product)

### Phase 3: Headless Frontend & Agentification
*Goal: Build all new AI-native views, full agent fleet, agentic workflows*

**New Views:**
- [ ] Account 360 Intelligence (stakeholder neural map, health indicators, AI news insights, opportunity rollup)
- [ ] AI Forecasting Lab (weighted pipeline waterfall, scenario modeling sliders, agentic insights feed)
- [ ] Revenue Funnel Intelligence (funnel stages with AI micro-insights, priority action pipeline, velocity chart)
- [ ] Neural Command Center (multi-agent chat, neural core status, actionable insights, quick action chips)
- [ ] Agent Registry (agent cards with LIVE/IDLE status, system health KPIs, registry logs, wake/manage)
- [ ] Outreach Intelligence (campaign performance, SDR/AE toggle, AI outreach drafter with approve/send)

**Enhanced Existing Views:**
- [ ] Kanban cards: health bars, win probability, agent signals, invoke agent button
- [ ] Enhanced Kanban columns: customizable per service line pipeline stages

**Full Agent Fleet:**
- [ ] Research Agent (auto-enrich accounts, stakeholder data, company news, tech stack detection)
- [ ] Outreach Drafter Agent (context-aware follow-ups with source/tone tags, approve & send)
- [ ] Forecast Agent (weighted pipeline, scenario modeling, gap-to-goal predictions)
- [ ] Competitive Intel Agent (competitor detection, battle cards, threat assessment)
- [ ] Meeting Prep Agent (pre-meeting briefing packets from KG context)
- [ ] Handoff Agent (Won → delivery transition document generation)

**Agentic Workflows:**
- [ ] Agentic Mode for Workflow Engine (AI observes patterns → proposes workflows → optimizes)
- [ ] A/B testing framework for workflow variants
- [ ] Approval gates with configurable trust levels
- [ ] SLA enforcement with auto-escalation

**Agentic Layer Infrastructure:**
- [ ] Expose all platform APIs as LLM tool/function calls
- [ ] Connect LLM (Claude) to agent framework (LangGraph/CrewAI)
- [ ] Implement human-in-the-loop approval gates for autonomous actions
- [ ] Build agent observability dashboard (LangSmith integration)

### Phase 4: Integrations & Testing
*Goal: Connect external systems, rigorous testing, production deployment*

**System Integrations:**
- [ ] System Integrations view (integration cards, sync health, neural link intensity)
- [ ] AI Schema Mapper (natural language field mapping between systems)
- [ ] Salesforce integration (Enterprise CRM Sync, bidirectional, 2-min sync)
- [ ] HubSpot integration (Marketing Pipeline, inbound lead sync, real-time)
- [ ] Gmail / Outlook email sync (bidirectional, conversation log auto-population)
- [ ] Google Calendar / O365 integration (meeting prep triggers)
- [ ] Slack integration (notifications, slash commands, bot interactions)
- [ ] Connect New Source flow (ZoomInfo, custom API endpoints)
- [ ] Neural Audit Logs for integration health monitoring

**Testing:**
- [ ] API contract testing (all tRPC routes)
- [ ] Integration testing (Salesforce, HubSpot sync reliability)
- [ ] Load testing (10K concurrent users, 1M opportunities target)
- [ ] Webhook reliability testing (retry, dead-letter queue)
- [ ] Agent accuracy testing (deal score, win probability calibration)
- [ ] Security audit (OWASP Top 10, API key management, credential encryption)
- [ ] E2E testing (Playwright) for all views and workflows

**Deployment:**
- [ ] Containerize with Docker (Next.js app + Agent runtime as separate services)
- [ ] Deploy on AWS: ECS/Fargate for agent runtime, Vercel for frontend
- [ ] Set up CI/CD pipeline (GitHub Actions)
- [ ] Configure monitoring: Sentry (errors), Datadog (APM), LangSmith (LLM observability)
- [ ] Set up staging → production promotion flow

### Phase 5: Enterprise Scale
*Goal: Multi-tenancy, compliance, advanced analytics*

- [ ] Multi-tenant architecture (organization isolation in MongoDB)
- [ ] Team hierarchy and org-level pipeline views
- [ ] Field-level permissions (RBAC on sensitive fields)
- [ ] Forecast categories (Commit / Best Case / Pipeline / Omitted)
- [ ] Rep leaderboard and coaching insights
- [ ] Revenue waterfall visualization
- [ ] Pipeline movement Sankey diagrams
- [ ] Cohort analysis and stage conversion tracking
- [ ] SOC 2 Type II compliance
- [ ] GDPR / PCI-DSS compliance checklist
- [ ] Data residency (multi-region deployment)
- [ ] White-label / custom branding options
- [ ] Mobile native app (React Native)
- [ ] Real-time data pipeline for upstream/downstream syncing (Kafka for high-volume deployments)
- [ ] Neo4j migration for Knowledge Graph (if MongoDB $graphLookup becomes a bottleneck)

---

## 11A. Architecture & Product Review

### Architect Review

**Strengths of this architecture:**

1. **MongoDB as unified data + KG + vector store** — Eliminates operational complexity of running 3 separate databases. Atlas Search + Vector Search + $graphLookup covers full-text, semantic, and graph queries in one platform. For a team scaling to 1M opportunities, this is the right pragmatic choice over premature Neo4j.

2. **Coordinator Pattern** — The right agentic pattern for this use case. Avoids the chaos of fully autonomous multi-agent swarms. The coordinator decomposes, delegates, and aggregates — maintaining control while enabling parallelism. LangGraph provides the state machine backbone; Claude provides the reasoning.

3. **Composable feature modules** — Each feature (Pipeline, Account 360, Forecasting, etc.) is an independent module with its own UI, API, agents, and workflows. This enables parallel team development and eventual micro-frontend decomposition if needed.

4. **Event-driven integration layer** — BullMQ + Redis Streams is the right choice for the current scale. Kafka is overkill until >10K events/second. The iPaaS pattern (async sync with retry + dead-letter) handles the Salesforce/HubSpot integration complexity well.

**Risks & Mitigations:**

| Risk | Impact | Mitigation |
|------|--------|------------|
| **MongoDB $graphLookup performance at scale** | Slow KG queries with >1M nodes | Monitor query performance. Phase 5 has Neo4j migration path. Use denormalized edge lists + index on nodeId/nodeType |
| **LLM latency in agent runtime** | User-facing agent responses >2s | Cache frequent inferences in Redis. Use streaming responses (SSE) for real-time feel. Run non-urgent agents async via BullMQ |
| **PostgreSQL → MongoDB migration data loss** | Loss of v1 data or functionality | Write idempotent migration scripts with rollback. Run parallel (both DBs) for 2 weeks before cutover. Automated diff-checking |
| **Agent hallucination in critical actions** | Incorrect deal scores, bad email drafts | Mandatory human-in-the-loop for all external actions (emails, stage changes, TCV modifications). Confidence thresholds. Audit trail for every agent action |
| **Scope creep across 5 phases** | Delivery delays, team burnout | Phase 1 must deliver a working product (all v1 features on new stack). Each subsequent phase is independently deployable. Feature flags for gradual rollout |
| **Integration complexity (Salesforce/HubSpot)** | Schema drift, sync failures | AI Schema Mapper with continuous monitoring. Health scores per integration. Auto-alert on sync degradation |

**Architecture Decision Records (ADRs):**

| Decision | Choice | Rationale | Alternative Considered |
|----------|--------|-----------|----------------------|
| Primary Database | MongoDB Atlas | Flexible schema for deals/agents/workflows; native JSON; Atlas Search + Vector Search eliminates need for Elasticsearch + Pinecone | PostgreSQL + pgvector (limited graph capability) |
| Knowledge Graph | MongoDB adjacency lists + $graphLookup | Operational simplicity; sufficient for <1M nodes; same DB as primary data | Neo4j (better graph queries but adds operational burden) |
| Agent Framework | LangGraph + Claude API | Coordinator pattern support; state machine DAGs; best-in-class reasoning from Claude | CrewAI (less flexible DAG support), AutoGen (Microsoft lock-in) |
| Frontend | Next.js 15 App Router | SSR/streaming for AI responses; file-based routing; React Server Components for performance | Remix (less ecosystem), current Vite SPA (no SSR) |
| API Layer | tRPC | End-to-end type safety with TypeScript; auto-generated client; composable routers | REST + OpenAPI (more boilerplate), GraphQL (complexity for this use case) |
| Queue System | BullMQ (Redis) | Simple, fast, battle-tested for job queues; sufficient for <10K events/s | Kafka (overkill at current scale), AWS SQS (vendor lock-in) |
| Auth | NextAuth.js v5 | SSO support (Google, Azure AD, Okta); JWT sessions; middleware RBAC | Auth0 (cost), Clerk (less control), custom Passport (more maintenance) |

### Product Owner Review

**Product Alignment Assessment:**

1. **User Story Coverage** — The PRD covers all 5 target personas (AE, SDR, Sales Leadership, Presales, Sales Ops). Each new view maps to specific persona needs. The SDR/AE view toggle in Outreach Intelligence is a good example of role-specific UX.

2. **Feature Prioritization** — Phase 1 correctly prioritizes migration + design system (foundational). Phase 2 adds the highest-value AI features (Deal Health, Copilot). Phase 3 builds the "wow" views that differentiate from Salesforce/HubSpot. Phases 4-5 are growth/enterprise plays.

3. **v1 Feature Preservation** — Critical requirement met. All 7 existing views, all CRUD operations, all data models, seed data, and filtering capabilities are explicitly preserved in Phase 1. The migration is additive.

4. **Workflow Engine** — The customizable pipeline stages per service line is a strong differentiator for Galent's consulting/staffing business where IT Services and Staffing have fundamentally different sales motions. The agentic workflow mode (AI proposes/optimizes workflows) is the key innovation here.

5. **Competitive Differentiation:**
   - vs. **Salesforce**: Galent AI is "intelligence-first" — AI is the primary interface, not an add-on. The Neural Command Center and Agent Registry have no Salesforce equivalent.
   - vs. **HubSpot**: Deeper AI integration, agentic automation, knowledge graph relationships. HubSpot's AI is limited to content generation.
   - vs. **Gong/Clari**: Galent combines revenue intelligence with pipeline management in one platform. Others are analytics-only overlays.

6. **Gaps to Address:**
   - **Onboarding flow**: No first-run experience defined. Recommend adding a guided setup wizard in Phase 1.
   - **Mobile experience**: Deferred to Phase 5. Consider a progressive web app (PWA) in Phase 3 as an interim.
   - **Pricing/Packaging**: No mention of tier structure. Recommend defining Free/Pro/Enterprise tiers before Phase 2 launch.
   - **Data export/portability**: Ensure users can export all their data (GDPR requirement) from day 1.
   - **Offline capability**: Not addressed. For field sales, consider offline-first data caching in Phase 5.

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
