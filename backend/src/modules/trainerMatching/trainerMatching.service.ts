import { TrainerMatchingRepository } from './trainerMatching.repository';
import {
  TrainerProfileRecord,
  TrainerExpertiseRecord,
  SessionRequestRecord,
  TrainerMatchResult,
  TrainerMatchFactorBreakdown,
  TraineeSkillGapRecord,
  PrimarySkillGap,
  MatchedCompetency,
  ProficiencyLevel,
  SessionStatus,
} from './trainerMatching.types';

export class TrainerMatchingService {
  constructor(private repo: TrainerMatchingRepository = new TrainerMatchingRepository()) {}

  /**
   * PURE HELPER: Calculate Skill Gap Fit (0–100)
   * ADVANCED = 75, EXPERT = 100
   * SkillGapFit = Σ(gapPercentage × expertiseStrength) / Σ(matchedGapPercentage)
   */
  calculateSkillGapFit(
    traineeSkillGaps: TraineeSkillGapRecord[],
    trainerExpertise: TrainerExpertiseRecord[]
  ): { fitScore: number; matchedCompetencies: MatchedCompetency[] } {
    if (traineeSkillGaps.length === 0 || trainerExpertise.length === 0) {
      return { fitScore: 0, matchedCompetencies: [] };
    }

    const expertiseMap = new Map<string, TrainerExpertiseRecord>();
    for (const exp of trainerExpertise) {
      expertiseMap.set(exp.competency_id, exp);
    }

    let sumWeightedContribution = 0;
    let sumMatchedGapPercentage = 0;
    const matchedCompetencies: MatchedCompetency[] = [];

    for (const gap of traineeSkillGaps) {
      if (gap.gap_percentage <= 0) continue;
      const exp = expertiseMap.get(gap.competency_id);
      if (exp) {
        const expertiseStrength = exp.proficiency_level === 'EXPERT' ? 100 : 75;
        const weightedContrib = gap.gap_percentage * expertiseStrength;

        sumWeightedContribution += weightedContrib;
        sumMatchedGapPercentage += gap.gap_percentage;

        matchedCompetencies.push({
          competencyId: gap.competency_id,
          competencyCode: gap.competency_code,
          competencyName: gap.competency_name,
          gapPercentage: Number(gap.gap_percentage.toFixed(2)),
          proficiencyLevel: exp.proficiency_level,
          expertiseStrength,
        });
      }
    }

    if (sumMatchedGapPercentage === 0) {
      return { fitScore: 0, matchedCompetencies: [] };
    }

    const rawFit = sumWeightedContribution / sumMatchedGapPercentage;
    const clampedFit = Math.min(100, Math.max(0, rawFit));
    return {
      fitScore: Number(clampedFit.toFixed(2)),
      matchedCompetencies,
    };
  }

  /**
   * PURE HELPER: Calculate Rating Factor (0–100)
   * RatingFactor = (average_rating / 5) * 100
   */
  calculateRatingFactor(averageRating: number): number {
    const raw = (averageRating / 5) * 100;
    return Number(Math.min(100, Math.max(0, raw)).toFixed(2));
  }

  /**
   * PURE HELPER: Calculate Experience Factor (0–100)
   * ExperienceFactor = min(years_of_experience, 10) / 10 * 100
   */
  calculateExperienceFactor(yearsOfExperience: number): number {
    const raw = (Math.min(yearsOfExperience, 10) / 10) * 100;
    return Number(Math.min(100, Math.max(0, raw)).toFixed(2));
  }

  /**
   * PURE HELPER: Calculate Capacity Factor (0–100)
   * remainingCapacity = max(0, hourly_capacity - activeSessions)
   * CapacityFactor = (remainingCapacity / hourly_capacity) * 100
   */
  calculateCapacityFactor(
    hourlyCapacity: number,
    activeSessions: number,
    isAvailable: boolean
  ): { capacityFactor: number; remainingCapacity: number } {
    if (!isAvailable || hourlyCapacity <= 0) {
      return { capacityFactor: 0, remainingCapacity: 0 };
    }
    const remainingCapacity = Math.max(0, hourlyCapacity - activeSessions);
    const raw = (remainingCapacity / hourlyCapacity) * 100;
    const capacityFactor = Number(Math.min(100, Math.max(0, raw)).toFixed(2));
    return { capacityFactor, remainingCapacity };
  }

