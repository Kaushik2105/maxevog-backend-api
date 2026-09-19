/**
 * Application Controller
 */
const applicationService = require('../services/application.service');
const { sendSuccess } = require('../utils/response.util');

async function createApplication(req, res, next) {
  try {
    const { jobId } = req.body;
    const application = await applicationService.createApplication({
      userId: req.user.id,
      jobId,
    });

    return sendSuccess(res, {
      statusCode: 201,
      message: 'Application tracking started successfully',
      data: { application },
    });
  } catch (error) {
    next(error);
  }
}

async function getUserApplications(req, res, next) {
  try {
    const { applications, meta } = await applicationService.getUserApplications(req.user.id, req.query);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Applications fetched successfully',
      data: { applications },
      meta,
    });
  } catch (error) {
    next(error);
  }
}

async function getApplicationDetails(req, res, next) {
  try {
    const application = await applicationService.getApplicationById(req.params.id, req.user);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Application details fetched successfully',
      data: { application },
    });
  } catch (error) {
    next(error);
  }
}

async function authorizeSubmission(req, res, next) {
  try {
    const application = await applicationService.authorizeSubmission(req.params.id, req.user.id, req.body);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Submission explicitly authorized by applicant',
      data: { application },
    });
  } catch (error) {
    next(error);
  }
}

async function completeSubmission(req, res, next) {
  try {
    const fileBuffer = req.file ? req.file.buffer : null;
    const application = await applicationService.completeSubmission(
      req.params.id,
      req.body,
      fileBuffer,
      req.user
    );

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Application submission completed successfully with receipt',
      data: { application },
    });
  } catch (error) {
    next(error);
  }
}

async function updateStatus(req, res, next) {
  try {
    const { status } = req.body;
    const application = await applicationService.updateApplicationStatus(req.params.id, status, req.user);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Application status updated successfully',
      data: { application },
    });
  } catch (error) {
    next(error);
  }
}

async function uploadDocument(req, res, next) {
  try {
    const result = await applicationService.addApplicationDocument(req.params.id, req.file, req.user);
    return sendSuccess(res, {
      statusCode: 201,
      message: 'Document uploaded and attached successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function deleteDocument(req, res, next) {
  try {
    const result = await applicationService.deleteApplicationDocument(req.params.id, req.params.docId, req.user);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Document deleted successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function viewDocument(req, res, next) {
  try {
    const { document } = await applicationService.getApplicationDocument(req.params.id, req.params.docId, req.user);
    if (!document.url) {
      return res.status(404).json({ success: false, message: 'Document URL not found' });
    }
    return res.redirect(document.url);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createApplication,
  getUserApplications,
  getApplicationDetails,
  authorizeSubmission,
  completeSubmission,
  updateStatus,
  uploadDocument,
  deleteDocument,
  viewDocument,
};
