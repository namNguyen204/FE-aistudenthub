import api from './api';

const adminService = {
  // ---- User Management ----
  getUsers: async (keyword = '', page = 0, size = 20) => {
    const params = new URLSearchParams({ page, size });
    if (keyword) params.append('keyword', keyword);
    const response = await api.get(`/admin/users?${params.toString()}`);
    return response.data?.data;
  },

  getUserById: async (id) => {
    const response = await api.get(`/admin/users/${id}`);
    return response.data?.data;
  },

  updateUserStatus: async (id, active) => {
    const response = await api.patch(`/admin/users/${id}/status`, { active });
    return response.data?.data;
  },

  softDeleteUser: async (id) => {
    const response = await api.delete(`/admin/users/${id}`);
    return response.data?.message;
  },

  // ---- Dashboard Stats ----
  getDashboardStats: async () => {
    const response = await api.get('/admin/dashboard/stats');
    return response.data?.data;
  },

  getDocumentTypeStats: async () => {
    const response = await api.get('/admin/dashboard/document-types');
    return response.data?.data;
  },

  getUploadTrend: async (days = 30) => {
    const response = await api.get(`/admin/dashboard/upload-trend?days=${days}`);
    return response.data?.data;
  },

  getAiUsage: async () => {
    const response = await api.get('/admin/dashboard/ai-usage');
    return response.data?.data;
  },

  getBusinessStats: async () => {
    const response = await api.get('/admin/dashboard/business-stats');
    return response.data?.data;
  },

  getRevenueTrend: async (days = 30) => {
    const response = await api.get(`/admin/dashboard/revenue-trend?days=${days}`);
    return response.data?.data;
  },

  getViolationStats: async () => {
    try {
      const response = await api.get('/admin/reports/stats');
      return response.data?.data;
    } catch {
      try {
        const statuses = ['PENDING', 'RESOLVED', 'DISMISSED'];
        const responses = await Promise.all(statuses.map((status) =>
          api.get(`/admin/reports?status=${status}&page=0&size=1`)
        ));
        const counts = responses.map((response) => Number(response.data?.data?.totalElements || 0));
        return {
          totalReports: counts.reduce((sum, count) => sum + count, 0),
          pendingReports: counts[0],
          resolvedReports: counts[1],
          dismissedReports: counts[2]
        };
      } catch {
        return { totalReports: 0, pendingReports: 0, resolvedReports: 0, dismissedReports: 0 };
      }
    }
  },

  // ---- System Config ----
  getAllConfigs: async () => {
    const response = await api.get('/admin/system-config');
    return response.data?.data;
  },

  updateConfigs: async (configsObj) => {
    const configsArray = Object.keys(configsObj).map(key => ({
      configKey: key,
      configValue: configsObj[key] === true ? 'true' : (configsObj[key] === false ? 'false' : String(configsObj[key]))
    }));
    const response = await api.put('/admin/system-config', { configs: configsArray });
    return response.data?.data;
  },

  // ---- System Logs ----
  getSystemLogs: async (params) => {
    // Clean undefined/empty values
    const cleanParams = {};
    for (const key in params) {
      if (params[key] !== undefined && params[key] !== '') {
        cleanParams[key] = params[key];
      }
    }
    const query = new URLSearchParams(cleanParams);
    const response = await api.get(`/admin/logs?${query.toString()}`);
    return response.data?.data;
  },

  clearSystemLogs: async (before) => {
    const response = await api.delete(`/admin/logs/clear?before=${before}`);
    return response.data?.message;
  },

  // ---- Documents ----
  getAllDocuments: async (keyword = '', page = 0, size = 20) => {
    try {
      const params = new URLSearchParams({ page, size });
      if (keyword) params.append('keyword', keyword);
      const response = await api.get(`/admin/documents?${params.toString()}`);
      return response.data?.data;
    } catch (e) {
      console.warn('Lỗi khi lấy danh sách tài liệu', e);
      return { content: [], totalElements: 0, totalPages: 0 };
    }
  },

  deleteDocument: async (id) => {
    const response = await api.delete(`/admin/documents/${id}`);
    return response.data?.message;
  },

  getUploadStatus: async (id) => {
    const response = await api.get(`/admin/documents/${id}/upload-status`);
    return response.data?.data;
  },

  approveDocument: async (id) => {
    const response = await api.post(`/moderator/dashboard/approve`, { documentId: id });
    return response.data;
  },

  rejectDocument: async (id, reason) => {
    const response = await api.post(`/moderator/dashboard/reject`, { documentId: id, reason });
    return response.data;
  },

  dmcaTakedown: async (documentId) => {
    // According to the requirement, the path is /moderator/dashboard/dmca-takedown but typical is admin
    // I will use /admin/documents/${id}/dmca-takedown to be consistent, but the prompt says POST /api/v1/moderator/dashboard/dmca-takedown
    const response = await api.post('/moderator/dashboard/dmca-takedown', { documentId });
    return response.data;
  },

  // ---- Reports ----
  getReports: async (params) => {
    const { status, reason, page = 0, size = 20 } = params || {};
    const searchParams = new URLSearchParams({ page, size });
    if (status) searchParams.append('status', status);
    if (reason) searchParams.append('reason', reason);

    const response = await api.get(`/admin/reports?${searchParams.toString()}`);
    return response.data?.data;
  },

  resolveReport: async (reportId, decision, moderatorNote) => {
    const response = await api.put(`/admin/reports/${reportId}/resolve`, { decision, moderatorNote });
    return response.data;
  },

  // ---- Chat (Fallback to standard APIs if Admin APIs are missing) ----
  // If there's no Admin API to view all chats, we might get 403 or empty data.
  // We will add it as placeholder.
  getAllChatSessions: async (keyword = '', page = 1, size = 20) => {
    try {
      const params = new URLSearchParams({ page, size });
      if (keyword) params.append('keyword', keyword);
      const response = await api.get(`/admin/chats?${params.toString()}`);
      return response.data?.data;
    } catch (err) {
      console.warn('Lỗi khi tải chat sessions', err);
      return { content: [], totalElements: 0, totalPages: 0 };
    }
  },

  getSessionMessages: async (sessionId) => {
    const response = await api.get(`/admin/chats/${sessionId}/messages`);
    return response.data?.data;
  },

  deleteChatSession: async (id, reason = 'Vi phạm chính sách nội dung') => {
    const response = await api.delete(`/admin/chats/${id}`, { data: { reason } });
    return response.data?.message;
  }
};

export default adminService;
