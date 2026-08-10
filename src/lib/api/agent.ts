import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const authHeaders = () => {
  const token = localStorage.getItem('accessToken');
  return { Authorization: `Bearer ${token}` };
};

export interface AgentQuestion {
  id: string;
  question: string;
  options: string[];
  tip?: string;
  type?: 'single' | 'multi';
  default?: string | string[];
}

export interface AgentQuestionsResponse {
  questions: AgentQuestion[];
  fallbackAnswers: Record<string, string | string[]>;
  generated: boolean;
}

export interface AgentPlanItem {
  id: string;
  priority: 'high' | 'medium' | 'low';
  title: string;
  detail: string;
  owner: string;
  effort: string;
  impact: string;
  estimate?: string;
  dependsOn?: string[];
  successMetric?: string;
  tags?: string[];
}

export interface AgentPhase {
  name: string;
  goal: string;
  steps: AgentPlanItem[];
}

export interface AgentKpi {
  label: string;
  current: string | number | null;
  target: string | number | null;
  unit?: string;
  direction?: 'higher' | 'lower';
}

export interface AgentScope {
  inScope: string[];
  outOfScope: string[];
  assumptions: string[];
}

export interface DatasetStats {
  dataset: {
    name: string;
    type: string;
    accessType: string;
    createdAt?: string | null;
    updatedAt?: string | null;
  };
  volume: {
    rows: number;
    columns: number;
    csvFiles: number;
    columnsList: string[];
    csvSources: { fileName: string; rows: number; processedRows: number }[];
  };
  progress: {
    total: number;
    notStarted: number;
    pending: number;
    partial: number;
    completed: number;
    conflict: number;
    tie: number;
    completedRows: number;
    totalRowsAnnotated: number;
    annotators: number;
    chart: { name: string; value: number }[];
    annotatorProgress: { name: string; assigned: number; completed: number }[];
  };
  reliability: {
    metric: string | null;
    overallValue: number | null;
    overallLabel: string | null;
    perField: {
      field: string;
      value: number | null;
      metric: string | null;
      band: 'low' | 'medium' | 'high' | null;
    }[];
    distribution: { name: string; value: number }[];
  };
  health: {
    status: string;
    reviews: number;
    agreed: number;
    conflict: number;
    tie: number;
    pending: number;
    sessionsTotal: number;
    sessionsActive: number;
    sessionsCompleted: number;
    chart: { name: string; value: number }[];
  };
  trend: {
    days: number;
    bucket: string;
    series: { date: string; total: number; byType: Record<string, number> }[];
  };
}

export interface StoredPlanSummary {
  planId: string;
  datasetId: string;
  generatedAt: string;
  model?: string;
  plan?: { summary?: string; confidence?: number };
}

export interface AgentPlan {
  planId?: string;
  headline: string;
  verdict: string;
  objective: string;
  summary: string;
  scope: AgentScope;
  phases: AgentPhase[];
  actionPlan: AgentPlanItem[];
  timeline: {
    totalEffort: string;
    milestones: { label: string; eta: string }[];
  };
  report: {
    metrics: Record<string, number | string>;
    kpis: AgentKpi[];
    risks: string[];
    recommendations: string[];
  };
  confidence: number;
  reasoningTokens: number;
  model?: string;
  generatedAt?: string;
  datasetStats?: DatasetStats;
}

export interface PlanStreamHandlers {
  onStart?: (data: { model: string }) => void;
  onToken?: (text: string) => void;
  onUsage?: (data: { reasoningTokens: number }) => void;
  onResult?: (plan: AgentPlan) => void;
  onError?: (message: string) => void;
}

export interface ChatAnswer {
  answer: string;
  model?: string;
  generatedAt?: string;
  datasetStats?: DatasetStats;
}

export interface ChatStreamHandlers {
  onStart?: (data: { model: string }) => void;
  onToken?: (text: string) => void;
  onUsage?: (data: { reasoningTokens: number }) => void;
  onResult?: (answer: ChatAnswer) => void;
  onError?: (message: string) => void;
}

