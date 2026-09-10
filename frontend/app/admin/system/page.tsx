'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '../../../components/layout/AppShell';
import { ProtectedRoute } from '../../../components/auth/ProtectedRoute';
import { useAuth } from '../../../context/AuthContext';
import { fetchApiHealth } from '../../../lib/api';
import { testRbacEndpoint } from '../../../lib/auth';
import { SystemStatusBanner } from '../../../components/ui/SystemStatusBanner';
import { ArchitectureGrid } from '../../../components/ui/ArchitectureGrid';
import { AIFoundationCard } from '../../../components/ui/AIFoundationCard';
import { StageRoadmap } from '../../../components/ui/StageRoadmap';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import {
  Cpu,
  Server,
  Database,
  Layers,
  ShieldCheck,
  ShieldAlert,
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Palette,
  Terminal,
} from 'lucide-react';

const COLOR_SWATCHES = [
  { name: 'Onyx', hex: '#0b090a', role: 'Primary App Background', bgClass: 'bg-[#0b090a]' },
  { name: 'Carbon Black', hex: '#161a1d', role: 'Secondary Surfaces & Cards', bgClass: 'bg-[#161a1d]' },
  { name: 'Dark Garnet', hex: '#660708', role: 'Deep Accent & Depth', bgClass: 'bg-[#660708]' },
  { name: 'Mahogany Red', hex: '#a4161a', role: 'Primary Brand & CTAs', bgClass: 'bg-[#a4161a]' },
  { name: 'Mahogany Red 2', hex: '#ba181b', role: 'Active Navigation', bgClass: 'bg-[#ba181b]' },
  { name: 'Strawberry Red', hex: '#e5383b', role: 'Highlights & Alerts', bgClass: 'bg-[#e5383b]' },
  { name: 'Silver', hex: '#b1a7a6', role: 'Secondary Text & Icons', bgClass: 'bg-[#b1a7a6]' },
  { name: 'Dust Grey', hex: '#d3d3d3', role: 'Borders & Subtle UI', bgClass: 'bg-[#d3d3d3]' },
  { name: 'White Smoke', hex: '#f5f3f4', role: 'Light Content Surface', bgClass: 'bg-[#f5f3f4]' },
  { name: 'White', hex: '#ffffff', role: 'Primary Headings', bgClass: 'bg-[#ffffff]' },
];

