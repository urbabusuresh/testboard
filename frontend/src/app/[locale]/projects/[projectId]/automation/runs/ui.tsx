"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  Chip,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Pagination,
  Select,
  SelectItem,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
  Tabs,
  Tab,
  Tooltip,
  useDisclosure,
} from "@heroui/react";
import { MoreVertical } from "lucide-react";
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from "@heroui/react";
import { Ban, Check, Copy, ExternalLink, RefreshCw, Search, RotateCcw, CalendarRange, Play ,MessageSquareShare } from "lucide-react";
import Section from "../components/automation/Section";
import ToastStack, { ToastMsg } from "../components/automation/Toast";
import { automationApi } from "../lib/automationApi";
import { buildTeamsRunMessage } from "../lib/buildTeamsRunMessage";
type RunRow = {
  testrunid: number;
  ts_type: "immediate" | "scheduled";
  ts_repeated?: "Y" | "N";
  ts_buildname: string;
  ts_description?: string | null;
  ts_env: string;
  ts_browser: string;
  test_group_id?: number | null;
  ts_case_id?: number | null;
  ts_reports_path?: string | null;
  status:
    | "queued"
    | "running"
    | "passed"
    | "failed"
    | "errored"
    | "cancelled"
    | "paused"
    | "inactive";
  started_at?: string | null;
  finished_at?: string | null;
  created_at?: string;
  testdataPath?: string | null;
  projectid: string|number|null;
  runId: string|number|null;
  ts_schedule_time?: string | null;
};

