// src/app/[locale]/projects/[projectId]/automation/cases/ui.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { CalendarRange, Play, RefreshCw, Trash2, Upload, UploadCloud } from "lucide-react";
import Section from "../components/automation/Section";
import ToastStack, { ToastMsg } from "../components/automation/Toast";
import { automationApi } from "../lib/automationApi";
import { describe } from "node:test";

type CaseRow = { ts_id: number;autc_id:string; tc_id: string;description:string;created_by:string; module: string; testfilename: string };

export default function CasesClient({projectIdProp,runId,caseId,queryType}:{projectIdProp:string,runId:string,caseId?:string,queryType?:string}) {
  const projectId=projectIdProp;
  const [modules, setModules] = useState<string[]>([]);
  const [selectedModule, setSelectedModule] = useState<string>("");
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [loading, setLoading] = useState(false);
 
  // search + pagination
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // selection
  const [selectedKeys, setSelectedKeys] = useState<Set<React.Key>>(new Set());
  const selectedIds = useMemo(
    () => Array.from(selectedKeys).map((k) => Number(k)),
    [selectedKeys]
  );

  // run modal (with tabs)
  const runDlg = useDisclosure();
  const [activeRunTab, setActiveRunTab] = useState<"run" | "schedule">("run");
  const [runBusy, setRunBusy] = useState(false);
  const [runForm, setRunForm] = useState({
    ts_buildname: "",
    ts_description: "",
    ts_env: "sit",
    ts_browser: "chrome",
    testdataPath: "",
    ts_schedule_time: "",   // ISO string
    ts_repeated: "N" as "Y" | "N",
  });

  // confirm modal (delete)
  const confirmDlg = useDisclosure();
  const [confirmTarget, setConfirmTarget] = useState<{ id: number; name: string } | null>(null);

  // toast
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const toastId = useRef(1);
  const toast = (kind: ToastMsg["kind"], text: string) =>
    setToasts((s) => [...s, { id: toastId.current++, kind, text }]);
  const popToast = (id: number) => setToasts((s) => s.filter((t) => t.id !== id));

  async function loadModules(projectId: string | any) {
  
    setLoading(true);
    try {
      const r = await automationApi.listModules(projectId);
      setModules(r.modules || []);
      if (r.modules?.length && !selectedModule) {
        setSelectedModule(r.modules[0]);
      }
    } catch (e: any) {
      toast("danger", e?.message || "Failed to load modules");
    } finally {
      setLoading(false);
    }
  }
  async function loadCases(mod: string) {
    if (!mod) return;
    setLoading(true);
    try {
       let r = null;
       //alert('loadCases called with mod='+mod+' runId='+runId+' caseId='+caseId);
     if(queryType==='byCase')
      {
        r = await automationApi.listCasesByModuleByCaseId(mod,projectId,caseId);
      }else
      if(Number(runId)>0)
      {
        r = await automationApi.listCasesByModuleByRunId(mod,projectId,runId);
      }else {
         r=await automationApi.listCasesByModule(mod,projectId); 
      }
     
      setCases(r.cases || []);
      setPage(1);
      setSelectedKeys(new Set());
    } catch (e: any) {
      toast("danger", e?.message || "Failed to load cases");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadModules(projectId); }, []);
  useEffect(() => { if (selectedModule) loadCases(selectedModule); }, [selectedModule]);

  // filter + paginate
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return cases;
    return cases.filter(
      (c) =>
        c.testfilename.toLowerCase().includes(q) ||
        String(c.ts_id).includes(q) ||
        c.module.toLowerCase().includes(q)
    );
  }, [cases, query]);

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

  async function syncSelectedModule() {
    if (!selectedModule) {
      toast("warning", "Pick a module to sync.");
      return;
    }
    try {
      await automationApi.syncModule(selectedModule,projectId);
      toast("success", `Synced: ${selectedModule}`);
      await loadModules(projectId);
      await loadCases(selectedModule);
    } catch (e: any) {
      toast("danger", e?.message || "Sync failed");
    }
  }

  function openRun(ids: number[]) {
    if (!ids.length) {
      toast("warning", "Select at least one testcase.");
      return;
    }
    setRunForm((s) => ({
      ...s,
      ts_buildname: s.ts_buildname || `${selectedModule || "module"}-run`,
    }));
    setActiveRunTab("run");
    runDlg.onOpen();
  }

  function openRunAll() {
    
    setRunForm((s) => ({
      ...s,
      ts_buildname: s.ts_buildname || `${selectedModule || "module"}-run`,
    }));
    setActiveRunTab("run");
    runDlg.onOpen();
  }
  async function submitRunOrSchedule() {
    if (!selectedIds.length) {
      runDlg.onClose();
      return;
    }
    if (!runForm.ts_buildname.trim()) {
      toast("warning", "Build name is required.");
      return;
    }
    setRunBusy(true);
    try {
      if (activeRunTab === "run") {
        // Run now
        if (selectedIds.length === 1) {
          await automationApi.startRun({
            ts_buildname: runForm.ts_buildname.trim(),
            ts_description: runForm.ts_description || null,
            ts_env: runForm.ts_env,
            ts_browser: runForm.ts_browser,
            testdataPath: runForm.testdataPath || null,
            ts_case_id: selectedIds[0],
            test_group_id: null,
            runId: runId,
          });
        } else {
          const tempName = `grp-${selectedModule || "mod"}-${Date.now()}`;
          const grp = await automationApi.createGroup({
            group_name: tempName,
            ts_ids: selectedIds,
            testdataPath: runForm.testdataPath || null,
          });
          const groupId =
            (grp as any)?.group?.ts_group_id ??
            (grp as any)?.ts_group_id ??
            (grp as any)?.id;
          if (!groupId) throw new Error("Failed to create temporary group");
          await automationApi.startRun({
            ts_buildname: runForm.ts_buildname.trim(),
            ts_description: runForm.ts_description || null,
            ts_env: runForm.ts_env,
            ts_browser: runForm.ts_browser,
            testdataPath: runForm.testdataPath || null,
            ts_case_id: null,
            test_group_id: Number(groupId),
            runId: runId,
          });
        }
        toast("success", "Run started.");
      } else {
        // Schedule
        if (!runForm.ts_schedule_time) {
          toast("warning", "Schedule time (ISO) is required.");
          setRunBusy(false);
          return;
        }
        if (selectedIds.length === 1) {
          await automationApi.scheduleRun({
            ts_buildname: runForm.ts_buildname.trim(),
            ts_description: runForm.ts_description || null,
            ts_env: runForm.ts_env,
            ts_browser: runForm.ts_browser,
            testdataPath: runForm.testdataPath || null,
            ts_case_id: selectedIds[0],
            test_group_id: null,
            ts_schedule_time: runForm.ts_schedule_time,
            ts_repeated: runForm.ts_repeated,
            runId: runId,
          });
        } else {
          const tempName = `grp-${selectedModule || "mod"}-${Date.now()}`;
          const grp = await automationApi.createGroup({
            group_name: tempName,
            ts_ids: selectedIds,
            testdataPath: runForm.testdataPath || null,
          });
          const groupId =
            (grp as any)?.group?.ts_group_id ??
            (grp as any)?.ts_group_id ??
            (grp as any)?.id;
          if (!groupId) throw new Error("Failed to create temporary group");
          await automationApi.scheduleRun({
            ts_buildname: runForm.ts_buildname.trim(),
            ts_description: runForm.ts_description || null,
            ts_env: runForm.ts_env,
            ts_browser: runForm.ts_browser,
            testdataPath: runForm.testdataPath || null,
            ts_case_id: null,
            test_group_id: Number(groupId),
            ts_schedule_time: runForm.ts_schedule_time,
            ts_repeated: runForm.ts_repeated,
            runId: runId,
            projectid: projectId,
          });
        }
        toast("success", "Run scheduled.");
      }
      runDlg.onClose();
    } catch (e: any) {
      toast("danger", e?.message || "Run failed");
    } finally {
      setRunBusy(false);
    }
  }



  async function submitRunOrScheduleAll() {
  // decide which ids to run
  let ids = selectedIds;

  // if none selected, confirm running all in the visible list / module
  if (!ids.length) {
    const proceed = window.confirm(
      `No testcases selected.\n\nDo you want to run ALL testcases${selectedModule ? ` in module "${selectedModule}"` : ""}?`
    );
    if (!proceed) {
      runDlg.onClose();
      return;
    }

    // use already-loaded list if you have it, otherwise fetch by module
    let list = Array.isArray(cases) && cases.length ? cases : [];
    if (!list.length && selectedModule) {
      try {
        const r = await automationApi.listCasesByModule(selectedModule,projectId);
        list = r.cases || [];
      } catch {
        toast("danger", "Failed to load cases for the module.");
        return;
      }
    }

    ids = list.map((c) => c.ts_id);
    if (!ids.length) {
      toast("warning", "No testcases found to run.");
      return;
    }
  }

  if (!runForm.ts_buildname.trim()) {
    toast("warning", "Build name is required.");
    return;
  }

  setRunBusy(true);
  try {
    if (activeRunTab === "run") {
      // Run now
      if (ids.length === 1) {
        await automationApi.startRun({
          ts_buildname: runForm.ts_buildname.trim(),
          ts_description: runForm.ts_description || null,
          ts_env: runForm.ts_env,
          ts_browser: runForm.ts_browser,
          testdataPath: runForm.testdataPath || null,
          ts_case_id: ids[0],
          test_group_id: null,
          runId: runId,
          projectid: projectId,
        });
      } else {
        const tempName = `grp-${selectedModule || "mod"}-${Date.now()}`;
        const grp = await automationApi.createGroup({
          group_name: tempName,
          ts_ids: ids,
          testdataPath: runForm.testdataPath || null,
        });
        const groupId =
          (grp as any)?.group?.ts_group_id ??
          (grp as any)?.ts_group_id ??
          (grp as any)?.id;
        if (!groupId) throw new Error("Failed to create temporary group");

        await automationApi.startRun({
          ts_buildname: runForm.ts_buildname.trim(),
          ts_description: runForm.ts_description || null,
          ts_env: runForm.ts_env,
          ts_browser: runForm.ts_browser,
          testdataPath: runForm.testdataPath || null,
          ts_case_id: null,
          test_group_id: Number(groupId),
          runId: runId,
          projectid: projectId,
        });
      }
      toast("success", "Run started.");
    } else {
      // Schedule
      if (!runForm.ts_schedule_time) {
        toast("warning", "Schedule time (ISO) is required.");
        setRunBusy(false);
        return;
      }

      if (ids.length === 1) {
        await automationApi.scheduleRun({
          ts_buildname: runForm.ts_buildname.trim(),
          ts_description: runForm.ts_description || null,
          ts_env: runForm.ts_env,
          ts_browser: runForm.ts_browser,
          testdataPath: runForm.testdataPath || null,
          ts_case_id: ids[0],
          test_group_id: null,
          ts_schedule_time: runForm.ts_schedule_time,
          ts_repeated: runForm.ts_repeated,
          runId: runId,
          projectid: projectId,
        });
      } else {
        const tempName = `grp-${selectedModule || "mod"}-${Date.now()}`;
        const grp = await automationApi.createGroup({
          group_name: tempName,
          ts_ids: ids,
          testdataPath: runForm.testdataPath || null,
        });
        const groupId =
          (grp as any)?.group?.ts_group_id ??
          (grp as any)?.ts_group_id ??
          (grp as any)?.id;
        if (!groupId) throw new Error("Failed to create temporary group");

        await automationApi.scheduleRun({
          ts_buildname: runForm.ts_buildname.trim(),
          ts_description: runForm.ts_description || null,
          ts_env: runForm.ts_env,
          ts_browser: runForm.ts_browser,
          testdataPath: runForm.testdataPath || null,
          ts_case_id: null,
          test_group_id: Number(groupId),
          ts_schedule_time: runForm.ts_schedule_time,
          ts_repeated: runForm.ts_repeated,
          runId: runId,
          projectid: projectId,
        });
      }
      toast("success", "Run scheduled.");
    }

    runDlg.onClose();
  } catch (e: any) {
    toast("danger", e?.message || "Run failed");
  } finally {
    setRunBusy(false);
  }
}


  function askDelete(c: CaseRow) {
    setConfirmTarget({ id: c.ts_id, name: c.testfilename });
    confirmDlg.onOpen();
  }
  async function confirmDelete() {
    if (!confirmTarget) return;
    try {
      await automationApi.deleteCase(confirmTarget.id);
      toast("success", `Deleted ${confirmTarget.name}`);
      await loadCases(selectedModule);
    } catch (e: any) {
      toast("danger", e?.message || "Delete failed");
    } finally {
      confirmDlg.onClose();
    }
  }

  async function handleUpload(ts_id: number, file: File | null) {
    if (!file) return;
    try {
      await automationApi.uploadTestdata(ts_id, file);
      toast("success", `Uploaded test data for #${ts_id}`);
    } catch (e: any) {
      toast("danger", e?.message || "Upload failed");
    }
  }

  return (
    <div className="p-1 space-y-3">

      <Section title="Automation Testing — Test Cases">
        <div className="flex flex-wrap items-end gap-3 mb-4">
          <Select
            label="Module"
            selectedKeys={selectedModule ? [selectedModule] : []}
            onSelectionChange={(keys) => {
              const v = Array.from(keys as Set<string>)[0];
              setSelectedModule(v);
            }}
            className="max-w-xs"
          >
            {modules.map((m) => (
              <SelectItem key={m}>{m}</SelectItem>
            ))}
          </Select>

          <Input
            label="Search"
            placeholder="filename / id / module"
            value={query}
            onValueChange={(v) => {
              setQuery(v);
              setPage(1);
            }}
            className="w-64"
          />

          

          <Button
            variant="flat"
            startContent={<RefreshCw size={16} />}
            onPress={() => selectedModule && loadCases(selectedModule)}
          >
            Refresh
          </Button>
          
          {/* <Button
            color="primary"
            startContent={<UploadCloud size={16} />}
            onPress={syncSelectedModule}
          >
            Sync {selectedModule}
          </Button> */}

           <Tooltip content="Run All / Schedule">
                      <Button
                        size="sm"
                        variant="flat"
                        color="success"
                        startContent={<Play size={14} />}
                        onPress={() => {
                          openRunAll();
                        }}
                      >
                        Run All
                      </Button>
                    </Tooltip>

          {/* {selectedModule && (
            <Chip variant="flat" color="secondary">
              {selectedModule}
            </Chip>
          )} */}
        </div>

        {loading ? (
          <div className="flex items-center gap-2">
            <Spinner size="sm" /> Loading…
          </div>
        ) : (
          <Table
            aria-label="Automation test cases"
            selectionMode="multiple"
            selectedKeys={selectedKeys}
            onSelectionChange={(keys) =>
              setSelectedKeys(new Set(keys as Set<React.Key>))
            }
            bottomContent={
              <div className="flex w-full items-center justify-between px-1 py-1">
                <div className="flex items-center gap-3">
                  <span className="text-sm opacity-70">
                    {filtered.length} item(s)
                  </span>
                  <Select
                    aria-label="Rows per page"
                    selectedKeys={[String(rowsPerPage)]}
                    onSelectionChange={(keys) =>
                      onRowsPerPageChange(Array.from(keys as Set<string>)[0])
                    }
                    className="w-28"
                  >
                    {[5, 10, 20, 50].map((n) => (
                      <SelectItem key={String(n)}>{n}</SelectItem>
                    ))}
                  </Select>
                </div>
                <Pagination
                  showControls
                  page={page}
                  total={totalPages}
                  onChange={setPage}
                  className="ml-auto"
                />
              </div>
            }
          >
            <TableHeader>
              <TableColumn key="sid">ID</TableColumn>
              <TableColumn key="id">Automation ID</TableColumn>
              <TableColumn key="module">MODULE</TableColumn>
              <TableColumn key="description">Description</TableColumn>
              <TableColumn key="data">TestFile</TableColumn>
               {/* <TableColumn key="file">FILENAME</TableColumn>  */}
                 <TableColumn key="created">Tester</TableColumn>  
              <TableColumn key="actions" align="end">
                ACTIONS
              </TableColumn>
            </TableHeader>
            <TableBody items={paged} emptyContent="No cases">
              {(c: CaseRow) => (
                <TableRow key={c.ts_id}>
                  <TableCell>{c.ts_id}</TableCell>

                  <TableCell>{c.autc_id} <br/><span className="text-small opacity-50">{c.tc_id}</span></TableCell>
                  <TableCell>{c.module}</TableCell>
                  <TableCell>
  <Tooltip content={c.description} placement="top-start">
    <div
      className="line-clamp-2 max-w-xs text-sm text-gray-800"
      style={{
        overflow: "hidden",
        display: "-webkit-box",
        WebkitLineClamp: 2,
        WebkitBoxOrient: "vertical",
        textOverflow: "ellipsis",
        whiteSpace: "normal",
        cursor: "pointer",
      }}
    >
      {c.description || <span className="text-gray-400 italic">No description</span>}
    </div>
  </Tooltip>
</TableCell>

                  <TableCell className="truncate">{c.testfilename}</TableCell>
                   <TableCell className="truncate">{c.created_by}</TableCell> 
                  {/* <TableCell>
                    <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
                      <Upload size={16} />
                      <span>Upload</span>
                      <input
                        type="file"
                        className="hidden"
                        onChange={(e) =>
                          //handleUpload(c.ts_id, e.currentTarget.files?.[0] || null)
                        }
                      />
                    </label>
                  </TableCell> */}
                  <TableCell className="text-right flex items-center justify-end gap-2">
                    <Tooltip content="Run this case now / schedule">
                    
                      <Button
                        size="sm"
                        variant="flat"
                        color="success"
                        startContent={<Play size={14} />}
                        onPress={() => {
                          setSelectedKeys(new Set([c.ts_id]));
                          openRun([c.ts_id]);
                        }}
                      >
                        Run
                      </Button>
                    </Tooltip>
                    <Tooltip content="Soft delete">
                      <Button
                        isIconOnly
                        variant="light"
                        color="danger"
                        onPress={() => askDelete(c)}
                      >
                        <Trash2 size={18} />
                      </Button>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}

        <div className="mt-3 flex gap-3">
          <Button
            color="success"
            startContent={<Play size={16} />}
            isDisabled={selectedIds.length === 0}
            onPress={() => openRun(selectedIds)}
          >
            Run / Schedule selected ({selectedIds.length})
          </Button>
        </div>
      </Section>

      {/* Run configuration modal with tabs */}
      <Modal isOpen={runDlg.isOpen} onOpenChange={runDlg.onOpenChange} size="lg" scrollBehavior="inside">
        <ModalContent>
          {(close) => (
            <>
              <ModalHeader>Run configuration</ModalHeader>
              <ModalBody>
                <Tabs
                  selectedKey={activeRunTab}
                  onSelectionChange={(k) => setActiveRunTab(k as "run" | "schedule")}
                >
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
                <Chip variant="flat" className="mt-2">
                  {selectedIds.length === 1
                    ? `Target: testcase #${selectedIds[0]}`
                    : `Target: ${selectedIds.length} testcases (temp group)`}
                </Chip>
              </ModalBody>
              <ModalFooter>
                <Button variant="flat" onPress={close}>
                  Cancel
                </Button>
                <Button color="primary" isLoading={runBusy} onPress={submitRunOrScheduleAll}>
                  {activeRunTab === "run" ? "Start" : "Schedule"}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Confirm delete */}
      <Modal isOpen={confirmDlg.isOpen} onOpenChange={confirmDlg.onOpenChange}>
        <ModalContent>
          {(close) => (
            <>
              <ModalHeader>Delete testcase?</ModalHeader>
              <ModalBody>
                {confirmTarget
                  ? `This will soft-delete "${confirmTarget.name}" (#${confirmTarget.id}).`
                  : null}
              </ModalBody>
              <ModalFooter>
                <Button variant="flat" onPress={close}>Cancel</Button>
                <Button color="danger" onPress={confirmDelete}>Delete</Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Toasts */}
      <ToastStack items={toasts} onDone={popToast} />
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
