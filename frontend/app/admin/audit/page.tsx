'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Search,
  Download,
  Filter,
  RefreshCw,
  Calendar,
  User,
  Activity,
  FileText,
  X,
  Code,
} from 'lucide-react';
import { getAuditLogs, exportAuditLogs, AuditLogItem, AuditFilters } from '../../../lib/audit';

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selectedDetails, setSelectedDetails] = useState<AuditLogItem | null>(null);

  // Filters
  const [action, setAction] = useState<string>('');
  const [resourceType, setResourceType] = useState<string>('');
  const [resourceId, setResourceId] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchLogs = async (pageNum = 1) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const filters: AuditFilters = {
        page: pageNum,
        limit: 20,
      };
      if (action) filters.action = action as any;
      if (resourceType) filters.resourceType = resourceType as any;
      if (resourceId) filters.resourceId = resourceId;
      if (dateFrom) filters.dateFrom = dateFrom;
      if (dateTo) filters.dateTo = dateTo;

      const data = await getAuditLogs(filters);
      setLogs(data.logs || []);
      setTotal(data.total || 0);
      setPage(data.page || 1);
    } catch (err: any) {
      console.error('Failed to load audit logs', err);
      if (err.response?.status === 403) {
        setErrorMsg('Access Denied: Only administrators have permission to view enterprise audit logs.');
      } else {
        setErrorMsg(err.response?.data?.error?.message || 'Failed to retrieve audit records.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(1);
  }, []);

  const handleApplyFilter = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs(1);
  };

  const handleExport = async (format: 'csv' | 'json') => {
    try {
      const filters: any = {};
      if (action) filters.action = action;
      if (resourceType) filters.resourceType = resourceType;
      if (resourceId) filters.resourceId = resourceId;
      if (dateFrom) filters.dateFrom = dateFrom;
      if (dateTo) filters.dateTo = dateTo;

      const blob = await exportAuditLogs(format, filters);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit_logs_${new Date().toISOString().slice(0, 10)}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export audit logs', err);
    }
  };

  const totalPages = Math.ceil(total / 20) || 1;

  if (errorMsg && errorMsg.includes('Access Denied')) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-4">
        <ShieldAlert className="w-16 h-16 text-mahogany-red mx-auto" />
        <h1 className="text-2xl font-bold text-white">Administrator Access Required</h1>
        <p className="text-silver text-sm max-w-md mx-auto">{errorMsg}</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <ShieldAlert className="w-6 h-6 text-strawberry-red" />
            Enterprise Audit Trail Explorer
          </h1>
          <p className="text-sm text-silver mt-1">
            Immutable, organization-scoped compliance logs for tracking administrative and domain actions.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => handleExport('csv')}
            className="px-3.5 py-1.5 rounded-lg bg-carbon-black border border-white/10 text-dust-grey hover:text-white text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <button
            onClick={() => handleExport('json')}
            className="px-3.5 py-1.5 rounded-lg bg-carbon-black border border-white/10 text-dust-grey hover:text-white text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export JSON
          </button>
          <button
            onClick={() => fetchLogs(page)}
            className="px-3.5 py-1.5 rounded-lg bg-mahogany-red hover:bg-strawberry-red text-white text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <form
        onSubmit={handleApplyFilter}
        className="p-4 rounded-xl bg-carbon-black/60 border border-white/10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end"
      >
        <div>
          <label className="block text-xs font-medium text-silver mb-1">Action</label>
          <select
            value={action}
            onChange={(e) => setAction(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-lg bg-onyx border border-white/10 text-xs text-white focus:outline-none focus:border-mahogany-red"
          >
            <option value="">All Actions</option>
            <option value="USER_REGISTERED">USER_REGISTERED</option>
            <option value="USER_ROLE_UPDATED">USER_ROLE_UPDATED</option>
            <option value="ENROLLMENT_CREATED">ENROLLMENT_CREATED</option>
            <option value="COURSE_COMPLETED">COURSE_COMPLETED</option>
            <option value="ASSESSMENT_SUBMITTED">ASSESSMENT_SUBMITTED</option>
            <option value="SESSION_REQUESTED">SESSION_REQUESTED</option>
            <option value="SESSION_STATUS_CHANGED">SESSION_STATUS_CHANGED</option>
            <option value="CERTIFICATE_ISSUED">CERTIFICATE_ISSUED</option>
            <option value="SNAPSHOT_INVALIDATED">SNAPSHOT_INVALIDATED</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-silver mb-1">Resource Type</label>
          <select
            value={resourceType}
            onChange={(e) => setResourceType(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-lg bg-onyx border border-white/10 text-xs text-white focus:outline-none focus:border-mahogany-red"
          >
            <option value="">All Resources</option>
            <option value="USER">USER</option>
            <option value="COURSE">COURSE</option>
            <option value="ENROLLMENT">ENROLLMENT</option>
            <option value="ASSESSMENT">ASSESSMENT</option>
            <option value="TRAINER_SESSION">TRAINER_SESSION</option>
            <option value="CERTIFICATE">CERTIFICATE</option>
            <option value="ANALYTICS_SNAPSHOT">ANALYTICS_SNAPSHOT</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-silver mb-1">Resource ID</label>
          <input
            type="text"
            placeholder="e.g. CERT-CC-2026-..."
            value={resourceId}
            onChange={(e) => setResourceId(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-lg bg-onyx border border-white/10 text-xs text-white placeholder-silver/50 focus:outline-none focus:border-mahogany-red"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-silver mb-1">Date From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-lg bg-onyx border border-white/10 text-xs text-white focus:outline-none focus:border-mahogany-red"
          />
        </div>

        <div>
          <button
            type="submit"
            className="w-full px-3.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 text-xs text-white font-medium flex items-center justify-center gap-1.5 transition-colors"
          >
            <Filter className="w-3.5 h-3.5" />
            Apply Filters
          </button>
        </div>
      </form>

      {/* Logs Table */}
      <div className="rounded-xl border border-white/10 bg-carbon-black/40 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-carbon-black/80 border-b border-white/10 text-dust-grey uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Actor</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Resource</th>
                <th className="px-4 py-3">Network & Client</th>
                <th className="px-4 py-3 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-silver">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-silver">
                    Loading audit records...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-silver">
                    No audit records matching your criteria.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-carbon-black/70 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-dust-grey font-mono text-[11px]">
                      {new Date(log.created_at).toLocaleString([], {
                        dateStyle: 'short',
                        timeStyle: 'medium',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-white truncate max-w-[160px]">
                        {log.actor_email || 'System'}
                      </div>
                      <div className="text-[10px] text-silver uppercase">{log.actor_role || 'SYSTEM'}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 font-mono text-[11px] text-strawberry-red">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-white font-medium">{log.resource_type}</div>
                      {log.resource_id && (
                        <div className="text-[11px] font-mono text-silver truncate max-w-[140px]">
                          {log.resource_id}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[11px]">
                      <div>{log.ip_address || '—'}</div>
                      <div className="text-silver/60 truncate max-w-[120px]">{log.user_agent || '—'}</div>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => setSelectedDetails(log)}
                        className="px-2.5 py-1 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-dust-grey hover:text-white text-[11px] font-medium transition-colors inline-flex items-center gap-1"
                      >
                        <Code className="w-3 h-3" />
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-white/10 bg-carbon-black/60">
            <p className="text-xs text-silver">
              Page {page} of {totalPages} ({total} audit entries)
            </p>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => fetchLogs(page - 1)}
                className="px-3 py-1.5 rounded-lg bg-onyx border border-white/10 text-xs text-dust-grey disabled:opacity-40 disabled:cursor-not-allowed hover:text-white transition-colors"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => fetchLogs(page + 1)}
                className="px-3 py-1.5 rounded-lg bg-onyx border border-white/10 text-xs text-dust-grey disabled:opacity-40 disabled:cursor-not-allowed hover:text-white transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Structured Details Modal */}
      {selectedDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-2xl bg-onyx border border-white/10 rounded-xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-carbon-black">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-strawberry-red" />
                <h3 className="text-sm font-semibold text-white">Audit Event Details</h3>
              </div>
              <button
                onClick={() => setSelectedDetails(null)}
                className="p-1 rounded-lg text-dust-grey hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3 text-xs bg-black/40 p-3 rounded-lg border border-white/5">
                <div>
                  <span className="text-silver">Action:</span>{' '}
                  <span className="text-white font-mono">{selectedDetails.action}</span>
                </div>
                <div>
                  <span className="text-silver">Resource:</span>{' '}
                  <span className="text-white">{selectedDetails.resource_type}</span>
                </div>
                <div>
                  <span className="text-silver">Actor:</span>{' '}
                  <span className="text-white">{selectedDetails.actor_email || 'System'}</span>
                </div>
                <div>
                  <span className="text-silver">Timestamp:</span>{' '}
                  <span className="text-white font-mono">
                    {new Date(selectedDetails.created_at).toISOString()}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-silver mb-1.5">Structured Event Payload</label>
                <pre className="p-3.5 rounded-lg bg-black/60 border border-white/10 text-xs font-mono text-emerald-400 overflow-x-auto">
                  {JSON.stringify(selectedDetails.details, null, 2)}
                </pre>
              </div>
            </div>
            <div className="px-5 py-3 border-t border-white/10 bg-carbon-black text-right">
              <button
                onClick={() => setSelectedDetails(null)}
                className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs text-white font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
