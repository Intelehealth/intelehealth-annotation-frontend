"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Sidebar } from "@/components/sidebar";
import { TopNav } from "@/components/top-nav";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { consensusAPI } from "@/lib/api/consensus";
import { datasetsAPI } from "@/lib/api/datasets";
import { cn } from "@/lib/utils";
import {
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Filter,
  Layers3,
  Loader2,
  MessageSquare,
  Paperclip,
  RefreshCw,
  Search,
  Send,
  Users,
  X,
} from "lucide-react";
import { AudioPreview, VideoPreview } from "@/components/annotation-components/media-preview";
import { ImageThumbnails } from "@/components/annotation-components/image-thumbnails";

type Status =
  | "AGREED"
  | "CONFLICT"
  | "TIE"
  | "PARTIAL"
  | "REVIEW_REQUESTED"
  | "RE_SUBMITTED"
  | "NOT_STARTED"
  | "PENDING"
  | "APPROVED"
  | "UNKNOWN";

type ReviewRow = {
  reviewId?: string;
  rowIndex: number;
  status: Status;
  question: string;
  answer: string;
  winner: string;
  agreement: number;
  fields: any[];
  document?: string;
  annotators?: Annotator[];
  comments?: any[];
  adminNotes?: any[];
  reviewRequest?: any;
  reviewRequests?: any[];
  reviewHistory?: any[];
  submissionHistory?: any[];
  originalTaskAnnotations?: any[];
  finalAnswer?: string;
  approvedBy?: string;
  approvedAt?: string;
  rowRawData?: Record<string, any>;
};

type Annotator = {
  id: string;
  name: string;
  assignedRows: number;
  completedRows: number;
  completionPercentage?: number;
  agreementPercentage?: number;
  isOnline?: boolean;
};

const STATUS: Record<
  Status,
  { label: string; dot: string; badge: string; bar: string }
> = {
  AGREED: {
    label: "Agreed",
    dot: "bg-emerald-500",
    badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
    bar: "bg-emerald-500",
  },
  CONFLICT: {
    label: "Conflict",
    dot: "bg-orange-500",
    badge: "border-orange-200 bg-orange-50 text-orange-700",
    bar: "bg-orange-500",
  },
  TIE: {
    label: "Tie",
    dot: "bg-rose-500",
    badge: "border-rose-200 bg-rose-50 text-rose-700",
    bar: "bg-rose-500",
  },
  PARTIAL: {
    label: "Partial",
    dot: "bg-blue-500",
    badge: "border-blue-200 bg-blue-50 text-blue-700",
    bar: "bg-blue-500",
  },
  REVIEW_REQUESTED: {
    label: "Review Requested",
    dot: "bg-violet-500",
    badge: "border-violet-200 bg-violet-50 text-violet-700",
    bar: "bg-violet-500",
  },
  RE_SUBMITTED: {
    label: "Re-Submitted",
    dot: "bg-indigo-500",
    badge: "border-indigo-200 bg-indigo-50 text-indigo-700",
    bar: "bg-indigo-500",
  },
  NOT_STARTED: {
    label: "Not Started",
    dot: "bg-slate-400",
    badge: "border-slate-200 bg-slate-50 text-slate-600",
    bar: "bg-slate-400",
  },
  PENDING: {
    label: "Pending",
    dot: "bg-slate-400",
    badge: "border-slate-200 bg-slate-50 text-slate-600",
    bar: "bg-slate-400",
  },
  APPROVED: {
    label: "Approved",
    dot: "bg-teal-500",
    badge: "border-teal-200 bg-teal-50 text-teal-700",
    bar: "bg-teal-500",
  },
  UNKNOWN: {
    label: "Unknown",
    dot: "bg-slate-400",
    badge: "border-slate-200 bg-slate-50 text-slate-600",
    bar: "bg-slate-400",
  },
};

const ANSWER_TONES = {
  yes: "border-emerald-200 bg-emerald-50 text-emerald-700",
  no: "border-rose-200 bg-rose-50 text-rose-700",
  maybe: "border-orange-200 bg-orange-50 text-orange-700",
  na: "border-slate-200 bg-slate-50 text-slate-600",
  pending: "border-blue-300 bg-white text-blue-600",
  default: "border-slate-200 bg-white text-slate-700",
};

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "Pending";
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.join(", ") : value;
    } catch {
      return value;
    }
  }
  return String(value);
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function answerTone(value: string) {
  const normalized = value.trim().toLowerCase();
  if (!normalized || normalized === "pending") return ANSWER_TONES.pending;
  if (normalized === "yes") return ANSWER_TONES.yes;
  if (normalized === "no") return ANSWER_TONES.no;
  if (normalized === "maybe") return ANSWER_TONES.maybe;
  if (normalized === "n/a" || normalized === "na") return ANSWER_TONES.na;
  return ANSWER_TONES.default;
}

function Avatar({
  name,
  color = "bg-slate-100 text-slate-700",
  size = "h-8 w-8",
}: {
  name: string;
  color?: string;
  size?: string;
}) {
  return (
    <div
      className={cn(
        size,
        color,
        "flex shrink-0 items-center justify-center rounded-full text-[10px] font-bold ring-2 ring-white",
      )}
    >
      {initials(name)}
    </div>
  );
}

function StatusBadge({ status }: { status: Status | string }) {
  const tone = STATUS[status as Status] || STATUS.UNKNOWN;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-semibold",
        tone.badge,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", tone.dot)} />
      {tone.label}
    </span>
  );
}

function StatCard({
  label,
  value,
  accent,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  accent?: string;
  icon?: React.ElementType;
}) {
  return (
    <div className="min-w-[128px] flex-1 rounded-xl border border-slate-200/80 bg-white px-3.5 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">
          {label}
        </span>
        {Icon && (
          <Icon className={cn("h-3.5 w-3.5", accent || "text-slate-400")} />
        )}
      </div>
      <div
        className={cn(
          "mt-1.5 text-xl font-semibold tracking-tight",
          accent || "text-slate-900",
        )}
      >
        {value}
      </div>
    </div>
  );
}

function normalizeRows(rows: any[]): ReviewRow[] {
  return rows.map((row) => {
    const field = row.fields?.[0] || {};
    const rawStatus = String(
      row.rowStatus ?? field.status ?? "UNKNOWN",
    ).toUpperCase();
    // These are backend status aliases, not frontend consensus calculations.
    const request = row.reviewRequest || row.latestReviewRequest;
    const requestStatus = String(request?.status || "").toUpperCase();
    const requestOpen =
      request && ["REVIEW_REQUESTED", "RE_SUBMITTED"].includes(requestStatus);
    const status =
      requestOpen
        ? requestStatus
        : rawStatus === "PENDING_UPDATE"
          ? "REVIEW_REQUESTED"
          : rawStatus === "ADMIN_CONFIRMED"
            ? "APPROVED"
            : rawStatus;
    return {
      reviewId: row._id || row.reviewId,
      rowIndex: row.rowIndex ?? row.index ?? 0,
      status: status as Status,
      question: field.question ?? field.fieldName ?? "Unknown question",
      answer:
        field.annotatorAnswers
          ?.map((item: any) => formatValue(item.value))
          .join(" · ") ?? "",
      winner: field.finalDecision ?? field.winner ?? "No winner",
      agreement: Number(field.agreementPercentage ?? field.consensusResult?.agreementPercentage ?? 0),
      fields: row.fields || [field],
      document: row.documentName || row.document,
      comments: row.comments || [],
      adminNotes: row.adminNotes || [],
      reviewRequest: request,
      reviewRequests: row.reviewRequests || [],
      reviewHistory: row.reviewHistory || [],
      submissionHistory: row.submissionHistory || [],
      originalTaskAnnotations: row.originalTaskAnnotations || [],
      finalAnswer: row.finalAnswer,
      approvedBy: row.approvedBy,
      approvedAt: row.approvedAt,
      rowRawData: row.rowRawData || row.documentData || {},
      annotators: (row.annotators || []).map((annotator: any) => ({
        id: annotator.annotatorId || annotator._id,
        name: annotator.annotatorName || annotator.name || "Annotator",
        assignedRows: annotator.assignedRows || 0,
        completedRows: annotator.completedRows || 0,
        completionPercentage: annotator.completionPercentage,
        agreementPercentage: annotator.agreementPercentage,
        isOnline: Boolean(annotator.online ?? annotator.isOnline),
      })),
    };
  });
}

