export type Role = 'admin' | 'manager' | 'rep' | 'sdr' | 'presales' | 'viewer';

// Permission matrix
const permissions: Record<string, Role[]> = {
  // Opportunities
  'opportunity:create': ['admin', 'manager', 'rep', 'sdr'],
  'opportunity:read': ['admin', 'manager', 'rep', 'sdr', 'presales', 'viewer'],
  'opportunity:update': ['admin', 'manager', 'rep', 'sdr'],
  'opportunity:delete': ['admin', 'manager'],
  'opportunity:change_stage': ['admin', 'manager', 'rep'],
  'opportunity:export': ['admin', 'manager', 'rep'],

  // Sensitive fields
  'field:tcv': ['admin', 'manager', 'rep'],
  'field:margin': ['admin', 'manager'],

  // Accounts
  'account:create': ['admin', 'manager', 'rep'],
  'account:read': ['admin', 'manager', 'rep', 'sdr', 'presales', 'viewer'],
  'account:update': ['admin', 'manager', 'rep'],
  'account:delete': ['admin'],

  // Stakeholders
  'stakeholder:create': ['admin', 'manager', 'rep', 'sdr', 'presales'],
  'stakeholder:read': ['admin', 'manager', 'rep', 'sdr', 'presales', 'viewer'],
  'stakeholder:update': ['admin', 'manager', 'rep', 'presales'],
  'stakeholder:delete': ['admin', 'manager', 'rep'],

  // Tasks
  'task:create': ['admin', 'manager', 'rep', 'sdr', 'presales'],
  'task:read': ['admin', 'manager', 'rep', 'sdr', 'presales', 'viewer'],
  'task:update': ['admin', 'manager', 'rep', 'sdr', 'presales'],
  'task:delete': ['admin', 'manager', 'rep'],

  // Contracts
  'contract:create': ['admin', 'manager', 'rep', 'presales'],
  'contract:read': ['admin', 'manager', 'rep', 'presales', 'viewer'],
  'contract:update': ['admin', 'manager', 'rep', 'presales'],
  'contract:delete': ['admin', 'manager'],

  // Leads
  'lead:create': ['admin', 'manager', 'rep', 'sdr'],
  'lead:read': ['admin', 'manager', 'rep', 'sdr', 'presales', 'viewer'],
  'lead:update': ['admin', 'manager', 'rep', 'sdr'],
  'lead:delete': ['admin', 'manager'],

  // Workflows
  'workflow:create': ['admin', 'manager'],
  'workflow:read': ['admin', 'manager', 'rep'],
  'workflow:update': ['admin', 'manager'],
  'workflow:delete': ['admin'],

  // Agents
  'agent:invoke': ['admin', 'manager', 'rep'],
  'agent:configure': ['admin'],
  'agent:view_registry': ['admin', 'manager', 'rep'],

  // Integrations & Plugins
  'integration:manage': ['admin'],
  'integration:view': ['admin', 'manager'],
  'plugin:install': ['admin'],
  'plugin:view': ['admin', 'manager'],

  // Users
  'user:create': ['admin'],
  'user:read': ['admin', 'manager'],
  'user:update': ['admin'],
  'user:delete': ['admin'],
  'user:manage': ['admin'],
  'user:view': ['admin', 'manager'],

  // Forecasting
  'forecast:view': ['admin', 'manager', 'rep'],
  'forecast:configure': ['admin', 'manager'],
  'forecast:export': ['admin', 'manager'],

  // Settings
  'settings:read': ['admin', 'manager', 'rep', 'sdr', 'presales', 'viewer'],
  'settings:manage': ['admin'],

  // Signal intake
  'intake:create': ['admin', 'manager', 'rep', 'sdr', 'presales'],
  'intake:read': ['admin', 'manager', 'rep', 'sdr', 'presales'],

  // Recordings
  'recording:create': ['admin', 'manager', 'rep', 'sdr', 'presales'],
  'recording:read_own': ['admin', 'manager', 'rep', 'sdr', 'presales'],
  'recording:read_all': ['admin'],
  'recording:delete': ['admin'],

  // Notifications
  'notification:read': ['admin', 'manager', 'rep', 'sdr', 'presales', 'viewer'],
  'notification:create': ['admin', 'manager'],

  // AI chat
  'ai:chat': ['admin', 'manager', 'rep', 'sdr', 'presales'],
  'ai:analyze': ['admin', 'manager', 'rep'],
};

export function hasPermission(role: Role, permission: string): boolean {
  const allowed = permissions[permission];
  if (!allowed) return false;
  return allowed.includes(role);
}

// Route → permission mapping
const routePermissions: Record<string, string> = {
  '/': 'opportunity:read',
  '/pipeline': 'opportunity:read',
  '/funnel': 'opportunity:read',
  '/table': 'opportunity:read',
  '/calendar': 'opportunity:read',
  '/graph': 'opportunity:read',
  '/accounts': 'account:read',
  '/stakeholders': 'stakeholder:read',
  '/tasks': 'task:read',
  '/leads': 'lead:read',
  '/campaigns': 'lead:read',
  '/intake': 'intake:read',
  '/presales': 'contract:read',
  '/pricing': 'contract:read',
  '/contracts': 'contract:read',
  '/forecasting': 'forecast:view',
  '/dashboard': 'opportunity:read',
  '/waterfall': 'forecast:view',
  '/insights': 'opportunity:read',
  '/growth': 'account:read',
  '/agents': 'agent:view_registry',
  '/ask': 'ai:chat',
  '/enablement': 'ai:chat',
  '/workflows': 'workflow:read',
  '/integrations': 'integration:view',
  '/plugins': 'plugin:view',
  '/admin/users': 'user:view',
  '/settings': 'settings:read',
  '/guide': 'opportunity:read',
};

export function canAccessRoute(role: Role, pathname: string): boolean {
  const requiredPermission = routePermissions[pathname];
  if (!requiredPermission) return true; // No restriction = open
  return hasPermission(role, requiredPermission);
}

// Visibility scoping: which opportunities can a user see?
export type VisibilityScope = 'own' | 'team' | 'all';

export function getVisibilityScope(role: Role): VisibilityScope {
  switch (role) {
    case 'admin': return 'all';
    case 'manager': return 'team';
    case 'viewer': return 'all'; // viewers can see all but not edit
    default: return 'own';
  }
}

// Role display metadata
export const ROLE_META: Record<Role, { label: string; color: string; description: string }> = {
  admin: { label: 'Admin', color: '#ef4444', description: 'Full platform access, user management, settings' },
  manager: { label: 'Manager', color: '#f59e0b', description: 'Team oversight, reports, workflow management' },
  rep: { label: 'Sales Rep', color: '#3b82f6', description: 'Deal management, proposals, client engagement' },
  sdr: { label: 'SDR', color: '#22c55e', description: 'Lead generation, outreach, qualification' },
  presales: { label: 'Presales', color: '#8b5cf6', description: 'Proposals, pricing, solutioning, contracts' },
  viewer: { label: 'Viewer', color: '#71717a', description: 'Read-only access to pipeline and reports' },
};
