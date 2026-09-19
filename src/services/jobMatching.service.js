/**
 * Job Matching Service
 * Core Pro Club feature: Evaluates government jobs against Pro candidate profiles.
 * Generates structured "Why this matches you" reasons and dispatches instant matching alerts.
 */
const { Op } = require('sequelize');
const { Job, Profile, User, ProJobMatch, ProSubscription } = require('../models');
const { PRO_SUBSCRIPTION_STATUSES } = require('../models/proSubscription.model');
const { calculateAge } = require('../utils/date.util');
const { getPaginationParams, buildPaginationMeta } = require('../utils/pagination.util');
const logger = require('../utils/logger.util');

const EDUCATION_WEIGHTS = {
  BELOW_10TH: 0,
  '10TH': 1,
  '12TH': 2,
  DIPLOMA: 3,
  GRADUATE: 4,
  POST_GRADUATE: 5,
  DOCTORATE: 6,
};

function getWeight(edu) {
  if (!edu) return -1;
  const key = edu.toUpperCase().replace(/\s+/g, '_');
  return EDUCATION_WEIGHTS[key] !== undefined ? EDUCATION_WEIGHTS[key] : -1;
}

/**
 * Evaluates candidate profile against job criteria and generates "Why this matches you" points
 * @param {object} profile
 * @param {object} job
 * @returns {{ isMatch: boolean, status: string, score: number, reasons: string[] }}
 */
function evaluateJobForProfile(profile, job) {
  if (!profile) {
    return { isMatch: false, status: 'INCOMPLETE_PROFILE', score: 0, reasons: [] };
  }

  const reasons = [];
  let isDisqualified = false;
  let score = 50;

  // 1. Age Evaluation (with Category & PwD Relaxation)
  if (profile.dob) {
    const age = calculateAge(profile.dob);
    const minAge = job.ageMin ?? 18;
    const maxAge = job.ageMax ?? 45;

    let relaxation = 0;
    const cat = (profile.category || '').toUpperCase();
    if (cat === 'SC' || cat === 'ST') relaxation = 5;
    else if (cat === 'OBC') relaxation = 3;
    if (profile.disabilityStatus) relaxation += 10;

    const effectiveMaxAge = maxAge + relaxation;

    if (age < minAge) {
      isDisqualified = true;
    } else if (age > effectiveMaxAge) {
      isDisqualified = true;
    } else {
      score += 20;
      if (relaxation > 0) {
        reasons.push(`Age (${age} yrs) satisfies criteria of ${minAge}–${maxAge} yrs (with ${relaxation} yrs ${cat || 'special'} relaxation applied).`);
      } else {
        reasons.push(`Age (${age} yrs) is within the eligible range (${minAge}–${maxAge} yrs).`);
      }
    }
  } else {
    reasons.push('Date of birth not specified; age eligibility subject to verification.');
  }

  if (isDisqualified) {
    return { isMatch: false, status: 'DISQUALIFIED', score: 0, reasons: [] };
  }

  // 2. Minimum Qualification Level
  if (job.qualification) {
    const jobWeight = getWeight(job.qualification);
    const candidateWeight = getWeight(profile.educationLevel);

    if (jobWeight !== -1 && candidateWeight !== -1) {
      if (candidateWeight < jobWeight) {
        return { isMatch: false, status: 'DISQUALIFIED', score: 0, reasons: [] };
      }
      score += 20;
      reasons.push(`Education level (${profile.educationLevel}) satisfies the minimum requirement of ${job.qualification}.`);
    } else {
      reasons.push(`Minimum qualification: ${job.qualification}. Candidate qualification: ${profile.educationLevel || 'Not specified'}.`);
    }
  }

  // 3. Degree & Branch Matching
  let eligibleDegrees = [];
  if (Array.isArray(job.eligibleDegrees)) eligibleDegrees = job.eligibleDegrees;
  else if (typeof job.eligibleDegrees === 'string') {
    try { eligibleDegrees = JSON.parse(job.eligibleDegrees); } catch (e) { eligibleDegrees = []; }
  }

  let eligibleBranches = [];
  if (Array.isArray(job.eligibleBranches)) eligibleBranches = job.eligibleBranches;
  else if (typeof job.eligibleBranches === 'string') {
    try { eligibleBranches = JSON.parse(job.eligibleBranches); } catch (e) { eligibleBranches = []; }
  }

  const candidateDegree = (profile.degree || profile.educationLevel || '').toLowerCase();
  const candidateBranch = (profile.branch || '').toLowerCase();

  let degreeMatch = eligibleDegrees.length === 0;
  if (!degreeMatch) {
    degreeMatch = eligibleDegrees.some((d) => {
      const lower = d.toLowerCase();
      return (
        lower.includes('any graduate') ||
        lower.includes('all') ||
        (candidateDegree && (lower.includes(candidateDegree) || candidateDegree.includes(lower)))
      );
    });
  }

  let branchMatch = eligibleBranches.length === 0;
  if (!branchMatch) {
    branchMatch = eligibleBranches.some((b) => {
      const lower = b.toLowerCase();
      return (
        lower.includes('any') ||
        lower.includes('all') ||
        lower.includes('general') ||
        (candidateBranch && (lower.includes(candidateBranch) || candidateBranch.includes(lower)))
      );
    });
  }

  if (degreeMatch) {
    score += 20;
    reasons.push(`Degree profile (${profile.degree || profile.educationLevel || 'Graduate'}) aligns with advertised requirements.`);
  }

  if (branchMatch && profile.branch) {
    score += 10;
    reasons.push(`Branch specialization (${profile.branch}) aligns with advertised discipline requirements.`);
  }

  // 4. Category & Domicile
  if (profile.category) {
    reasons.push(`Category reservation quota applies for ${profile.category} candidates.`);
  }
  if (profile.state && job.state && job.state !== 'All India') {
    if (profile.state.toLowerCase() === job.state.toLowerCase()) {
      score += 10;
      reasons.push(`State domicile (${profile.state}) matches job location.`);
    }
  } else {
    reasons.push(`Open to candidates across All India.`);
  }

  const matchStatus = score >= 80 ? 'LIKELY_ELIGIBLE' : 'MAY_BE_ELIGIBLE';
  return {
    isMatch: true,
    status: matchStatus,
    score: Math.min(100, score),
    reasons,
  };
}

