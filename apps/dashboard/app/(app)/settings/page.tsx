import { serverFetch, type APIKey, type AuthResponse } from "@/lib/api";
import { ApiKeysCard } from "@/components/api-keys-card";
import { StatBoard } from "@/components/stat-board";
import { Reveal } from "@/components/reveal";

export const dynamic = "force-dynamic";

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let v = n / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(1)} ${units[i]}`;
}

export default async function SettingsPage() {
  let initialKeys: APIKey[] = [];
  try {
    const res = await serverFetch<{ api_keys: APIKey[] }>("/api-keys");
    initialKeys = res.api_keys ?? [];
  } catch (err) {
    initialKeys = [];
  }

  let account: AuthResponse | null = null;
  try {
    account = await serverFetch<AuthResponse>("/auth/me");
  } catch (err) {
    account = null;
  }

  return (
    <Reveal>
      <div data-rise>
        <h1
          className="font-medium leading-[1.02] tracking-[-0.03em] text-[color:var(--ink)]"
          style={{ fontSize: "var(--step-head)" }}
        >
          API keys
        </h1>
        <p className="mt-4 max-w-[54ch] text-[16px] text-[color:var(--ink-muted)]">
          Keys let the CLI and your own tooling authenticate against IndoTunnel.
          Revoke a key the moment a machine stops using it.
        </p>
      </div>

      <div data-rise>
        <ApiKeysCard initialKeys={initialKeys} />
      </div>

      <div data-rise>
        <ApiKeysCard initialKeys={initialKeys} />
      </div>

      {account && (
        <div>
          <h2 data-rise className="text-[20px] font-medium text-[color:var(--ink)]">
            Your plan
          </h2>
          <div data-rise className="mt-5">
            <StatBoard
              stats={[
                { label: "Plan", value: account.plan.name },
                {
                  label: "Active tunnels",
                  value: String(account.plan.max_active_tunnels),
                  note: "at once",
                },
                {
                  label: "Requests per day",
                  value: account.plan.daily_request_limit.toLocaleString(),
                },
              ]}
            />
          </div>
          <p className="mt-4 text-[15px] text-[color:var(--ink-muted)]">
            {`${account.user.email} — ${formatBytes(
              account.plan.monthly_bandwidth_limit_bytes,
            )} of bandwidth each month`}
          </p>
          <div
            data-ui
            className="mt-6 rounded-md p-6 sm:p-8"
            style={{ backgroundColor: "var(--surface-2)" }}
          >
            <p className="max-w-[62ch] text-[16px] text-[color:var(--ink)]">
              Bandwidth is counted across every tunnel on the account and resets on the first of
              the month. Hitting the daily request limit pauses new traffic until midnight.
            </p>
          </div>
        </div>
      )}

      <div>
        <h2 data-rise className="text-[20px] font-medium text-[color:var(--ink)]">
          Using a key
        </h2>
        <div
          data-rise
          data-ui
          className="mt-5 rounded-md p-6 sm:p-8"
          style={{ backgroundColor: "var(--surface-2)" }}
        >
          <p className="max-w-[60ch] text-[16px] text-[color:var(--ink-muted)]">
            Pass the key as a bearer token when you open a tunnel, or export it
            once and every later command picks it up.
          </p>
          <pre
            className="mt-5 overflow-x-auto rounded-md p-4 text-[14px] text-[color:var(--ink)]"
            style={{ backgroundColor: "var(--bg)" }}
          >
            <code>{`indotunnel http 8080 --token sk_live_...
export INDOTUNNEL_TOKEN=sk_live_...
indotunnel http 8080 --subdomain id-cgk-4821`}</code>
          </pre>
        </div>
      </div>
    </Reveal>
  );
}
