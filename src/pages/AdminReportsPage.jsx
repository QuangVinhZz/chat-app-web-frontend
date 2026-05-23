import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
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

const STATUS_LABELS = {
  pending: "Pending",
  reviewed: "Reviewed",
  resolved: "Resolved",
  dismissed: "Dismissed",
};

export default function AdminReportsPage() {
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
      <header className="h-16 px-6 pl-16 md:pl-6 border-b flex items-center bg-card">
        <div>
          <h1 className="text-xl font-semibold">Reports</h1>
          <p className="text-sm text-muted-foreground">
            View and update user report statuses.
          </p>
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
              <CardTitle>Reports list</CardTitle>
              <CardDescription>
                Current report requests and their handling status.
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="min-w-full border-collapse text-left text-sm">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-muted-foreground">
                      Reported by
                    </th>
                    <th className="px-4 py-3 text-muted-foreground">Reason</th>
                    <th className="px-4 py-3 text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((report) => (
                    <tr key={report.id} className="border-t border-border">
                      <td className="px-4 py-3">
                        {report.reporter?.name ||
                          report.reporter?.email ||
                          "---"}
                      </td>
                      <td className="px-4 py-3">
                        {report.reason ||
                          report.description ||
                          "No description"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ${
                            report.status === "pending"
                              ? "bg-secondary/10 text-secondary"
                              : report.status === "reviewed"
                                ? "bg-primary/10 text-primary"
                                : report.status === "resolved"
                                  ? "bg-success/10 text-success"
                                  : "bg-destructive/10 text-destructive"
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
                          <CheckCircle2 className="w-4 h-4" /> Reviewed
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={updatingId === report.id}
                          onClick={() =>
                            handleUpdateStatus(report.id, "dismissed")
                          }
                        >
                          <XCircle className="w-4 h-4" /> Dismiss
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
