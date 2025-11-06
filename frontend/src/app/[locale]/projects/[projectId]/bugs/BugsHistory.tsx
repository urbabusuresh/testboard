'use client'
import { useState, useEffect } from "react";
import {
  Input,
  Button,
  Tabs,
  Tab,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Divider,
  Card,
  CardBody,
  CardHeader,
  Spinner,
  Select,
  SelectItem,
  addToast,
} from "@heroui/react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { bugzillaApi } from "./service/bugzillaApi";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";

type Filters = {
  priority?: string;
  severity?: string;
  status?: string;
  reporter?: string;
  assignedTo?: string;
  search?: string;
  fromDate?: Date | null;
  toDate?: Date | null;
  email?: string;
};

// Status options for dropdown
const statusOptions = [
  "UNCONFIRMED",
  "CONFIRMED",
  "IN_PROGRESS",
  "RESOLVED",
  "VERIFIED",
  "CLOSED",
];

// Priority options for dropdown
const priorityOptions = [
  "---",
  "High",
  "Highest",
  "Lowest",
  "Normal"
];

// Severity options for dropdown
const severityOptions = [
  "blocker",
  "critical",
  "major",
  "normal",
  "minor",
  "trivial",
  "enhancement",
];

// configure bugzilla base url via env; fallback to example
const BUGZILLA_BASE = process.env.NEXT_PUBLIC_BUGZILLA_BASE || "http://172.16.111.83:8300/bugzilla";

