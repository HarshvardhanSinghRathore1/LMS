'use client';

import React from 'react';
import { Certificate, CompetencySnapshot } from '../../lib/certificates';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import {
  Award,
  ShieldCheck,
  CheckCircle,
  Calendar,
  ExternalLink,
  Printer,
  QrCode,
  Copy,
  Check,
  Building,
} from 'lucide-react';

interface CertificateViewerProps {
  certificate: Certificate | {
    certificateCode: string;
    traineeName: string;
    courseTitle: string;
    organizationName: string;
    finalScorePercentage: number;
    competenciesAchieved: CompetencySnapshot[];
    issuedAt: string;
    verificationHash: string;
  };
  isPublic?: boolean;
}

export const CertificateViewer: React.FC<CertificateViewerProps> = ({
  certificate,
  isPublic = false,
}) => {
  const [copied, setCopied] = React.useState(false);

  const code = 'certificate_code' in certificate ? certificate.certificate_code : certificate.certificateCode;
  const traineeName = 'trainee_name' in certificate ? certificate.trainee_name : certificate.traineeName;
  const courseTitle = 'course_title' in certificate ? certificate.course_title : certificate.courseTitle;
  const orgName = 'organization_name' in certificate ? certificate.organization_name : certificate.organizationName;
  const finalScore = 'final_score_percentage' in certificate ? certificate.final_score_percentage : certificate.finalScorePercentage;
  const competencies = 'competencies_achieved' in certificate ? certificate.competencies_achieved : certificate.competenciesAchieved;
  const issuedAt = 'issued_at' in certificate ? certificate.issued_at : certificate.issuedAt;
  const hash = 'verification_hash' in certificate ? certificate.verification_hash : certificate.verificationHash;

  const publicVerifyUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/verify-certificate/${code}`
    : `/verify-certificate/${code}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicVerifyUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Print Action Bar (Hidden during print) */}
      <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-2">
          <Badge variant="success" size="sm">
            VERIFIED CREDENTIAL
          </Badge>
          <span className="text-xs text-slate-500 font-mono">
            {code}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 text-xs"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied Link!' : 'Copy Public Verification Link'}
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handlePrint}
            className="flex items-center gap-1.5 text-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            Print / Save as PDF
          </Button>
        </div>
      </div>

      {/* Main Visual Certificate Document */}
      <div className="bg-white text-slate-900 border-8 border-indigo-900 p-8 md:p-12 rounded-2xl shadow-2xl relative overflow-hidden print:p-6 print:border-4 print:shadow-none print:m-0">
        {/* Ornate Background Accents */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/60 rounded-bl-full pointer-events-none -z-0" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-50/60 rounded-tr-full pointer-events-none -z-0" />

        {/* Certificate Frame Boundary */}
        <div className="border-2 border-amber-600/40 p-6 md:p-10 rounded-xl relative z-10 space-y-8 text-center">
          {/* Top Header & Branding */}
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2 text-indigo-900 font-black tracking-widest text-xs uppercase">
              <Building className="w-4 h-4 text-indigo-700" />
              <span>{orgName || 'CAPACITY CONNECT'}</span>
              <span>•</span>
              <span>SIH 2026 SMART EDUCATION</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-black font-serif text-slate-900 tracking-tight uppercase">
              Certificate of Completion
            </h1>
            <p className="text-xs md:text-sm text-amber-800 font-semibold tracking-wider uppercase">
              Official Digital Capacity Building Credential
            </p>
          </div>

          {/* Recipient Section */}
          <div className="space-y-2 py-4">
            <p className="text-xs md:text-sm text-slate-600 italic">This is to certify that</p>
            <h2 className="text-2xl md:text-4xl font-extrabold text-indigo-950 border-b-2 border-amber-500 pb-2 inline-block px-8">
              {traineeName || 'Verified Learner'}
            </h2>
            <p className="text-xs md:text-sm text-slate-600 italic pt-2">
              has successfully fulfilled all completion criteria, completed all mandatory modules, passed all assessments with distinction, and earned the course credential for
            </p>
            <h3 className="text-xl md:text-3xl font-bold text-slate-900 pt-1">
              {courseTitle || 'Enterprise Course'}
            </h3>
          </div>

          {/* Score & Achievements */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-xl mx-auto text-left bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Final Score Achieved
              </span>
              <span className="text-2xl font-black text-indigo-900">
                {finalScore.toFixed(2)}%
              </span>
              <span className="text-[10px] text-emerald-700 font-semibold block">
                ✓ Passed Assessment Threshold (≥70.00%)
              </span>
            </div>

            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Issued Date
              </span>
              <span className="text-sm font-bold text-slate-800 flex items-center gap-1.5 mt-1">
                <Calendar className="w-4 h-4 text-indigo-600" />
                {new Date(issuedAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            </div>
          </div>

          {/* Verified Competencies */}
          {competencies && competencies.length > 0 && (
            <div className="space-y-2 text-left max-w-xl mx-auto">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Verified Competencies Achieved
              </span>
              <div className="flex flex-wrap gap-1.5">
                {competencies.map((comp) => (
                  <Badge key={comp.competencyId} variant={comp.proficiency === 'EXPERT' ? 'success' : 'info'} size="sm">
                    {comp.name} ({comp.proficiency}) — {comp.scorePercentage}%
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Bottom Security Footer */}
          <div className="pt-6 border-t border-slate-200 grid grid-cols-1 md:grid-cols-3 items-end gap-6 text-left text-xs">
            {/* Seal */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-indigo-900 flex items-center justify-center text-white shadow-md flex-shrink-0">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <div>
                <span className="font-bold text-indigo-950 block">Capacity Connect</span>
                <span className="text-[10px] text-slate-500">Cryptographically Signed</span>
              </div>
            </div>

            {/* Code */}
            <div className="text-center md:text-left">
              <span className="text-[10px] text-slate-500 uppercase block font-semibold">Certificate ID</span>
              <span className="font-mono font-bold text-indigo-900 text-sm">{code}</span>
            </div>

            {/* Verification Link / QR */}
            <div className="text-right flex items-center justify-end gap-3">
              <div className="text-right">
                <span className="text-[10px] text-slate-500 block">Public Verification</span>
                <a
                  href={publicVerifyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-semibold text-indigo-600 hover:underline flex items-center justify-end gap-1"
                >
                  Verify Authenticity <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="p-1.5 bg-slate-100 rounded border border-slate-300">
                <QrCode className="w-8 h-8 text-slate-800" />
              </div>
            </div>
          </div>

          {/* SHA-256 Hash Display */}
          <div className="pt-2 text-[10px] text-slate-400 font-mono break-all text-center border-t border-slate-100">
            SHA-256 Digest: {hash}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CertificateViewer;
