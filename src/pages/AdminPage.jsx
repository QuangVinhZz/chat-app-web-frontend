import { useEffect, useState } from "react";
import {
  ShieldCheck,
  Users,
  MessageCircle,
  FileText,
  BarChart3,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Spinner } from "../components/ui/Spinner";
import { adminService } from "../services/adminService";
import { Link } from "react-router-dom";

export default function AdminPage() {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [overviewSeries, setOverviewSeries] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState(null);
  const [period, setPeriod] = useState("day");
  const [selectedMetric, setSelectedMetric] = useState("totalUsers");
  const [fromDate, setFromDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().slice(0, 10);
  });
  const [toDate, setToDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [customRange, setCustomRange] = useState(false);

  const metricOptions = [
    {
      key: "totalUsers",
      title: "Total Users",
      color: "#2563eb",
      cumulative: true,
      description: "Cumulative total number of users over time.",
      valueKey: "users",
    },
    {
      key: "newUsers",
      title: "New Users",
      color: "#0ea5e9",
      cumulative: false,
      description: "Number of new users for each time period.",
      valueKey: "newUsersToday",
    },
    {
      key: "conversations",
      title: "Conversations",
      color: "#14b8a6",
      cumulative: true,
      description: "Cumulative number of conversations over time.",
      valueKey: "conversations",
    },
    {
      key: "groups",
      title: "Groups",
      color: "#22c55e",
      cumulative: true,
      description: "Cumulative number of groups created over time.",
      valueKey: "groups",
    },
    {
      key: "messages",
      title: "Messages",
      color: "#f97316",
      cumulative: false,
      description: "Số tin nhắn gửi theo từng khoảng thời gian.",
      valueKey: "messagesToday",
    },
  ];

  const loadOverview = async () => {
    try {
      const data = await adminService.getOverview();
      setOverview(data);
    } catch (err) {
      console.error("Load admin overview failed:", err);
      setError(
        err?.status
          ? `Không thể tải dữ liệu admin (HTTP ${err.status}): ${err.message || "Lỗi"}`
          : err?.message
            ? `Không thể tải dữ liệu admin: ${err.message}`
            : "Không thể tải dữ liệu admin. Vui lòng thử lại sau.",
      );
    } finally {
      setLoading(false);
    }
  };

  const loadOverviewStats = async (period = "day", from, to) => {
    setStatsLoading(true);
    setStatsError(null);
    try {
      const query =
        from && to
          ? { period, from, to }
          : { period, days: period === "day" ? 30 : 12 };
      const data = await adminService.getOverviewStats(query);
      setOverviewSeries(data.series);
    } catch (err) {
      console.error("Load overview stats failed:", err);
      setStatsError("Unable to load chart data.");
    } finally {
      setStatsLoading(false);
    }
  };

  const buildSeries = (series = [], cumulative = false) => {
    if (!series) return [];

    if (!cumulative) return series;

    let total = 0;
    return series.map((item) => {
      total += item.total;
      return { ...item, total };
    });
  };

  useEffect(() => {
    loadOverview();
    if (customRange) {
      loadOverviewStats(period, fromDate, toDate);
    } else {
      loadOverviewStats(period);
    }
  }, [period, customRange, fromDate, toDate]);

  const applyCustomRange = () => {
    if (!fromDate || !toDate) return;
    setCustomRange(true);
    loadOverviewStats(period, fromDate, toDate);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 p-6">
        <Card>
          <CardContent>
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <header className="h-16 px-6 pl-16 md:pl-6 border-b flex items-center bg-card">
        <div>
          <h1 className="text-xl font-semibold">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Manage users, reports, and system statistics.
          </p>
        </div>
      </header>

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-primary" />
                <CardTitle>Admin Overview</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  {
                    label: "Total users",
                    value: overview.users,
                  },
                  {
                    label: "New users today",
                    value: overview.newUsersToday,
                  },
                  {
                    label: "Conversations",
                    value: overview.conversations,
                  },
                  {
                    label: "Groups",
                    value: overview.groups,
                  },
                  {
                    label: "Messages today",
                    value: overview.messagesToday,
                  },
                ].map((item) => (
                  <div key={item.label} className="space-y-2">
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>{item.label}</span>
                      <span className="font-semibold">
                        {item.value.toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                <CardTitle>User management</CardTitle>
              </div>
              <CardDescription>
                Access the user list to lock/unlock accounts.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Go to the user management page to view and adjust user status.
              </p>

              <Button asChild className="mt-4">
                <Link to="/admin/users">Go to Users</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                <CardTitle>Reports</CardTitle>
              </div>
              <CardDescription>View and manage user reports.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Manage abusive reports and update their handling status.
              </p>
              <Button asChild className="mt-4">
                <Link to="/admin/reports">Go to Reports</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                <CardTitle>Metric trends</CardTitle>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {["day", "week", "month"].map((option) => (
                  <Button
                    key={option}
                    size="sm"
                    variant={period === option ? "default" : "outline"}
                    onClick={() => {
                      setPeriod(option);
                      setCustomRange(false);
                    }}
                  >
                    {option === "day"
                      ? "Day"
                      : option === "week"
                        ? "Week"
                        : "Month"}
                  </Button>
                ))}
                <div className="flex items-center gap-2 border rounded-xl p-2 bg-slate-50">
                  <label className="text-sm text-muted-foreground">From</label>
                  <input
                    type="date"
                    className="rounded-md border px-2 py-1 text-sm"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                  />
                  <label className="text-sm text-muted-foreground">To</label>
                  <input
                    type="date"
                    className="rounded-md border px-2 py-1 text-sm"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                  />
                  <Button size="sm" onClick={applyCustomRange}>
                    Submit
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="flex items-center justify-center py-16">
                <Spinner size="lg" />
              </div>
            ) : statsError ? (
              <p className="text-sm text-destructive">{statsError}</p>
            ) : (
              <div className="space-y-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Select a metric to view its trend
                    </p>
                    <p className="text-2xl font-semibold">
                      {
                        metricOptions.find(
                          (metric) => metric.key === selectedMetric,
                        )?.title
                      }
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {metricOptions.map((metric) => (
                      <Button
                        key={metric.key}
                        size="sm"
                        variant={
                          selectedMetric === metric.key ? "default" : "outline"
                        }
                        onClick={() => setSelectedMetric(metric.key)}
                      >
                        {metric.title}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200/70 bg-white p-4">
                  <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {
                          metricOptions.find(
                            (metric) => metric.key === selectedMetric,
                          )?.description
                        }
                      </p>
                      <p className="text-3xl font-semibold">
                        {(() => {
                          const metric = metricOptions.find(
                            (m) => m.key === selectedMetric,
                          );
                          const series = overviewSeries?.[selectedMetric];
                          const last =
                            Array.isArray(series) && series.length > 0
                              ? series[series.length - 1]
                              : null;
                          const value = last?.total;
                          return value != null
                            ? Number(value).toLocaleString()
                            : "0";
                        })()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                        {" "}
                        period: {period}
                      </p>
                    </div>
                  </div>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={buildSeries(
                          overviewSeries?.[selectedMetric],
                          metricOptions.find(
                            (metric) => metric.key === selectedMetric,
                          )?.cumulative,
                        )}
                        margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
                        <YAxis allowDecimals={false} width={40} />
                        <Tooltip
                          formatter={(value) => [
                            value.toLocaleString(),
                            metricOptions.find(
                              (metric) => metric.key === selectedMetric,
                            )?.title,
                          ]}
                        />
                        <Line
                          type="monotone"
                          dataKey="total"
                          stroke={
                            metricOptions.find(
                              (metric) => metric.key === selectedMetric,
                            )?.color
                          }
                          strokeWidth={3}
                          dot={{ r: 3 }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                <CardTitle>Quick analysis</CardTitle>
              </div>
              <CardDescription>Monitor key system metrics.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Admin overview helps you immediately monitor the system.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
