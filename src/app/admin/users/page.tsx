'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { Trash2, UserPlus, Shield } from 'lucide-react';
import { format } from 'date-fns';

const ROLES = ['admin', 'manager', 'rep', 'sdr', 'presales', 'viewer'] as const;

export default function UsersAdminPage() {
  const utils = trpc.useUtils();
  const { data: users, isLoading } = trpc.user.list.useQuery();
  const createUser = trpc.user.create.useMutation({ onSuccess: () => utils.user.list.invalidate() });
  const updateRole = trpc.user.updateRole.useMutation({ onSuccess: () => utils.user.list.invalidate() });
  const deleteUser = trpc.user.delete.useMutation({ onSuccess: () => utils.user.list.invalidate() });

  const [showInvite, setShowInvite] = useState(false);
  const [form, setForm] = useState({ email: '', firstName: '', lastName: '', role: 'rep' as string, team: '' });

  const handleCreate = async () => {
    if (!form.email) return;
    try {
      await createUser.mutateAsync({
        email: form.email,
        firstName: form.firstName || undefined,
        lastName: form.lastName || undefined,
        role: form.role as any,
        team: form.team || undefined,
      });
      setForm({ email: '', firstName: '', lastName: '', role: 'rep', team: '' });
      setShowInvite(false);
    } catch (e: any) {
      alert(e.message || 'Failed to create user');
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading users...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-purple-400" />
            <h1 className="text-xl font-semibold text-foreground">User Management</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">{users?.length || 0} users</p>
        </div>
        <button
          onClick={() => setShowInvite(!showInvite)}
          className="px-3 py-1.5 rounded-lg bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-xs font-medium flex items-center gap-1.5 transition-colors"
        >
          <UserPlus className="h-3.5 w-3.5" />
          Invite User
        </button>
      </div>

      {showInvite && (
        <div className="p-4 rounded-xl g-surface g-elevated space-y-3">
          <div className="g-section-label mb-2">Invite New User</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              type="email"
              placeholder="Email *"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              className="px-3 py-2 text-sm rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-purple-500/40"
            />
            <input
              type="text"
              placeholder="First Name"
              value={form.firstName}
              onChange={e => setForm({ ...form, firstName: e.target.value })}
              className="px-3 py-2 text-sm rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-purple-500/40"
            />
            <input
              type="text"
              placeholder="Last Name"
              value={form.lastName}
              onChange={e => setForm({ ...form, lastName: e.target.value })}
              className="px-3 py-2 text-sm rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-purple-500/40"
            />
            <select
              value={form.role}
              onChange={e => setForm({ ...form, role: e.target.value })}
              className="px-3 py-2 text-sm rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-200 focus:outline-none focus:border-purple-500/40"
            >
              {ROLES.map(r => (
                <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Team"
              value={form.team}
              onChange={e => setForm({ ...form, team: e.target.value })}
              className="px-3 py-2 text-sm rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-purple-500/40"
            />
            <button
              onClick={handleCreate}
              disabled={createUser.isPending || !form.email}
              className="px-4 py-2 text-sm rounded-lg bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-medium disabled:opacity-50 transition-colors"
            >
              {createUser.isPending ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </div>
      )}

      <div className="rounded-xl g-surface g-elevated overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {['Name', 'Email', 'Role', 'Team', 'Created', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] text-muted-foreground uppercase tracking-wider font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(users || []).map((user: any) => (
                <tr key={user._id} className="border-b border-border hover:bg-muted transition-colors">
                  <td className="px-4 py-3 text-foreground font-medium">
                    {[user.firstName, user.lastName].filter(Boolean).join(' ') || '\u2014'}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                  <td className="px-4 py-3">
                    <select
                      value={user.role || 'rep'}
                      onChange={e => updateRole.mutate({ id: user._id, role: e.target.value as any })}
                      className="px-2 py-1 text-xs rounded bg-zinc-800 border border-zinc-700 text-zinc-200 focus:outline-none focus:border-purple-500/40"
                    >
                      {ROLES.map(r => (
                        <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{user.team || '\u2014'}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {user.createdAt ? format(new Date(user.createdAt), 'MMM d, yyyy') : '\u2014'}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => {
                        if (confirm('Delete this user?')) deleteUser.mutate({ id: user._id });
                      }}
                      disabled={user.email === 'admin@galent.com'}
                      className="p-1.5 rounded text-muted-foreground hover:text-red-400 hover:bg-red-500/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      title={user.email === 'admin@galent.com' ? 'Cannot delete default admin' : 'Delete user'}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
              {(!users || users.length === 0) && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">No users found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
