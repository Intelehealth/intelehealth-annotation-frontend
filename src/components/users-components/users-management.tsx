'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Plus,
  Search,
  Users,
  Calendar,
  Loader2,
  User,
  Mail,
  Shield,
  ShieldCheck,
  X,
  Lock,
  Check,
  Edit2,
  Trash2,
  AlertTriangle,
  UserCheck,
  UserMinus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usersAPI, UserResponse } from '@/lib/api/users';
import { useToast } from '@/components/ui/toast';
import { useSearchParams } from 'next/navigation';

export function UsersManagement() {
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<UserResponse[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Add User Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePermissions, setInvitePermissions] = useState({
    read: true,
    write: true,
    modify: true,
  });
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');

  // Side Drawer State
  const [selectedUser, setSelectedUser] = useState<UserResponse | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerPermissions, setDrawerPermissions] = useState({
    read: true,
    write: true,
    modify: true,
  });
  const [isSavingDrawer, setIsSavingDrawer] = useState(false);
  const [drawerError, setDrawerError] = useState('');

  // Delete Confirmation State
  const [userToDelete, setUserToDelete] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (searchParams && searchParams.get('add') === 'true') {
      setIsModalOpen(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredUsers(users);
    } else {
      const filtered = users.filter(
        (user) =>
          user.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.role?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.status?.toLowerCase().includes(searchQuery.toLowerCase()),
      );
      setFilteredUsers(filtered);
    }
  }, [searchQuery, users]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await usersAPI.getAll();
      setUsers(data);
      setFilteredUsers(data);
    } catch (err) {
      setError('Failed to load users');
      showToast({
        title: 'Error',
        description: 'Failed to load users',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    try {
      setIsInviting(true);
      setInviteError('');
      await usersAPI.create({
        email: inviteEmail.trim(),
        role: 'ANNOTATOR',
        permissions: invitePermissions,
      });

      showToast({
        title: 'Success',
        description: 'User invited successfully',
        type: 'success',
      });

      // Reset Form & Close Modal
      setInviteEmail('');
      setInvitePermissions({ read: true, write: true, modify: true });
      setIsModalOpen(false);
      
      // Reload user list
      await loadUsers();
    } catch (err: any) {
      console.error('Invite error:', err);
      const msg = err.response?.data?.message || 'Failed to invite user';
      setInviteError(msg);
    } finally {
      setIsInviting(false);
    }
  };

  const handleRowClick = (user: UserResponse) => {
    setSelectedUser(user);
    setDrawerPermissions({
      read: user.permissions?.read ?? true,
      write: user.permissions?.write ?? true,
      modify: user.permissions?.modify ?? true,
    });
    setDrawerError('');
    setIsDrawerOpen(true);
  };

  const handleSaveChanges = async () => {
    if (!selectedUser) return;

    try {
      setIsSavingDrawer(true);
      setDrawerError('');
      const updated = await usersAPI.update(selectedUser._id, {
        permissions: drawerPermissions,
      });

      showToast({
        title: 'Success',
        description: 'User permissions updated successfully',
        type: 'success',
      });

      // Update state locally
      setUsers((prev) => prev.map((u) => (u._id === selectedUser._id ? updated : u)));
      setSelectedUser(updated);
      setIsDrawerOpen(false);
    } catch (err: any) {
      console.error('Save permissions error:', err);
      setDrawerError(err.response?.data?.message || 'Failed to save changes');
    } finally {
      setIsSavingDrawer(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!selectedUser) return;
    const currentStatus = selectedUser.status || 'ACTIVE';
    const nextStatus = currentStatus === 'DISABLED' ? 'ACTIVE' : 'DISABLED';

    try {
      setIsSavingDrawer(true);
      setDrawerError('');
      const updated = await usersAPI.updateStatus(selectedUser._id, nextStatus);

      showToast({
        title: 'Success',
        description: `User account ${nextStatus === 'DISABLED' ? 'disabled' : 'enabled'} successfully`,
        type: 'success',
      });

      // Update state locally
      setUsers((prev) => prev.map((u) => (u._id === selectedUser._id ? updated : u)));
      setSelectedUser(updated);
    } catch (err: any) {
      console.error('Status toggle error:', err);
      setDrawerError(err.response?.data?.message || 'Failed to change status');
    } finally {
      setIsSavingDrawer(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    try {
      setLoading(true);
      await usersAPI.delete(id);

      showToast({
        title: 'Success',
        description: 'User deleted successfully',
        type: 'success',
      });

      setIsDrawerOpen(false);
      setSelectedUser(null);
      setUserToDelete(null);
      await loadUsers();
    } catch (err: any) {
      console.error('Delete error:', err);
      showToast({
        title: 'Error',
        description: err.response?.data?.message || 'Failed to delete user',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getRoleBadge = (role: string) => {
    const isLAdmin = role?.toUpperCase() === 'ADMIN';
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider border',
          isLAdmin
            ? 'bg-purple-50 text-purple-700 border-purple-200'
            : 'bg-blue-50 text-blue-700 border-blue-200'
        )}
      >
        {isLAdmin ? <ShieldCheck className="h-3. w-3" /> : <Shield className="h-3. w-3" />}
        {isLAdmin ? 'Admin' : 'Annotator'}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const s = status?.toUpperCase() || 'ACTIVE';
    switch (s) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
            Active
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
            Pending
          </span>
        );
      case 'DISABLED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
            <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
            Disabled
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 min-h-0 relative">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Users</h1>
          <p className="text-gray-600 mt-1">
            Manage platform users, roles, and default permissions.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500 font-medium">
            {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''}
          </span>
          <Button
            onClick={() => setIsModalOpen(true)}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md flex items-center gap-2 rounded-xl h-10 px-4 text-sm font-semibold transition-all duration-200 hover:shadow-lg"
          >
            <Plus className="h-4 w-4" />
            Add User
          </Button>
        </div>
      </div>

      {/* Search & Toolbar */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search users by name, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-10 border-2 border-gray-200 rounded-xl focus:border-blue-500 transition-colors bg-white shadow-sm text-sm"
          />
        </div>
      </div>

      {/* Users Table */}
      <Card className="border-gray-100 shadow-sm rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-slate-50/75 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider">
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-sm text-gray-700">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-gray-400">
                    <Users className="h-12 w-12 mx-auto text-gray-200 mb-3" />
                    <p className="font-medium">No users found</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const hasName = user.firstName || user.lastName;
                  return (
                    <tr
                      key={user._id}
                      onClick={() => handleRowClick(user)}
                      className="hover:bg-slate-50/50 cursor-pointer transition-colors group"
                    >
                      <td className="px-6 py-4 font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {hasName ? `${user.firstName} ${user.lastName}`.trim() : 'Invited User'}
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-600">{user.email}</td>
                      <td className="px-6 py-4">{getRoleBadge(user.role)}</td>
                      <td className="px-6 py-4">{getStatusBadge(user.status)}</td>
                      <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRowClick(user)}
                          className="text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Invite Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => !isInviting && setIsModalOpen(false)}
          />
          <div className="relative bg-white w-full max-w-md p-6 rounded-2xl shadow-xl border border-gray-100 m-4 overflow-hidden z-10 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900 tracking-tight">Invite User</h3>
              <button
                disabled={isInviting}
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 h-8 w-8 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {inviteError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-sm text-red-600 font-medium flex items-center gap-2">
                  <span className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0" />
                  {inviteError}
                </p>
              </div>
            )}

            <form onSubmit={handleInviteSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-semibold text-gray-700">Email Address *</Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <Input
                    id="email"
                    type="email"
                    required
                    placeholder="raksha@gmail.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="pl-12 h-11 border-2 border-gray-200 focus:border-blue-500 rounded-xl text-sm"
                    disabled={isInviting}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700">Role *</Label>
                <Input
                  value="Annotator"
                  disabled
                  className="h-11 border-2 border-gray-100 bg-gray-50 rounded-xl font-medium text-gray-600"
                />
              </div>

              <div className="space-y-3 pt-2 border-t border-gray-100">
                <Label className="text-sm font-semibold text-gray-700">Permissions</Label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: 'read', label: 'Read' },
                    { key: 'write', label: 'Write' },
                    { key: 'modify', label: 'Modify' },
                  ].map((p) => {
                    const isChecked = invitePermissions[p.key as keyof typeof invitePermissions];
                    return (
                      <label
                        key={p.key}
                        className={cn(
                          'flex items-center gap-2 p-2.5 border rounded-xl cursor-pointer select-none transition-colors hover:bg-slate-50',
                          isChecked ? 'border-blue-200 bg-blue-50/10 font-bold text-blue-950' : 'border-gray-100 text-gray-500'
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          disabled={isInviting}
                          onChange={(e) => {
                            setInvitePermissions((prev) => ({
                              ...prev,
                              [p.key]: e.target.checked,
                            }));
                          }}
                          className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                        />
                        <span className="text-xs">{p.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isInviting}
                  className="flex-1 rounded-xl h-11 border-2"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isInviting}
                  className="flex-1 rounded-xl h-11 bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md"
                >
                  {isInviting ? 'Inviting...' : 'Invite User'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Side Details Drawer */}
      {isDrawerOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Drawer Backdrop */}
          <div
            className="absolute inset-0 bg-slate-900/30 backdrop-blur-xs transition-opacity"
            onClick={() => !isSavingDrawer && setIsDrawerOpen(false)}
          />

          {/* Drawer Panel */}
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-bold text-gray-950">User Details</h3>
                <p className="text-xs text-gray-500 mt-0.5">View and manage user properties</p>
              </div>
              <button
                disabled={isSavingDrawer}
                onClick={() => setIsDrawerOpen(false)}
                className="text-gray-400 hover:text-gray-600 h-8 w-8 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {drawerError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 font-medium flex items-center gap-2">
                  <span className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0" />
                  {drawerError}
                </div>
              )}

              {/* Status & Name Card */}
              <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-400 tracking-wider uppercase">Account Status</span>
                  {getStatusBadge(selectedUser.status)}
                </div>
                <div>
                  <h4 className="text-lg font-bold text-gray-900">
                    {selectedUser.firstName || selectedUser.lastName
                      ? `${selectedUser.firstName} ${selectedUser.lastName}`.trim()
                      : 'Invited User'}
                  </h4>
                  <span className="text-sm text-gray-500 font-medium flex items-center gap-1.5 mt-1">
                    <Mail className="h-4 w-4 text-gray-400" />
                    {selectedUser.email}
                  </span>
                </div>
              </div>

              {/* Properties Section */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-gray-400 tracking-wider uppercase block">Platform Role</span>
                  <div className="flex">{getRoleBadge(selectedUser.role)}</div>
                </div>

                <div className="space-y-3 pt-3 border-t border-gray-100">
                  <span className="text-xs font-bold text-gray-400 tracking-wider uppercase block">Permissions</span>
                  
                  {selectedUser.role?.toUpperCase() === 'ADMIN' ? (
                    <div className="p-3 bg-purple-50/50 border border-purple-100 rounded-xl text-xs text-purple-950 font-medium leading-relaxed">
                      Administrators always have full platform permissions (Read, Write, Modify) and cannot be restricted.
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { key: 'read', label: 'Read' },
                        { key: 'write', label: 'Write' },
                        { key: 'modify', label: 'Modify' },
                      ].map((p) => {
                        const isChecked = drawerPermissions[p.key as keyof typeof drawerPermissions];
                        return (
                          <label
                            key={p.key}
                            className={cn(
                              'flex items-center gap-2 p-2.5 border rounded-xl cursor-pointer select-none transition-colors hover:bg-slate-50',
                              isChecked ? 'border-blue-200 bg-blue-50/10 font-bold text-blue-950' : 'border-gray-100 text-gray-500'
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              disabled={isSavingDrawer}
                              onChange={(e) => {
                                setDrawerPermissions((prev) => ({
                                  ...prev,
                                  [p.key]: e.target.checked,
                                }));
                              }}
                              className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                            />
                            <span className="text-xs">{p.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Drawer Actions Footer */}
            <div className="p-6 border-t border-gray-100 bg-slate-50/50 space-y-3">
              {selectedUser.role?.toUpperCase() !== 'ADMIN' && (
                <div className="flex gap-3">
                  <Button
                    onClick={handleSaveChanges}
                    disabled={isSavingDrawer}
                    className="flex-1 rounded-xl h-11 bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm"
                  >
                    {isSavingDrawer ? 'Saving...' : 'Save Changes'}
                  </Button>

                  <Button
                    onClick={handleToggleStatus}
                    disabled={isSavingDrawer}
                    variant="outline"
                    className={cn(
                      'flex-1 rounded-xl h-11 border-2 font-semibold flex items-center gap-2 bg-white',
                      selectedUser.status === 'DISABLED'
                        ? 'text-green-600 hover:bg-green-50 hover:text-green-700 border-green-100'
                        : 'text-amber-600 hover:bg-amber-50 hover:text-amber-700 border-amber-100'
                    )}
                  >
                    {selectedUser.status === 'DISABLED' ? (
                      <>
                        <UserCheck className="h-4 w-4" />
                        Enable User
                      </>
                    ) : (
                      <>
                        <UserMinus className="h-4 w-4" />
                        Disable User
                      </>
                    )}
                  </Button>
                </div>
              )}

              {selectedUser.role?.toUpperCase() !== 'ADMIN' && (
                <Button
                  onClick={() => setUserToDelete(selectedUser._id)}
                  disabled={isSavingDrawer}
                  variant="ghost"
                  className="w-full rounded-xl h-11 text-red-600 hover:bg-red-50 hover:text-red-700 font-semibold border border-dashed border-red-200 flex items-center justify-center gap-2 bg-white/70"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete User
                </Button>
              )}

              {selectedUser.role?.toUpperCase() === 'ADMIN' && (
                <div className="text-center p-3 bg-gray-100/50 rounded-xl text-xs text-gray-500 font-semibold">
                  This is the platform administrator account. It cannot be modified, disabled, or deleted.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {userToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs"
            onClick={() => setUserToDelete(null)}
          />
          <div className="relative bg-white w-full max-w-sm p-6 rounded-2xl shadow-xl border border-gray-100 m-4 overflow-hidden z-10 text-center animate-in fade-in zoom-in duration-200">
            <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h4 className="text-lg font-bold text-gray-950 mb-2">Delete User Account?</h4>
            <p className="text-xs text-gray-500 leading-relaxed mb-6">
              Are you sure you want to permanently delete this user account? This action cannot be undone. All dataset assignments for this user will be removed.
            </p>
            <div className="flex gap-3">
              <Button
                onClick={() => setUserToDelete(null)}
                variant="outline"
                className="flex-1 rounded-xl h-11 border-2 font-semibold"
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleDeleteUser(userToDelete)}
                className="flex-1 rounded-xl h-11 bg-red-600 hover:bg-red-700 text-white font-semibold shadow-sm"
              >
                Delete User
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
