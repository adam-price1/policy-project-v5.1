import { useCallback, useEffect, useState } from 'react';
import {
  downloadAllDocuments,
  downloadDocument,
  searchLibrary,
} from '../api/documents';
import { publishToast } from '../lib/toastBus';
import StatusBadge from '../components/StatusBadge';
import type { Document } from '../types';

export default function Library() {
  const [docs, setDocs] = useState<Document[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [downloadingDocId, setDownloadingDocId] = useState<number | null>(null);
  const [downloadingAll, setDownloadingAll] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await searchLibrary({
        search: search || undefined,
        country: countryFilter || undefined,
        page,
        limit: 20,
      });
      setDocs(resp?.items ?? resp?.documents ?? []);
      setTotal(resp?.total ?? 0);
      setPages(resp?.pages ?? 1);
    } catch {
      // Error toast is handled centrally by the Axios interceptor.
    } finally {
      setLoading(false);
    }
  }, [countryFilter, page, search]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDownload = async (documentId: number) => {
    setDownloadingDocId(documentId);
    try {
      await downloadDocument(documentId);
      publishToast({ message: 'PDF download started.', type: 'success' });
    } catch {
      // Error toast is handled centrally by the Axios interceptor.
    } finally {
      setDownloadingDocId(null);
    }
  };

  const handleDownloadAll = async () => {
    setDownloadingAll(true);
    try {
      await downloadAllDocuments();
      publishToast({ message: 'ZIP download started.', type: 'success' });
    } catch {
      // Error toast is handled centrally by the Axios interceptor.
    } finally {
      setDownloadingAll(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Policy Library</h1>
        <p className="mt-1 text-sm text-gray-500">{total} documents</p>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search library..."
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <select
          value={countryFilter}
          onChange={(e) => {
            setCountryFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">All Countries</option>
          <option value="NZ">New Zealand</option>
          <option value="AU">Australia</option>
          <option value="UK">United Kingdom</option>
        </select>
        <button
          onClick={handleDownloadAll}
          disabled={downloadingAll || total === 0}
          className="ml-auto inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 disabled:opacity-50"
        >
          {downloadingAll ? (
            <>
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.37 0 0 5.37 0 12h4zm2 5.29A7.95 7.95 0 014 12H0c0 3.04 1.13 5.82 3 7.94l3-2.65z"
                />
              </svg>
              Downloading...
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              Download All ({total})
            </>
          )}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <svg
              className="mx-auto h-12 w-12 animate-spin text-primary-600"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.37 0 0 5.37 0 12h4zm2 5.29A7.95 7.95 0 014 12H0c0 3.04 1.13 5.82 3 7.94l3-2.65z"
              />
            </svg>
            <p className="mt-3 text-sm text-gray-500">Loading documents...</p>
          </div>
        </div>
      ) : docs.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white py-16 text-center">
          <p className="text-gray-500">No documents found.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {docs.map((doc) => (
            <div
              key={doc.id}
              className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:shadow-md"
            >
              <div className="mb-3 flex items-start justify-between">
                <StatusBadge status={doc.status} />
                <span className="text-xs text-gray-400">{doc.country}</span>
              </div>
              <h3 className="mb-1 line-clamp-2 text-sm font-semibold text-gray-900">{doc.insurer}</h3>
              <p className="mb-3 text-xs text-gray-500">
                {doc.classification} / {doc.policy_type}
              </p>
              <div className="mb-4 text-xs text-gray-400">
                Confidence: {((doc.confidence ?? 0) * 100).toFixed(0)}%
              </div>
              <button
                onClick={() => handleDownload(doc.id)}
                disabled={downloadingDocId === doc.id}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 disabled:opacity-50"
              >
                {downloadingDocId === doc.id ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.37 0 0 5.37 0 12h4zm2 5.29A7.95 7.95 0 014 12H0c0 3.04 1.13 5.82 3 7.94l3-2.65z"
                      />
                    </svg>
                    Downloading...
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                    Download PDF
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      )}

      {pages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <span className="text-sm text-gray-500">
            Page {page} of {pages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page === 1}
              className="rounded-md border border-gray-300 px-3 py-1 text-sm disabled:opacity-40"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((current) => Math.min(pages, current + 1))}
              disabled={page === pages}
              className="rounded-md border border-gray-300 px-3 py-1 text-sm disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