export default function BugsHistory({runId}: {runId:string|number}) {
    const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [filters, setFilters] = useState<Filters>({ fromDate: null, toDate: null });
  const [bugs, setBugs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [activeTab, setActiveTab] = useState("summary");

  const [statusSummary, setStatusSummary] = useState<{ status: string; count: number }[]>([]);
  const [prioritySummary, setPrioritySummary] = useState<{ priority: string; count: number }[]>([]);
  const [severitySummary, setSeveritySummary] = useState<{ severity: string; count: number }[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [avgResolutionDays, setAvgResolutionDays] = useState<number | null>(null);

  // modal / selected bug
  const [selectedBug, setSelectedBug] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch data on initial load
  useEffect(() => {
    fetchBugs(1, filters);
  }, []);

  const fetchBugs = async (pageNum: number, f: Filters) => {
    setLoading(true);
    try {
      const res = await bugzillaApi.listBugsByRunID({
        runId:runId,
        page: pageNum,
        limit: 1000, // fetch more for better charts
        priority: f.priority,
        severity: f.severity,
        status: f.status,
        reporter: f.reporter,
        assignedTo: f.assignedTo,
        search: f.search,
        fromDate: f.fromDate ? f.fromDate.toISOString().slice(0, 10) : undefined,
        toDate: f.toDate ? f.toDate.toISOString().slice(0, 10) : undefined,
      });
      setBugs(res.bugs);
      setPage(res.page);
      setTotalPages(res.totalPages);

      // ✅ Summaries
      const countsStatus: Record<string, number> = {};
      const countsPriority: Record<string, number> = {};
      const countsSeverity: Record<string, number> = {};
      let totalDays = 0;
      let resolvedCount = 0;
      const trend: Record<string, { created: number; resolved: number }> = {};

      res.bugs.forEach((b: any) => {
        // status
        countsStatus[b.bug_status] = (countsStatus[b.bug_status] || 0) + 1;
        // priority
        countsPriority[b.priority] = (countsPriority[b.priority] || 0) + 1;
        // severity
        countsSeverity[b.bug_severity] = (countsSeverity[b.bug_severity] || 0) + 1;
        // avg days
        if (b.days_to_resolve !== null) {
          totalDays += b.days_to_resolve;
          resolvedCount++;
        }
        // trend
        const createdDate = b.creation_ts.slice(0, 10);
        trend[createdDate] = trend[createdDate] || { created: 0, resolved: 0 };
        trend[createdDate].created++;
        if (b.days_to_resolve !== null) {
          const resolvedDate = b.delta_ts.slice(0, 10);
          trend[resolvedDate] = trend[resolvedDate] || { created: 0, resolved: 0 };
          trend[resolvedDate].resolved++;
        }
      });

      setStatusSummary(Object.entries(countsStatus).map(([status, count]) => ({ status, count })));
      setPrioritySummary(Object.entries(countsPriority).map(([priority, count]) => ({ priority, count })));
      setSeveritySummary(Object.entries(countsSeverity).map(([severity, count]) => ({ severity, count })));
      setAvgResolutionDays(resolvedCount ? +(totalDays / resolvedCount).toFixed(1) : null);

      // trend data
      setTrendData(
        Object.entries(trend).map(([date, v]) => ({
          date,
          created: v.created,
          resolved: v.resolved,
        }))
      );
    } catch (err: any) {
      addToast({ title: "Error", description: err.message, color: "danger" });
    } finally {
      setLoading(false);
    }
  };

  // open modal with selected bug
  const openBugModal = (bug: any) => {
    setSelectedBug(bug);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedBug(null);
  };

  const COLORS = ["#4ee65bff", "#00C49F", "#FFBB28", "#FF8042", "#A020F0", "#DC143C"];

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  // Build bugzilla URL for open-in-bugzilla button
  const getBugzillaUrl = (bugId: number | string) => {
    return `${BUGZILLA_BASE.replace(/\/$/, "")}/show_bug.cgi?id=${bugId}`;
  };

  return (
    <div className="p-1 bg-gray-50 ">
      <div className="mx-auto">
       
       <Button color="primary" onPress={() => setIsFilterDrawerOpen(true)}> Filters</Button>
        
{isFilterDrawerOpen && (
  <div className="fixed top-0 right-0 z-50 h-full w-80 bg-white shadow-lg overflow-auto p-2">
    <div className="flex justify-between items-center mb-4">
      <h2 className="text-lg font-semibold">Filters</h2>
      <Button variant="flat" onPress={() => setIsFilterDrawerOpen(false)}>Close</Button>
    </div>
    
    {/* Copy your existing filter inputs here */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4 mb-4">
              <Select
                label="Status"
                placeholder="Select status"
                selectedKeys={filters.status ? [filters.status] : []}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              >
                {statusOptions.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </Select>

              <Select
                label="Priority"
                placeholder="Select priority"
                selectedKeys={filters.priority ? [filters.priority] : []}
                onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
              >
                {priorityOptions.map((priority) => (
                  <SelectItem key={priority} value={priority}>
                    {priority}
                  </SelectItem>
                ))}
              </Select>

              <Select
                label="Severity"
                placeholder="Select severity"
                selectedKeys={filters.severity ? [filters.severity] : []}
                onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
              >
                {severityOptions.map((severity) => (
                  <SelectItem key={severity} value={severity}>
                    {severity}
                  </SelectItem>
                ))}
              </Select>

              <Input
                label="Reporter"
                value={filters.reporter || ""}
                onChange={(e) => setFilters({ ...filters, reporter: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4 mb-4">
              <Input
                label="Assigned To"
                value={filters.assignedTo || ""}
                onChange={(e) => setFilters({ ...filters, assignedTo: e.target.value })}
              />

              <Input
                label="Search"
                value={filters.search || ""}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              />

              <div>
                <label className="text-sm text-gray-600 block mb-1">From Date</label>
                <DatePicker
                  selected={filters.fromDate}
                  onChange={(date) => setFilters({ ...filters, fromDate: date })}
                  className="border border-gray-300 rounded-md p-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholderText="Select start date"
                />
              </div>

              <div>
                <label className="text-sm text-gray-600 block mb-1">To Date</label>
                <DatePicker
                  selected={filters.toDate}
                  onChange={(date) => setFilters({ ...filters, toDate: date })}
                  className="border border-gray-300 rounded-md p-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholderText="Select end date"
                />
              </div>
            </div>

            

            
          <div className="flex gap-3 mt-4">
      <Button color="primary" onPress={() => { fetchBugs(1, filters); setIsFilterDrawerOpen(false); }}>
        Search
      </Button>
      <Button color="success" variant="flat" onPress={() => bugzillaApi.downloadBugsExcel(filters)}>
        Download Excel
      </Button>
    </div>
  </div>
)}

        {/* Tabs */}
        <Tabs 
          aria-label="Bugzilla Report Tabs" 
          variant="underlined" 
          selectedKey={activeTab}
          onSelectionChange={(key) => setActiveTab(key as string)}
          className="mt-6"
        >
          {/* Summary Tab */}
          <Tab key="summary" title="Summary">
            {loading ? (
              <div className="flex justify-center items-center h-96">
                <Spinner size="lg" />
              </div>
            ) : bugs.length === 0 ? (
              <Card className="mt-6">
                <CardBody className="text-center py-12">
                  <p className="text-gray-500">No data available. Use the filters above to search for bugs.</p>
                </CardBody>
              </Card>
            ) : (
              <div>
                <div>
                  {/* Stats Overview */}
                  {bugs.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
                      <Card className="shadow-sm border-l-4 border-blue-500">
                        <CardBody className="p-4">
                          <p className="text-sm text-gray-600">Total Bugs</p>
                          <h3 className="text-2xl font-bold">{bugs.length}</h3>
                        </CardBody>
                      </Card>
                      
                      <Card className="shadow-sm border-l-4 border-green-500">
                        <CardBody className="p-4">
                          <p className="text-sm text-gray-600">Resolved</p>
                          <h3 className="text-2xl font-bold">
                            {statusSummary.find(s => s.status === "RESOLVED")?.count || 0}
                          </h3>
                        </CardBody>
                      </Card>
                      <Card className="shadow-sm border-l-4 border-[#FF8042]">
                        <CardBody className="p-4">
                          <p className="text-sm text-gray-600">Confirmed</p>
                          <h3 className="text-2xl font-bold">
                            {statusSummary.find(s => s.status === "CONFIRMED")?.count || 0}
                          </h3>
                        </CardBody>
                      </Card>
                      <Card className="shadow-sm border-l-4 border-[#FFBB28]">
                        <CardBody className="p-4">
                          <p className="text-sm text-gray-700">Reopen</p>
                          <h3 className="text-2xl font-bold">
                            {statusSummary.find(s => s.status === "REOPEN")?.count || 0}
                          </h3>
                        </CardBody>
                      </Card>
                      
                      <Card className="shadow-sm border-l-4 border-[#00C49F]">
                        <CardBody className="p-4">
                          <p className="text-sm text-gray-600">Verified</p>
                          <h3 className="text-2xl font-bold">
                            {statusSummary.find(s => s.status === "VERIFIED")?.count || 0}
                          </h3>
                        </CardBody>
                      </Card>
                       
                      <Card className="shadow-sm border-l-4 border-purple-500">
                        <CardBody className="p-4">
                          <p className="text-sm text-gray-600">Avg. Resolution Days</p>
                          <h3 className="text-2xl font-bold">{avgResolutionDays ?? "N/A"}</h3>
                        </CardBody>
                      </Card>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 my-6">
                  {/* Status Chart */}
                  <Card className="shadow-sm">
                    <CardHeader className="bg-gray-100 px-4 py-3">
                      <h3 className="font-semibold">Defects by Status</h3>
                    </CardHeader>
                    <CardBody>
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie 
                              data={statusSummary} 
                              dataKey="count" 
                              nameKey="status" 
                              outerRadius={80} 
                              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            >
                              {statusSummary.map((_, index) => (
                                <Cell key={index} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value) => [`${value} bugs`, 'Count']} />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </CardBody>
                  </Card>

                  {/* Priority Chart */}
                  <Card className="shadow-sm">
                    <CardHeader className="bg-gray-100 px-4 py-3">
                      <h3 className="font-semibold">Defects by Priority</h3>
                    </CardHeader>
                    <CardBody>
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={prioritySummary} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="priority" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="count" fill="#8884d8" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardBody>
                  </Card>

                  {/* Severity Chart */}
                  <Card className="shadow-sm lg:col-span-2">
                    <CardHeader className="bg-gray-100 px-4 py-3">
                      <h3 className="font-semibold">Defects by Severity</h3>
                    </CardHeader>
                    <CardBody>
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={severitySummary} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="severity" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="count" fill="#82ca9d" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardBody>
                  </Card>
                </div>
              </div>
            )}
          </Tab>

          {/* Table Tab */}
          <Tab key="table" title="Data Table">
            {loading ? (
              <div className="flex justify-center items-center h-96">
                <Spinner size="lg" />
              </div>
            ) : bugs.length === 0 ? (
              <Card className="mt-6">
                <CardBody className="text-center py-12">
                  <p className="text-gray-500">No data available. Use the filters above to search for bugs.</p>
                </CardBody>
              </Card>
            ) : (
              <>
                <Card className="mt-6 shadow-sm">
                  <CardBody className="p-0">
                    <Table 
                      aria-label="Bugzilla Report Table" 
                      className="mt-4"
                      removeWrapper
                    >
                      <TableHeader>
                        <TableColumn>#Bug ID</TableColumn>
                        <TableColumn>PRIORITY</TableColumn>
                        <TableColumn>SEVERITY</TableColumn>
                        <TableColumn>STATUS</TableColumn>
                        <TableColumn>CREATED</TableColumn>
                        <TableColumn>SUMMARY</TableColumn>
                        <TableColumn>ASSIGNED TO</TableColumn>
                        <TableColumn>RESOLUTION DAYS</TableColumn>
                      </TableHeader>
                      <TableBody 
                        emptyContent="No records found"
                        items={bugs}
                        loadingContent={<Spinner />}
                        loadingState={loading ? "loading" : "idle"}
                      >
                        {bugs.map((bug) => (
                          <TableRow 
                            key={bug.bug_id}
                            className="hover:bg-gray-50 cursor-pointer"
                            onClick={() => openBugModal(bug)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") openBugModal(bug);
                            }}
                          >
                            <TableCell className="font-medium">
                                
                               
                                 <a href={getBugzillaUrl(bug.bug_id)} target="_blank" rel="noreferrer">
                  <Button  size="sm"> {bug.bug_id}</Button>
                </a>
                                </TableCell>
                            <TableCell>
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                bug.priority === "---" ? "bg-red-100 text-red-800" :
                                bug.priority === "High" ? "bg-orange-100 text-orange-800" :
                                bug.priority === "Highest" ? "bg-yellow-100 text-yellow-800" :
                                "bg-blue-100 text-blue-800"
                              }`}>
                                {bug.priority}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                bug.bug_severity === "blocker" ? "bg-red-100 text-red-800" :
                                bug.bug_severity === "critical" ? "bg-orange-100 text-orange-800" :
                                bug.bug_severity === "major" ? "bg-yellow-100 text-yellow-800" :
                                "bg-gray-100 text-gray-800"
                              }`}>
                                {bug.bug_severity}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                bug.bug_status === "RESOLVED" ? "bg-green-100 text-green-800" :
                                bug.bug_status === "IN_PROGRESS" ? "bg-blue-100 text-blue-800" :
                                "bg-gray-100 text-gray-800"
                              }`}>
                                {bug.bug_status}
                              </span>
                            </TableCell>
                            <TableCell>{formatDate(bug.creation_ts)}</TableCell>
                            <TableCell className="max-w-xs truncate">{bug.short_desc}</TableCell>
                            <TableCell>{bug.assigned_to_realname}</TableCell>
                            <TableCell>
                              {bug.days_to_resolve ? (
                                <span className={`px-2 py-1 rounded-full text-xs ${
                                  bug.days_to_resolve > 30 ? "bg-red-100 text-red-800" :
                                  bug.days_to_resolve > 14 ? "bg-orange-100 text-orange-800" :
                                  bug.days_to_resolve > 7 ? "bg-yellow-100 text-yellow-800" :
                                  "bg-green-100 text-green-800"
                                }`}>
                                  {bug.days_to_resolve} days
                                </span>
                              ) : (
                                "-"
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardBody>
                </Card>
                
                {/* Pagination */}
                <div className="flex justify-between items-center mt-4">
                  <span className="text-sm text-gray-600">
                    Showing {bugs.length} of {totalPages * 100} results
                  </span>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="flat" 
                      onPress={() => fetchBugs(page - 1, filters)} 
                      isDisabled={page <= 1}
                    >
                      Previous
                    </Button>
                    <span className="flex items-center px-3 text-sm">
                      Page {page} of {totalPages}
                    </span>
                    <Button 
                      size="sm" 
                      variant="flat" 
                      onPress={() => fetchBugs(page + 1, filters)} 
                      isDisabled={page >= totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </>
            )}
          </Tab>

          {/* Trends Tab */}
          <Tab key="trends" title="Trends">
            {loading ? (
              <div className="flex justify-center items-center h-96">
                <Spinner size="lg" />
              </div>
            ) : bugs.length === 0 ? (
              <Card className="mt-6">
                <CardBody className="text-center py-12">
                  <p className="text-gray-500">No data available. Use the filters above to search for bugs.</p>
                </CardBody>
              </Card>
            ) : (
              <Card className="mt-6 shadow-sm">
                <CardHeader className="bg-gray-100 px-4 py-3">
                  <h3 className="font-semibold">Bug Creation and Resolution Trends</h3>
                </CardHeader>
                <CardBody>
                  <div className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trendData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="created" 
                          stroke="#8884d8" 
                          strokeWidth={2}
                          name="Bugs Created"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="resolved" 
                          stroke="#82ca9d" 
                          strokeWidth={2}
                          name="Bugs Resolved"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardBody>
              </Card>
            )}
          </Tab>
        </Tabs>
      </div>

      {/* Modal: show selected bug */}
      {isModalOpen && selectedBug && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          aria-modal="true"
          role="dialog"
          onClick={closeModal} // close when clicking backdrop
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-auto"
            style={{ maxHeight: "90vh" }}
            onClick={(e) => e.stopPropagation()} // prevent backdrop click from closing when interacting with modal
          >
            <div className="flex items-start justify-between p-4 border-b">
              <div>
                <h2 className="text-xl font-semibold">Bug #{selectedBug.bug_id} — {selectedBug.short_desc}</h2>
                <p className="text-sm text-gray-600">Reported: {formatDate(selectedBug.creation_ts)} • Status: {selectedBug.bug_status}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="flat" size="sm" onPress={closeModal}>Close</Button>
                <a href={getBugzillaUrl(selectedBug.bug_id)} target="_blank" rel="noreferrer">
                  <Button color="primary" size="sm">Open in Bugzilla</Button>
                </a>
              </div>
            </div>

            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <h4 className="text-sm text-gray-500">Priority</h4>
                  <div className="mt-1 font-medium">{selectedBug.priority}</div>
                </div>
                <div>
                  <h4 className="text-sm text-gray-500">Severity</h4>
                  <div className="mt-1 font-medium">{selectedBug.bug_severity}</div>
                </div>
                <div>
                  <h4 className="text-sm text-gray-500">Assigned To</h4>
                  <div className="mt-1 font-medium">{selectedBug.assigned_to_realname || selectedBug.assigned_to}</div>
                </div>
                <div>
                  <h4 className="text-sm text-gray-500">Reporter</h4>
                  <div className="mt-1 font-medium">{selectedBug.reporter_realname || selectedBug.reporter_name || selectedBug.reporter}</div>
                </div>
                <div>
                  <h4 className="text-sm text-gray-500">Created</h4>
                  <div className="mt-1 font-medium">{formatDate(selectedBug.creation_ts)}</div>
                </div>
                <div>
                  <h4 className="text-sm text-gray-500">Last Updated</h4>
                  <div className="mt-1 font-medium">{formatDate(selectedBug.delta_ts)}</div>
                </div>
                <div>
                  <h4 className="text-sm text-gray-500">Resolution</h4>
                  <div className="mt-1 font-medium">{selectedBug.resolution || "-"}</div>
                </div>
                <div>
                  <h4 className="text-sm text-gray-500">Days to Resolve</h4>
                  <div className="mt-1 font-medium">{selectedBug.days_to_resolve ?? "-"}</div>
                </div>
              </div>

              <Divider />

              <div>
                <h4 className="text-sm text-gray-500">Summary</h4>
                <div className="mt-2 whitespace-pre-wrap">{selectedBug.short_desc}</div>
              </div>

            </div>

           
          </div>
        </div>
      )}
    </div>
  );
}
