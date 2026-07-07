'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import {
  Sparkles, Kanban, Magnet, Users, FileText, CheckSquare,
  TrendingUp, Bot, Network, Settings, ArrowRight, Check,
  MessageSquare, Upload, Search, Shield, BarChart3,
  Target, Briefcase, Crown, Eye, Rocket, BookOpen,
  ChevronDown, ChevronRight, Play, DollarSign, Zap,
  Globe, Mail, Calendar, Home, Award, Star, CircleCheck,
  Download, ClipboardList, Lock, Handshake, Trophy, RefreshCw, Brain
} from 'lucide-react';

// ── SOP Data ──
const sopStages = [
  {
    number: 1,
    title: 'PROSPECTING',
    subtitle: 'EE / EN / NN Classification',
    icon: Magnet,
    color: '#7c3aed',
    activities: [
      'NN (New-New): Cold outreach, event follow-up, referral. Requires ICP validation.',
      'EN (Existing-New): Cross-sell to existing account. Leverage existing relationship.',
      'EE (Existing-Existing): Renewal/expansion. Highest win probability.',
    ],
    tools: ['Signal Intake', 'Campaigns', 'Lead Management', 'Buyer Intent Signals', 'Deal Copilot'],
    gate: 'Lead captured with source classification (EE/EN/NN) + ICP fit score assigned',
  },
  {
    number: 2,
    title: 'QUALIFICATION',
    subtitle: 'Discovery → Qualification',
    icon: Search,
    color: '#3b82f6',
    activities: [
      'BANT assessment: Budget, Authority, Need, Timeline',
      'Identify decision maker (DM) — MANDATORY before advancing',
      'Log meeting notes via Signal Intake or Meeting Notes',
      'AI auto-qualifies leads with ICP scoring (60+ = qualified)',
      'Use Discovery Playbook (Agents → Playbooks) for guided step-by-step',
      'Meeting Intelligence: paste transcript → AI extracts action items, DM detection, deal signals',
    ],
    tools: ['Lead Management', 'Signal Intake', 'AI Agent: Deal Coach', 'Meeting Intelligence', 'Sales Playbooks', 'Deal Copilot'],
    gate: 'Must have DM identified + budget signal confirmed',
  },
  {
    number: 3,
    title: 'PROPOSAL',
    subtitle: 'Qualification → Proposal',
    icon: FileText,
    color: '#178A4C',
    activities: [
      'Use Proposal Studio for AI-assisted drafting',
      'Select template from 150+ library (match domain + engagement type)',
      'Mandatory sections: Exec Summary, Scope, Team, Timeline, Pricing',
      'Export as PDF/DOCX for client delivery',
      'Link pricing from Pricing Engine',
      'AI Email Composer: generate cover emails with A/B variants per template/tone',
      'Competitive Battle Station: generate battle cards before presenting',
    ],
    tools: ['Presales OS / Proposal Studio', 'Pricing Engine', 'Templates Library', 'AI Email Composer', 'Competitive Battle Station'],
    gate: 'Proposal delivered + stakeholder feedback received',
  },
  {
    number: 4,
    title: 'NEGOTIATION',
    subtitle: 'Proposal → Negotiation',
    icon: Handshake,
    color: '#B26A05',
    activities: [
      'Draft contracts using Contracts tab',
      'Review pricing with margin targets (≥28% standard)',
      'Get executive approval for deals >$500K (auto-triggers: $500k+ VP Sales, $1M+ CSO)',
      'Document all terms in conversation log',
      'Use Conversational Pipeline: "Move X to Negotiation" — AI executes with confirm',
      'AI Email Composer: closing nudge and follow-up emails',
    ],
    tools: ['Contracts', 'Pricing Engine', 'AI Deal Room', 'Conversational Pipeline', 'TCV Approval Workflows'],
    gate: 'Commercial terms agreed + legal review complete + approvals obtained',
  },
  {
    number: 5,
    title: 'CLOSE',
    subtitle: 'Negotiation → Won / Lost',
    icon: Trophy,
    color: '#22c55e',
    activities: [
      'Won: Auto-creates kickoff + delivery workspace tasks',
      'Won: Win/Loss Autopsy auto-triggers — full execution analysis, lessons learned',
      'Lost: Loss Autopsy auto-triggers — root cause, what to do differently',
      'Contracts: SOW/MSA execution tracked in Contracts tab',
    ],
    tools: ['Pipeline Board', 'Contracts', 'Tasks', 'Win/Loss Autopsy'],
    gate: 'Contract executed (Won) or loss reason documented (Lost) + Autopsy completed',
  },
  {
    number: 6,
    title: 'DELIVERY & GROWTH',
    subtitle: 'Ongoing Revenue & Expansion',
    icon: RefreshCw,
    color: '#11A7A0',
    activities: [
      'Track ongoing revenue (monthly/quarterly) via Client Health Score tab',
      'Identify upsell opportunities (EN → EE path) — Health tab shows upsell signals',
      'Maintain account health: engagement score, delivery score, churn probability',
      'Feed competitive intelligence back into prospecting',
      'Leader Dashboard: monitor ARR, MRR, rep performance, quota attainment',
      'Smart Forecast: Monte Carlo simulations, what-if scenarios for revenue planning',
    ],
    tools: ['Analytics Dashboard', 'Account Intelligence', 'Forecasting', 'Client Health Score', 'Leader Dashboard', 'Smart Forecast', 'Territory & Quota'],
    gate: 'Account health score maintained above threshold + expansion pipeline seeded',
  },
];

