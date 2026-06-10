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

export type ServiceLine = 'IT Services' | 'Staffing';
export type BillingModel = 'Time & Material' | 'Fixed Price' | 'Retainer' | 'Milestone-based';

export type ClientType = 'New' | 'Existing';
export type OpportunityType = 'New Deal' | 'Upsell' | 'Cross-sell' | 'Renewal' | 'Enhancement';

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
