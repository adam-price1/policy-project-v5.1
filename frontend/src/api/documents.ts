/**
 * Documents API functions.
 */
import client from './client';
import type { Document } from '../types';

export interface DocumentFilters {
  status?: string;
  classification?: string;
  country?: string;
  min_confidence?: number;
  skip?: number;
  limit?: number;
  page?: number;
  search?: string;
  crawl_session_id?: number;
}

export interface DocumentListResponse {
  documents: Document[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
  /* computed helpers for the UI */
  items: Document[];
  pages: number;
  page: number;
  page_size: number;
}

const EMPTY_RESPONSE: DocumentListResponse = {
  documents: [],
  total: 0,
  limit: 20,
  offset: 0,
  has_more: false,
  items: [],
  pages: 1,
  page: 1,
  page_size: 20,
};

function extractFilename(contentDisposition: string | undefined, fallback: string): string {
  if (!contentDisposition) {
    return fallback;
  }

  // Supports both `filename="<name>"` and RFC5987 `filename*=UTF-8''<name>`.
  const utf8Match = /filename\*=UTF-8''([^;]+)/i.exec(contentDisposition);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return utf8Match[1];
    }
  }

  const plainMatch = /filename="?([^"]+)"?/i.exec(contentDisposition);
  if (plainMatch?.[1]) {
    return plainMatch[1];
  }

  return fallback;
}

function triggerBrowserDownload(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

export const getDocumentDownloadUrl = (documentId: number, token?: string): string => {
  const baseUrl = import.meta.env.VITE_API_URL || '';
  const url = `${baseUrl}/api/documents/${documentId}/download`;
  if (!token) {
    return url;
  }
  return `${url}?token=${encodeURIComponent(token)}`;
};

export const downloadDocument = async (documentId: number): Promise<void> => {
  const response = await client.get(`/api/documents/${documentId}/download`, {
    responseType: 'blob',
  });
  const contentDisposition = String(response.headers?.['content-disposition'] ?? '');
  const filename = extractFilename(contentDisposition, `document_${documentId}.pdf`);
  const blob = new Blob([response.data], { type: 'application/pdf' });
  triggerBrowserDownload(blob, filename);
};

export const downloadAllDocuments = async (crawlSessionId?: number): Promise<void> => {
  const response = await client.get('/api/documents/download-all/zip', {
    params: crawlSessionId ? { crawl_session_id: crawlSessionId } : undefined,
    responseType: 'blob',
  });
  const contentDisposition = String(response.headers?.['content-disposition'] ?? '');
  const filename = extractFilename(
    contentDisposition,
    `policycheck_documents_${crawlSessionId ?? 'all'}.zip`,
  );
  const blob = new Blob([response.data], { type: 'application/zip' });
  triggerBrowserDownload(blob, filename);
};

export const exportToCSV = (docs: Document[]): void => {
  const headers = [
    'ID',
    'Insurer',
    'Policy Type',
    'Classification',
    'Country',
    'Confidence',
    'Status',
    'Source URL',
  ];

  const rows = docs.map((doc) => [
    doc.id,
    doc.insurer,
    doc.policy_type,
    doc.classification,
    doc.country,
    `${((doc.confidence ?? 0) * 100).toFixed(0)}%`,
    doc.status,
    doc.source_url,
  ]);

  const csv = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const date = new Date().toISOString().slice(0, 10);
  triggerBrowserDownload(blob, `policycheck_export_${date}.csv`);
};

export const documentsApi = {
  getDocuments: async (filters: DocumentFilters = {}): Promise<DocumentListResponse> => {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
      const response = await client.get('/api/documents', { params });
      const data = response.data || {};
      const docs = data.documents || [];
      const total = data.total || 0;
      const limit = data.limit || filters.limit || 20;
      return {
        ...EMPTY_RESPONSE,
        ...data,
        documents: docs,
        items: docs,
        total,
        pages: Math.ceil(total / limit) || 1,
        page: filters.page || 1,
        page_size: limit,
      };
    } catch {
      return EMPTY_RESPONSE;
    }
  },

  getDocument: async (documentId: number): Promise<Document> => {
    const response = await client.get<Document>(`/api/documents/${documentId}`);
    return response.data;
  },

  approveDocument: async (documentId: number): Promise<Document> => {
    const response = await client.put<Document>(`/api/documents/${documentId}/approve`);
    return response.data;
  },

  reclassifyDocument: async (documentId: number, classification: string): Promise<Document> => {
    const response = await client.put<Document>(
      `/api/documents/${documentId}/reclassify`,
      { classification }
    );
    return response.data;
  },

  deleteDocument: async (documentId: number): Promise<void> => {
    await client.delete(`/api/documents/${documentId}`);
  },

  archiveDocument: async (documentId: number): Promise<Document> => {
    const response = await client.put<Document>(`/api/documents/${documentId}/archive`);
    return response.data;
  },

  downloadDocument,
  downloadAllDocuments,
  getDocumentDownloadUrl,
  exportToCSV,
};

export const listDocuments = documentsApi.getDocuments;
export const searchLibrary = documentsApi.getDocuments;
export const approveDocument = documentsApi.approveDocument;
export const archiveDocument = documentsApi.archiveDocument;
export const deleteDocument = documentsApi.deleteDocument;
