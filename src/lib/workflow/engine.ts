import mongoose, { Schema } from 'mongoose';
import { connectDB } from '@/lib/db/connection';

// Inline schemas to avoid import issues
const WorkflowSchema = new Schema({
  name: String, description: String, isActive: { type: Boolean, default: true },
  mode: String, trigger: Schema.Types.Mixed, conditions: [Schema.Types.Mixed],
  actions: [Schema.Types.Mixed], executionCount: { type: Number, default: 0 },
  lastExecutedAt: Date, successRate: { type: Number, default: 100 },
}, { timestamps: true });

const TaskSchema = new Schema({
  opportunityId: String, name: String, owner: String,
  dueDate: Date, status: { type: String, default: 'pending' },
  priority: { type: String, default: 'Medium' }, notes: String,
}, { timestamps: true });

const NotifSchema = new Schema({
  userId: { type: String, default: 'default-user' },
  type: String, title: String, message: String,
  read: { type: Boolean, default: false }, metadata: Schema.Types.Mixed,
}, { timestamps: true });

const ActivitySchema = new Schema({
  type: String, entityType: String, entityId: String,
  entityName: String, description: String,
  userId: { type: String, default: 'default-user' },
  userName: { type: String, default: 'System' }, metadata: Schema.Types.Mixed,
}, { timestamps: true });

function getWorkflowModel() { return mongoose.models.Workflow || mongoose.model('Workflow', WorkflowSchema); }
function getTaskModel() { return mongoose.models.Task || mongoose.model('Task', TaskSchema); }
function getNotifModel() { return mongoose.models.Notification || mongoose.model('Notification', NotifSchema); }
function getActivityModel() { return mongoose.models.Activity || mongoose.model('Activity', ActivitySchema); }

export interface WorkflowEvent {
  type: 'deal_stage_change' | 'deal_created' | 'task_overdue' | 'lead_qualified' | 'lead_converted' | 'contract_created';
  opportunityId?: string;
  opportunityName?: string;
  customerName?: string;
  fromStage?: string;
  toStage?: string;
  userId?: string;
  userName?: string;
  metadata?: Record<string, any>;
}

/**
 * Execute all matching workflows for an event
 */
export async function executeWorkflows(event: WorkflowEvent): Promise<{ executed: string[]; actions: string[] }> {
  await connectDB();
  const Workflow = getWorkflowModel();
  const Task = getTaskModel();
  const Notif = getNotifModel();
  const Activity = getActivityModel();

  // Find active workflows matching this trigger type
  const workflows = await Workflow.find({ isActive: true, 'trigger.type': event.type }).lean();

  const executed: string[] = [];
  const actions: string[] = [];

  for (const wf of workflows) {
    const trigger = (wf as any).trigger || {};

    // Check trigger conditions
    let matches = true;
    if (event.type === 'deal_stage_change') {
      if (trigger.config?.toStage && trigger.config.toStage !== event.toStage) matches = false;
      if (trigger.config?.fromStage && trigger.config.fromStage !== event.fromStage) matches = false;
    }

    if (!matches) continue;

    // Execute actions
    const wfActions = (wf as any).actions || [];
    for (const action of wfActions) {
      try {
        if (action.type === 'create_task' && event.opportunityId) {
          await Task.create({
            opportunityId: event.opportunityId,
            name: action.config?.name || `Auto: ${(wf as any).name}`,
            owner: action.config?.owner || event.userName || 'Unassigned',
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
            priority: action.config?.priority || 'Medium',
            notes: `Auto-created by workflow: ${(wf as any).name}`,
          });
          actions.push(`Task created: ${action.config?.name || (wf as any).name}`);
        }

        if (action.type === 'send_notification') {
          await Notif.create({
            userId: 'default-user',
            type: 'system',
            title: `Workflow: ${(wf as any).name}`,
            message: action.config?.message || `Workflow "${(wf as any).name}" triggered for ${event.customerName || 'a deal'}`,
            metadata: { workflowId: (wf as any)._id, event },
          });
          actions.push(`Notification sent: ${(wf as any).name}`);
        }

        if (action.type === 'invoke_agent') {
          // Log that agent should be invoked (actual AI call happens separately)
          actions.push(`Agent invoked: ${action.config?.agentId || 'deal-coach'}`);
        }
      } catch (err) {
        console.error(`Workflow action failed: ${(wf as any).name}`, err);
      }
    }

    // Log activity
    await Activity.create({
      type: 'workflow_executed',
      entityType: 'workflow',
      entityId: String((wf as any)._id),
      entityName: (wf as any).name,
      description: `Workflow "${(wf as any).name}" executed: ${actions.length} actions for ${event.customerName || event.opportunityId || 'event'}`,
      userName: 'System',
    });

    // Update workflow stats
    await Workflow.updateOne(
      { _id: (wf as any)._id },
      { $inc: { executionCount: 1 }, $set: { lastExecutedAt: new Date() } }
    );

    executed.push((wf as any).name);
  }

  return { executed, actions };
}