export default function SystemDiagnosticsPage() {
  const { user } = useAuth();

  const [healthState, setHealthState] = useState<{
    apiStatus: 'healthy' | 'degraded' | 'loading';
    dbStatus: 'connected' | 'disconnected' | 'loading';
    latencyMs?: number;
    requestId?: string;
    errorMsg?: string;
  }>({
    apiStatus: 'loading',
    dbStatus: 'loading',
  });

  const [rbacTestResult, setRbacTestResult] = useState<{
    roleTested: string;
    status: number | string;
    message: string;
    success: boolean;
  } | null>(null);

  const [isTestingRbac, setIsTestingRbac] = useState(false);

  const checkHealth = async () => {
    setHealthState((prev) => ({ ...prev, apiStatus: 'loading', dbStatus: 'loading' }));
    const result = await fetchApiHealth();

    if (result.isHealthy && result.data) {
      setHealthState({
        apiStatus: 'healthy',
        dbStatus: 'connected',
        latencyMs: result.latencyMs,
        requestId: result.requestId,
      });
    } else {
      setHealthState({
        apiStatus: 'degraded',
        dbStatus: result.data?.database === 'connected' ? 'connected' : 'disconnected',
        latencyMs: result.latencyMs,
        requestId: result.requestId,
        errorMsg: result.error || 'Failed to ping backend API',
      });
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 20000);
    return () => clearInterval(interval);
  }, []);

  const handleTestRbac = async (role: 'admin' | 'trainer' | 'trainee') => {
    setIsTestingRbac(true);
    try {
      const res = await testRbacEndpoint(role);
      setRbacTestResult({
        roleTested: role.toUpperCase(),
        status: 200,
        message: res.data?.message || res.message || 'Access Authorized',
        success: true,
      });
    } catch (err: any) {
      const status = err.response?.status || 500;
      const message = err.response?.data?.error?.message || err.message || 'Access Denied';
      setRbacTestResult({
        roleTested: role.toUpperCase(),
        status,
        message: `HTTP ${status}: ${message}`,
        success: false,
      });
    } finally {
      setIsTestingRbac(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={['ADMIN', 'TRAINER']}>
      <AppShell>
        <div className="space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-silver/15 dark:border-white/10 light:border-gray-200">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <Badge variant="brand" size="sm">ENTERPRISE SYSTEM DIAGNOSTICS</Badge>
                <Badge variant="neutral" size="sm">ADMIN &amp; TRAINER PORTAL</Badge>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white dark:text-white light:text-gray-900 tracking-tight flex items-center gap-2.5">
                <Cpu className="w-7 h-7 text-strawberry-red" />
                System Architecture &amp; Telemetry
              </h1>
              <p className="text-xs sm:text-sm text-silver dark:text-silver light:text-gray-600 mt-1">
                Real-time API health, multi-provider AI infrastructure, pgvector database status, and RBAC verification.
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              <Button size="sm" variant="outline" onClick={checkHealth} className="gap-1.5">
                <RefreshCw className="w-3.5 h-3.5" />
                Refresh Telemetry
              </Button>
            </div>
          </div>

          {/* System Status Banner */}
          <SystemStatusBanner
            apiStatus={healthState.apiStatus}
            dbStatus={healthState.dbStatus}
            latencyMs={healthState.latencyMs}
            requestId={healthState.requestId}
            onRefresh={checkHealth}
          />

          {/* AI Foundation Card & Provider Baseline */}
          <AIFoundationCard />

          {/* Architecture Flow */}
          <ArchitectureGrid />

          {/* Interactive RBAC Verification */}
          <Card
            title={
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-strawberry-red" />
                Role-Based Access Control (RBAC) Verification Suite
              </div>
            }
            subtitle="Test endpoint authorization barriers against your current session"
          >
            <div className="space-y-4">
              <p className="text-xs text-silver dark:text-silver light:text-gray-600">
                Execute authenticated test calls to role-restricted endpoints to verify that your session token is properly enforced by backend middleware.
              </p>
              <div className="flex flex-wrap gap-2.5">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isTestingRbac}
                  onClick={() => handleTestRbac('admin')}
                  className="border-mahogany-red/40 text-strawberry-red hover:bg-dark-garnet/20"
                >
                  Test ADMIN Barrier (/api/v1/auth/test/admin)
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isTestingRbac}
                  onClick={() => handleTestRbac('trainer')}
                  className="border-amber-700/40 text-amber-400 hover:bg-amber-950/20"
                >
                  Test TRAINER Barrier (/api/v1/auth/test/trainer)
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isTestingRbac}
                  onClick={() => handleTestRbac('trainee')}
                  className="border-sky-700/40 text-sky-400 hover:bg-sky-950/20"
                >
                  Test TRAINEE Barrier (/api/v1/auth/test/trainee)
                </Button>
              </div>

              {rbacTestResult && (
                <div
                  className={`p-3.5 rounded-lg text-xs font-mono border flex items-start gap-2.5 ${
                    rbacTestResult.success
                      ? 'bg-emerald-950/40 border-emerald-800/50 text-emerald-300'
                      : 'bg-dark-garnet/40 border-mahogany-red/50 text-strawberry-red'
                  }`}
                >
                  {rbacTestResult.success ? (
                    <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-strawberry-red" />
                  )}
                  <div>
                    <span className="font-bold">[{rbacTestResult.roleTested}] Result:</span> {rbacTestResult.message}
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Development Stages Roadmap */}
          <StageRoadmap />

          {/* Design System Color Swatches */}
          <Card
            title={
              <div className="flex items-center gap-2">
                <Palette className="w-5 h-5 text-strawberry-red" />
                Enterprise Design Tokens &amp; Color Palette
              </div>
            }
            subtitle="The curated dark obsidian &amp; garnet design system tokens"
          >
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {COLOR_SWATCHES.map((swatch) => (
                <div
                  key={swatch.name}
                  className="p-3 rounded-lg bg-onyx dark:bg-[#0b090a] light:bg-gray-100 border border-silver/15 dark:border-white/10 light:border-gray-200 text-xs space-y-2"
                >
                  <div className={`h-8 rounded w-full ${swatch.bgClass} border border-white/10`} />
                  <div>
                    <div className="font-bold text-white dark:text-white light:text-gray-900">{swatch.name}</div>
                    <div className="text-[10px] font-mono text-silver dark:text-silver light:text-gray-500">{swatch.hex}</div>
                    <div className="text-[10px] text-silver/70 dark:text-silver/70 light:text-gray-400 mt-1 line-clamp-1">{swatch.role}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
