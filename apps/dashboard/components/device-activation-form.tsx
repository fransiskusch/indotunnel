"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { verifyDeviceCode } from "@/lib/api";
import { Terminal, ShieldCheck, AlertCircle, ArrowRight } from "lucide-react";
import Link from "next/link";

interface DeviceActivationFormProps {
  initialCode?: string;
}

export function DeviceActivationForm({ initialCode = "" }: DeviceActivationFormProps) {
  const [code, setCode] = useState(initialCode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleApprove(e: React.FormEvent) {
    e.preventDefault();
    const formatted = code.trim().toUpperCase();
    if (!formatted) {
      setError("Please enter the confirmation code from your terminal.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await verifyDeviceCode(formatted);
      setSuccess(true);
    } catch (err: any) {
      if (err?.code === "NOT_FOUND" || err?.status === 404) {
        setError("Code expired or not found. Please run 'indotunnel login' again.");
      } else {
        setError(err?.message || "Failed to authorize device. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <Card className="max-w-md mx-auto border-emerald-500/40 bg-emerald-950/20 backdrop-blur-md">
        <CardHeader className="text-center pb-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 mb-2">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl text-white">Device Authorized!</CardTitle>
          <CardDescription className="text-zinc-300">
            Your IndoTunnel CLI is now authenticated and ready to use.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-2 text-center">
          <p className="text-sm text-zinc-400">
            You can safely close this browser window and return to your terminal.
          </p>
          <div className="pt-2">
            <Link href="/dashboard">
              <Button variant="outline" className="border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-white gap-2">
                Go to Dashboard <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader className="text-center pb-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800 text-emerald-400 border border-zinc-700 mb-2">
          <Terminal className="h-6 w-6" />
        </div>
        <CardTitle className="text-xl text-white">Authorize CLI Login</CardTitle>
        <CardDescription>
          A terminal is requesting access to your IndoTunnel account.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleApprove} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-400 block text-center">
              Enter the 8-character code shown in your terminal
            </label>
            <Input
              type="text"
              placeholder="ABCD-1234"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase());
                setError(null);
              }}
              className="text-center font-mono text-xl tracking-widest uppercase bg-zinc-950 border-zinc-800 text-emerald-400 h-12"
              maxLength={12}
              autoFocus
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 text-xs text-red-400 bg-red-950/20 border border-red-900/40 rounded-lg">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button
            type="submit"
            disabled={loading || !code.trim()}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold h-11"
          >
            {loading ? "Authorizing..." : "Approve Device"}
          </Button>

          <p className="text-[11px] text-zinc-500 text-center pt-1">
            This will create a dedicated API key for this device. You can revoke it anytime in Settings.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
