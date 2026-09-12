/**
 * Admit Card Controller
 */
const admitCardService = require('../services/admitCard.service');
const { sendSuccess } = require('../utils/response.util');

async function listAdmitCards(req, res, next) {
  try {
    const { admitCards, meta } = await admitCardService.listAdmitCards(req.query);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Admit cards fetched successfully',
      data: { admitCards },
      meta,
    });
  } catch (error) {
    next(error);
  }
}

async function getAdmitCard(req, res, next) {
  try {
    const admitCard = await admitCardService.getAdmitCardById(req.params.id);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Admit card fetched successfully',
      data: { admitCard },
    });
  } catch (error) {
    next(error);
  }
}

async function listAdminAdmitCards(req, res, next) {
  try {
    const { admitCards, meta } = await admitCardService.listAdminAdmitCards(req.query);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Admin admit cards fetched successfully',
      data: { admitCards },
      meta,
    });
  } catch (error) {
    next(error);
  }
}

async function createAdmitCard(req, res, next) {
  try {
    const fileBuffer = req.file ? req.file.buffer : null;
    const admitCard = await admitCardService.createAdmitCard(req.body, fileBuffer, req.user);
    return sendSuccess(res, {
      statusCode: 201,
      message: 'Admit card created successfully',
      data: { admitCard },
    });
  } catch (error) {
    next(error);
  }
}

async function updateAdmitCard(req, res, next) {
  try {
    const fileBuffer = req.file ? req.file.buffer : null;
    const admitCard = await admitCardService.updateAdmitCard(req.params.id, req.body, fileBuffer, req.user);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Admit card updated successfully',
      data: { admitCard },
    });
  } catch (error) {
    next(error);
  }
}

async function publishAdmitCard(req, res, next) {
  try {
    const isPublished = req.body.isPublished !== undefined ? req.body.isPublished : true;
    const admitCard = await admitCardService.setPublishStatus(req.params.id, isPublished, req.user);
    return sendSuccess(res, {
      statusCode: 200,
      message: `Admit card ${isPublished ? 'published' : 'unpublished'} successfully`,
      data: { admitCard },
    });
  } catch (error) {
    next(error);
  }
}

async function deleteAdmitCard(req, res, next) {
  try {
    await admitCardService.deleteAdmitCard(req.params.id);
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Admit card deleted successfully',
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listAdmitCards,
  getAdmitCard,
  listAdminAdmitCards,
  createAdmitCard,
  updateAdmitCard,
  publishAdmitCard,
  deleteAdmitCard,
};
