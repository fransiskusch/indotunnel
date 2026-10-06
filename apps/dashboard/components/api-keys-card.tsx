"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createAPIKey, revokeAPIKey, type APIKey, type CreatedAPIKey } from "@/lib/api";
import { Key, Plus, Trash2, Copy, Check, AlertTriangle, ShieldCheck } from "lucide-react";

interface ApiKeysCardProps {
  initialKeys: APIKey[];
}

export function ApiKeysCard({ initialKeys }: ApiKeysCardProps) {
  const [keys, setKeys] = useState<APIKey[]>(initialKeys);
  const [isCreating, setIsCreating] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [loading, setLoading] = useState(false);
  const [newKey, setNewKey] = useState<CreatedAPIKey | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!keyName.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const created = await createAPIKey(keyName.trim());
      setNewKey(created);
      setKeys((prev) => [
        {
          id: created.id,
          user_id: "",
          name: created.name,
          key_prefix: created.key_prefix,
          status: "active",
          created_at: created.created_at,
        },
        ...prev,
      ]);
      setKeyName("");
      setIsCreating(false);
    } catch (err: any) {
      setError(err?.message || "Failed to create API key");
    } finally {
      setLoading(false);
    }
  }

  async function handleRevoke(id: string) {
    if (!confirm("Are you sure you want to revoke this API key? This action cannot be undone.")) {
      return;
    }
    try {
      await revokeAPIKey(id);
      setKeys((prev) =>
        prev.map((k) => (k.id === id ? { ...k, status: "revoked" } : k))
      );
    } catch (err: any) {
      alert("Failed to revoke API key: " + (err?.message || "Unknown error"));
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <div className="space-y-6">
      {newKey && (
        <Card className="border-emerald-500/40 bg-emerald-950/20 backdrop-blur-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-emerald-400 text-base flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" /> API Key Created Successfully
            </CardTitle>
            <CardDescription className="text-zinc-300">
              Please copy your secret key right now. For security reasons, it will never be displayed again.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex-1 font-mono text-sm bg-zinc-950/80 border border-zinc-800 rounded-lg px-3 py-2 text-emerald-300 select-all overflow-x-auto">
                {newKey.key}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-white gap-1.5"
                onClick={() => copyToClipboard(newKey.key)}
              >
                {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
            <div className="flex items-center justify-between text-xs text-zinc-400 pt-1">
              <span className="flex items-center gap-1.5 text-amber-400/90">
                <AlertTriangle className="h-3.5 w-3.5" /> Do not share this key with anyone.
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7 text-zinc-400 hover:text-white"
                onClick={() => setNewKey(null)}
              >
                Dismiss
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
          <div>
            <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
              <Key className="h-4 w-4 text-emerald-400" />
              API Keys
            </CardTitle>
            <CardDescription className="mt-1">
              API keys allow the IndoTunnel CLI and external tools to authenticate securely.
            </CardDescription>
          </div>
          {!isCreating && (
            <Button
              size="sm"
              onClick={() => setIsCreating(true)}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold gap-1.5 shrink-0"
            >
              <Plus className="h-4 w-4" /> Create Key
            </Button>
          )}
        </CardHeader>

        {isCreating && (
          <div className="px-5 pb-5 border-b border-zinc-800/60">
            <form onSubmit={handleCreate} className="bg-zinc-900/60 p-4 rounded-lg border border-zinc-800 space-y-3">
              <div className="text-sm font-medium text-white">Create New API Key</div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  type="text"
                  placeholder="Key name (e.g. Work Laptop, CI/CD)"
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  className="flex-1 bg-zinc-950 border-zinc-800 text-white"
                  autoFocus
                />
                <div className="flex items-center gap-2">
                  <Button
                    type="submit"
                    size="sm"
                    disabled={loading || !keyName.trim()}
                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold"
                  >
                    {loading ? "Generating..." : "Generate"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsCreating(false);
                      setKeyName("");
                      setError(null);
                    }}
                    className="text-zinc-400 hover:text-white"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
              {error && <div className="text-xs text-red-400">{error}</div>}
            </form>
          </div>
        )}

        <CardContent className="p-0">
          {keys.length === 0 ? (
            <div className="p-8 text-center text-sm text-zinc-500">
              No API keys generated yet. Click &quot;Create Key&quot; or run &quot;indotunnel login&quot; in terminal to generate one.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800/60 hover:bg-transparent">
                  <TableHead className="text-zinc-400">Name</TableHead>
                  <TableHead className="text-zinc-400">Key Prefix</TableHead>
                  <TableHead className="text-zinc-400">Status</TableHead>
                  <TableHead className="text-zinc-400">Created</TableHead>
                  <TableHead className="text-right text-zinc-400">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keys.map((k) => (
                  <TableRow key={k.id} className="border-zinc-800/40 hover:bg-zinc-800/30">
                    <TableCell className="font-medium text-white">{k.name}</TableCell>
                    <TableCell className="font-mono text-xs text-zinc-400">
                      {k.key_prefix}...
                    </TableCell>
                    <TableCell>
                      {k.status === "active" ? (
                        <Badge variant="default">active</Badge>
                      ) : (
                        <Badge variant="destructive">revoked</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-zinc-500">
                      {new Date(k.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {k.status === "active" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRevoke(k.id)}
                          className="h-8 w-8 p-0 text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
                          title="Revoke key"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
