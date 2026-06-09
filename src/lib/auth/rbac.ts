export type Role = 'admin' | 'manager' | 'rep' | 'sdr' | 'presales' | 'viewer';

// Permission matrix
const permissions: Record<string, Role[]> = {
  // Opportunities
  'opportunity:create': ['admin', 'manager', 'rep', 'sdr'],
  'opportunity:read': ['admin', 'manager', 'rep', 'sdr', 'presales', 'viewer'],
  'opportunity:update': ['admin', 'manager', 'rep', 'sdr'],
  'opportunity:delete': ['admin', 'manager'],
  'opportunity:change_stage': ['admin', 'manager', 'rep'],

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

  // Workflows
  'workflow:create': ['admin', 'manager'],
  'workflow:read': ['admin', 'manager', 'rep'],
  'workflow:update': ['admin', 'manager'],
  'workflow:delete': ['admin'],

  // Agents
  'agent:invoke': ['admin', 'manager', 'rep'],
  'agent:configure': ['admin'],
  'agent:view_registry': ['admin', 'manager'],

  // Integrations
  'integration:manage': ['admin'],
  'integration:view': ['admin', 'manager'],

  // Users
  'user:manage': ['admin'],
  'user:view': ['admin', 'manager'],

  // Forecasting
  'forecast:view': ['admin', 'manager', 'rep'],
  'forecast:configure': ['admin', 'manager'],

  // Settings
  'settings:manage': ['admin'],
};

export function hasPermission(role: Role, permission: string): boolean {
  const allowed = permissions[permission];
  if (!allowed) return false;
  return allowed.includes(role);
}

export function canAccessRoute(role: Role, pathname: string): boolean {
  const routePermissions: Record<string, string> = {
    '/': 'opportunity:read',
    '/timeline': 'opportunity:read',
    '/accounts': 'account:read',
    '/forecasting': 'forecast:view',
    '/agents': 'agent:view_registry',
    '/integrations': 'integration:view',
    '/settings': 'settings:manage',
    '/dashboard': 'opportunity:read',
  };

  const requiredPermission = routePermissions[pathname];
  if (!requiredPermission) return true; // No restriction
  return hasPermission(role, requiredPermission);
}

// Visibility scoping: which opportunities can a user see?
export type VisibilityScope = 'own' | 'team' | 'all';

export function getVisibilityScope(role: Role): VisibilityScope {
  switch (role) {
    case 'admin': return 'all';
    case 'manager': return 'team';
    case 'rep':
    case 'sdr':
    case 'presales':
      return 'own';
    case 'viewer':
      return 'all'; // viewers can see all but not edit
    default:
      return 'own';
  }
}
