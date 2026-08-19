import api from './api';

const documentService = {
  upload: async (file, requestData, onUploadProgress) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const requestBlob = new Blob([JSON.stringify(requestData)], { type: 'application/json' });
    formData.append('request', requestBlob);

    const response = await api.post('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress,
    });
    return response.data?.data;
  },

  search: async (params) => {
    const { keyword, subject, major, folderId, documentType, page = 0, size = 12 } = params || {};
    
    const response = await api.get('/documents/my');
    let allDocs = response.data?.data || [];
    
    if (keyword) {
      const kw = keyword.toLowerCase();
      allDocs = allDocs.filter(d => 
        (d.title?.toLowerCase().includes(kw)) || 
        (d.description?.toLowerCase().includes(kw))
      );
    }
    if (subject) {
      allDocs = allDocs.filter(d => d.subject === subject);
    }
    if (major) {
      allDocs = allDocs.filter(d => d.major === major);
    }
    if (folderId) {
      allDocs = allDocs.filter(d => d.folderId === folderId);
    } else if (!keyword && !documentType && !subject && !major) {
      allDocs = allDocs.filter(d => !d.folderId);
    }
    if (documentType) {
      allDocs = allDocs.filter(d => d.documentType === documentType);
    }
    
    const totalElements = allDocs.length;
    const totalPages = Math.ceil(totalElements / size);
    const start = page * size;
    const pagedDocs = allDocs.slice(start, start + size);
    
    return {
      content: pagedDocs,
      totalElements,
      totalPages,
      number: page,
      size
    };
  },

  getMyDocuments: async () => {
    const response = await api.get('/documents/my');
    return response.data?.data;
  },

  getPublicDocuments: async (params) => {
    const { keyword, subject, major, documentType, category, uploader, startDate, endDate, sort, page = 0, size = 12 } = params || {};
    const response = await api.get('/documents/public', {
      params: { keyword, subject, major, documentType, category, uploader, startDate, endDate, sort, page, size }
    });
    return response.data?.data;
  },

  getOnlyOfficeConfig: async (id) => {
    const response = await api.get(`/documents/${id}/onlyoffice-config`);
    return response.data?.data;
  },

  getFilterOptions: async () => {
    const response = await api.get('/documents/filter-options');
    return response.data?.data;
  },

  getPublicFilterOptions: async () => {
    const response = await api.get('/documents/public/filter-options');
    return response.data?.data;
  },

  getById: async (id) => {
    const response = await api.get(`/documents/${id}`);
    return response.data?.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/documents/${id}`, data);
    return response.data?.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/documents/${id}`);
    return response.data;
  },

  getUploadStatus: async (id) => {
    const response = await api.get(`/documents/${id}/upload-status`);
    return response.data?.data;
  },

  getPreview: async (id) => {
    const response = await api.get(`/documents/${id}/preview`);
    return response.data?.data;
  },

  getDownloadUrl: async (id) => {
    const response = await api.get(`/documents/${id}/download`);
    return response.data?.data;
  },

  stream: async (id) => {
    const response = await api.get(`/documents/${id}/stream`, { responseType: 'blob' });
    return response.data;
  },

  shareDocument: async (id, targetEmail, permission = 'READ') => {
    const response = await api.post(`/documents/${id}/share`, { targetEmail, permission });
    return response.data?.data;
  },

  getSharedWithMe: async () => {
    const response = await api.get('/documents/shared-with-me');
    return response.data?.data;
  },

  getSharedUsers: async (id) => {
    // Note: Backend might not have this yet, we catch errors gracefully
    const response = await api.get(`/documents/${id}/shared-users`);
    return response.data?.data;
  },

  revokeShare: async (id, targetUserId) => {
    const response = await api.delete(`/documents/${id}/share/${targetUserId}`);
    return response.data;
  },

  reportDocument: async (id, payload) => {
    // Note: If backend doesn't support this yet, this might return 404, but we implement frontend first
    const response = await api.post(`/documents/${id}/report`, payload);
    return response.data;
  },

  getVersions: async (id) => {
    const response = await api.get(`/documents/${id}/versions`);
    return response.data?.data;
  },

  getVersion: async (id, versionId) => {
    const response = await api.get(`/documents/${id}/versions/${versionId}`);
    return response.data?.data;
  }
};

export default documentService;
