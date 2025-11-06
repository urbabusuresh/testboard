// utils/buildTeamsRunMessage.ts

type RunSummary = {
  testrunid: number;
  ts_buildname: string;
  ts_type: "immediate" | "scheduled";
  status:
    | "queued"
    | "running"
    | "passed"
    | "failed"
    | "errored"
    | "cancelled"
    | "paused"
    | "inactive";
  ts_env?: string;
  ts_browser?: string;
  started_at?: string | null;
  finished_at?: string | null;
  total?: number;
  passed?: number;
  failed?: number;
  skipped?: number;
  triggeredBy?: string;      // optional (user/email)
  projectName?: string;      // optional
  moduleName?: string;       // optional
};

function fmt(dt?: string | null) {
  return dt ? new Date(dt).toLocaleString() : "—";
}

function msBetween(a?: string | null, b?: string | null) {
  if (!a || !b) return null;
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return ms >= 0 ? ms : null;
}

function human(ms?: number | null) {
  if (ms == null) return "—";
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return [h ? `${h}h` : "", m ? `${m}m` : "", `${sec}s`].filter(Boolean).join(" ");
}

function statusStyle(status: RunSummary["status"]) {
  // Adaptive Card brand colors: Good (green), Warning (orange), Attention (red)
  switch (status) {
    case "passed": return "Good";
    case "running":
    case "queued": return "Warning";
    case "failed":
    case "errored":
    case "cancelled": return "Attention";
    default: return "Default";
  }
}

/**
 * Build a Teams Adaptive Card payload for this run + report URL.
 * Returns the *message* object ready to POST to Teams webhook.
 */
export function buildTeamsRunMessage(run: RunSummary, reportUrl: string) {
  const duration = msBetween(run.started_at, run.finished_at);
  const totals = {
    total: run.total ?? undefined,
    passed: run.passed ?? undefined,
    failed: run.failed ?? undefined,
    skipped: run.skipped ?? undefined,
  };

  const facts = [
    { title: "Run ID", value: String(run.testrunid) },
    { title: "Build", value: run.ts_buildname },
    { title: "Type", value: run.ts_type },
    { title: "Status", value: run.status },
    { title: "Environment", value: run.ts_env || "—" },
    { title: "Browser", value: run.ts_browser || "—" },
    { title: "Started", value: fmt(run.started_at) },
    { title: "Finished", value: fmt(run.finished_at) },
    { title: "Duration", value: human(duration ?? undefined) },
  ];

  if (run.projectName) facts.splice(1, 0, { title: "Project", value: run.projectName });
  if (run.moduleName)  facts.splice(2, 0, { title: "Module", value: run.moduleName });
  if (run.triggeredBy) facts.push({ title: "Triggered by", value: run.triggeredBy });

  // Adaptive Card "message" with one attachment
  return {
    type: "message",
    attachments: [
      {
        contentType: "application/vnd.microsoft.card.adaptive",
        content: {
          $schema: "https://adaptivecards.io/schemas/adaptive-card.json",
          type: "AdaptiveCard",
          version: "1.5",
          body: [
            {
              type: "TextBlock",
              text: `Automation Run • ${run.ts_buildname}`,
              size: "Large",
              weight: "Bolder",
              wrap: true
            },
            {
              type: "TextBlock",
              text: `${run.status.toUpperCase()} • ${run.ts_type}`,
              wrap: true,
              color: statusStyle(run.status) === "Good" ? "Good" :
                     statusStyle(run.status) === "Warning" ? "Warning" :
                     statusStyle(run.status) === "Attention" ? "Attention" : "Default",
              weight: "Bolder",
              spacing: "Small"
            },
            {
              type: "FactSet",
              facts
            },
            // Optional totals strip (if you have counts)
            ...(totals.total || totals.passed || totals.failed || totals.skipped
              ? [{
                  type: "ColumnSet",
                  spacing: "Medium",
                  columns: [
                    {
                      type: "Column",
                      width: "stretch",
                      items: [
                        { type: "TextBlock", text: "Total", size: "Small", isSubtle: true },
                        { type: "TextBlock", text: String(totals.total ?? "—"), weight: "Bolder" }
                      ]
                    },
                    {
                      type: "Column",
                      width: "stretch",
                      items: [
                        { type: "TextBlock", text: "Passed", size: "Small", isSubtle: true },
                        { type: "TextBlock", text: String(totals.passed ?? "—"), weight: "Bolder", color: "Good" }
                      ]
                    },
                    {
                      type: "Column",
                      width: "stretch",
                      items: [
                        { type: "TextBlock", text: "Failed", size: "Small", isSubtle: true },
                        { type: "TextBlock", text: String(totals.failed ?? "—"), weight: "Bolder", color: "Attention" }
                      ]
                    },
                    {
                      type: "Column",
                      width: "stretch",
                      items: [
                        { type: "TextBlock", text: "Skipped", size: "Small", isSubtle: true },
                        { type: "TextBlock", text: String(totals.skipped ?? "—"), weight: "Bolder" }
                      ]
                    }
                  ]
                }]
              : [])
          ],
          actions: [
            {
              type: "Action.OpenUrl",
              title: "View Allure Report",
              url: reportUrl
            }
          ]
        }
      }
    ]
  };
}