// ── PDF Generation ──
function buildPDFContent(stats: { pipeline: string; activeDeals: number; wonDeals: number; accounts: number; ee: number; en: number; nn: number }) {
  const sopHTML = sopStages.map(s => `
    <div class="stage">
      <h3>Stage ${s.number}: ${s.title} <span style="color:#666;font-weight:normal;font-size:13px">— ${s.subtitle}</span></h3>
      <p style="font-size:13px;color:#555;margin:4px 0 8px"><strong>Key Activities:</strong></p>
      <ul>${s.activities.map(a => `<li>${a}</li>`).join('')}</ul>
      <p style="font-size:13px;color:#555;margin:8px 0 4px"><strong>Tools:</strong> ${s.tools.join(', ')}</p>
      <div class="gate"><strong>Gate Criteria:</strong> ${s.gate}</div>
    </div>
  `).join('');

  return `<!DOCTYPE html><html><head>
    <title>Galent SalesPilot — User Guide & Sales SOP</title>
    <style>
      body { font-family: 'Inter', 'Segoe UI', system-ui, sans-serif; max-width: 800px; margin: 40px auto; color: #1a1a2e; padding: 0 24px; line-height: 1.6; }
      h1 { color: #7c3aed; font-size: 24px; border-bottom: 2px solid #7c3aed; padding-bottom: 8px; }
      h2 { color: #333; margin-top: 32px; font-size: 18px; }
      h3 { color: #1a1a2e; margin-bottom: 4px; font-size: 15px; }
      .stage { border-left: 3px solid #7c3aed; padding-left: 16px; margin: 20px 0; }
      .gate { background: #f0f0f5; padding: 8px 12px; border-radius: 6px; font-size: 13px; margin-top: 8px; }
      ul { margin: 4px 0; padding-left: 20px; }
      li { font-size: 13px; margin: 3px 0; color: #333; }
      .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 16px 0; }
      .stat-box { text-align: center; padding: 12px; border: 1px solid #e5e7eb; border-radius: 8px; }
      .stat-value { font-size: 20px; font-weight: 700; color: #7c3aed; }
      .stat-label { font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; }
      .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #999; text-align: center; }
      .section-divider { border: none; border-top: 1px solid #e5e7eb; margin: 32px 0; }
      @media print { body { margin: 20px; } .stage { break-inside: avoid; } }
    </style>
  </head><body>
    <h1>Galent SalesPilot — User Guide & Sales SOP</h1>
    <p style="color:#555;font-size:14px;">AI-native sales intelligence platform for IT Services & Staffing. This document covers the standard operating procedure for the complete sales lifecycle.</p>

    <div class="stats-grid">
      <div class="stat-box"><div class="stat-value">${stats.pipeline}</div><div class="stat-label">Pipeline</div></div>
      <div class="stat-box"><div class="stat-value">${stats.activeDeals}</div><div class="stat-label">Active Deals</div></div>
      <div class="stat-box"><div class="stat-value">${stats.wonDeals}</div><div class="stat-label">Won</div></div>
      <div class="stat-box"><div class="stat-value">${stats.accounts}</div><div class="stat-label">Accounts</div></div>
    </div>
    <div class="stats-grid" style="grid-template-columns: repeat(3, 1fr);">
      <div class="stat-box"><div class="stat-value">${stats.ee}</div><div class="stat-label">EE (Existing-Existing)</div></div>
      <div class="stat-box"><div class="stat-value">${stats.en}</div><div class="stat-label">EN (Existing-New)</div></div>
      <div class="stat-box"><div class="stat-value">${stats.nn}</div><div class="stat-label">NN (New-New)</div></div>
    </div>

    <hr class="section-divider" />
    <h2>Sales Process SOP — Galent IT Services & Staffing</h2>
    ${sopHTML}

    <hr class="section-divider" />
    <h2>Platform Features</h2>

    <h3>Core Sales</h3>
    <ul>
      <li><strong>Pipeline Management</strong> — 7 views: Board, Funnel, Table, Calendar, Graph, Leader, Custom. AI health badges on kanban cards. Conversational Pipeline chat bar for NLP commands.</li>
      <li><strong>New Opportunity</strong> — 6 service lines (Legacy Modernization, Data & AI, Testing & QA, Managed Services/SRE, Cloud & Infrastructure, Staffing). 4 engagement types (Fixed Price, T&M, Product Licensing, Outcome-Based). Stage drives progression (no lifecycle phase).</li>
      <li><strong>Deal Detail</strong> — 12 tabs: Details, Stakeholders, Tasks, Meetings, Email, Competitive, Health, Pricing, Presales, Contracts, Docs, Deal Room. Deal Copilot embedded.</li>
      <li><strong>Contacts Intelligence</strong> — Auto-categorized: Executive, Champion, Influencer, Gatekeeper, End User.</li>
      <li><strong>Tasks</strong> — AI auto-creates tasks on stage changes. Overdue tracking.</li>
    </ul>

    <h3>Presales & Pricing</h3>
    <ul>
      <li><strong>Proposal Studio</strong> — Conversational AI drafts proposals. 150+ templates across 12 domains. Filters to Qualification+ deals only.</li>
      <li><strong>Pricing Desk</strong> — Rate cards by geo. Apply Pricing auto-populates both TCV and Margin % on the deal.</li>
      <li><strong>Solutioning</strong> — Effort estimator, SA assignments, architecture notes, and <strong>Scope Builder</strong> with workstream-grouped scope items, execution model per item (Pod Squad, Managed Capacity, Outcome-Based, AI-Powered, Hybrid), phase (P1/P2/P3), effort points, and AI scope generation from deal context.</li>
      <li><strong>Contracts</strong> — SOW, MSA, NDA lifecycle with approval chains. <strong>8 contract templates</strong> (SOW T&amp;M, SOW Fixed Price, SOW Outcome-Based, MSA, NDA Mutual, NDA One-Way, Amendment, Renewal) — click to pre-fill type, pricing model, and standard terms.</li>
      <li><strong>Export</strong> — PDF, DOCX, Markdown export for proposals.</li>
    </ul>

    <h3>Intelligence & Analytics</h3>
    <ul>
      <li><strong>Dashboard</strong> — Recharts: funnel, forecast, industry distribution.</li>
      <li><strong>Growth Whitespace</strong> — Account × service line grid. Click "+" to create expansion opportunities.</li>
      <li><strong>Insights</strong> — Lessons learnt from won/lost deals. AI pattern detection.</li>
      <li><strong>Forecasting</strong> — Commit/Best Case/Pipeline categories. Weighted forecast.</li>
      <li><strong>EE/EN/NN Classification</strong> — Existing-Existing (repeat), Existing-New (expand), New-New.</li>
      <li><strong>Revenue Tracking</strong> — Monthly/quarterly/YTD across all surfaces.</li>
    </ul>

    <h3>SalesPilot Intelligence (Ambient AI)</h3>
    <ul>
      <li><strong>Pilot Nudges</strong> (Home → My Day) — AI-detected risk/opportunity cards: stale deals, missing DMs, ready-to-close, $0 TCV, ageing hotspots, proposals without margin. Click to expand full deal list with fix hints, click any deal to fix.</li>
      <li><strong>Signal Cards</strong> (Home → My Day) — Prominent Teams/Outlook signal cards with Accept/Dismiss. Accept triggers GenUI process view showing step-by-step: Signal → Match → Tasks → Graph → Open Deal.</li>
      <li><strong>Pilot Actions</strong> (Deal Detail → above content) — Stage-aware agent buttons: Research Account, Draft Proposal, Coach Me, Competitive Intel, Draft Follow-up, Next Steps.</li>
      <li><strong>Agent Workflows</strong> (Deal Detail → below content) — Stage-aware multi-agent pipelines with "Suggested" badge. Discovery → Lead Enrichment, Proposal → Proposal Accelerator, Negotiation → Deal Rescue, Won → Growth Play.</li>
      <li><strong>AI Create</strong> (New Opportunity) — Describe a deal in natural language, AI extracts all fields (customer, name, TCV, industry, stage). Also works with signal-driven creation.</li>
      <li><strong>Pilot Forecast Brief</strong> (Forecasting page → top) — AI commit confidence %, slip risk analysis.</li>
      <li><strong>Pilot Priorities</strong> (Tasks page → top) — AI-ranked top 5 tasks by urgency score.</li>
      <li><strong>Pipeline Insight Bar</strong> (Pipeline Board → top) — Collapsible AI insight bar with risk/action counts.</li>
      <li><strong>Ageing Column</strong> (Table view) — Days in current stage, color-coded: green ≤7d, amber ≤14d, red >14d.</li>
      <li><strong>Agent Result View</strong> — Rich interactive output: execution chain, deal cards, action items with task creation, follow-up agent chaining.</li>
    </ul>

    <h3>Agent Coordinator & Workflows</h3>
    <ul>
      <li><strong>6 Composable Workflows</strong> — Multi-agent pipelines with context passing between steps:</li>
      <li><strong>Deal Deep Dive</strong> — Coach → Research → Competitive → Coaching tips (full deal analysis).</li>
      <li><strong>Proposal Accelerator</strong> — Research → Draft proposal → Cover email (fast proposal creation).</li>
      <li><strong>Pipeline Health</strong> — Hygiene scan → Recovery plan → Forecast update (weekly review).</li>
      <li><strong>New Lead Enrichment</strong> — Research → Qualify → Outreach draft (new lead processing).</li>
      <li><strong>Deal Rescue</strong> — Diagnose stall → Competitive check → Coaching → Re-engagement email.</li>
      <li><strong>Growth Play</strong> — Whitespace analysis → Deep dive → Expansion proposal.</li>
    </ul>

    <h3>AI Agents (13)</h3>
    <ul>
      <li><strong>13 AI Agents</strong> — Deal Coach, Research, Outreach, Hygiene, Forecast, Intake, Proposal, Account Intel, Competitive Intel, Growth, Enablement Coach, Signal Processor, Campaign Manager. Each with model routing, guardrails, blocked actions, approval requirements, and optional cron schedules.</li>
      <li><strong>AI Execution Telemetry</strong> — Live on Agents page: AI calls today, active assists, recent traces with latency/model/status. Reads from telemetry/traces/ and telemetry/metrics/.</li>
      <li><strong>Platform Evals</strong> — 4 runnable eval suites on Agents page: Gateway (6 tests), Telemetry (3 tests), Config (3 tests), Workshop (8 tests). Click to run, see pass/fail per assertion. Total: 20 platform health checks.</li>
      <li><strong>AI Gateway</strong> — Every AI call (13 call sites) goes through guardrail chain: rate limit (config/token_budgets.json) → sandbox validation (gatekeeper/sandbox.config.json) → token budget → Anthropic API → telemetry trace → metrics update.</li>
      <li><strong>MCP Server</strong> — 15 tools + invoke_agent exposed at /api/mcp. Compatible with Claude Desktop, Cursor, VS Code.</li>
      <li><strong>Sales Enablement</strong> — 3 AI coaches (Platform, Offerings, Objection), 6 offerings with battle cards, 5 stage-based playbooks.</li>
      <li><strong>Ask Galent</strong> — Natural language pipeline queries with GenUI interactive action buttons.</li>
      <li><strong>Agentic Auto-Actions</strong> — Stage changes auto-create tasks (SOW, pricing, contracts, kickoff).</li>
    </ul>

    <h3>Plugins & Integrations</h3>
    <ul>
      <li><strong>Outlook Add-in</strong> — Native sidebar in Outlook. Auto-reads email (subject, from, body). One-click "Capture Signal & Process with AI". Shows deal match, action items, tasks created. Signals appear as cards on Home page with Accept/Dismiss. Deployed via admin.microsoft.com.</li>
      <li><strong>Teams Bot</strong> — Native Teams bot. @mention or DM the bot with meeting notes, deal updates, or client conversations. AI processes messages, extracts signals, matches deals, creates tasks, updates knowledge graph. Compose extension to search and share deal cards.</li>
      <li><strong>Signal Cards</strong> — Signals from Teams/Outlook show on Home page. Accept triggers GenUI process view: Signal → Match (AI + fuzzy client-side) → Link to existing deal or Create new opportunity → Graph Updated. Smart deduplication prevents duplicate opportunities for existing customers.</li>
      <li><strong>Daily Digest</strong> — Automated email digest to each sales rep: KPIs, deals needing action, overdue tasks, recent signals, quick links. Trigger from Settings → Notifications or via API. Schedulable via AWS EventBridge cron.</li>
      <li><strong>Invite Emails</strong> — Creating a user auto-sends branded invite email. Re-send from Admin → Users → Send Invite button.</li>
      <li><strong>Voice AI</strong> — Real-time transcription via Web Speech API. Record → auto-transcribe → Process with AI. Playback with progress bar.</li>
      <li><strong>CRM Sync</strong> — Salesforce, HubSpot, Pipedrive, Zoho, Freshsales bidirectional sync engine.</li>
      <li><strong>Email Connector</strong> — Gmail/Outlook IMAP+SMTP connector with CC/BCC tracking.</li>
      <li><strong>MCP Server</strong> — 15 tools + invoke_agent at /api/mcp. Configure from Settings → MCP Tools. Compatible with Claude Desktop, Cursor, VS Code.</li>
    </ul>

    <h3>Personalization</h3>
    <ul>
      <li><strong>Default "My" Scope</strong> — Home page, pipeline, tasks all default to showing your own deals. Toggle My/Team/Org via scope switch.</li>
      <li><strong>Server-Side Filtering</strong> — Opportunities filtered by primaryOwner on the server, not just client-side.</li>
      <li><strong>Per-User Notifications</strong> — Each user sees their own notifications + broadcast signals from webhooks.</li>
      <li><strong>Activity Attribution</strong> — All actions (create, update, delete) log the real user name, not "Admin User".</li>
    </ul>

    <h3>Presales Lifecycle</h3>
    <ul>
      <li><strong>Connected Flow</strong> — Deal presales tab shows 5-phase lifecycle: RFP/Discovery → Proposal → Pricing → Solutioning → Contracts. Each phase shows completion status.</li>
      <li><strong>Proposal Studio</strong> — 8 AI-draftable sections with progress tracking. Click to generate, expand to view/copy.</li>
      <li><strong>Conditional UI</strong> — Create Contract and View Contracts only appear for Negotiation/Won/Proposal stages.</li>
    </ul>

    <h3>Admin & Users</h3>
    <ul>
      <li><strong>User Management</strong> — Create users, assign roles. Auto-sends invite email on creation.</li>
      <li><strong>Send Invite</strong> — Email invite button on Admin → Users page. Branded HTML template with sign-in link.</li>
      <li><strong>O365 Directory</strong> — Search organization directory via Microsoft Graph, invite users from Azure AD.</li>
      <li><strong>Microsoft SSO</strong> — Sign in with Microsoft O365 via Azure AD OAuth with MFA support.</li>
      <li><strong>Smart Matching</strong> — Users auto-matched to their deals by fuzzy name matching.</li>
      <li><strong>Settings</strong> — 7 tabs: AI & Agents, Plugins, MCP Tools, Territory & Quota, Security (2FA/TOTP), Appearance, Notifications.</li>
      <li><strong>2FA (TOTP)</strong> — App-level authenticator setup in Settings → Security. Works with Google/Microsoft Authenticator.</li>
      <li><strong>RBAC</strong> — 6 roles (Admin, Manager, Rep, SDR, Presales, Viewer) with 30+ permissions across 15 resources.</li>
    </ul>

    <hr class="section-divider" />
    <h2>Wave 3 — AI Intelligence Suite (20 Features)</h2>

    <h3>Visualization & Copilot</h3>
    <ul>
      <li><strong>Intelligence Mindmap</strong> (Home → Dashboard) — D3.js force graph. Center: you, Ring 1: KPIs, Ring 2: deals (sized by TCV, colored by health), Ring 3: stakeholders. Click to drill, zoom, expand fullscreen.</li>
      <li><strong>Deal Copilot</strong> (All pages) — Floating AI button bottom-right. Context-aware prompts based on current page. Deal-focused mode in Deal Detail. Minimizable.</li>
      <li><strong>Conversational Pipeline</strong> (Pipeline) — Chat bar at bottom of kanban. "Move Stellantis to Negotiation" → AI parses intent → executable action card with one-click confirm.</li>
      <li><strong>Revenue Signals Timeline</strong> (Dashboard) — Unified timeline: activities + AI signals (stale deals, close-ready). Grouped by date, click to open deal.</li>
    </ul>

    <h3>Deal Intelligence</h3>
    <ul>
      <li><strong>Meeting Intelligence</strong> (Deal Detail → Meetings) — Paste transcript from Teams/Zoom/Meet. AI extracts action items, stakeholder sentiment, buying intent, competitors, objections.</li>
      <li><strong>Win/Loss Autopsy</strong> (Auto on Won/Lost) — Full modal: execution score 0-100, key factors, timeline, stakeholder map, lessons, recommendations.</li>
      <li><strong>AI Email Composer</strong> (Deal Detail → Email) — 6 templates × 4 tones. Auto-selects DM. A/B variant generation. Copy-to-clipboard.</li>
      <li><strong>Competitive Battle Station</strong> (Deal Detail → Competitive) — Add competitors → AI generates battle cards: threat level, win rate, strengths vs advantages, talking points, objection handlers.</li>
      <li><strong>Client Health Score</strong> (Deal Detail → Health, Won only) — Overall/Engagement/Delivery score rings. Churn %, renewal risk, upsell signals, recommendations.</li>
      <li><strong>AI Deal Rooms</strong> (Deal Detail → Deal Room) — Team chat with AI assistant, document management (add/share/track), client micro-portal with shareable link.</li>
    </ul>

    <h3>Automation & Playbooks</h3>
    <ul>
      <li><strong>Autonomous Agent Mode</strong> (Agents) — Toggle: low-risk auto-execute, high-risk queue for approval. Configurable confidence threshold.</li>
      <li><strong>TCV Approval Workflows</strong> — Auto on Negotiation: $500k+ → VP Sales, $1M+ → CSO chain. Visual status in Deal Detail.</li>
      <li><strong>Sales Playbooks</strong> (Agents) — 4 stage playbooks (Discovery → Negotiation), 5 steps each, AI coaching per step, progress tracking.</li>
    </ul>

    <h3>Enterprise & RevOps</h3>
    <ul>
      <li><strong>Leader Dashboard</strong> (Pipeline → Leader) — 8 KPIs (ARR, MRR, Win Rate, etc), rep performance, stage/industry/cohort charts, top deals.</li>
      <li><strong>Smart Forecast + Monte Carlo</strong> (Forecasting) — 3 scenarios, what-if sliders (win rate ±20%, slippage 0-50%), 1000-iteration Monte Carlo with P10-P90.</li>
      <li><strong>Custom Dashboards</strong> (Pipeline → Custom) — 15 widget types, add from catalog, edit/remove, grid layout.</li>
      <li><strong>Buyer Intent Signals</strong> (Accounts) — AI intent score + signals: job postings, tech, news, web activity. Strength badges.</li>
      <li><strong>Territory & Quota</strong> (Settings) — Define territories, assign owners/quotas, attainment %, pacing bars, gap analysis.</li>
    </ul>

    <h3>Signal Flow (End-to-End)</h3>
    <ul>
      <li><strong>Capture</strong> — Teams bot / Outlook add-in / Voice / Signal Intake → AI processes.</li>
      <li><strong>Match</strong> — AI + client-side fuzzy match to existing deals. No duplicates.</li>
      <li><strong>Accept</strong> — Signal Cards on Home → Accept → links to existing deal OR creates new opportunity.</li>
      <li><strong>Pipeline</strong> — Opportunity appears in kanban (Signal badge), funnel (signal count), mindmap (deal node).</li>
      <li><strong>Badges</strong> — Kanban cards show: AI health score, win probability, missing DM, signal origin, active indicator.</li>
    </ul>

    <h3>Client Workshops (Assessment Engine)</h3>
    <ul>
      <li><strong>Creation</strong> — 3 modes: (1) AI from Description + Guided Setup (conversational 4-step AI interview), (2) From PPTX/Deck upload (AI parses slides into structure), (3) Composable template assembly. Dynamic — no fixed templates, AI interviews you before freezing structure.</li>
      <li><strong>10-Tab Workshop</strong> — Overview → Intake → <strong>Whiteboard</strong> (Board + Show dual view. Board: Sticky Wall, Notes &amp; Outline, Sketch Pad, Media Gallery + AI Copilot with 8 action types. Show: full-screen slide facilitation from PPTX with per-slide stickies, notes, audio, scoring, presenter mode + AI copilot. One upload populates both views. Server-side PPTX/DOCX/PDF parsing. S3 DAM. Voice recording with Whisper/Deepgram transcription. RAG pipeline for document context.) → <strong>Assess</strong> (Auto-Score + Dynamic Dimensions from Whiteboard.) → Use Cases (doc upload → AI extract) → Scope → Findings (5 data-driven assets) → Proposal → Builder → Settings. Stage Summary convergence bars. Knowledge graph context on all AI calls.</li>
      <li><strong>Stage Gates</strong> — Entry/exit criteria on every tab showing what's needed and what comes out.</li>
      <li><strong>AI Assists</strong> — 12 registered assists: finding.synthesize, dimension.detail, dimension.suggest, gap.narrative, usecase.enrich, pilot.recommend, scope.synthesize, currentstate.narrative, proposal.generate, exec.summary, consistency.check, deep.discovery. Model-routed (sonnet/opus), zod-validated, interaction-logged.</li>
      <li><strong>Exit at Any Stage</strong> — Generate a findings report from the Findings tab at any point. Don't need to complete all stages to get a deliverable.</li>
      <li><strong>Deal Integration</strong> — Auto-creates Discovery opportunity, deal stage progression bar, workshop tab in Deal Detail, workshop badge on kanban cards, workshop column in Command Center.</li>
      <li><strong>Exports</strong> — 5 data-driven deliverable assets (Assessment Report with full dimension tables, Transformation Roadmap with SVG timeline, Architecture Deep Dive with platform maturity bars, Executive Briefing with traffic light summary, Gap Analysis with per-level heatmaps). All code-rendered infographics — zero AI text. Plus Proposal HTML/PDF, Workshop JSON export/import.</li>
      <li><strong>Workshop CRUD</strong> — Add/edit/delete on every section: scope items, levels, workstreams, dimensions, use cases (inline edit name/sponsor/problem), findings, recommendations.</li>
      <li><strong>AI Gateway</strong> — Every AI call (13 call sites) goes through guardrail chain: rate limit → sandbox validation → token budget → Anthropic API → telemetry trace → metrics. Config-driven from token_budgets.json + sandbox.config.json.</li>
      <li><strong>Platform Evals</strong> — 4 runnable test suites (Gateway, Telemetry, Config, Workshop) with 20 assertions, executable from Agents page.</li>
      <li><strong>Visual Polish</strong> — Premium hover-lift, glow effects, press feedback, focus rings, gradient section labels, smooth transitions, 10% font scale platform-wide, fullscreen toggle.</li>
    </ul>

    <hr class="section-divider" />
    <h2>Getting Started</h2>
    <ol>
      <li>Sign in at <strong>https://salespilot.galent.ai</strong> with Microsoft or email/password.</li>
      <li>Check <strong>"My Day"</strong> — Pilot Nudges show risks. Signal Cards show Teams/Outlook signals → Accept to link/create deals.</li>
      <li>Switch to <strong>"Dashboard"</strong> — Intelligence Mindmap visualizes your pipeline. Revenue Signals Timeline shows all activity.</li>
      <li>Open <strong>Pipeline</strong> → Board view with AI health badges on cards. Use <strong>Conversational Pipeline</strong> chat bar: "Move X to Y".</li>
      <li>Try <strong>Pipeline → Leader</strong> for RevOps KPIs. <strong>Pipeline → Custom</strong> to build your own dashboard.</li>
      <li>Click any deal → <strong>Deal Detail</strong> with 12 tabs: Details, Stakeholders, Tasks, Meetings, Email, Competitive, Health, Pricing, Presales, Contracts, Docs, Deal Room.</li>
      <li>In Deal Detail → <strong>Meetings</strong>: paste a transcript → AI extracts intelligence. <strong>Email</strong>: compose with A/B variants. <strong>Competitive</strong>: generate battle cards.</li>
      <li>Move a deal to Won/Lost → <strong>Win/Loss Autopsy</strong> auto-triggers with full execution analysis.</li>
      <li>Use the <strong>Deal Copilot</strong> (floating button, bottom-right) on any page for context-aware AI help.</li>
      <li><strong>Agents page</strong> — Enable <strong>Autonomous Mode</strong> (auto-execute + approval queue). Use <strong>Sales Playbooks</strong> for stage-by-stage coaching.</li>
      <li><strong>Forecasting</strong> — Smart Forecast with what-if sliders + Monte Carlo (1k simulations).</li>
      <li><strong>Accounts</strong> — Expand any account for <strong>Buyer Intent Signals</strong> + Relationship Map.</li>
      <li><strong>Settings</strong> → <strong>Territory & Quota</strong> for territory management. Plugins, MCP Tools, Security (2FA).</li>
      <li><strong>Presales → Solutioning</strong> — Select a deal, use the Scope Builder to define scope items by workstream with execution models (Pod Squad, Managed Capacity, Outcome-Based, AI-Powered, Hybrid). AI Generate Scope from deal context. Push to Studio to create proposal sections.</li>
      <li><strong>Presales → Workshops</strong> — Create a workshop (describe in NL or pick service lines). Score dimensions, generate findings, build scope, create proposal. Exit at any stage with a downloadable report.</li>
      <li><strong>Workshop Findings</strong> — Full dashboard: executive summary with gap severity, maturity distribution, deep level drill-down, AI-generated recommendations (Quick Wins / Foundation / Strategic / Governance), investment roadmap. Export as HTML/PDF.</li>
      <li><strong>Workshop → Proposal</strong> — Same proposal features as Presales Proposal Studio, fed from workshop assessment data. Both paths produce the same output format with delivery model mix and phase distribution.</li>
    </ol>

    <div class="footer">
      Galent SalesPilot v4.0 — Wave 3 + Workshops · ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} · https://salespilot.galent.ai
    </div>
  </body></html>`;
}

