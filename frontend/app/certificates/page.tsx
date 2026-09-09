'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import {
  CertificateWithDetails,
  getMyCertificatesApi,
  issueCertificateApi,
} from '@/lib/certificates';
import { CourseEnrollment, fetchMyEnrollmentsApi } from '@/lib/enrollments';
import CertificateViewer from '@/components/certificates/CertificateViewer';
import CertificateVerificationWidget from '@/components/certificates/CertificateVerificationWidget';

export default function CertificateVaultPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [certificates, setCertificates] = useState<CertificateWithDetails[]>([]);
  const [completedEnrollments, setCompletedEnrollments] = useState<CourseEnrollment[]>([]);
  const [selectedCertificate, setSelectedCertificate] = useState<CertificateWithDetails | null>(null);
  const [issuingId, setIssuingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadVault() {
      if (!user) return;
      try {
        setLoading(true);
        setErrorMsg(null);

        // Fetch user's certificates
        const certRes = await getMyCertificatesApi();
        setCertificates(certRes || []);

        // Fetch enrollments to see if any completed course hasn't been issued a certificate yet
        if (user.role === 'TRAINEE') {
          const enrollRes = await fetchMyEnrollmentsApi();
          const completed = enrollRes.enrollments.filter(
            (e) => e.status === 'COMPLETED' || e.progress_percentage === 100
          );
          setCompletedEnrollments(completed);
        }
      } catch (err: any) {
        console.error('Vault load error:', err);
        setErrorMsg(err?.response?.data?.error?.message || 'Failed to load certificate vault');
      } finally {
        setLoading(false);
      }
    }

    loadVault();
  }, [user]);

  const handleIssueCertificate = async (enrollmentId: string) => {
    try {
      setIssuingId(enrollmentId);
      setErrorMsg(null);
      setSuccessMsg(null);

      const cert = await issueCertificateApi(enrollmentId);
      setSuccessMsg(`Certificate ${cert.certificate_code || (cert as any).certificateCode} successfully generated!`);

      // Refresh certificates
      const certRes = await getMyCertificatesApi();
      setCertificates(certRes || []);
      setSelectedCertificate(cert);
    } catch (err: any) {
      console.error('Issue error:', err);
      setErrorMsg(err?.response?.data?.error?.message || 'Failed to issue certificate. Ensure all completion criteria are met.');
    } finally {
      setIssuingId(null);
    }
  };

  const copyPublicLink = (code: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const url = `${origin}/verify-certificate/${code}`;
    navigator.clipboard.writeText(url);
    alert(`Copied public verification link to clipboard!\n${url}`);
  };

  // Find completed enrollments that don't have a certificate yet
  const unissuedEnrollments = completedEnrollments.filter(
    (e) => !certificates.some((c) => (c.enrollment_id || (c as any).enrollmentId) === e.id)
  );

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#0b090a] text-[#f5f3f4] font-sans selection:bg-[#a4161a] selection:text-white pb-16">
        {/* Navigation Header */}
        <header className="sticky top-0 z-40 bg-[#0b090a]/90 backdrop-blur-md border-b border-[#2b2d42]/60 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-[#660708] via-[#a4161a] to-[#e5383b] flex items-center justify-center font-black text-white text-lg shadow-lg shadow-[#a4161a]/30 group-hover:scale-105 transition-transform">
                CC
              </div>
              <span className="font-extrabold text-xl tracking-tight text-white group-hover:text-[#e5383b] transition-colors">
                Capacity<span className="text-[#e5383b]">Connect</span>
              </span>
            </Link>
            <span className="text-xs px-2.5 py-1 rounded-full bg-[#161a1d] text-[#b1a7a6] border border-[#2b2d42]">
              Stage 9 Engine
            </span>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/my-learning"
              className="text-sm font-medium text-[#b1a7a6] hover:text-white transition-colors"
            >
              My Learning
            </Link>
            <Link
              href="/assessments"
              className="text-sm font-medium text-[#b1a7a6] hover:text-white transition-colors"
            >
              Assessments
            </Link>
            <Link
              href="/trainer-matching"
              className="text-sm font-medium text-[#b1a7a6] hover:text-white transition-colors"
            >
              Trainer Matching
            </Link>
            <div className="h-4 w-px bg-[#2b2d42]" />
            <div className="flex items-center gap-2 bg-[#161a1d] px-3 py-1.5 rounded-lg border border-[#2b2d42]">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-semibold text-[#f5f3f4]">{user?.name}</span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-[#660708] text-white">
                {user?.role}
              </span>
            </div>
          </div>
        </header>

        {/* Banner Section */}
        <main className="max-w-7xl mx-auto px-6 pt-8 space-y-8">
          <div className="bg-gradient-to-r from-[#161a1d] via-[#1a0f12] to-[#660708]/30 rounded-2xl p-8 border border-[#2b2d42] relative overflow-hidden shadow-2xl">
            <div className="absolute right-0 top-0 w-96 h-96 bg-[#a4161a]/10 rounded-full filter blur-3xl pointer-events-none" />
            <div className="relative z-10 space-y-3">
              <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-[#e5383b] font-bold">
                <span>Verified Credentials</span>
                <span>•</span>
                <span>Cryptographic SHA-256</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                Trainee Certificate Vault
              </h1>
              <p className="text-[#b1a7a6] max-w-2xl text-sm sm:text-base leading-relaxed">
                Access your verified course completion certificates, view historical competency snapshots, and export tamper-proof credentials with instant public verification.
              </p>
            </div>
          </div>

          {/* Feedback messages */}
          {errorMsg && (
            <div className="p-4 rounded-xl bg-[#660708]/40 border border-[#e5383b]/60 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xl">⚠️</span>
                <span className="text-sm font-medium">{errorMsg}</span>
              </div>
              <button
                onClick={() => setErrorMsg(null)}
                className="text-xs text-[#b1a7a6] hover:text-white"
              >
                Dismiss
              </button>
            </div>
          )}

          {successMsg && (
            <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-500/60 text-emerald-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xl">🎉</span>
                <span className="text-sm font-medium">{successMsg}</span>
              </div>
              <button
                onClick={() => setSuccessMsg(null)}
                className="text-xs text-emerald-400 hover:text-white"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Unissued Eligible Enrollments Section */}
          {unissuedEnrollments.length > 0 && (
            <div className="bg-[#161a1d]/80 rounded-xl p-6 border border-emerald-500/30 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-emerald-400 flex items-center gap-2">
                    <span>🎓</span> Courses Ready for Certificate Generation
                  </h3>
                  <p className="text-xs text-[#b1a7a6]">
                    You have completed all mandatory lessons and assessments for these courses. Click below to verify completion and generate your cryptographically signed certificate.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {unissuedEnrollments.map((enr) => (
                  <div
                    key={enr.id}
                    className="p-4 rounded-lg bg-[#0b090a] border border-[#2b2d42] flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-white text-sm">Course Enrollment</div>
                      <div className="text-xs text-[#b1a7a6] font-mono mt-0.5">ID: {enr.id}</div>
                      <div className="text-xs text-emerald-400 mt-1 font-semibold">
                        Progress: {enr.progress_percentage}% • Status: {enr.status}
                      </div>
                    </div>
                    <button
                      onClick={() => handleIssueCertificate(enr.id)}
                      disabled={issuingId === enr.id}
                      className="px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-[#a4161a] to-[#e5383b] hover:opacity-90 rounded-lg shadow-lg transition-all disabled:opacity-50"
                    >
                      {issuingId === enr.id ? 'Verifying...' : 'Claim Certificate 🏅'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Certificate List Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span>📜</span> Your Earned Certificates ({certificates.length})
              </h2>
            </div>

            {loading ? (
              <div className="p-12 text-center text-[#b1a7a6] bg-[#161a1d]/40 rounded-xl border border-[#2b2d42]">
                <div className="animate-spin w-8 h-8 border-2 border-[#e5383b] border-t-transparent rounded-full mx-auto mb-3" />
                <span>Loading certificate vault...</span>
              </div>
            ) : certificates.length === 0 ? (
              <div className="p-12 text-center bg-[#161a1d]/40 rounded-xl border border-[#2b2d42] space-y-3">
                <div className="text-4xl">🏛️</div>
                <h3 className="text-lg font-bold text-white">No certificates earned yet</h3>
                <p className="text-sm text-[#b1a7a6] max-w-md mx-auto">
                  Complete an enrolled course, complete all mandatory lessons, and achieve a passing score (≥ 70.00%) on required assessments to earn your first verified certificate.
                </p>
                <div className="pt-2">
                  <Link
                    href="/my-learning"
                    className="inline-block px-5 py-2.5 text-xs font-bold text-white bg-[#a4161a] hover:bg-[#e5383b] rounded-lg transition-colors shadow-lg"
                  >
                    Go to My Learning
                  </Link>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {certificates.map((cert) => (
                  <div
                    key={cert.id}
                    className="bg-[#161a1d] rounded-xl border border-[#2b2d42] overflow-hidden hover:border-[#a4161a]/60 transition-all flex flex-col justify-between shadow-lg group"
                  >
                    <div className="p-6 space-y-4">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-2xl">🏆</span>
                        <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded bg-[#660708]/60 text-white border border-[#a4161a]/50">
                          {cert.certificate_code || cert.certificateCode}
                        </span>
                      </div>

                      <div>
                        <h3 className="font-bold text-white text-base group-hover:text-[#e5383b] transition-colors line-clamp-1">
                          {cert.course_title || cert.courseTitle || 'Course Certificate'}
                        </h3>
                        <p className="text-xs text-[#b1a7a6] mt-0.5">
                          {cert.organization_name || cert.organizationName || 'Capacity Connect'}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#2b2d42]/60 text-xs">
                        <div>
                          <span className="text-[#b1a7a6] block text-[10px] uppercase">Final Score</span>
                          <span className="font-bold text-emerald-400 text-sm">
                            {Number(cert.final_score_percentage ?? cert.finalScorePercentage).toFixed(2)}%
                          </span>
                        </div>
                        <div>
                          <span className="text-[#b1a7a6] block text-[10px] uppercase">Issued Date</span>
                          <span className="font-medium text-[#f5f3f4]">
                            {new Date(cert.issued_at || cert.issuedAt!).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <div>
                        <span className="text-[#b1a7a6] block text-[10px] uppercase mb-1">
                          SHA-256 Digest
                        </span>
                        <span className="font-mono text-[10px] text-zinc-400 break-all bg-[#0b090a] p-1.5 rounded border border-[#2b2d42] block">
                          {(cert.verification_hash || cert.verificationHash!).substring(0, 16)}...
                          {(cert.verification_hash || cert.verificationHash!).substring(48)}
                        </span>
                      </div>
                    </div>

                    <div className="p-4 bg-[#0b090a]/60 border-t border-[#2b2d42] grid grid-cols-3 gap-2">
                      <button
                        onClick={() => setSelectedCertificate(cert)}
                        className="py-1.5 px-2 text-[11px] font-bold text-white bg-[#a4161a] hover:bg-[#e5383b] rounded transition-colors text-center"
                      >
                        View 📜
                      </button>
                      <Link
                        href={`/verify-certificate/${cert.certificate_code || cert.certificateCode}`}
                        target="_blank"
                        className="py-1.5 px-2 text-[11px] font-bold text-[#f5f3f4] bg-[#2b2d42] hover:bg-[#3b3e56] rounded transition-colors text-center"
                      >
                        Public 🌐
                      </Link>
                      <button
                        onClick={() => copyPublicLink(cert.certificate_code || cert.certificateCode!)}
                        className="py-1.5 px-2 text-[11px] font-bold text-[#b1a7a6] hover:text-white bg-[#161a1d] border border-[#2b2d42] rounded transition-colors text-center"
                      >
                        Copy 🔗
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Verification Widget Section */}
          <div className="pt-8 border-t border-[#2b2d42]">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <span>🔍</span> Verify Any Certificate
            </h2>
            <div className="max-w-xl">
              <CertificateVerificationWidget />
            </div>
          </div>
        </main>

        {/* Modal for viewing details */}
        {selectedCertificate && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-[#0b090a] border border-[#2b2d42] rounded-2xl p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-[#2b2d42] pb-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📜</span>
                  <div>
                    <h3 className="text-lg font-bold text-white">Certificate Viewer</h3>
                    <p className="text-xs text-[#b1a7a6]">
                      Issued: {new Date(selectedCertificate.issued_at || selectedCertificate.issuedAt!).toLocaleString()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedCertificate(null)}
                  className="px-3 py-1.5 text-xs font-bold text-[#b1a7a6] hover:text-white bg-[#161a1d] rounded-lg border border-[#2b2d42]"
                >
                  ✕ Close
                </button>
              </div>

              <CertificateViewer certificate={selectedCertificate} />
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