function rowAnswers(
  row: ReviewRow,
  annotators: Annotator[] = row.annotators || [],
) {
  const answers = row.fields.flatMap(
    (field: any) => field.annotatorAnswers || [],
  );
  if (!annotators.length) return answers;

  const byAnnotator = new Map<string, any>();
  answers.forEach((answer: any) => {
    if (answer.annotatorId) byAnnotator.set(String(answer.annotatorId), answer);
    if (answer.cloneId) byAnnotator.set(String(answer.cloneId), answer);
    if (answer.annotatorName) byAnnotator.set(answer.annotatorName, answer);
  });
  return annotators.map(
    (annotator) =>
      byAnnotator.get(String(annotator.id)) ||
      answers.find((answer: any) => answer.annotatorName === annotator.name) || {
        annotatorId: annotator.id,
        annotatorName: annotator.name,
        value: null,
        submitted: false,
        online: annotator.isOnline,
      },
  );
}

function winnerLabel(row: ReviewRow) {
  const winner = formatValue(row.winner);
  const completed = row.status === "AGREED" || row.status === "APPROVED";
  return completed && winner !== "Pending" && winner !== "No winner"
    ? `Final Answer = ${winner.toUpperCase()}`
    : winner;
}

function WinnerDisplay({ row }: { row: ReviewRow }) {
  const completed = row.status === "AGREED" || row.status === "APPROVED";
  return (
    <span
      className={cn(
        "block truncate text-xs font-semibold",
        completed
          ? "w-fit rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-emerald-700"
          : "text-slate-700",
      )}
    >
      {winnerLabel(row)}
    </span>
  );
}

