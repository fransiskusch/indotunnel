import { DeviceActivationForm } from "@/components/device-activation-form";
import { Reveal } from "@/components/reveal";

export const dynamic = "force-dynamic";

interface ActivatePageProps {
  searchParams: Promise<{ code?: string }>;
}

export default async function ActivatePage({ searchParams }: ActivatePageProps) {
  const { code } = await searchParams;

  return (
    <Reveal>
      <div data-rise>
        <h1
          className="font-medium leading-[1.02] tracking-[-0.03em] text-[color:var(--ink)]"
          style={{ fontSize: "var(--step-head)" }}
        >
          Authorize the CLI
        </h1>
        <p className="mt-4 max-w-[54ch] text-[16px] text-[color:var(--ink-muted)]">
          A terminal is asking to use your IndoTunnel account. Enter the code it
          printed to grant it a dedicated key.
        </p>
      </div>

      <div data-rise className="max-w-md">
        <DeviceActivationForm initialCode={code ?? ""} />
      </div>
    </Reveal>
  );
}
