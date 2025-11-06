"use client";

import React, { useEffect, useState } from "react";
import { getProjectTestStats } from "@/lib/projectTestStats";

type Stats = {
  total_usecases: number;
  total_scenarios: number;
  total_testcases: number;
  usecases_without_scenarios: number;
  scenarios_without_testcases: number;
  testcases_without_scenarios: number;
  usecases_with_scenarios: number;
  scenarios_with_testcases: number;
  testcases_with_scenarios: number;
};

type Project ={
    id: number,
    name: string,
    detail: string,
    isPublic: number,
    userId: number,
    createdAt: any,
    updatedAt: any
  };
interface Props {
  projectId: string | number |any;
  className?: string;
}

export default function ProjectTestStatsSummary({ projectId, className = "" }: Props) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [project, setProject] = useState<Project | null>(null);


   useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setLoading(true);
        setError(null);

        const res = await getProjectTestStats(projectId);

        if (!res.success) throw new Error(res.error || "Failed to fetch stats");

        if (mounted) {
          setStats(res.stats);
          setProject(res.project);
        }
      } catch (err: any) {
        if (mounted) setError(err.message);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    if (projectId) load();
    return () => {
      mounted = false;
    };
  }, [projectId]);

  if (loading) return <Card shellClass={className}><p className="text-sm text-gray-500">Loading stats…</p></Card>;
  if (error) return <Card shellClass={className}><p className="text-sm text-red-500">Error: {error}</p></Card>;
  if (!stats) return <Card shellClass={className}><p className="text-sm text-gray-500">No data</p></Card>;

  // helper to calculate percent safely
  const pct = (part: number, total: number) =>
    total === 0 ? 0 : Math.round((part / total) * 100);


  
  return (
    <Card shellClass={className}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">#{projectId} {project?.name}  — Test Coverage Overview</h3>
          
          <p className="mt-1 text-sm text-gray-500">  Totals and quick breakdowns (with / without)</p>
        </div>
        <div className="text-sm text-gray-400">Updated: now</div>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Usecases */}
        <TotalCard
          title="Usecases"
          icon={<IconUsecase />}
          total={stats.total_usecases}
          withCount={stats.usecases_with_scenarios}
          withoutCount={stats.usecases_without_scenarios}
          withPct={pct(stats.usecases_with_scenarios, stats.total_usecases)}
          withoutPct={pct(stats.usecases_without_scenarios, stats.total_usecases)}
          highlight="green"
        />

        {/* Scenarios */}
        <TotalCard
          title="Scenarios"
          icon={<IconScenario />}
          total={stats.total_scenarios}
          withCount={stats.scenarios_with_testcases}
          withoutCount={stats.scenarios_without_testcases}
          withPct={pct(stats.scenarios_with_testcases, stats.total_scenarios)}
          withoutPct={pct(stats.scenarios_without_testcases, stats.total_scenarios)}
          highlight="blue"
        />

        {/* Testcases */}
        <TotalCard
          title="Testcases"
          icon={<IconTestcase />}
          total={stats.total_testcases}
          withCount={stats.testcases_with_scenarios}
          withoutCount={stats.testcases_without_scenarios}
          withPct={pct(stats.testcases_with_scenarios, stats.total_testcases)}
          withoutPct={pct(stats.testcases_without_scenarios, stats.total_testcases)}
          highlight="purple"
        />
      </div>

      {/* summary row */}
      <div className="mt-6 border-t pt-4 text-sm text-gray-600 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <strong className="font-medium">{stats.total_usecases}</strong> usecases —
          <span className="ml-2"> {stats.usecases_with_scenarios} with scenarios</span>
          <span className="mx-2">•</span>
          <span>{stats.usecases_without_scenarios} without</span>
        </div>
        <div>
          <strong className="font-medium">{stats.total_testcases}</strong> testcases —
          <span className="ml-2">{stats.testcases_with_scenarios} linked</span>
          <span className="mx-2">•</span>
          <span>{stats.testcases_without_scenarios} unlinked</span>
        </div>
      </div>
    </Card>
  );
}

/* ---------- Small presentational subcomponents ---------- */

function Card({ children, shellClass = "" }: { children: React.ReactNode; shellClass?: string }) {
  return (
    <div className={`bg-white shadow-md rounded-lg p-6 ${shellClass}`}>
      {children}
    </div>
  );
}

function TotalCard({
  title,
  icon,
  total,
  withCount,
  withoutCount,
  withPct,
  withoutPct,
  highlight,
}: {
  title: string;
  icon: React.ReactNode;
  total: number;
  withCount: number;
  withoutCount: number;
  withPct: number;
  withoutPct: number;
  highlight: "green" | "blue" | "purple";
}) {
  const colorMap: Record<string, string> = {
    green: "bg-green-500",
    blue: "bg-blue-500",
    purple: "bg-purple-500",
  };
  const bg = colorMap[highlight] || "bg-gray-500";

  return (
    <div className="border rounded-lg p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-md ${bg} bg-opacity-10`}>
            <div className={`w-7 h-7 flex items-center justify-center ${bg} text-white rounded-md`}>
              {icon}
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-600">{title}</p>
            <p className="text-xl font-semibold">{total}</p>
          </div>
        </div>

        {/* mini badges */}
        <div className="flex gap-2 items-center">
          <MiniBadge label={`${withPct}%`} sub={`${withCount} with`} tone="positive" />
          <MiniBadge label={`${withoutPct}%`} sub={`${withoutCount} without`} tone="warn" />
        </div>
      </div>

      {/* progress bar showing with vs without */}
      <div className="w-full">
        <div className="relative h-3 rounded-full bg-gray-100 overflow-hidden">
          <div
            className={`absolute left-0 top-0 h-full ${bg}`}
            style={{ width: `${withPct}%`, opacity: 0.9 }}
            aria-hidden
          />
          <div
            className="absolute right-0 top-0 h-full bg-gray-200"
            style={{ width: `${withoutPct}%`, opacity: 0.8 }}
            aria-hidden
          />
        </div>
        <div className="mt-2 text-xs text-gray-500 flex justify-between">
          <span>{withCount} linked</span>
          <span>{withoutCount} unlinked</span>
        </div>
      </div>
    </div>
  );
}

function MiniBadge({ label, sub, tone = "neutral" }: { label: string; sub: string; tone?: "positive" | "warn" | "neutral" }) {
  const toneMap: Record<string, string> = {
    positive: "text-green-700 bg-green-100",
    warn: "text-orange-800 bg-orange-100",
    neutral: "text-gray-700 bg-gray-100",
  };
  const cls = toneMap[tone] || toneMap.neutral;
  return (
    <div className={`px-2 py-1 rounded-md text-xs font-medium ${cls}`}>
      <div className="leading-none">{label}</div>
      <div className="leading-none text-[10px] opacity-80">{sub}</div>
    </div>
  );
}

/* ---------- Icons (simple inline SVGs) ---------- */

function IconUsecase() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4z" fill="currentColor" />
      <path d="M4 20c0-3.31 4.03-6 8-6s8 2.69 8 6" stroke="white" strokeWidth="0" fill="currentColor" />
    </svg>
  );
}
function IconScenario() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M3 6h18v2H3V6zm0 5h12v2H3v-2zM3 16h18v2H3v-2z" fill="currentColor" />
    </svg>
  );
}
function IconTestcase() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M9 11l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 12v7a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h11" fill="currentColor" />
    </svg>
  );
}
