'use client';

import React, { useState, useEffect } from 'react';
import {
  SessionRequest,
  getMySessionsApi,
  getTrainerSessionsApi,
  acceptSessionApi,
  declineSessionApi,
  completeSessionApi,
  cancelSessionApi,
} from '../../lib/trainerMatching';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import {
  Calendar,
  Clock,
  User,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Ban,
  Check,
  RefreshCw,
  FileText,
} from 'lucide-react';

interface TrainerSessionManagerProps {
  role?: 'TRAINEE' | 'TRAINER';
}

export const TrainerSessionManager: React.FC<TrainerSessionManagerProps> = ({
  role = 'TRAINEE',
}) => {
  const [sessions, setSessions] = useState<SessionRequest[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const loadSessions = async () => {
    try {
      setIsLoading(true);
      setErrorMsg(null);
      const data =
        role === 'TRAINER' ? await getTrainerSessionsApi() : await getMySessionsApi();
      setSessions(data);
    } catch (err: any) {
      console.error('Failed to fetch session requests:', err);
      setErrorMsg(err?.response?.data?.error?.message || 'Failed to load session requests');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, [role]);

  const handleAction = async (
    sessionId: string,
    action: 'accept' | 'decline' | 'complete' | 'cancel'
  ) => {
    try {
      setActionId(sessionId);
      setErrorMsg(null);

      if (action === 'accept') {
        await acceptSessionApi(sessionId);
        setSuccessMsg('Session request accepted!');
      } else if (action === 'decline') {
        await declineSessionApi(sessionId);
        setSuccessMsg('Session request declined.');
      } else if (action === 'complete') {
        await completeSessionApi(sessionId);
        setSuccessMsg('Session marked as completed!');
      } else if (action === 'cancel') {
        await cancelSessionApi(sessionId);
        setSuccessMsg('Session request cancelled.');
      }

      await loadSessions();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error(`Failed to ${action} session:`, err);
      setErrorMsg(err?.response?.data?.error?.message || `Failed to ${action} session`);
    } finally {
      setActionId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="warning">PENDING</Badge>;
      case 'ACCEPTED':
        return <Badge variant="info">ACCEPTED</Badge>;
      case 'DECLINED':
        return <Badge variant="danger">DECLINED</Badge>;
      case 'COMPLETED':
        return <Badge variant="success">COMPLETED</Badge>;
      case 'CANCELLED':
        return <Badge variant="neutral">CANCELLED</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  const filteredSessions = sessions.filter(
    (s) => statusFilter === 'ALL' || s.status === statusFilter
  );

  return (
    <div className="space-y-6">
      {/* Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
            Filter Status:
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="p-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">PENDING</option>
            <option value="ACCEPTED">ACCEPTED</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="DECLINED">DECLINED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={loadSessions}
          disabled={isLoading}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Requests
        </Button>
      </div>

      {/* Messages */}
      {errorMsg && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 text-red-700 dark:text-red-300 rounded text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 text-emerald-700 dark:text-emerald-300 rounded text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-4 animate-pulse h-20 bg-slate-100 dark:bg-slate-800">
              <div />
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredSessions.length === 0 && (
        <Card className="p-8 text-center border-dashed">
          <Calendar className="w-10 h-10 text-slate-400 mx-auto mb-2" />
          <h4 className="text-base font-semibold text-slate-700 dark:text-slate-300">
            No Session Requests Found
          </h4>
          <p className="text-xs text-slate-500 mt-1">
            {role === 'TRAINER'
              ? 'You have received no session requests yet.'
              : 'You have not submitted any mentorship session requests yet.'}
          </p>
        </Card>
      )}

      {/* Session Cards */}
      {!isLoading && filteredSessions.length > 0 && (
        <div className="space-y-4">
          {filteredSessions.map((session) => {
            const isTerminal = ['DECLINED', 'COMPLETED', 'CANCELLED'].includes(session.status);

            return (
              <Card
                key={session.id}
                className="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 border border-slate-200 dark:border-slate-800 hover:border-slate-300 transition-colors"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h4 className="text-base font-bold text-slate-900 dark:text-white">
                      {session.topic}
                    </h4>
                    {getStatusBadge(session.status)}
                    {session.competency_name && (
                      <Badge variant="info" size="sm">
                        {session.competency_name} ({session.competency_code})
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-indigo-500" />
                      <span>
                        Trainer: <strong className="text-slate-800 dark:text-slate-200">{session.trainer_name}</strong>
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-emerald-500" />
                      <span>
                        Trainee: <strong className="text-slate-800 dark:text-slate-200">{session.trainee_name}</strong>
                      </span>
                    </div>
                    {session.requested_slot && (
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                        <span>
                          Slot: {new Date(session.requested_slot).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>

                  {session.notes && (
                    <div className="p-2 bg-slate-50 dark:bg-slate-900/50 rounded border border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 flex items-start gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                      <span>{session.notes}</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                {!isTerminal && (
                  <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
                    {/* Trainer Actions */}
                    {role === 'TRAINER' && session.status === 'PENDING' && (
                      <>
                        <Button
                          variant="primary"
                          size="sm"
                          disabled={actionId === session.id}
                          onClick={() => handleAction(session.id, 'accept')}
                          className="flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" /> Accept
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          disabled={actionId === session.id}
                          onClick={() => handleAction(session.id, 'decline')}
                          className="flex items-center gap-1"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Decline
                        </Button>
                      </>
                    )}

                    {role === 'TRAINER' && session.status === 'ACCEPTED' && (
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={actionId === session.id}
                        onClick={() => handleAction(session.id, 'complete')}
                        className="flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Complete
                      </Button>
                    )}

                    {/* Trainee / Trainer Cancel Action */}
                    {(session.status === 'PENDING' || session.status === 'ACCEPTED') && (
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={actionId === session.id}
                        onClick={() => handleAction(session.id, 'cancel')}
                        className="flex items-center gap-1 text-red-600 hover:text-red-700"
                      >
                        <Ban className="w-3.5 h-3.5" /> Cancel
                      </Button>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
