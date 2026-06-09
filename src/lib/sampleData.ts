import { Opportunity } from './types';
import { addDays, subDays } from 'date-fns';

const now = new Date();

export const sampleOpportunities: Opportunity[] = [
  {
    id: "OPP-2025-0001",
    customerName: "Acme Healthcare",
    opportunityName: "Enterprise AI Testing Platform",
    status: "Qualification",
    tcv: 850000,
    dealDuration: "18 months",
    expectedCloseDate: addDays(now, 45).toISOString(),
    startDate: subDays(now, 10).toISOString(),
    primaryOwner: "Sreeram",
    salesPOCs: ["Michael Chen", "Sarah Williams"],
    presalesPOCs: ["Sreeram", "Priya Patel"],
    customerStakeholders: [
      {
        id: "stake-1",
        name: "Dr. Robert Martinez",
        title: "Chief Technology Officer",
        linkedInUrl: "https://linkedin.com/in/robertmartinez",
        email: "r.martinez@acmehealthcare.com",
        phone: "+1-555-0199",
        isPrimaryContact: true,
        isDecisionMaker: true,
        notes: "Strong technical leader, wants to see POC first"
      },
      {
        id: "stake-2",
        name: "Lisa Chen",
        title: "VP of Engineering",
        linkedInUrl: "https://linkedin.com/in/lisachen",
        email: "l.chen@acmehealthcare.com",
        isPrimaryContact: false,
        isDecisionMaker: true,
        notes: "Focused on team productivity and ROI"
      }
    ],
    resourceLinks: [
      {
        id: "res-1",
        title: "SharePoint - Requirements Doc",
        url: "https://sharepoint.com/docs/requirements",
        type: "file",
        addedBy: "Sreeram",
        addedAt: subDays(now, 5).toISOString()
      },
      {
        id: "res-2",
        title: "Teams Channel - Acme Corp",
        url: "https://teams.microsoft.com/l/channel/acme-corp",
        type: "folder",
        addedBy: "Sreeram",
        addedAt: subDays(now, 8).toISOString()
      }
    ],
    subTasks: [
      {
        id: "task-1",
        name: "Conduct technical deep-dive session",
        owner: "Sreeram",
        dueDate: subDays(now, 2).toISOString(),
        status: "complete",
        priority: "High",
        notes: "Completed - went very well"
      },
      {
        id: "task-2",
        name: "Prepare ROI analysis for Lisa",
        owner: "Priya Patel",
        dueDate: addDays(now, 5).toISOString(),
        status: "pending",
        priority: "High",
        notes: "Need to get their current QA metrics"
      }
    ],
    conversationLog: `📞 CALL | ${subDays(now, 5).toISOString()} | 60 min
Attendees: Dr. Robert Martinez (CTO), Lisa Chen (VP Eng), Sreeram (GalentAI)

Discussion:
Initial discovery call went very well. Robert is impressed with our AI-driven approach to test automation. They're currently spending $1.2M annually on manual testing with offshore team. Average bug escape rate is 15% which is causing production issues.

Key Requirements:
- Integration with existing Jira and Jenkins setup
- Support for their microservices architecture (50+ services)
- Need SOC 2 and HIPAA compliance
- Want 90-day POC with 2 development teams

Budget & Timeline:
Budget approved for Q1 2026. Looking to start POC in January. Decision by mid-December to align with budget cycle.

Concerns:
- Lisa worried about learning curve for existing QA team
- Robert wants to see customer references in healthcare vertical

Next Steps:
- [Sreeram] Send 3 healthcare customer references by Dec 8th
- [Sreeram] Prepare technical integration document by Dec 10th`,
    industry: "Healthcare",
    region: "North America",
    clientType: "Existing",
    opportunityType: "New Deal",
    source: "Inbound",
    customTags: ["AI", "Enterprise", "High Value"],
    createdAt: subDays(now, 10).toISOString(),
    updatedAt: subDays(now, 1).toISOString(),
    activityLog: [
      {
        timestamp: subDays(now, 10).toISOString(),
        action: "Opportunity created",
        user: "Sreeram"
      },
      {
        timestamp: subDays(now, 5).toISOString(),
        action: "Status changed from Discovery to Qualification",
        user: "Sreeram"
      }
    ]
  },
  {
    id: "OPP-2025-0002",
    customerName: "Global FinTech Solutions",
    opportunityName: "Cloud Migration Strategy",
    status: "Proposal",
    tcv: 1200000,
    dealDuration: "2 years",
    expectedCloseDate: addDays(now, 20).toISOString(),
    startDate: subDays(now, 25).toISOString(),
    primaryOwner: "Alex Kumar",
    salesPOCs: ["David Ross"],
    presalesPOCs: ["Alex Kumar", "Sarah Jenkins"],
    customerStakeholders: [
      {
        id: "stake-3",
        name: "James Wilson",
        title: "VP of Infrastructure",
        linkedInUrl: "https://linkedin.com/in/jwilson",
        isPrimaryContact: true,
        isDecisionMaker: true,
        notes: "Very detailed oriented"
      }
    ],
    subTasks: [
      {
        id: "task-3",
        name: "Submit final proposal",
        owner: "Alex Kumar",
        dueDate: addDays(now, 2).toISOString(),
        status: "pending",
        priority: "Critical",
        notes: "Pending legal review"
      }
    ],
    resourceLinks: [],
    conversationLog: "Proposal draft currently under review by legal team.",
    industry: "Financial Services",
    region: "Europe",
    clientType: "New",
    opportunityType: "New Deal",
    source: "Partner",
    customTags: ["Cloud", "Migration"],
    createdAt: subDays(now, 25).toISOString(),
    updatedAt: subDays(now, 1).toISOString(),
    activityLog: []
  },
  {
    id: "OPP-2025-0003",
    customerName: "TechFlow Inc",
    opportunityName: "DevOps Automation",
    status: "Discovery",
    tcv: 150000,
    dealDuration: "1 year",
    expectedCloseDate: addDays(now, 60).toISOString(),
    startDate: subDays(now, 2).toISOString(),
    primaryOwner: "Priya Patel",
    salesPOCs: ["Sarah Williams"],
    presalesPOCs: ["Priya Patel"],
    customerStakeholders: [],
    subTasks: [],
    resourceLinks: [],
    conversationLog: "Initial contact made via LinkedIn.",
    industry: "Technology",
    region: "North America",
    clientType: "New",
    opportunityType: "New Deal",
    source: "Cold Outreach",
    customTags: ["DevOps"],
    createdAt: subDays(now, 2).toISOString(),
    updatedAt: subDays(now, 2).toISOString(),
    activityLog: []
  },
  {
    id: "OPP-2025-0004",
    customerName: "MediCare Systems",
    opportunityName: "Patient Data Analytics",
    status: "Negotiation",
    tcv: 450000,
    dealDuration: "1 year",
    expectedCloseDate: addDays(now, 10).toISOString(),
    startDate: subDays(now, 40).toISOString(),
    primaryOwner: "Sreeram",
    salesPOCs: ["Michael Chen"],
    presalesPOCs: ["Sreeram"],
    customerStakeholders: [
      {
        id: "stake-4",
        name: "Sarah Connors",
        title: "CIO",
        isPrimaryContact: true,
        isDecisionMaker: true,
        notes: "Pushing for lower price"
      }
    ],
    subTasks: [],
    resourceLinks: [],
    conversationLog: "Negotiating final discount terms. They want 15% off.",
    industry: "Healthcare",
    region: "North America",
    clientType: "Existing",
    opportunityType: "Renewal",
    source: "Referral",
    customTags: ["Analytics"],
    createdAt: subDays(now, 40).toISOString(),
    updatedAt: subDays(now, 1).toISOString(),
    activityLog: []
  },
  {
    id: "OPP-2025-0005",
    customerName: "Retail Giants Co",
    opportunityName: "POS Modernization",
    status: "Won",
    tcv: 2000000,
    dealDuration: "3 years",
    expectedCloseDate: subDays(now, 5).toISOString(),
    startDate: subDays(now, 60).toISOString(),
    primaryOwner: "Alex Kumar",
    salesPOCs: ["David Ross"],
    presalesPOCs: ["Alex Kumar"],
    customerStakeholders: [],
    subTasks: [],
    resourceLinks: [],
    conversationLog: "Deal won! Signed contract received.",
    industry: "Retail",
    region: "APAC",
    clientType: "Existing",
    opportunityType: "Upsell",
    source: "Event",
    customTags: ["Modernization", "Big Deal"],
    createdAt: subDays(now, 60).toISOString(),
    updatedAt: subDays(now, 5).toISOString(),
    activityLog: []
  },
  {
    id: "OPP-2025-0006",
    customerName: "Legal Eagles LLP",
    opportunityName: "Document Management System",
    status: "Lost",
    tcv: 75000,
    dealDuration: "1 year",
    expectedCloseDate: subDays(now, 10).toISOString(),
    startDate: subDays(now, 30).toISOString(),
    primaryOwner: "Priya Patel",
    salesPOCs: ["Sarah Williams"],
    presalesPOCs: ["Priya Patel"],
    customerStakeholders: [],
    subTasks: [],
    resourceLinks: [],
    conversationLog: "Lost to competitor due to pricing.",
    industry: "Professional Services",
    region: "Europe",
    clientType: "New",
    opportunityType: "New Deal",
    source: "Inbound",
    customTags: ["DMS"],
    createdAt: subDays(now, 30).toISOString(),
    updatedAt: subDays(now, 10).toISOString(),
    activityLog: []
  },
  {
    id: "OPP-2025-0007",
    customerName: "AutoWorks Manufacturing",
    opportunityName: "IoT Fleet Management",
    status: "Discovery",
    tcv: 600000,
    dealDuration: "2 years",
    expectedCloseDate: addDays(now, 90).toISOString(),
    startDate: subDays(now, 1).toISOString(),
    primaryOwner: "Sreeram",
    salesPOCs: ["Michael Chen"],
    presalesPOCs: ["Sreeram"],
    customerStakeholders: [],
    subTasks: [],
    resourceLinks: [],
    conversationLog: "Scheduled demo for next week.",
    industry: "Manufacturing",
    region: "Latin America",
    clientType: "New",
    opportunityType: "New Deal",
    source: "Cold Outreach",
    customTags: ["IoT"],
    createdAt: subDays(now, 1).toISOString(),
    updatedAt: subDays(now, 1).toISOString(),
    activityLog: []
  },
  {
    id: "OPP-2025-0008",
    customerName: "EduLearn Systems",
    opportunityName: "LMS Upgrade",
    status: "On Hold",
    tcv: 250000,
    dealDuration: "1 year",
    expectedCloseDate: addDays(now, 120).toISOString(),
    startDate: subDays(now, 15).toISOString(),
    primaryOwner: "Alex Kumar",
    salesPOCs: ["David Ross"],
    presalesPOCs: ["Alex Kumar"],
    customerStakeholders: [],
    subTasks: [],
    resourceLinks: [],
    conversationLog: "Project on hold due to budget freeze.",
    industry: "Other",
    region: "North America",
    clientType: "Existing",
    opportunityType: "Enhancement",
    source: "Inbound",
    customTags: ["Education"],
    createdAt: subDays(now, 15).toISOString(),
    updatedAt: subDays(now, 2).toISOString(),
    activityLog: []
  },
  {
    id: "OPP-2025-0009",
    customerName: "Hospitality Plus",
    opportunityName: "Booking Engine Revamp",
    status: "Qualification",
    tcv: 350000,
    dealDuration: "6 months",
    expectedCloseDate: addDays(now, 30).toISOString(),
    startDate: subDays(now, 8).toISOString(),
    primaryOwner: "Priya Patel",
    salesPOCs: ["Sarah Williams"],
    presalesPOCs: ["Priya Patel"],
    customerStakeholders: [],
    subTasks: [],
    resourceLinks: [],
    conversationLog: "Waiting for technical requirements doc.",
    industry: "Hospitality",
    region: "Middle East",
    clientType: "New",
    opportunityType: "New Deal",
    source: "Referral",
    customTags: ["Web"],
    createdAt: subDays(now, 8).toISOString(),
    updatedAt: subDays(now, 1).toISOString(),
    activityLog: []
  },
  {
    id: "OPP-2025-0010",
    customerName: "Future Energy",
    opportunityName: "Grid Optimization AI",
    status: "Proposal",
    tcv: 1800000,
    dealDuration: "3 years",
    expectedCloseDate: addDays(now, 25).toISOString(),
    startDate: subDays(now, 20).toISOString(),
    primaryOwner: "Sreeram",
    salesPOCs: ["Michael Chen"],
    presalesPOCs: ["Sreeram", "Alex Kumar"],
    customerStakeholders: [],
    subTasks: [],
    resourceLinks: [],
    conversationLog: "Presenting to board next Tuesday.",
    industry: "Manufacturing",
    region: "Europe",
    clientType: "Existing",
    opportunityType: "Cross-sell",
    source: "Event",
    customTags: ["AI", "Energy"],
    createdAt: subDays(now, 20).toISOString(),
    updatedAt: subDays(now, 1).toISOString(),
    activityLog: []
  }
];
