/**
 * Job / Recruitment Service
 * Business logic for recruitment listings, search, eligibility matching, and admin CRUD.
 */
const { Op } = require('sequelize');
const { Job, Profile, Result, AdmitCard } = require('../models');
const { JOB_STATUSES } = require('../constants/application.constant');
const { AUDIT_ACTIONS } = require('../constants/audit.constant');
const { evaluateEligibility } = require('../utils/eligibility.util');
const { getPaginationParams, buildPaginationMeta } = require('../utils/pagination.util');
const { uploadDocument } = require('./upload.service');
const { logAction } = require('./audit.service');
const { AppError } = require('../middleware/error.middleware');

/**
 * List public recruitment jobs with search and filters
 */
async function listPublicJobs(query = {}) {
  const { page, limit, offset } = getPaginationParams(query);

  const where = {
    isPublished: true,
    status: JOB_STATUSES.PUBLISHED,
  };

  // Keyword search across title, organization, and department
  if (query.search) {
    const term = `%${query.search.trim()}%`;
    where[Op.or] = [
      { title: { [Op.like]: term } },
      { organization: { [Op.like]: term } },
      { department: { [Op.like]: term } },
      { shortDescription: { [Op.like]: term } },
    ];
  }

  if (query.category && query.category !== 'ALL') {
    where.category = query.category;
  }

  if (query.qualification) {
    where.qualification = query.qualification;
  }

  if (query.featured !== undefined) {
    where.isFeatured = query.featured === 'true';
  }

  const { count, rows } = await Job.findAndCountAll({
    where,
    order: [
      ['isFeatured', 'DESC'],
      ['applicationLastDate', 'ASC'],
      ['createdAt', 'DESC'],
    ],
    limit,
    offset,
  });

  const meta = buildPaginationMeta({ count, page, limit });
  return { jobs: rows, meta };
}

/**
 * Get job details with related results and admit cards
 */
async function getJobById(jobId) {
  const job = await Job.findByPk(jobId, {
    include: [
      { model: Result, as: 'results', where: { isPublished: true }, required: false },
      { model: AdmitCard, as: 'admitCards', where: { isPublished: true }, required: false },
    ],
  });

  if (!job) {
    throw new AppError('Recruitment not found', 404);
  }

  return job;
}

/**
 * Get personalized eligible jobs for an authenticated user
 */
async function getEligibleJobsForUser(userId, query = {}) {
  const profile = await Profile.findOne({ where: { userId } });
  const { page, limit, offset } = getPaginationParams(query);

  const where = {
    isPublished: true,
    status: JOB_STATUSES.PUBLISHED,
  };

  const { count, rows } = await Job.findAndCountAll({
    where,
    order: [['applicationLastDate', 'ASC']],
  });

  // Evaluate eligibility for each published job
  const evaluatedJobs = rows.map((job) => {
    const assessment = evaluateEligibility(profile, job);
    return {
      ...job.toJSON(),
      eligibility: assessment,
    };
  });

  // Filter by status if requested (e.g. status=likely eligible)
  let filtered = evaluatedJobs;
  if (query.status) {
    filtered = evaluatedJobs.filter((j) => j.eligibility.status === query.status);
  }

  // Sort by highest eligibility score first
  filtered.sort((a, b) => b.eligibility.score - a.eligibility.score);

  const paginated = filtered.slice(offset, offset + limit);
  const meta = buildPaginationMeta({ count: filtered.length, page, limit });

  return { jobs: paginated, meta };
}

/**
 * Check eligibility of a specific candidate for a specific job
 */
async function checkJobEligibility(jobId, userId) {
  const job = await Job.findByPk(jobId);
  if (!job) {
    throw new AppError('Recruitment not found', 404);
  }
  const profile = await Profile.findOne({ where: { userId } });
  const assessment = evaluateEligibility(profile, job);
  return assessment;
}

/**
 * Admin: List all jobs (including drafts and archived)
 */