  /**
   * PURE HELPER: Calculate Match Score (0–100)
   * MatchScore = (SkillGapFit * 0.40) + (RatingFactor * 0.25) + (ExperienceFactor * 0.20) + (CapacityFactor * 0.15)
   */
  calculateTrainerMatchScore(
    skillGapFit: number,
    ratingFactor: number,
    experienceFactor: number,
    capacityFactor: number
  ): { matchScore: number; breakdown: TrainerMatchFactorBreakdown } {
    const weightedSkillGapFit = skillGapFit * 0.40;
    const weightedRatingFactor = ratingFactor * 0.25;
    const weightedExperienceFactor = experienceFactor * 0.20;
    const weightedCapacityFactor = capacityFactor * 0.15;

    const totalRaw =
      weightedSkillGapFit +
      weightedRatingFactor +
      weightedExperienceFactor +
      weightedCapacityFactor;

    const matchScore = Number(Math.min(100, Math.max(0, totalRaw)).toFixed(2));

    return {
      matchScore,
      breakdown: {
        skillGapFit,
        ratingFactor,
        experienceFactor,
        capacityFactor,
        weightedSkillGapFit: Number(weightedSkillGapFit.toFixed(2)),
        weightedRatingFactor: Number(weightedRatingFactor.toFixed(2)),
        weightedExperienceFactor: Number(weightedExperienceFactor.toFixed(2)),
        weightedCapacityFactor: Number(weightedCapacityFactor.toFixed(2)),
      },
    };
  }

  /**
   * PURE HELPER: Select primary skill gap
   * Deterministic choice: highest gap_percentage, tie-breaker competency_code ASC
   */
  selectPrimarySkillGap(traineeSkillGaps: TraineeSkillGapRecord[]): PrimarySkillGap | null {
    if (traineeSkillGaps.length === 0) return null;
    const sorted = [...traineeSkillGaps].sort((a, b) => {
      if (b.gap_percentage !== a.gap_percentage) return b.gap_percentage - a.gap_percentage;
      return a.competency_code.localeCompare(b.competency_code);
    });
    const primary = sorted[0];
    return {
      competencyId: primary.competency_id,
      competencyCode: primary.competency_code,
      competencyName: primary.competency_name,
      gapPercentage: Number(primary.gap_percentage.toFixed(2)),
    };
  }

  /**
   * PURE HELPER: Sort Trainer Matches
   * Order: matchScore DESC, skillGapFit DESC, averageRating DESC, yearsOfExperience DESC, trainerId ASC
   */
  sortTrainerMatches(matches: TrainerMatchResult[]): TrainerMatchResult[] {
    return [...matches].sort((a, b) => {
      if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
      if (b.skillGapFit !== a.skillGapFit) return b.skillGapFit - a.skillGapFit;
      if (b.averageRating !== a.averageRating) return b.averageRating - a.averageRating;
      if (b.yearsOfExperience !== a.yearsOfExperience)
        return b.yearsOfExperience - a.yearsOfExperience;
      return a.trainerId.localeCompare(b.trainerId);
    });
  }

  /**
   * Main Match Engine Endpoint Service Logic
   */
  async getTrainerMatches(
    organizationId: string,
    traineeId: string,
    filterCompetencyId?: string,
    limit: number = 10
  ): Promise<TrainerMatchResult[]> {
    // 1. Fetch trainee positive skill gaps
    const traineeSkillGaps = await this.repo.findTraineeSkillGaps(organizationId, traineeId);
    const primarySkillGap = this.selectPrimarySkillGap(traineeSkillGaps);

    // 2. Fetch eligible trainers
    const eligibleTrainers = await this.repo.findEligibleTrainers(organizationId);
    if (eligibleTrainers.length === 0) return [];

    const trainerIds = eligibleTrainers.map((t) => t.id);

    // 3. Fetch expertise & active session counts
    const expertiseList = await this.repo.findTrainerExpertise(trainerIds, organizationId);
    const activeCapacityMap = await this.repo.calculateActiveSessionCapacity(
      trainerIds,
      organizationId
    );

    // Group expertise by trainer_id
    const trainerExpertiseMap = new Map<string, TrainerExpertiseRecord[]>();
    for (const exp of expertiseList) {
      const list = trainerExpertiseMap.get(exp.trainer_id) || [];
      list.push(exp);
      trainerExpertiseMap.set(exp.trainer_id, list);
    }

    const matches: TrainerMatchResult[] = [];

    for (const trainer of eligibleTrainers) {
      const activeSessions = activeCapacityMap[trainer.id] || 0;
      const { capacityFactor, remainingCapacity } = this.calculateCapacityFactor(
        trainer.hourly_capacity,
        activeSessions,
        trainer.is_available
      );

      // Section 17 Requirement: Fully saturated trainers (remainingCapacity <= 0) are excluded
      if (remainingCapacity <= 0 || !trainer.is_available) {
        continue;
      }

      const trainerExps = trainerExpertiseMap.get(trainer.id) || [];

      // Filter by specified competency if parameter provided
      if (filterCompetencyId) {
        const hasRequestedComp = trainerExps.some((e) => e.competency_id === filterCompetencyId);
        if (!hasRequestedComp) continue;
      }

      // Calculate factors
      const { fitScore, matchedCompetencies } = this.calculateSkillGapFit(
        traineeSkillGaps,
        trainerExps
      );
      const ratingFactor = this.calculateRatingFactor(trainer.average_rating);
      const experienceFactor = this.calculateExperienceFactor(trainer.years_of_experience);

      const { matchScore, breakdown } = this.calculateTrainerMatchScore(
        fitScore,
        ratingFactor,
        experienceFactor,
        capacityFactor
      );

      matches.push({
        trainerId: trainer.id,
        userId: trainer.user_id,
        trainerName: trainer.user_name || 'Verified Trainer',
        headline: trainer.headline,
        bio: trainer.bio,
        yearsOfExperience: trainer.years_of_experience,
        hourlyCapacity: trainer.hourly_capacity,
        activeSessionsCount: activeSessions,
        remainingCapacity,
        averageRating: Number(trainer.average_rating),
        totalReviews: trainer.total_reviews,
        isAvailable: trainer.is_available,
        matchScore,
        skillGapFit: fitScore,
        ratingFactor,
        experienceFactor,
        capacityFactor,
        primarySkillGap,
        matchedCompetencies,
        factorsBreakdown: breakdown,
      });
    }

    // Sort deterministically
    const sorted = this.sortTrainerMatches(matches);
    return sorted.slice(0, limit);
  }

