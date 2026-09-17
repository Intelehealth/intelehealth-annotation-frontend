'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { notificationsAPI, NotificationResponse } from '@/lib/api/notifications';
import type { Assignment, SchemaChangeRequest } from '@/lib/api/dashboard-data';
import { Empty, Section } from './kpi';
import { personName, timeAgo } from './format';

// Everything waiting on the administrator, in one place: submitted work to
// review, schema changes annotators have proposed, and notifications.
export function Inbox({ reviewQueue, schemaRequests, notifications, onChange }: {
  reviewQueue: Assignment[];
  schemaRequests: SchemaChangeRequest[];
  notifications: NotificationResponse[];
  onChange: () => void;
}) {
  const [tab, setTab] = useState('reviews');
  const unread = notifications.filter((n) => !n.isRead);
  const count = (n: number) => (n > 0 ? <span className="ml-1.5 rounded-full bg-foreground/10 px-1.5 text-[10px] tabular-nums">{n}</span> : null);

  return (
    <Section title="Inbox" description="Work that is waiting on you.">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mx-4 mt-3">
          <TabsTrigger value="reviews">Review requests{count(reviewQueue.length)}</TabsTrigger>
          <TabsTrigger value="schema">Schema changes{count(schemaRequests.length)}</TabsTrigger>
          <TabsTrigger value="notifications">Notifications{count(unread.length)}</TabsTrigger>
        </TabsList>

        <TabsContent value="reviews">
          {reviewQueue.length === 0 ? <Empty>Nothing submitted for review.</Empty> : (
            <ul className="divide-y">
              {reviewQueue.slice(0, 8).map((a) => (
                <li key={a._id} className="flex items-center gap-4 px-4 py-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{typeof a.cloneDatasetId === 'object' ? a.cloneDatasetId?.name : 'Clone'}</div>
                    <div className="text-xs text-muted-foreground">
                      {personName(a.assignedTo)} · {a.completedRows}/{a.totalRows} rows · submitted {timeAgo(a.submittedAt ?? a.updatedAt)}
                    </div>
                  </div>
                  <Badge variant="secondary">{a.status.replace('_', ' ').toLowerCase()}</Badge>
                  <Button asChild size="sm" variant="outline"><Link href="/assignments/review">Review</Link></Button>
                </li>
              ))}
              {reviewQueue.length > 8 && <li className="px-4 py-2 text-xs text-muted-foreground"><Link href="/assignments/review" className="hover:underline">{reviewQueue.length - 8} more →</Link></li>}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="schema">
          {schemaRequests.length === 0 ? <Empty>No schema change requests.</Empty> : (
            <ul className="divide-y">
              {schemaRequests.slice(0, 8).map((s) => {
                const dsId = typeof s.datasetId === 'object' ? s.datasetId._id : s.datasetId;
                const dsName = typeof s.datasetId === 'object' ? s.datasetId.name : 'Dataset';
                return (
                  <li key={s._id} className="flex items-center gap-4 px-4 py-3 text-sm">
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{dsName}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {personName(s.requestedBy)} · {timeAgo(s.createdAt)}{s.message || s.description ? ` · ${s.message ?? s.description}` : ''}
                      </div>
                    </div>
                    <Button asChild size="sm" variant="outline"><Link href={`/dataset/${dsId}?tab=field-configuration`}>Open</Link></Button>
                  </li>
                );
              })}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="notifications">
          <NotificationList items={notifications} onChange={onChange} />
        </TabsContent>
      </Tabs>
    </Section>
  );
}

export function NotificationList({ items, onChange, limit = 8 }: { items: NotificationResponse[]; onChange: () => void; limit?: number }) {
  const [busy, setBusy] = useState<string | null>(null);
  const sorted = [...items].sort((a, b) => Number(a.isRead) - Number(b.isRead) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  if (sorted.length === 0) return <Empty>You're all caught up.</Empty>;

  const markRead = async (n: NotificationResponse) => {
    if (n.isRead) return;
    setBusy(n._id);
    try { await notificationsAPI.markAsRead(n._id); onChange(); } finally { setBusy(null); }
  };
  const target = (n: NotificationResponse) => (n.type === 'TASK_SUBMITTED' ? '/assignments/review' : n.type?.startsWith('SCHEMA') ? '/dataset' : n.type?.startsWith('TASK') ? '/tasks' : undefined);

  return (
    <ul className="divide-y">
      {sorted.slice(0, limit).map((n) => {
        const href = target(n);
        return (
          <li key={n._id} className="flex items-start gap-3 px-4 py-3 text-sm">
            <span aria-hidden="true" className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.isRead ? 'bg-transparent' : 'bg-blue-500'}`} />
            <div className="min-w-0 flex-1">
              <div className={n.isRead ? 'text-muted-foreground' : 'font-medium'}>{n.title}</div>
              <div className="truncate text-xs text-muted-foreground">{n.message} · {timeAgo(n.createdAt)}</div>
            </div>
            {href && <Button asChild size="sm" variant="ghost" onClick={() => markRead(n)}><Link href={href}>Open</Link></Button>}
            {!n.isRead && <Button size="sm" variant="ghost" disabled={busy === n._id} onClick={() => markRead(n)}>Mark read</Button>}
          </li>
        );
      })}
    </ul>
  );
}
