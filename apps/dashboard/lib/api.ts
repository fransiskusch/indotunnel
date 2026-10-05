export type Plan = {
  code: string;
  name: string;
  max_active_tunnels: number;
  daily_request_limit: number;
  monthly_bandwidth_limit_bytes: number;
};

export type User = {
  id: string;
  email: string;
  name: string;
};

export type AuthResponse = { user: User; plan: Plan };

export type Tunnel = {
  tunnel_id: string;
  subdomain: string;
  public_url: string;
  status: string;
  local_host: string;
  local_port: number;
  protocol: string;
  created_at?: string;
};

export type RequestLog = {
  request_id: string;
  method: string;
  path: string;
  host: string;
  status_code: number;
  request_bytes: number;
  response_bytes: number;
  duration_ms: number;
  started_at: string;
};

export type DailyUsage = {
  date: string;
  request_count: number;
  bytes_in: number;
  bytes_out: number;
};

export type UsageToday = { used: number; limit: number };
export type UsageMonth = { bytes: number; limit: number };

export class ApiError extends Error {
  code: string;
  status: number;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function parseError(res: Response): Promise<ApiError> {
  try {
    const body = await res.json();
    return new ApiError(res.status, body?.error?.code ?? "ERROR", body?.error?.message ?? res.statusText);
  } catch {
    return new ApiError(res.status, "ERROR", res.statusText);
  }
}

// serverFetch calls the Go API directly, forwarding the session cookie. Use
// only in server components / route handlers.
export async function serverFetch<T>(path: string): Promise<T> {
  const base = process.env.API_BASE_URL ?? "http://localhost:8081";
  const { cookies } = await import("next/headers");
  const jar = await cookies();
  const cookie = jar.toString();
  const res = await fetch(`${base}/v1${path}`, {
    headers: cookie ? { cookie } : {},
    cache: "no-store",
  });
  if (!res.ok) throw await parseError(res);
  return (await res.json()) as T;
}

// clientFetch goes through the Next.js rewrite at /api/* with same-origin
// credentials so the browser sends the cookie.
export async function clientFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    credentials: "same-origin",
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) throw await parseError(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export function login(email: string, password: string) {
  return clientFetch<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function signup(email: string, password: string) {
  return clientFetch<AuthResponse>("/auth/signup", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function logout() {
  return clientFetch<void>("/auth/logout", { method: "POST" });
}

export function me() {
  return clientFetch<AuthResponse>("/auth/me");
}

export function listTunnels() {
  return clientFetch<{ tunnels: Tunnel[] }>("/tunnels");
}

export function usageToday() {
  return clientFetch<UsageToday>("/usage/today");
}

export function usageMonth() {
  return clientFetch<UsageMonth>("/usage/month");
}

export function usageHistory(days = 7) {
  return clientFetch<{ days: DailyUsage[] }>(`/usage/history?days=${days}`);
}

export function listRequests(tunnelId: string, limit = 100) {
  return clientFetch<{ requests: RequestLog[] }>(
    `/tunnels/${tunnelId}/requests?limit=${limit}`
  );
}

export function getRequest(tunnelId: string, requestId: string) {
  return clientFetch<RequestLog>(`/tunnels/${tunnelId}/requests/${requestId}`);
}
