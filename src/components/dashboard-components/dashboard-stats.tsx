'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Database,
  FileText,
  TrendingUp,
  Activity,
  CheckCircle,
  AlertCircle,
  Clock,
  PlayCircle,
} from 'lucide-react';

interface DashboardStatsProps {
  totalDatasets: number;
  totalAnnotations: number;
  completionRate: number;
}

interface CSVImport {
  _id: string;
  fileName: string;
  status: string;
  totalRows: number;
  processedRows: number;
  datasetName: string;
  datasetId: string;
  createdAt: string;
}

interface CSVImportsProps {
  csvImports: CSVImport[];
}

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'completed':
      return 'bg-green-100 text-green-800';
    case 'processing':
      return 'bg-blue-100 text-blue-800';
    case 'failed':
      return 'bg-red-100 text-red-800';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getStatusIcon = (status: string) => {
  switch (status.toLowerCase()) {
    case 'completed':
      return <CheckCircle className="h-4 w-4" />;
    case 'processing':
      return <PlayCircle className="h-4 w-4" />;
    case 'failed':
      return <AlertCircle className="h-4 w-4" />;
    default:
      return <Clock className="h-4 w-4" />;
  }
};

export function DashboardStats({
  totalDatasets,
  totalAnnotations,
  completionRate,
}: DashboardStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Datasets</CardTitle>
          <Database className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalDatasets}</div>
          <p className="text-xs text-muted-foreground">
            Active datasets in your workspace
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Total Annotations
          </CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalAnnotations}</div>
          <p className="text-xs text-muted-foreground">
            Annotations created across all datasets
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{completionRate}%</div>
          <p className="text-xs text-muted-foreground">
            AI-assisted annotation completion
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export function CSVImportsStatus({ csvImports }: CSVImportsProps) {
  if (csvImports.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Database className="h-5 w-5" />
          <span>CSV Import Status</span>
        </CardTitle>
        <CardDescription>
          Track the progress of your CSV file imports
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {csvImports.map((importItem) => (
            <div
              key={importItem._id}
              className="flex items-center justify-between p-4 border rounded-lg"
            >
              <div className="flex-1">
                <div className="flex items-center space-x-3">
                  <h3 className="font-medium text-gray-900">
                    {importItem.fileName}
                  </h3>
                  <Badge className={getStatusColor(importItem.status)}>
                    <div className="flex items-center space-x-1">
                      {getStatusIcon(importItem.status)}
                      <span>{importItem.status}</span>
                    </div>
                  </Badge>
                </div>
                <p className="text-sm text-gray-600">
                  Dataset: {importItem.datasetName}
                </p>
                <p className="text-xs text-gray-500">
                  {importItem.processedRows} of {importItem.totalRows} rows
                  processed
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="w-24 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${
                        (importItem.processedRows / importItem.totalRows) * 100
                      }%`,
                    }}
                  ></div>
                </div>
                <span className="text-sm font-medium text-gray-600">
                  {Math.round(
                    (importItem.processedRows / importItem.totalRows) * 100,
                  )}
                  %
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function ProgressChart({
  data,
}: {
  data: Array<{ name: string; value: number; color: string }>;
}) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Annotation Distribution</h3>
        <span className="text-sm text-gray-500">Total: {total}</span>
      </div>

      <div className="space-y-3">
        {data.map((item, index) => {
          const percentage = total > 0 ? (item.value / total) * 100 : 0;

          return (
            <div key={index} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  {item.name}
                </span>
                <span className="text-sm text-gray-500">
                  {item.value} ({percentage.toFixed(1)}%)
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: item.color,
                  }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ActivityTimeline({
  activities,
}: {
  activities: Array<{
    id: string;
    title: string;
    description: string;
    timestamp: string;
  }>;
}) {
  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor(
      (now.getTime() - time.getTime()) / (1000 * 60),
    );

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  return (
    <div className="space-y-4 h-full flex flex-col">
      <h3 className="text-lg font-semibold">Recent Activity</h3>
      <div className="space-y-4 flex-1 overflow-hidden">
        {activities.length > 0 ? (
          activities.slice(0, 5).map((activity) => (
            <div key={activity.id} className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <Activity className="h-4 w-4 text-blue-600" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">
                  {activity.title}
                </p>
                <p className="text-sm text-gray-600">{activity.description}</p>
                <p className="text-xs text-gray-500">
                  {formatTimeAgo(activity.timestamp)}
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Activity className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No recent activity</p>
          </div>
        )}
      </div>
    </div>
  );
}
