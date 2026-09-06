import React from 'react';
import { Badge } from './Badge';
import { Activity, Database, Server, RefreshCw } from 'lucide-react';

interface SystemStatusBannerProps {
  apiStatus: 'healthy' | 'degraded' | 'loading';
  dbStatus: 'connected' | 'disconnected' | 'loading';
  latencyMs?: number;
  requestId?: string;
  onRefresh?: () => void;
}

export const SystemStatusBanner: React.FC<SystemStatusBannerProps> = ({
  apiStatus,
  dbStatus,
  latencyMs,
  requestId,
  onRefresh,
}) => {
  const isHealthy = apiStatus === 'healthy' && dbStatus === 'connected';

  return (
    <div className="bg-carbon-black border border-silver/20 rounded-lg p-5 shadow-lg">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-3 h-3 rounded-full ${
              apiStatus === 'loading'
                ? 'bg-amber-400 animate-ping'
                : isHealthy
                ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]'
                : 'bg-strawberry-red shadow-[0_0_10px_#e5383b]'
            }`}
          />
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              Capacity Connect Foundation System Status
              <Badge variant={isHealthy ? 'success' : apiStatus === 'loading' ? 'warning' : 'danger'}>
                {apiStatus === 'loading' ? 'INITIALIZING' : isHealthy ? 'OPERATIONAL' : 'DEGRADED'}
              </Badge>
            </h2>
            <p className="text-xs text-silver mt-0.5 font-mono">
              STAGE 0 — FOUNDATION ONLY (NO AUTH, NO AI RUNTIME)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end md:self-auto">
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-2 rounded bg-onyx hover:bg-dark-garnet text-silver hover:text-white border border-silver/20 transition-all text-xs flex items-center gap-1.5"
              title="Refresh System Health"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${apiStatus === 'loading' ? 'animate-spin' : ''}`} />
              Ping API
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-silver/10">
        <div className="flex items-center justify-between bg-onyx/80 p-3 rounded border border-silver/10">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-silver" />
            <span className="text-xs font-medium text-white-smoke">REST API (/api/v1)</span>
          </div>
          <Badge variant={apiStatus === 'healthy' ? 'success' : apiStatus === 'loading' ? 'warning' : 'danger'} size="sm">
            {apiStatus === 'loading' ? 'CHECKING...' : apiStatus.toUpperCase()}
          </Badge>
        </div>

        <div className="flex items-center justify-between bg-onyx/80 p-3 rounded border border-silver/10">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-silver" />
            <span className="text-xs font-medium text-white-smoke">PostgreSQL Pool</span>
          </div>
          <Badge variant={dbStatus === 'connected' ? 'success' : dbStatus === 'loading' ? 'warning' : 'danger'} size="sm">
            {dbStatus === 'loading' ? 'CHECKING...' : dbStatus.toUpperCase()}
          </Badge>
        </div>

        <div className="flex items-center justify-between bg-onyx/80 p-3 rounded border border-silver/10 font-mono text-xs">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-silver" />
            <span className="text-silver">Latency:</span>
          </div>
          <span className="text-white font-bold">{latencyMs !== undefined ? `${latencyMs} ms` : '—'}</span>
        </div>
      </div>

      {requestId && (
        <div className="mt-3 text-[11px] text-silver/60 font-mono text-right">
          Tracing Request ID: <span className="text-dust-grey">{requestId}</span>
        </div>
      )}
    </div>
  );
};