async function listAdminJobs(query = {}, actor = null) {
  const { page, limit, offset } = getPaginationParams(query);
  const where = {};

  if (query.status) {
    where.status = query.status;
  }

  if (query.isPublished !== undefined) {
    where.isPublished = query.isPublished === 'true';
  }

  if (query.createdById) {
    where.createdById = query.createdById;
  } else if (query.myOnly === 'true' && actor) {
    where.createdById = actor.id;
  }

  if (query.search) {
    const term = `%${query.search.trim()}%`;
    where[Op.or] = [
      { title: { [Op.like]: term } },
      { organization: { [Op.like]: term } },
    ];
  }

  const { count, rows } = await Job.findAndCountAll({
    where,
    order: [['createdAt', 'DESC']],
    limit,
    offset,
  });

  const meta = buildPaginationMeta({ count, page, limit });
  return { jobs: rows, meta };
}

function normalizeJobData(jobData, attachmentUrl) {
  const applicationLastDate = jobData.applicationLastDate || jobData.lastDate;
  const applicationFee =
    jobData.applicationFee !== undefined
      ? parseFloat(jobData.applicationFee)
      : jobData.fee !== undefined
      ? parseFloat(jobData.fee)
      : 0;
  const vacancies =
    jobData.vacancies !== undefined && jobData.vacancies !== null && jobData.vacancies !== '' && !isNaN(parseInt(jobData.vacancies, 10))
      ? parseInt(jobData.vacancies, 10)
      : null;
  const officialApplicationUrl = jobData.officialApplicationUrl || jobData.officialUrl;
  const officialNotificationUrl = jobData.officialNotificationUrl || jobData.officialUrl;

  let tables = jobData.tables;
  if (typeof tables === 'string') {
    try {
      tables = JSON.parse(tables);
    } catch (e) {
      tables = [];
    }
  }

  let eligibleDegrees = jobData.eligibleDegrees;
  if (typeof eligibleDegrees === 'string') {
    try {
      eligibleDegrees = JSON.parse(eligibleDegrees);
    } catch (e) {
      eligibleDegrees = [];
    }
  }

  let eligibleBranches = jobData.eligibleBranches;
  if (typeof eligibleBranches === 'string') {
    try {
      eligibleBranches = JSON.parse(eligibleBranches);
    } catch (e) {
      eligibleBranches = [];
    }
  }

  return {
    ...jobData,
    applicationLastDate,
    applicationFee,
    vacancies,
    officialApplicationUrl,
    officialNotificationUrl,
    tables: Array.isArray(tables) ? tables : [],
    eligibleDegrees: Array.isArray(eligibleDegrees) ? eligibleDegrees : [],
    eligibleBranches: Array.isArray(eligibleBranches) ? eligibleBranches : [],
    category: jobData.category || 'Central',
    isPublished: jobData.isPublished !== undefined ? Boolean(jobData.isPublished) : true,
    status:
      jobData.status ||
      (jobData.isPublished === false ? JOB_STATUSES.DRAFT : JOB_STATUSES.PUBLISHED),
    attachmentUrl: attachmentUrl || jobData.attachmentUrl,
  };
}

/**
 * Admin / Agent: Create a new job
 */
async function createJob(jobData, attachmentBuffer, actor) {
  let attachmentUrl = null;
  if (attachmentBuffer) {
    attachmentUrl = await uploadDocument(attachmentBuffer, 'job_notifications', 'notification');
  }

  const normalized = normalizeJobData(jobData, attachmentUrl);
  if (actor && actor.id) {
    normalized.createdById = actor.id;
  }
  const job = await Job.create(normalized);

  const isAgent = actor && actor.role === 'AGENT';
  await logAction({
    actorId: actor ? actor.id : null,
    actorRole: actor ? actor.role : 'ADMIN',
    action: isAgent ? AUDIT_ACTIONS.AGENT_CREATED_JOB : AUDIT_ACTIONS.ADMIN_CREATED_JOB,
    entityType: 'Job',
    entityId: job.id,
    metadata: { title: job.title, organization: job.organization },
  });

  return job;
}

/**
 * Admin / Agent: Update an existing job
 */
