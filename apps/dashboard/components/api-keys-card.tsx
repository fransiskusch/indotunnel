"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createAPIKey, revokeAPIKey, type APIKey, type CreatedAPIKey } from "@/lib/api";

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
    if (!confirm("Revoke this API key? Anything using it will stop working immediately.")) {
      return;
    }
    try {
      await revokeAPIKey(id);
      setKeys((prev) => prev.map((k) => (k.id === id ? { ...k, status: "revoked" } : k)));
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
        <div
          className="rounded-md p-6"
          style={{ backgroundColor: "var(--brand)", color: "var(--brand-ink)" }}
        >
          <p className="text-[20px] font-medium">Your new key</p>
          <p className="mt-2 text-[16px]">
            Copy it now. For security it is never shown again, and it must not be shared.
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
            <code
              className="flex-1 select-all overflow-x-auto rounded-md px-4 py-3 text-[14px]"
              style={{ backgroundColor: "var(--bg)", color: "var(--ink)" }}
            >
              {newKey.key}
            </code>
            <Button
              variant="secondary"
              size="sm"
              className="shrink-0"
              onClick={() => copyToClipboard(newKey.key)}
            >
              {copied ? "Copied" : "Copy key"}
            </Button>
          </div>
          <button
            type="button"
            onClick={() => setNewKey(null)}
            className="mt-4 text-[15px] underline underline-offset-4"
          >
            Dismiss
          </button>
        </div>
      )}

      <div data-ui className="rounded-md bg-[color:var(--surface-2)]">
        <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <p className="text-[20px] font-medium text-[color:var(--ink)]">
            {keys.length === 0 ? "No keys yet" : `${keys.length} key${keys.length === 1 ? "" : "s"}`}
          </p>
          {!isCreating && (
            <Button size="sm" onClick={() => setIsCreating(true)}>
              Create key
            </Button>
          )}
        </div>

        {isCreating && (
          <form onSubmit={handleCreate} className="mx-6 mb-6 space-y-4 sm:mx-8">
            <label className="block text-[15px] font-medium text-[color:var(--ink)]">
              Key name
              <Input
                type="text"
                placeholder="Work laptop, CI, staging…"
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                className="mt-2"
                autoFocus
              />
            </label>
            <div className="flex items-center gap-3">
              <Button type="submit" size="sm" disabled={loading || !keyName.trim()}>
                {loading ? "Generating…" : "Generate key"}
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
              >
                Cancel
              </Button>
            </div>
            {error && <p className="text-[15px] text-[color:var(--danger)]">{error}</p>}
          </form>
        )}

        {keys.length === 0 ? (
          <p className="px-6 pb-8 text-[16px] text-[color:var(--ink-muted)] sm:px-8">
            Generate a key here, or run <code>indotunnel login</code> in your terminal.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden sm:table-cell">Prefix</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden sm:table-cell">Created</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {keys.map((k) => (
                <TableRow key={k.id}>
                  <TableCell className="font-medium">{k.name}</TableCell>
                  <TableCell className="hidden text-[color:var(--ink-muted)] sm:table-cell">
                    {k.key_prefix}…
                  </TableCell>
                  <TableCell>
                    <Badge variant={k.status === "active" ? "default" : "destructive"}>
                      {k.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden whitespace-nowrap text-[color:var(--ink-muted)] sm:table-cell">
                    {new Date(k.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {k.status === "active" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRevoke(k.id)}
                        className="hover:text-[color:var(--danger)]"
                      >
                        Revoke
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
