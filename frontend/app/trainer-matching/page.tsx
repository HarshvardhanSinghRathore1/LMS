'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { TrainerMatchingWidget } from '../../components/trainerMatching/TrainerMatchingWidget';
import { TrainerSessionManager } from '../../components/trainerMatching/TrainerSessionManager';
import {
  TrainerProfile,
  TrainerExpertise,
  getTrainerProfileApi,
  createTrainerProfileApi,
  updateTrainerProfileApi,
  getTrainerExpertiseApi,
  addTrainerExpertiseApi,
  removeTrainerExpertiseApi,
  ProficiencyLevel,
} from '../../lib/trainerMatching';
import {
  UserCheck,
  Calendar,
  Settings,
  Sparkles,
  Award,
  CheckCircle,
  Plus,
  Trash2,
  AlertCircle,
  Clock,
  Briefcase,
  Star,
  BookOpen,
} from 'lucide-react';
import Link from 'next/link';

export default function TrainerMatchingPage() {
  const [activeTab, setActiveTab] = useState<'MATCHES' | 'MY_SESSIONS' | 'TRAINER_PORTAL'>('MATCHES');

  // Trainer Profile State (For Trainer Self-Service)
  const [trainerProfile, setTrainerProfile] = useState<TrainerProfile | null>(null);
  const [trainerExpertise, setTrainerExpertise] = useState<TrainerExpertise[]>([]);
  const [isLoadingProfile, setIsLoadingProfile] = useState<boolean>(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form states for profile
  const [headline, setHeadline] = useState<string>('');
  const [bio, setBio] = useState<string>('');
  const [yearsExp, setYearsExp] = useState<number>(3);
  const [hourlyCapacity, setHourlyCapacity] = useState<number>(10);
  const [isAvailable, setIsAvailable] = useState<boolean>(true);
  const [isSavingProfile, setIsSavingProfile] = useState<boolean>(false);

  // Expertise Form state
  const [compCompetencyId, setCompCompetencyId] = useState<string>('');
  const [compLevel, setCompLevel] = useState<ProficiencyLevel>('ADVANCED');
  const [compYears, setCompYears] = useState<number>(2);
  const [isAddingExp, setIsAddingExp] = useState<boolean>(false);

  const loadTrainerData = async () => {
    try {
      setIsLoadingProfile(true);
      const profile = await getTrainerProfileApi();
      setTrainerProfile(profile);
      if (profile) {
        setHeadline(profile.headline || '');
        setBio(profile.bio || '');
        setYearsExp(profile.years_of_experience);
        setHourlyCapacity(profile.hourly_capacity);
        setIsAvailable(profile.is_available);

        const exp = await getTrainerExpertiseApi();
        setTrainerExpertise(exp);
      }
    } catch (err: any) {
      console.log('User is not a trainer or profile not created yet.');
    } finally {
      setIsLoadingProfile(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'TRAINER_PORTAL') {
      loadTrainerData();
    }
  }, [activeTab]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSavingProfile(true);
      setProfileMsg(null);

      if (trainerProfile) {
        const updated = await updateTrainerProfileApi({
          headline,
          bio,
          yearsOfExperience: Number(yearsExp),
          hourlyCapacity: Number(hourlyCapacity),
          isAvailable,
        });
        setTrainerProfile(updated);
        setProfileMsg({ type: 'success', text: 'Trainer profile updated successfully!' });
      } else {
        const created = await createTrainerProfileApi({
          headline,
          bio,
          yearsOfExperience: Number(yearsExp),
          hourlyCapacity: Number(hourlyCapacity),
          isAvailable,
        });
        setTrainerProfile(created);
        setProfileMsg({ type: 'success', text: 'Trainer profile created successfully!' });
      }
      await loadTrainerData();
    } catch (err: any) {
      setProfileMsg({
        type: 'error',
        text: err?.response?.data?.error?.message || 'Failed to save profile. Ensure your user account has TRAINER role.',
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleAddExpertise = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!compCompetencyId.trim()) return;

    try {
      setIsAddingExp(true);
      setProfileMsg(null);
      await addTrainerExpertiseApi({
        competencyId: compCompetencyId.trim(),
        proficiencyLevel: compLevel,
        yearsExperience: Number(compYears),
      });
      setCompCompetencyId('');
      setProfileMsg({ type: 'success', text: 'Expertise added successfully!' });
      await loadTrainerData();
    } catch (err: any) {
      setProfileMsg({
        type: 'error',
        text: err?.response?.data?.error?.message || 'Failed to add expertise.',
      });
    } finally {
      setIsAddingExp(false);
    }
  };

  const handleRemoveExpertise = async (competencyId: string) => {
    try {
      setProfileMsg(null);
      await removeTrainerExpertiseApi(competencyId);
      setProfileMsg({ type: 'success', text: 'Expertise removed.' });
      await loadTrainerData();
    } catch (err: any) {
      setProfileMsg({
        type: 'error',
        text: err?.response?.data?.error?.message || 'Failed to remove expertise.',
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-6 md:p-10 space-y-8">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="info" size="sm">
                STAGE 8 IMPLEMENTATION
              </Badge>
              <Badge variant="success" size="sm">
                100% Deterministic Engine
              </Badge>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
              <UserCheck className="w-8 h-8 text-indigo-300" />
              Intelligent Trainer Matching Engine
            </h1>
            <p className="text-sm text-indigo-200 max-w-2xl">
              Connect Trainees with verified Trainers inside the same organization using PostgreSQL 4-factor scoring: 
              <span className="font-semibold text-white"> 40% Skill Gap Fit, 25% Rating, 20% Experience, 15% Capacity</span>.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="secondary" size="sm" className="bg-white/10 hover:bg-white/20 text-white border-white/20">
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-8">
        <button
          onClick={() => setActiveTab('MATCHES')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'MATCHES'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          Find Trainers
        </button>

        <button
          onClick={() => setActiveTab('MY_SESSIONS')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'MY_SESSIONS'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Calendar className="w-4 h-4" />
          My Session Requests
        </button>

        <button
          onClick={() => setActiveTab('TRAINER_PORTAL')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'TRAINER_PORTAL'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Settings className="w-4 h-4" />
          Trainer Portal
        </button>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'MATCHES' && (
          <TrainerMatchingWidget
            onSessionCreated={() => {
              setActiveTab('MY_SESSIONS');
            }}
          />
        )}

        {activeTab === 'MY_SESSIONS' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-600" />
              Trainee Session Requests & History
            </h2>
            <TrainerSessionManager role="TRAINEE" />
          </div>
        )}

        {activeTab === 'TRAINER_PORTAL' && (
          <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Settings className="w-5 h-5 text-indigo-600" />
                  Trainer Self-Service Portal & Incoming Requests
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Manage your trainer profile, capacity, mapped competency expertise, and respond to incoming session requests.
                </p>
              </div>
            </div>

            {profileMsg && (
              <div
                className={`p-4 rounded-lg text-xs flex items-center gap-2 ${
                  profileMsg.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800'
                    : 'bg-red-50 text-red-800 border border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-800'
                }`}
              >
                {profileMsg.type === 'success' ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <AlertCircle className="w-4 h-4" />
                )}
                <span>{profileMsg.text}</span>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Profile Setup / Management */}
              <Card className="p-6 space-y-4 border border-slate-200 dark:border-slate-800">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-indigo-500" />
                  {trainerProfile ? 'Update Trainer Profile' : 'Create Trainer Profile'}
                </h3>

                <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Headline / Title
                    </label>
                    <input
                      type="text"
                      value={headline}
                      onChange={(e) => setHeadline(e.target.value)}
                      placeholder="e.g. Senior Software Architect & Database Specialist"
                      className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Bio / Summary
                    </label>
                    <textarea
                      rows={3}
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Brief overview of mentorship background and technical domain..."
                      className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Years of Experience
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={yearsExp}
                        onChange={(e) => setYearsExp(Number(e.target.value))}
                        className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Hourly Capacity limit
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={hourlyCapacity}
                        onChange={(e) => setHourlyCapacity(Number(e.target.value))}
                        className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="checkbox"
                      id="isAvailable"
                      checked={isAvailable}
                      onChange={(e) => setIsAvailable(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                    />
                    <label htmlFor="isAvailable" className="font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                      Available for new session requests
                    </label>
                  </div>

                  <div className="pt-2">
                    <Button type="submit" variant="primary" disabled={isSavingProfile} className="w-full">
                      {isSavingProfile ? 'Saving...' : trainerProfile ? 'Save Profile Changes' : 'Create Profile'}
                    </Button>
                  </div>
                </form>
              </Card>

              {/* Mapped Competency Expertise */}
              <Card className="p-6 space-y-4 border border-slate-200 dark:border-slate-800">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Award className="w-5 h-5 text-indigo-500" />
                  Competency Expertise Mapping
                </h3>

                {trainerProfile ? (
                  <div className="space-y-6">
                    {/* Add Form */}
                    <form onSubmit={handleAddExpertise} className="space-y-3 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-800 text-xs">
                      <h4 className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                        <Plus className="w-4 h-4" /> Add Competency Expertise
                      </h4>

                      <div>
                        <label className="block text-slate-600 dark:text-slate-400 mb-1">
                          Competency UUID
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Competency UUID from database"
                          value={compCompetencyId}
                          onChange={(e) => setCompCompetencyId(e.target.value)}
                          className="w-full p-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-slate-600 dark:text-slate-400 mb-1">
                            Proficiency Level
                          </label>
                          <select
                            value={compLevel}
                            onChange={(e) => setCompLevel(e.target.value as ProficiencyLevel)}
                            className="w-full p-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs outline-none"
                          >
                            <option value="ADVANCED">ADVANCED (75 pts fit)</option>
                            <option value="EXPERT">EXPERT (100 pts fit)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-slate-600 dark:text-slate-400 mb-1">
                            Years Exp in Competency
                          </label>
                          <input
                            type="number"
                            min={0}
                            value={compYears}
                            onChange={(e) => setCompYears(Number(e.target.value))}
                            className="w-full p-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs outline-none"
                          />
                        </div>
                      </div>

                      <Button type="submit" variant="secondary" size="sm" disabled={isAddingExp} className="w-full">
                        {isAddingExp ? 'Adding...' : 'Add Expertise'}
                      </Button>
                    </form>

                    {/* Mapped List */}
                    <div className="space-y-2">
                      <h4 className="font-semibold text-xs text-slate-700 dark:text-slate-300">
                        Current Expertise Mappings ({trainerExpertise.length})
                      </h4>
                      {trainerExpertise.length === 0 ? (
                        <p className="text-xs text-slate-500 italic">No competencies mapped yet.</p>
                      ) : (
                        <div className="space-y-2">
                          {trainerExpertise.map((exp) => (
                            <div
                              key={exp.id}
                              className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md flex items-center justify-between text-xs"
                            >
                              <div>
                                <span className="font-bold text-slate-900 dark:text-white block">
                                  {exp.competency_name || exp.competency_id} ({exp.competency_code || 'CODE'})
                                </span>
                                <span className="text-[11px] text-slate-500">
                                  Level: <Badge variant={exp.proficiency_level === 'EXPERT' ? 'success' : 'info'} size="sm">{exp.proficiency_level}</Badge> — {exp.years_experience} yrs
                                </span>
                              </div>
                              <button
                                onClick={() => handleRemoveExpertise(exp.competency_id)}
                                className="text-red-500 hover:text-red-700 p-1"
                                title="Remove Expertise"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">
                    Please create your trainer profile first to enable competency expertise mapping.
                  </p>
                )}
              </Card>
            </div>

            {/* Incoming Session Requests for Trainer */}
            <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-600" />
                Incoming Trainee Session Requests
              </h3>
              <TrainerSessionManager role="TRAINER" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
