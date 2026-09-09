'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  PublicCertificateVerificationResponse,
  verifyCertificatePublicApi,
} from '@/lib/certificates';
import CertificateVerificationWidget from '@/components/certificates/CertificateVerificationWidget';

export default function PublicVerifyCertificatePage() {
  const params = useParams();
  const rawCode = params?.certificateCode;
  const certificateCode = Array.isArray(rawCode) ? rawCode[0] : rawCode || '';

  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<PublicCertificateVerificationResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function doVerify() {
      if (!certificateCode) return;
      try {
        setLoading(true);
        setErrorMsg(null);
        const res = await verifyCertificatePublicApi(certificateCode);
        setResult(res);
      } catch (err: any) {
        console.error('Public verify error:', err);
        setErrorMsg(
          err?.response?.data?.error?.message ||
            'CERTIFICATE NOT FOUND. The requested certificate code could not be verified or has been tampered with.'
        );
      } finally {
        setLoading(false);
      }
    }

    doVerify();
  }, [certificateCode]);

  return (
    <div className="min-h-screen bg-[#0b090a] text-[#f5f3f4] font-sans selection:bg-[#a4161a] selection:text-white pb-16">
      {/* Top Header Navigation (Public) */}
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
            Public Verification Engine
          </span>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-xs font-bold text-white bg-[#a4161a] hover:bg-[#e5383b] px-4 py-2 rounded-lg transition-colors shadow-lg"
          >
            Sign In ➔
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 pt-10 space-y-8">
        {loading ? (
          <div className="p-16 text-center bg-[#161a1d]/60 rounded-2xl border border-[#2b2d42] space-y-4 shadow-2xl">
            <div className="animate-spin w-10 h-10 border-3 border-[#e5383b] border-t-transparent rounded-full mx-auto" />
            <p className="text-sm font-semibold text-[#b1a7a6]">
              Querying cryptographic ledger & verifying SHA-256 signature for{' '}
              <span className="font-mono text-white">{certificateCode}</span>...
            </p>
          </div>
        ) : errorMsg || !result?.valid || !result?.certificate ? (
          <div className="bg-[#161a1d] rounded-2xl border border-[#660708] p-8 sm:p-12 text-center space-y-6 shadow-2xl relative overflow-hidden">
            <div className="w-20 h-20 bg-[#660708]/30 rounded-full flex items-center justify-center mx-auto border border-[#e5383b]/40 text-4xl">
              ❌
            </div>
            <div className="space-y-2">
              <span className="px-3 py-1 rounded-full bg-[#660708] text-[#e5383b] text-xs font-mono font-bold tracking-widest uppercase border border-[#e5383b]/30">
                VERIFICATION FAILED
              </span>
              <h1 className="text-3xl font-extrabold text-white">CERTIFICATE NOT FOUND</h1>
              <p className="text-sm text-[#b1a7a6] max-w-lg mx-auto leading-relaxed">
                The requested certificate code <span className="font-mono font-bold text-white">{certificateCode}</span> is either invalid, expired, or has failed cryptographic verification.
              </p>
            </div>

            <div className="pt-4 max-w-md mx-auto">
              <CertificateVerificationWidget />
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Authenticity Banner */}
            <div className="bg-gradient-to-r from-emerald-950/80 via-[#161a1d] to-emerald-950/80 rounded-2xl p-6 sm:p-8 border border-emerald-500/40 shadow-2xl relative overflow-hidden flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center text-emerald-400 text-3xl shrink-0">
                  ✓
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-900/80 text-emerald-300 text-[11px] font-extrabold tracking-wider uppercase border border-emerald-500/50">
                      VERIFIED CREDENTIAL
                    </span>
                    <span className="text-xs text-emerald-400 font-semibold">• Authentic</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
                    Certificate Verified Authentic
                  </h1>
                  <p className="text-xs sm:text-sm text-[#b1a7a6] mt-0.5">
                    This certificate is officially registered on Capacity Connect cryptographic verification system.
                  </p>
                </div>
              </div>

              <div className="text-right font-mono shrink-0">
                <div className="text-[10px] uppercase text-[#b1a7a6] tracking-wider">Certificate Code</div>
                <div className="text-lg font-black text-white bg-[#0b090a] px-3.5 py-1.5 rounded-lg border border-[#2b2d42] mt-1">
                  {result.certificate.certificateCode}
                </div>
              </div>
            </div>

            {/* Main Certificate Display Card */}
            <div className="bg-[#161a1d] rounded-2xl border border-[#2b2d42] p-8 sm:p-12 space-y-8 shadow-2xl relative overflow-hidden">
              <div className="flex justify-between items-start border-b border-[#2b2d42] pb-6">
                <div>
                  <div className="text-xs font-bold text-[#e5383b] uppercase tracking-widest">
                    SIH 2026 Smart Education Platform
                  </div>
                  <h2 className="text-2xl font-black text-white mt-1">
                    {result.certificate.organizationName}
                  </h2>
                </div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#660708] to-[#e5383b] flex items-center justify-center text-white font-black text-xl shadow-lg">
                  CC
                </div>
              </div>

              {/* Trainee & Course Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="space-y-1">
                  <span className="text-xs text-[#b1a7a6] font-medium uppercase tracking-wider">
                    Awarded To
                  </span>
                  <div className="text-2xl font-extrabold text-white">
                    {result.certificate.traineeName}
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-xs text-[#b1a7a6] font-medium uppercase tracking-wider">
                    Course Title
                  </span>
                  <div className="text-2xl font-extrabold text-[#e5383b]">
                    {result.certificate.courseTitle}
                  </div>
                </div>
              </div>

              {/* Metric Highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#0b090a] p-5 rounded-xl border border-[#2b2d42]">
                <div className="flex items-center justify-between p-3 bg-[#161a1d] rounded-lg border border-[#2b2d42]">
                  <span className="text-xs text-[#b1a7a6] uppercase font-semibold">Final Score</span>
                  <span className="text-xl font-extrabold text-emerald-400">
                    {Number(result.certificate.finalScorePercentage).toFixed(2)}%
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-[#161a1d] rounded-lg border border-[#2b2d42]">
                  <span className="text-xs text-[#b1a7a6] uppercase font-semibold">Issued Date</span>
                  <span className="text-sm font-bold text-white">
                    {new Date(result.certificate.issuedAt).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              </div>

              {/* Verified Competencies */}
              {result.certificate.competenciesAchieved &&
                result.certificate.competenciesAchieved.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <h4 className="text-xs font-bold text-[#b1a7a6] uppercase tracking-wider">
                      Verified Snapshot Competencies ({result.certificate.competenciesAchieved.length})
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {result.certificate.competenciesAchieved.map((comp: any, idx: number) => (
                        <div
                          key={idx}
                          className="bg-[#2b2d42]/60 text-xs font-semibold px-3 py-1.5 rounded-lg border border-[#3b3e56] flex items-center gap-2"
                        >
                          <span className="text-emerald-400">✓</span>
                          <span className="text-white">{comp.name}</span>
                          {comp.code && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#0b090a] text-zinc-400">
                              {comp.code}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* Cryptographic Hash Verification Block */}
              <div className="space-y-2 pt-4 border-t border-[#2b2d42]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#b1a7a6] uppercase tracking-wider">
                    SHA-256 Verification Hash (Server Validated)
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/40">
                    MATCH CONFIRMED
                  </span>
                </div>
                <div className="p-3 bg-[#0b090a] font-mono text-xs text-zinc-300 rounded-xl border border-[#2b2d42] break-all select-all">
                  {result.certificate.verificationHash}
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-[#b1a7a6] pt-2">
                <span>Verification Engine: Stage 9 Standard</span>
                <span>Deterministic • Non-AI • Immutable</span>
              </div>
            </div>

            {/* Widget to test another certificate */}
            <div className="pt-4">
              <CertificateVerificationWidget />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
