/**
 * Result Controller
 */
const resultService = require('../services/result.service');
const { sendSuccess } = require('../utils/response.util');

async function listResults(req, res, next) {
  try {
    const { results, meta } = await resultService.listResults(req.query);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Results fetched successfully',
      data: { results },
      meta,
    });
  } catch (error) {
    next(error);
  }
}

async function getResult(req, res, next) {
  try {
    const result = await resultService.getResultById(req.params.id);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Result details fetched successfully',
      data: { result },
    });
  } catch (error) {
    next(error);
  }
}

async function listAdminResults(req, res, next) {
  try {
    const { results, meta } = await resultService.listAdminResults(req.query);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Admin results fetched successfully',
      data: { results },
      meta,
    });
  } catch (error) {
    next(error);
  }
}

async function createResult(req, res, next) {
  try {
    const fileBuffer = req.file ? req.file.buffer : null;
    const result = await resultService.createResult(req.body, fileBuffer, req.user);
    return sendSuccess(res, {
      statusCode: 201,
      message: 'Result created successfully',
      data: { result },
    });
  } catch (error) {
    next(error);
  }
}

async function updateResult(req, res, next) {
  try {
    const fileBuffer = req.file ? req.file.buffer : null;
    const result = await resultService.updateResult(req.params.id, req.body, fileBuffer, req.user);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Result updated successfully',
      data: { result },
    });
  } catch (error) {
    next(error);
  }
}

async function publishResult(req, res, next) {
  try {
    const isPublished = req.body.isPublished !== undefined ? req.body.isPublished : true;
    const result = await resultService.setPublishStatus(req.params.id, isPublished, req.user);
    return sendSuccess(res, {
      statusCode: 200,
      message: `Result ${isPublished ? 'published' : 'unpublished'} successfully`,
      data: { result },
    });
  } catch (error) {
    next(error);
  }
}

async function deleteResult(req, res, next) {
  try {
    await resultService.deleteResult(req.params.id);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Result deleted successfully',
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listResults,
  getResult,
  listAdminResults,
  createResult,
  updateResult,
  publishResult,
  deleteResult,
};
