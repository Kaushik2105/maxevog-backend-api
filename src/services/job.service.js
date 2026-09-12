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

  if (query.state) {
    where.state = query.state;
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
 * Admin: List all jobs (including drafts and archived)
 */
async function listAdminJobs(query = {}) {
  const { page, limit, offset } = getPaginationParams(query);
  const where = {};

  if (query.status) {
    where.status = query.status;
  }

  if (query.isPublished !== undefined) {
    where.isPublished = query.isPublished === 'true';
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

/**
 * Admin: Create a new job
 */
async function createJob(jobData, attachmentBuffer, actor) {
  let attachmentUrl = null;
  if (attachmentBuffer) {
    attachmentUrl = await uploadDocument(attachmentBuffer, 'job_notifications', 'notification');
  }

  const job = await Job.create({
    ...jobData,
    attachmentUrl: attachmentUrl || jobData.attachmentUrl,
  });

  await logAction({
    actorId: actor ? actor.id : null,
    actorRole: actor ? actor.role : 'ADMIN',
    action: AUDIT_ACTIONS.ADMIN_CREATED_JOB,
    entityType: 'Job',
    entityId: job.id,
    metadata: { title: job.title, organization: job.organization },
  });

  return job;
}

/**
 * Admin: Update an existing job
 */
async function updateJob(jobId, jobData, attachmentBuffer, actor) {
  const job = await Job.findByPk(jobId);
  if (!job) {
    throw new AppError('Job not found', 404);
  }

  let attachmentUrl = job.attachmentUrl;
  if (attachmentBuffer) {
    attachmentUrl = await uploadDocument(attachmentBuffer, 'job_notifications', `job_${jobId}`);
  }

  await job.update({
    ...jobData,
    attachmentUrl,
  });

  await logAction({
    actorId: actor ? actor.id : null,
    actorRole: actor ? actor.role : 'ADMIN',
    action: AUDIT_ACTIONS.ADMIN_UPDATED_JOB,
    entityType: 'Job',
    entityId: job.id,
  });

  return job;
}

/**
 * Admin: Publish or unpublish a job
 */
async function setJobPublishStatus(jobId, isPublished, actor) {
  const job = await Job.findByPk(jobId);
  if (!job) {
    throw new AppError('Job not found', 404);
  }

  job.isPublished = Boolean(isPublished);
  job.status = isPublished ? JOB_STATUSES.PUBLISHED : JOB_STATUSES.DRAFT;
  await job.save();

  await logAction({
    actorId: actor ? actor.id : null,
    actorRole: actor ? actor.role : 'ADMIN',
    action: AUDIT_ACTIONS.ADMIN_PUBLISHED_JOB,
    entityType: 'Job',
    entityId: job.id,
    metadata: { isPublished: job.isPublished },
  });

  return job;
}

/**
 * Admin: Archive a job
 */
async function archiveJob(jobId, actor) {
  const job = await Job.findByPk(jobId);
  if (!job) {
    throw new AppError('Job not found', 404);
  }

  job.status = JOB_STATUSES.ARCHIVED;
  job.isPublished = false;
  await job.save();

  await logAction({
    actorId: actor ? actor.id : null,
    actorRole: actor ? actor.role : 'ADMIN',
    action: AUDIT_ACTIONS.ADMIN_ARCHIVED_JOB,
    entityType: 'Job',
    entityId: job.id,
  });

  return job;
}

/**
 * Admin: Delete a job
 */
async function deleteJob(jobId) {
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
  listAdminJobs,
  createJob,
  updateJob,
  setJobPublishStatus,
  archiveJob,
  deleteJob,
};
