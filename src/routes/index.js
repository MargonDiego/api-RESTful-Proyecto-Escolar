// src/routes/index.js
const express = require('express');

const userRoutes = require('./user.routes');
const studentRoutes = require('./student.routes');
const interventionRoutes = require('./intervention.routes');
const authRoutes = require('./auth.routes');
const auditRoutes = require('./audit.routes');
const interventionCommentRoutes = require('./intervention-comment.routes');
const { notFoundHandler } = require('../utils/errors');

const router = express.Router();

router.use('/users', userRoutes);
router.use('/students', studentRoutes);
router.use('/interventions', interventionRoutes);
router.use('/auth', authRoutes);
router.use('/audit', auditRoutes);
router.use('/intervention-comments', interventionCommentRoutes);

// Manejo de rutas no encontradas y errores
router.use(notFoundHandler);

module.exports = router;
