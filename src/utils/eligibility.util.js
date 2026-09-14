/**
 * Eligibility Calculation Utility
 * Evaluates candidate eligibility against recruitment requirements.
 * Returns non-binary assessment:
 * - 'likely eligible'
 * - 'may be eligible / needs review'
 * - 'likely not eligible'
 */
const { ELIGIBILITY_STATUSES } = require('../constants/application.constant');
const { calculateAge } = require('./date.util');

const EDUCATION_HIERARCHY = {
  BELOW_10TH: 0,
  '10TH': 1,
  '12TH': 2,
  DIPLOMA: 3,
  GRADUATE: 4,
  POST_GRADUATE: 5,
  DOCTORATE: 6,
};

/**
 * Normalize education level string for hierarchical comparison
 * @param {string} level 
 * @returns {number}
 */
function getEducationWeight(level) {
  if (!level) return -1;
  const normalized = level.toUpperCase().replace(/\s+/g, '_');
  return EDUCATION_HIERARCHY[normalized] !== undefined ? EDUCATION_HIERARCHY[normalized] : -1;
}

/**
 * Evaluate eligibility for a user against a job
 * @param {object} profile - User's profile
 * @param {object} job - Recruitment/Job instance
 * @returns {{ status: string, score: number, reasons: string[] }}
 */
