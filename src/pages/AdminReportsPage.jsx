import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, XCircle, ShieldCheck, BarChart3, FileText, Users, ArrowLeft, LogOut } from "lucide-react";
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

const STATUS_LABELS = {
  pending: "Đang chờ",
  reviewed: "Đã xem",
  resolved: "Đã giải quyết",
  dismissed: "Đã hủy",
};

export default function AdminReportsPage() {
  const navigate = useNavigate();
  const logout = useUserStore((s) => s.logout);

  const handleLogout = async () => {
    await logout();
    useFriendsStore.getState().reset();
    useConversationsStore.getState().reset();
    navigate("/login");
  };

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [error, setError] = useState(null);

  const loadReports = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminService.listReports({ page: 1, limit: 50 });
      setReports(data.reports || []);
    } catch (err) {
      console.error("Failed to load reports:", err);
      setError(
        err?.status
          ? `Không thể tải dữ liệu báo cáo (HTTP ${err.status}): ${err.message || "Lỗi"}`
          : err?.message
            ? `Không thể tải dữ liệu báo cáo: ${err.message}`
            : "Không thể tải dữ liệu báo cáo.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const handleUpdateStatus = async (reportId, status) => {
    setUpdatingId(reportId);
    try {
      await adminService.updateReportStatus(reportId, status);
      await loadReports();
    } catch (err) {
      console.error("Failed to update report status:", err);
    } finally {
      setUpdatingId(null);
    }
  };

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
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Spinner size="lg" />
          </div>
        ) : error ? (
          <Card>
            <CardContent>
              <p className="text-sm text-destructive">{error}</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Danh sách báo cáo</CardTitle>
              <CardDescription>
                Các yêu cầu báo cáo hiện tại và trạng thái xử lý tương ứng.
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="min-w-full border-collapse text-left text-sm">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-muted-foreground">Người báo cáo</th>
                    <th className="px-4 py-3 text-muted-foreground">Người bị báo cáo</th>
                    <th className="px-4 py-3 text-muted-foreground">Lý do</th>
                    <th className="px-4 py-3 text-muted-foreground">Thời gian</th>
                    <th className="px-4 py-3 text-muted-foreground">Trạng thái</th>
                    <th className="px-4 py-3 text-muted-foreground">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((report) => (
                    <tr key={report.id} className="border-t border-border">
                      <td className="px-4 py-3 font-medium">
                        {report.reporter?.name ||
                          report.reporter?.email ||
                          "---"}
                      </td>
                      <td className="px-4 py-3 font-medium text-destructive">
                        {report.targetUser?.name ||
                          report.targetUser?.email ||
                          "---"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">
                        {report.reason ||
                          report.description ||
                          "Không có lý do"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {report.createdAt
                          ? new Date(report.createdAt).toLocaleString("vi-VN")
                          : "---"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                            report.status === "pending"
                              ? "bg-amber-500/10 text-amber-600"
                              : report.status === "reviewed"
                                ? "bg-blue-500/10 text-blue-600"
                                : report.status === "resolved"
                                  ? "bg-green-500/10 text-green-600"
                                  : "bg-red-500/10 text-red-600"
                          }`}
                        >
                          {STATUS_LABELS[report.status] || report.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 space-x-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={updatingId === report.id}
                          onClick={() =>
                            handleUpdateStatus(report.id, "reviewed")
                          }
                        >
                          <CheckCircle2 className="w-4 h-4 mr-1" /> Đã xem
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={updatingId === report.id}
                          onClick={() =>
                            handleUpdateStatus(report.id, "dismissed")
                          }
                        >
                          <XCircle className="w-4 h-4 mr-1" /> Hủy bỏ
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
