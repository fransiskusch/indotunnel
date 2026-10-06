import { serverFetch, type APIKey } from "@/lib/api";
import { ApiKeysCard } from "@/components/api-keys-card";
import { Key } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  let initialKeys: APIKey[] = [];
  try {
    const res = await serverFetch<{ api_keys: APIKey[] }>("/api-keys");
    initialKeys = res.api_keys ?? [];
  } catch (err) {
    initialKeys = [];
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 mb-1">
            <Key className="h-3.5 w-3.5" /> SECURITY & ACCESS
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Settings</h1>
        </div>
      </div>

      <ApiKeysCard initialKeys={initialKeys} />
    </div>
  );
}
