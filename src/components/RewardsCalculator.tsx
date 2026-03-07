"use client";

import { useState, useMemo } from "react";

const LAUNCH_DATE = new Date("2026-04-01");
const INITIAL_EMISSION = 50000;
const MIN_EMISSION = 1000;
const ASSUMED_DAILY_TOTAL_SCORE = 100000;

const HALVING_SCHEDULE = [
  { label: "1", emission: "50,000 WVRN", starts: "Launch" },
  { label: "2", emission: "25,000 WVRN", starts: "Day 91" },
  { label: "3", emission: "12,500 WVRN", starts: "Day 181" },
  { label: "4", emission: "6,250 WVRN", starts: "Day 271" },
  { label: "5", emission: "3,125 WVRN", starts: "Day 361" },
  { label: "Floor", emission: "1,000 WVRN", starts: "\u2014" },
];

function getEpochAndEmission() {
  const now = new Date();
  if (now < LAUNCH_DATE) return { epoch: 0, dailyEmission: INITIAL_EMISSION };
  const daysSinceLaunch = Math.floor(
    (now.getTime() - LAUNCH_DATE.getTime()) / (1000 * 60 * 60 * 24)
  );
  const epoch = Math.floor(daysSinceLaunch / 90);
  const dailyEmission = Math.max(INITIAL_EMISSION >> epoch, MIN_EMISSION);
  return { epoch, dailyEmission };
}

interface SliderConfig {
  label: string;
  key: string;
  min: number;
  max: number;
  defaultValue: number;
}

const SLIDERS: SliderConfig[] = [
  { label: "Likes (1x)", key: "likes", min: 0, max: 10000, defaultValue: 50 },
  { label: "Retweets (3x)", key: "retweets", min: 0, max: 5000, defaultValue: 10 },
  { label: "Replies (2x)", key: "replies", min: 0, max: 2000, defaultValue: 5 },
  { label: "Views (0.01x)", key: "views", min: 0, max: 1000000, defaultValue: 5000 },
];

export default function RewardsCalculator() {
  const [values, setValues] = useState<Record<string, number>>(() =>
    Object.fromEntries(SLIDERS.map((s) => [s.key, s.defaultValue]))
  );

  const { epoch, dailyEmission } = useMemo(getEpochAndEmission, []);

  const rawScore =
    values.likes * 1 +
    values.retweets * 3 +
    values.replies * 2 +
    values.views * 0.01;

  const effectiveScore = Math.floor(Math.sqrt(rawScore) * 100);
  const estPerSubmission =
    effectiveScore > 0
      ? Math.floor((effectiveScore / ASSUMED_DAILY_TOTAL_SCORE) * dailyEmission)
      : 0;

  return (
    <div className="glow-card rounded-2xl p-8 md:p-10 max-w-2xl mx-auto mt-16">
      <h3 className="text-sm font-mono text-[#00D4AA] tracking-wider uppercase mb-8 text-center">
        Rewards Calculator
      </h3>

      <div className="space-y-6 mb-10">
        {SLIDERS.map((s) => (
          <div key={s.key}>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm text-weavrn-muted">{s.label}</label>
              <input
                type="number"
                min={s.min}
                max={s.max}
                value={values[s.key]}
                onChange={(e) => {
                  const v = Math.max(s.min, Math.min(s.max, Number(e.target.value) || 0));
                  setValues((prev) => ({ ...prev, [s.key]: v }));
                }}
                className="w-20 text-right text-sm font-mono text-white bg-weavrn-surface border border-weavrn-border/30 rounded px-2 py-0.5 focus:outline-none focus:border-[#00D4AA]/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
            <input
              type="range"
              min={s.min}
              max={s.max}
              value={values[s.key]}
              onChange={(e) =>
                setValues((prev) => ({
                  ...prev,
                  [s.key]: Number(e.target.value),
                }))
              }
              className="w-full accent-[#00D4AA] h-1.5 bg-weavrn-border/30 rounded-full appearance-none cursor-pointer"
            />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6 mb-10">
        <div className="text-center">
          <div className="text-2xl font-bold text-white">
            {rawScore.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
          <div className="text-xs text-weavrn-muted mt-1">Raw Score</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-white">
            {effectiveScore.toLocaleString()}
          </div>
          <div className="text-xs text-weavrn-muted mt-1">Effective Score</div>
          <div className="text-[10px] text-weavrn-muted/50 mt-0.5">
            Diminishing returns via square root scaling
          </div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-white">
            ~{estPerSubmission.toLocaleString()} WVRN
          </div>
          <div className="text-xs text-weavrn-muted mt-1">
            Est. per submission
          </div>
          <div className="text-[10px] text-weavrn-muted/50 mt-0.5">
            Based on assumed 100K daily score pool
          </div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-white">
            {dailyEmission.toLocaleString()}
          </div>
          <div className="text-xs text-weavrn-muted mt-1">
            Daily emission (epoch {epoch + 1})
          </div>
        </div>
      </div>

      {/* Halving schedule */}
      <h4 className="text-sm font-mono text-[#00D4AA] tracking-wider uppercase mb-4 text-center">
        Halving Schedule
      </h4>
      <div className="overflow-x-auto">
        <table className="w-full text-xs font-mono">
          <thead>
            <tr className="border-b border-weavrn-border/30">
              <th className="text-left text-weavrn-muted py-2 pr-4">Epoch</th>
              <th className="text-left text-weavrn-muted py-2 pr-4">
                Daily Emission
              </th>
              <th className="text-left text-weavrn-muted py-2">Starts</th>
            </tr>
          </thead>
          <tbody>
            {HALVING_SCHEDULE.map((row) => (
              <tr key={row.label} className="border-b border-weavrn-border/10">
                <td className="text-white py-2 pr-4">{row.label}</td>
                <td className="text-white py-2 pr-4">{row.emission}</td>
                <td className="text-weavrn-muted py-2">{row.starts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[10px] text-weavrn-muted/40 text-center mt-6">
        Estimates based on current emission schedule. Actual rewards depend on
        total daily participation.
      </p>
    </div>
  );
}