export default function RunsClient({ projectIdProp, runId ,queryType,caseId}: { projectIdProp: any; runId: any ;queryType?:string,caseId?:string }) {
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [loading, setLoading] = useState(false);

  // search + filters
  const [query, setQuery] = useState("");
  const [fType, setFType] = useState<"all" | "immediate" | "scheduled">("all");
  const [fSource, setFSource] = useState<"all" | "testcase" | "group">("all");
  const [fStatus, setFStatus] = useState<"all" | RunRow["status"]>("all");

  // pagination
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // copy feedback
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // toast
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const toastId = useRef(1);
  const toast = (kind: ToastMsg["kind"], text: string) =>
    setToasts((s) => [...s, { id: toastId.current++, kind, text }]);
  const popToast = (id: number) =>
    setToasts((s) => s.filter((t) => t.id !== id));

  // Re-run modal state
  const rerunDlg = useDisclosure();
  const [activeTab, setActiveTab] = useState<"run" | "schedule">("run");
  const [runBusy, setRunBusy] = useState(false);
  const [rerunSource, setRerunSource] = useState<{ ts_case_id: number | null; test_group_id: number | null }>({
    ts_case_id: null,
    test_group_id: null,
  });
  const [runForm, setRunForm] = useState({
    ts_buildname: "",
    ts_description: "",
    ts_env: "sit",
    ts_browser: "chrome",
    testdataPath: "",
    ts_schedule_time: "",   // ISO
    ts_repeated: "N" as "Y" | "N",
    projectid: projectIdProp,
    runId:runId
  });

  async function load() {
    setLoading(true);
    try {
      const r = await automationApi.listRuns({ limit: 500, projectid: projectIdProp.toString(), runId: runId.toString(), queryType: queryType, caseId: caseId });
      setRuns((r.runs || []) as RunRow[]);
      setPage(1);
    } catch (e: any) {
      toast("danger", e?.message || "Failed to load runs");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  // filter & search
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return runs.filter((r) => {
      if (fType !== "all" && r.ts_type !== fType) return false;

      if (fSource !== "all") {
        const isGroup = !!r.test_group_id && !r.ts_case_id;
        const isCase = !!r.ts_case_id && !r.test_group_id;
        if (fSource === "group" && !isGroup) return false;
        if (fSource === "testcase" && !isCase) return false;
      }

      if (fStatus !== "all" && r.status !== fStatus) return false;

      if (!q) return true;
      const hay =
        `${r.testrunid} ${r.ts_buildname} ${r.ts_env} ${r.ts_browser} ${r.status} ${r.ts_type}`.toLowerCase();
      return hay.includes(q);
    });
  }, [runs, query, fType, fSource, fStatus]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const paged = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    return filtered.slice(start, start + rowsPerPage);
  }, [filtered, page, rowsPerPage]);

  function onRowsPerPageChange(v: string) {
    const n = Number(v) || 10;
    setRowsPerPage(n);
    setPage(1);
  }

  function statusColor(s: RunRow["status"]) {
    switch (s) {
      case "running":
        return "primary";
      case "passed":
        return "success";
      case "failed":
      case "errored":
        return "danger";
      case "queued":
        return "warning";
      case "paused":
        return "secondary";
      case "cancelled":
      case "inactive":
      default:
        return "default";
    }
  }

  function typeColor(t: RunRow["ts_type"]) {
    return t === "scheduled" ? "warning" : "success";
  }

  function sourceChip(r: RunRow) {
    const isGroup = !!r.test_group_id && !r.ts_case_id;
    const isCase = !!r.ts_case_id && !r.test_group_id;
    if (isGroup)
      return <Chip size="sm" variant="flat" color="secondary">group #{r.test_group_id}</Chip>;
    if (isCase)
      return <Chip size="sm" variant="flat" color="secondary">testcase #{r.ts_case_id}</Chip>;
    return <Chip size="sm" variant="flat">—</Chip>;
  }

  function formatDT(v?: string | null) {
    if (!v) return "";
    try {
      const d = new Date(v);
      return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
    } catch {
      return v;
    }
  }

  function duration(a?: string | null, b?: string | null) {
    if (!a || !b) return "—";
    const start = new Date(a).getTime();
    const end = new Date(b).getTime();
    if (isNaN(start) || isNaN(end)) return "—";
    const ms = Math.max(0, end - start);
    const s = Math.floor(ms / 1000);
    const hh = Math.floor(s / 3600);
    const mm = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    const parts = [
      hh ? `${hh}h` : null,
      hh || mm ? `${mm}m` : null,
      `${ss}s`,
    ].filter(Boolean);
    return parts.join(" ");
  }

  async function cancelSchedule(id: number) {
    if (!confirm("Cancel this scheduled run?")) return;
    try {
      await automationApi.cancelScheduled(id);
      toast("success", `Cancelled scheduled run #${id}`);
      await load();
    } catch (e: any) {
      toast("danger", e?.message || "Cancel failed");
    }
  }

  async function copyReportsLink(p?: string | null, id?: number) {
    if (!p) {
      toast("warning", "No reports path for this run");
      return;
    }
    try {
      // your backend API base URL
  const apiBase = process.env.NEXT_PUBLIC_BACKEND_ORIGIN || "http://localhost:8001";

  // build the encoded url
  const url = `${apiBase}/allure/view-report?path=${encodeURIComponent(p+"/allure-report")}`;

      await navigator.clipboard.writeText(url);
      setCopiedId(id ?? null);
      setTimeout(() => setCopiedId(null), 1500);
      toast("success", "Reports path copied");
    } catch {
      toast("danger", "Copy failed");
    }
  }

 
