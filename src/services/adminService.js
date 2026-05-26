import { apiClient } from './apiClient'

export const adminService = {
  getOverview: () => apiClient.get('/admin/overview'),
  getMessageStats: (params) => apiClient.get('/admin/stats/messages', { query: params }),
  getOverviewStats: (params) => apiClient.get('/admin/stats/overview', { query: params }),
  listUsers: (query) => apiClient.get('/admin/users', { query }),
  updateUserStatus: (id, status) => apiClient.put(`/admin/users/${id}/status`, { status }),
  listReports: (query) => apiClient.get('/admin/reports', { query }),
  updateReportStatus: (id, status) => apiClient.put(`/admin/reports/${id}`, { status }),
}
