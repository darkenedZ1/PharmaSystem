'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Users, Shield, Plus, X, Edit2, UserCheck, UserX } from 'lucide-react';

interface Role {
  id: string;
  name: string;
  isSystem?: boolean;
  permissions?: string[];
}

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  roleId: string;
  role?: Role;
  isActive: boolean;
}

const emptyInvite = { name: '', email: '', phone: '', roleId: '' };
const emptyRole = { name: '', permissions: '' };

export function UsersContent() {
  const [tab, setTab] = useState<'users' | 'roles'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingRoles, setLoadingRoles] = useState(true);

  // Invite modal
  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState(emptyInvite);
  const [inviting, setInviting] = useState(false);

  // Edit user modal
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({ name: '', phone: '', roleId: '', isActive: true });
  const [saving, setSaving] = useState(false);

  // Add role modal
  const [showAddRole, setShowAddRole] = useState(false);
  const [roleForm, setRoleForm] = useState(emptyRole);
  const [savingRole, setSavingRole] = useState(false);

  const loadUsers = () => {
    setLoadingUsers(true);
    api.get('/users')
      .then((r) => setUsers(r.data))
      .catch(() => toast.error('Failed to load users'))
      .finally(() => setLoadingUsers(false));
  };

  const loadRoles = () => {
    setLoadingRoles(true);
    api.get('/users/roles')
      .then((r) => setRoles(r.data))
      .catch(() => toast.error('Failed to load roles'))
      .finally(() => setLoadingRoles(false));
  };

  useEffect(() => {
    loadUsers();
    loadRoles();
  }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteForm.name || !inviteForm.email || !inviteForm.roleId) {
      toast.error('Name, email and role are required');
      return;
    }
    setInviting(true);
    try {
      await api.post('/users', inviteForm);
      toast.success('User invited successfully');
      setShowInvite(false);
      setInviteForm(emptyInvite);
      loadUsers();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to invite user');
    } finally {
      setInviting(false);
    }
  };

  const openEditUser = (u: User) => {
    setEditUser(u);
    setEditForm({ name: u.name, phone: u.phone ?? '', roleId: u.roleId, isActive: u.isActive });
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    setSaving(true);
    try {
      await api.put(`/users/${editUser.id}`, editForm);
      toast.success('User updated');
      setEditUser(null);
      loadUsers();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async () => {
    if (!editUser) return;
    setSaving(true);
    try {
      await api.put(`/users/${editUser.id}`, { ...editForm, isActive: !editUser.isActive });
      toast.success(editUser.isActive ? 'User deactivated' : 'User activated');
      setEditUser(null);
      loadUsers();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to update user status');
    } finally {
      setSaving(false);
    }
  };

  const handleAddRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleForm.name.trim()) { toast.error('Role name is required'); return; }
    let permissions: string[] = [];
    if (roleForm.permissions.trim()) {
      try {
        permissions = JSON.parse(roleForm.permissions);
        if (!Array.isArray(permissions)) throw new Error();
      } catch {
        toast.error('Permissions must be a valid JSON array, e.g. ["read:sales","write:inventory"]');
        return;
      }
    }
    setSavingRole(true);
    try {
      await api.post('/users/roles', { name: roleForm.name.trim(), permissions });
      toast.success('Role created');
      setShowAddRole(false);
      setRoleForm(emptyRole);
      loadRoles();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to create role');
    } finally {
      setSavingRole(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users size={22} className="text-blue-600" />
          <h1 className="text-xl font-bold text-gray-900">Users & Roles</h1>
        </div>
        {tab === 'users' ? (
          <button className="btn-primary" onClick={() => setShowInvite(true)}>
            <Plus size={16} /> Invite User
          </button>
        ) : (
          <button className="btn-primary" onClick={() => setShowAddRole(true)}>
            <Plus size={16} /> Add Role
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="mb-5 flex gap-2 border-b">
        {[
          { key: 'users', label: 'Users', icon: <Users size={14} /> },
          { key: 'roles', label: 'Roles', icon: <Shield size={14} /> },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as any)}
            className={`flex items-center gap-1.5 border-b-2 px-4 pb-2 text-sm transition-colors ${
              tab === t.key
                ? 'border-blue-600 text-blue-600 font-medium'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Users tab */}
      {tab === 'users' && (
        <div className="overflow-hidden rounded-xl border bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs font-medium uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Phone</th>
                <th className="px-4 py-3 text-left">Role</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {loadingUsers ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-sm text-gray-400">Loading…</td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-sm text-gray-400">No users found</td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{u.name}</td>
                    <td className="px-4 py-3 text-gray-600">{u.email}</td>
                    <td className="px-4 py-3 text-gray-500">{u.phone ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {u.role?.name ?? roles.find((r) => r.id === u.roleId)?.name ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={u.isActive ? 'badge-green' : 'badge-gray'}>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => openEditUser(u)}
                        className="btn-ghost py-1 px-2 text-xs"
                      >
                        <Edit2 size={13} /> Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Roles tab */}
      {tab === 'roles' && (
        <div className="overflow-hidden rounded-xl border bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs font-medium uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left">Role Name</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-right">Permissions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loadingRoles ? (
                <tr>
                  <td colSpan={3} className="py-10 text-center text-sm text-gray-400">Loading…</td>
                </tr>
              ) : roles.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-10 text-center text-sm text-gray-400">No roles found</td>
                </tr>
              ) : (
                roles.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{r.name}</td>
                    <td className="px-4 py-3">
                      {r.isSystem ? (
                        <span className="badge badge-blue">System</span>
                      ) : (
                        <span className="badge badge-gray">Custom</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-gray-600">
                      {r.permissions?.length ?? 0}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Invite User Modal */}
      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="card w-full max-w-md p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Invite User</h2>
              <button onClick={() => setShowInvite(false)} className="btn-ghost p-1">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  className="input"
                  value={inviteForm.name}
                  onChange={(e) => setInviteForm((f) => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  className="input"
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm((f) => ({ ...f, email: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Phone</label>
                <input
                  className="input"
                  type="tel"
                  value={inviteForm.phone}
                  onChange={(e) => setInviteForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Role <span className="text-red-500">*</span>
                </label>
                <select
                  className="input"
                  value={inviteForm.roleId}
                  onChange={(e) => setInviteForm((f) => ({ ...f, roleId: e.target.value }))}
                  required
                >
                  <option value="">— Select role —</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowInvite(false)} className="btn-ghost">
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={inviting}>
                  {inviting ? 'Inviting…' : 'Send Invite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="card w-full max-w-md p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Edit User</h2>
              <button onClick={() => setEditUser(null)} className="btn-ghost p-1">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveUser} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Full Name</label>
                <input
                  className="input"
                  value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Phone</label>
                <input
                  className="input"
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Role</label>
                <select
                  className="input"
                  value={editForm.roleId}
                  onChange={(e) => setEditForm((f) => ({ ...f, roleId: e.target.value }))}
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-dashed p-3">
                <div>
                  <p className="text-sm font-medium text-gray-700">Account Status</p>
                  <p className="text-xs text-gray-400">
                    Currently <strong>{editUser.isActive ? 'active' : 'inactive'}</strong>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDeactivate}
                  disabled={saving}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    editUser.isActive
                      ? 'bg-red-50 text-red-600 hover:bg-red-100'
                      : 'bg-green-50 text-green-600 hover:bg-green-100'
                  }`}
                >
                  {editUser.isActive ? (
                    <><UserX size={13} /> Deactivate</>
                  ) : (
                    <><UserCheck size={13} /> Activate</>
                  )}
                </button>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setEditUser(null)} className="btn-ghost">
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Role Modal */}
      {showAddRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="card w-full max-w-md p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Add Role</h2>
              <button onClick={() => setShowAddRole(false)} className="btn-ghost p-1">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddRole} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Role Name <span className="text-red-500">*</span>
                </label>
                <input
                  className="input"
                  placeholder="e.g. Pharmacist, Cashier, Manager"
                  value={roleForm.name}
                  onChange={(e) => setRoleForm((f) => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Permissions (JSON array)
                </label>
                <textarea
                  className="input min-h-[100px] font-mono text-xs resize-y"
                  placeholder={`["read:sales", "write:inventory", "read:reports"]`}
                  value={roleForm.permissions}
                  onChange={(e) => setRoleForm((f) => ({ ...f, permissions: e.target.value }))}
                />
                <p className="mt-1 text-xs text-gray-400">
                  Enter a JSON array of permission strings. Leave empty for no permissions.
                </p>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowAddRole(false)} className="btn-ghost">
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={savingRole}>
                  {savingRole ? 'Creating…' : 'Create Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
