'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { notificationsAPI, NotificationResponse } from '@/lib/api/notifications';
import { datasetsAPI } from '@/lib/api/datasets';
import { consensusAPI } from '@/lib/api/consensus';
import { useToast } from '@/components/ui/toast';
import {
  Settings,
  ChevronLeft,
  ChevronRight,
  Database,
  User,
  Bell,
  LogOut,
  LayoutDashboard,
  Users,
  ClipboardList,
  Upload,
  FileText,
  Wand2,
  Scale,
  BookOpen,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

function timeAgo(dateStr: string): string {
  const now = new Date();
  const t = new Date(dateStr);
  const mins = Math.floor((now.getTime() - t.getTime()) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
  return `${Math.floor(mins / 1440)}d ago`;
}

interface SidebarProps {
  className?: string;
  forceCollapsed?: boolean;
}

export function Sidebar({ className, forceCollapsed = false }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(forceCollapsed);
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { showToast } = useToast();

  const [notifications, setNotifications] = useState<NotificationResponse[]>([]);
  const [datasetName, setDatasetName] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [annotatorCount, setAnnotatorCount] = useState<number>(0);

  // Extract active dataset ID from path
  const pathParts = pathname?.split('/') || [];
  const isDatasetRoute = pathParts[1] === 'dataset' && pathParts[2] && pathParts[2] !== 'add-dataset';
  const datasetId = isDatasetRoute ? pathParts[2] : null;

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const list = await notificationsAPI.getAll();
      setNotifications(list);
    } catch (err) {
      console.error('Failed to load notifications', err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const timer = setInterval(fetchNotifications, 15000);
      return () => clearInterval(timer);
    }
  }, [user]);

  // Load dataset name if in dataset context
  useEffect(() => {
    const loadDatasetName = async () => {
      if (datasetId) {
        try {
          const data = await datasetsAPI.getById(datasetId);
          setDatasetName(data.name);
          // Try to get clone group to count annotators
          try {
            const cloneGroup = await datasetsAPI.getCloneGroup(datasetId);
            const annotators = cloneGroup?.clones?.filter((c: any) => c.isClone) || [];
            setAnnotatorCount(annotators.length);
          } catch {
            setAnnotatorCount(0);
          }
        } catch (error) {
          console.error('Error fetching dataset name for sidebar:', error);
          setDatasetName('Untitled Dataset');
        }
      } else {
        setDatasetName('');
        setAnnotatorCount(0);
      }
    };
    loadDatasetName();
  }, [datasetId]);

  const handleGenerateConsensus = async () => {
    if (!datasetId) return;
    try {
      setIsGenerating(true);
      const result = await consensusAPI.generate(datasetId);
      showToast({
        title: 'Consensus generated!',
        description: `${result.reviewsCreated} row${result.reviewsCreated !== 1 ? 's' : ''} compared. Opening review…`,
        type: 'success',
      });
      router.push(`/dataset/${datasetId}/consensus`);
    } catch (err: any) {
      const rawMsg: string = err?.response?.data?.message || err?.message || '';
      showToast({
        title: 'Cannot generate consensus',
        description: rawMsg || 'Ensure annotators have completed their tasks.',
        type: 'error',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationsAPI.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const effectiveCollapsed = forceCollapsed || isCollapsed;
  const isAdmin = user?.role?.toUpperCase() === 'ADMIN';
  const isInvited = user?.invitedByAdmin !== false;

  return (
    <aside
      className={cn(
        'bg-white border-r border-gray-200/80 flex flex-col h-screen transition-all duration-300 shadow-sm flex-shrink-0',
        effectiveCollapsed ? 'w-20' : 'w-72',
        className,
      )}
    >
      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className={cn('flex items-center space-x-3', effectiveCollapsed && 'hidden')}>
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
              <Database className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">DataAnnotate</h2>
              <p className="text-xs text-gray-500">Annotation platform</p>
            </div>
          </div>
          {!forceCollapsed && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="h-8 w-8 rounded-lg hover:bg-gray-100 transition-colors"
            >
              {effectiveCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
      </div>

      {/* User Profile Section */}
      <div className="p-4 border-b border-gray-100">
        <div
          className={cn(
            'flex items-center space-x-3 p-3 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100/50',
            effectiveCollapsed && 'justify-center',
          )}
        >
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center flex-shrink-0">
            <User className="h-5 w-5 text-white" />
          </div>
          {!effectiveCollapsed && (
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {user?.firstName} {user?.lastName}
                </p>
                {user?.role && (
                  <span
                    className={cn(
                      'px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider',
                      isAdmin
                        ? 'bg-purple-100 text-purple-700 border border-purple-200'
                        : 'bg-blue-100 text-blue-700 border border-blue-200',
                    )}
                  >
                    {isAdmin ? 'Admin' : 'Annotator'}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
          )}
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto min-h-0">
        {/* DASHBOARD */}
        <Link
          href="/dashboard"
          className={cn(
            'w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl transition-all duration-200 text-left group',
            pathname === '/dashboard'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md transform scale-[1.02]'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
            effectiveCollapsed && 'justify-center px-2',
          )}
        >
          <LayoutDashboard className={cn('h-5 w-5 flex-shrink-0', pathname === '/dashboard' ? 'text-white' : 'text-gray-400 group-hover:text-gray-600')} />
          {!effectiveCollapsed && <span className="font-medium text-sm">Dashboard</span>}
        </Link>

        {/* ADMIN SIDEBAR SECTIONS */}
        {isAdmin ? (
          <>
            {/* DATASETS SECTION */}
            <div className="pt-2">
              <Link
                href="/dataset"
                className={cn(
                  'w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl transition-all duration-200 text-left group',
                  pathname === '/dataset' && !datasetId
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md transform scale-[1.02]'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                  effectiveCollapsed && 'justify-center px-2',
                )}
              >
                <Database className={cn('h-5 w-5 flex-shrink-0', pathname === '/dataset' && !datasetId ? 'text-white' : 'text-gray-400 group-hover:text-gray-600')} />
                {!effectiveCollapsed && <span className="font-medium text-sm">Datasets</span>}
              </Link>

              {/* Dataset sub-menu when a dataset is active */}
              {datasetId && !effectiveCollapsed && (
                <div className="ml-4 pl-3 border-l border-gray-150 mt-1.5 space-y-1 animate-slideDown">
                  <div className="px-2.5 py-1 mb-1 text-[11px] font-bold text-indigo-600 truncate max-w-[200px]" title={datasetName}>
                    ACTIVE: {datasetName}
                  </div>
                  
                  {/* Data Overview */}
                  <button
                    onClick={() => router.push(`/dataset/${datasetId}?tab=overview`)}
                    className={cn(
                      'w-full flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors text-left',
                      pathname === `/dataset/${datasetId}` && (!pathname.includes('tab') || pathname.includes('tab=overview'))
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                    )}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0" />
                    <span>Data Overview</span>
                  </button>

                  {/* Upload */}
                  <button
                    onClick={() => router.push(`/dataset/${datasetId}?tab=upload`)}
                    className={cn(
                      'w-full flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors text-left',
                      pathname === `/dataset/${datasetId}` && pathname.includes('tab=upload')
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                    )}
                  >
                    <Upload className="h-3.5 w-3.5 text-gray-400" />
                    <span>Upload</span>
                  </button>

                  {/* Field Configuration */}
                  <button
                    onClick={() => router.push(`/dataset/${datasetId}?tab=field-configuration`)}
                    className={cn(
                      'w-full flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors text-left',
                      pathname === `/dataset/${datasetId}` && pathname.includes('tab=field-configuration')
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                    )}
                  >
                    <FileText className="h-3.5 w-3.5 text-gray-400" />
                    <span>Field Configuration</span>
                  </button>

                  {/* Settings */}
                  <button
                    onClick={() => router.push(`/dataset/${datasetId}?tab=settings`)}
                    className={cn(
                      'w-full flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors text-left',
                      pathname === `/dataset/${datasetId}` && pathname.includes('tab=settings')
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                    )}
                  >
                    <Settings className="h-3.5 w-3.5 text-gray-400" />
                    <span>Settings</span>
                  </button>

                  {/* Generate Consensus - only when 2+ annotators */}
                  {annotatorCount >= 2 && (
                    <button
                      onClick={handleGenerateConsensus}
                      disabled={isGenerating}
                      className="w-full flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-900 disabled:opacity-50 transition-colors text-left"
                    >
                      {isGenerating ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400" />
                      ) : (
                        <Wand2 className="h-3.5 w-3.5 text-gray-400" />
                      )}
                      <span>Generate Consensus</span>
                    </button>
                  )}

                  {/* Review Consensus - only when 2+ annotators */}
                  {annotatorCount >= 2 && (
                    <Link
                      href={`/dataset/${datasetId}/consensus`}
                      className={cn(
                        'w-full flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors text-left block',
                        pathname === `/dataset/${datasetId}/consensus`
                          ? 'bg-blue-50 text-blue-700 font-semibold'
                          : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                      )}
                    >
                      <Scale className="h-3.5 w-3.5 text-gray-400" />
                      <span>Review Consensus</span>
                    </Link>
                  )}
                </div>
              )}
            </div>

            {/* REVIEW QUEUE */}
            <Link
              href="/assignments/review"
              className={cn(
                'w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl transition-all duration-200 text-left group',
                pathname === '/assignments/review'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md transform scale-[1.02]'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                effectiveCollapsed && 'justify-center px-2',
              )}
            >
              <ClipboardList className={cn('h-5 w-5 flex-shrink-0', pathname === '/assignments/review' ? 'text-white' : 'text-gray-400 group-hover:text-gray-600')} />
              {!effectiveCollapsed && <span className="font-medium text-sm">Review Queue</span>}
            </Link>

            {/* USERS */}
            <Link
              href="/users"
              className={cn(
                'w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl transition-all duration-200 text-left group',
                pathname === '/users'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md transform scale-[1.02]'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                effectiveCollapsed && 'justify-center px-2',
              )}
            >
              <Users className={cn('h-5 w-5 flex-shrink-0', pathname === '/users' ? 'text-white' : 'text-gray-400 group-hover:text-gray-600')} />
              {!effectiveCollapsed && <span className="font-medium text-sm">Users</span>}
            </Link>
          </>
        ) : isInvited ? (
          /* ANNOTATOR SIDEBAR SECTIONS (invited) */
          <>
            {/* MY TASKS */}
            <Link
              href="/tasks"
              className={cn(
                'w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl transition-all duration-200 text-left group',
                pathname === '/tasks'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md transform scale-[1.02]'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                effectiveCollapsed && 'justify-center px-2',
              )}
            >
              <ClipboardList className={cn('h-5 w-5 flex-shrink-0', pathname === '/tasks' ? 'text-white' : 'text-gray-400 group-hover:text-gray-600')} />
              {!effectiveCollapsed && <span className="font-medium text-sm">My Tasks</span>}
            </Link>
          </>
        ) : (
          /* NON-INVITED USER - No tasks or dataset links */
          <div className="px-4 py-3 text-xs text-gray-400 italic">
            {!effectiveCollapsed && 'You are not invited by administrator.'}
          </div>
        )}

        {/* PROFILE SETTINGS */}
        <Link
          href="/profile"
          className={cn(
            'w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl transition-all duration-200 text-left group',
            pathname === '/profile'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md transform scale-[1.02]'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
            effectiveCollapsed && 'justify-center px-2',
          )}
        >
          <Settings className={cn('h-5 w-5 flex-shrink-0', pathname === '/profile' ? 'text-white' : 'text-gray-400 group-hover:text-gray-600')} />
          {!effectiveCollapsed && <span className="font-medium text-sm">Profile Settings</span>}
        </Link>

        {/* NOTIFICATIONS (Popover Trigger) */}
        <Popover>
          <PopoverTrigger asChild>
            <button
              className={cn(
                'w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl transition-all duration-200 text-left text-gray-600 hover:bg-gray-50 hover:text-gray-900 relative group',
                effectiveCollapsed && 'justify-center px-2',
              )}
            >
              <div className="relative flex items-center flex-shrink-0">
                <Bell className="h-5 w-5 text-gray-400 group-hover:text-gray-600" />
                {notifications.filter(n => !n.isRead).length > 0 && (
                  <span className="absolute -top-1.5 -left-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white shadow-sm animate-pulse">
                    {notifications.filter(n => !n.isRead).length}
                  </span>
                )}
              </div>
              {!effectiveCollapsed && <span className="font-medium text-sm">Notifications</span>}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0 ml-4 shadow-xl border border-gray-150 rounded-xl bg-white" align="end">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h4 className="font-semibold text-sm text-gray-900">Recent Notifications</h4>
              {notifications.filter(n => !n.isRead).length > 0 && (
                <span className="text-[9px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full uppercase">
                  {notifications.filter(n => !n.isRead).length} New
                </span>
              )}
            </div>
            <div className="max-h-64 overflow-y-auto divide-y divide-gray-50">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-xs text-gray-400 italic">
                  No notifications yet.
                </div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif._id}
                    onClick={() => !notif.isRead && handleMarkAsRead(notif._id)}
                    className={cn(
                      'p-3.5 text-left text-xs transition-colors cursor-pointer flex gap-2.5 items-start',
                      notif.isRead ? 'hover:bg-gray-50/50 text-gray-500' : 'bg-blue-50/10 hover:bg-blue-50/20 text-gray-900 font-semibold'
                    )}
                  >
                    {!notif.isRead && (
                      <div className="h-2 w-2 rounded-full bg-blue-500 mt-1 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold truncate">{notif.title}</p>
                      <p className="text-gray-500 mt-0.5 leading-relaxed">{notif.message}</p>
                      <p className="text-[9px] text-gray-400 mt-1">{timeAgo(notif.createdAt)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* DOCUMENTATION */}
        <Link
          href="/documentation"
          className={cn(
            'w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl transition-all duration-200 text-left group',
            pathname === '/documentation'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md transform scale-[1.02]'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
            effectiveCollapsed && 'justify-center px-2',
          )}
        >
          <BookOpen className={cn('h-5 w-5 flex-shrink-0', pathname === '/documentation' ? 'text-white' : 'text-gray-400 group-hover:text-gray-600')} />
          {!effectiveCollapsed && <span className="font-medium text-sm">Documentation</span>}
        </Link>
      </nav>

      {/* Footer Actions */}
      <div className="p-4 border-t border-gray-100">
        <Button
          onClick={logout}
          variant="ghost"
          className={cn(
            'w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors rounded-xl h-11 px-4',
            effectiveCollapsed && 'justify-center px-2',
          )}
        >
          <LogOut className="h-5 w-5 mr-3 flex-shrink-0" />
          {!effectiveCollapsed && <span className="font-semibold text-sm">Sign Out</span>}
        </Button>
      </div>
    </aside>
  );
}