# Galent Sales Pipeline Tracker
## Requirements & Design Document

**Version:** 1.0 (Near Final)  
**Last Updated:** January 12, 2026

---

## 1. Executive Summary

The Galent Sales Pipeline Tracker is a comprehensive sales opportunity management application designed for tracking deals through various pipeline stages. It features multiple views for visualizing opportunities, detailed opportunity management, and analytics dashboards.

---

## 2. Brand Identity

### Color Scheme
- **Primary (Purple):** `#7c3aed` - Used for primary actions, headers, and branding
- **Secondary (Green):** `#00dc82` - Used for success states, accents, and highlights
- **Background:** Slate-based neutral palette for professional appearance

### Typography
- Clean, modern sans-serif fonts
- Hierarchical typography with clear distinction between headings and body text

---

## 3. Core Features

### 3.1 Opportunity Management

#### Data Model - Opportunity
| Field | Type | Description |
|-------|------|-------------|
| id | string | Unique identifier (auto-generated) |
| customerName | string | Client/customer company name |
| opportunityName | string | Name/title of the opportunity |
| status | Status | Pipeline stage (Discovery, Qualification, Proposal, Negotiation, Won, Lost, On Hold) |
| tcv | number | Total Contract Value in USD |
| dealDuration | string | Contract duration (3 months, 6 months, 1 year, 2 years, 3+ years) |
| startDate | string (ISO) | Project/contract start date |
| expectedCloseDate | string (ISO) | Expected deal close date |
| primaryOwner | string | Primary sales owner |
| salesPOCs | string[] | Sales points of contact |
| presalesPOCs | string[] | Presales points of contact |
| customerStakeholders | Stakeholder[] | Customer contacts/decision makers |
| subTasks | Task[] | Associated tasks and action items |
| resourceLinks | ResourceLink[] | Links to documents, folders, files |
| conversationLog | string | Free-text conversation/notes log |
| industry | Industry | Customer industry vertical |
| region | Region | Geographic region |
| serviceLine | ServiceLine | IT Services or Staffing |
| clientType | ClientType | New or Existing client |
| opportunityType | OpportunityType | New Deal, Upsell, Cross-sell, Renewal, Enhancement |
| billingModel | BillingModel | Time & Material, Fixed Price, Retainer, Milestone-based |
| margin | number | Deal margin percentage (0-100) |
| source | string | Lead source |
| customTags | string[] | Custom tags for categorization |
| createdAt | string (ISO) | Creation timestamp |
| updatedAt | string (ISO) | Last update timestamp |
| activityLog | LogEntry[] | Activity audit trail |

#### Enumerations
- **Status:** Discovery, Qualification, Proposal, Negotiation, Won, Lost, On Hold
- **Industry:** Healthcare, Financial Services, Technology, Manufacturing, Retail, Professional Services, Hospitality, Other
- **Region:** North America, Europe, APAC, Latin America, Middle East
- **ServiceLine:** IT Services, Staffing
- **ClientType:** New, Existing
- **OpportunityType:** New Deal, Upsell, Cross-sell, Renewal, Enhancement
- **BillingModel:** Time & Material, Fixed Price, Retainer, Milestone-based

### 3.2 Customer Stakeholders

#### Stakeholder Data Model
| Field | Type | Description |
|-------|------|-------------|
| id | string | Unique identifier |
| name | string | Contact name |
| title | string | Job title |
| email | string | Email address |
| phone | string | Phone number |
| linkedInUrl | string | LinkedIn profile URL |
| isPrimaryContact | boolean | Primary contact flag |
| isDecisionMaker | boolean | Decision maker flag |
| notes | string | Additional notes |

### 3.3 Sub-Tasks

#### Task Data Model
| Field | Type | Description |
|-------|------|-------------|
| id | string | Unique identifier |
| title | string | Task title |
| description | string | Task description |
| status | TaskStatus | pending, in_progress, complete |
| priority | Priority | low, medium, high |
| dueDate | string (ISO) | Task due date |
| assignee | string | Assigned team member |

