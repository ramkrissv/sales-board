'use client';

import { useState, useMemo } from 'react';
import { trpc } from '@/lib/trpc/client';
import { Trash2, UserPlus, Shield, Mail, Copy, Check, Users, Sparkles, Link2, Search, Loader2, Building2 } from 'lucide-react';
import { format } from 'date-fns';

const ROLES = ['admin', 'manager', 'rep', 'sdr', 'presales', 'viewer'] as const;
const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-[var(--g-red-soft)] text-[var(--g-red)]',
  manager: 'bg-[var(--g-amber-soft)] text-[var(--g-amber)]',
  rep: 'bg-[#7c3aed]/10 text-[#7c3aed]',
  sdr: 'bg-blue-500/10 text-blue-400',
  presales: 'bg-[var(--g-green-soft)] text-[var(--g-green)]',
  viewer: 'bg-secondary text-muted-foreground',
};

export default function UsersAdminPage() {
  const utils = trpc.useUtils();
  const { data: users, isLoading } = trpc.user.list.useQuery();
  const { data: opportunities = [] } = trpc.opportunity.list.useQuery();
  const createUser = trpc.user.create.useMutation({ onSuccess: () => { utils.user.list.invalidate(); setForm({ email: '', firstName: '', lastName: '', role: 'rep', team: '' }); setShowInvite(false); setCopiedInvite(null); } });
  const updateRole = trpc.user.updateRole.useMutation({ onSuccess: () => utils.user.list.invalidate() });
  const deleteUser = trpc.user.delete.useMutation({ onSuccess: () => utils.user.list.invalidate() });

  const [showInvite, setShowInvite] = useState(false);
  const [showDirectory, setShowDirectory] = useState(false);
  const [directorySearch, setDirectorySearch] = useState('');
  const [directoryResults, setDirectoryResults] = useState<any>(null);
  const directoryMutation = trpc.directory.searchUsers.useMutation();
  const [form, setForm] = useState({ email: '', firstName: '', lastName: '', role: 'rep' as string, team: '' });
  const [copiedInvite, setCopiedInvite] = useState<string | null>(null);
  const [sendingInvite, setSendingInvite] = useState<string | null>(null);
  const [inviteSent, setInviteSent] = useState<string | null>(null);
  const sendInvite = trpc.user.sendInvite.useMutation({
    onSuccess: (_, vars) => { setInviteSent(vars.id); setSendingInvite(null); setTimeout(() => setInviteSent(null), 3000); },
    onError: () => { setSendingInvite(null); },
  });

  const handleDirectorySearch = () => {
    if (!directorySearch.trim()) return;
    directoryMutation.mutate({ query: directorySearch.trim() }, {
      onSuccess: (data) => setDirectoryResults(data),
    });
  };

  const addFromDirectory = (user: { name: string; email: string; title: string; department: string }) => {
    const parts = user.name.split(' ');
    setForm({
      email: user.email,
      firstName: parts[0] || '',
      lastName: parts.slice(1).join(' ') || '',
      role: user.title?.toLowerCase().includes('director') || user.title?.toLowerCase().includes('vp') ? 'manager' : 'rep',
      team: user.department || '',
    });
    setShowDirectory(false);
    setShowInvite(true);
  };

  // Intelligent matching: map users to their deals based on name fuzzy match
  const userDealMap = useMemo(() => {
    const map: Record<string, { deals: number; tcv: number; owner: string }> = {};
    (users || []).forEach((u: any) => {
      const name = [u.firstName, u.lastName].filter(Boolean).join(' ').toLowerCase();
      const email = (u.email || '').toLowerCase();
      const emailPrefix = email.split('@')[0].replace(/[._-]/g, ' ');

      // Match opportunities by primaryOwner (fuzzy)
      const matched = (opportunities as any[]).filter(o => {
        const owner = (o.primaryOwner || '').toLowerCase();
        if (!owner || !name) return false;
        // Exact match
        if (owner === name) return true;
        // First name match
        if (name.split(' ')[0].length > 2 && owner.includes(name.split(' ')[0])) return true;
        // Email prefix match
        if (emailPrefix.length > 3 && owner.includes(emailPrefix.split(' ')[0])) return true;
        // Last name match
        const lastName = name.split(' ').pop() || '';
        if (lastName.length > 3 && owner.includes(lastName)) return true;
        return false;
      });

      const matchedOwner = matched.length > 0 ? matched[0].primaryOwner : '';
      map[u._id] = {
        deals: matched.length,
        tcv: matched.reduce((s: number, o: any) => s + (o.tcv || 0), 0),
        owner: matchedOwner,
      };
    });
    return map;
  }, [users, opportunities]);

  // Generate invite link
  const generateInviteLink = (email: string) => {
    return `https://salespilot.galent.ai/login?email=${encodeURIComponent(email)}`;
  };

  const copyInvite = (email: string) => {
    const link = generateInviteLink(email);
    const message = `You're invited to Galent SalesPilot!\n\nSign in at: ${link}\n\nUse "Sign in with Microsoft" with your O365 account, or enter your email directly.`;
    navigator.clipboard.writeText(message);
    setCopiedInvite(email);
    setTimeout(() => setCopiedInvite(null), 3000);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading users...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-[#7c3aed]" />
            <h1 className="text-xl font-semibold text-foreground font-display">User Management</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">{users?.length || 0} users · {ROLES.length} roles</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setShowDirectory(!showDirectory); setShowInvite(false); }}
            className="px-3 py-1.5 rounded-lg border border-border text-foreground text-xs font-medium flex items-center gap-1.5 hover:bg-secondary transition-colors">
            <Building2 className="h-3.5 w-3.5" />
            Find from O365
          </button>
          <button onClick={() => { setShowInvite(!showInvite); setShowDirectory(false); }}
            className="px-3 py-1.5 rounded-lg bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-xs font-medium flex items-center gap-1.5 transition-colors">
            <UserPlus className="h-3.5 w-3.5" />
            Invite User
          </button>
        </div>
      </div>

      {/* Role legend */}
      <div className="flex flex-wrap gap-2">
        {ROLES.map(r => {
          const count = (users || []).filter((u: any) => u.role === r).length;
          return (
            <span key={r} className={`text-[10px] px-2 py-1 rounded-lg font-medium ${ROLE_COLORS[r]}`}>
              {r.charAt(0).toUpperCase() + r.slice(1)} ({count})
            </span>
          );
        })}
      </div>

      {/* O365 Directory Search */}
      {showDirectory && (
        <div className="p-5 rounded-xl g-surface g-elevated space-y-4 animate-flow-in">
          <div className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Building2 className="h-4 w-4 text-[#0078d4]" />
            Find Users from Organization Directory
          </div>
          <div className="flex gap-2">
            <input value={directorySearch} onChange={e => setDirectorySearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleDirectorySearch()}
              placeholder="Search by name or email..."
              className="flex-1 px-3 py-2.5 text-sm rounded-lg bg-card border border-border text-foreground focus:outline-none focus:border-[#7c3aed]/40" />
            <button onClick={handleDirectorySearch} disabled={directoryMutation.isPending || !directorySearch.trim()}
              className="px-4 py-2.5 rounded-lg bg-[#0078d4] text-white text-sm font-medium hover:bg-[#106ebe] disabled:opacity-50 transition-colors">
              {directoryMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </button>
          </div>

          {directoryResults?.error && (
            <div className="p-3 rounded-lg bg-[var(--g-amber-soft)] border border-[var(--g-amber)]/20 text-xs">
              <p className="text-[var(--g-amber)] font-medium">{directoryResults.error}</p>
              {directoryResults.hint && <p className="text-muted-foreground mt-1">{directoryResults.hint}</p>}
            </div>
          )}

          {directoryResults?.users?.length > 0 && (
            <div className="space-y-1.5">
              {directoryResults.users.map((u: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-card border border-border hover:border-[#7c3aed]/30 transition-all">
                  <div>
                    <div className="text-sm font-medium text-foreground">{u.name}</div>
                    <div className="text-[10px] text-muted-foreground">{u.email} {u.title && `· ${u.title}`} {u.department && `· ${u.department}`}</div>
                  </div>
                  <button onClick={() => addFromDirectory(u)}
                    className="px-3 py-1.5 text-[10px] rounded-lg bg-[#7c3aed]/10 text-[#7c3aed] font-medium hover:bg-[#7c3aed]/20 transition-colors">
                    <UserPlus className="h-3 w-3 inline mr-1" /> Add
                  </button>
                </div>
              ))}
            </div>
          )}

          {directoryResults?.users?.length === 0 && !directoryResults?.error && (
            <p className="text-xs text-muted-foreground text-center py-4">No users found matching "{directorySearch}"</p>
          )}
        </div>
      )}

      {/* Invite form */}
      {showInvite && (
        <div className="p-5 rounded-xl g-surface g-elevated space-y-4">
          <div className="text-sm font-semibold text-foreground">Invite New User</div>
          <p className="text-xs text-muted-foreground">Create a user account and share the invite link. They can sign in with Microsoft O365 or email.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input type="email" placeholder="Email *" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
              className="px-3 py-2.5 text-sm rounded-lg bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#7c3aed]/40" />
            <div className="grid grid-cols-2 gap-3">
              <input type="text" placeholder="First Name" value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })}
                className="px-3 py-2.5 text-sm rounded-lg bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#7c3aed]/40" />
              <input type="text" placeholder="Last Name" value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })}
                className="px-3 py-2.5 text-sm rounded-lg bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#7c3aed]/40" />
            </div>
            <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
              className="px-3 py-2.5 text-sm rounded-lg bg-card border border-border text-foreground focus:outline-none focus:border-[#7c3aed]/40">
              {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
            </select>
            <input type="text" placeholder="Team (e.g., Sales, Presales)" value={form.team} onChange={e => setForm({ ...form, team: e.target.value })}
              className="px-3 py-2.5 text-sm rounded-lg bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#7c3aed]/40" />
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => handleCreate()} disabled={createUser.isPending || !form.email}
              className="px-4 py-2 text-sm rounded-lg bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-medium disabled:opacity-50 transition-colors">
              {createUser.isPending ? 'Creating...' : 'Create & Generate Invite'}
            </button>
            <button onClick={() => setShowInvite(false)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
          </div>
        </div>
      )}

      {/* User table */}
      <div className="rounded-xl g-surface g-elevated overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              {['User', 'Role', 'Team', 'Pipeline Match', 'Invite', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(users || []).map((user: any) => {
              const match = userDealMap[user._id] || { deals: 0, tcv: 0, owner: '' };
              return (
                <tr key={user._id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#7c3aed]/15 flex items-center justify-center text-[#7c3aed] text-[10px] font-bold">
                        {[user.firstName?.[0], user.lastName?.[0]].filter(Boolean).join('').toUpperCase() || user.email?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-foreground">
                          {[user.firstName, user.lastName].filter(Boolean).join(' ') || user.email?.split('@')[0]}
                        </div>
                        <div className="text-[10px] text-muted-foreground">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <select value={user.role || 'rep'} onChange={e => updateRole.mutate({ id: user._id, role: e.target.value as any })}
                      className={`px-2 py-1 text-[10px] rounded-lg font-medium border-0 cursor-pointer ${ROLE_COLORS[user.role] || ROLE_COLORS.rep}`}>
                      {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{user.team || '—'}</td>
                  <td className="px-4 py-3">
                    {match.deals > 0 ? (
                      <div className="flex items-center gap-1.5">
                        <Link2 className="h-3 w-3 text-[var(--g-green)]" />
                        <span className="text-xs text-foreground">{match.deals} deals</span>
                        <span className="text-[10px] text-muted-foreground">${(match.tcv/1000).toFixed(0)}k</span>
                        {match.owner && <span className="text-[9px] text-muted-foreground">as "{match.owner}"</span>}
                      </div>
                    ) : (
                      <span className="text-[10px] text-muted-foreground italic">No deals matched</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => { setSendingInvite(user._id); sendInvite.mutate({ id: user._id }); }}
                        disabled={sendingInvite === user._id}
                        className="flex items-center gap-1 text-[10px] text-[#7c3aed] hover:underline disabled:opacity-50">
                        {inviteSent === user._id ? <><Check className="h-3 w-3 text-emerald-400" /> Sent!</> :
                         sendingInvite === user._id ? <><Loader2 className="h-3 w-3 animate-spin" /> Sending...</> :
                         <><Mail className="h-3 w-3" /> Send invite</>}
                      </button>
                      <button onClick={() => copyInvite(user.email)}
                        className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground">
                        {copiedInvite === user.email ? <><Check className="h-3 w-3" /> Copied</> : <><Copy className="h-3 w-3" /> Copy</>}
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => { if (confirm('Delete this user?')) deleteUser.mutate({ id: user._id }); }}
                      disabled={user.email === 'admin@galent.com'}
                      className="p-1.5 rounded text-muted-foreground hover:text-[var(--g-red)] hover:bg-[var(--g-red-soft)] disabled:opacity-30 transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* How it works */}
      <div className="p-4 rounded-xl bg-[#7c3aed]/5 border border-[#7c3aed]/20 text-xs text-muted-foreground space-y-1.5">
        <div className="flex items-center gap-1.5 text-[#7c3aed] font-semibold text-[10px] uppercase tracking-wider">
          <Sparkles className="h-3 w-3" /> Smart User Matching
        </div>
        <p>When a user signs in (via Microsoft or email), the platform automatically matches them to their deals by name. "Aviroop Mookherjee" signing in will see deals owned by "Aviroop Mookherjee" in their personalized "My" scope view.</p>
        <p>The "Pipeline Match" column shows how many deals each user is linked to based on fuzzy name matching with the primaryOwner field.</p>
      </div>
    </div>
  );

  function handleCreate() {
    if (!form.email) return;
    createUser.mutate({
      email: form.email,
      firstName: form.firstName || undefined,
      lastName: form.lastName || undefined,
      role: form.role as any,
      team: form.team || undefined,
    });
  }
}
