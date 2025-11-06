"use client";

import React, { useEffect, useState } from "react";
import {
  Card,
  CardHeader,
  CardBody,
  Button,
  Input,
  Select,
  SelectItem,
  Spinner,
  Tooltip,
  Progress,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
} from "@heroui/react";
import { RefreshCw, Download, FileDown, Info, Percent } from "lucide-react";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import {
  PieChart,
  Pie,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";

export default function TestSummaryDashboard({
  projectId,
  runId,
  runInfo,
}: {
  projectId: string;
  runId: string;
  runInfo: any;
}) {
  const [filters, setFilters] = useState({
    projectId: projectId,
    run_id: runId,
    executed_by: "",
    status: "",
    fromDate: "",
    toDate: "",
  });

  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const COLORS = ["#22c55e", "#ef4444", "#3b82f6", "#f59e0b", "#8b5cf6"];
  const BASE = process.env.NEXT_PUBLIC_BACKEND_ORIGIN?.replace(/\/$/, "") || "";
  async function fetchData() {
    setLoading(true);
    const query = new URLSearchParams(
      Object.entries(filters).filter(([_, v]) => v)
    ).toString();
    const res = await fetch(
      `${BASE}/api/reports/summary-report?${query}`
    );


   await fetch(`${BASE}/api/kpis/test-summary/${projectId}/${runId}`)
  .then(res => res.blob())
  .then(blob => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Test_Report_Project${projectId}_Run${runId}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  });

    const data = await res.json();
    console.log("Summary API Response:", data);
    setSummary(data);
    setLoading(false);
  }

  useEffect(() => {
    fetchData();
  }, []);

  // 📁 Export to Excel
  const exportExcel = () => {
    if (!summary) return;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet([summary.overall]),
      "Overall Summary"
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(summary.testerProductivity || []),
      "Tester Productivity"
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(summary.automationSummary?.overallStatus || []),
      "Automation Summary"
    );
    XLSX.writeFile(wb, `Automation_Report_${Date.now()}.xlsx`);
  };

  // 🧾 Export to PDF with header, description & footer
 const exportPDF = async () => {
  const element = document.getElementById("summaryReportSection");
  if (!element) return;

  // 🧩 Create printable container
  const printContainer = document.createElement("div");
  printContainer.style.background = "white";
  printContainer.style.padding = "20px";
  printContainer.style.fontFamily = "Inter, sans-serif";

  // 🧾 Run Info section (only for PDF)
  const runDetailsHTML = `
    <h3 style="margin-top:10px; color:#1e293b; border-bottom:1px solid #e5e7eb; padding-bottom:4px;">
      Run Information
    </h3>
    <table style="width:100%; border-collapse:collapse; font-size:12px; margin-bottom:16px; border:1px solid #e5e7eb;">
      <tbody>
        <tr style="background:#f9fafb;">
          <td style="padding:6px;"><b>Run Name:</b> ${runInfo?.name || "N/A"}</td>
          <td style="padding:6px;"><b>Project ID:</b> ${runInfo?.projectId || "N/A"}</td>
          <td style="padding:6px;"><b>Environment:</b> ${runInfo?.env || "N/A"}</td>
        </tr>
        <tr>
          <td style="padding:6px;"><b>Created By:</b> ${runInfo?.createdBy || "N/A"}</td>
          <td style="padding:6px;"><b>Created At:</b> ${runInfo?.createdAt ? new Date(runInfo.createdAt).toLocaleString() : "N/A"}</td>
          <td style="padding:6px;"><b>Updated At:</b> ${runInfo?.updatedAt ? new Date(runInfo.updatedAt).toLocaleString() : "N/A"}</td>
        </tr>
        <tr style="background:#f9fafb;">
          <td style="padding:6px;"><b>Start Date:</b> ${runInfo?.startDate || "N/A"}</td>
          <td style="padding:6px;"><b>End Date:</b> ${runInfo?.endDate || "N/A"}</td>
          <td style="padding:6px;"><b>Configurations:</b> ${runInfo?.configurations || "N/A"}</td>
        </tr>
        <tr>
          <td style="padding:6px;"><b>Server:</b> ${runInfo?.server || "N/A"}</td>
          <td style="padding:6px;"><b>Sprint ID:</b> ${runInfo?.sprintId || "N/A"}</td>
          <td style="padding:6px;"><b>State:</b> ${runInfo?.state || "N/A"}</td>
        </tr>
        <tr style="background:#f9fafb;">
          <td colspan="3" style="padding:6px;"><b>Description:</b> ${runInfo?.description || "N/A"}</td>
        </tr>
        <tr>
          <td colspan="3" style="padding:6px;"><b>Release Notes:</b> ${runInfo?.releaseNotes || "N/A"}</td>
        </tr>
        <tr style="background:#f9fafb;">
          <td colspan="3" style="padding:6px;"><b>Comments:</b> ${runInfo?.comments || "N/A"}</td>
        </tr>
      </tbody>
    </table>
  `;

  // 🧠 Combine all report content
  printContainer.innerHTML = `
    <h2 style="text-align:center; color:#1e293b;">Automation & Manual Test Summary Report</h2>
    <p style="text-align:center; color:#475569; margin-bottom:12px;">
      Project ID: ${filters.projectId} | Run ID: ${filters.run_id} <br/>
      Generated on: ${new Date().toLocaleString()}
    </p>
    ${runDetailsHTML}
    ${element.outerHTML}
    <p style="text-align:center; font-size:10px; color:#94a3b8; margin-top:12px;">
      Report generated by RAPTR Automation Platform
    </p>
  `;

  // Append and convert to PDF
  document.body.appendChild(printContainer);
  const canvas = await html2canvas(printContainer, { scale: 2 });
  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF("p", "mm", "a4");
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

  pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
  pdf.save(`Automation_Test_Report_${new Date().toISOString().split("T")[0]}.pdf`);

  document.body.removeChild(printContainer);
};

  if (loading)
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <Spinner size="lg" label="Loading summary data..." color="primary" />
      </div>
    );

  // 📊 Helper for average productivity
  const avgProductivity =
    summary?.testerProductivity?.length > 0
      ? (
          summary.testerProductivity.reduce(
            (acc: number, t: any) => acc + Number(t.pass_rate || 0),
            0
          ) / summary.testerProductivity.length
        ).toFixed(2)
      : 0;

  return (
    <div className="p-4 space-y-8 bg-gray-50 min-h-screen">
      {/* Filters */}
      <div className="grid grid-cols-5 gap-2 items-end bg-white p-3 rounded-lg shadow-sm">
        <Input
          label="Executed By"
          placeholder="Tester"
          value={filters.executed_by}
          onValueChange={(v) => setFilters((f) => ({ ...f, executed_by: v }))}
          className="w-48"
          classNames={{
            inputWrapper: "bg-white shadow-sm rounded-md",
            input: "bg-white text-black",
          }}
        />
        <Select
          label="Status"
          selectedKeys={[filters.status]}
          onSelectionChange={(keys) =>
            setFilters((f) => ({
              ...f,
              status: Array.from(keys as Set<string>)[0] || "",
            }))
          }
          className="w-40"
        >
          {["", "Passed", "Failed", "Skipped", "Retest", "In Progress"].map(
            (s) => (
              <SelectItem key={s || ""}>{s || "All"}</SelectItem>
            )
          )}
        </Select>
        <Input
          label="From Date"
          type="date"
          value={filters.fromDate}
          onValueChange={(v) => setFilters((f) => ({ ...f, fromDate: v }))}
        />
        <Input
          label="To Date"
          type="date"
          value={filters.toDate}
          onValueChange={(v) => setFilters((f) => ({ ...f, toDate: v }))}
        />
        {/* Action Buttons */}
        <div className="flex gap-2 items-center">
          <Tooltip content="Refresh Data">
            <Button
              isIconOnly
              color="primary"
              variant="flat"
              onPress={fetchData}
              aria-label="Refresh"
            >
              <RefreshCw size={18} />
            </Button>
          </Tooltip>
          <Tooltip content="Export Excel">
            <Button
              isIconOnly
              color="success"
              variant="flat"
              onPress={exportExcel}
              aria-label="Export Excel"
            >
              <FileDown size={18} />
            </Button>
          </Tooltip>
          <Tooltip content="Export PDF">
            <Button
              isIconOnly
              color="secondary"
              variant="flat"
              onPress={exportPDF}
              aria-label="Export PDF"
            >
              <Download size={18} />
            </Button>
          </Tooltip>
        </div>
      </div>

      {/* Summary Section */}
      {summary && (
        <div id="summaryReportSection" className="space-y-6">
          {/* KPI Cards */}
          <div className="grid sm:grid-cols-2 md:grid-cols-7 gap-2">
            {[
              { label: "Total", value: summary.overall?.total ?? 0, color: "text-blue-600", },
              { label: "Passed", value: summary.overall?.passed ?? 0, color: "text-green-600" ,percent: (( summary.overall?.passed / summary.overall?.total) * 100).toFixed(1)},
              { label: "Failed", value: summary.overall?.failed ?? 0, color: "text-red-600", percent: (( summary.overall?.failed / summary.overall?.total) * 100).toFixed(1) },
              { label: "Blocked", value: summary.overall?.blocked ?? 0, color: "text-amber-600" , percent: (( summary.overall?.blocked / summary.overall?.total) * 100).toFixed(1)},
              { label: "Untested", value: summary.overall?.untested ?? 0, color: "text-gray-500" ,   percent: (( summary.overall?.untested / summary.overall?.total) * 100).toFixed(1)},
              { label: "Skipped", value: summary.overall?.skipped ?? 0, color: "text-purple-600" , percent: (( summary.overall?.skipped / summary.overall?.total) * 100).toFixed(1)},
              { label: "Quality Index", value: summary.qualityIndex ?? 0, color: "text-indigo-600" },
            ].map((stat, i) => (
              <Card key={i}>
                <CardBody>
                  <div className="flex justify-between items-center">
                    <p className={`text-lg font-semibold ${stat.color}`}>
                      {stat.label}
                    </p>
                    <Tooltip content={`Metric for ${stat.label}`}>
                      <Info size={14} />
                    </Tooltip>
                  </div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <span className="text-xs text-gray-500">
                           {stat.percent?`(${stat.percent}%)`:''}    
                              </span>
                              
                </CardBody>
              </Card>
            ))}
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Automation Chart */}
            <Card className="shadow-md">
              <CardHeader className="border-b pb-2">
                <p className="font-semibold text-base text-gray-700">
                  Automation Test Status
                </p>
              </CardHeader>
              <CardBody className="h-[24rem] flex flex-col justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={summary.automationSummary?.overallStatus || []}
                      dataKey="count"
                      nameKey="status"
                      labelLine={false}
                      outerRadius="80%"
                      label={({ name, percent }) =>
                        `${name}: ${(percent * 100).toFixed(0)}%`
                      }
                    >
                      {(summary.automationSummary?.overallStatus || []).map(
                        (_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        )
                      )}
                    </Pie>
                    <RTooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
                <p className="text-center text-sm text-gray-600 mt-3">
                  This chart shows <b>automation test results</b> grouped by status.
                </p>
              </CardBody>
            </Card>

            {/* Manual Chart */}
            <Card className="shadow-md">
              <CardHeader className="border-b pb-2">
                <p className="font-semibold text-base text-gray-700">
                  Manual Test Status
                </p>
              </CardHeader>
              <CardBody className="h-[28rem] flex flex-col justify-center">
                {summary.overall ? (
                  <>
                    <ResponsiveContainer width="100%" height="70%">
                      <PieChart>
                        <Pie
                          data={[
                            { status: "Passed", count: Number(summary.overall?.passed || 0) },
                            { status: "Failed", count: Number(summary.overall?.failed || 0) },
                            { status: "Skipped", count: Number(summary.overall?.skipped || 0) },
                            { status: "Blocked", count: Number(summary.overall?.blocked || 0) },
                            { status: "Untested", count: Number(summary.overall?.untested || 0) },
                          ]}
                          dataKey="count"
                          nameKey="status"
                          labelLine={false}
                          outerRadius="80%"
                          label={({ name, percent }) =>
                            `${name}: ${(percent * 100).toFixed(0)}%`
                          }
                        >
                          {[
                            "#22c55e",
                            "#ef4444",
                            "#f59e0b",
                            "#8b5cf6",
                            "#9ca3af",
                          ].map((c, i) => (
                            <Cell key={i} fill={c} />
                          ))}
                        </Pie>
                        <RTooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>

                    <p className="text-center text-sm text-gray-600 mt-3">
                      This chart represents <b>manual test case</b> outcomes across all statuses.
                    </p>

                   
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                    No manual test data available
                  </div>
                )}
              </CardBody>
            </Card>
          </div>

          {/* Execution Summary Table */}
          {summary.testerProductivity &&
            summary.testerProductivity.length > 0 && (
              <Card className="shadow-md mt-6">
                <CardHeader className="border-b pb-2">
                  <p className="font-semibold text-base text-gray-700">
                    Test Execution Summary by Tester
                  </p>
                </CardHeader>
                <CardBody>
                  <p className="text-sm text-gray-600 mb-3">
                    This table summarizes each tester’s productivity — total executed, pass/fail counts, and calculated pass rates.
                  </p>
                  <Table aria-label="Tester productivity table" isStriped>
                    <TableHeader>
                      <TableColumn>Tester</TableColumn>
                      <TableColumn>Total Executed</TableColumn>
                      <TableColumn>Passed</TableColumn>
                      <TableColumn>Failed</TableColumn>
                      <TableColumn>Pass Rate (%)</TableColumn>
                    </TableHeader>
                    <TableBody>
                      {summary.testerProductivity.map((tester: any, i: number) => (
                        <TableRow key={i}>
                          <TableCell>{tester.executed_by}</TableCell>
                          <TableCell>{tester.total_executed}</TableCell>
                          <TableCell className="text-green-600 font-semibold">
                            {tester.passed}
                          </TableCell>
                          <TableCell className="text-red-500 font-semibold">
                            {tester.failed}
                          </TableCell>
                          <TableCell className="font-bold text-gray-700">
                            {tester.pass_rate}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardBody>
              </Card>
            )}

          {/* ✅ Quality Summary Footer */}
          <Card className="bg-gradient-to-r from-gray-50 to-gray-100 shadow-sm border mt-4">
            <CardBody className="text-center space-y-2">
              <p className="font-semibold text-lg text-gray-700">
                Quality Summary Overview
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                <p>
                  <b>Overall Pass Rate:</b>{" "}
                  {summary.overall?.pass_rate
                    ? `${summary.overall.pass_rate}%`
                    : "N/A"}
                </p>
                <p>
                  <b>Overall Fail Rate:</b>{" "}
                  {summary.overall?.fail_rate
                    ? `${summary.overall.fail_rate}%`
                    : "N/A"}
                </p>
                <p>
                  <b>Quality Index:</b> {summary.qualityIndex ?? "N/A"}
                </p>
              </div>
              <p>
                <b>Average Tester Productivity:</b> {avgProductivity}%
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Report generated on: {new Date().toLocaleString()}
              </p>
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
}
