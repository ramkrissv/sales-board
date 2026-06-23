/**
 * Seed multiple workshop templates for different engagement types.
 * Each template has domain-specific levels, dimensions, and workstreams.
 */
import { connectDB } from './connection';
import mongoose from 'mongoose';

const SCALE = {
  name: 'Maturity 0-4',
  points: [
    { value: 0, label: 'Absent', description: 'Not present or undefined' },
    { value: 1, label: 'Ad hoc', description: 'Informal, inconsistent, person-dependent' },
    { value: 2, label: 'Repeatable', description: 'Defined and used, but not consistently governed' },
    { value: 3, label: 'Governed', description: 'Standardized, owned, measured, and governed' },
    { value: 4, label: 'Optimized', description: 'Continuously improved, automated, benchmarked' },
  ],
};

const TEMPLATES = [
  {
    id: 'tpl-modernization',
    name: 'Application Modernization Assessment',
    description: 'Assess legacy systems, cloud readiness, migration strategy, and team capabilities for modernization engagements.',
    framework: {
      name: 'Modernization Assessment', version: 1, scoringScale: SCALE,
      levels: [
        { id: 'L1', name: 'Business & Strategy', weight: 0.25, order: 0, summary: 'Business drivers, ROI model, and stakeholder alignment for modernization.', sections: [], dimensions: [
          { id: '1.1', name: 'Modernization Business Case', probe: 'Is there a quantified business case for modernization — cost savings, agility, risk reduction — or is it an IT initiative?', workstreamCode: 'WS1', order: 0 },
          { id: '1.2', name: 'Application Portfolio Analysis', probe: 'Have applications been classified (retain/retire/refactor/replatform/rebuild) with clear criteria?', workstreamCode: 'WS1', order: 1 },
          { id: '1.3', name: 'Stakeholder & Change Readiness', probe: 'Are business owners aligned on the disruption, or is modernization seen as "IT plumbing"?', workstreamCode: 'WS4', order: 2 },
        ]},
        { id: 'L2', name: 'Architecture & Platform', weight: 0.40, order: 1, summary: 'Current architecture, target platform, migration patterns, and technical debt.', sections: [], dimensions: [
          { id: '2.1', name: 'Current Architecture Documentation', probe: 'Is the existing architecture documented (dependencies, APIs, data flows) or tribal knowledge?', workstreamCode: 'WS1', order: 0 },
          { id: '2.2', name: 'Technical Debt & Code Quality', probe: 'Is technical debt quantified? Are there automated quality gates, test coverage, static analysis?', workstreamCode: 'WS2', order: 1 },
          { id: '2.3', name: 'Cloud Readiness / Landing Zone', probe: 'Is the target cloud environment (landing zone, networking, IAM, cost controls) production-ready?', workstreamCode: 'WS3', order: 2 },
          { id: '2.4', name: 'Containerization & Orchestration', probe: 'Are applications containerized? Is there a Kubernetes/ECS strategy, or bare-metal/VM-only?', workstreamCode: 'WS2', order: 3 },
          { id: '2.5', name: 'Data Migration Strategy', probe: 'Is there a data migration plan (schema mapping, ETL, validation, rollback) or ad hoc migration?', workstreamCode: 'WS3', order: 4 },
          { id: '2.6', name: 'CI/CD & Deployment Pipeline', probe: 'Is there a modern CI/CD pipeline (automated build, test, deploy) or manual releases?', workstreamCode: 'WS2', order: 5 },
          { id: '2.7', name: 'API Strategy & Integration', probe: 'Is there an API-first approach with versioning, documentation, and gateway — or point-to-point?', workstreamCode: 'WS3', order: 6 },
          { id: '2.8', name: 'Observability & SRE', probe: 'Is there centralized logging, tracing, monitoring, and alerting — or reactive firefighting?', workstreamCode: 'WS2', order: 7 },
        ]},
        { id: 'L3', name: 'Team & Delivery', weight: 0.35, order: 2, summary: 'Team skills, delivery process, testing maturity, and operational readiness.', sections: [], dimensions: [
          { id: '3.1', name: 'Team Skills & Cloud Competency', probe: 'Does the team have cloud-native skills (containers, IaC, 12-factor) or needs upskilling?', workstreamCode: 'WS4', order: 0 },
          { id: '3.2', name: 'Testing & Quality Assurance', probe: 'Is there automated testing (unit, integration, E2E, performance) or manual QA only?', workstreamCode: 'WS2', order: 1 },
          { id: '3.3', name: 'DevOps & Release Management', probe: 'Is there a DevOps culture with IaC, gitops, feature flags — or ops-separate-from-dev?', workstreamCode: 'WS2', order: 2 },
          { id: '3.4', name: 'Security & Compliance', probe: 'Is security baked into the pipeline (SAST, DAST, secrets management) or bolt-on?', workstreamCode: 'WS5', order: 3 },
          { id: '3.5', name: 'Operational Runbook & DR', probe: 'Are there runbooks, disaster recovery plans, and tested failover — or hope-based resilience?', workstreamCode: 'WS5', order: 4 },
        ]},
      ],
      workstreams: [
        { code: 'WS1', name: 'Current-State & Portfolio Assessment', objective: 'Document existing architecture and classify applications for modernization path.', order: 0 },
        { code: 'WS2', name: 'Target Architecture & Platform', objective: 'Design the target cloud-native platform with CI/CD, containers, and observability.', order: 1 },
        { code: 'WS3', name: 'Migration Strategy & Execution', objective: 'Plan and execute the migration (data, applications, integrations) in phases.', order: 2 },
        { code: 'WS4', name: 'Team Enablement & Change', objective: 'Upskill teams, establish DevOps culture, and manage organizational change.', order: 3 },
        { code: 'WS5', name: 'Security, Compliance & Operations', objective: 'Embed security in the pipeline and establish operational excellence.', order: 4 },
      ],
    },
  },
  {
    id: 'tpl-engineering',
    name: 'Engineering Maturity Assessment',
    description: 'Assess SDLC maturity, DevOps practices, testing, delivery velocity, and engineering culture.',
    framework: {
      name: 'Engineering Maturity', version: 1, scoringScale: SCALE,
      levels: [
        { id: 'L1', name: 'Engineering Culture & Process', weight: 0.30, order: 0, summary: 'SDLC, agile maturity, delivery velocity, and engineering practices.', sections: [], dimensions: [
          { id: '1.1', name: 'Agile / SDLC Maturity', probe: 'Is there a consistent, measured SDLC (sprint velocity, cycle time, WIP) or ad hoc delivery?', workstreamCode: 'WS1', order: 0 },
          { id: '1.2', name: 'Engineering Standards & Code Review', probe: 'Are there coding standards, mandatory PR reviews, and architectural decision records?', workstreamCode: 'WS1', order: 1 },
          { id: '1.3', name: 'Technical Debt Management', probe: 'Is tech debt tracked, prioritized, and allocated capacity — or ignored until crisis?', workstreamCode: 'WS2', order: 2 },
          { id: '1.4', name: 'Developer Experience (DX)', probe: 'How long from git clone to running locally? Is the inner dev loop fast and frictionless?', workstreamCode: 'WS1', order: 3 },
        ]},
        { id: 'L2', name: 'DevOps & Infrastructure', weight: 0.40, order: 1, summary: 'CI/CD, infrastructure as code, deployment frequency, and reliability.', sections: [], dimensions: [
          { id: '2.1', name: 'CI/CD Pipeline', probe: 'Is there automated build, test, and deploy — with how much manual intervention?', workstreamCode: 'WS2', order: 0 },
          { id: '2.2', name: 'Infrastructure as Code', probe: 'Is infrastructure fully codified (Terraform/Pulumi/CDK) or click-ops in console?', workstreamCode: 'WS2', order: 1 },
          { id: '2.3', name: 'Deployment Frequency & Lead Time', probe: 'How often do you deploy to production? What is the lead time from commit to live?', workstreamCode: 'WS2', order: 2 },
          { id: '2.4', name: 'Monitoring & Observability', probe: 'Is there structured logging, distributed tracing, metrics dashboards, and alerting?', workstreamCode: 'WS3', order: 3 },
          { id: '2.5', name: 'Incident Management & SRE', probe: 'Is there an incident process (severity levels, on-call, postmortems) or reactive firefighting?', workstreamCode: 'WS3', order: 4 },
        ]},
        { id: 'L3', name: 'Quality & Security', weight: 0.30, order: 2, summary: 'Testing maturity, security practices, and compliance posture.', sections: [], dimensions: [
          { id: '3.1', name: 'Automated Testing', probe: 'What is the test coverage? Are there unit, integration, E2E, and performance tests automated?', workstreamCode: 'WS4', order: 0 },
          { id: '3.2', name: 'Security in the Pipeline', probe: 'Is SAST, DAST, dependency scanning, and secrets management part of CI/CD?', workstreamCode: 'WS4', order: 1 },
          { id: '3.3', name: 'Performance & Scalability', probe: 'Are there load tests, capacity plans, and auto-scaling — or scaling is reactive?', workstreamCode: 'WS3', order: 2 },
          { id: '3.4', name: 'Documentation & Knowledge', probe: 'Is system documentation current, accessible, and maintained — or stale wikis?', workstreamCode: 'WS1', order: 3 },
        ]},
      ],
      workstreams: [
        { code: 'WS1', name: 'Engineering Culture & Standards', objective: 'Establish engineering excellence: standards, review processes, documentation.', order: 0 },
        { code: 'WS2', name: 'DevOps & Platform', objective: 'Build world-class CI/CD, IaC, and deployment automation.', order: 1 },
        { code: 'WS3', name: 'Reliability & Operations', objective: 'Implement SRE practices, monitoring, incident management.', order: 2 },
        { code: 'WS4', name: 'Quality & Security', objective: 'Embed testing and security into the development lifecycle.', order: 3 },
      ],
    },
  },
  {
    id: 'tpl-it-operations',
    name: 'IT Operations Assessment',
    description: 'Assess IT service management, support operations, infrastructure, and automation maturity.',
    framework: {
      name: 'IT Operations Assessment', version: 1, scoringScale: SCALE,
      levels: [
        { id: 'L1', name: 'Service Management', weight: 0.35, order: 0, summary: 'ITSM maturity, ticketing, SLA management, and service catalog.', sections: [], dimensions: [
          { id: '1.1', name: 'ITSM / Service Desk', probe: 'Is there a mature service desk with SLA tracking, escalation paths, and customer satisfaction metrics?', workstreamCode: 'WS1', order: 0 },
          { id: '1.2', name: 'Incident & Problem Management', probe: 'Are incidents classified, root-caused, and problem records created — or just firefighting?', workstreamCode: 'WS1', order: 1 },
          { id: '1.3', name: 'Change & Release Management', probe: 'Is there a change advisory board, impact assessment, and rollback planning?', workstreamCode: 'WS1', order: 2 },
          { id: '1.4', name: 'Service Catalog & Self-Service', probe: 'Can users request services through a catalog with automated fulfillment?', workstreamCode: 'WS2', order: 3 },
        ]},
        { id: 'L2', name: 'Infrastructure & Automation', weight: 0.35, order: 1, summary: 'Infrastructure management, automation, cloud operations, and cost optimization.', sections: [], dimensions: [
          { id: '2.1', name: 'Infrastructure Management', probe: 'Is infrastructure documented, version-controlled, and managed with IaC?', workstreamCode: 'WS2', order: 0 },
          { id: '2.2', name: 'Automation & Orchestration', probe: 'What percentage of operational tasks are automated vs manual? Is there RPA/scripting/workflow?', workstreamCode: 'WS2', order: 1 },
          { id: '2.3', name: 'Cloud Operations & FinOps', probe: 'Is cloud spend optimized with tagging, rightsizing, reserved instances — or unchecked?', workstreamCode: 'WS3', order: 2 },
          { id: '2.4', name: 'Monitoring & Alerting', probe: 'Is monitoring proactive (anomaly detection, predictive) or reactive (alert storms)?', workstreamCode: 'WS3', order: 3 },
        ]},
        { id: 'L3', name: 'People & Governance', weight: 0.30, order: 2, summary: 'Team structure, skills, compliance, and continuous improvement.', sections: [], dimensions: [
          { id: '3.1', name: 'Team Structure & Skills', probe: 'Is the ops team sized, skilled, and structured for current and future workloads?', workstreamCode: 'WS4', order: 0 },
          { id: '3.2', name: 'Knowledge Management', probe: 'Are runbooks, SOPs, and tribal knowledge documented and accessible?', workstreamCode: 'WS4', order: 1 },
          { id: '3.3', name: 'Security & Compliance', probe: 'Are security patches, vulnerability scans, and compliance audits automated and current?', workstreamCode: 'WS3', order: 2 },
          { id: '3.4', name: 'Continuous Improvement', probe: 'Is there a formal improvement process (postmortems, metrics reviews, capacity planning)?', workstreamCode: 'WS4', order: 3 },
        ]},
      ],
      workstreams: [
        { code: 'WS1', name: 'Service Management Excellence', objective: 'Mature ITSM processes, incident management, and change control.', order: 0 },
        { code: 'WS2', name: 'Automation & Self-Service', objective: 'Automate operational tasks and build self-service capabilities.', order: 1 },
        { code: 'WS3', name: 'Infrastructure & Cloud Ops', objective: 'Optimize infrastructure, cloud spend, and monitoring.', order: 2 },
        { code: 'WS4', name: 'People & Knowledge', objective: 'Upskill teams, document knowledge, and drive continuous improvement.', order: 3 },
      ],
    },
  },
  {
    id: 'tpl-data-analytics',
    name: 'Data & Analytics Assessment',
    description: 'Assess data strategy, governance, engineering maturity, analytics capabilities, and AI/ML readiness.',
    framework: {
      name: 'Data & Analytics Assessment', version: 1, scoringScale: SCALE,
      levels: [
        { id: 'L1', name: 'Data Strategy & Governance', weight: 0.30, order: 0, summary: 'Data strategy, governance, quality, and organizational alignment.', sections: [], dimensions: [
          { id: '1.1', name: 'Data Strategy', probe: 'Is there an explicit data strategy tied to business outcomes — or data is an IT concern?', workstreamCode: 'WS1', order: 0 },
          { id: '1.2', name: 'Data Governance & Ownership', probe: 'Are data domains owned, with stewards, quality rules, and lineage tracking?', workstreamCode: 'WS1', order: 1 },
          { id: '1.3', name: 'Data Quality & Observability', probe: 'Is data quality measured, monitored, and remediated — or discovered during incidents?', workstreamCode: 'WS2', order: 2 },
        ]},
        { id: 'L2', name: 'Data Platform & Engineering', weight: 0.40, order: 1, summary: 'Data infrastructure, pipelines, lakehouse, and engineering practices.', sections: [], dimensions: [
          { id: '2.1', name: 'Data Platform / Lakehouse', probe: 'Is there a modern data platform (lakehouse/warehouse) or siloed databases and spreadsheets?', workstreamCode: 'WS2', order: 0 },
          { id: '2.2', name: 'Data Pipelines & ETL', probe: 'Are pipelines orchestrated, tested, and monitored — or fragile cron jobs?', workstreamCode: 'WS2', order: 1 },
          { id: '2.3', name: 'Real-Time & Streaming', probe: 'Is there real-time data capability (Kafka, Kinesis, Flink) or batch-only?', workstreamCode: 'WS2', order: 2 },
          { id: '2.4', name: 'Data Catalog & Discovery', probe: 'Can analysts find and understand data assets through a catalog — or tribal knowledge?', workstreamCode: 'WS1', order: 3 },
        ]},
        { id: 'L3', name: 'Analytics & AI/ML', weight: 0.30, order: 2, summary: 'BI, analytics maturity, ML operations, and AI capabilities.', sections: [], dimensions: [
          { id: '3.1', name: 'BI & Reporting', probe: 'Is there self-service BI with governed metrics — or ad hoc reports from IT?', workstreamCode: 'WS3', order: 0 },
          { id: '3.2', name: 'Advanced Analytics & ML', probe: 'Are ML models in production with MLOps (versioning, monitoring, retraining) or prototypes only?', workstreamCode: 'WS3', order: 1 },
          { id: '3.3', name: 'AI Readiness', probe: 'Is the organization ready for AI agents (data quality, compute, governance, skills)?', workstreamCode: 'WS3', order: 2 },
        ]},
      ],
      workstreams: [
        { code: 'WS1', name: 'Data Strategy & Governance', objective: 'Define data strategy, ownership, and governance framework.', order: 0 },
        { code: 'WS2', name: 'Data Platform & Engineering', objective: 'Build modern data platform with quality, pipelines, and catalog.', order: 1 },
        { code: 'WS3', name: 'Analytics & AI/ML', objective: 'Enable self-service analytics and production ML/AI capabilities.', order: 2 },
      ],
    },
  },
];

export async function seedAllWorkshopTemplates() {
  await connectDB();
  const WT = mongoose.models.WorkshopTemplate ||
    (await import('./models/workshop-template')).WorkshopTemplate;

  // Seed the original AI framework
  const { seedWorkshopTemplate } = await import('./seed-workshop-template');
  await seedWorkshopTemplate();

  // Seed additional templates
  for (const tpl of TEMPLATES) {
    const existing = await WT.findOne({ id: tpl.id });
    if (!existing) {
      await WT.create({ ...tpl, isDefault: false, createdBy: 'system' });
      console.log(`Seeded: ${tpl.name}`);
    }
  }
}