export const agentAPI = {
  async getQuestions(datasetId: string): Promise<AgentQuestionsResponse> {
    const res = await axios.get(`${API_BASE_URL}/ai-agent/${datasetId}/questions`, {
      headers: authHeaders(),
    });
    return res.data;
  },

  async listPlans(datasetId: string): Promise<StoredPlanSummary[]> {
    const res = await axios.get(`${API_BASE_URL}/ai-agent/${datasetId}/plans`, {
      headers: authHeaders(),
    });
    return res.data;
  },

  async getPlan(datasetId: string, planId: string): Promise<AgentPlan> {
    const res = await axios.get(
      `${API_BASE_URL}/ai-agent/${datasetId}/plans/${planId}`,
      { headers: authHeaders() },
    );
    const doc = res.data;
    return {
      ...(doc?.plan || {}),
      planId: doc?.planId,
      model: doc?.model,
      generatedAt: doc?.generatedAt,
      datasetStats: doc?.datasetStats,
    } as AgentPlan;
  },

  /**
   * Streams the agent plan over a POST + SSE connection. NestJS @Sse() emits
   * frames of the form "event: <type>\ndata: <json>\n\n"; we parse them with a
   * standard SSE parser and dispatch to the handlers.
   */
  async streamPlan(
    datasetId: string,
    answers: Record<string, string | string[]>,
    handlers: PlanStreamHandlers,
  ): Promise<void> {
    const token = localStorage.getItem('accessToken');
    const res = await fetch(`${API_BASE_URL}/ai-agent/${datasetId}/plan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ answers }),
    });

    if (!res.ok || !res.body) {
      let msg = `Request failed (${res.status})`;
      try {
        const body = await res.json();
        msg = body.message || msg;
      } catch {
        /* ignore */
      }
      handlers.onError?.(msg);
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    const dispatch = (event: string, data: string) => {
      if (!data) return;
      let parsed: any;
      try {
        parsed = JSON.parse(data);
      } catch {
        parsed = data;
      }
      switch (event) {
        case 'start':
          handlers.onStart?.(parsed as { model: string });
          break;
        case 'token':
          handlers.onToken?.((parsed as { text?: string }).text || '');
          break;
        case 'usage':
          handlers.onUsage?.(parsed as { reasoningTokens: number });
          break;
        case 'result':
          handlers.onResult?.(parsed as AgentPlan);
          break;
        case 'error':
          handlers.onError?.((parsed as { message?: string }).message || 'Agent error');
          break;
        default:
          break;
      }
    };

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // Split on the SSE frame delimiter.
        let sepIndex: number;
        while ((sepIndex = buffer.indexOf('\n\n')) !== -1) {
          const frame = buffer.slice(0, sepIndex);
          buffer = buffer.slice(sepIndex + 2);
          let event = 'message';
          const dataLines: string[] = [];
          for (const line of frame.split('\n')) {
            if (line.startsWith('event:')) event = line.slice(6).trim();
            else if (line.startsWith('data:')) dataLines.push(line.slice(5).trimStart());
          }
          dispatch(event, dataLines.join('\n'));
        }
      }
    } finally {
      reader.releaseLock();
    }
  },

  /**
   * Streams a free-form analysis answer about a dataset over POST + SSE.
   * Dispatch events: start / token / usage / result (ChatAnswer) / error.
   */
  async chatStream(
    datasetId: string,
    question: string,
    handlers: ChatStreamHandlers,
  ): Promise<void> {
    const token = localStorage.getItem('accessToken');
    await this.streamGeneric(
      `/ai-agent/${datasetId}/chat`,
      { question },
      token,
      (event, data) => {
        switch (event) {
          case 'start':
            handlers.onStart?.(data as { model: string });
            break;
          case 'token':
            handlers.onToken?.((data as { text?: string }).text || '');
            break;
          case 'usage':
            handlers.onUsage?.(data as { reasoningTokens: number });
            break;
          case 'result':
            handlers.onResult?.(data as ChatAnswer);
            break;
          case 'error':
            handlers.onError?.((data as { message?: string }).message || 'Agent error');
            break;
          default:
            break;
        }
      },
    );
  },

  /**
   * Shared POST + SSE reader. Consider this internal — public wrappers
   * (streamPlan / chatStream) decode the events into typed callbacks.
   */
  async streamGeneric(
    path: string,
    body: unknown,
    token: string | null,
    dispatch: (event: string, data: any) => void,
  ): Promise<void> {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok || !res.body) {
      let msg = `Request failed (${res.status})`;
      try {
        const bodyJson = await res.json();
        msg = bodyJson.message || msg;
      } catch {
        /* ignore */
      }
      dispatch('error', { message: msg });
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let sepIndex: number;
        while ((sepIndex = buffer.indexOf('\n\n')) !== -1) {
          const frame = buffer.slice(0, sepIndex);
          buffer = buffer.slice(sepIndex + 2);
          let event = 'message';
          const dataLines: string[] = [];
          for (const line of frame.split('\n')) {
            if (line.startsWith('event:')) event = line.slice(6).trim();
            else if (line.startsWith('data:')) dataLines.push(line.slice(5).trimStart());
          }
          const dataStr = dataLines.join('\n');
          if (!dataStr) continue;
          let parsed: any;
          try {
            parsed = JSON.parse(dataStr);
          } catch {
            parsed = dataStr;
          }
          dispatch(event, parsed);
        }
      }
    } finally {
      reader.releaseLock();
    }
  },
};

export default agentAPI;
