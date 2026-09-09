import { apiClient } from './api';

export interface AuditLogItem {
  id: string;
  organization_id: string;
  actor_id: string | null;
  actor_email: string | null;
  actor_role: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  details: Record<string, any>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface AuditFilters {
  actorId?: string;
  action?: string;
  resourceType?: string;
  resourceId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedAuditLogs {
  logs: AuditLogItem[];
  total: number;
  page: number;
  limit: number;
}

export async function getAuditLogs(
  filters: AuditFilters = {}
): Promise<PaginatedAuditLogs> {
  const params = new URLSearchParams();
  if (filters.actorId) params.append('actorId', filters.actorId);
  if (filters.action) params.append('action', filters.action);
  if (filters.resourceType) params.append('resourceType', filters.resourceType);
  if (filters.resourceId) params.append('resourceId', filters.resourceId);
  if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.append('dateTo', filters.dateTo);
  if (filters.page) params.append('page', String(filters.page));
  if (filters.limit) params.append('limit', String(filters.limit));

  const res = await apiClient.get(`/audit?${params.toString()}`);
  return res.data.data;
}

export async function exportAuditLogs(
  format: 'csv' | 'json',
  filters: Omit<AuditFilters, 'page' | 'limit'> = {}
): Promise<Blob> {
  const params = new URLSearchParams();
  params.append('format', format);
  if (filters.actorId) params.append('actorId', filters.actorId);
  if (filters.action) params.append('action', filters.action);
  if (filters.resourceType) params.append('resourceType', filters.resourceType);
  if (filters.resourceId) params.append('resourceId', filters.resourceId);
  if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.append('dateTo', filters.dateTo);

  const res = await apiClient.get(`/audit/export?${params.toString()}`, {
    responseType: 'blob',
  });
  return res.data;
}