  // Trainer Profile Self-Service Methods
  async getTrainerProfileByUser(userId: string, organizationId: string) {
    return this.repo.findTrainerProfileByUser(userId, organizationId);
  }

  async createTrainerProfile(
    userId: string,
    organizationId: string,
    data: {
      headline?: string | null;
      bio?: string | null;
      yearsOfExperience?: number;
      hourlyCapacity?: number;
      isAvailable?: boolean;
    }
  ) {
    return this.repo.createTrainerProfile(userId, organizationId, data);
  }

  async updateTrainerProfile(
    userId: string,
    organizationId: string,
    data: {
      headline?: string | null;
      bio?: string | null;
      yearsOfExperience?: number;
      hourlyCapacity?: number;
      isAvailable?: boolean;
    }
  ) {
    const profile = await this.repo.findTrainerProfileByUser(userId, organizationId);
    if (!profile) {
      throw new Error('Trainer profile not found');
    }
    return this.repo.updateTrainerProfile(profile.id, organizationId, data);
  }

  // Expertise Self-Service Methods
  async getTrainerExpertise(userId: string, organizationId: string) {
    const profile = await this.repo.findTrainerProfileByUser(userId, organizationId);
    if (!profile) {
      throw new Error('Trainer profile not found');
    }
    return this.repo.findTrainerExpertiseByTrainer(profile.id, organizationId);
  }

  async addTrainerExpertise(
    userId: string,
    organizationId: string,
    competencyId: string,
    proficiencyLevel: ProficiencyLevel,
    yearsExperience: number
  ) {
    const profile = await this.repo.findTrainerProfileByUser(userId, organizationId);
    if (!profile) {
      throw new Error('Trainer profile not found');
    }
    return this.repo.addTrainerExpertise(
      profile.id,
      organizationId,
      competencyId,
      proficiencyLevel,
      yearsExperience
    );
  }

  async removeTrainerExpertise(userId: string, organizationId: string, competencyId: string) {
    const profile = await this.repo.findTrainerProfileByUser(userId, organizationId);
    if (!profile) {
      throw new Error('Trainer profile not found');
    }
    return this.repo.removeTrainerExpertise(profile.id, competencyId, organizationId);
  }

  // Session Request Methods
  async createSessionRequest(
    organizationId: string,
    traineeId: string,
    data: {
      trainerId: string;
      competencyId?: string | null;
      topic: string;
      notes?: string | null;
      requestedSlot?: string | null;
    }
  ) {
    return this.repo.createSessionRequestTransactional(organizationId, traineeId, data);
  }

  async updateSessionStatus(
    sessionId: string,
    organizationId: string,
    actorUserId: string,
    actorRole: 'TRAINER' | 'TRAINEE',
    newStatus: SessionStatus
  ) {
    return this.repo.updateSessionStatusTransactional(
      sessionId,
      organizationId,
      actorUserId,
      actorRole,
      newStatus
    );
  }

  async getTraineeSessions(organizationId: string, traineeId: string) {
    return this.repo.findTraineeSessions(organizationId, traineeId);
  }

  async getTrainerSessions(organizationId: string, trainerUserId: string) {
    const profile = await this.repo.findTrainerProfileByUser(trainerUserId, organizationId);
    if (!profile) {
      throw new Error('Trainer profile not found');
    }
    return this.repo.findTrainerSessions(organizationId, profile.id);
  }
}