// ── Interactive Feature Cards ──
function FeatureCard({ icon: Icon, title, description, href, color, tag, stats }: {
  icon: any; title: string; description: string; href: string; color: string; tag?: string; stats?: string;
}) {
  return (
    <Link href={href} className="group p-5 rounded-xl g-surface g-elevated hover-glow transition-all text-left">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}15` }}>
          <Icon className="h-5 w-5" style={{ color }} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground group-hover:text-[#7c3aed] transition-colors">{title}</span>
            {tag && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#7c3aed]/10 text-[#7c3aed] font-medium">{tag}</span>}
          </div>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{description}</p>
          {stats && <p className="text-[10px] text-muted-foreground mt-2 opacity-70">{stats}</p>}
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all shrink-0 mt-1" />
      </div>
    </Link>
  );
}

// ── Journey Step ──
function JourneyStep({ number, title, description, features, isActive, onToggle }: {
  number: number; title: string; description: string;
  features: { icon: any; title: string; description: string; href: string; color: string; tag?: string; stats?: string }[];
  isActive: boolean; onToggle: () => void;
}) {
  return (
    <div className="relative">
      {/* Step indicator */}
      <button onClick={onToggle} className="flex items-center gap-4 w-full text-left group">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-bold text-sm transition-colors ${
          isActive ? 'bg-[#7c3aed] text-white' : 'bg-secondary text-muted-foreground group-hover:bg-[#7c3aed]/10 group-hover:text-[#7c3aed]'
        }`}>
          {number}
        </div>
        <div className="flex-1">
          <div className="text-base font-semibold text-foreground font-display">{title}</div>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
        {isActive ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
      </button>

      {/* Features grid */}
      {isActive && (
        <div className="mt-4 ml-14 grid grid-cols-1 md:grid-cols-2 gap-3 animate-flow-in">
          {features.map(f => <FeatureCard key={f.title} {...f} />)}
        </div>
      )}
    </div>
  );
}

