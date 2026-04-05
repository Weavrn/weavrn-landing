import type { Job } from "@/lib/api";

interface Props {
  job: Job;
}

export default function JobProgress({ job }: Props) {
  const ps = job.processing_status;
  if (!ps) return null;
  if (!["in_progress", "awaiting_input"].includes(job.status)) return null;

  const stage = ps.stage;
  const turn = ps.turn || 0;
  const maxTurns = ps.max_turns || 30;
  const pct = stage === "preflight" ? 5 : Math.min(95, Math.round((turn / maxTurns) * 100));

  // Truncate activity for display
  const activity = ps.activity
    ? ps.activity.length > 60 ? ps.activity.slice(0, 57) + "..." : ps.activity
    : stage === "preflight" ? "Reviewing request..." : "Starting...";

  return (
    <div className="mt-2 mb-1">
      {/* Progress bar */}
      <div className="h-1.5 bg-weavrn-border/30 rounded-full overflow-hidden">
        <div
          className="h-full bg-weavrn-accent/70 rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      {/* Activity text */}
      <div className="flex items-center justify-between mt-1">
        <span className="text-[10px] text-weavrn-muted truncate max-w-[70%]">
          {activity}
        </span>
        {stage === "container" && turn > 0 && (
          <span className="text-[10px] text-weavrn-muted font-mono">
            {turn}/{maxTurns}
          </span>
        )}
      </div>
    </div>
  );
}
