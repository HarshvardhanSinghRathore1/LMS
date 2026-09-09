'use client';

import React, { useState } from 'react';
import { verifyCertificatePublicApi, PublicVerificationData } from '../../lib/certificates';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { CertificateViewer } from './CertificateViewer';
import { ShieldCheck, Search, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';

interface CertificateVerificationWidgetProps {
  initialCode?: string;
}

export const CertificateVerificationWidget: React.FC<CertificateVerificationWidgetProps> = ({
  initialCode = '',
}) => {
  const [code, setCode] = useState<string>(initialCode);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [result, setResult] = useState<PublicVerificationData | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      setErrorMsg('Please enter a certificate code');
      return;
    }

    try {
      setIsVerifying(true);
      setErrorMsg(null);
      setResult(null);

      const data = await verifyCertificatePublicApi(code.trim());
      if (data.valid && data.certificate) {
        setResult(data);
      } else {
        setErrorMsg('Certificate code is invalid, unverified, or does not exist');
      }
    } catch (err: any) {
      setErrorMsg(
        err?.response?.data?.error?.message || 'Certificate code not found or invalid'
      );
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Input Card */}
      <Card className="p-6 space-y-4 border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/60 rounded-xl text-indigo-600 dark:text-indigo-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Public Credential Verification Portal
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter any Capacity Connect certificate code to verify its authenticity and SHA-256 digest
            </p>
          </div>
        </div>

        <form onSubmit={handleVerify} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. CERT-CC-2026-A7K92"
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none uppercase font-mono"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          </div>
          <Button
            type="submit"
            variant="primary"
            disabled={isVerifying}
            className="flex items-center justify-center gap-2"
          >
            {isVerifying ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" /> Verifying...
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" /> Verify Credential
              </>
            )}
          </Button>
        </form>

        {errorMsg && (
          <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </Card>

      {/* Verification Result Viewer */}
      {result && result.valid && result.certificate && (
        <div className="space-y-4">
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 rounded-xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
              <div>
                <h4 className="font-bold text-sm">AUTHENTIC CREDENTIAL VERIFIED</h4>
                <p className="text-xs text-emerald-700 dark:text-emerald-300">
                  This certificate has been recomputed and cryptographically validated against PostgreSQL state.
                </p>
              </div>
            </div>
            <Badge variant="success">VALID</Badge>
          </div>

          <CertificateViewer certificate={result.certificate} isPublic={true} />
        </div>
      )}
    </div>
  );
};

export default CertificateVerificationWidget;
