'use client';

import React, { useState } from 'react';
import { StaffPermission } from '@paisabridge/shared';

interface StaffUser {
  id: string;
  email: string;
  role: string;
  created_at: string;
  permissions: StaffPermission;
}

interface TeamManagerProps {
  initialTeam: StaffUser[];
}

export default function TeamManager({ initialTeam }: TeamManagerProps) {
  const [team, setTeam] = useState<StaffUser[]>(initialTeam);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffUser | null>(null);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [perms, setPerms] = useState<Partial<StaffPermission>>({
    can_view_transactions: true,
    can_manage_accounts: false,
    can_manage_bridge: false,
    can_view_analytics: false,
    can_export_reports: false,
    can_manage_webhooks: false,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/merchant/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, permissions: perms }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add member');

      setTeam([data.member, ...team]);
      setEmail('');
      setPassword('');
      setIsAddModalOpen(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdatePermissions = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/merchant/team/${editingStaff.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: editingStaff.permissions }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update permissions');

      setTeam(
        team.map((m) =>
          m.id === editingStaff.id ? { ...m, permissions: data.permissions } : m
        )
      );
      setEditingStaff(null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveMember = async (id: string, memberEmail: string) => {
    if (!confirm(`Are you sure you want to remove ${memberEmail} from your merchant team?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/merchant/team/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to remove member');
      }
      setTeam(team.filter((m) => m.id !== id));
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Team &amp; Staff Access</h1>
          <p className="text-sm text-slate-500 mt-1">
            Delegate operational access to accountants, support, or managers with fine-grained permissions.
          </p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold shadow-sm transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          Add Staff Member
        </button>
      </div>

      {/* Team Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        {team.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            <div className="w-14 h-14 bg-slate-100 text-slate-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-slate-900">No Staff Accounts Yet</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto mt-1 mb-6">
              Create sub-accounts for your support staff with restricted access to only view transactions or manage devices.
            </p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition"
            >
              Add First Staff Member
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Email</th>
                  <th className="px-6 py-3.5">Role</th>
                  <th className="px-6 py-3.5">Assigned Permissions</th>
                  <th className="px-6 py-3.5">Date Added</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {team.map((member) => (
                  <tr key={member.id} className="hover:bg-slate-50/50 transition">
                    <td className="px-6 py-4 font-semibold text-slate-900">{member.email}</td>
                    <td className="px-6 py-4">
                      <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">
                        Staff
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1 max-w-md">
                        {member.permissions.can_view_transactions && (
                          <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded">
                            Transactions
                          </span>
                        )}
                        {member.permissions.can_manage_accounts && (
                          <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded">
                            Accounts
                          </span>
                        )}
                        {member.permissions.can_manage_bridge && (
                          <span className="text-[10px] bg-purple-50 text-purple-700 border border-purple-200 px-1.5 py-0.5 rounded">
                            Bridge
                          </span>
                        )}
                        {member.permissions.can_view_analytics && (
                          <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.5 rounded">
                            Analytics
                          </span>
                        )}
                        {member.permissions.can_export_reports && (
                          <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded">
                            Export CSV
                          </span>
                        )}
                        {member.permissions.can_manage_webhooks && (
                          <span className="text-[10px] bg-rose-50 text-rose-700 border border-rose-200 px-1.5 py-0.5 rounded">
                            Webhooks
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      {new Date(member.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-3 text-xs">
                        <button
                          onClick={() => setEditingStaff(member)}
                          className="text-indigo-600 hover:text-indigo-800 font-medium"
                        >
                          Edit Permissions
                        </button>
                        <button
                          onClick={() => handleRemoveMember(member.id, member.email)}
                          className="text-red-600 hover:text-red-800 font-medium"
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Staff Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl p-6 border border-slate-100">
            <h2 className="text-lg font-bold text-slate-900">Add Staff Member</h2>
            <p className="text-xs text-slate-500 mt-1">
              Create an account for your team member and assign capability permissions.
            </p>

            {error && (
              <div className="mt-4 p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200">
                {error}
              </div>
            )}

            <form onSubmit={handleAddMember} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Staff Email *</label>
                <input
                  type="email"
                  required
                  placeholder="staff@yourstore.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Initial Password *</label>
                <input
                  type="password"
                  required
                  placeholder="Minimum 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Granular Permissions
                </label>
                <div className="space-y-2 border border-slate-200 rounded-lg p-3 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={perms.can_view_transactions}
                      onChange={(e) => setPerms({ ...perms, can_view_transactions: e.target.checked })}
                      className="rounded text-emerald-600"
                    />
                    <span>Can View Transactions</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={perms.can_export_reports}
                      onChange={(e) => setPerms({ ...perms, can_export_reports: e.target.checked })}
                      className="rounded text-emerald-600"
                    />
                    <span>Can Export CSV Reports</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={perms.can_manage_accounts}
                      onChange={(e) => setPerms({ ...perms, can_manage_accounts: e.target.checked })}
                      className="rounded text-emerald-600"
                    />
                    <span>Can Manage Payment Accounts</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={perms.can_manage_bridge}
                      onChange={(e) => setPerms({ ...perms, can_manage_bridge: e.target.checked })}
                      className="rounded text-emerald-600"
                    />
                    <span>Can Pair &amp; Manage Bridge Phones</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={perms.can_manage_webhooks}
                      onChange={(e) => setPerms({ ...perms, can_manage_webhooks: e.target.checked })}
                      className="rounded text-emerald-600"
                    />
                    <span>Can Configure Webhooks</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg transition"
                >
                  {isSubmitting ? 'Creating...' : 'Create Staff Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Permissions Modal */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl p-6 border border-slate-100">
            <h2 className="text-lg font-bold text-slate-900">Edit Permissions</h2>
            <p className="text-xs text-slate-500 mt-1">
              Updating access capabilities for <strong>{editingStaff.email}</strong>.
            </p>

            <form onSubmit={handleUpdatePermissions} className="mt-4 space-y-4">
              <div className="space-y-2 border border-slate-200 rounded-lg p-3 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingStaff.permissions.can_view_transactions}
                    onChange={(e) =>
                      setEditingStaff({
                        ...editingStaff,
                        permissions: {
                          ...editingStaff.permissions,
                          can_view_transactions: e.target.checked,
                        },
                      })
                    }
                    className="rounded text-emerald-600"
                  />
                  <span>Can View Transactions</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingStaff.permissions.can_export_reports}
                    onChange={(e) =>
                      setEditingStaff({
                        ...editingStaff,
                        permissions: {
                          ...editingStaff.permissions,
                          can_export_reports: e.target.checked,
                        },
                      })
                    }
                    className="rounded text-emerald-600"
                  />
                  <span>Can Export CSV Reports</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingStaff.permissions.can_manage_accounts}
                    onChange={(e) =>
                      setEditingStaff({
                        ...editingStaff,
                        permissions: {
                          ...editingStaff.permissions,
                          can_manage_accounts: e.target.checked,
                        },
                      })
                    }
                    className="rounded text-emerald-600"
                  />
                  <span>Can Manage Payment Accounts</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingStaff.permissions.can_manage_bridge}
                    onChange={(e) =>
                      setEditingStaff({
                        ...editingStaff,
                        permissions: {
                          ...editingStaff.permissions,
                          can_manage_bridge: e.target.checked,
                        },
                      })
                    }
                    className="rounded text-emerald-600"
                  />
                  <span>Can Pair &amp; Manage Bridge Phones</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingStaff.permissions.can_manage_webhooks}
                    onChange={(e) =>
                      setEditingStaff({
                        ...editingStaff,
                        permissions: {
                          ...editingStaff.permissions,
                          can_manage_webhooks: e.target.checked,
                        },
                      })
                    }
                    className="rounded text-emerald-600"
                  />
                  <span>Can Configure Webhooks</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingStaff(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-lg transition"
                >
                  {isSubmitting ? 'Saving...' : 'Save Permissions'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
