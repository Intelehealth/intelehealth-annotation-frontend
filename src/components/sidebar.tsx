import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { notificationsAPI, NotificationResponse } from '@/lib/api/notifications';
import {
  Folder,
  Settings,
  ChevronLeft,
  ChevronRight,
  Database,
  User,
  Bell,
  HelpCircle,
  LogOut,
  LayoutDashboard,
  Users,
  ClipboardList,
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

  const [notifications, setNotifications] = useState<NotificationResponse[]>([]);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const list = await notificationsAPI.getAll();
      setNotifications(list);
    } catch (err) {
      console.error('Failed to load notifications', err);
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

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const timer = setInterval(fetchNotifications, 15000);
      return () => clearInterval(timer);
    }
  }, [user]);

  const pathname_val = pathname;

  const effectiveCollapsed = forceCollapsed || isCollapsed;

  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      href: '/dashboard',
    },
    // My Tasks — visible only to non-admins (ANNOTATOR, etc.)
    ...(user?.role?.toUpperCase() !== 'ADMIN'
      ? [
          {
            id: 'tasks',
            label: 'My Tasks',
            icon: ClipboardList,
            href: '/tasks',
          },
        ]
      : []),
    // Admin-only menu items
    ...(user?.role?.toUpperCase() === 'ADMIN'
      ? [
          {
            id: 'dataset',
            label: 'Dataset',
            icon: Database,
            href: '/dataset',
          },
          {
            id: 'users',
            label: 'Users',
            icon: Users,
            href: '/users',
          },
        ]
      : []),
    {
      id: 'profile',
      label: 'Profile Settings',
      icon: Settings,
      href: '/profile',
    },
  ];

  return (
    <aside
      className={cn(
        'bg-white border-r border-gray-200/80 flex flex-col h-screen transition-all duration-300 shadow-sm',
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
              <p className="text-xs text-gray-500">Data Annotation Platform</p>
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
                      user.role?.toUpperCase() === 'ADMIN'
                        ? 'bg-purple-100 text-purple-700 border border-purple-200'
                        : 'bg-blue-100 text-blue-700 border border-blue-200',
                    )}
                  >
                    {user.role?.toUpperCase() === 'ADMIN' ? 'Admin' : user.role}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
          )}
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        <div className={cn('mb-4', effectiveCollapsed && 'hidden')}>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3">
            Main Menu
          </h3>
        </div>

        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname_val === item.href;

          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                'w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 text-left group',
                isActive
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg transform scale-[1.02]'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                effectiveCollapsed && 'justify-center px-2',
              )}
            >
              <Icon
                className={cn(
                  'h-5 w-5 flex-shrink-0 transition-colors',
                  isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-600',
                )}
              />
              {!effectiveCollapsed && (
                <span className="font-medium truncate">{item.label}</span>
              )}
              {isActive && !effectiveCollapsed && (
                <div className="w-2 h-2 bg-white/30 rounded-full ml-auto animate-pulse" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer Actions */}
      <div className="p-4 border-t border-gray-100 space-y-2">
        {!effectiveCollapsed && (
          <div className="mb-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3">
              Quick Actions
            </h3>
          </div>
        )}

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                'w-full justify-start text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors relative',
                effectiveCollapsed && 'justify-center px-2',
              )}
            >
              <div className="relative flex items-center">
                <Bell className="h-4 w-4 mr-3 flex-shrink-0" />
                {notifications.filter(n => !n.isRead).length > 0 && (
                  <span className="absolute -top-1.5 -left-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white shadow-sm animate-pulse">
                    {notifications.filter(n => !n.isRead).length}
                  </span>
                )}
              </div>
              {!effectiveCollapsed && 'Notifications'}
            </Button>
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

        <Button
          variant="ghost"
          className={cn(
            'w-full justify-start text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors',
            effectiveCollapsed && 'justify-center px-2',
          )}
        >
          <HelpCircle className="h-4 w-4 mr-3 flex-shrink-0" />
          {!effectiveCollapsed && 'Help & Support'}
        </Button>

        <Button
          onClick={logout}
          variant="ghost"
          className={cn(
            'w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors',
            effectiveCollapsed && 'justify-center px-2',
          )}
        >
          <LogOut className="h-4 w-4 mr-3 flex-shrink-0" />
          {!effectiveCollapsed && 'Sign Out'}
        </Button>
      </div>
    </aside>
  );
}