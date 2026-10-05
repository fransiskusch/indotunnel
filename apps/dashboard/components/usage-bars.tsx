import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function formatBytes(n: number): string {
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

function Bar({ label, used, limit, format }: { label: string; used: number; limit: number; format: (n: number) => string }) {
  const pct = limit > 0 ? (used / limit) * 100 : 0;
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span>
          {format(used)} / {format(limit)}
        </span>
      </div>
      <Progress value={pct} />
    </div>
  );
}

export function UsageBars({
  todayUsed,
  todayLimit,
  monthBytes,
  monthLimit,
}: {
  todayUsed: number;
  todayLimit: number;
  monthBytes: number;
  monthLimit: number;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Usage</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <Bar
          label="Requests today"
          used={todayUsed}
          limit={todayLimit}
          format={(n) => n.toLocaleString()}
        />
        <Bar
          label="Bandwidth this month"
          used={monthBytes}
          limit={monthLimit}
          format={formatBytes}
        />
      </CardContent>
    </Card>
  );
}