### 3.4 Resource Links

#### ResourceLink Data Model
| Field | Type | Description |
|-------|------|-------------|
| id | string | Unique identifier |
| title | string | Link title |
| url | string | URL to resource |
| type | LinkType | file, folder, link |
| addedBy | string | User who added the link |
| addedAt | string (ISO) | When link was added |

---

## 4. Views & Navigation

### 4.1 Main Navigation
Located in the left sidebar:
- **Pipeline (Kanban)** - Default view, drag-and-drop board
- **Timeline** - Gantt-style timeline view
- **Schedule Board** - Time-bucket based scheduling
- **Table** - Spreadsheet-style data table
- **Dashboard** - Analytics and charts
- **Tasks** - Consolidated task management
- **Stakeholders** - Contact management

### 4.2 Kanban Board View
**Purpose:** Visual pipeline management with drag-and-drop

**Features:**
- 7 columns representing pipeline stages
- Drag-and-drop to change opportunity status
- Opportunity cards display:
  - Customer name
  - Opportunity name
  - Service Line badge (ITS/STF)
  - TCV value
  - Deal Margin %
  - Expected close date
  - Deal duration
  - Billing model abbreviation (T&M, FP, MB, RET)
  - Task completion count
  - Stakeholder count
  - Primary owner avatar

**Filtering:**
- Search by customer/opportunity name
- Filter by status, owner, region, industry

### 4.3 Timeline View
**Purpose:** Temporal visualization of opportunities

**Features:**
- Month-by-month view
- Opportunities displayed as timeline bars
- Click to open opportunity details

### 4.4 Schedule Board View
**Purpose:** Time-based task and opportunity scheduling

**Time Buckets:**
- Late (overdue items)
- Today
- Tomorrow
- This Week
- Next Week
- Future
- No Date

**Features:**
- Drag-and-drop between time buckets
- Automatic date updates based on bucket
- Displays both opportunities and tasks

### 4.5 Table View
**Purpose:** Data-centric spreadsheet view

**Columns:**
- Opportunity Name
- Customer
- Status
- Value (TCV)
- Margin %
- Service Line
- Owner
- Tasks (completed/total)
- Expected Close

**Features:**
- CSV Export with all fields including:
  - ID, Customer Name, Opportunity Name, Status
  - TCV, Deal Duration, Primary Owner
  - Expected Close Date, Tasks Complete, Start Date
  - Industry, Region, Service Line
  - Billing Model, Margin %, Source
- Click row to open details
- Actions dropdown (Copy ID, View, Delete)

### 4.6 Dashboard View
**Purpose:** Analytics and reporting

**Metrics Cards:**
- Total Pipeline Value
- Active Deals Count
- Win Rate %
- Average Deal Size

**Visualizations:**
- **Sales Funnel (By Deal Count):** Stacked bar chart showing opportunity distribution by stage
- **Sales Funnel (By TCV):** Stacked bar chart showing value distribution by stage
- Both charts use centered, horizontal bar layout

### 4.7 Tasks View
**Purpose:** Consolidated task management across all opportunities

**Features:**
- All tasks from all opportunities in one view
- Grouped by status
- Click to navigate to parent opportunity

### 4.8 Stakeholders View
**Purpose:** Contact management across opportunities

**Features:**
- All stakeholders from all opportunities
- Search and filter capabilities
- Decision maker and primary contact indicators

---

## 5. Modals & Forms

### 5.1 Create Opportunity Modal

**Tabs:**
1. **Basic Info & Team**
   - Customer Name*
   - Opportunity Name*
   - Industry
   - Service Line (IT Services/Staffing)
   - Region
   - Client Type
   - Opportunity Type
   - Sales POCs (multi-tag input)
   - Presales POCs (multi-tag input)
   - Primary Owner* (combobox with POC suggestions)
   - Lead Source

2. **Financial Details**
   - TCV (Total Contract Value)
   - Deal Margin %
   - Billing Model
   - Deal Duration
   - Expected Close Date
   - Start Date