async function updateJob(jobId, jobData, attachmentBuffer, actor) {
  const job = await Job.findByPk(jobId);
  if (!job) {
    throw new AppError('Job not found', 404);
  }

  // Agents can only edit/update recruitments that they created only
  if (actor && actor.role === 'AGENT') {
    if (job.createdById && job.createdById !== actor.id) {
      throw new AppError('Agents are only authorized to edit recruitments created by themselves', 403);
    }
  }

  let attachmentUrl = job.attachmentUrl;
  if (attachmentBuffer) {
    attachmentUrl = await uploadDocument(attachmentBuffer, 'job_notifications', `job_${jobId}`);
  }

  const normalized = normalizeJobData(jobData, attachmentUrl);
  await job.update(normalized);

  const isAgent = actor && actor.role === 'AGENT';
  await logAction({
    actorId: actor ? actor.id : null,
    actorRole: actor ? actor.role : 'ADMIN',
    action: isAgent ? AUDIT_ACTIONS.AGENT_UPDATED_JOB : AUDIT_ACTIONS.ADMIN_UPDATED_JOB,
    entityType: 'Job',
    entityId: job.id,
  });

  return job;
}

/**
 * Admin / Agent: Publish or unpublish a job
 */
async function setJobPublishStatus(jobId, isPublished, actor) {
  const job = await Job.findByPk(jobId);
  if (!job) {
    throw new AppError('Job not found', 404);
  }

  // Agents can only manage recruitments that they created only
  if (actor && actor.role === 'AGENT') {
    if (job.createdById && job.createdById !== actor.id) {
      throw new AppError('Agents are only authorized to manage recruitments created by themselves', 403);
    }
  }

  job.isPublished = Boolean(isPublished);
  job.status = isPublished ? JOB_STATUSES.PUBLISHED : JOB_STATUSES.DRAFT;
  await job.save();

  const isAgent = actor && actor.role === 'AGENT';
  await logAction({
    actorId: actor ? actor.id : null,
    actorRole: actor ? actor.role : 'ADMIN',
    action: isAgent ? AUDIT_ACTIONS.AGENT_PUBLISHED_JOB : AUDIT_ACTIONS.ADMIN_PUBLISHED_JOB,
    entityType: 'Job',
    entityId: job.id,
    metadata: { isPublished: job.isPublished },
  });

  return job;
}

/**
 * Admin / Agent: Archive a job
 */
async function archiveJob(jobId, actor) {
  const job = await Job.findByPk(jobId);
  if (!job) {
    throw new AppError('Job not found', 404);
  }

  // Agents can only manage recruitments that they created only
  if (actor && actor.role === 'AGENT') {
    if (job.createdById && job.createdById !== actor.id) {
      throw new AppError('Agents are only authorized to manage recruitments created by themselves', 403);
    }
  }

  job.status = JOB_STATUSES.ARCHIVED;
  job.isPublished = false;
  await job.save();

  const isAgent = actor && actor.role === 'AGENT';
  await logAction({
    actorId: actor ? actor.id : null,
    actorRole: actor ? actor.role : 'ADMIN',
    action: isAgent ? AUDIT_ACTIONS.AGENT_ARCHIVED_JOB : AUDIT_ACTIONS.ADMIN_ARCHIVED_JOB,
    entityType: 'Job',
    entityId: job.id,
  });

  return job;
}

/**
 * Admin: Delete a job (Strictly Admin only, Agents forbidden)
 */
async function deleteJob(jobId, actor) {
  if (actor && actor.role === 'AGENT') {
    throw new AppError('Agents do not have permission to delete recruitments', 403);
  }

  const job = await Job.findByPk(jobId);
  if (!job) {
    throw new AppError('Job not found', 404);
  }

  await job.destroy();
  return { deleted: true };
}

module.exports = {
  listPublicJobs,
  getJobById,
  getEligibleJobsForUser,
  checkJobEligibility,
  listAdminJobs,
  createJob,
  updateJob,
  setJobPublishStatus,
  archiveJob,
  deleteJob,
};
