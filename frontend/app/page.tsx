'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchApiHealth } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { testRbacEndpoint } from '../lib/auth';
import { SystemStatusBanner } from '../components/ui/SystemStatusBanner';
import { ArchitectureGrid } from '../components/ui/ArchitectureGrid';
import { AIFoundationCard } from '../components/ui/AIFoundationCard';
import { StageRoadmap } from '../components/ui/StageRoadmap';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { StatCard } from '../components/ui/StatCard';
import {
  Database,
  Layers,
  Server,
  AlertTriangle,
  ArrowRight,
  Code,
  Palette,
  Compass,
  ShieldCheck,
  UserCheck,
  LogOut,
  LogIn,
  UserPlus,
  Lock,
  BookOpen,
  Plus,
  CheckSquare,
  Award,
  Sparkles,
  Bot,
  BarChart3,
  Bell,
  ShieldAlert,
  Brain,
} from 'lucide-react';
import { NotificationBell } from '../components/ui/NotificationBell';

const COLOR_SWATCHES = [
  { name: 'Onyx', hex: '#0b090a', role: 'Primary App Background', bgClass: 'bg-[#0b090a]' },
  { name: 'Carbon Black', hex: '#161a1d', role: 'Secondary Surfaces & Cards', bgClass: 'bg-[#161a1d]' },
  { name: 'Dark Garnet', hex: '#660708', role: 'Deep Accent & Visual Depth', bgClass: 'bg-[#660708]' },
  { name: 'Mahogany Red', hex: '#a4161a', role: 'Primary Brand & CTA Buttons', bgClass: 'bg-[#a4161a]' },
  { name: 'Mahogany Red 2', hex: '#ba181b', role: 'Active Navigation & Selected States', bgClass: 'bg-[#ba181b]' },
  { name: 'Strawberry Red', hex: '#e5383b', role: 'Alerts, Progress & Highlights', bgClass: 'bg-[#e5383b]' },
  { name: 'Silver', hex: '#b1a7a6', role: 'Secondary Text & Icons', bgClass: 'bg-[#b1a7a6]' },
  { name: 'Dust Grey', hex: '#d3d3d3', role: 'Secondary UI & Borders', bgClass: 'bg-[#d3d3d3]' },
  { name: 'White Smoke', hex: '#f5f3f4', role: 'Light Content Surface', bgClass: 'bg-[#f5f3f4]' },
  { name: 'White', hex: '#ffffff', role: 'Primary Headings & Key Data', bgClass: 'bg-[#ffffff]' },
];