### 5.2 Edit Opportunity Modal

**Tabs:**
1. **Basic Info & Team** - Same fields as create, with edit mode toggle
2. **Financial Details** - Financial fields with edit mode
3. **Stakeholders** - Add/edit/delete customer contacts
4. **Sub-Tasks** - Add/edit/delete tasks
5. **Resources** - Add/delete document links
6. **Log** - Conversation log with templates (Email, Call, Note)
7. **Activity** - Read-only activity audit trail

### 5.3 Stakeholder Modal
- Name, Title, Email, Phone
- LinkedIn URL
- Primary Contact toggle
- Decision Maker toggle
- Notes

### 5.4 Task Modal
- Title, Description
- Status, Priority
- Due Date, Assignee

---

## 6. Technical Implementation

### 6.1 Technology Stack
- **Framework:** React 18+ with TypeScript
- **Routing:** Wouter
- **Styling:** Tailwind CSS with custom theme
- **UI Components:** Shadcn/UI (Radix primitives)
- **Drag & Drop:** @dnd-kit/core, @dnd-kit/sortable
- **Charts:** Recharts
- **Icons:** Lucide React
- **Forms:** React Hook Form with Zod validation
- **Date Handling:** date-fns
- **State Management:** React Context + localStorage persistence

### 6.2 Data Persistence
- All data stored in browser localStorage
- Automatic save on every change
- Persists across sessions

### 6.3 Component Architecture
```
client/src/
├── components/
│   ├── kanban/
│   │   ├── KanbanBoard.tsx
│   │   ├── KanbanColumn.tsx
│   │   └── KanbanCard.tsx
│   ├── layout/
│   │   ├── Layout.tsx
│   │   ├── Sidebar.tsx
│   │   └── Header.tsx
│   ├── modals/
│   │   ├── CreateOpportunityModal.tsx
│   │   ├── OpportunityModal.tsx
│   │   ├── StakeholderModal.tsx
│   │   └── TaskModal.tsx
│   ├── shared/
│   │   └── StatusBadge.tsx
│   ├── ui/
│   │   ├── (Shadcn components)
│   │   ├── multi-tag-input.tsx
│   │   └── combobox-custom.tsx
│   └── views/
│       ├── DashboardView.tsx
│       ├── TableView.tsx
│       ├── TimelineView.tsx
│       ├── TimeBoardView.tsx
│       ├── TasksView.tsx
│       └── StakeholdersView.tsx
├── lib/
│   ├── types.ts (Data models)
│   ├── store.tsx (Context + persistence)
│   └── utils.ts (Utilities)
└── App.tsx (Router)
```

---

## 7. User Interactions

### 7.1 Drag & Drop
- **Kanban Board:** Drag opportunities between status columns
- **Schedule Board:** Drag items between time buckets

### 7.2 Inline Editing
- Edit mode toggle in opportunity modal
- Save/Discard actions

### 7.3 Quick Actions
- Add opportunity via header button
- Delete via dropdown menus
- Copy ID to clipboard

---

## 8. Responsive Design

- Mobile-first approach
- Collapsible sidebar on smaller screens
- Horizontal scroll for Kanban on mobile
- Stack forms on mobile
- Touch-friendly drag handles

---

## 9. Future Enhancements (Backlog)

- [ ] Tag editing in opportunity details
- [ ] Advanced filtering and saved views
- [ ] Bulk actions in table view
- [ ] Email/calendar integrations
- [ ] Team collaboration features
- [ ] Reporting and export to PDF
- [ ] Notifications and reminders
- [ ] API backend integration
- [ ] User authentication
- [ ] Role-based permissions

---

## 10. Glossary

| Term | Definition |
|------|------------|
| TCV | Total Contract Value - Full value of the deal |
| POC | Point of Contact |
| T&M | Time & Material billing model |
| FP | Fixed Price billing model |
| MB | Milestone-based billing model |
| RET | Retainer billing model |
| ITS | IT Services (service line) |
| STF | Staffing (service line) |

---

*Document maintained by Galent Development Team*