// ── SOP Stage Card ──
function SOPStageCard({ stage, isOpen, onToggle }: {
  stage: typeof sopStages[0]; isOpen: boolean; onToggle: () => void;
}) {
  const Icon = stage.icon;
  return (
    <div className="rounded-xl g-surface g-elevated overflow-hidden transition-all">
      <button onClick={onToggle} className="flex items-center gap-4 w-full text-left p-4 group">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${stage.color}15` }}>
          <Icon className="h-5 w-5" style={{ color: stage.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${stage.color}15`, color: stage.color }}>
              STAGE {stage.number}
            </span>
            <span className="text-sm font-semibold text-foreground font-display">{stage.title}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{stage.subtitle}</p>
        </div>
        {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
      </button>

      {isOpen && (
        <div className="px-4 pb-4 space-y-3 animate-flow-in">
          <div className="ml-14 space-y-3">
            {/* Activities */}
            <div>
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Key Activities</div>
              <ul className="space-y-1.5">
                {stage.activities.map((a, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-foreground">
                    <Check className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: stage.color }} />
                    <span>{a}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Tools */}
            <div>
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Tools & Features</div>
              <div className="flex flex-wrap gap-1.5">
                {stage.tools.map(t => (
                  <span key={t} className="text-[10px] px-2 py-1 rounded-lg bg-secondary text-foreground font-medium">{t}</span>
                ))}
              </div>
            </div>

            {/* Gate */}
            <div className="flex items-start gap-2 p-3 rounded-lg bg-[#7c3aed]/5 border border-[#7c3aed]/10">
              <Lock className="h-3.5 w-3.5 mt-0.5 text-[#7c3aed] shrink-0" />
              <div>
                <div className="text-[10px] font-semibold text-[#7c3aed] uppercase tracking-wider">Gate Criteria</div>
                <p className="text-xs text-foreground mt-0.5">{stage.gate}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function GuidePage() {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState(0);
  const [activeSOP, setActiveSOP] = useState(-1);
  const [quickStart, setQuickStart] = useState(false);

  // Live pipeline stats for context
  const { data: opportunities = [] } = trpc.opportunity.list.useQuery();
  const opps = opportunities as any[];
  const activeDeals = opps.filter((o: any) => !['Won', 'Lost'].includes(o.status));
  const wonDeals = opps.filter((o: any) => o.status === 'Won');
  const totalPipeline = activeDeals.reduce((s: number, o: any) => s + (o.tcv || 0), 0);
  const totalRevenue = wonDeals.reduce((s: number, o: any) => s + (o.tcv || 0), 0);
  const allTasks = opps.flatMap((o: any) => o.subTasks || []);
  const overdueTasks = allTasks.filter((t: any) => t.status === 'pending' && new Date(t.dueDate) < new Date());

  // Account + classification counts
  const uniqueAccounts = new Set(opps.map((o: any) => o.account).filter(Boolean));
  const eeCount = opps.filter((o: any) => (o.classification || '').toUpperCase() === 'EE').length;
  const enCount = opps.filter((o: any) => (o.classification || '').toUpperCase() === 'EN').length;
  const nnCount = opps.filter((o: any) => (o.classification || '').toUpperCase() === 'NN').length;

  const handleDownloadPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const html = buildPDFContent({
      pipeline: `$${(totalPipeline / 1e6).toFixed(1)}M`,
      activeDeals: activeDeals.length,
      wonDeals: wonDeals.length,
      accounts: uniqueAccounts.size,
      ee: eeCount,
      en: enCount,
      nn: nnCount,
    });
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  };

  const journeySteps = [
    {
      title: 'Prospecting & Lead Generation',
      description: 'Capture leads from any channel, qualify with AI, and build your pipeline',
      features: [
        { icon: Magnet, title: 'Lead Management', description: 'AI-powered lead scoring, qualification, and enrichment. Leads flow: Signal → Qualify → Enrich → Engage → Convert.', href: '/leads', color: '#7c3aed', tag: 'AI', stats: `${opps.length > 0 ? 'Pipeline active' : 'Start adding leads'}` },
        { icon: Globe, title: 'Signal Intake', description: 'Capture intel from voice recordings, Teams transcripts, Outlook emails, or desktop notes. AI extracts deal signals automatically.', href: '/intake', color: '#11A7A0', tag: 'Omni-channel' },
        { icon: Mail, title: 'Campaigns', description: 'Track outbound, ABM, and inbound campaigns with funnel analytics. Create, manage, and measure campaign performance.', href: '/campaigns', color: '#3b82f6' },
        { icon: Network, title: 'Account Intelligence', description: 'Deep account research with Buyer Intent Signals (job postings, tech, news), D3 Relationship Intelligence Graph (sentiment halos, DM crowns), territory assignment, and expansion signals.', href: '/accounts', color: '#f59e0b', tag: 'D3 + Intent', stats: 'AI enrichment + intent scoring + territory' },
      ],
    },
    {
      title: 'Pipeline Management',
      description: 'Manage deals through 7 views with AI coaching, NLP commands, and real-time insights',
      features: [
        { icon: Kanban, title: 'Pipeline Board', description: 'Drag-and-drop kanban with AI health badges on every card (health score, win probability, missing DM, signal origin). Gate criteria on stage move.', href: '/pipeline', color: '#7c3aed', tag: 'Primary', stats: `${activeDeals.length} active deals · $${(totalPipeline / 1e6).toFixed(1)}M pipeline` },
        { icon: MessageSquare, title: 'Conversational Pipeline', description: 'Chat bar at bottom of board. "Move Stellantis to Negotiation" → AI parses intent → action card with Execute button. Natural language pipeline management.', href: '/pipeline', color: '#22c55e', tag: 'NLP' },
        { icon: BarChart3, title: 'Leader Dashboard', description: 'Pipeline → Leader tab. 8 executive KPIs, Targets vs Actuals per rep (quota, closed, pipeline, attainment %, pacing), rep ranking, charts.', href: '/pipeline', color: '#3b82f6', tag: 'RevOps' },
        { icon: Crown, title: 'Custom Dashboards', description: 'Pipeline → Custom tab. 15 widget types (KPIs, bar charts, pie charts, deal lists). Add from catalog, edit layout.', href: '/pipeline', color: '#7c3aed', tag: 'Builder' },
        { icon: CheckSquare, title: 'Tasks', description: 'AI auto-creates tasks when deals change stages. Track overdue items, set priorities, and link everything to deals.', href: '/tasks', color: '#ef4444', stats: overdueTasks.length > 0 ? `${overdueTasks.length} overdue tasks need attention` : 'All tasks on track' },
        { icon: Users, title: 'Contacts & Intelligence', description: 'Auto-categorized contacts: Executive, Champion, Influencer, Gatekeeper. Slide-out intelligence panel for each person.', href: '/stakeholders', color: '#8b5cf6', tag: 'AI Categories' },
      ],
    },
    {
      title: 'Presales & Pricing',
      description: 'Build proposals, estimate pricing, generate SOW — AI-assisted with auto-populate margin',
      features: [
        { icon: Target, title: 'Presales OS', description: 'Pursuit pipeline (Qualification+ only), 10-section Proposal Studio with AI drafting, Scope Builder (8 workstreams, 5 execution models, AI generation, Push to Studio), effort estimator, lifecycle-based routing, and 150+ templates. Deals filter to Qualification/Proposal/Negotiation.', href: '/presales', color: '#178A4C', tag: 'AI Studio' },
        { icon: DollarSign, title: 'Pricing Engine', description: '11 roles × 6 geo regions. Build team compositions, calculate blended rates. Apply Pricing auto-populates both TCV and Margin % on the deal.', href: '/pricing', color: '#B26A05', tag: 'Auto-Margin' },
        { icon: FileText, title: 'Contracts', description: 'Full contract lifecycle: SOW, MSA, NDA, Change Orders. Approval chains, expiry tracking, and deal linking.', href: '/contracts', color: '#C73A3A' },
      ],
    },
    {
      title: 'Analytics & Forecasting',
      description: 'Pipeline insights, scenario modeling, Monte Carlo simulations, and deal flow visualization',
      features: [
        { icon: BarChart3, title: 'Analytics Dashboard', description: 'Pipeline by stage, by owner, by industry. Sales funnel with signal counts. Forecast by quarter.', href: '/dashboard', color: '#7c3aed' },
        { icon: TrendingUp, title: 'Forecasting + Smart Scenarios', description: 'Commit/Best Case/Pipeline categories + Smart Forecast: 3 scenarios (Base/Optimistic/Conservative), what-if sliders, 1000-iteration Monte Carlo with P10-P90 confidence intervals.', href: '/forecasting', color: '#3b82f6', tag: 'Monte Carlo' },
        { icon: Eye, title: 'Deal Graph', description: 'Interactive pipeline visualization — graph, sankey, and list views. Click any node to drill into deal details.', href: '/graph', color: '#22c55e' },
      ],
    },
    {
      title: 'Pilot Intelligence & AI Agents',
      description: '13 specialized AI agents woven into every surface — the platform thinks for you',
      features: [
        { icon: Brain, title: 'SalesPilot Intelligence', description: 'Ambient AI: Pilot Nudges on Home, Insight Bar on Pipeline, Pilot Actions in Deal Detail, Forecast Brief, Task Priorities — agents run behind the scenes.', href: '/', color: '#7c3aed', tag: 'Ambient AI' },
        { icon: Bot, title: 'Agent Fleet + Workflows', description: '13 agents + 6 composable workflows: Deal Deep Dive, Proposal Accelerator, Pipeline Health, Lead Enrichment, Deal Rescue, Growth Play.', href: '/agents', color: '#ec4899', tag: '13 + 6', stats: 'Coordinator with context passing between agents' },
        { icon: Sparkles, title: 'Ask Galent', description: 'Natural language queries. AI responds with interactive GenUI cards, deal lists, metrics, and action buttons.', href: '/ask', color: '#11A7A0' },
        { icon: Zap, title: 'Plugins & MCP', description: 'Download Outlook/Teams connectors from Settings → Plugins. Connect Claude Desktop via Settings → MCP Tools.', href: '/settings', color: '#f59e0b', tag: 'MCP' },
      ],
    },
    {
      title: 'Wave 3 — AI Intelligence Suite',
      description: '20 new features: Intelligence Mindmap, Deal Copilot, Meeting Intelligence, Autonomous Agents, Monte Carlo Forecasting, Battle Station, and more',
      icon: Crown,
      features: [
        { icon: Brain, title: 'Intelligence Mindmap', description: 'D3 force-directed graph on Dashboard. Center: you, Ring 1: KPIs (Pipeline, Revenue, Deals, Signals), Ring 2: each deal node sized by TCV and colored by health, Ring 3: stakeholders. Click any node to drill in. Zoom, drag, expand fullscreen.', href: '/', color: '#7c3aed', tag: 'D3.js' },
        { icon: Sparkles, title: 'Deal Copilot', description: 'Floating AI button (bottom-right) on every page. Context-aware prompts based on current page. Deal-focused mode when viewing a specific deal. Minimizable, streaming AI responses.', href: '/', color: '#5B4FE9', tag: 'Global' },
        { icon: MessageSquare, title: 'Conversational Pipeline', description: 'Chat bar at bottom of Pipeline board. Type "Move Stellantis to Negotiation" or "Set TCV for Acme to $500k" — AI parses intent and shows executable action cards with one-click confirmation.', href: '/pipeline', color: '#22c55e', tag: 'NLP' },
        { icon: Target, title: 'Meeting Intelligence', description: 'New "Meetings" tab in Deal Detail. Paste transcripts from Teams/Zoom/Meet. AI extracts action items, stakeholder sentiment, deal signals (buying intent, budget, competitors, objections).', href: '/pipeline', color: '#3b82f6', tag: 'AI Extract' },
        { icon: Trophy, title: 'Win/Loss Autopsy', description: 'Auto-triggers when deal moves to Won or Lost. Full-screen modal: execution score (0-100), key factors, deal timeline, stakeholder map, lessons learned, recommendations.', href: '/pipeline', color: '#22c55e', tag: 'Auto-trigger' },
        { icon: Zap, title: 'Revenue Signals Timeline', description: 'Unified signal stream on Dashboard. Merges activity feed + AI signals (stale deals, close opportunities). Grouped by date, click to open.', href: '/', color: '#f59e0b' },
        { icon: Mail, title: 'AI Email Composer', description: 'New "Email" tab in Deal Detail. 6 templates × 4 tones. Auto-selects DM as recipient. A/B variant generation. Copy-to-clipboard.', href: '/pipeline', color: '#10b981', tag: 'A/B Testing' },
        { icon: Bot, title: 'Autonomous Agent Mode', description: 'Toggle on Agents page. Low-risk actions auto-execute (logging, notifications, tags). High-risk actions queue for approval. Configurable confidence threshold.', href: '/agents', color: '#ec4899', tag: 'Autonomous' },
        { icon: Shield, title: 'TCV Approval Workflows', description: 'Auto-triggers on stage change to Negotiation: $500k+ requires VP Sales, $1M+ adds CSO to chain. Visual approval status in Deal Detail.', href: '/pipeline', color: '#f59e0b', tag: 'Auto-route' },
        { icon: Award, title: 'Client Health Score', description: 'New "Health" tab for Won deals. Overall/Engagement/Delivery score rings. Churn probability, renewal risk, upsell signals, engagement metrics with trends.', href: '/pipeline', color: '#22c55e' },
        { icon: BookOpen, title: 'Sales Playbooks', description: '4 stage playbooks (Discovery → Negotiation), 5 steps each with descriptions and tips. AI coaching button on every step. Progress tracking.', href: '/agents', color: '#7c3aed' },
        { icon: BarChart3, title: 'Leader Dashboard', description: 'New "Leader" tab on Pipeline page. 8 executive KPIs (ARR, MRR, Win Rate, etc), rep performance, stage chart, industry pie, cohort analysis, top deals table.', href: '/pipeline', color: '#3b82f6', tag: 'RevOps' },
        { icon: TrendingUp, title: 'Smart Forecast + Monte Carlo', description: 'Scenarios (Base/Optimistic/Conservative), what-if sliders (win rate ±20%, slippage 0-50%), quarterly projection chart, 1000-iteration Monte Carlo with P10-P90 confidence.', href: '/forecasting', color: '#06b6d4', tag: 'Monte Carlo' },
        { icon: Shield, title: 'Competitive Battle Station', description: 'New "Competitive" tab in Deal Detail. Add competitors, AI generates battle cards: threat level, win rate, strengths/advantages, talking points, objection handlers.', href: '/pipeline', color: '#ef4444', tag: 'Battle Cards' },
        { icon: Crown, title: 'Custom Dashboards', description: 'New "Custom" tab on Pipeline. 15 widget types (KPIs, charts, lists). Add from catalog, edit layout with remove buttons. Build your own view.', href: '/pipeline', color: '#7c3aed', tag: 'Builder' },
        { icon: Zap, title: 'Buyer Intent Signals', description: 'Inline on expanded accounts. AI-generated intent score + signals: job postings, tech signals, news, web activity. Strength badges and actionable recommendations.', href: '/accounts', color: '#f59e0b' },
        { icon: DollarSign, title: 'Territory & Quota', description: 'Settings → Territory & Quota. Define territories, assign owners, set quotas. Attainment tracking, pacing bars, gap analysis, stacked bar chart.', href: '/settings', color: '#10b981' },
        { icon: MessageSquare, title: 'AI Deal Rooms', description: 'Enhanced "Deal Room" tab in Deal Detail. Team chat with AI assistant, document management (add/share/track), client micro-portal with shareable link.', href: '/pipeline', color: '#8b5cf6', tag: 'Portal' },
        { icon: BookOpen, title: 'Client Workshops', description: 'Full assessment engine: 9-tab workshop page (Overview → Intake → Assess → Use Cases → Scope → Findings → Proposal → Builder → Settings). AI conversational creation or composable template assembly from 10+ service lines. 0-4 maturity scoring with Deep Discovery, ReadinessSpine + GapHeatmap exhibits. Stage gates on every tab. Findings report with infographics + recommendations. Scope builder with execution models. Proposal generator with traceability. HTML/PDF export. Deal stage progression. AI assist registry (12 assists). Assessment chat with doc upload.', href: '/presales', color: '#0A867F', tag: '9 Tabs' },
      ],
    },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#7c3aed]/10 text-[#7c3aed] text-xs font-medium">
          <BookOpen className="h-3.5 w-3.5" /> Interactive Platform Guide & Sales SOP
        </div>
        <h1 className="text-3xl font-bold text-foreground font-display">Welcome to Galent SalesPilot</h1>
        <p className="text-sm text-muted-foreground max-w-xl mx-auto">
          AI-native sales intelligence platform. Follow the journey below — each step links to the actual feature so you can try it immediately. Includes the full Sales SOP for Galent IT Services & Staffing.
        </p>
      </div>

      {/* Download PDF + Quick Start buttons */}
      <div className="flex items-center gap-3 justify-center flex-wrap">
        <button
          onClick={handleDownloadPDF}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#7c3aed] text-white text-sm font-medium hover:bg-[#6d28d9] transition-colors"
        >
          <Download className="h-4 w-4" /> Download Guide as PDF
        </button>
        <Link href="/"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors">
          <Home className="h-4 w-4" /> Command Center
        </Link>
        <Link href="/pipeline"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors">
          <Kanban className="h-4 w-4" /> Open Pipeline
        </Link>
        <Link href="/ask"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors">
          <Sparkles className="h-4 w-4 text-[#7c3aed]" /> Ask Galent
        </Link>
      </div>

      {/* Live stats banner — expanded */}
      {opps.length > 0 && (
        <div className="space-y-3 animate-flow-in">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: 'Pipeline', value: `$${(totalPipeline / 1e6).toFixed(1)}M`, color: '#7c3aed' },
              { label: 'Revenue (Won)', value: `$${(totalRevenue / 1e6).toFixed(1)}M`, color: '#22c55e' },
              { label: 'Active Deals', value: String(activeDeals.length), color: '#3b82f6' },
              { label: 'Won', value: String(wonDeals.length), color: '#22c55e' },
              { label: 'Accounts', value: String(uniqueAccounts.size), color: '#f59e0b' },
            ].map(stat => (
              <div key={stat.label} className="p-3 rounded-xl g-surface text-center">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{stat.label}</div>
                <div className="text-lg font-bold g-metric" style={{ color: stat.color }}>{stat.value}</div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'EE (Existing-Existing)', value: String(eeCount), color: '#22c55e', desc: 'Renewal / Expansion' },
              { label: 'EN (Existing-New)', value: String(enCount), color: '#3b82f6', desc: 'Cross-sell' },
              { label: 'NN (New-New)', value: String(nnCount), color: '#7c3aed', desc: 'New Business' },
            ].map(stat => (
              <div key={stat.label} className="p-3 rounded-xl g-surface text-center">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{stat.label}</div>
                <div className="text-lg font-bold g-metric" style={{ color: stat.color }}>{stat.value}</div>
                <div className="text-[10px] text-muted-foreground">{stat.desc}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Journey Steps */}
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Sales Lifecycle Journey</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <div className="space-y-4">
          {journeySteps.map((step, i) => (
            <div key={step.title}>
              <JourneyStep
                number={i + 1}
                title={step.title}
                description={step.description}
                features={step.features}
                isActive={activeStep === i}
                onToggle={() => setActiveStep(activeStep === i ? -1 : i)}
              />
              {i < journeySteps.length - 1 && (
                <div className="ml-5 h-6 border-l-2 border-dashed border-border" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Sales SOP Section */}
      <div className="space-y-5">
        <div className="flex items-center gap-2">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Sales Process SOP</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <div className="p-5 rounded-xl g-surface g-elevated">
          <div className="flex items-center gap-3 mb-1">
            <ClipboardList className="h-5 w-5 text-[#7c3aed]" />
            <div>
              <div className="text-sm font-semibold text-foreground font-display">Standard Operating Procedure</div>
              <p className="text-xs text-muted-foreground">Galent IT Services & Staffing — 6-stage sales process with gate criteria</p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {sopStages.map((stage) => (
            <SOPStageCard
              key={stage.number}
              stage={stage}
              isOpen={activeSOP === stage.number}
              onToggle={() => setActiveSOP(activeSOP === stage.number ? -1 : stage.number)}
            />
          ))}
        </div>

        {/* SOP Flow Diagram */}
        <div className="p-4 rounded-xl g-surface text-center">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-3">Process Flow</div>
          <div className="flex items-center justify-center gap-1 flex-wrap text-xs font-medium">
            {sopStages.map((stage, i) => (
              <div key={stage.number} className="flex items-center gap-1">
                <span className="px-3 py-1.5 rounded-lg text-white text-[11px]" style={{ backgroundColor: stage.color }}>
                  {stage.title}
                </span>
                {i < sopStages.length - 1 && (
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Platform capabilities summary */}
      <div className="p-5 rounded-xl g-surface g-elevated">
        <div className="text-sm font-semibold text-foreground mb-3 font-display">Platform Capabilities</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          {[
            { label: '41 Routes', desc: 'Full-featured pages' },
            { label: '13 AI Agents', desc: 'Claude-powered' },
            { label: '22+ tRPC Routers', desc: 'Type-safe API' },
            { label: '8 Deal Tabs', desc: 'Single source of truth' },
            { label: 'MCP Server', desc: '15 tools + agents' },
            { label: '6 Pipeline Views', desc: 'Board/Table/Calendar...' },
            { label: '5 Plugins', desc: 'Outlook/Teams/Voice/SF/SP' },
            { label: '6 Workflows', desc: 'Multi-agent coordination' },
          ].map(cap => (
            <div key={cap.label} className="flex items-center gap-2">
              <CircleCheck className="h-3.5 w-3.5 text-[var(--g-green)] shrink-0" />
              <div>
                <span className="font-medium text-foreground">{cap.label}</span>
                <span className="text-muted-foreground ml-1">— {cap.desc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
