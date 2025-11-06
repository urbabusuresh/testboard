"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  Card,
  CardBody,
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
import { CalendarRange, Edit, Eye, Play, Plus, RefreshCw, Save, Trash2 } from "lucide-react";
import Section from "../components/automation/Section";
import ToastStack, { ToastMsg } from "../components/automation/Toast";
import { automationApi } from "../lib/automationApi";

type CaseRow = { ts_id: number; module: string; testfilename: string };
type GroupRow = {
  ts_group_id: number;
  group_name: string;
  ts_ids: number[] | null;
  testdataPath?: string | null;
  status?: number;
  created_at?: string;
};

export default function GroupsClient({projectIdProp}:{projectIdProp:any}) {
 
  const projectId=projectIdProp;
  // ===== toasts =====
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const toastId = useRef(1);
  const toast = (kind: ToastMsg["kind"], text: string) =>
    setToasts((s) => [...s, { id: toastId.current++, kind, text }]);
  const popToast = (id: number) => setToasts((s) => s.filter((t) => t.id !== id));

  // ===== Create tab: module/case browsing =====
  const [modules, setModules] = useState<string[]>([]);
  const [selectedModule, setSelectedModule] = useState<string>("");
  const [moduleCases, setModuleCases] = useState<CaseRow[]>([]);
  const [browseQuery, setBrowseQuery] = useState("");
  const [browsePage, setBrowsePage] = useState(1);
  const [browseRpp, setBrowseRpp] = useState(10);
  const [picking, setPicking] = useState(false);

  // global selection across modules
  const [selectedCaseIds, setSelectedCaseIds] = useState<Set<number>>(new Set());
  const selectedCount = selectedCaseIds.size;

  // create group form
  const [createName, setCreateName] = useState("");
  const [createTestdataPath, setCreateTestdataPath] = useState("");

  // load modules/cases
  async function loadModules() {
    try {
      const r = await automationApi.listModules(projectId);
      setModules(r.modules || []);
      if (r.modules?.length && !selectedModule) setSelectedModule(r.modules[0]);
    } catch (e: any) {
      toast("danger", e?.message || "Failed to load modules");
    }
  }
  async function loadCases(mod: string) {
    if (!mod) return;
    setPicking(true);
    try {
      const r = await automationApi.listCasesByModule(mod,projectId);
      setModuleCases(r.cases || []);
      setBrowsePage(1);
    } catch (e: any) {
      toast("danger", e?.message || "Failed to load cases");
    } finally {
      setPicking(false);
    }
  }
  useEffect(() => { loadModules(); }, []);
  useEffect(() => { if (selectedModule) loadCases(selectedModule); }, [selectedModule]);

  const filteredCases = useMemo(() => {
    const q = browseQuery.trim().toLowerCase();
    if (!q) return moduleCases;
    return moduleCases.filter(
      (c) =>
        c.testfilename.toLowerCase().includes(q) ||
        String(c.ts_id).includes(q) ||
        c.module.toLowerCase().includes(q)
    );
  }, [moduleCases, browseQuery]);

  const browseTotalPages = Math.max(1, Math.ceil(filteredCases.length / browseRpp));
  const pagedCases = useMemo(() => {
    const start = (browsePage - 1) * browseRpp;
    return filteredCases.slice(start, start + browseRpp);
  }, [filteredCases, browsePage, browseRpp]);

  function togglePick(id: number) {
    setSelectedCaseIds((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function createGroupFromSelection() {
    if (!createName.trim()) {
      toast("warning", "Group name is required.");
      return;
    }
    if (!selectedCaseIds.size) {
      toast("warning", "Pick at least one testcase.");
      return;
    }
    try {
      const ids = Array.from(selectedCaseIds);
      await automationApi.createGroup({
        group_name: createName.trim(),
        ts_ids: ids,
        testdataPath: createTestdataPath || null,
      });
      toast("success", `Created group "${createName}" (${ids.length} cases)`);
      setCreateName("");
      setCreateTestdataPath("");
      setSelectedCaseIds(new Set());
      await loadGroups();
    } catch (e: any) {
      toast("danger", e?.message || "Create group failed");
    }
  }

  // ===== Groups tab =====
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [gLoading, setGLoading] = useState(false);
  const [gQuery, setGQuery] = useState("");
  const [gStatus, setGStatus] = useState<"all" | "1" | "0">("all");
  const [gPage, setGPage] = useState(1);
  const [gRpp, setGRpp] = useState(10);

  async function loadGroups() {
    setGLoading(true);
    try {
      const r = await automationApi.listGroups();
      const plain: GroupRow[] = (r.groups || []).map((g: any) => ({
        ts_group_id: g.ts_group_id,
        group_name: g.group_name,
        ts_ids: Array.isArray(g.ts_ids) ? g.ts_ids : [],
        testdataPath: g.testdataPath ?? null,
        status: g.status,
        created_at: g.created_at,
      }));
      setGroups(plain);
      setGPage(1);
    } catch (e: any) {
      toast("danger", e?.message || "Failed to load groups");
    } finally {
      setGLoading(false);
    }
  }
  useEffect(() => { loadGroups(); }, []);

  const groupsFiltered = useMemo(() => {
    const q = gQuery.trim().toLowerCase();
    return groups.filter((g) => {
      if (gStatus !== "all") {
        const want = gStatus === "1" ? 1 : 0;
        if ((g.status ?? 1) !== want) return false;
      }
      if (!q) return true;
      const hay = `${g.ts_group_id} ${g.group_name} ${(g.ts_ids || []).join(",")} ${g.testdataPath ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [groups, gQuery, gStatus]);

  const groupsTotalPages = Math.max(1, Math.ceil(groupsFiltered.length / gRpp));
  const groupsPaged = useMemo(() => {
    const start = (gPage - 1) * gRpp;
    return groupsFiltered.slice(start, start + gRpp);
  }, [groupsFiltered, gPage, gRpp]);

  // ===== Group actions: view, edit, delete, run/re-run =====
  const casesDlg = useDisclosure();
  const [caseList, setCaseList] = useState<CaseRow[]>([]);
  const [viewingGroup, setViewingGroup] = useState<GroupRow | null>(null);

  async function openCases(g: GroupRow) {
    setViewingGroup(g);
    const r = await automationApi.groupCases(g.ts_group_id);
    setCaseList(r.cases || []);
    casesDlg.onOpen();
  }

  const editDlg = useDisclosure();
  const [editForm, setEditForm] = useState({ name: "", testdataPath: "" });
  const [editTarget, setEditTarget] = useState<GroupRow | null>(null);
  function openEdit(g: GroupRow) {
    setEditTarget(g);
    setEditForm({ name: g.group_name, testdataPath: g.testdataPath || "" });
    editDlg.onOpen();
  }
  async function submitEdit() {
    if (!editTarget) return;
    try {
      await automationApi.updateGroup(editTarget.ts_group_id, {
        group_name: editForm.name.trim(),
        testdataPath: editForm.testdataPath || null,
      });
      toast("success", "Group updated");
      editDlg.onClose();
      await loadGroups();
    } catch (e: any) {
      toast("danger", e?.message || "Update failed");
    }
  }

  const delDlg = useDisclosure();
  const [delTarget, setDelTarget] = useState<GroupRow | null>(null);
  function askDelete(g: GroupRow) {
    setDelTarget(g);
    delDlg.onOpen();
  }
  async function confirmDelete() {
    if (!delTarget) return;
    try {
      await automationApi.deleteGroup(delTarget.ts_group_id);
      toast("success", `Deleted group "${delTarget.group_name}"`);
      delDlg.onClose();
      await loadGroups();
    } catch (e: any) {
      toast("danger", e?.message || "Delete failed");
    }
  }

  // run / schedule from group (or re-run)
  const runDlg = useDisclosure();
  const [activeTab, setActiveTab] = useState<"run" | "schedule">("run");
  const [runBusy, setRunBusy] = useState(false);
  const [runForm, setRunForm] = useState({
    ts_buildname: "",
    ts_description: "",
    ts_env: "sit",
    ts_browser: "chrome",
    testdataPath: "",
    ts_schedule_time: "",
    ts_repeated: "N" as "Y" | "N",
  });
  const [runSourceGroupId, setRunSourceGroupId] = useState<number | null>(null);

  function openRun(g: GroupRow) {
    setRunSourceGroupId(g.ts_group_id);
    setRunForm((s) => ({
      ...s,
      ts_buildname: s.ts_buildname || `${g.group_name}-run`,
      testdataPath: g.testdataPath || "",
    }));
    setActiveTab("run");
    runDlg.onOpen();
  }

  async function submitRunOrSchedule() {
    if (!runSourceGroupId) {
      runDlg.onClose();
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
          ts_case_id: null,
          test_group_id: runSourceGroupId,
        });
        toast("success", "Run started.");
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
          ts_case_id: null,
          test_group_id: runSourceGroupId,
          ts_schedule_time: runForm.ts_schedule_time,
          ts_repeated: runForm.ts_repeated,
        });
        toast("success", "Run scheduled.");
      }
      runDlg.onClose();
    } catch (e: any) {
      toast("danger", e?.message || "Run failed");
    } finally {
      setRunBusy(false);
    }
  }

  // ===== UI =====
  return (
    <div className="p-4 space-y-8">
      <h1 className="text-2xl font-semibold">Automation Testing — Groups</h1>

      <Tabs aria-label="groups-tabs" color="primary" className="mb-2">
        <Tab key="create" title={<div className="flex items-center gap-2"><Plus size={16}/>Create Group</div>}>
          <Card className="border">
            <CardBody>
              <div className="grid gap-6 md:grid-cols-3">
                <div className="space-y-4 md:col-span-1">
                  <div className="flex items-end gap-3">
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
                    <Button variant="flat" startContent={<RefreshCw size={16} />} onPress={() => selectedModule && loadCases(selectedModule)}>
                      Refresh
                    </Button>
                  </div>

                  <Input
                    label="Search in module"
                    placeholder="filename / id / module"
                    value={browseQuery}
                    onValueChange={(v) => {
                      setBrowseQuery(v);
                      setBrowsePage(1);
                    }}
                  />

                  <div className="text-sm opacity-70">
                    Selected across modules: <b>{selectedCount}</b>
                  </div>

                  <div className="grid gap-3">
                    <Input
                      label="Group name"
                      value={createName}
                      onValueChange={setCreateName}
                    />
                    <Input
                      label="Group testdata path (optional)"
                      value={createTestdataPath}
                      onValueChange={setCreateTestdataPath}
                    />
                    <div className="flex gap-3">
                      <Button
                        color="primary"
                        startContent={<Save size={16} />}
                        onPress={createGroupFromSelection}
                      >
                        Create Group
                      </Button>
                      <Button
                        variant="flat"
                        onPress={() => setSelectedCaseIds(new Set())}
                      >
                        Clear selection
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm opacity-70">
                      {filteredCases.length} item(s)
                    </span>
                    <div className="flex items-center gap-2">
                      <Select
                        aria-label="Rows per page"
                        selectedKeys={[String(browseRpp)]}
                        onSelectionChange={(keys) =>
                          setBrowseRpp(Number(Array.from(keys as Set<string>)[0] || 10))
                        }
                        className="w-28"
                      >
                        {[10, 20, 50, 100].map((n) => (
                          <SelectItem key={String(n)}>{n}</SelectItem>
                        ))}
                      </Select>
                      <Pagination
                        showControls
                        page={browsePage}
                        total={browseTotalPages}
                        onChange={setBrowsePage}
                      />
                    </div>
                  </div>

                  {picking ? (
                    <div className="flex items-center gap-2"><Spinner size="sm" /> Loading…</div>
                  ) : (
                    <Table aria-label="Browse cases for grouping" selectionMode="multiple"
                      selectedKeys={new Set(Array.from(selectedCaseIds).map(String))}
                      onSelectionChange={(keys) => {
                        // HeroUI gives keys as strings in Set
                        const arr = Array.from(keys as Set<string>).map((k) => Number(k));
                        setSelectedCaseIds(new Set(arr));
                      }}
                    >
                      <TableHeader>
                        <TableColumn>ID</TableColumn>
                        <TableColumn>MODULE</TableColumn>
                        <TableColumn>FILENAME</TableColumn>
                        <TableColumn align="end">PICK</TableColumn>
                      </TableHeader>
                      <TableBody items={pagedCases} emptyContent="No cases">
                        {(c: CaseRow) => (
                          <TableRow key={c.ts_id}>
                            <TableCell>{c.ts_id}</TableCell>
                            <TableCell>{c.module}</TableCell>
                            <TableCell className="truncate">{c.testfilename}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                variant={selectedCaseIds.has(c.ts_id) ? "solid" : "flat"}
                                onPress={() => togglePick(c.ts_id)}
                              >
                                {selectedCaseIds.has(c.ts_id) ? "Picked" : "Pick"}
                              </Button>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </div>
            </CardBody>
          </Card>
        </Tab>

        <Tab key="groups" title={<div className="flex items-center gap-2"><Eye size={16}/>Groups</div>}>
          <Card className="border">
            <CardBody>
              <div className="flex flex-wrap items-end gap-3 mb-4">
                <Input
                  label="Search groups"
                  placeholder="name / id / testcase ids / path"
                  value={gQuery}
                  onValueChange={(v) => {
                    setGQuery(v);
                    setGPage(1);
                  }}
                  className="w-[280px]"
                />
                <Select
                  label="Status"
                  selectedKeys={[gStatus]}
                  onSelectionChange={(k) => setGStatus(Array.from(k as Set<string>)[0] as any)}
                  className="w-40"
                >
                  <SelectItem key="all">All</SelectItem>
                  <SelectItem key="1">Active</SelectItem>
                  <SelectItem key="0">Inactive</SelectItem>
                </Select>
                <Button variant="flat" startContent={<RefreshCw size={16} />} onPress={loadGroups}>
                  Refresh
                </Button>

                <div className="ml-auto flex items-center gap-3">
                  <span className="text-sm opacity-70">{groupsFiltered.length} result(s)</span>
                  <Select
                    aria-label="Rows per page"
                    selectedKeys={[String(gRpp)]}
                    onSelectionChange={(keys) =>
                      setGRpp(Number(Array.from(keys as Set<string>)[0] || 10))
                    }
                    className="w-28"
                  >
                    {[10, 20, 50, 100].map((n) => (
                      <SelectItem key={String(n)}>{n}</SelectItem>
                    ))}
                  </Select>
                  <Pagination showControls page={gPage} total={groupsTotalPages} onChange={setGPage} />
                </div>
              </div>

              {gLoading ? (
                <div className="flex items-center gap-2"><Spinner size="sm" /> Loading…</div>
              ) : (
                <Table aria-label="Automation groups">
                  <TableHeader>
                    <TableColumn>ID</TableColumn>
                    <TableColumn>NAME</TableColumn>
                    <TableColumn>TESTCASES</TableColumn>
                    <TableColumn>CREATED</TableColumn>
                    <TableColumn align="end">ACTIONS</TableColumn>
                  </TableHeader>
                  <TableBody items={groupsPaged} emptyContent="No groups">
                    {(g: GroupRow) => (
                      <TableRow key={g.ts_group_id}>
                        <TableCell>#{g.ts_group_id}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{g.group_name}</span>
                            {g.testdataPath ? (
                              <span className="text-xs opacity-70">data: {g.testdataPath}</span>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Chip variant="flat" color="secondary">
                            {Array.isArray(g.ts_ids) && g.ts_ids.length ? g.ts_ids.slice(0, 5).join(", ") : "—"}
                            {Array.isArray(g.ts_ids) && g.ts_ids.length > 5 ? ` (+${g.ts_ids.length - 5})` : ""}
                          </Chip>
                        </TableCell>
                        <TableCell>{formatDT(g.created_at)}</TableCell>
                        <TableCell className="text-right flex items-center justify-end gap-2">
                          <Tooltip content="View cases">
                            <Button isIconOnly variant="light" onPress={() => openCases(g)}><Eye size={18}/></Button>
                          </Tooltip>
                          <Tooltip content="Run / Schedule">
                            <Button size="sm" variant="flat" color="success" startContent={<Play size={14} />} onPress={() => openRun(g)}>
                              Run
                            </Button>
                          </Tooltip>
                          <Tooltip content="Edit">
                            <Button isIconOnly variant="light" onPress={() => openEdit(g)}><Edit size={18}/></Button>
                          </Tooltip>
                          <Tooltip content="Delete">
                            <Button isIconOnly variant="light" color="danger" onPress={() => askDelete(g)}><Trash2 size={18}/></Button>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardBody>
          </Card>
        </Tab>
      </Tabs>

      {/* View cases modal */}
      <Modal isOpen={casesDlg.isOpen} onOpenChange={casesDlg.onOpenChange} size="lg" scrollBehavior="inside">
        <ModalContent>
          {(close) => (
            <>
              <ModalHeader>
                {viewingGroup ? <>Group #{viewingGroup.ts_group_id} — {viewingGroup.group_name}</> : "Group"}
              </ModalHeader>
              <ModalBody>
                {caseList.length ? (
                  <ul className="list-disc ml-6 text-sm">
                    {caseList.map((c) => (
                      <li key={c.ts_id}>{c.module} / {c.testfilename} (#{c.ts_id})</li>
                    ))}
                  </ul>
                ) : <div className="text-sm opacity-60">No cases</div>}
              </ModalBody>
              <ModalFooter>
                <Button variant="flat" onPress={close}>Close</Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Edit modal */}
      <Modal isOpen={editDlg.isOpen} onOpenChange={editDlg.onOpenChange}>
        <ModalContent>
          {(close) => (
            <>
              <ModalHeader>Edit group</ModalHeader>
              <ModalBody>
                <div className="grid gap-3">
                  <Input label="Name" value={editForm.name} onValueChange={(v) => setEditForm((s) => ({ ...s, name: v }))}/>
                  <Input label="Testdata path (optional)" value={editForm.testdataPath} onValueChange={(v) => setEditForm((s) => ({ ...s, testdataPath: v }))}/>
                </div>
              </ModalBody>
              <ModalFooter>
                <Button variant="flat" onPress={close}>Cancel</Button>
                <Button color="primary" startContent={<Save size={16}/>} onPress={submitEdit}>Save</Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Delete confirm */}
      <Modal isOpen={delDlg.isOpen} onOpenChange={delDlg.onOpenChange}>
        <ModalContent>
          {(close) => (
            <>
              <ModalHeader>Delete group?</ModalHeader>
              <ModalBody>
                {delTarget ? <>This will delete “{delTarget.group_name}”.</> : null}
              </ModalBody>
              <ModalFooter>
                <Button variant="flat" onPress={close}>Cancel</Button>
                <Button color="danger" onPress={confirmDelete}>Delete</Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Run / Schedule */}
      <Modal isOpen={runDlg.isOpen} onOpenChange={runDlg.onOpenChange} size="lg" scrollBehavior="inside">
        <ModalContent>
          {(close) => (
            <>
              <ModalHeader>Run configuration</ModalHeader>
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
              </ModalBody>
              <ModalFooter>
                <Button variant="flat" onPress={close}>Cancel</Button>
                <Button color="primary" isLoading={runBusy} onPress={submitRunOrSchedule}>
                  {activeTab === "run" ? "Start" : "Schedule"}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      <ToastStack items={toasts} onDone={popToast} />
    </div>
  );
}

function formatDT(v?: string) {
  if (!v) return "—";
  try {
    const d = new Date(v);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
  } catch {
    return v;
  }
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
