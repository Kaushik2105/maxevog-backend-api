/**
 * Real-Time Socket.IO Service
 * Manages WebSocket connections, room subscription, and real-time broadcasts
 * for application stage progress, document updates, and desk assistance.
 */
const { Server } = require('socket.io');
const logger = require('../utils/logger.util');

let io = null;

/**
 * Initialize Socket.IO instance attached to the HTTP server
 */
function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.on('connection', (socket) => {
    logger.info(`[Socket.IO] Client connected: ${socket.id}`);

    // Join specific application room (e.g., candidate on ApplicationDetailPage or agent workbench)
    socket.on('join_application', (applicationId) => {
      if (applicationId) {
        socket.join(`application:${applicationId}`);
        logger.info(`[Socket.IO] Socket ${socket.id} joined room application:${applicationId}`);
      }
    });

    // Leave specific application room
    socket.on('leave_application', (applicationId) => {
      if (applicationId) {
        socket.leave(`application:${applicationId}`);
        logger.info(`[Socket.IO] Socket ${socket.id} left room application:${applicationId}`);
      }
    });

    // Join user room (for all personal candidate updates)
    socket.on('join_user', (userId) => {
      if (userId) {
        socket.join(`user:${userId}`);
        logger.info(`[Socket.IO] Socket ${socket.id} joined room user:${userId}`);
      }
    });

    // Join desk agents room (for active agents receiving assignments and progress)
    socket.on('join_agents', () => {
      socket.join('agents_room');
      logger.info(`[Socket.IO] Socket ${socket.id} joined agents_room`);
    });

    // Join admin room (for live administrative oversight)
    socket.on('join_admin', () => {
      socket.join('admin_room');
      logger.info(`[Socket.IO] Socket ${socket.id} joined admin_room`);
    });

    socket.on('disconnect', (reason) => {
      logger.info(`[Socket.IO] Client disconnected: ${socket.id} (reason: ${reason})`);
    });
  });

  return io;
}

/**
 * Get active io instance
 */
function getIO() {
  return io;
}

/**
 * Broadcast application updates in real time
 */
function emitApplicationUpdate(applicationId, data) {
  if (!io) return;
  try {
    io.to(`application:${applicationId}`).emit('application_updated', data);
    if (data?.userId) {
      io.to(`user:${data.userId}`).emit('application_updated', data);
    }
    io.to('agents_room').emit('application_updated', data);
    io.to('admin_room').emit('application_updated', data);
  } catch (err) {
    logger.warn('[Socket.IO] Failed to emit application_updated:', err.message);
  }
}

/**
 * Broadcast assistance session updates in real time
 */
function emitAssistanceUpdate(sessionId, data) {
  if (!io) return;
  try {
    io.to(`assistance:${sessionId}`).emit('assistance_updated', data);
    if (data?.userId) {
      io.to(`user:${data.userId}`).emit('assistance_updated', data);
    }
    io.to('agents_room').emit('assistance_updated', data);
    io.to('admin_room').emit('assistance_updated', data);
  } catch (err) {
    logger.warn('[Socket.IO] Failed to emit assistance_updated:', err.message);
  }
}

module.exports = {
  initSocket,
  getIO,
  emitApplicationUpdate,
  emitAssistanceUpdate,
};
