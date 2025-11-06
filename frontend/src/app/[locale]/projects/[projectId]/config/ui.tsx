// src/components/ProjectConfigsUI.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
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
  Tooltip,
} from "@heroui/react";
import { PlusCircle, Edit3, Trash2, Link as LinkIcon } from "lucide-react";
import { projectConfigApi } from "@/lib/projectConfigApi";
import ToastStack from "../automation/components/automation/Toast";
import Section from "../automation/components/automation/Section";

// Toast type
type ToastMsg = { id: number; kind: "success" | "danger"; text: string };

type ConfigRow = {
  id: number;
  projectid: number;
  tenantid?: number | null;
  env: string;
  config_key: string;
  config_value?: any;
  value_text?: string | null;
  scope?: string | null;
  is_active: number;
  version: number;
  created_at?: string;
  updated_at?: string;
};

export default function ProjectConfigsUI({ projectIdProp }: { projectIdProp: string }) {
  const projectId = Number(projectIdProp);
  const [items, setItems] = useState<ConfigRow[]>([]);
  const [loading, setLoading] = useState(false);

  // Search & pagination
  const [queryKey, setQueryKey] = useState("");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Selection
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // Modals
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [delOpen, setDelOpen] = useState(false);
  const [pathOpen, setPathOpen] = useState(false);

  const [resolvedPath, setResolvedPath] = useState<string | null>(null);
  const [delTarget, setDelTarget] = useState<ConfigRow | null>(null);
  const [form, setForm] = useState<any>({});
  const [busy, setBusy] = useState(false);

  // Toasts
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const toastId = useRef(1);
  const toast = (kind: ToastMsg["kind"], text: string) =>
    setToasts((s) => [...s, { id: toastId.current++, kind, text }]);
  const popToast = (id: number) => setToasts((s) => s.filter((t) => t.id !== id));

  // Load configs
  async function loadList() {
    setLoading(true);
    try {
      const r = await projectConfigApi.listConfigs({ projectId: projectId, key: queryKey });
      setItems(r.items ?? r.configs ?? []);
      setPage(1);
    } catch (e: any) {
      toast("danger", e?.message || "Failed to load configs");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadList();
  }, []);

  const filtered = useMemo(() => {
    const q = queryKey.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (c) =>
        (c.config_key || "").toLowerCase().includes(q) ||
        (c.value_text || "").toLowerCase().includes(q) ||
        (c.scope || "").toLowerCase().includes(q) ||
        (c.env || "").toLowerCase().includes(q)
    );
  }, [items, queryKey]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const paged = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    return filtered.slice(start, start + rowsPerPage);
  }, [filtered, page, rowsPerPage]);

  const onRowsPerPageChange = (v: string) => {
    const n = Number(v) || 10;
    setRowsPerPage(n);
    setPage(1);
  };

  // Open / Close Modals
  function openCreate() {
    setForm({
      projectid: projectId,
      tenantid: null,
      env: "all",
      config_key: "",
      config_value: {},
      value_text: "",
      scope: "global",
      is_active: 1,
      version: 1,
    });
    setCreateOpen(true);
  }

  async function submitCreate() {
    setBusy(true);
    try {
      await projectConfigApi.createConfig(form);
      toast("success", "Config created");
      setCreateOpen(false);
      await loadList();
    } catch (e: any) {
      toast("danger", e?.message || "Create failed");
    } finally {
      setBusy(false);
    }
  }

  function openEdit(cfg: ConfigRow) {
    setForm(cfg);
    setEditOpen(true);
  }

 async function submitEdit() {
  if (!form?.id) return;
  setBusy(true);

  try {
    const { id, ...rawPayload } = form;

    // Only send updatable fields
    const allowedFields = [
      'projectid',
      'tenantid',
      'env',
      'config_key',
      'config_value',
      'value_text',
      'scope',
      'is_active',
      'version',
      //'updated_by'
    ];

    const payload: any = {};
    for (const key of allowedFields) {
      if (rawPayload[key] !== undefined) {
        payload[key] = rawPayload[key];
      }
    }

    await projectConfigApi.patchConfig(id, payload);
    toast("success", "Config updated");
    setEditOpen(false);
    await loadList();
  } catch (e: any) {
    toast("danger", e?.message || "Update failed");
  } finally {
    setBusy(false);
  }
}


  function askDelete(cfg: ConfigRow) {
    setDelTarget(cfg);
    setDelOpen(true);
  }

  async function confirmDelete() {
    if (!delTarget) return;
    setBusy(true);
    try {
      await projectConfigApi.deleteConfig(delTarget.id);
      toast("success", "InActivated");
      setDelOpen(false);
      await loadList();
    } catch (e: any) {
      toast("danger", e?.message || "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  async function showResolvedPath(cfg: ConfigRow) {
    try {
      const r = await projectConfigApi.getResolvedTestpath({
        projectid: cfg.projectid,
        env: cfg.env ?? "all",
        tenantid: cfg.tenantid ?? null,
      });
      setResolvedPath(r.testpath ?? null);
      setPathOpen(true);
    } catch (e: any) {
      toast("danger", e?.message || "Resolve failed");
    }
  }

  return (
    <div className="p-4 space-y-6">
      {/* Table Section */}
      <Section title="Project Configs">
        <div className="flex flex-wrap items-end gap-3 mb-4">
          <Input
            label="Search"
            placeholder="config_key, value_text, scope..."
            value={queryKey}
            onValueChange={(v) => {
              setQueryKey(v);
              setPage(1);
            }}
            className="w-72"
          />
          <Button color="primary" startContent={<PlusCircle size={16} />} onPress={openCreate}>
            New Config
          </Button>
          <Button variant="flat" startContent={<Spinner size={14} />} onPress={loadList}>
            Refresh
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center gap-2">
            <Spinner size="sm" /> Loading…
          </div>
        ) : (
          <Table
            aria-label="Project configs"
            selectionMode="single"
            selectedKeys={selectedId ? [String(selectedId)] : []}
            onSelectionChange={(keys) => {
              const arr = Array.from(keys as Set<string>);
              setSelectedId(arr.length ? Number(arr[0]) : null);
            }}
            bottomContent={
              <div className="flex w-full items-center justify-between px-2 py-2">
                <div className="flex items-center gap-3">
                  <span className="text-sm opacity-70">{filtered.length} item(s)</span>
                  <Select
                    aria-label="Rows per page"
                    selectedKeys={[String(rowsPerPage)]}
                    onSelectionChange={(keys) =>
                      onRowsPerPageChange(Array.from(keys as Set<string>)[0])
                    }
                    className="w-28"
                  >
                    {[5, 10, 20, 50].map((n) => (
                      <SelectItem key={n}>{n}</SelectItem>
                    ))}
                  </Select>
                </div>
                <Pagination showControls page={page} total={totalPages} onChange={setPage} className="ml-auto" />
              </div>
            }
          >
            <TableHeader>
              <TableColumn key="id">ID</TableColumn>
              <TableColumn key="key">KEY</TableColumn>
              <TableColumn key="env">ENV</TableColumn>
              <TableColumn key="scope">SCOPE</TableColumn>
              <TableColumn key="active">ACTIVE</TableColumn>
              <TableColumn key="ver">VERSION</TableColumn>
              <TableColumn key="ver">Path</TableColumn>
              <TableColumn key="actions" align="end">
                ACTIONS
              </TableColumn>
            </TableHeader>

            <TableBody items={paged} emptyContent="No configs">
              {(c: ConfigRow) => (
                <TableRow key={c.id}>
                  <TableCell>{c.id}</TableCell>
                  <TableCell>{c.config_key}</TableCell>
                  <TableCell>{c.env}</TableCell>
                  <TableCell>{c.scope ?? "-"}</TableCell>
                  <TableCell>{c.is_active ? "Yes" : "No"}</TableCell>
                  <TableCell>{c.version}</TableCell>
                  <TableCell>{c.value_text}</TableCell>
                  <TableCell className="text-right flex items-center justify-end gap-2">
                    <Tooltip content="Resolve testpath">
                      <Button isIconOnly variant="flat" onPress={() => showResolvedPath(c)}>
                        <LinkIcon size={16} />
                      </Button>
                    </Tooltip>
                    <Tooltip content="Edit">
                      <Button isIconOnly variant="flat" color="secondary" onPress={() => openEdit(c)}>
                        <Edit3 size={16} />
                      </Button>
                    </Tooltip>
                    <Tooltip content="Delete">
                      <Button isIconOnly variant="light" color="danger" onPress={() => askDelete(c)}>
                        <Trash2 size={16} />
                      </Button>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </Section>

      {/* Modals */}

      {/* Create */}
      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} size="lg">
        <ModalContent>
          <ModalHeader>Create Config</ModalHeader>
          <ModalBody>
            <div className="grid gap-3 md:grid-cols-2">
              <Input
                label="Project ID"
                value={String(form.projectid ?? "")}
                onValueChange={(v) => setForm((s: any) => ({ ...s, projectid: Number(v) }))}
              />
              <Input
                label="Tenant ID"
                value={form.tenantid ?? ""}
                onValueChange={(v) => setForm((s: any) => ({ ...s, tenantid: v ? Number(v) : null }))}
              />
              <Input
                label="Env"
                value={form.env ?? "all"}
                onValueChange={(v) => setForm((s: any) => ({ ...s, env: v }))}
              />
              <Input
                label="Config Key"
                value={form.config_key ?? ""}
                onValueChange={(v) => setForm((s: any) => ({ ...s, config_key: v }))}
              />
              <Input
                label="Scope"
                value={form.scope ?? "global"}
                onValueChange={(v) => setForm((s: any) => ({ ...s, scope: v }))}
              />
              <Input
                label="Value text (plain)"
                value={form.value_text ?? ""}
                onValueChange={(v) => setForm((s: any) => ({ ...s, value_text: v }))}
              />
              <Input
                label="Version"
                value={String(form.version ?? 1)}
                onValueChange={(v) => setForm((s: any) => ({ ...s, version: Number(v) || 1 }))}
              />
              <div>
                <label className="block text-sm mb-1">Config Value (JSON)</label>
                <textarea
                  rows={6}
                  className="w-full border p-2"
                  value={typeof form.config_value === "string" ? form.config_value : JSON.stringify(form.config_value ?? {}, null, 2)}
                  onChange={(e) => {
                    const txt = e.target.value;
                    try {
                      setForm((s: any) => ({ ...s, config_value: JSON.parse(txt) }));
                    } catch {
                      setForm((s: any) => ({ ...s, config_value: txt }));
                    }
                  }}
                />
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={() => setCreateOpen(false)}>Cancel</Button>
            <Button color="primary" isLoading={busy} onPress={submitCreate}>Create</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Edit */}
      <Modal isOpen={editOpen} onClose={() => setEditOpen(false)} size="lg">
        <ModalContent>
          <ModalHeader>Edit Config</ModalHeader>
          <ModalBody>
            <div className="grid gap-3 md:grid-cols-2">
              <Input
                label="Project ID"
                value={String(form.projectid ?? "")}
                onValueChange={(v) => setForm((s: any) => ({ ...s, projectid: Number(v) }))}
              />
              <Input
                label="Tenant ID"
                value={form.tenantid ?? ""}
                onValueChange={(v) => setForm((s: any) => ({ ...s, tenantid: v ? Number(v) : null }))}
              />
              <Input
                label="Env"
                value={form.env ?? "all"}
                onValueChange={(v) => setForm((s: any) => ({ ...s, env: v }))}
              />
              <Input
                label="Config Key"
                value={form.config_key ?? ""}
                onValueChange={(v) => setForm((s: any) => ({ ...s, config_key: v }))}
              />
              <Input
                label="Scope"
                value={form.scope ?? "global"}
                onValueChange={(v) => setForm((s: any) => ({ ...s, scope: v }))}
              />
              <Input
                label="Value text (plain)"
                value={form.value_text ?? ""}
                onValueChange={(v) => setForm((s: any) => ({ ...s, value_text: v }))}
              />
              <Input
                label="Version"
                value={String(form.version ?? 1)}
                onValueChange={(v) => setForm((s: any) => ({ ...s, version: Number(v) || 1 }))}
              />
              <div>
                <label className="block text-sm mb-1">Config Value (JSON)</label>
                <textarea
                  rows={6}
                  className="w-full border p-2"
                  value={typeof form.config_value === "string" ? form.config_value : JSON.stringify(form.config_value ?? {}, null, 2)}
                  onChange={(e) => {
                    const txt = e.target.value;
                    try {
                      setForm((s: any) => ({ ...s, config_value: JSON.parse(txt) }));
                    } catch {
                      setForm((s: any) => ({ ...s, config_value: txt }));
                    }
                  }}
                />
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={() => setEditOpen(false)}>Cancel</Button>
            <Button color="primary" isLoading={busy} onPress={submitEdit}>Save</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Delete */}
      <Modal isOpen={delOpen} onClose={() => setDelOpen(false)}>
        <ModalContent>
          <ModalHeader>Do you want InActive the config?</ModalHeader>
          <ModalBody>
            {delTarget ? `Update to InActive  "${delTarget.config_key}" (id ${delTarget.id})?` : null}
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={() => setDelOpen(false)}>Cancel</Button>
            <Button color="danger" onPress={confirmDelete}>Delete</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Resolved Path */}
      <Modal isOpen={pathOpen} onClose={() => setPathOpen(false)}>
        <ModalContent>
          <ModalHeader>Resolved Test Path</ModalHeader>
          <ModalBody>
            {resolvedPath ? <pre className="whitespace-pre-wrap break-all">{resolvedPath}</pre> : <div>No path</div>}
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={() => setPathOpen(false)}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <ToastStack items={toasts} onDone={popToast} />
    </div>
  );
}
