import { DeviceActivationForm } from "@/components/device-activation-form";
import { Terminal } from "lucide-react";

export const dynamic = "force-dynamic";

interface ActivatePageProps {
  searchParams: Promise<{ code?: string }>;
}

export default async function ActivatePage({ searchParams }: ActivatePageProps) {
  const { code } = await searchParams;

  return (
    <div className="space-y-6 pt-6">
      <div className="flex flex-col items-center justify-center text-center space-y-1">
        <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
          <Terminal className="h-3.5 w-3.5" /> DEVICE AUTHENTICATION
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white">CLI Activation</h1>
      </div>

      <DeviceActivationForm initialCode={code ?? ""} />
    </div>
  );
}
