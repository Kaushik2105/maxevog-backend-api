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

  // 3. Degree Requirements Check
  if (job.degreeRequirements && profile.degree) {
    const candidateDegree = profile.degree.toLowerCase();
    const reqDegrees = job.degreeRequirements.toLowerCase().split(',').map((d) => d.trim());
    const matchesDegree = reqDegrees.some((d) => candidateDegree.includes(d) || d.includes(candidateDegree));

    if (matchesDegree) {
      clearMatches++;
      reasons.push(`Degree (${profile.degree}) aligns with recruitment requirements.`);
    } else {
      uncertainMatches++;
      reasons.push(`Degree (${profile.degree}) may require equivalency verification against: ${job.degreeRequirements}.`);
    }
  }

  // Determine overall status
  if (definiteDisqualification) {
    return {
      status: ELIGIBILITY_STATUSES.LIKELY_NOT_ELIGIBLE,
      score: 15,
      reasons,
    };
  }

  if (clearMatches >= 2 && uncertainMatches === 0) {
    return {
      status: ELIGIBILITY_STATUSES.LIKELY_ELIGIBLE,
      score: 90,
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