async function notifyTeams(run: any, reportUrl: any) {

  if (!reportUrl) {
      toast("warning", "No reports path for this run");
      return;
    }
   
      // your backend API base URL
  const apiBase = process.env.NEXT_PUBLIC_BACKEND_ORIGIN || "http://localhost:8001";
const teamsNotificationAPi = process.env.NEXT_PUBLIC_AUTOMATION_WEBHOOK || apiBase;
  // build the encoded url
  const url = `${apiBase}/allure/view-report?path=${encodeURIComponent(reportUrl+"/allure-report")}`;

  const payload = buildTeamsRunMessage(run, url);

 
  alert(teamsNotificationAPi)
  await fetch(teamsNotificationAPi, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}

 
  


  
  // utils/openReports.ts
 function openReports(reportPath?: string | null) {
  if (!reportPath) {
    toast("warning", "No reports path for this run");
    return;
  }

  // your backend API base URL
  const apiBase = process.env.NEXT_PUBLIC_BACKEND_ORIGIN || "http://localhost:8001";

  // build the encoded url
  const url = `${apiBase}/allure/view-report?path=${encodeURIComponent(reportPath+"/allure-report")}`;

  // open in a new tab
  window.open(url, "_blank");
}


async function generateReports(reportPath?: string | null) {
  if (!reportPath) {
    toast("warning", "No reports path for this run");
    return;
  }

  try {
    const { url } = await automationApi.generateAllureReport({
      resultsDir: reportPath,
    });

    if (url) {
      openReports(reportPath);   // ✅ open report directly
    } else {
      toast("danger", "Report generation failed");
    }
  } catch (err: any) {
    toast("danger", `Failed to generate report: ${err.message || err}`);
  }
}





  // --- Re-run ---
  function openRerun(r: RunRow) {
    const isGroup = !!r.test_group_id && !r.ts_case_id;
    const isCase = !!r.ts_case_id && !r.test_group_id;
    if (!isGroup && !isCase) {
      toast("warning", "This run has no linked source (testcase/group).");
      return;
    }
    setRerunSource({
      ts_case_id: isCase ? Number(r.ts_case_id) : null,
      test_group_id: isGroup ? Number(r.test_group_id) : null,
    });
    setRunForm({
      ts_buildname: `${r.ts_buildname || "build"}-rerun`,
      ts_description: r.ts_description || "",
      ts_env: r.ts_env || "sit",
      ts_browser: r.ts_browser || "chrome",
      testdataPath: r.testdataPath || "",
      ts_schedule_time: "",
      ts_repeated: "N",
      projectid: projectIdProp,
      runId: runId
    });
    setActiveTab("run");
    rerunDlg.onOpen();
  }

  async function submitRerun() {
    const { ts_case_id, test_group_id } = rerunSource;
    if (!ts_case_id && !test_group_id) {
      toast("warning", "Missing source for re-run.");
      return;
    }
    if (!runForm.ts_buildname.trim()) {
      toast("warning", "Build name is required.");
      return;
    }
    setRunBusy(true);
    try {
      if (activeTab === "run") {
        await automationApi.startRun({
          ts_buildname: runForm.ts_buildname.trim(),
          ts_description: runForm.ts_description || null,
          ts_env: runForm.ts_env,
          ts_browser: runForm.ts_browser,
          testdataPath: runForm.testdataPath || null,
          ts_case_id,
          test_group_id,
          projectid: projectIdProp,
          runId: runId
        });
        toast("success", "Re-run started.");
      } else {
        if (!runForm.ts_schedule_time) {
          toast("warning", "Schedule time (ISO) is required.");
          setRunBusy(false);
          return;
        }
        await automationApi.scheduleRun({
          ts_buildname: runForm.ts_buildname.trim(),
          ts_description: runForm.ts_description || null,
          ts_env: runForm.ts_env,
          ts_browser: runForm.ts_browser,
          testdataPath: runForm.testdataPath || null,
          ts_case_id,
          test_group_id,
          ts_schedule_time: runForm.ts_schedule_time,
          ts_repeated: runForm.ts_repeated,
          projectid: projectIdProp,
          runId: runId
        });
        toast("success", "Re-run scheduled.");
      }
      rerunDlg.onClose();
    } catch (e: any) {
      toast("danger", e?.message || "Re-run failed");
    } finally {
      setRunBusy(false);
    }
  }

  return (
    <div className="p-1 space-y-6">
      <Section title="Automation Testing — Runs">
        {/* Toolbar */}
        <div className="flex flex-wrap items-end gap-1 mb-2">
          <Input
            label="Search"
            placeholder="id / build / env / browser / status"
            startContent={<Search size={16} />}
            value={query}
            onValueChange={(v) => {
              setQuery(v);
              setPage(1);
            }}
            className="w-[280px]"
          />

          <Select
            label="Type"
            selectedKeys={[fType]}
            onSelectionChange={(k) => setFType(Array.from(k as Set<string>)[0] as any)}
            className="w-40"
          >
            <SelectItem key="all">All</SelectItem>
            <SelectItem key="immediate">Immediate</SelectItem>
            <SelectItem key="scheduled">Scheduled</SelectItem>
          </Select>

          <Select
            label="Source"
            selectedKeys={[fSource]}
            onSelectionChange={(k) => setFSource(Array.from(k as Set<string>)[0] as any)}
            className="w-44"
          >
            <SelectItem key="all">All</SelectItem>
            <SelectItem key="testcase">Testcase</SelectItem>
            <SelectItem key="group">Group</SelectItem>
          </Select>

          <Select
            label="Status"
            selectedKeys={[fStatus]}
            onSelectionChange={(k) => setFStatus(Array.from(k as Set<string>)[0] as any)}
            className="w-44"
          >
            {["all","queued","running","passed","failed","errored","cancelled","paused","inactive"].map((s)=>(
              <SelectItem key={s}>{s}</SelectItem>
            ))}
          </Select>

          <Button variant="flat" startContent={<RefreshCw size={16} />} onPress={load}>
            Refresh
          </Button>

          
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center gap-2">
            <Spinner size="sm" /> Loading…
          </div>
        ) : (
          <Table aria-label="Automation runs">
            <TableHeader>
              <TableColumn key="id">ID</TableColumn>
              <TableColumn key="build">BUILD</TableColumn>
              <TableColumn key="type">TYPE</TableColumn>
              <TableColumn key="source">SOURCE</TableColumn>
              <TableColumn key="status">STATUS</TableColumn>
              <TableColumn key="started">STARTED</TableColumn>
              <TableColumn key="finished">FINISHED</TableColumn>
              <TableColumn key="duration">DURATION</TableColumn>
              <TableColumn key="actions" align="end">ACTIONS</TableColumn>
            </TableHeader>
            <TableBody items={paged} emptyContent="No runs found">
              {(r: RunRow) => (
                <TableRow key={r.testrunid}>
                  <TableCell>#{r.testrunid}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{r.ts_buildname}</span>
                      {r.ts_description ? (
                        <span className="text-xs opacity-70">{r.ts_description}</span>
                      ) : null}
                      <div className="flex gap-2 mt-1">
                        <Chip size="sm" variant="flat">{r.ts_env}</Chip>
                        <Chip size="sm" variant="flat">{r.ts_browser}</Chip>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Chip size="sm" variant="flat" color={typeColor(r.ts_type)}>
                      {r.ts_type}
                    </Chip>
                    
                  </TableCell>
                  <TableCell>{sourceChip(r)}</TableCell>
                  <TableCell>
                    <Chip size="sm" variant="flat" color={statusColor(r.status)}>
                      {r.status} 
                    </Chip>
                  </TableCell>
                  <TableCell>{formatDT(r.started_at)}
                    {r.ts_type === "scheduled" ? <Chip size="sm" variant="flat">{r.ts_schedule_time}</Chip>:" "}
                     
                  </TableCell>
                  <TableCell>{formatDT(r.finished_at)}</TableCell>
                  <TableCell><Chip size="sm" variant="flat" >{duration(r.started_at, r.finished_at)}</Chip></TableCell>
                  {/* <TableCell>
                    <div className="flex items-center gap-2">
                      <Tooltip content={"Generate report"}>
                         <Button
                          size="sm"
                          variant="flat"
                          isDisabled={!r.ts_reports_path}
                          startContent={<ExternalLink size={14} color="#f60c98ff" />}
                          onPress={() => generateReports(r.ts_reports_path)}
                        >
                          Generate
                        </Button>

                      </Tooltip>
                      <Tooltip content={"Open report"}>
                         
                        <Button
                          size="sm"
                          variant="flat"
                          isDisabled={!r.ts_reports_path}
                          startContent={<ExternalLink size={14} color="#f60c0cff" />}
                          onPress={() => openReports(r.ts_reports_path)}
                        >
                          Open
                        </Button>
                      </Tooltip>
                      <Tooltip content="Copy Allure Report Link">
                        <Button
                          isIconOnly
                          variant="light"
                          isDisabled={!r.ts_reports_path}
                          onPress={() => copyReportsLink(r.ts_reports_path, r.testrunid)}
                        >
                          {copiedId === r.testrunid ? <Check size={16} color="#5e0cf6ff"/> : <Copy size={16} color="#0cf618ff"/>}
                        </Button>
                      </Tooltip>

                       <Tooltip content="Send Report To Teams">
                        <Button
                          isIconOnly
                          variant="light"
                          isDisabled={!r.ts_reports_path}
                          onPress={() => notifyTeams(r,r.ts_reports_path)}
                          startContent={<MessageSquareShare size={14} color="#34d399" />}
                         
                        >
                         
                        </Button>
                      </Tooltip>
                    </div>
                    <Tooltip content="Re-run (now or schedule)">
                      <Button
                        size="sm"
                        variant="flat"
                        color="primary"
                        startContent={<RotateCcw size={14} />}
                        onPress={() => openRerun(r)}
                      >
                        
                      </Button>
                    </Tooltip>

                    {r.ts_type === "scheduled" && r.status === "queued" ? (
                      <Button
                        size="sm"
                        variant="flat"
                        color="danger"
                        startContent={<Ban size={14} />}
                        onPress={() => cancelSchedule(r.testrunid)}
                      >
                        
                      </Button>
                    ) : null}
                  </TableCell> */}
                  <TableCell className="text-right">
  <Dropdown placement="bottom-end">
    <DropdownTrigger>
      <Button isIconOnly variant="light" size="sm">
        <MoreVertical size={16} />
      </Button>
    </DropdownTrigger>
    <DropdownMenu aria-label="Run actions">
      <DropdownItem
        key="generate"
        startContent={<ExternalLink size={14} color="#f60c98" />}
        onPress={() => generateReports(r.ts_reports_path)}
        isDisabled={!r.ts_reports_path}
      >
        Generate Report
      </DropdownItem>

      <DropdownItem
        key="open"
        startContent={<ExternalLink size={14} color="#f60c0c" />}
        onPress={() => openReports(r.ts_reports_path)}
        isDisabled={!r.ts_reports_path}
      >
        Open Report
      </DropdownItem>

      <DropdownItem
        key="copy"
        startContent={<Copy size={14} color="#0cf618" />}
        onPress={() => copyReportsLink(r.ts_reports_path, r.testrunid)}
        isDisabled={!r.ts_reports_path}
      >
        Copy Report Link
      </DropdownItem>

      <DropdownItem
        key="teams"
        startContent={<MessageSquareShare size={14} color="#34d399" />}
        onPress={() => notifyTeams(r, r.ts_reports_path)}
        isDisabled={!r.ts_reports_path}
      >
        Send to Teams
      </DropdownItem>

      <DropdownItem
        key="rerun"
        startContent={<RotateCcw size={14} />}
        onPress={() => openRerun(r)}
      >
        Re-run
      </DropdownItem>
      
       {r.ts_type === "scheduled" && r.status === "queued" &&(
        <DropdownItem
          key="cancel"
          startContent={<Ban size={14} color="red" />}
          onPress={() => cancelSchedule(r.testrunid)}
        >
          Cancel Schedule
        </DropdownItem>
      ) }
      
     
    </DropdownMenu>
  </Dropdown>
</TableCell>

                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </Section>

      {/* Re-run modal */}
      <Modal isOpen={rerunDlg.isOpen} onOpenChange={rerunDlg.onOpenChange} size="lg" scrollBehavior="inside">
        <ModalContent>
          {(close) => (
            <>
              <ModalHeader>Re-Run configuration</ModalHeader>
              <ModalBody>
                <Tabs selectedKey={activeTab} onSelectionChange={(k) => setActiveTab(k as any)}>
                  <Tab key="run" title={<div className="flex items-center gap-2"><Play size={14}/>Run Now</div>}>
                    <RunFields runForm={runForm} setRunForm={setRunForm} />
                  </Tab>
                  <Tab key="schedule" title={<div className="flex items-center gap-2"><CalendarRange size={14}/>Schedule</div>}>
                    <RunFields runForm={runForm} setRunForm={setRunForm} />
                    <div className="grid gap-3 md:grid-cols-2 mt-3">
                      <Input
                        label="Schedule Time (ISO)"
                        placeholder="2025-08-23T14:30:00"
                        value={runForm.ts_schedule_time}
                        onValueChange={(v) => setRunForm((s) => ({ ...s, ts_schedule_time: v }))}
                      />
                      <Select
                        label="Repeat"
                        selectedKeys={[runForm.ts_repeated]}
                        onSelectionChange={(keys) =>
                          setRunForm((s) => ({ ...s, ts_repeated: Array.from(keys as Set<string>)[0] as "Y" | "N" }))
                        }
                      >
                        <SelectItem key="N">One-shot</SelectItem>
                        <SelectItem key="Y">Daily</SelectItem>
                      </Select>
                    </div>
                  </Tab>
                </Tabs>

                <div className="mt-2">
                  <Chip variant="flat" size="sm">
                    {rerunSource.test_group_id
                      ? `Source: group #${rerunSource.test_group_id}`
                      : `Source: testcase #${rerunSource.ts_case_id}`}
                  </Chip>
                </div>
              </ModalBody>
              <ModalFooter>
                <Button variant="flat" onPress={close}>Cancel</Button>
                <Button color="primary" isLoading={runBusy} onPress={submitRerun}>
                  {activeTab === "run" ? "Start" : "Schedule"}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Toasts */}
      <ToastStack items={toasts} onDone={popToast} />
      <div className="ml-auto flex items-center gap-3">
            <span className="text-sm opacity-70">
              {filtered.length} result(s)
            </span>
            <Select
              aria-label="Rows per page"
              selectedKeys={[String(rowsPerPage)]}
              onSelectionChange={(keys) =>
                onRowsPerPageChange(Array.from(keys as Set<string>)[0])
              }
              className="w-28"
              color="primary"
            >
              {[10, 20, 50, 100].map((n) => (
                <SelectItem key={String(n)}>{n}</SelectItem>
              ))}
            </Select>
            <Pagination
              showControls
              page={page}
              total={totalPages}
              onChange={setPage}
            />
          </div>
    </div>

  );
}

function RunFields({
  runForm,
  setRunForm,
}: {
  runForm: {
    ts_buildname: string;
    ts_description: string;
    ts_env: string;
    ts_browser: string;
    testdataPath: string;
    ts_schedule_time?: string;
    ts_repeated?: "Y" | "N";
  };
  setRunForm: React.Dispatch<React.SetStateAction<any>>;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Input
        label="Build name"
        value={runForm.ts_buildname}
        onValueChange={(v) => setRunForm((s: any) => ({ ...s, ts_buildname: v }))}
      />
      <Input
        label="Description"
        value={runForm.ts_description}
        onValueChange={(v) => setRunForm((s: any) => ({ ...s, ts_description: v }))}
      />
      <Input
        label="Env"
        value={runForm.ts_env}
        onValueChange={(v) => setRunForm((s: any) => ({ ...s, ts_env: v }))}
      />
      <Input
        label="Browser"
        value={runForm.ts_browser}
        onValueChange={(v) => setRunForm((s: any) => ({ ...s, ts_browser: v }))}
      />
      <Input
        label="Testdata path (optional)"
        value={runForm.testdataPath}
        onValueChange={(v) => setRunForm((s: any) => ({ ...s, testdataPath: v }))}
        className="md:col-span-2"
      />
    </div>
  );
}