/**
 * Evaluates a specific published job against all active Pro candidates
 * Idempotently creates ProJobMatch records and dispatches instant matching alerts.
 * @param {string} jobId
 */
async function matchJobForProCandidates(jobId) {
  const job = await Job.findByPk(jobId);
  if (!job || !job.isPublished || job.status !== 'PUBLISHED') {
    return { matchesCreated: 0 };
  }

  const today = new Date().toISOString().split('T')[0];

  // Find all active Pro candidates
  const activeSubscriptions = await ProSubscription.findAll({
    where: {
      status: PRO_SUBSCRIPTION_STATUSES.ACTIVE,
      endDate: { [Op.gte]: today },
    },
    include: [
      {
        model: User,
        as: 'user',
        include: [{ model: Profile, as: 'profile' }],
      },
    ],
  });

  let createdCount = 0;
  const proNotificationService = require('./proNotification.service');

  for (const sub of activeSubscriptions) {
    const candidate = sub.user;
    if (!candidate || !candidate.profile) continue;

    const assessment = evaluateJobForProfile(candidate.profile, job);
    if (assessment.isMatch) {
      const [matchRecord, created] = await ProJobMatch.findOrCreate({
        where: {
          userId: candidate.id,
          jobId: job.id,
        },
        defaults: {
          matchScore: assessment.score,
          matchStatus: assessment.status,
          reasons: assessment.reasons,
          notified: false,
        },
      });

      if (created) {
        createdCount++;
        // Dispatch instant alert
        proNotificationService.notifyNewMatchingJob(candidate.id, job, assessment.reasons).catch((err) => {
          logger.error(`[JobMatching] Alert error for candidate ${candidate.id}: ${err.message}`);
        });
      } else if (!matchRecord.notified) {
        // Retry notification if not sent
        proNotificationService.notifyNewMatchingJob(candidate.id, job, assessment.reasons).catch((err) => {
          logger.error(`[JobMatching] Alert retry error for candidate ${candidate.id}: ${err.message}`);
        });
      }
    }
  }

  logger.info(`[JobMatching] Evaluated job "${job.title}": ${createdCount} new Pro matches created.`);
  return { matchesCreated: createdCount };
}

/**
 * Re-evaluates all published active jobs for a single candidate
 * Called when candidate activates Pro Club or updates profile.
 * @param {string} userId
 */
async function matchAllJobsForCandidate(userId) {
  const profile = await Profile.findOne({ where: { userId } });
  if (!profile) return { matches: 0 };

  const today = new Date().toISOString().split('T')[0];

  const publishedJobs = await Job.findAll({
    where: {
      isPublished: true,
      status: 'PUBLISHED',
      applicationLastDate: { [Op.gte]: today },
    },
    order: [['applicationLastDate', 'ASC']],
  });

  let matchCount = 0;
  for (const job of publishedJobs) {
    const assessment = evaluateJobForProfile(profile, job);
    if (assessment.isMatch) {
      await ProJobMatch.findOrCreate({
        where: {
          userId,
          jobId: job.id,
        },
        defaults: {
          matchScore: assessment.score,
          matchStatus: assessment.status,
          reasons: assessment.reasons,
          notified: true, // Marked notified on bulk sync
          notifiedAt: new Date(),
        },
      });
      matchCount++;
    }
  }

  logger.info(`[JobMatching] Matched ${matchCount} recruitments for candidate ${userId}`);
  return { matches: matchCount };
}

/**
 * Get personalized matched jobs feed for a candidate
 * @param {string} userId
 * @param {object} query
 */
async function getCandidateMatchedJobs(userId, query = {}) {
  const { page, limit, offset } = getPaginationParams(query);
  const today = new Date().toISOString().split('T')[0];

  const { count, rows } = await ProJobMatch.findAndCountAll({
    where: { userId },
    include: [
      {
        model: Job,
        as: 'job',
        where: {
          isPublished: true,
          status: 'PUBLISHED',
          applicationLastDate: { [Op.gte]: today },
        },
      },
    ],
    order: [
      [{ model: Job, as: 'job' }, 'applicationLastDate', 'ASC'],
      ['createdAt', 'DESC'],
    ],
    limit,
    offset,
  });

  return {
    matches: rows.map((m) => ({
      id: m.id,
      matchScore: m.matchScore,
      matchStatus: m.matchStatus,
      reasons: m.reasons,
      createdAt: m.createdAt,
      job: m.job,
      disclaimer:
        'maxEvoG provides personalized matching based on candidate profile data. The official recruitment notification remains the final authority; candidate must verify official notification.',
    })),
    meta: buildPaginationMeta({ count, page, limit }),
  };
}

module.exports = {
  evaluateJobForProfile,
  matchJobForProCandidates,
  matchAllJobsForCandidate,
  getCandidateMatchedJobs,
};
