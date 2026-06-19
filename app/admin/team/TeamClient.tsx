'use client';

import { useCallback, useEffect, useState } from 'react';
import { UserPlus, Trash2, Copy } from 'lucide-react';
import { PageHeader } from '@/components/admin/PageHeader';
import { DataTable, type Column } from '@/components/admin/DataTable';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { apiFetch } from '@/lib/admin-fetch';
import { toast } from 'sonner';

type AdminRole = 'SUPER_ADMIN' | 'STORE_MANAGER' | 'CONTENT_EDITOR';

interface Member {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: AdminRole;
  createdAt: string;
}

interface PendingInvite {
  _id: string;
  email: string;
  role: AdminRole;
  expiresAt: string;
  createdAt: string;
}

type TeamResponse = {
  members: Member[];
  invites: PendingInvite[];
};

const ROLE_LABELS: Record<AdminRole, string> = {
  SUPER_ADMIN: 'Super Admin',
  STORE_MANAGER: 'Store Manager',
  CONTENT_EDITOR: 'Content Editor',
};

const ROLE_OPTIONS: AdminRole[] = ['SUPER_ADMIN', 'STORE_MANAGER', 'CONTENT_EDITOR'];

function formatDate(value?: string) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function TeamClient() {
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const [toRemove, setToRemove] = useState<Member | null>(null);
  const [toRevoke, setToRevoke] = useState<PendingInvite | null>(null);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<AdminRole>('STORE_MANAGER');
  const [inviting, setInviting] = useState(false);

  const [inviteLink, setInviteLink] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<TeamResponse>('/api/admin/team');
      setMembers(data.members);
      setInvites(data.invites);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load team');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function changeRole(member: Member, nextRole: AdminRole) {
    if (member.role === nextRole) return;
    setSavingId(member._id);
    try {
      const updated = await apiFetch<Member>(`/api/admin/team/${member._id}`, {
        method: 'PATCH',
        body: JSON.stringify({ role: nextRole }),
      });
      setMembers((prev) => prev.map((m) => (m._id === updated._id ? { ...m, role: updated.role } : m)));
      toast.success(`Role updated to ${ROLE_LABELS[nextRole]}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update role');
    } finally {
      setSavingId(null);
    }
  }

  async function handleRemove() {
    if (!toRemove) return;
    try {
      await apiFetch(`/api/admin/team/${toRemove._id}`, { method: 'DELETE' });
      toast.success(`Removed ${toRemove.firstName} ${toRemove.lastName} from the team`);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to remove member');
    } finally {
      setToRemove(null);
    }
  }

  async function handleRevoke() {
    if (!toRevoke) return;
    try {
      await apiFetch(`/api/admin/team/invite/${toRevoke._id}`, { method: 'DELETE' });
      toast.success(`Revoked invite for ${toRevoke.email}`);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to revoke invite');
    } finally {
      setToRevoke(null);
    }
  }

  async function sendInvite() {
    setInviting(true);
    try {
      const data = await apiFetch<{ invite: PendingInvite; inviteLink: string }>(
        '/api/admin/team/invite',
        { method: 'POST', body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }) }
      );
      const link = `${window.location.origin}${data.inviteLink}`;
      setInviteLink(link);
      setInviteOpen(false);
      setInviteEmail('');
      setInviteRole('STORE_MANAGER');
      load();
      toast.success('Invite created');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to create invite');
    } finally {
      setInviting(false);
    }
  }

  function copyLink() {
    if (!inviteLink) return;
    navigator.clipboard
      .writeText(inviteLink)
      .then(() => toast.success('Invite link copied'))
      .catch(() => toast.error('Could not copy link'));
  }

  const memberColumns: Column<Member>[] = [
    {
      key: 'name',
      header: 'Member',
      render: (m) => (
        <div className="min-w-0">
          <div className="font-medium truncate">
            {m.firstName} {m.lastName}
          </div>
          <div className="text-xs text-neutral-500 truncate">{m.email}</div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (m) => (
        <Select
          value={m.role}
          onValueChange={(v) => changeRole(m, v as AdminRole)}
          disabled={savingId === m._id}
        >
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ROLE_OPTIONS.map((r) => (
              <SelectItem key={r} value={r}>
                {ROLE_LABELS[r]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ),
    },
    {
      key: 'createdAt',
      header: 'Joined',
      className: 'text-neutral-500',
      render: (m) => formatDate(m.createdAt),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (m) => (
        <Button
          variant="ghost"
          size="icon"
          title="Remove from team"
          onClick={() => setToRemove(m)}
        >
          <Trash2 className="h-4 w-4 text-error" />
        </Button>
      ),
    },
  ];

  const inviteColumns: Column<PendingInvite>[] = [
    {
      key: 'email',
      header: 'Email',
      render: (i) => <span className="font-medium">{i.email}</span>,
    },
    {
      key: 'role',
      header: 'Role',
      render: (i) => <Badge variant="secondary">{ROLE_LABELS[i.role]}</Badge>,
    },
    {
      key: 'expiresAt',
      header: 'Expires',
      className: 'text-neutral-500',
      render: (i) => formatDate(i.expiresAt),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (i) => (
        <Button variant="ghost" size="icon" title="Revoke invite" onClick={() => setToRevoke(i)}>
          <Trash2 className="h-4 w-4 text-error" />
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Team" description="Manage admin members and invites">
        <Button className="gap-1" onClick={() => setInviteOpen(true)}>
          <UserPlus className="h-4 w-4" /> Invite member
        </Button>
      </PageHeader>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
          Members
        </h2>
        <DataTable
          columns={memberColumns}
          rows={members}
          rowKey={(m) => m._id}
          loading={loading}
          emptyTitle="No team members"
          emptyDescription="Invite a colleague to get started."
        />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
          Pending invites
        </h2>
        <DataTable
          columns={inviteColumns}
          rows={invites}
          rowKey={(i) => i._id}
          loading={loading}
          emptyTitle="No pending invites"
          emptyDescription="Invites you send will appear here until accepted."
        />
      </section>

      {/* Invite member dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite team member</DialogTitle>
            <DialogDescription>
              They will receive a registration link valid for 7 days.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="invite-email">
                Email
              </label>
              <Input
                id="invite-email"
                type="email"
                placeholder="colleague@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Role</label>
              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as AdminRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)} disabled={inviting}>
              Cancel
            </Button>
            <Button onClick={sendInvite} disabled={inviting || !inviteEmail.trim()}>
              {inviting ? 'Sending…' : 'Send invite'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generated invite link dialog */}
      <Dialog open={!!inviteLink} onOpenChange={(o) => !o && setInviteLink(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite created</DialogTitle>
            <DialogDescription>
              Share this link with the invitee. It expires in 7 days.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2">
            <Input readOnly value={inviteLink ?? ''} className="font-mono text-xs" />
            <Button variant="outline" size="icon" onClick={copyLink} title="Copy link">
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={() => setInviteLink(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!toRemove}
        onOpenChange={(o) => !o && setToRemove(null)}
        title="Remove from team?"
        description={
          toRemove
            ? `${toRemove.firstName} ${toRemove.lastName} will lose admin access and revert to a customer account.`
            : undefined
        }
        confirmLabel="Remove"
        destructive
        onConfirm={handleRemove}
      />

      <ConfirmDialog
        open={!!toRevoke}
        onOpenChange={(o) => !o && setToRevoke(null)}
        title="Revoke invite?"
        description={
          toRevoke ? `The invite for ${toRevoke.email} will no longer be valid.` : undefined
        }
        confirmLabel="Revoke"
        destructive
        onConfirm={handleRevoke}
      />
    </div>
  );
}
