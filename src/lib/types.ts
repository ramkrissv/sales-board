export type Status = 
  | 'Discovery' 
  | 'Qualification' 
  | 'Proposal' 
  | 'Negotiation' 
  | 'Won' 
  | 'Lost' 
  | 'On Hold';

export type Priority = 'Low' | 'Medium' | 'High' | 'Critical';

export type Industry = 
  | 'Healthcare' 
  | 'Financial Services' 
  | 'Hospitality' 
  | 'Professional Services' 
  | 'Manufacturing' 
  | 'Retail' 
  | 'Technology' 
  | 'Other';

export type Region = 'North America' | 'Europe' | 'APAC' | 'Latin America' | 'Middle East';

export type ServiceLine = 'Legacy Modernization' | 'Data & AI' | 'Testing & QA' | 'Managed Services / SRE' | 'Cloud & Infrastructure' | 'Staffing';
export type BillingModel = 'Fixed Price' | 'T&M' | 'Product Licensing' | 'Outcome-Based' | 'Time & Material' | 'Retainer' | 'Milestone-based';

export type ClientType = 'New' | 'Existing';
export type OpportunityType = 'New Deal' | 'Upsell' | 'Cross-sell' | 'Renewal' | 'Enhancement';

// Deal classification: EE = Existing-Existing, EN = Existing-New, NN = New-New
export type DealClassification = 'EE' | 'EN' | 'NN';
// EE: Existing client, existing service line (renewal/expansion)
// EN: Existing client, new service line (cross-sell)
// NN: New client, new engagement (net new business)

export interface Stakeholder {
  id: string;
  name: string;
  title: string;
  linkedInUrl?: string;
  email?: string;
  phone?: string;
  isPrimaryContact: boolean;
  isDecisionMaker: boolean;
  notes?: string;
}

export interface Task {
  id: string;
  name: string;
  owner: string;
  dueDate: string; // ISO Date string
  status: 'pending' | 'complete';
  priority: Priority;
  notes?: string;
}

export interface LogEntry {
  timestamp: string;
  action: string;
  user?: string;
}

export interface ResourceLink {
  id: string;
  title: string;
  url: string;
  type: 'file' | 'folder' | 'link';
  addedBy: string;
  addedAt: string;
}

export interface Opportunity {
  id: string;
  customerName: string;
  opportunityName: string;
  status: Status;
  tcv: number;
  dealDuration: string;
  expectedCloseDate: string; // ISO Date string
  startDate: string; // ISO Date string
  primaryOwner: string;
  salesPOCs: string[];
  presalesPOCs: string[];
  customerStakeholders: Stakeholder[];
  subTasks: Task[];
  resourceLinks: ResourceLink[];
  conversationLog: string;
  industry: Industry;
  region: Region;
  serviceLine?: ServiceLine;
  clientType?: ClientType;
  opportunityType?: OpportunityType;
  billingModel?: BillingModel;
  margin?: number;
  source: string;
  customTags: string[];
  engagementType?: string;
  pricingModel?: string;
  workshopId?: string;
  forecastCategory?: 'commit' | 'best_case' | 'pipeline' | 'omitted';
  createdAt: string;
  updatedAt: string;
  createdBy?: string | null;
  updatedBy?: string | null;
  activityLog: LogEntry[];
}

export interface AppSettings {
  defaultView: 'kanban' | 'timeline' | 'table' | 'dashboard';
  theme: 'light' | 'dark' | 'system';
}

export interface AppState {
  opportunities: Opportunity[];
  settings: AppSettings;
}