export default function DashboardPage() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();

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
    const interval = setInterval(checkHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleTestRbac = async (role: 'admin' | 'trainer' | 'trainee') => {
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
    }
  };

  const isManagementAllowed = user?.role === 'ADMIN' || user?.role === 'TRAINER';

  return (
    <main className="min-h-screen bg-onyx text-white p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* SECTION 1 — Application Name & Vision */}
      <header className="border-b border-silver/15 pb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="brand" size="md">SIH 2026 — PS 26075</Badge>
              <Badge variant="neutral" size="md">THEME: SMART EDUCATION</Badge>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight flex items-center gap-3">
              CAPACITY CONNECT
            </h1>
            <p className="text-sm md:text-base text-silver mt-1 font-medium">
              Digital Capacity Building & AI-Powered Learning Management Platform
            </p>
          </div>
          <div className="flex items-center gap-4">
            <NotificationBell />
            <div className="text-right flex flex-col items-end gap-1">
              <span className="text-xs font-mono text-silver">Current Stage</span>
              <Badge variant="brand" size="md">STAGE 11 — NOTIFICATIONS &amp; ENTERPRISE AUDIT</Badge>
            </div>
          </div>
        </div>

        {/* Continuous Competency Cycle Diagram */}
        <div className="mt-6 p-4 bg-carbon-black rounded-lg border border-silver/15">
          <span className="text-xs font-bold text-silver uppercase tracking-wider block mb-2">
            Continuous Competency Development Loop (Core Vision)
          </span>
          <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-xs text-silver">
            <span className="px-2.5 py-1 bg-dark-garnet/50 border border-mahogany-red rounded text-white font-semibold">LEARN</span>
            <ArrowRight className="w-3.5 h-3.5 text-strawberry-red shrink-0" />
            <span className="px-2.5 py-1 bg-dark-garnet/50 border border-mahogany-red rounded text-white font-semibold">ASSESS</span>
            <ArrowRight className="w-3.5 h-3.5 text-strawberry-red shrink-0" />
            <span className="px-2.5 py-1 bg-dark-garnet/50 border border-mahogany-red rounded text-white font-semibold">MEASURE COMPETENCY</span>
            <ArrowRight className="w-3.5 h-3.5 text-strawberry-red shrink-0" />
            <span className="px-2.5 py-1 bg-dark-garnet/50 border border-mahogany-red rounded text-white font-semibold">IDENTIFY SKILL GAP</span>
            <ArrowRight className="w-3.5 h-3.5 text-strawberry-red shrink-0" />
            <span className="px-2.5 py-1 bg-dark-garnet/50 border border-mahogany-red rounded text-white font-semibold">RECOMMEND LEARNING</span>
            <ArrowRight className="w-3.5 h-3.5 text-strawberry-red shrink-0" />
            <span className="px-2.5 py-1 bg-dark-garnet/50 border border-mahogany-red rounded text-white font-semibold">CONNECT WITH TRAINER</span>
          </div>
        </div>
      </header>

      {/* STAGE 4 — ASSESSMENT ENGINE QUICK ACCESS CARD */}
      <section>
        <Card
          title="Stage 4 — Assessment Engine & Automated Grading Control Hub"
          subtitle="Multi-tenant assessment creation, MCQ & True/False questions, secure timed attempts, and server-side automated grading"
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 bg-onyx rounded-lg border border-neutral-800">
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-[var(--strawberry-red)]" />
                Assessment Engine & Result Center
              </h4>
              <p className="text-xs text-neutral-400">
                Take published assessments for enrolled courses, manage tests and questions (Trainers/Admins), and monitor organization metrics.
              </p>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <Link
                href="/assessments"
                className="flex-1 md:flex-initial px-5 py-2.5 bg-gradient-to-r from-[#660708] via-[#a4161a] to-[#e5383b] hover:brightness-110 text-white text-xs font-bold rounded-lg transition-all shadow-lg flex items-center justify-center gap-2"
              >
                <CheckSquare className="w-4 h-4" />
                <span>Assessments Hub</span>
              </Link>
            </div>
          </div>
        </Card>
      </section>

      {/* STAGE 3 — MY LEARNING & PROGRESS QUICK ACCESS CARD */}
      <section>
        <Card
          title="Stage 3 — Trainee Enrollment & Progress Control Hub"
          subtitle="Course enrollment lifecycle, real-time lesson progress engine, and organization learning metrics"
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 bg-onyx rounded-lg border border-neutral-800">
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[var(--strawberry-red)]" />
                Trainee Learning Workspace & Completion Engine
              </h4>
              <p className="text-xs text-neutral-400">
                Enroll in published courses, track completed lessons, monitor course progress percentage, and view organizational stats.
              </p>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <Link
                href="/my-learning"
                className="flex-1 md:flex-initial px-5 py-2.5 bg-gradient-to-r from-[#660708] via-[#a4161a] to-[#e5383b] hover:brightness-110 text-white text-xs font-bold rounded-lg transition-all shadow-lg flex items-center justify-center gap-2"
              >
                <BookOpen className="w-4 h-4" />
                <span>My Learning Dashboard</span>
              </Link>
            </div>
          </div>
        </Card>
      </section>

      {/* STAGE 2 — COURSE MANAGEMENT QUICK ACCESS CARD */}
      <section>
        <Card
          title="Stage 2 — Course Management Control Hub"
          subtitle="Multi-tenant structured course curriculum, modules, lessons, and AI RAG vector publishing"
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 bg-onyx rounded-lg border border-neutral-800">
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[var(--strawberry-red)]" />
                Organizational Course Catalog & Curriculum Builder
              </h4>
              <p className="text-xs text-neutral-400">
                Browse published course offerings, structured modules, and Markdown/video lessons scoped to your tenant.
              </p>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <Link
                href="/courses"
                className="flex-1 md:flex-initial px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Open Catalog</span>
              </Link>

              {isManagementAllowed && (
                <Link
                  href="/courses/create"
                  className="flex-1 md:flex-initial px-4 py-2 bg-[var(--mahogany-red)] hover:bg-[var(--strawberry-red)] text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Build Course</span>
                </Link>
              )}
            </div>
          </div>
        </Card>
      </section>

      {/* STAGE 5 — COMPETENCY ENGINE QUICK ACCESS CARD */}
      <section>
        <Card
          title="Stage 5 — Competency Engine & Skill Gap Analysis"
          subtitle="Multi-tenant competency catalog, 70% assessment + 30% progress weighted evaluations, and skill gap matrix"
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 bg-onyx rounded-lg border border-neutral-800">
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Award className="w-4 h-4 text-[var(--strawberry-red)]" />
                Competency Hub & Organization Skill Gap Matrix
              </h4>
              <p className="text-xs text-neutral-400">
                Manage competencies, map courses with custom weights, view real-time proficiency scores (0–100%), and analyze remaining skill gaps.
              </p>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <Link
                href="/competencies"
                className="flex-1 md:flex-initial px-5 py-2.5 bg-gradient-to-r from-[#660708] via-[#a4161a] to-[#e5383b] hover:brightness-110 text-white text-xs font-bold rounded-lg transition-all shadow-lg flex items-center justify-center gap-2"
              >
                <Award className="w-4 h-4" />
                <span>Competency Workspace</span>
              </Link>
            </div>
          </div>
        </Card>
      </section>

      {/* STAGE 6 — AI FEATURES QUICK ACCESS CARD */}
      <section>
        <Card
          title="Stage 6 — AI-Assisted Content Generation &amp; Course-Aware AI Tutor"
          subtitle="AI study notes, MCQ generation with trainer review workflow, and course-scoped RAG AI tutor"
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 bg-onyx rounded-lg border border-purple-900/40">
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Bot className="w-4 h-4 text-purple-400" />
                AI Workspace, Content Generator &amp; AI Tutor
              </h4>
              <p className="text-xs text-neutral-400">
                Admins &amp; Trainers can generate AI study notes and MCQs for review. Trainees get a course-aware AI Tutor grounded in actual lesson content via RAG.
              </p>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <Link
                href="/ai-tools"
                className="flex-1 md:flex-initial px-5 py-2.5 bg-gradient-to-r from-purple-950 to-violet-800 hover:brightness-110 text-white text-xs font-bold rounded-lg transition-all shadow-lg flex items-center justify-center gap-2 border border-purple-700/50"
              >
                <Sparkles className="w-4 h-4" />
                <span>Open AI Workspace</span>
              </Link>
            </div>
          </div>
        </Card>
      </section>

      {/* STAGE 7 — PERSONALIZED RECOMMENDATIONS QUICK ACCESS CARD */}
      <section>
        <Card
          title="Stage 7 — Personalized Recommendations &amp; Adaptive Learning Path Engine"
          subtitle="Deterministic PostgreSQL 60% Skill Gap + 25% Competency Mapping + 15% Completion Rate recommendation model"
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 bg-onyx rounded-lg border border-red-900/40">
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[var(--strawberry-red)]" />
                Recommendations &amp; Adaptive Pathway Hub
              </h4>
              <p className="text-xs text-neutral-400">
                Trainees receive explainable course suggestions targeting verified competency gaps and an adaptive step-by-step learning pathway.
              </p>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <Link
                href="/recommendations"
                className="flex-1 md:flex-initial px-5 py-2.5 bg-gradient-to-r from-[#660708] via-[#a4161a] to-[#e5383b] hover:brightness-110 text-white text-xs font-bold rounded-lg transition-all shadow-lg flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>Recommendations Workspace</span>
              </Link>
            </div>
          </div>
        </Card>
      </section>

      {/* STAGE 8 — INTELLIGENT TRAINER MATCHING QUICK ACCESS CARD */}
      <section>
        <Card
          title="Stage 8 — Intelligent Trainer Matching Engine"
          subtitle="Deterministic PostgreSQL 40% Skill Gap + 25% Rating + 20% Experience + 15% Capacity matching engine & 1-on-1 session requests"
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 bg-onyx rounded-lg border border-indigo-900/40">
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-indigo-400" />
                Smart Trainer Matching &amp; Session Management Hub
              </h4>
              <p className="text-xs text-neutral-400">
                Connect trainees with verified trainers in the same organization using explainable 4-factor scoring and transactional row-locking session requests.
              </p>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <Link
                href="/trainer-matching"
                className="flex-1 md:flex-initial px-5 py-2.5 bg-gradient-to-r from-indigo-900 via-indigo-700 to-purple-800 hover:brightness-110 text-white text-xs font-bold rounded-lg transition-all shadow-lg flex items-center justify-center gap-2 border border-indigo-500/30"
              >
                <UserCheck className="w-4 h-4" />
                <span>Trainer Matching Hub</span>
              </Link>
            </div>
          </div>
        </Card>
      </section>

      {/* STAGE 9 — VERIFIED CERTIFICATES QUICK ACCESS CARD */}
      <section>
        <Card
          title="Stage 9 — Course Completion Verification & Verified Certificate Generation Engine"
          subtitle="100% deterministic course completion verification, transaction-safe issuance, SHA-256 tamper-proof hash, and unauthenticated public credential verification"
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 bg-onyx rounded-lg border border-emerald-900/40">
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-400" />
                Verified Certificate Vault &amp; Cryptographic Verification
              </h4>
              <p className="text-xs text-neutral-400">
                Trainees can claim tamper-proof certificates upon 100% course &amp; lesson completion + passing all published assessments (≥70%). Public verification available without authentication.
              </p>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <Link
                href="/certificates"
                className="flex-1 md:flex-initial px-5 py-2.5 bg-gradient-to-r from-emerald-900 via-teal-800 to-emerald-600 hover:brightness-110 text-white text-xs font-bold rounded-lg transition-all shadow-lg flex items-center justify-center gap-2 border border-emerald-500/30"
              >
                <Award className="w-4 h-4" />
                <span>Certificate Vault</span>
              </Link>
            </div>
          </div>
        </Card>
      </section>

      {/* STAGE 10 — ORGANIZATION-WIDE ANALYTICS & EXECUTIVE DASHBOARD */}
      <section>
        <Card
          title="Stage 10 — Organization-Wide Analytics & Executive Dashboard"
          subtitle="Deterministic PostgreSQL analytics, enrollment funnels, assessment pass rates, competency coverage, and leaderboards"
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 bg-onyx rounded-lg border border-sky-900/40">
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-sky-400" />
                Executive KPIs, Skill Heatmap & Leaderboard Hub
              </h4>
              <p className="text-xs text-neutral-400">
                Admins and Trainers get real-time organizational funnel metrics, skill gap distributions, and course leaderboards. Trainees view personal progress stats.
              </p>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <Link
                href="/analytics"
                className="flex-1 md:flex-initial px-5 py-2.5 bg-gradient-to-r from-sky-900 via-blue-800 to-indigo-700 hover:brightness-110 text-white text-xs font-bold rounded-lg transition-all shadow-lg flex items-center justify-center gap-2 border border-sky-500/30"
              >
                <BarChart3 className="w-4 h-4" />
                <span>Analytics Dashboard</span>
              </Link>
            </div>
          </div>
        </Card>
      </section>

      {/* STAGE 11 — NOTIFICATIONS & ENTERPRISE AUDIT TRAIL */}
      <section>
        <Card
          title="Stage 11 — Notifications & Enterprise Audit Trail Engine"
          subtitle="Event-driven in-app notifications, unread counters, and immutable organization-scoped audit logging for compliance"
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 bg-onyx rounded-lg border border-amber-900/40">
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-400" />
                Notification Center & Enterprise Audit Explorer
              </h4>
              <p className="text-xs text-neutral-400">
                Manage personal activity notifications and achievements. Administrators can explore immutable audit logs and export compliance records.
              </p>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <Link
                href="/notifications"
                className="flex-1 md:flex-initial px-4 py-2.5 bg-carbon-black hover:bg-white/10 text-white text-xs font-bold rounded-lg transition-all border border-white/10 flex items-center justify-center gap-2"
              >
                <Bell className="w-4 h-4 text-amber-400" />
                <span>Notifications</span>
              </Link>
              {user?.role === 'ADMIN' && (
                <Link
                  href="/admin/audit"
                  className="flex-1 md:flex-initial px-4 py-2.5 bg-gradient-to-r from-amber-900 via-red-800 to-mahogany-red hover:brightness-110 text-white text-xs font-bold rounded-lg transition-all shadow-lg flex items-center justify-center gap-2 border border-amber-500/30"
                >
                  <ShieldAlert className="w-4 h-4 text-white" />
                  <span>Audit Explorer</span>
                </Link>
              )}
            </div>
          </div>
        </Card>
      </section>

      {/* STAGE 12 — ADVANCED RAG & PERSISTENT LEARNER CONTEXT */}
      <section>
        <Card
          title="Stage 12 — Advanced RAG & Persistent Learner Context Engine"
          subtitle="Multi-stream context fusion: pgvector 384d semantic search, persistent temporal learner context facts, and citation-backed grounded answers"
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 bg-onyx rounded-lg border border-indigo-900/40">
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Brain className="w-4 h-4 text-indigo-400" />
                Contextual AI Learning Assistant &amp; Learner Context Hub
              </h4>
              <p className="text-xs text-neutral-400">
                Ask course questions grounded in verified documents with zero hallucinations. Includes automated struggle-concept tracking and multi-stream fusion.
              </p>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <Link
                href="/my-learning/assistant"
                className="flex-1 md:flex-initial px-5 py-2.5 bg-gradient-to-r from-indigo-900 via-purple-800 to-violet-700 hover:brightness-110 text-white text-xs font-bold rounded-lg transition-all shadow-lg flex items-center justify-center gap-2 border border-indigo-500/30"
              >
                <Bot className="w-4 h-4" />
                <span>AI Learning Assistant</span>
              </Link>
            </div>
          </div>
        </Card>
      </section>

      <section>
        <Card
          title="Stage 1 — Authentication & Authorization Control Center"
          subtitle="JWT access tokens, HttpOnly refresh token rotation, multi-tenant isolation, and RBAC authorization"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: User Session Box */}
            <div className="bg-onyx p-5 rounded-lg border border-neutral-800 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-silver uppercase tracking-wider flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-[var(--strawberry-red)]" />
                  Current User Session
                </h4>
                {isLoading ? (
                  <span className="text-xs text-amber-400 font-mono">Checking session...</span>
                ) : isAuthenticated ? (
                  <span className="text-xs bg-emerald-950 border border-emerald-800 text-emerald-400 px-2 py-0.5 rounded font-mono font-semibold">
                    AUTHENTICATED
                  </span>
                ) : (
                  <span className="text-xs bg-neutral-800 text-neutral-400 px-2 py-0.5 rounded font-mono font-semibold">
                    UNAUTHENTICATED
                  </span>
                )}
              </div>

              {isAuthenticated && user ? (
                <div className="space-y-2 text-xs font-mono bg-carbon-black p-4 rounded border border-neutral-800">
                  <div className="flex justify-between">
                    <span className="text-neutral-400">User ID:</span>
                    <span className="text-white truncate max-w-[200px]">{user.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Name:</span>
                    <span className="text-white font-bold">{user.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Email:</span>
                    <span className="text-white">{user.email}</span>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-neutral-800">
                    <span className="text-neutral-400">Assigned Role:</span>
                    <span className="px-2 py-0.5 bg-red-950 border border-red-800 text-[var(--strawberry-red)] rounded font-extrabold">
                      {user.role}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Tenant Org ID:</span>
                    <span className="text-emerald-400 font-semibold">{user.organizationId}</span>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-carbon-black rounded border border-neutral-800 text-center space-y-2">
                  <p className="text-xs text-neutral-400">
                    No active JWT session found. Sign in or register to test RBAC and tenant-scoped operations.
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                {isAuthenticated ? (
                  <button
                    onClick={() => logout()}
                    className="flex-1 py-2 bg-red-950/80 hover:bg-red-900 border border-red-800 text-red-200 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign Out
                  </button>
                ) : (
                  <>
                    <Link
                      href="/login"
                      className="flex-1 py-2 bg-[var(--mahogany-red)] hover:bg-[var(--strawberry-red)] text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5"
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      Sign In
                    </Link>
                    <Link
                      href="/register"
                      className="flex-1 py-2 bg-carbon-black hover:bg-neutral-800 border border-neutral-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      Register Trainee
                    </Link>
                  </>
                )}
              </div>
            </div>

            {/* Right: RBAC Interactive Testing Box */}
            <div className="bg-onyx p-5 rounded-lg border border-neutral-800 space-y-4">
              <h4 className="text-xs font-bold text-silver uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[var(--strawberry-red)]" />
                Live Role-Based Access Control (RBAC) Tester
              </h4>

              <p className="text-xs text-neutral-400">
                Trigger protected test endpoints to verify permission middleware enforcement:
              </p>

              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleTestRbac('admin')}
                  className="py-2 px-3 bg-carbon-black hover:bg-neutral-800 border border-neutral-700 rounded-lg text-xs font-mono font-semibold text-red-400 flex items-center justify-center gap-1"
                >
                  <Lock className="w-3 h-3" />
                  ADMIN
                </button>
                <button
                  onClick={() => handleTestRbac('trainer')}
                  className="py-2 px-3 bg-carbon-black hover:bg-neutral-800 border border-neutral-700 rounded-lg text-xs font-mono font-semibold text-amber-400 flex items-center justify-center gap-1"
                >
                  <Lock className="w-3 h-3" />
                  TRAINER
                </button>
                <button
                  onClick={() => handleTestRbac('trainee')}
                  className="py-2 px-3 bg-carbon-black hover:bg-neutral-800 border border-neutral-700 rounded-lg text-xs font-mono font-semibold text-blue-400 flex items-center justify-center gap-1"
                >
                  <Lock className="w-3 h-3" />
                  TRAINEE
                </button>
              </div>

              {/* RBAC Test Output Display */}
              {rbacTestResult && (
                <div
                  className={`p-4 rounded-lg border text-xs font-mono space-y-1 ${
                    rbacTestResult.success
                      ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                      : rbacTestResult.status === 403
                      ? 'bg-amber-950/40 border-amber-800 text-amber-300'
                      : 'bg-red-950/40 border-red-800 text-red-300'
                  }`}
                >
                  <div className="flex justify-between font-bold border-b border-white/10 pb-1 mb-1">
                    <span>TEST ENDPOINT: GET /api/v1/auth/test/{rbacTestResult.roleTested.toLowerCase()}</span>
                    <span>STATUS: {rbacTestResult.status}</span>
                  </div>
                  <div>Result: {rbacTestResult.message}</div>
                </div>
              )}
            </div>
          </div>
        </Card>
      </section>

      {/* SECTION 2, 3, 4 — System Status & Live Health Indicators */}
      <section className="space-y-4">
        <SystemStatusBanner
          apiStatus={healthState.apiStatus}
          dbStatus={healthState.dbStatus}
          latencyMs={healthState.latencyMs}
          requestId={healthState.requestId}
          onRefresh={checkHealth}
        />

        {healthState.errorMsg && (
          <div className="p-3.5 bg-dark-garnet/40 border border-strawberry-red/50 rounded-lg text-xs text-strawberry-red flex items-center justify-between">
            <span className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {healthState.errorMsg}
            </span>
            <span className="text-[11px] text-silver font-mono">
              (Ensure backend is running on http://localhost:5000 and PostgreSQL credentials match .env)
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Current Stage"
            value="Stage 5"
            subtext="Competency Engine"
            status="neutral"
            icon={<Compass className="w-5 h-5" />}
          />
          <StatCard
            label="REST API Status"
            value={healthState.apiStatus === 'loading' ? 'CHECKING...' : healthState.apiStatus.toUpperCase()}
            subtext="Endpoint: /api/v1/health"
            status={healthState.apiStatus === 'healthy' ? 'success' : healthState.apiStatus === 'loading' ? 'warning' : 'danger'}
            icon={<Server className="w-5 h-5" />}
          />
          <StatCard
            label="PostgreSQL Database"
            value={healthState.dbStatus === 'loading' ? 'CHECKING...' : healthState.dbStatus.toUpperCase()}
            subtext="007_competency_engine.sql Applied"
            status={healthState.dbStatus === 'connected' ? 'success' : healthState.dbStatus === 'loading' ? 'warning' : 'danger'}
            icon={<Database className="w-5 h-5" />}
          />
          <StatCard
            label="Architecture Mode"
            value="Modular Monolith"
            subtext="Competencies + Gaps + 70/30 Engine"
            status="neutral"
            icon={<Layers className="w-5 h-5" />}
          />
        </div>
      </section>

      {/* STAGE 0.5 — AI & RAG Foundation Status */}
      <section>
        <AIFoundationCard />
      </section>

      {/* SECTION 5 — System Architecture Visualization */}
      <section>
        <ArchitectureGrid />
      </section>

      {/* SECTION 6 — Design System Token Showcase */}
      <section>
        <Card
          title="Enterprise Design System & Token Showcase"
          subtitle="Mandatory dark color palette tokens and Inter typography hierarchy"
        >
          <div className="space-y-6">
            <div>
              <h4 className="text-xs font-bold text-silver uppercase tracking-wider mb-3 flex items-center gap-2">
                <Palette className="w-4 h-4 text-strawberry-red" />
                Color Palette Swatches
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {COLOR_SWATCHES.map((swatch) => (
                  <div
                    key={swatch.name}
                    className="p-3 rounded border border-silver/20 bg-onyx flex flex-col justify-between"
                  >
                    <div className={`h-12 w-full rounded mb-2 border border-silver/10 ${swatch.bgClass}`} />
                    <div>
                      <div className="text-xs font-semibold text-white truncate">{swatch.name}</div>
                      <div className="text-[11px] font-mono text-silver">{swatch.hex}</div>
                      <div className="text-[10px] text-silver/70 mt-1 line-clamp-1">{swatch.role}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-silver/10 pt-4">
              <h4 className="text-xs font-bold text-silver uppercase tracking-wider mb-3 flex items-center gap-2">
                <Code className="w-4 h-4 text-strawberry-red" />
                Typography Scale (Inter Sans-Serif)
              </h4>
              <div className="space-y-2 bg-onyx p-4 rounded border border-silver/10">
                <div className="text-2xl font-extrabold text-white">Display Heading (24px Extrabold)</div>
                <div className="text-xl font-bold text-white-smoke">H1 Heading (20px Bold)</div>
                <div className="text-lg font-semibold text-white">H2 Heading (18px Semibold)</div>
                <div className="text-base font-medium text-white-smoke">H3 Heading (16px Medium)</div>
                <div className="text-sm font-normal text-silver">Body Text (14px Normal) — Highly readable enterprise typography</div>
                <div className="text-xs font-normal text-silver/80">Small Text / Metadata (12px)</div>
                <div className="text-[10px] font-mono text-silver/60">CAPTION / TRACING ID (10px Mono)</div>
              </div>
            </div>
          </div>
        </Card>
      </section>

      {/* SECTION 7 — Development Stage Roadmap */}
      <section>
        <StageRoadmap />
      </section>

      {/* Footer */}
      <footer className="border-t border-silver/15 pt-6 text-center text-xs text-silver/60 font-mono space-y-1">
        <p>CAPACITY CONNECT — SIH 2026 (PS 26075)</p>
        <p>Built with Next.js 14, Express, PostgreSQL, pgvector & LangChain</p>
      </footer>
    </main>
  );
}
