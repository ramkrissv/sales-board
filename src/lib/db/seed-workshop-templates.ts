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

const MORE_TEMPLATES = [
  {
    id: 'tpl-sre-platform',
    name: 'SRE & Platform Engineering',
    description: 'Assess site reliability, platform maturity, incident management, observability, and toil reduction.',
    framework: {
      name: 'SRE & Platform Engineering', version: 1, scoringScale: SCALE,
      levels: [
        { id: 'L1', name: 'Reliability & SLOs', weight: 0.35, order: 0, summary: 'Service level objectives, error budgets, and reliability culture.', sections: [], dimensions: [
          { id: '1.1', name: 'SLO Definition & Tracking', probe: 'Are SLOs defined per service with error budgets tracked and actioned — or uptime is a vague goal?', workstreamCode: 'WS1', order: 0 },
          { id: '1.2', name: 'Incident Management', probe: 'Is there a structured incident process (severity, on-call rotation, war rooms, postmortems)?', workstreamCode: 'WS1', order: 1 },
          { id: '1.3', name: 'Change Management & Rollbacks', probe: 'Can changes be rolled back safely? Is there canary/blue-green deployment with automated rollback?', workstreamCode: 'WS2', order: 2 },
          { id: '1.4', name: 'Capacity Planning', probe: 'Is capacity planned proactively with load testing and forecasting — or reactive scaling?', workstreamCode: 'WS2', order: 3 },
        ]},
        { id: 'L2', name: 'Platform & Automation', weight: 0.40, order: 1, summary: 'Internal developer platform, automation, self-service, and toil reduction.', sections: [], dimensions: [
          { id: '2.1', name: 'Internal Developer Platform', probe: 'Is there a platform (Backstage/custom) for service creation, deployment, and observability — or each team DIYs?', workstreamCode: 'WS2', order: 0 },
          { id: '2.2', name: 'Infrastructure as Code', probe: 'Is all infrastructure codified, version-controlled, and CI/CD-deployed — or click-ops?', workstreamCode: 'WS2', order: 1 },
          { id: '2.3', name: 'Observability Stack', probe: 'Is there unified logging, metrics, tracing, and dashboards (Datadog/Grafana/custom) — or siloed tools?', workstreamCode: 'WS3', order: 2 },
          { id: '2.4', name: 'Toil Measurement & Reduction', probe: 'Is toil tracked and systematically reduced through automation — or manual work accepted?', workstreamCode: 'WS3', order: 3 },
          { id: '2.5', name: 'Self-Service & Golden Paths', probe: 'Can developers provision environments, databases, and services without tickets?', workstreamCode: 'WS2', order: 4 },
        ]},
        { id: 'L3', name: 'Team & Culture', weight: 0.25, order: 2, summary: 'SRE team structure, on-call health, knowledge sharing, and blameless culture.', sections: [], dimensions: [
          { id: '3.1', name: 'On-Call Health', probe: 'Is on-call sustainable (rotation size, alert fatigue, compensation) — or burning people out?', workstreamCode: 'WS4', order: 0 },
          { id: '3.2', name: 'Blameless Postmortems', probe: 'Are postmortems focused on systemic improvement — or finding someone to blame?', workstreamCode: 'WS4', order: 1 },
          { id: '3.3', name: 'SRE Embedding Model', probe: 'How do SREs engage with product teams — embedded, consulting, or siloed ops?', workstreamCode: 'WS4', order: 2 },
        ]},
      ],
      workstreams: [
        { code: 'WS1', name: 'Reliability Framework', objective: 'Define SLOs, error budgets, and incident management processes.', order: 0 },
        { code: 'WS2', name: 'Platform & Automation', objective: 'Build internal developer platform with IaC and self-service.', order: 1 },
        { code: 'WS3', name: 'Observability & Toil', objective: 'Implement unified observability and systematic toil reduction.', order: 2 },
        { code: 'WS4', name: 'Team & Culture', objective: 'Establish healthy on-call, blameless culture, and SRE embedding.', order: 3 },
      ],
    },
  },
  {
    id: 'tpl-saas-integration',
    name: 'SaaS & Salesforce Integration',
    description: 'Assess CRM/ERP integration landscape, Salesforce maturity, API strategy, data sync, and automation.',
    framework: {
      name: 'SaaS Integration Assessment', version: 1, scoringScale: SCALE,
      levels: [
        { id: 'L1', name: 'Integration Strategy', weight: 0.30, order: 0, summary: 'Integration architecture, API strategy, and data flow governance.', sections: [], dimensions: [
          { id: '1.1', name: 'Integration Architecture', probe: 'Is there a deliberate integration architecture (ESB/iPaaS/API-led) or point-to-point spaghetti?', workstreamCode: 'WS1', order: 0 },
          { id: '1.2', name: 'API Management', probe: 'Are APIs versioned, documented, secured, and monitored through a gateway — or ad hoc endpoints?', workstreamCode: 'WS1', order: 1 },
          { id: '1.3', name: 'Data Sync & MDM', probe: 'Is there master data management with sync rules — or duplicates and conflicts across systems?', workstreamCode: 'WS2', order: 2 },
        ]},
        { id: 'L2', name: 'Salesforce / CRM', weight: 0.40, order: 1, summary: 'Salesforce configuration, customization, data quality, and adoption.', sections: [], dimensions: [
          { id: '2.1', name: 'Salesforce Configuration Health', probe: 'Is Salesforce well-configured (object model, page layouts, validation) or over-customized with tech debt?', workstreamCode: 'WS2', order: 0 },
          { id: '2.2', name: 'Apex / Custom Code Quality', probe: 'Is custom code tested, documented, and following best practices — or brittle and untested?', workstreamCode: 'WS2', order: 1 },
          { id: '2.3', name: 'Data Quality & Deduplication', probe: 'Is CRM data clean, deduplicated, and enriched — or full of stale/duplicate records?', workstreamCode: 'WS3', order: 2 },
          { id: '2.4', name: 'Automation (Flows/Process Builder)', probe: 'Are automations maintainable and documented — or a web of legacy Process Builders?', workstreamCode: 'WS2', order: 3 },
          { id: '2.5', name: 'User Adoption & Training', probe: 'Is CRM adoption measured and high — or reps avoiding it?', workstreamCode: 'WS4', order: 4 },
        ]},
        { id: 'L3', name: 'Ecosystem & Governance', weight: 0.30, order: 2, summary: 'Connected systems, security, compliance, and release management.', sections: [], dimensions: [
          { id: '3.1', name: 'Connected Systems Landscape', probe: 'How many systems integrate with the CRM? Are connections documented and monitored?', workstreamCode: 'WS1', order: 0 },
          { id: '3.2', name: 'Security & Access Control', probe: 'Are sharing rules, profiles, and permission sets properly configured — or over-permissioned?', workstreamCode: 'WS3', order: 1 },
          { id: '3.3', name: 'Release Management', probe: 'Is there a sandbox strategy, CI/CD for Salesforce, and change management — or direct production edits?', workstreamCode: 'WS2', order: 2 },
        ]},
      ],
      workstreams: [
        { code: 'WS1', name: 'Integration Architecture', objective: 'Design clean integration patterns and API management.', order: 0 },
        { code: 'WS2', name: 'CRM Optimization', objective: 'Clean up configuration, automate processes, implement CI/CD.', order: 1 },
        { code: 'WS3', name: 'Data & Security', objective: 'Improve data quality, dedup, and security posture.', order: 2 },
        { code: 'WS4', name: 'Adoption & Enablement', objective: 'Drive user adoption and training programs.', order: 3 },
      ],
    },
  },
  {
    id: 'tpl-erp-modernization',
    name: 'ERP Modernization Assessment',
    description: 'Assess ERP landscape (SAP/Oracle/Custom), upgrade readiness, cloud migration, and process optimization.',
    framework: {
      name: 'ERP Modernization', version: 1, scoringScale: SCALE,
      levels: [
        { id: 'L1', name: 'Business Process & Fit', weight: 0.30, order: 0, summary: 'Business process alignment, customization debt, and modernization drivers.', sections: [], dimensions: [
          { id: '1.1', name: 'Process Standardization', probe: 'Are business processes standardized on ERP best practices — or heavily customized?', workstreamCode: 'WS1', order: 0 },
          { id: '1.2', name: 'Customization Debt', probe: 'How much custom code exists (ABAP/PL-SQL/custom)? Is it documented and maintainable?', workstreamCode: 'WS1', order: 1 },
          { id: '1.3', name: 'Business Case for Modernization', probe: 'Is there a quantified business case (TCO, agility, compliance) — or vendor-driven urgency?', workstreamCode: 'WS3', order: 2 },
        ]},
        { id: 'L2', name: 'Technical Landscape', weight: 0.40, order: 1, summary: 'Current ERP architecture, integrations, data, and cloud readiness.', sections: [], dimensions: [
          { id: '2.1', name: 'ERP Version & Support Status', probe: 'What version is running? Is it in mainstream support, extended, or end-of-life?', workstreamCode: 'WS1', order: 0 },
          { id: '2.2', name: 'Integration Landscape', probe: 'How many systems integrate with ERP? Are interfaces documented and stable?', workstreamCode: 'WS2', order: 1 },
          { id: '2.3', name: 'Data Quality & Migration Readiness', probe: 'Is master data clean and ready for migration — or years of accumulated junk?', workstreamCode: 'WS2', order: 2 },
          { id: '2.4', name: 'Cloud Readiness', probe: 'Is the target cloud ERP evaluated (S/4HANA Cloud, Oracle Cloud, etc.)? Landing zone ready?', workstreamCode: 'WS2', order: 3 },
          { id: '2.5', name: 'Testing & Validation', probe: 'Is there automated regression testing for ERP — or manual testing only?', workstreamCode: 'WS2', order: 4 },
        ]},
        { id: 'L3', name: 'Organization & Change', weight: 0.30, order: 2, summary: 'Team readiness, change management, training, and governance.', sections: [], dimensions: [
          { id: '3.1', name: 'Change Management Readiness', probe: 'Is there a structured change management approach — or "turn it on and hope"?', workstreamCode: 'WS3', order: 0 },
          { id: '3.2', name: 'Team Skills & Partners', probe: 'Does the team have modern ERP skills, or reliant on aging expertise and SI partners?', workstreamCode: 'WS3', order: 1 },
          { id: '3.3', name: 'Governance & PMO', probe: 'Is there a governance framework for the transformation — steering committee, risk register, gates?', workstreamCode: 'WS3', order: 2 },
        ]},
      ],
      workstreams: [
        { code: 'WS1', name: 'Current State & Fit Analysis', objective: 'Document current ERP, customizations, and process gaps.', order: 0 },
        { code: 'WS2', name: 'Technical Migration Strategy', objective: 'Plan data migration, integration rework, and cloud deployment.', order: 1 },
        { code: 'WS3', name: 'Organization & Change', objective: 'Drive change management, training, and governance.', order: 2 },
      ],
    },
  },
  {
    id: 'tpl-legacy-modernization',
    name: 'Legacy System Modernization',
    description: 'Deep assessment for mainframe/COBOL/monolith modernization — strangler fig, replatform, or rebuild strategies.',
    framework: {
      name: 'Legacy Modernization', version: 1, scoringScale: SCALE,
      levels: [
        { id: 'L1', name: 'Legacy Landscape', weight: 0.35, order: 0, summary: 'Current legacy systems, dependencies, risk, and business criticality.', sections: [], dimensions: [
          { id: '1.1', name: 'System Inventory & Dependencies', probe: 'Are all legacy systems inventoried with dependency maps — or hidden systems everywhere?', workstreamCode: 'WS1', order: 0 },
          { id: '1.2', name: 'Business Criticality & Risk', probe: 'Which systems are mission-critical? What is the risk of failure (regulatory, revenue, safety)?', workstreamCode: 'WS1', order: 1 },
          { id: '1.3', name: 'Code & Knowledge State', probe: 'Is the legacy codebase documented? Are there people who understand it — or single points of failure?', workstreamCode: 'WS1', order: 2 },
          { id: '1.4', name: 'Technical Debt Quantification', probe: 'Is tech debt measured (cost of maintenance, incident frequency, time to change)?', workstreamCode: 'WS2', order: 3 },
        ]},
        { id: 'L2', name: 'Modernization Strategy', weight: 0.40, order: 1, summary: 'Target architecture, migration patterns, and execution approach.', sections: [], dimensions: [
          { id: '2.1', name: 'Modernization Pattern Selection', probe: 'Is the approach defined (rehost/replatform/refactor/rebuild/strangler fig) per application?', workstreamCode: 'WS2', order: 0 },
          { id: '2.2', name: 'Target Architecture', probe: 'Is the target architecture designed (microservices, event-driven, serverless) with clear rationale?', workstreamCode: 'WS2', order: 1 },
          { id: '2.3', name: 'Data Migration & Coexistence', probe: 'How will old and new systems coexist during migration? Is there a data sync strategy?', workstreamCode: 'WS2', order: 2 },
          { id: '2.4', name: 'API Wrapping & Strangler Fig', probe: 'Can legacy functionality be wrapped with APIs to enable incremental migration?', workstreamCode: 'WS2', order: 3 },
          { id: '2.5', name: 'Automated Conversion Tools', probe: 'Are tools being evaluated (COBOL-to-Java, mainframe-to-cloud) — or manual rewrite only?', workstreamCode: 'WS3', order: 4 },
        ]},
        { id: 'L3', name: 'Execution & Risk', weight: 0.25, order: 2, summary: 'Delivery approach, risk management, and team augmentation.', sections: [], dimensions: [
          { id: '3.1', name: 'Phased Delivery Plan', probe: 'Is there a phased plan with early value delivery — or big-bang migration?', workstreamCode: 'WS3', order: 0 },
          { id: '3.2', name: 'Risk Mitigation & Rollback', probe: 'Are rollback plans, feature flags, and circuit breakers designed for safe migration?', workstreamCode: 'WS3', order: 1 },
          { id: '3.3', name: 'Team Augmentation Needs', probe: 'What skills are needed (legacy + modern)? Is augmentation planned (FDE pods, managed capacity)?', workstreamCode: 'WS4', order: 2 },
        ]},
      ],
      workstreams: [
        { code: 'WS1', name: 'Legacy Landscape Analysis', objective: 'Inventory systems, map dependencies, quantify risk and debt.', order: 0 },
        { code: 'WS2', name: 'Target Architecture & Strategy', objective: 'Design modernization patterns and target architecture.', order: 1 },
        { code: 'WS3', name: 'Migration Execution', objective: 'Plan phased delivery with coexistence and risk mitigation.', order: 2 },
        { code: 'WS4', name: 'Team & Augmentation', objective: 'Staff the modernization with right skills and augmentation model.', order: 3 },
      ],
    },
  },
  {
    id: 'tpl-customer-support',
    name: 'Customer Support & CX Assessment',
    description: 'Assess support operations, self-service, AI automation, CX maturity, and omnichannel capabilities.',
    framework: {
      name: 'Customer Support & CX', version: 1, scoringScale: SCALE,
      levels: [
        { id: 'L1', name: 'Support Operations', weight: 0.35, order: 0, summary: 'Ticketing, SLA, escalation, and support team effectiveness.', sections: [], dimensions: [
          { id: '1.1', name: 'Ticketing & SLA Management', probe: 'Is there structured ticketing with SLA tracking, priority routing, and escalation paths?', workstreamCode: 'WS1', order: 0 },
          { id: '1.2', name: 'First Contact Resolution', probe: 'What is the FCR rate? Are agents empowered to resolve without escalation?', workstreamCode: 'WS1', order: 1 },
          { id: '1.3', name: 'Knowledge Base & Self-Service', probe: 'Is there a customer-facing KB with high deflection rate — or all tickets go to agents?', workstreamCode: 'WS2', order: 2 },
          { id: '1.4', name: 'Omnichannel Support', probe: 'Are channels unified (email, chat, phone, social, in-app) with context continuity?', workstreamCode: 'WS2', order: 3 },
        ]},
        { id: 'L2', name: 'AI & Automation', weight: 0.35, order: 1, summary: 'Chatbots, AI agents, ticket classification, and automated resolution.', sections: [], dimensions: [
          { id: '2.1', name: 'Chatbot / Virtual Agent', probe: 'Is there an AI chatbot handling common queries — what is containment rate?', workstreamCode: 'WS2', order: 0 },
          { id: '2.2', name: 'Ticket Classification & Routing', probe: 'Are tickets auto-classified and routed by AI — or manual triage?', workstreamCode: 'WS2', order: 1 },
          { id: '2.3', name: 'Agent Assist & Copilot', probe: 'Do agents have AI-powered suggestions, knowledge retrieval, and response drafting?', workstreamCode: 'WS3', order: 2 },
          { id: '2.4', name: 'Sentiment & CSAT Analytics', probe: 'Is customer sentiment analyzed in real-time with predictive churn detection?', workstreamCode: 'WS3', order: 3 },
        ]},
        { id: 'L3', name: 'CX Strategy & Metrics', weight: 0.30, order: 2, summary: 'Customer experience strategy, NPS, journey mapping, and continuous improvement.', sections: [], dimensions: [
          { id: '3.1', name: 'CX Metrics & NPS', probe: 'Are CX metrics (NPS, CSAT, CES) tracked, segmented, and actioned — or vanity metrics?', workstreamCode: 'WS3', order: 0 },
          { id: '3.2', name: 'Customer Journey Mapping', probe: 'Are customer journeys mapped with pain points identified and improvement backlog prioritized?', workstreamCode: 'WS3', order: 1 },
          { id: '3.3', name: 'Voice of Customer Program', probe: 'Is there a structured VoC program feeding product and service improvements?', workstreamCode: 'WS3', order: 2 },
        ]},
      ],
      workstreams: [
        { code: 'WS1', name: 'Support Operations Excellence', objective: 'Optimize ticketing, SLA, and agent effectiveness.', order: 0 },
        { code: 'WS2', name: 'AI & Self-Service', objective: 'Implement AI chatbots, auto-classification, and self-service.', order: 1 },
        { code: 'WS3', name: 'CX Strategy & Analytics', objective: 'Build CX measurement, journey mapping, and VoC programs.', order: 2 },
      ],
    },
  },
  {
    id: 'tpl-security-compliance',
    name: 'Security & Compliance Assessment',
    description: 'Assess security posture, compliance readiness (SOC2/HIPAA/PCI/FedRAMP), DevSecOps, and risk management.',
    framework: {
      name: 'Security & Compliance', version: 1, scoringScale: SCALE,
      levels: [
        { id: 'L1', name: 'Security Posture', weight: 0.40, order: 0, summary: 'Identity, access, network security, vulnerability management, and incident response.', sections: [], dimensions: [
          { id: '1.1', name: 'Identity & Access Management', probe: 'Is IAM mature (SSO, MFA, RBAC, least-privilege, access reviews) — or shared accounts?', workstreamCode: 'WS1', order: 0 },
          { id: '1.2', name: 'Vulnerability Management', probe: 'Are vulnerability scans automated with SLA-driven remediation — or annual pen tests only?', workstreamCode: 'WS1', order: 1 },
          { id: '1.3', name: 'Network Security', probe: 'Is there zero-trust architecture, microsegmentation, WAF, and DDoS protection?', workstreamCode: 'WS1', order: 2 },
          { id: '1.4', name: 'Incident Response', probe: 'Is there a tested IR plan with playbooks, tabletop exercises, and defined communication protocols?', workstreamCode: 'WS2', order: 3 },
          { id: '1.5', name: 'Data Protection & Encryption', probe: 'Is data encrypted at rest and in transit? Are key management practices mature?', workstreamCode: 'WS1', order: 4 },
        ]},
        { id: 'L2', name: 'DevSecOps', weight: 0.30, order: 1, summary: 'Security in the development pipeline, SAST/DAST, supply chain, and secrets management.', sections: [], dimensions: [
          { id: '2.1', name: 'SAST & DAST in Pipeline', probe: 'Are static and dynamic security tests integrated into CI/CD with blocking thresholds?', workstreamCode: 'WS2', order: 0 },
          { id: '2.2', name: 'Dependency & Supply Chain', probe: 'Are dependencies scanned (SCA), SBOMs generated, and supply chain integrity verified?', workstreamCode: 'WS2', order: 1 },
          { id: '2.3', name: 'Secrets Management', probe: 'Are secrets in a vault (HashiCorp/AWS SM) with rotation — or hardcoded in code/configs?', workstreamCode: 'WS2', order: 2 },
          { id: '2.4', name: 'Container & Cloud Security', probe: 'Are container images scanned, pods hardened, and cloud configs audited (CSPM)?', workstreamCode: 'WS2', order: 3 },
        ]},
        { id: 'L3', name: 'Compliance & Governance', weight: 0.30, order: 2, summary: 'Regulatory compliance, audit readiness, risk management, and security governance.', sections: [], dimensions: [
          { id: '3.1', name: 'Compliance Framework Coverage', probe: 'Which frameworks apply (SOC2/HIPAA/PCI/FedRAMP/GDPR)? Are controls mapped and evidenced?', workstreamCode: 'WS3', order: 0 },
          { id: '3.2', name: 'Audit Readiness', probe: 'Can evidence be produced on demand for any control — or scramble before audits?', workstreamCode: 'WS3', order: 1 },
          { id: '3.3', name: 'Risk Management', probe: 'Is there a risk register with scoring, treatment plans, and executive visibility?', workstreamCode: 'WS3', order: 2 },
          { id: '3.4', name: 'Security Awareness & Training', probe: 'Is there mandatory security training, phishing simulations, and measured awareness?', workstreamCode: 'WS3', order: 3 },
        ]},
      ],
      workstreams: [
        { code: 'WS1', name: 'Security Hardening', objective: 'Strengthen IAM, vulnerability management, and data protection.', order: 0 },
        { code: 'WS2', name: 'DevSecOps & Pipeline', objective: 'Embed security into development pipeline and cloud operations.', order: 1 },
        { code: 'WS3', name: 'Compliance & Governance', objective: 'Achieve and maintain compliance certifications with continuous evidence.', order: 2 },
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

  // Seed all templates
  for (const tpl of [...TEMPLATES, ...MORE_TEMPLATES]) {
    const existing = await WT.findOne({ id: tpl.id });
    if (!existing) {
      await WT.create({ ...tpl, isDefault: false, createdBy: 'system' });
      console.log(`Seeded: ${tpl.name}`);
    }
  }
}