function evaluateEligibility(profile, job) {
  if (!profile) {
    return {
      status: ELIGIBILITY_STATUSES.MAY_BE_ELIGIBLE,
      score: 50,
      reasons: ['Profile is incomplete; unable to perform definitive eligibility assessment.'],
    };
  }

  const reasons = [];
  let definiteDisqualification = false;
  let uncertainMatches = 0;
  let clearMatches = 0;

  // 1. Age Verification
  const candidateAge = calculateAge(profile.dob);
  if (candidateAge !== null) {
    const minAge = job.ageMin !== null && job.ageMin !== undefined ? job.ageMin : 18;
    const maxAge = job.ageMax !== null && job.ageMax !== undefined ? job.ageMax : 45;

    // Apply basic category relaxation if configured
    let categoryRelaxation = 0;
    const userCategory = (profile.category || '').toUpperCase();
    if (userCategory === 'SC' || userCategory === 'ST') {
      categoryRelaxation = 5;
    } else if (userCategory === 'OBC') {
      categoryRelaxation = 3;
    } else if (profile.disabilityStatus) {
      categoryRelaxation = 10;
    }

    const effectiveMaxAge = maxAge + categoryRelaxation;

    if (candidateAge < minAge) {
      definiteDisqualification = true;
      reasons.push(`Under minimum age requirement (Age: ${candidateAge}, Required: ${minAge}).`);
    } else if (candidateAge > effectiveMaxAge) {
      definiteDisqualification = true;
      reasons.push(`Exceeds maximum age limit (Age: ${candidateAge}, Maximum allowed with category relaxation: ${effectiveMaxAge}).`);
    } else {
      clearMatches++;
      reasons.push(`Age (${candidateAge} years) satisfies requirement (${minAge} - ${maxAge} years).`);
    }
  } else {
    uncertainMatches++;
    reasons.push('Date of birth not provided; age check skipped.');
  }

  // 2. Education Qualification Check
  if (job.qualification) {
    const jobEduWeight = getEducationWeight(job.qualification);
    const candidateEduWeight = getEducationWeight(profile.educationLevel);

    if (jobEduWeight !== -1 && candidateEduWeight !== -1) {
      if (candidateEduWeight < jobEduWeight) {
        definiteDisqualification = true;
        reasons.push(`Education level (${profile.educationLevel}) is below required minimum (${job.qualification}).`);
      } else {
        clearMatches++;
        reasons.push(`Education level meets required minimum (${job.qualification}).`);
      }
    } else {
      uncertainMatches++;
      reasons.push('Specific qualification comparison requires manual verification.');
    }
  }

  // 3. Degree & Branch Requirements Check (from eligibleDegrees / eligibleBranches or legacy degreeRequirements)
  const candidateDegree = (profile.degree || profile.qualification || '').trim().toLowerCase();
  const candidateBranch = (profile.branch || '').trim().toLowerCase();

  let eligibleDegrees = [];
  if (Array.isArray(job.eligibleDegrees)) {
    eligibleDegrees = job.eligibleDegrees;
  } else if (typeof job.eligibleDegrees === 'string') {
    try { eligibleDegrees = JSON.parse(job.eligibleDegrees); } catch (e) { eligibleDegrees = []; }
  }

  let eligibleBranches = [];
  if (Array.isArray(job.eligibleBranches)) {
    eligibleBranches = job.eligibleBranches;
  } else if (typeof job.eligibleBranches === 'string') {
    try { eligibleBranches = JSON.parse(job.eligibleBranches); } catch (e) { eligibleBranches = []; }
  }

  if (eligibleDegrees.length > 0) {
    const isAnyDegreeOpen = eligibleDegrees.some((d) => {
      const lower = d.toLowerCase();
      return lower.includes('any graduate') || lower.includes('any degree') || lower.includes('all');
    });

    let degreeMatched = isAnyDegreeOpen;
    if (!degreeMatched && candidateDegree) {
      degreeMatched = eligibleDegrees.some((d) => {
        const lower = d.toLowerCase();
        return (
          lower.includes(candidateDegree) ||
          candidateDegree.includes(lower) ||
          (lower.includes('b.tech') && candidateDegree.includes('b.tech')) ||
          (lower.includes('mbbs') && candidateDegree.includes('mbbs')) ||
          (lower.includes('b.sc') && candidateDegree.includes('b.sc')) ||
          (lower.includes('12th') && candidateDegree.includes('12th')) ||
          (lower.includes('10th') && candidateDegree.includes('10th'))
        );
      });
    }

    let branchMatched = false;
    const isAnyBranchOpen = eligibleBranches.length === 0 || eligibleBranches.some((b) => {
      const lower = b.toLowerCase();
      return lower.includes('any') || lower.includes('all') || lower.includes('general');
    });

    if (isAnyBranchOpen) {
      branchMatched = true;
    } else if (candidateBranch) {
      branchMatched = eligibleBranches.some((b) => {
        const lower = b.toLowerCase();
        return lower.includes(candidateBranch) || candidateBranch.includes(lower);
      });
    }

    // User's Deterministic Decision Rules:
    // 1. Both degree & branch match -> Likely Eligible
    // 2. Only one matches (or one is missing) -> May Be Eligible / Needs Review
    // 3. Neither matches -> Likely Not Eligible
    if (degreeMatched && branchMatched) {
      reasons.push(`Degree & Specialization match advertised recruitment criteria.`);
      return {
        status: ELIGIBILITY_STATUSES.LIKELY_ELIGIBLE,
        score: 90,
        reasons,
      };
    } else if (degreeMatched && !branchMatched) {
      reasons.push(`Degree matches, but branch specialization (${profile.branch || 'Not Specified'}) requires review against advertised branches.`);
      return {
        status: ELIGIBILITY_STATUSES.MAY_BE_ELIGIBLE,
        score: 60,
        reasons,
      };
    } else if (!degreeMatched && branchMatched) {
      reasons.push(`Specialization matches, but degree (${profile.degree || profile.qualification || 'Not Specified'}) requires review against advertised qualifications.`);
      return {
        status: ELIGIBILITY_STATUSES.MAY_BE_ELIGIBLE,
        score: 60,
        reasons,
      };
    } else {
      reasons.push(`Neither candidate degree nor branch matches the advertised criteria.`);
      return {
        status: ELIGIBILITY_STATUSES.LIKELY_NOT_ELIGIBLE,
        score: 20,
        reasons,
      };
    }
  }

  // Fallback: If job has no specific eligibleDegrees configured
  if (definiteDisqualification) {
    return {
      status: ELIGIBILITY_STATUSES.LIKELY_NOT_ELIGIBLE,
      score: 15,
      reasons,
    };
  }

  if (clearMatches >= 1 && uncertainMatches === 0) {
    return {
      status: ELIGIBILITY_STATUSES.LIKELY_ELIGIBLE,
      score: 85,
      reasons,
    };
  }

  return {
    status: ELIGIBILITY_STATUSES.MAY_BE_ELIGIBLE,
    score: 60,
    reasons,
  };
}

module.exports = {
  evaluateEligibility,
};
