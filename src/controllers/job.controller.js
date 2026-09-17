/**
 * Job Controller
 */
const jobService = require('../services/job.service');
const { sendSuccess } = require('../utils/response.util');

async function listPublicJobs(req, res, next) {
  try {
    const { jobs, meta } = await jobService.listPublicJobs(req.query);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Recruitment jobs fetched successfully',
      data: { jobs },
      meta,
    });
  } catch (error) {
    next(error);
  }
}

async function getJobDetails(req, res, next) {
  try {
    const job = await jobService.getJobById(req.params.id);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Job details fetched successfully',
      data: { job },
    });
  } catch (error) {
    next(error);
  }
}

async function getEligibleJobs(req, res, next) {
  try {
    const { jobs, meta } = await jobService.getEligibleJobsForUser(req.user.id, req.query);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Personalized eligible jobs fetched successfully',
      data: { jobs },
      meta,
    });
  } catch (error) {
    next(error);
  }
}

async function checkJobEligibility(req, res, next) {
  try {
    const assessment = await jobService.checkJobEligibility(req.params.id, req.user.id);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Eligibility evaluated successfully',
      data: assessment,
    });
  } catch (error) {
    next(error);
  }
}

async function listAdminJobs(req, res, next) {
  try {
    const { jobs, meta } = await jobService.listAdminJobs(req.query, req.user);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Admin recruitment list fetched successfully',
      data: { jobs },
      meta,
    });
  } catch (error) {
    next(error);
  }
}

async function createJob(req, res, next) {
  try {
    const fileBuffer = req.file ? req.file.buffer : null;
    const job = await jobService.createJob(req.body, fileBuffer, req.user);
    return sendSuccess(res, {
      statusCode: 201,
      message: 'Recruitment job created successfully',
      data: { job },
    });
  } catch (error) {
    next(error);
  }
}

async function updateJob(req, res, next) {
  try {
    const fileBuffer = req.file ? req.file.buffer : null;
    const job = await jobService.updateJob(req.params.id, req.body, fileBuffer, req.user);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Job updated successfully',
      data: { job },
    });
  } catch (error) {
    next(error);
  }
}

async function publishJob(req, res, next) {
  try {
    const isPublished = req.body.isPublished !== undefined ? req.body.isPublished : true;
    const job = await jobService.setJobPublishStatus(req.params.id, isPublished, req.user);
    return sendSuccess(res, {
      statusCode: 200,
      message: `Job ${isPublished ? 'published' : 'unpublished'} successfully`,
      data: { job },
    });
  } catch (error) {
    next(error);
  }
}

async function archiveJob(req, res, next) {
  try {
    const job = await jobService.archiveJob(req.params.id, req.user);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Job archived successfully',
      data: { job },
    });
  } catch (error) {
    next(error);
  }
}

async function deleteJob(req, res, next) {
  try {
    await jobService.deleteJob(req.params.id, req.user);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Job deleted successfully',
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listPublicJobs,
  getJobDetails,
  getEligibleJobs,
  checkJobEligibility,
  listAdminJobs,
  createJob,
  updateJob,
  publishJob,
  archiveJob,
  deleteJob,
};
