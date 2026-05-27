import { useEffect, useState } from "react";
import {
  ShieldCheck,
  Users,
  MessageCircle,
  FileText,
  BarChart3,
  ArrowLeft,
  LogOut,
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
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useUserStore } from "../stores/userStore";
import { useFriendsStore } from "../stores/friendsStore";
import { useConversationsStore } from "../stores/conversationsStore";

export default function AdminPage() {
  const navigate = useNavigate();
  const logout = useUserStore((s) => s.logout);

  const handleLogout = async () => {
    await logout();
    useFriendsStore.getState().reset();
    useConversationsStore.getState().reset();
    navigate("/login");
  };

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
      title: "Tổng số người dùng",
      color: "#2563eb",
      cumulative: true,
      description: "Tổng số lượng người dùng tích lũy theo thời gian.",
      valueKey: "users",
    },
    {
      key: "newUsers",
      title: "Người dùng mới",
      color: "#0ea5e9",
      cumulative: false,
      description: "Số lượng người dùng mới trong từng khoảng thời gian.",
      valueKey: "newUsersToday",
    },
    {
      key: "conversations",
      title: "Cuộc trò chuyện",
      color: "#14b8a6",
      cumulative: true,
      description: "Tổng số lượng cuộc trò chuyện tích lũy theo thời gian.",
      valueKey: "conversations",
    },
    {
      key: "groups",
      title: "Nhóm trò chuyện",
      color: "#22c55e",
      cumulative: true,
      description: "Tổng số lượng nhóm được tạo tích lũy theo thời gian.",
      valueKey: "groups",
    },
    {
      key: "messages",
      title: "Tin nhắn",
      color: "#f97316",
      cumulative: false,
      description: "Số lượng tin nhắn gửi trong từng khoảng thời gian.",
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
      setStatsError("Không thể tải dữ liệu biểu đồ.");
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
      <header className="h-16 px-6 border-b flex items-center justify-between bg-card shrink-0">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-1.5">
            <h1 className="text-lg font-bold text-primary mr-4">Trang Quản Trị</h1>
            <nav className="flex gap-1">
              <NavLink
                to="/admin"
                end
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`
                }
              >
                <BarChart3 className="w-4 h-4" />
                <span>Xu hướng chỉ số</span>
              </NavLink>
              <NavLink
                to="/admin/users"
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`
                }
              >
                <Users className="w-4 h-4" />
                <span>Người dùng</span>
              </NavLink>
              <NavLink
                to="/admin/reports"
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`
                }
              >
                <FileText className="w-4 h-4" />
                <span>Báo cáo vi phạm</span>
              </NavLink>
            </nav>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-xs text-muted-foreground font-medium">Chế độ Quản trị</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 inline-flex items-center gap-1.5"
          >
            <LogOut className="w-4 h-4" />
            <span>Đăng xuất</span>
          </Button>
        </div>
      </header>

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-primary" />
                <CardTitle>Tổng quan Hệ thống</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  {
                    label: "Tổng số người dùng",
                    value: overview.users,
                  },
                  {
                    label: "Người dùng mới hôm nay",
                    value: overview.newUsersToday,
                  },
                  {
                    label: "Cuộc trò chuyện",
                    value: overview.conversations,
                  },
                  {
                    label: "Nhóm trò chuyện",
                    value: overview.groups,
                  },
                  {
                    label: "Tin nhắn hôm nay",
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
                <CardTitle>Quản lý người dùng</CardTitle>
              </div>
              <CardDescription>
                Truy cập danh sách người dùng để khóa hoặc mở khóa tài khoản.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Xem chi tiết danh sách tài khoản thành viên và điều chỉnh quyền truy cập của họ.
              </p>

              <Button asChild className="mt-4">
                <Link to="/admin/users">Quản lý Người dùng</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                <CardTitle>Báo cáo vi phạm</CardTitle>
              </div>
              <CardDescription>Xem và quản lý các báo cáo vi phạm.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Xét duyệt các báo cáo lạm dụng, nội dung xấu từ thành viên và cập nhật trạng thái.
              </p>
              <Button asChild className="mt-4">
                <Link to="/admin/reports">Quản lý Báo cáo</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                <CardTitle>Xu hướng chỉ số</CardTitle>
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
                      ? "Ngày"
                      : option === "week"
                        ? "Tuần"
                        : "Tháng"}
                  </Button>
                ))}
                <div className="flex items-center gap-2 border rounded-xl p-2 bg-slate-50">
                  <label className="text-sm text-muted-foreground">Từ</label>
                  <input
                    type="date"
                    className="rounded-md border px-2 py-1 text-sm"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                  />
                  <label className="text-sm text-muted-foreground">Đến</label>
                  <input
                    type="date"
                    className="rounded-md border px-2 py-1 text-sm"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                  />
                  <Button size="sm" onClick={applyCustomRange}>
                    Xem kết quả
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
                      Chọn một chỉ số để xem xu hướng thay đổi
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
                        chu kỳ: {period === "day" ? "Ngày" : period === "week" ? "Tuần" : "Tháng"}
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

      </div>
    </div>
  );
}