function QuestionOptions({ row }: { row: ReviewRow }) {
  const field = row.fields[0] || {};
  const options: string[] = field.options || [];
  const answers = rowAnswers(row);
  if (!options.length) return null;
  return (
    <section className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
      <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">
        Question Options
      </p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const selectedBy = answers.filter((answer: any) => {
            const value = formatValue(answer.value);
            try {
              const parsed = JSON.parse(value);
              return (Array.isArray(parsed) ? parsed : [parsed])
                .map(String)
                .includes(option);
            } catch {
              return value === option;
            }
          });
          return (
            <div
              key={option}
              className={cn(
                "rounded-lg border px-3 py-2 text-xs font-semibold",
                selectedBy.length
                  ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                  : "border-slate-200 bg-slate-50 text-slate-500",
              )}
            >
              <span className="mr-2">{selectedBy.length ? "●" : "○"}</span>
              {option}
              {selectedBy.length > 0 && (
                <span className="ml-2 text-[10px] font-normal">
                  {selectedBy
                    .map((answer: any) => answer.annotatorName || "Annotator")
                    .join(", ")}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function AnswerChip({
  answer,
  expanded = false,
}: {
  answer: any;
  expanded?: boolean;
}) {
  const value = formatValue(answer.value);
  const pending =
    answer.submitted === false ||
    answer.value === null ||
    answer.value === undefined ||
    answer.value === "";
  const offline = answer.online === false || answer.isOnline === false;
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border px-2 py-1",
        expanded ? "min-w-[150px] flex-1 px-3 py-2.5" : "max-w-[155px]",
      )}
    >
      <Avatar
        name={answer.annotatorName || "Annotator"}
        color={
          offline
            ? "bg-slate-100 text-slate-500"
            : "bg-indigo-100 text-indigo-700"
        }
        size={expanded ? "h-7 w-7" : "h-6 w-6"}
      />
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <div className="truncate text-[10px] font-semibold text-slate-500">
            {answer.annotatorName || "Annotator"}
          </div>
          {offline && (
            <span className="text-[9px] font-medium text-slate-400">
              Offline
            </span>
          )}
        </div>
        <span
          className={cn(
            "mt-0.5 inline-flex max-w-full truncate rounded-md border px-1.5 py-0.5 text-[11px] font-semibold",
            answerTone(value),
          )}
        >
          {pending ? "Pending" : value}
        </span>
        {expanded &&
          (answer.confidence || answer.submittedAt || answer.submitted) && (
            <div className="mt-1 text-[10px] text-slate-400">
              {answer.confidence ? `Confidence: ${answer.confidence}` : ""}
              {answer.confidence && (answer.submittedAt || answer.submitted)
                ? " · "
                : ""}
              {answer.submittedAt || answer.submitted || ""}
            </div>
          )}
      </div>
    </div>
  );
}

function ComparisonChips({
  row,
  annotators = [],
  expanded = false,
}: {
  row: ReviewRow;
  annotators?: Annotator[];
  expanded?: boolean;
}) {
  const answers = rowAnswers(row, annotators);
  if (!answers.length)
    return (
      <span className="inline-flex rounded-lg border border-blue-300 bg-white px-2 py-1 text-[11px] font-semibold text-blue-600">
        Pending
      </span>
    );
  return (
    <div
      className={cn(
        "flex min-w-0 gap-1.5",
        expanded ? "flex-wrap" : "overflow-hidden",
      )}
    >
      {answers.map((answer: any, index: number) => (
        <AnswerChip
          key={`${answer.annotatorName || "annotator"}-${index}`}
          answer={answer}
          expanded={expanded}
        />
      ))}
    </div>
  );
}

export default function ReviewConsensusPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { showToast } = useToast();
  const datasetId = params.datasetId as string;
  const searchRef = useRef<HTMLInputElement>(null);

  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [progress, setProgress] = useState<any>(null);
  const [datasetName, setDatasetName] = useState("Dataset");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [agreementFilter, setAgreementFilter] = useState("");
  const [annotatorFilter, setAnnotatorFilter] = useState("");
  const [needsReview, setNeedsReview] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [activeRow, setActiveRow] = useState<ReviewRow | null>(null);
  const [reviewModal, setReviewModal] = useState(false);
  const [reviewReason, setReviewReason] = useState("Incorrect Label");
  const [reviewComment, setReviewComment] = useState("");
  const [deadlineDate, setDeadlineDate] = useState(() =>
    new Date(Date.now() + 86400000).toISOString().slice(0, 10),
  );
  const [deadlineTime, setDeadlineTime] = useState("17:00");
  const [selectedAnnotators, setSelectedAnnotators] = useState<string[]>([]);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [approvalRow, setApprovalRow] = useState<ReviewRow | null>(null);
  const [approvalAnswer, setApprovalAnswer] = useState("");
  const [approvalSubmitting, setApprovalSubmitting] = useState(false);
  const [trainingRow, setTrainingRow] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);
  const [originalAnswersByRow, setOriginalAnswersByRow] = useState<
    Map<number, any[]>
  >(() => {
    if (typeof window === "undefined") return new Map();
    try {
      const stored = window.localStorage.getItem(
        `consensus-original-answers-${datasetId}`,
      );
      return stored ? new Map(JSON.parse(stored)) : new Map();
    } catch {
      return new Map();
    }
  });

  const loadData = async (showLoader = true) => {
    if (!datasetId) return;
    try {
      if (showLoader) setLoading(true);
      else setRefreshing(true);
      const [grid, progressData] = await Promise.all([
        consensusAPI.getConsensusGrid(datasetId, { page: 1, pageSize: 50 }),
        consensusAPI.getProgress(datasetId),
      ]);
      setRows(normalizeRows(grid?.rows || []));
      setProgress(progressData || null);
      const dataset = await datasetsAPI.getById(datasetId).catch(() => null);
      if (dataset?.name) setDatasetName(dataset.name);
    } catch {
      setRows([]);
      setProgress(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const refreshAffectedRows = useCallback(async () => {
    if (!datasetId) return;
    try {
      const grid = await consensusAPI.getConsensusGrid(datasetId, { page: 1, pageSize: 50 });
      const incoming = normalizeRows(grid?.rows || []);
      setRows((current) => current.map((row) => incoming.find((next) => next.rowIndex === row.rowIndex) || row));
    } catch {
      // Background refresh must not replace usable table data with an empty state.
    }
  }, [datasetId]);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    const role = user?.role?.toUpperCase();
    if (role && role !== "ADMIN" && role !== "OWNER") {
      router.push("/dashboard");
      return;
    }
    loadData();
  }, [authLoading, isAuthenticated, datasetId, user?.role]);

  useEffect(() => {
    const refreshTimer = window.setInterval(() => {
      void refreshAffectedRows();
    }, 15000);
    return () => window.clearInterval(refreshTimer);
  }, [refreshAffectedRows]);

  const annotators = useMemo<Annotator[]>(
    () =>
      (progress?.annotators || []).map((annotator: any) => ({
        id: annotator.annotatorId || annotator._id,
        name: annotator.annotatorName || annotator.name || "Annotator",
        assignedRows: annotator.assignedRows || 0,
        completedRows: annotator.completedRows || 0,
        completionPercentage: annotator.completionPercentage,
        agreementPercentage: annotator.agreementPercentage,
        isOnline: Boolean(annotator.isOnline || annotator.online),
      })),
    [progress],
  );

  const filteredRows = useMemo(
    () =>
      rows.filter((row) => {
        const answerText = rowAnswers(row)
          .map((answer: any) => `${answer.annotatorName} ${answer.value}`)
          .join(" ");
        const haystack =
          `${row.rowIndex + 1} ${row.question} ${row.answer} ${row.winner} ${row.status} ${answerText}`.toLowerCase();
        return (
          (!query || haystack.includes(query.toLowerCase())) &&
          (!statusFilter || row.status === statusFilter) &&
          (!agreementFilter ||
            (agreementFilter === "below70"
              ? row.agreement < 70
              : row.agreement >= 70)) &&
          (!annotatorFilter ||
            answerText.toLowerCase().includes(annotatorFilter.toLowerCase())) &&
          (!needsReview ||
            row.status === "REVIEW_REQUESTED" ||
            row.status === "CONFLICT" ||
            row.status === "TIE" ||
            row.status === "PARTIAL")
        );
      }),
    [rows, query, statusFilter, agreementFilter, annotatorFilter, needsReview],
  );

  const stats = useMemo(() => {
    const rowCounts = progress?.rowCounts || {};
    const count = (key: string, fallback: Status) =>
      rowCounts[key] ?? rows.filter((row) => row.status === fallback).length;
    return {
      total: progress?.totalRows ?? rows.length,
      agreed: count("AGREED", "AGREED") + count("APPROVED", "APPROVED"),
      conflict: count("CONFLICT", "CONFLICT"),
      tie: count("TIE", "TIE"),
      partial: count("PARTIAL", "PARTIAL"),
      reviewRequested:
        rowCounts.REVIEW_REQUESTED ??
        rows.filter((row) => row.status === "REVIEW_REQUESTED").length,
    };
  }, [progress, rows]);

  const toggleExpanded = (rowIndex: number) =>
    setExpandedRows((current) => {
      const next = new Set(current);
      if (next.has(rowIndex)) next.delete(rowIndex);
      else next.add(rowIndex);
      return next;
    });

  const approveRow = (row: ReviewRow) => {
    if (!row.reviewId || row.status === "REVIEW_REQUESTED" || row.status === "APPROVED") return;
    setApprovalRow(row);
    setApprovalAnswer(row.finalAnswer || (row.winner !== "No winner" ? row.winner : ""));
  };

  const openReviewModal = (row: ReviewRow) => {
    setActiveRow(row);
    if (row.status === "APPROVED") {
      showToast({ title: "Row already approved", description: "Reopening approved rows is not enabled.", type: "info" });
      return;
    }
    if (row.status === "REVIEW_REQUESTED" || row.status === "RE_SUBMITTED") {
      setReviewModal(true);
      return;
    }
    setSelectedAnnotators(annotators.map((annotator) => annotator.id));
    setReviewModal(true);
  };

  const confirmApproval = async () => {
    if (!approvalRow?.reviewId || !approvalAnswer.trim() || approvalSubmitting) return;
    setApprovalSubmitting(true);
    try {
      const result = await consensusAPI.approveReview(datasetId, approvalRow.reviewId, approvalAnswer.trim());
      setRows((current) => current.map((row) => row.rowIndex === approvalRow.rowIndex
        ? { ...row, status: "APPROVED", finalAnswer: result.finalAnswer || approvalAnswer.trim(), approvedBy: result.approvedBy, approvedAt: result.approvedAt }
        : row));
      setApprovalRow(null);
      showToast({ title: "Row approved", description: `Row ${approvalRow.rowIndex + 1} was approved.`, type: "success" });
    } catch {
      showToast({ title: "Approval failed", description: "The row could not be approved. Complete the review request first.", type: "error" });
    } finally {
      setApprovalSubmitting(false);
    }
  };

  const handleReviewAgain = async () => {
    if (!activeRow || !reviewComment.trim() || selectedAnnotators.length === 0 || reviewSubmitting)
      return;
    const deadlineAt = new Date(`${deadlineDate}T${deadlineTime}:00`);
    if (
      Number.isNaN(deadlineAt.getTime()) ||
      deadlineAt.getTime() <= Date.now()
    ) {
      showToast({
        title: "Invalid deadline",
        description: "Choose a future date and time.",
        type: "error",
      });
      return;
    }
    let reviewResponse: any;
    setReviewSubmitting(true);
    try {
      reviewResponse = await consensusAPI.requestReview(datasetId, {
        rowIndex: activeRow.rowIndex,
        fieldNames: activeRow.fields
          .map((field: any) => field.fieldName)
          .filter(Boolean),
        annotatorIds: selectedAnnotators,
        reason: reviewReason,
        comment: reviewComment.trim(),
        deadlineAt: deadlineAt.toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
    } catch {
      showToast({
        title: "Review request failed",
        description: "The review request could not be sent.",
        type: "error",
      });
      setReviewSubmitting(false);
      return;
    }
    setReviewSubmitting(false);
    setOriginalAnswersByRow((current) => {
      const next = new Map(current);
      next.set(activeRow.rowIndex, rowAnswers(activeRow));
      window.localStorage.setItem(
        `consensus-original-answers-${datasetId}`,
        JSON.stringify([...next.entries()]),
      );
      return next;
    });
    setRows((current) =>
      current.map((row) =>
        row.rowIndex === activeRow.rowIndex
          ? {
              ...row,
              status: "REVIEW_REQUESTED",
              reviewRequest: {
                ...(row.reviewRequest || {}),
                ...reviewResponse,
                submittedBy: [],
                status: "REVIEW_REQUESTED",
              },
            }
          : row,
      ),
    );
    setReviewModal(false);
    setReviewComment("");
    showToast({
      title: "Review request sent",
      description: `Selected annotators were notified about Row ${activeRow.rowIndex + 1}.`,
      type: "success",
    });
  };

  const handleExport = async (exportType = "audit") => {
    if (exporting) return;
    setExporting(true);
    try {
      await consensusAPI.exportCsv(datasetId, exportType);
      showToast({
        title: "Export ready",
        description: "The consensus export has been downloaded.",
        type: "success",
      });
    } catch {
      showToast({
        title: "Export failed",
        description: "The consensus export could not be generated.",
        type: "error",
      });
    } finally {
      setExporting(false);
    }
  };

  const handleTraining = async (row: ReviewRow) => {
    if (!row.reviewId || row.status !== "APPROVED" || trainingRow !== null) return;
    setTrainingRow(row.rowIndex);
    try {
      await consensusAPI.addToLlmTraining(datasetId, row.reviewId);
      showToast({ title: "Training example ready", description: "One approved training example was stored.", type: "success" });
    } catch {
      showToast({ title: "Training example failed", description: "The approved row could not be stored.", type: "error" });
    } finally {
      setTrainingRow(null);
    }
  };

  const handleAddReviewNote = async (
    row: ReviewRow,
    kind: "comment" | "adminNote",
    text: string,
  ) => {
    if (!row.reviewId || !text.trim()) return;
    try {
      const result =
        kind === "comment"
          ? await consensusAPI.addReviewComment(datasetId, row.reviewId, text)
          : await consensusAPI.addReviewAdminNote(
              datasetId,
              row.reviewId,
              text,
            );
      setRows((current) =>
        current.map((item) =>
          item.rowIndex === row.rowIndex
            ? {
                ...item,
                comments: result.comments || item.comments,
                adminNotes: result.adminNotes || item.adminNotes,
              }
            : item,
        ),
      );
      setActiveRow((current) =>
        current?.rowIndex === row.rowIndex
          ? {
              ...current,
              comments: result.comments || current.comments,
              adminNotes: result.adminNotes || current.adminNotes,
            }
          : current,
      );
      showToast({
        title: kind === "comment" ? "Comment added" : "Admin note added",
        type: "success",
      });
    } catch {
      showToast({
        title: "Could not save note",
        description: "Try again in a moment.",
        type: "error",
      });
    }
  };

  const updateNoteState = (rowIndex: number, result: any) => {
    setRows((current) => current.map((item) => item.rowIndex === rowIndex
      ? { ...item, comments: result.comments || item.comments, adminNotes: result.adminNotes || item.adminNotes }
      : item));
    setActiveRow((current) => current?.rowIndex === rowIndex
      ? { ...current, comments: result.comments || current.comments, adminNotes: result.adminNotes || current.adminNotes }
      : current);
  };

  const handleEditReviewNote = async (row: ReviewRow, kind: "comment" | "adminNote", noteId: string, text: string) => {
    if (!row.reviewId || row.status === "APPROVED") return;
    try {
      const result = kind === "comment"
        ? await consensusAPI.editReviewComment(datasetId, row.reviewId, noteId, text)
        : await consensusAPI.editReviewAdminNote(datasetId, row.reviewId, noteId, text);
      updateNoteState(row.rowIndex, result);
    } catch {
      showToast({ title: "Could not edit note", description: "Notes cannot be edited after approval.", type: "error" });
    }
  };

  const handleDeleteReviewNote = async (row: ReviewRow, kind: "comment" | "adminNote", noteId: string) => {
    if (!row.reviewId || row.status === "APPROVED") return;
    try {
      const result = kind === "comment"
        ? await consensusAPI.deleteReviewComment(datasetId, row.reviewId, noteId)
        : await consensusAPI.deleteReviewAdminNote(datasetId, row.reviewId, noteId);
      updateNoteState(row.rowIndex, result);
    } catch {
      showToast({ title: "Could not delete note", description: "Notes cannot be deleted after approval.", type: "error" });
    }
  };

  const handleHeaderSearch = () => {
    searchRef.current?.focus();
    searchRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  if (authLoading || (!isAuthenticated && !authLoading))
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
      </div>
    );

  return (
    <div className="flex h-screen overflow-hidden bg-[#f7f8fb] text-slate-900">
      <Sidebar />
      <main className="min-w-0 flex-1 overflow-y-auto">
        <TopNav onRefresh={() => loadData(false)} refreshing={refreshing}>
             <Button
               variant="ghost"
               size="sm"
               disabled={exporting}
            className="gap-1.5 text-slate-600"
            onClick={() => handleExport()}
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-slate-600"
            aria-label="Search"
            onClick={handleHeaderSearch}
          >
            <Search className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn("text-slate-600", filtersOpen && "bg-slate-100")}
            aria-label="Filters"
            onClick={() => setFiltersOpen((open) => !open)}
          >
            <Filter className="h-4 w-4" />
          </Button>
        </TopNav>

        <div className="mx-auto max-w-[1800px] px-4 pb-10 pt-4 sm:px-6 lg:px-8">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 shadow-sm shadow-indigo-200">
                  <Layers3 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-slate-950">
                    Review Consensus
                  </h1>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Compare and resolve annotations for{" "}
                    <span className="font-semibold text-slate-700">
                      {datasetName}
                    </span>
                  </p>
                </div>
              </div>
            </div>
             <Button
               variant="outline"
               size="sm"
               disabled={exporting}
              className="gap-1.5 bg-white"
              onClick={() => handleExport()}
            >
              <Download className="h-3.5 w-3.5" />
              Export
            </Button>
          </div>

          <section className="mb-5 flex gap-2.5 overflow-x-auto pb-1">
            <StatCard label="Total Rows" value={stats.total} icon={Layers3} />
            <StatCard
              label="Agreed"
              value={stats.agreed}
              icon={CheckCircle2}
              accent="text-emerald-600"
            />
            <StatCard
              label="Conflict"
              value={stats.conflict}
              accent="text-orange-600"
            />
            <StatCard label="Tie" value={stats.tie} accent="text-rose-600" />
            <StatCard
              label="Partial"
              value={stats.partial}
              accent="text-blue-600"
            />
            <StatCard
              label="Review Requested"
              value={stats.reviewRequested}
              accent="text-violet-600"
            />
            <StatCard
              label="Annotator Progress"
              value={`${annotators.filter((annotator) => annotator.completedRows >= annotator.assignedRows && annotator.assignedRows > 0).length}/${annotators.length || 0}`}
              icon={Users}
              accent="text-indigo-600"
            />
          </section>

          <section className="mb-5 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)] sm:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <Users className="h-4 w-4 text-indigo-600" />
                  Annotator Progress
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Progress across the assigned consensus annotators.
                </p>
              </div>
              <span className="rounded-full bg-slate-50 px-2.5 py-1 text-[10px] font-semibold text-slate-600">
                {annotators.length} of 9 annotators
              </span>
            </div>
            {annotators.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {annotators.map((annotator, index) => (
                  <AnnotatorCard
                    key={annotator.id || index}
                    annotator={annotator}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                title="No annotators assigned"
                description="Assign one or more annotators to this dataset to begin consensus review."
                compact
              />
            )}
          </section>

          <section className="mb-3 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.03)] sm:p-4">
            <div className="flex flex-wrap gap-2">
              <div className="relative min-w-[220px] flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search rows, questions, annotators, answers..."
                  className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50/50 pl-9 pr-3 text-xs outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 bg-white text-xs"
                onClick={() => setFiltersOpen((open) => !open)}
              >
                <Filter className="h-3.5 w-3.5" />
                Filters
              </Button>
            </div>
            {filtersOpen && (
              <div className="mt-3 grid gap-2 border-t border-slate-100 pt-3 sm:grid-cols-2 lg:grid-cols-4">
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 outline-none focus:border-indigo-400"
                >
                  <option value="">All statuses</option>
                  <option value="NOT_STARTED">Not Started</option>
                  <option value="AGREED">Agreed</option>
                  <option value="CONFLICT">Conflict</option>
                  <option value="TIE">Tie</option>
                  <option value="PARTIAL">Partial</option>
                  <option value="REVIEW_REQUESTED">Review Requested</option>
                  <option value="RE_SUBMITTED">Re-Submitted</option>
                  <option value="APPROVED">Approved</option>
                  <option value="PENDING">Pending</option>
                </select>
                <select
                  value={agreementFilter}
                  onChange={(event) => setAgreementFilter(event.target.value)}
                  className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 outline-none focus:border-indigo-400"
                >
                  <option value="">All agreement levels</option>
                  <option value="below70">Below 70%</option>
                  <option value="70plus">70% and above</option>
                </select>
                <select
                  value={annotatorFilter}
                  onChange={(event) => setAnnotatorFilter(event.target.value)}
                  className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 outline-none focus:border-indigo-400"
                >
                  <option value="">All annotators</option>
                  {annotators.map((annotator) => (
                    <option key={annotator.id} value={annotator.name}>
                      {annotator.name}
                    </option>
                  ))}
                </select>
                <label className="flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-600">
                  <input
                    type="checkbox"
                    checked={needsReview}
                    onChange={(event) => setNeedsReview(event.target.checked)}
                    className="accent-indigo-600"
                  />
                  Needs review
                </label>
              </div>
            )}
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Consensus Table
                </h2>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  {filteredRows.length} rows in this view
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 text-xs text-slate-500"
                onClick={() => loadData(false)}
              >
                <RefreshCw
                  className={cn("h-3.5 w-3.5", refreshing && "animate-spin")}
                />
                Refresh
              </Button>
            </div>
            {loading ? (
              <div className="flex h-56 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
              </div>
            ) : filteredRows.length === 0 ? (
              <EmptyState
                title="No consensus rows found"
                description="Rows will appear here once annotators submit responses for this dataset."
              />
            ) : (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[980px] text-left">
                    <thead className="sticky top-0 z-10 border-b border-slate-100 bg-slate-50/95 backdrop-blur">
                      <tr className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                        <th className="w-16 px-4 py-3">Row</th>
                        <th className="min-w-[190px] px-3 py-3">Question</th>
                        <th className="min-w-[300px] px-3 py-3">
                          Annotator Comparison
                        </th>
                        <th className="min-w-[130px] px-3 py-3">Winner</th>
                        <th className="w-28 px-3 py-3">Agreement %</th>
                        <th className="w-36 px-3 py-3">Status</th>
                        <th className="w-48 px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredRows.map((row) => (
                        <ExpandableTableRow
                          key={row.rowIndex}
                          row={row}
                          expanded={expandedRows.has(row.rowIndex)}
                          onToggle={() => toggleExpanded(row.rowIndex)}
                          onExport={() => handleExport("row")}
                          onApprove={() => approveRow(row)}
                          onReviewAgain={() => openReviewModal(row)}
                          originalAnswers={originalAnswersByRow.get(row.rowIndex)}
                          onAddComment={(text) =>
                            handleAddReviewNote(row, "comment", text)
                          }
                           onAddAdminNote={(text) =>
                             handleAddReviewNote(row, "adminNote", text)
                           }
                           onEditNote={(kind, noteId, text) => handleEditReviewNote(row, kind, noteId, text)}
                           onDeleteNote={(kind, noteId) => handleDeleteReviewNote(row, kind, noteId)}
                           onTraining={() => handleTraining(row)}
                           trainingBusy={trainingRow === row.rowIndex}
                           exporting={exporting}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="divide-y divide-slate-100 md:hidden">
                  {filteredRows.map((row) => (
                      <ExpandableMobileCard
                      key={row.rowIndex}
                      row={row}
                      expanded={expandedRows.has(row.rowIndex)}
                      onToggle={() => toggleExpanded(row.rowIndex)}
                      onExport={() => handleExport("row")}
                      onApprove={() => approveRow(row)}
                      onReviewAgain={() => openReviewModal(row)}
                      originalAnswers={originalAnswersByRow.get(row.rowIndex)}
                      onAddComment={(text) =>
                        handleAddReviewNote(row, "comment", text)
                      }
                       onAddAdminNote={(text) =>
                         handleAddReviewNote(row, "adminNote", text)
                       }
                       onEditNote={(kind, noteId, text) => handleEditReviewNote(row, kind, noteId, text)}
                       onDeleteNote={(kind, noteId) => handleDeleteReviewNote(row, kind, noteId)}
                       onTraining={() => handleTraining(row)}
                       trainingBusy={trainingRow === row.rowIndex}
                       exporting={exporting}
                    />
                  ))}
                </div>
              </>
            )}
            <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-[11px] text-slate-400">
              <span>
                Showing {filteredRows.length} of {stats.total} rows
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  disabled
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <span className="px-2 font-semibold text-slate-600">1</span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  disabled
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </section>
        </div>
      </main>

      {reviewModal && (
        <ReviewAgainModal
          row={activeRow}
          annotators={annotators}
          reason={reviewReason}
          setReason={setReviewReason}
          comment={reviewComment}
          setComment={setReviewComment}
          deadlineDate={deadlineDate}
          setDeadlineDate={setDeadlineDate}
          deadlineTime={deadlineTime}
          setDeadlineTime={setDeadlineTime}
          selected={selectedAnnotators}
          setSelected={setSelectedAnnotators}
           onClose={() => setReviewModal(false)}
           onSubmit={handleReviewAgain}
           submitting={reviewSubmitting}
        />
      )}
      {approvalRow && (
        <ModalShell>
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-base font-semibold text-slate-900">Approve Row {approvalRow.rowIndex + 1}</h2>
            <p className="mt-1 text-xs text-slate-500">Confirm the final approved answer. Approval locks notes and enables training export.</p>
          </div>
          <div className="space-y-3 p-5">
            <label className="block text-xs font-semibold text-slate-700">
              Final Answer
              <input
                autoFocus
                value={approvalAnswer}
                onChange={(event) => setApprovalAnswer(event.target.value)}
                placeholder="YES, NO, N/A, UNKNOWN..."
                className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-emerald-400"
              />
            </label>
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
            <Button variant="outline" size="sm" disabled={approvalSubmitting} onClick={() => setApprovalRow(null)}>Cancel</Button>
            <Button size="sm" disabled={approvalSubmitting || !approvalAnswer.trim()} onClick={confirmApproval} className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700">
              {approvalSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              {approvalSubmitting ? "Approving..." : "Approve"}
            </Button>
          </div>
        </ModalShell>
      )}
    </div>
  );
}

function AnnotatorCard({ annotator }: { annotator: Annotator }) {
  const pending = Math.max(annotator.assignedRows - annotator.completedRows, 0);
  const percentage =
    annotator.completionPercentage ??
    (annotator.assignedRows
      ? Math.round((annotator.completedRows / annotator.assignedRows) * 100)
      : 0);
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
      <div className="flex items-start gap-2.5">
        <div className="relative">
          <Avatar name={annotator.name} color="bg-indigo-100 text-indigo-700" />
          {annotator.isOnline && (
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-xs font-semibold text-slate-800">
              {annotator.name}
            </span>
            <span className="text-xs font-bold text-indigo-600">
              {annotator.agreementPercentage ?? 0}%
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500">
            <span>{annotator.assignedRows} assigned</span>
            <span>{annotator.isOnline ? "Online" : "Offline"}</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-indigo-500"
              style={{ width: `${percentage}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
            <span>{annotator.completedRows} completed</span>
            <span>{pending} pending</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ExpandableTableRow({
  row,
  expanded,
  onToggle,
  onExport,
  onApprove,
  onReviewAgain,
  onAddComment,
  onAddAdminNote,
  onEditNote,
  onDeleteNote,
  onTraining,
  trainingBusy,
  exporting,
  originalAnswers,
}: {
  row: ReviewRow;
  expanded: boolean;
  onToggle: () => void;
  onExport: () => void;
  onApprove: () => void;
  onReviewAgain: () => void;
  onAddComment: (text: string) => void;
  onAddAdminNote: (text: string) => void;
  onEditNote: (kind: "comment" | "adminNote", noteId: string, text: string) => void;
  onDeleteNote: (kind: "comment" | "adminNote", noteId: string) => void;
  onTraining: () => void;
  trainingBusy: boolean;
  exporting: boolean;
  originalAnswers?: any[];
}) {
  const reviewActive = row.status === "REVIEW_REQUESTED" || row.status === "RE_SUBMITTED";
  const approved = row.status === "APPROVED";
  return (
    <Fragment>
      <tr
        className={cn(
          "group transition hover:bg-slate-50/80",
          expanded && "bg-indigo-50/20",
        )}
      >
        <td className="whitespace-nowrap px-4 py-4 text-xs font-bold text-slate-500">
          #{row.rowIndex + 1}
        </td>
        <td className="max-w-[220px] px-3 py-4">
          <button
            aria-expanded={expanded}
            aria-label={`${expanded ? "Collapse" : "Expand"} Row ${row.rowIndex + 1}`}
            onClick={onToggle}
            className="flex max-w-full items-start gap-2 text-left"
          >
            <span className="mt-0.5 rounded-md p-0.5 text-slate-400 group-hover:text-indigo-600">
              {expanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </span>
            <span>
              <span className="block truncate text-xs font-semibold text-slate-800 group-hover:text-indigo-700">
                {row.question}
              </span>
              <span className="mt-1 block truncate text-[10px] text-slate-400">
                {row.document || `Source row ${row.rowIndex + 1}`}
              </span>
            </span>
          </button>
        </td>
        <td className="px-3 py-4">
          <ComparisonChips row={row} />
        </td>
        <td className="max-w-[140px] px-3 py-4">
          <WinnerDisplay row={row} />
        </td>
        <td className="whitespace-nowrap px-3 py-4">
          <span
            className={cn(
              "text-xs font-bold",
              row.agreement >= 70 ? "text-emerald-600" : "text-orange-600",
            )}
          >
            {row.agreement}%
          </span>
          <div className="mt-1.5 h-1.5 w-14 overflow-hidden rounded-full bg-slate-100">
            <div
              className={cn(
                "h-full rounded-full",
                STATUS[row.status]?.bar || "bg-slate-400",
              )}
              style={{ width: `${row.agreement}%` }}
            />
          </div>
        </td>
        <td className="whitespace-nowrap px-3 py-4">
          <StatusBadge status={row.status} />
        </td>
        <td className="whitespace-nowrap px-4 py-4 text-right">
          <div className="flex flex-wrap items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-[11px] font-semibold text-slate-600 hover:bg-slate-100"
              onClick={onToggle}
            >
              {expanded ? "Collapse" : "Expand"}
            </Button>
             {reviewActive && (
              <span className="rounded-md border border-violet-200 bg-violet-50 px-2 py-1 text-[10px] font-semibold text-violet-700">
                Waiting for Annotator
              </span>
            )}
          </div>
        </td>
      </tr>
      {expanded && (
        <tr className="border-b border-slate-100 bg-slate-50/60">
          <td colSpan={7} className="p-0">
            <ExpandedRowDetails
              row={row}
              onApprove={onApprove}
              onReviewAgain={onReviewAgain}
              onAddComment={onAddComment}
              onAddAdminNote={onAddAdminNote}
              onEditNote={onEditNote}
              onDeleteNote={onDeleteNote}
              onTraining={onTraining}
              trainingBusy={trainingBusy}
              exporting={exporting}
              onExport={onExport}
              originalAnswers={originalAnswers}
            />
          </td>
        </tr>
      )}
    </Fragment>
  );
}

function ExpandableMobileCard({
  row,
  expanded,
  onToggle,
  onExport,
  onApprove,
  onReviewAgain,
  onAddComment,
  onAddAdminNote,
  onEditNote,
  onDeleteNote,
  onTraining,
  trainingBusy,
  exporting,
  originalAnswers,
}: {
  row: ReviewRow;
  expanded: boolean;
  onToggle: () => void;
  onExport: () => void;
  onApprove: () => void;
  onReviewAgain: () => void;
  onAddComment: (text: string) => void;
  onAddAdminNote: (text: string) => void;
  onEditNote: (kind: "comment" | "adminNote", noteId: string, text: string) => void;
  onDeleteNote: (kind: "comment" | "adminNote", noteId: string) => void;
  onTraining: () => void;
  trainingBusy: boolean;
  exporting: boolean;
  originalAnswers?: any[];
}) {
  const reviewActive = row.status === "REVIEW_REQUESTED" || row.status === "RE_SUBMITTED";
  const approved = row.status === "APPROVED";
  return (
    <div className={cn("p-4", expanded && "bg-indigo-50/20")}>
      <div className="flex items-start justify-between gap-3">
        <button
          aria-expanded={expanded}
          onClick={onToggle}
          className="min-w-0 text-left"
        >
          <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">
            Row #{row.rowIndex + 1}
          </span>
          <span className="mt-1 block truncate text-sm font-semibold text-slate-800">
            {row.question}
          </span>
        </button>
        <StatusBadge status={row.status} />
      </div>
      <div className="mt-3">
        <ComparisonChips row={row} />
      </div>
      <div className="mt-3 flex items-center justify-between text-[11px]">
        <span className="font-semibold text-slate-500">
          Winner: <span className="text-slate-800"><WinnerDisplay row={row} /></span>
        </span>
        <span className="font-bold text-indigo-600">
          {row.agreement}% agreement
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={exporting}
          className="h-8 text-[11px]"
          onClick={onToggle}
        >
          {expanded ? "Collapse" : "Expand"}
        </Button>
        {reviewActive && (
          <span className="rounded-md border border-violet-200 bg-violet-50 px-2 py-1 text-[10px] font-semibold text-violet-700">
            Waiting for Annotator
          </span>
        )}
      </div>
      {expanded && (
        <ExpandedRowDetails
          row={row}
          onApprove={onApprove}
          onReviewAgain={onReviewAgain}
          onAddComment={onAddComment}
          onAddAdminNote={onAddAdminNote}
          onEditNote={onEditNote}
          onDeleteNote={onDeleteNote}
          onTraining={onTraining}
          trainingBusy={trainingBusy}
          exporting={exporting}
          onExport={onExport}
          originalAnswers={originalAnswers}
        />
      )}
    </div>
  );
}

function ExpandedRowDetails({
  row,
  onApprove,
  onReviewAgain,
  onAddComment,
  onAddAdminNote,
  onEditNote,
  onDeleteNote,
  onTraining,
  trainingBusy,
  exporting,
  onExport,
  originalAnswers,
}: {
  row: ReviewRow;
  onApprove: () => void;
  onReviewAgain: () => void;
  onAddComment: (text: string) => void;
  onAddAdminNote: (text: string) => void;
  onEditNote: (kind: "comment" | "adminNote", noteId: string, text: string) => void;
  onDeleteNote: (kind: "comment" | "adminNote", noteId: string) => void;
  onTraining: () => void;
  trainingBusy: boolean;
  exporting: boolean;
  onExport: () => void;
  originalAnswers?: any[];
}) {
  const reviewActive = row.status === "REVIEW_REQUESTED" || row.status === "RE_SUBMITTED";
  const approved = row.status === "APPROVED";
  const answers = rowAnswers(row);
  const submittedBy = new Set(
    (row.reviewRequest?.submittedBy || []).map((id: any) => String(id)),
  );
  const hasResubmission =
    submittedBy.size > 0 || row.reviewRequest?.status === "COMPLETED";
  const reannotationAnswers = answers.filter(
    (answer: any) =>
      hasResubmission &&
      answer.submitted &&
      (submittedBy.size === 0 || submittedBy.has(String(answer.annotatorId))),
  );
  const originalAnswerHistory = originalAnswers?.length
    ? originalAnswers
    : (row.originalTaskAnnotations || []).flatMap((annotation: any) =>
        Object.entries(annotation.annotations || {}).map(([fieldName, value]) => ({
          annotatorId: annotation.annotatorUserId,
          annotatorName: annotation.annotatorName,
          value,
          fieldName,
          submitted: true,
        })),
      );
  const reannotationHistory = (row.submissionHistory || []).flatMap((submission: any, index: number) =>
    Object.entries(submission.answers || {}).map(([fieldName, value]) => ({
      annotatorId: submission.annotatorId,
      annotatorName: `Reannotation #${index + 1}`,
      value,
      fieldName,
      submitted: true,
      submittedAt: submission.submittedAt,
    })),
  );
  return (
    <div className="border-t border-slate-200/80 p-4 sm:p-5">
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">
          Question
        </p>
        <h3 className="mt-1 text-sm font-semibold text-slate-900">
          {row.question}
        </h3>
        <QuestionOptions row={row} />
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">
              Current Consensus Status
            </p>
            <div className="mt-2"><StatusBadge status={row.status} /></div>
          </div>
          <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">
              Agreement %
            </p>
            <p className="mt-2 text-lg font-semibold text-slate-900">{row.agreement}%</p>
          </div>
          <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">
              Winner
            </p>
            <div className="mt-2"><WinnerDisplay row={row} /></div>
          </div>
          <div className="rounded-lg border border-teal-100 bg-teal-50/50 p-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-teal-600">Final Answer</p>
            <p className="mt-2 text-sm font-semibold text-teal-800">{row.finalAnswer || "Not approved"}</p>
            {row.approvedAt && <p className="mt-1 text-[10px] text-teal-700">{formatSubmittedTime(row.approvedAt)}</p>}
            {row.approvedBy && <p className="text-[10px] text-teal-700">Approved by {row.approvedBy}</p>}
          </div>
        </div>
      </section>

      <section className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">
            Annotator Answers
          </p>
          <span className="text-[10px] font-semibold text-slate-400">
            {answers.length} annotator{answers.length === 1 ? "" : "s"}
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {answers.length ? (
            answers.map((answer: any, index: number) => (
              <AnnotatorAnswerCard
                key={`${answer.annotatorId || answer.annotatorName || "annotator"}-${index}`}
                answer={answer}
              />
            ))
          ) : (
            <p className="text-xs text-slate-400">No annotators assigned.</p>
          )}
        </div>
        {(originalAnswerHistory.length > 0 || reannotationHistory.length > 0) && (
          <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 lg:grid-cols-2">
            <AnswerHistorySection title="Original Answers" answers={originalAnswerHistory} />
            <AnswerHistorySection
              title="Reannotation Answers"
              answers={reannotationHistory.length ? reannotationHistory : reannotationAnswers}
            />
            <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 p-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-indigo-500">
                Current Consensus
              </p>
              <div className="mt-1"><WinnerDisplay row={row} /></div>
              <p className="mt-1 text-[11px] text-slate-600">{row.agreement}% agreement</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">
                Latest Status
              </p>
              <div className="mt-2"><StatusBadge status={row.status} /></div>
            </div>
          </div>
        )}
      </section>

      <DocumentPreview row={row} />

      <div className="mt-4 space-y-4">
        <NoteSection
          title="Comments"
          notes={row.comments || []}
          placeholder="Add a comment..."
          onSubmit={onAddComment}
          onEdit={(noteId, text) => onEditNote("comment", noteId, text)}
          onDelete={(noteId) => onDeleteNote("comment", noteId)}
          readOnly={row.status === "APPROVED"}
        />
        <NoteSection
          title="Admin Notes"
          notes={row.adminNotes || []}
          placeholder="Add an internal note..."
          onSubmit={onAddAdminNote}
          onEdit={(noteId, text) => onEditNote("adminNote", noteId, text)}
          onDelete={(noteId) => onDeleteNote("adminNote", noteId)}
          readOnly={row.status === "APPROVED"}
        />
      </div>
      <ReviewHistorySection row={row} />
      <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3">
        <span className="mr-1 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">
          Actions
        </span>
        <Button
          size="sm"
           disabled={row.status === "REVIEW_REQUESTED" || approved}
          className="h-8 gap-1.5 bg-emerald-600 text-xs text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
          onClick={onApprove}
        >
          <Check className="h-3.5 w-3.5" />
          Approve
        </Button>
        <Button
          variant="outline"
          size="sm"
           disabled={reviewActive || approved}
          className="h-8 gap-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-40"
          onClick={onReviewAgain}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Review Again
        </Button>
        {row.status === "APPROVED" && (
          <Button variant="outline" size="sm" disabled={trainingBusy} className="h-8 gap-1.5 text-xs" onClick={onTraining}>
            {trainingBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            {trainingBusy ? "Adding..." : "Add to LLM Training"}
          </Button>
        )}
        {reviewActive && (
          <span className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700">
            Waiting for Annotator
          </span>
        )}
        <Button
          variant="ghost"
          size="sm"
          disabled={exporting}
          className="h-8 gap-1.5 text-xs text-slate-600"
          onClick={onExport}
        >
          <Download className="h-3.5 w-3.5" />
          Export Row
        </Button>
      </div>
    </div>
  );
}

function AnnotatorAnswerCard({ answer }: { answer: any }) {
  const value = formatValue(answer.value);
  const pending =
    answer.submitted === false ||
    answer.value === null ||
    answer.value === undefined ||
    answer.value === "";
  const confidence = answer.confidence ?? answer.confidenceScore;
  const submittedAt = answer.submittedAt || answer.updatedAt;
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
      <div className="flex items-start gap-3">
        <Avatar
          name={answer.annotatorName || "Annotator"}
          color="bg-indigo-100 text-indigo-700"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-slate-800">
            {answer.annotatorName || "Annotator"}
          </p>
          <div className="mt-2 grid gap-2 text-[10px]">
            <div>
              <p className="font-semibold uppercase tracking-[0.08em] text-slate-400">Answer</p>
              <span className={cn("mt-1 inline-flex rounded-md border px-2 py-1 text-[11px] font-semibold", answerTone(value))}>
                {pending ? "Pending" : value}
              </span>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-500">
              <span><strong className="font-semibold text-slate-600">Confidence:</strong> {confidence ?? "Pending"}</span>
              <span><strong className="font-semibold text-slate-600">Submitted:</strong> {submittedAt ? formatSubmittedTime(submittedAt) : "Pending"}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AnswerHistorySection({
  title,
  answers,
}: {
  title: string;
  answers: any[];
}) {
  return (
    <section>
      <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">
        {title}
      </p>
      <div className="flex flex-wrap gap-2">
        {answers.length ? (
          answers.map((answer: any, index: number) => (
            <AnswerChip
              key={`${answer.annotatorName || "annotator"}-${index}`}
              answer={answer}
              expanded
            />
          ))
        ) : (
          <span className="text-xs text-slate-400">Pending</span>
        )}
      </div>
    </section>
  );
}

function formatSubmittedTime(value: unknown) {
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
}

function DocumentPreview({ row }: { row: ReviewRow }) {
  const entries = Object.entries(row.rowRawData || {}).filter(
    ([, value]) => value !== null && value !== undefined && String(value).trim() !== "",
  );
  const mediaEntries = entries.filter(([, value]) =>
    /https?:\/\//i.test(String(value)),
  );
  const imageEntries = mediaEntries.filter(([, value]) => /\.(png|jpe?g|gif|webp)(?:\?|$)/i.test(String(value)));
  const audioEntries = mediaEntries.filter(([, value]) => /\.(mp3|wav|ogg|m4a)(?:\?|$)/i.test(String(value)));
  const videoEntries = mediaEntries.filter(([, value]) => /\.(mp4|webm|mov|m4v)(?:\?|$)/i.test(String(value)));
  return (
    <section className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">
        <FileText className="h-3.5 w-3.5" />
        Document Preview
      </div>
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
          <Paperclip className="h-3.5 w-3.5 text-indigo-600" />
          {row.document || `Source row ${row.rowIndex + 1}`}
        </div>
        {imageEntries.length > 0 && (
          <div className="mt-3">
            <ImageThumbnails
              imageUrls={imageEntries.map(([, value]) => String(value)).join(",")}
              columnName="Document"
            />
          </div>
        )}
        {audioEntries.length > 0 && (
          <div className="mt-3 space-y-2">
            {audioEntries.map(([key, value]) => (
              <AudioPreview key={key} url={String(value)} />
            ))}
          </div>
        )}
        {videoEntries.length > 0 && (
          <div className="mt-3 space-y-2">
            {videoEntries.map(([key, value]) => (
              <VideoPreview key={key} url={String(value)} />
            ))}
          </div>
        )}
        {entries.length > 0 ? (
          <dl className="mt-3 grid gap-2 sm:grid-cols-2">
            {entries
              .filter(([key]) => !mediaEntries.some(([mediaKey]) => mediaKey === key))
              .slice(0, 8)
              .map(([key, value]) => (
                <div key={key} className="rounded-md bg-white p-2">
                  <dt className="text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-400">{key}</dt>
                  <dd className="mt-1 whitespace-pre-wrap break-words text-xs text-slate-700">{formatValue(value)}</dd>
                </div>
              ))}
          </dl>
        ) : (
          <p className="mt-3 text-xs text-slate-500">No source preview data available for this row.</p>
        )}
      </div>
    </section>
  );
}

function ReviewHistorySection({ row }: { row: ReviewRow }) {
  const requests = row.reviewRequests || [];
  const events = row.reviewHistory || [];
  const submissions = row.submissionHistory || [];
  if (!requests.length && !events.length && !submissions.length) {
    return <p className="mt-4 text-xs text-slate-400">No review or submission history.</p>;
  }
  return (
    <section className="mt-4 grid gap-4 lg:grid-cols-3">
      <HistoryList title="Review History" items={requests.map((request: any, index: number) => ({
        label: `Review ${index + 1}`,
        detail: `${request.status || "Created"} • ${request.reason || "No reason"}`,
        time: request.completedAt || request.createdAt,
      }))} />
      <HistoryList title="Submission History" items={submissions.map((submission: any, index: number) => ({
        label: `Reannotation #${index + 1}`,
        detail: `${submission.annotatorId || "Annotator"} • ${submission.fieldNames?.join(", ") || "Requested fields"}`,
        time: submission.submittedAt,
      }))} />
      <HistoryList title="Status Timeline" items={events.map((event: any) => ({
        label: event.status || event.event,
        detail: event.details?.reason || event.event,
        time: event.at,
      }))} />
    </section>
  );
}

function HistoryList({ title, items }: { title: string; items: any[] }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">{title}</p>
      {items.length ? (
        <ol className="space-y-2 border-l border-slate-200 pl-3">
          {items.map((item, index) => (
            <li key={`${item.label}-${index}`} className="relative text-xs text-slate-700">
              <span className="absolute -left-[17px] top-1 h-2 w-2 rounded-full bg-indigo-400" />
              <p className="font-semibold">{item.label}</p>
              <p className="text-[10px] text-slate-500">{item.detail}</p>
              {item.time && <p className="text-[10px] text-slate-400">{formatSubmittedTime(item.time)}</p>}
            </li>
          ))}
        </ol>
      ) : <p className="text-xs text-slate-400">None</p>}
    </section>
  );
}

function NoteSection({
  title,
  notes,
  placeholder,
  onSubmit,
  onEdit,
  onDelete,
  readOnly = false,
}: {
  title: string;
  notes: any[];
  placeholder: string;
  onSubmit: (text: string) => void;
  onEdit: (noteId: string, text: string) => void;
  onDelete: (noteId: string) => void;
  readOnly?: boolean;
}) {
  const [text, setText] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-slate-800">
        <MessageSquare className="h-3.5 w-3.5 text-indigo-600" />
        {title}
      </div>
      <div className="space-y-2">
        {notes.length ? (
            notes.filter((note: any) => !note.deletedAt).map((note: any) => (
            <p
              key={note.noteId}
              className="rounded-lg bg-slate-50 p-2 text-xs text-slate-700"
            >
              <strong>{note.authorName || "Admin"}:</strong>{" "}
              {editingId === note.noteId ? (
                <span className="inline-flex w-full flex-wrap gap-2 align-middle">
                  <input value={editingText} onChange={(event) => setEditingText(event.target.value)} className="min-w-[180px] flex-1 rounded border border-slate-200 px-2 py-1 text-xs" />
                  <button disabled={!editingText.trim()} onClick={() => { onEdit(note.noteId, editingText); setEditingId(null); }} className="font-semibold text-indigo-600 disabled:text-slate-300">Save</button>
                  <button onClick={() => setEditingId(null)} className="font-semibold text-slate-500">Cancel</button>
                </span>
              ) : <span>{note.text}</span>}
              <span className="ml-2 text-[10px] text-slate-400">{note.createdAt ? formatSubmittedTime(note.createdAt) : ""}</span>
              {note.editedAt && <span className="ml-1 text-[10px] text-slate-400">(edited)</span>}
              {!readOnly && editingId !== note.noteId && (
                <span className="ml-2 inline-flex gap-2">
                  <button onClick={() => { setEditingId(note.noteId); setEditingText(note.text); }} className="font-semibold text-indigo-600">Edit</button>
                  <button onClick={() => onDelete(note.noteId)} className="font-semibold text-rose-600">Delete</button>
                </span>
              )}
            </p>
          ))
        ) : (
          <p className="text-xs text-slate-400">None</p>
        )}
      </div>
      <textarea
        disabled={readOnly}
        value={text}
        onChange={(event) => setText(event.target.value)}
        aria-label={title}
        placeholder={placeholder}
        className="mt-3 h-16 w-full resize-none rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs outline-none focus:border-indigo-400"
      />
      <button
        disabled={readOnly || !text.trim()}
        onClick={() => {
          onSubmit(text);
          setText("");
        }}
        className="mt-2 text-[11px] font-semibold text-indigo-600 disabled:text-slate-300"
      >
        Add {title === "Comments" ? "Comment" : "Note"}
      </button>
    </section>
  );
}

function EmptyState({
  title,
  description,
  compact = false,
}: {
  title: string;
  description: string;
  compact?: boolean;
}) {
  return (
    <div className={cn("text-center", compact ? "py-6" : "p-12")}>
      <Layers3 className="mx-auto h-7 w-7 text-slate-300" />
      <p className="mt-3 text-sm font-semibold text-slate-700">{title}</p>
      <p className="mt-1 text-xs text-slate-400">{description}</p>
    </div>
  );
}

function ModalShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-[2px]">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {children}
      </div>
    </div>
  );
}

function ReviewAgainModal({
  row,
  annotators,
  reason,
  setReason,
  comment,
  setComment,
  deadlineDate,
  setDeadlineDate,
  deadlineTime,
  setDeadlineTime,
  selected,
  setSelected,
  onClose,
  onSubmit,
  submitting = false,
}: any) {
  const allSelected =
    annotators.length > 0 && selected.length === annotators.length;
  const toggleAll = () =>
    setSelected(
      allSelected ? [] : annotators.map((annotator: Annotator) => annotator.id),
    );
  return (
    <ModalShell>
      <div className="border-b border-slate-100 px-5 py-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-violet-600" />
              <h2 className="text-base font-semibold text-slate-900">
                Send Back For Re-Annotation
              </h2>
            </div>
            <p className="text-xs text-slate-500">
              {row
                ? `Request a correction for Row ${row.rowIndex + 1}.`
                : "Select a row before requesting re-annotation."}
            </p>
          </div>
          <button
            aria-label="Close Review Again modal"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="space-y-5 p-5">
        {(row?.status === "REVIEW_REQUESTED" || row?.status === "RE_SUBMITTED") && (
          <div className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-800">
            This row already has an active review request. Already Waiting For Annotator.
          </div>
        )}
        <label className="block text-xs font-semibold text-slate-700">
          Reason
          <select
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-normal outline-none focus:border-violet-400"
          >
            <option>Incorrect Label</option>
            <option>Incomplete Annotation</option>
            <option>Low Confidence</option>
            <option>Wrong Field</option>
            <option>Needs Clarification</option>
            <option>Other</option>
          </select>
        </label>
        <label className="block text-xs font-semibold text-slate-700">
          Comment <span className="text-rose-500">*</span>
          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="Explain what should be corrected..."
            className="mt-1.5 h-20 w-full resize-none rounded-lg border border-slate-200 p-2.5 text-xs font-normal outline-none focus:border-violet-400"
          />
        </label>
        <label className="block text-xs font-semibold text-slate-700">
          Deadline
          <div className="mt-1.5 grid grid-cols-2 gap-2">
            <input
              type="date"
              value={deadlineDate}
              onChange={(event) => setDeadlineDate(event.target.value)}
              className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-normal outline-none focus:border-violet-400"
            />
            <input
              type="time"
              value={deadlineTime}
              onChange={(event) => setDeadlineTime(event.target.value)}
              className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-normal outline-none focus:border-violet-400"
            />
          </div>
        </label>
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-700">
              Annotator Selection
            </p>
            <button
              onClick={toggleAll}
              className="text-[11px] font-semibold text-violet-600"
            >
              {allSelected ? "Clear all" : "Select all"}
            </button>
          </div>
          <div className="space-y-2">
             {annotators.length ? annotators.map((annotator: Annotator) => (
              <label
                key={annotator.id}
                className="flex items-center gap-2 rounded-lg border border-slate-100 px-3 py-2"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(annotator.id)}
                  onChange={() =>
                    setSelected((current: string[]) =>
                      current.includes(annotator.id)
                        ? current.filter((id) => id !== annotator.id)
                        : [...current, annotator.id],
                    )
                  }
                  className="accent-violet-600"
                />
                <Avatar
                  name={annotator.name}
                  color="bg-indigo-100 text-indigo-700"
                  size="h-6 w-6"
                />
                <span className="text-xs font-medium text-slate-700">
                  {annotator.name}
                </span>
                <span className="ml-auto text-[10px] text-slate-400">
                  {annotator.isOnline ? "Online" : "Offline"}
                </span>
              </label>
             )) : <p className="text-xs text-slate-400">No annotators are assigned to this dataset.</p>}
          </div>
        </div>
        <div className="rounded-xl border border-violet-100 bg-violet-50/60 p-3">
          <div className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-violet-700">
            <Send className="h-3 w-3" />
            Notification Preview
          </div>
          <p className="text-[11px] leading-relaxed text-violet-950">
            You have a review request for{" "}
            <strong>{row ? `Row ${row.rowIndex + 1}` : "this row"}</strong> in{" "}
            <strong>{row ? "this dataset" : "the dataset"}</strong>. Reason:{" "}
            <strong>{reason}</strong>.{" "}
            {comment || "Your comment will appear here."} Deadline:{" "}
            <strong>
              {deadlineDate} at {deadlineTime}
            </strong>
            .
          </p>
        </div>
      </div>
      <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
        <Button variant="outline" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button
          size="sm"
           disabled={submitting || row?.status === "REVIEW_REQUESTED" || row?.status === "RE_SUBMITTED" || !comment.trim() || selected.length === 0 || !row}
          onClick={onSubmit}
          className="gap-1.5 bg-violet-600 text-white hover:bg-violet-700"
        >
          {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          {submitting ? "Sending..." : "Send Review Request"}
        </Button>
      </div>
    </ModalShell>
  );
}
