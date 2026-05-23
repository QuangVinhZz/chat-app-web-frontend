import { useEffect, useState } from "react";
import { Lock, Unlock, Search } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Spinner } from "../components/ui/Spinner";
import { adminService } from "../services/adminService";

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState(null);

  const loadUsers = async (query = "") => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminService.listUsers({
        q: query,
        page: 1,
        limit: 50,
      });
      setUsers(data.users || []);
    } catch (err) {
      console.error("Failed to load users:", err);
      setError(
        err?.status
          ? `Không thể tải danh sách người dùng (HTTP ${err.status}): ${err.message || "Lỗi"}`
          : err?.message
            ? `Không thể tải danh sách người dùng: ${err.message}`
            : "Không thể tải danh sách người dùng.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers("");
  }, []);

  const handleStatusToggle = async (user) => {
    setUpdating(true);
    try {
      const newStatus = user.accountStatus === "locked" ? "active" : "locked";
      await adminService.updateUserStatus(user.id, newStatus);
      await loadUsers(search);
    } catch (err) {
      console.error("Failed to update user status:", err);
    } finally {
      setUpdating(false);
    }
  };

  // Search: dùng server-side (backend hỗ trợ q=name/email), nên không filter thêm ở client.
  const filteredUsers = users;

  return (
    <div className="flex-1 overflow-y-auto">
      <header className="h-16 px-6 pl-16 md:pl-6 border-b flex items-center bg-card">
        <div>
          <h1 className="text-xl font-semibold">User management</h1>
          <p className="text-sm text-muted-foreground">
            Search, view statuses, and lock/unlock user accounts.
          </p>
        </div>
      </header>

      <div className="p-6 space-y-6">
        <div className="border border-border rounded-lg bg-card/50">
          <div className="p-4">
            <div className="relative flex items-center w-full md:max-w-sm">
              <Search className="absolute left-3 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => {
                  const v = event.target.value;
                  setSearch(v);
                  // debounce nhẹ bằng timeout
                  clearTimeout(window.__adminUsersSearchTimer);
                  window.__adminUsersSearchTimer = setTimeout(() => {
                    loadUsers(v);
                  }, 300);
                }}
                className="pl-9"
                placeholder="Search users by name or email..."
              />
            </div>
          </div>
        </div>

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
              <CardTitle>Users</CardTitle>
              <CardDescription>
                You can lock or unlock user accounts here.
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="min-w-full border-collapse text-left text-sm">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-muted-foreground">Name</th>
                    <th className="px-4 py-3 text-muted-foreground">UUID/ID</th>
                    <th className="px-4 py-3 text-muted-foreground">Email</th>
                    <th className="px-4 py-3 text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-muted-foreground">Created</th>
                    <th className="px-4 py-3 text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="border-t border-border">
                      <td className="px-4 py-3">{user.name || "---"}</td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-muted-foreground">
                          {user.uuid || user.id}
                        </span>
                      </td>
                      <td className="px-4 py-3">{user.email}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ${
                            user.accountStatus === "locked"
                              ? "bg-destructive/10 text-destructive"
                              : "bg-success/10 text-success"
                          }`}
                        >
                          {user.accountStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {(() => {
                          const raw = user?.createdAt;
                          if (!raw) return "---";
                          const d = new Date(raw);
                          return Number.isNaN(d.getTime())
                            ? "---"
                            : d.toLocaleDateString();
                        })()}
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          size="sm"
                          variant={
                            user.accountStatus === "locked"
                              ? "secondary"
                              : "destructive"
                          }
                          onClick={() => handleStatusToggle(user)}
                          disabled={updating}
                          className="inline-flex items-center gap-2"
                        >
                          {user.accountStatus === "locked" ? (
                            <Unlock className="w-4 h-4" />
                          ) : (
                            <Lock className="w-4 h-4" />
                          )}
                          {user.accountStatus === "locked" ? "Unlock" : "Lock"}
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
