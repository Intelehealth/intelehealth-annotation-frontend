'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Copy,
  UserPlus,
  ChevronsUpDown,
  X,
  Loader2,
  Users,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Shield,
  ArrowRight,
  ArrowLeft,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usersAPI, UserResponse } from '@/lib/api/users';
import { datasetsAPI } from '@/lib/api/datasets';
import { useToast } from '@/components/ui/toast';
import {
  CLONE_MIN_ANNOTATORS,
  CLONE_MAX_ANNOTATORS,
  isOddCount,
} from '@/types/feature1';

interface CloneAssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  datasetId: string;
  datasetName: string;
}

export function CloneAssignModal({
  isOpen,
  onClose,
  onSuccess,
  datasetId,
  datasetName,
}: CloneAssignModalProps) {
  const { showToast } = useToast();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [allUsers, setAllUsers] = useState<UserResponse[]>([]);
  const [selected, setSelected] = useState<UserResponse[]>([]);
  const [workloads, setWorkloads] = useState<Record<string, number>>({});
  const [comboOpen, setComboOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [createdCount, setCreatedCount] = useState(0);

  // Step 2: Permissions state
  const [permissions, setPermissions] = useState({
    read: true,
    write: true,
    modify: true,
  });

  // Reset state each time the modal opens
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setSelected([]);
      setIsDone(false);
      setCreatedCount(0);
      setSearchValue('');
      setPermissions({ read: true, write: true, modify: true });
      loadUsers();
    }
  }, [isOpen]);

  const loadUsers = async () => {
    try {
      setLoadingUsers(true);
      const [users, datasets] = await Promise.all([
        usersAPI.getAll(),
        datasetsAPI.getAll().catch(() => []),
      ]);

      // Only non-admin users can be annotators
      const annotatorList = users.filter((u) => u.role?.toUpperCase() !== 'ADMIN');
      setAllUsers(annotatorList);

      // Count active clone datasets per annotator to compute workload
      const cloneDatasets = datasets.filter((d: any) => d.isClone && d.isActive && !d.isDeleted);
      const workloadMap: Record<string, number> = {};
      cloneDatasets.forEach((c: any) => {
        const uid = c.assignedAnnotatorId || c.cloneAssignedTo || c.userId;
        if (uid) {
          const uidStr = uid.toString();
          workloadMap[uidStr] = (workloadMap[uidStr] || 0) + 1;
        }
      });
      setWorkloads(workloadMap);
    } catch {
      showToast({ title: 'Error', description: 'Failed to load users', type: 'error' });
    } finally {
      setLoadingUsers(false);
    }
  };

  // Users not yet selected
  const available = allUsers.filter((u) => !selected.find((s) => s._id === u._id));

  const addUser = (user: UserResponse) => {
    if (selected.length >= CLONE_MAX_ANNOTATORS) return;
    setSelected((prev) => [...prev, user]);
    setComboOpen(false);
    setSearchValue('');
  };

  const removeUser = (userId: string) => {
    setSelected((prev) => prev.filter((u) => u._id !== userId));
  };

  const handleConfirm = async () => {
    if (selected.length < CLONE_MIN_ANNOTATORS) return;

    try {
      setIsSubmitting(true);
      const result = await datasetsAPI.cloneAndAssign(
        datasetId,
        selected.map((u) => u._id),
        permissions,
      );
      setCreatedCount(result.tasksCreated ?? selected.length);
      setIsDone(true);
      onSuccess?.();
      showToast({
        title: 'Tasks assigned',
        description: `"${datasetName}" assigned to ${selected.length} annotators.`,
        type: 'success',
      });
    } catch (err: any) {
      const msg: string = err?.response?.data?.message || '';
      const isDuplicate =
        msg.toLowerCase().includes('duplicate') ||
        msg.toLowerCase().includes('already assigned') ||
        err?.response?.status === 409;

      showToast({
        title: isDuplicate ? 'Already assigned' : 'Assignment failed',
        description: isDuplicate
          ? 'One or more selected annotators are already assigned to this dataset.'
          : msg || 'An unexpected error occurred. Please try again.',
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    onClose();
  };

  const count = selected.length;
  const canAdd = count < CLONE_MAX_ANNOTATORS;
  const canGoToStep2 = count >= CLONE_MIN_ANNOTATORS;
  const showEvenWarning = count >= CLONE_MIN_ANNOTATORS && !isOddCount(count);

  const getWorkloadBadgeClass = (userId: string) => {
    const tasks = workloads[userId] || 0;
    if (tasks === 0) return 'bg-green-50 text-green-700 border-green-100';
    if (tasks <= 2) return 'bg-blue-50 text-blue-700 border-blue-100';
    return 'bg-amber-50 text-amber-700 border-amber-100';
  };

  // ── Success state ────────────────────────────────────────────────────────────
  if (isDone) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center py-6 text-center">
            <div className="p-3 bg-green-100 rounded-full mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Dataset Assigned!</h3>
            <p className="text-sm text-gray-600 mb-1">
              <span className="font-medium">&ldquo;{datasetName}&rdquo;</span> has been assigned
              to <span className="font-medium">{createdCount} annotators</span>.
            </p>
            <p className="text-xs text-gray-500 mb-5">
              Each annotator has their own isolated copy and cannot see others&apos; work.
              Use <strong>Consensus Review</strong> after all annotators finish.
            </p>
            <div className="flex flex-wrap gap-2 justify-center mb-6">
              {selected.map((a) => (
                <span
                  key={a._id}
                  className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200"
                >
                  {a.firstName} {a.lastName}
                </span>
              ))}
            </div>
            <Button onClick={handleClose} className="w-full bg-green-600 hover:bg-green-700 text-white">
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // ── Main Wizard Modal ─────────────────────────────────────────────────────────
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-full">
              {step === 2 ? (
                <Shield className="h-5 w-5 text-blue-600" />
              ) : (
                <Copy className="h-5 w-5 text-blue-600" />
              )}
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold text-gray-900">
                {step === 1 && 'Step 1: Select Annotators'}
                {step === 2 && 'Step 2: Configure Permissions'}
                {step === 3 && 'Step 3: Confirm Handoff'}
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-500 mt-0.5">
                Assigning task clones for <span className="font-semibold text-gray-700">“{datasetName}”</span>
              </DialogDescription>
            </div>
          </div>

          {/* Progress Steps Indicator */}
          <div className="flex items-center space-x-2 mt-4 pt-2 border-t border-gray-100">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex-1 flex items-center space-x-2">
                <div
                  className={cn(
                    'h-1.5 flex-1 rounded-full transition-all duration-300',
                    s <= step ? 'bg-blue-600' : 'bg-gray-200'
                  )}
                />
              </div>
            ))}
          </div>
        </DialogHeader>

        {/* STEP 1: SELECT ANNOTATORS */}
        {step === 1 && (
          <div className="space-y-4 my-2">
            <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
              <p className="text-xs text-blue-700 leading-relaxed">
                Choose between <strong>1 and 5 annotators</strong>. Each annotator will work on their own isolated clone of the dataset. For consensus review, add 2+ annotators to compare answers.
              </p>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-700">Select Annotators</span>
              <span
                className={cn(
                  'text-xs font-medium px-2.5 py-1 rounded-full',
                  count >= CLONE_MIN_ANNOTATORS
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-600'
                )}
              >
                {count} / {CLONE_MAX_ANNOTATORS} selected
              </span>
            </div>

            {showEvenWarning && (
              <div className="flex items-start gap-2 p-2.5 bg-amber-50 border border-amber-100 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">
                  Even counts (e.g. 2, 4) can result in tie votes. Consider adding one more annotator.
                </p>
              </div>
            )}

            {/* ComboBox Picker */}
            <Popover open={comboOpen} onOpenChange={setComboOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  disabled={!canAdd || loadingUsers}
                  className="w-full justify-between h-10 border-gray-200 hover:bg-gray-50 text-gray-700 font-normal"
                >
                  <div className="flex items-center space-x-2">
                    {loadingUsers ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <UserPlus className="h-4 w-4 text-gray-400" />
                    )}
                    <span>
                      {loadingUsers
                        ? 'Loading users...'
                        : canAdd
                        ? 'Search and add annotator...'
                        : `Limit reached (${CLONE_MAX_ANNOTATORS} selected)`}
                    </span>
                  </div>
                  <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[460px] p-0" align="start">
                <Command>
                  <CommandInput
                    placeholder="Search by name or email..."
                    value={searchValue}
                    onValueChange={setSearchValue}
                  />
                  <CommandList className="max-h-52">
                    <CommandEmpty>
                      {allUsers.length === 0
                        ? 'No active annotator accounts found.'
                        : 'No matching users found.'}
                    </CommandEmpty>
                    <CommandGroup heading="Available Annotators">
                      {available.map((user) => {
                        const activeTasks = workloads[user._id] || 0;
                        return (
                          <CommandItem
                            key={user._id}
                            value={`${user.firstName} ${user.lastName} ${user.email}`}
                            onSelect={() => addUser(user)}
                            className="cursor-pointer hover:bg-gray-50"
                          >
                            <div className="flex items-center justify-between w-full">
                              <div className="flex items-center space-x-3 min-w-0">
                                <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-semibold text-blue-600">
                                  {user.firstName[0]}{user.lastName?.[0] ?? ''}
                                </div>
                                <div className="flex flex-col min-w-0">
                                  <span className="text-sm font-medium text-gray-800 truncate">
                                    {user.firstName} {user.lastName}
                                  </span>
                                  <span className="text-xs text-gray-400 truncate">{user.email}</span>
                                </div>
                              </div>
                              <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full border flex-shrink-0 ml-2', getWorkloadBadgeClass(user._id))}>
                                {activeTasks} active task{activeTasks !== 1 ? 's' : ''}
                              </span>
                            </div>
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {/* Selected Annotators List */}
            {selected.length > 0 ? (
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {selected.map((annotator, index) => {
                  const activeTasks = workloads[annotator._id] || 0;
                  return (
                    <div
                      key={annotator._id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 shadow-sm"
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-semibold text-blue-600">
                          {annotator.firstName[0]}{annotator.lastName?.[0] ?? annotator.email[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">
                            {annotator.firstName} {annotator.lastName}
                          </p>
                          <p className="text-xs text-gray-400 truncate">{annotator.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3 flex-shrink-0">
                        <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full border', getWorkloadBadgeClass(annotator._id))}>
                          {activeTasks} task{activeTasks !== 1 ? 's' : ''}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeUser(annotator._id)}
                          className="h-8 w-8 p-0 rounded-full text-gray-400 hover:text-red-600 hover:bg-red-50"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center py-10 text-center text-gray-400 border border-dashed border-gray-200 rounded-xl">
                <Users className="h-10 w-10 mb-2 opacity-40 text-gray-300" />
                <p className="text-sm">No annotators selected yet</p>
                <p className="text-xs mt-1">Add annotators from the dropdown above</p>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: CONFIGURE PERMISSIONS */}
        {step === 2 && (
          <div className="space-y-4 my-2">
            <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg">
              <p className="text-xs text-indigo-700 leading-relaxed">
                Configure what actions the annotators are allowed to perform on their isolated copies. This enforces the User Permission Model.
              </p>
            </div>

            <div className="space-y-3">
              {/* READ PERMISSION (Locked/Required) */}
              <div className="flex items-start p-3 bg-gray-50 border border-gray-100 rounded-xl">
                <div className="flex items-center h-5 mt-0.5">
                  <input
                    type="checkbox"
                    id="perm-read"
                    checked={permissions.read}
                    disabled
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded accent-blue-600"
                  />
                </div>
                <div className="ml-3">
                  <label htmlFor="perm-read" className="text-sm font-semibold text-gray-800 flex items-center">
                    Read Permission
                    <span className="ml-2 text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-semibold">REQUIRED</span>
                  </label>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Allows the annotator to view rows and see available columns.
                  </p>
                </div>
              </div>

              {/* WRITE PERMISSION */}
              <div
                onClick={() => setPermissions((p) => ({ ...p, write: !p.write }))}
                className={cn(
                  'flex items-start p-3 border rounded-xl cursor-pointer transition-all duration-200',
                  permissions.write ? 'bg-white border-blue-200 shadow-sm' : 'bg-gray-50/50 border-gray-100 opacity-80'
                )}
              >
                <div className="flex items-center h-5 mt-0.5">
                  <input
                    type="checkbox"
                    id="perm-write"
                    checked={permissions.write}
                    onChange={() => {}} // handled by parent click
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded accent-blue-600"
                  />
                </div>
                <div className="ml-3">
                  <label htmlFor="perm-write" className="text-sm font-semibold text-gray-800">
                    Write Permission
                  </label>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Allows the annotator to enter, edit, and save annotations in the workbench.
                  </p>
                </div>
              </div>

              {/* MODIFY PERMISSION */}
              <div
                onClick={() => setPermissions((p) => ({ ...p, modify: !p.modify }))}
                className={cn(
                  'flex items-start p-3 border rounded-xl cursor-pointer transition-all duration-200',
                  permissions.modify ? 'bg-white border-blue-200 shadow-sm' : 'bg-gray-50/50 border-gray-100 opacity-80'
                )}
              >
                <div className="flex items-center h-5 mt-0.5">
                  <input
                    type="checkbox"
                    id="perm-modify"
                    checked={permissions.modify}
                    onChange={() => {}} // handled by parent click
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded accent-blue-600"
                  />
                </div>
                <div className="ml-3">
                  <label htmlFor="perm-modify" className="text-sm font-semibold text-gray-800">
                    Modify Permission
                  </label>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Allows the annotator to update/overwrite rows that were previously marked as completed.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: CONFIRM HANDOFF */}
        {step === 3 && (
          <div className="space-y-4 my-2">
            <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg text-xs text-emerald-800 leading-relaxed">
              Ready to assign tasks. Confirming this action will lock the parent dataset configuration and generate physical copies for the annotators.
            </div>

            <div className="border border-gray-100 rounded-xl p-4 bg-gray-50 space-y-3">
              <div>
                <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400">Target Dataset</p>
                <p className="text-sm font-semibold text-gray-800">{datasetName}</p>
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400">Assigned Annotators ({selected.length})</p>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {selected.map((a) => (
                    <span key={a._id} className="inline-flex items-center px-2 py-0.5 rounded bg-white text-xs font-semibold text-gray-700 border border-gray-150">
                      {a.firstName} {a.lastName}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400">Assigned Permissions</p>
                <div className="flex gap-2 mt-1">
                  {Object.entries(permissions).map(([perm, val]) => (
                    <span
                      key={perm}
                      className={cn(
                        'text-[10px] px-2 py-0.5 rounded font-bold uppercase border',
                        val ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-gray-100 text-gray-400 border-gray-200'
                      )}
                    >
                      {perm}: {val ? 'YES' : 'NO'}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="border-t border-gray-100 pt-4 mt-2">
          {step === 1 && (
            <>
              <Button variant="outline" onClick={handleClose} disabled={isSubmitting} className="border-gray-200 hover:bg-gray-50 text-gray-700">
                Cancel
              </Button>
              <Button
                onClick={() => setStep(2)}
                disabled={!canGoToStep2}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:opacity-50"
              >
                Next: Set Permissions
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </>
          )}

          {step === 2 && (
            <>
              <Button variant="outline" onClick={() => setStep(1)} className="border-gray-200 hover:bg-gray-50 text-gray-700">
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                Back
              </Button>
              <Button
                onClick={() => setStep(3)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              >
                Next: Confirm Summary
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </>
          )}

          {step === 3 && (
            <>
              <Button variant="outline" onClick={() => setStep(2)} disabled={isSubmitting} className="border-gray-200 hover:bg-gray-50 text-gray-700">
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                Back
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={isSubmitting}
                className="bg-green-600 hover:bg-green-700 text-white font-semibold shadow-sm hover:shadow"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Assigning...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-1.5" />
                    Confirm &amp; Assign
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}