// src/routes/intervention-comment.routes.js
const express = require('express');
const InterventionCommentController = require('../controllers/intervention-comment.controller'); // Importar la clase
const { checkPermission } = require('../middleware/permission.middleware');
const { validateComment } = require('../middleware/validators');

const router = express.Router();
const interventionCommentController = new InterventionCommentController(); // Crear instancia explícita

// Rutas para comentarios de intervenciones
router.get(
    '/interventions/:interventionId/comments',
    checkPermission('comment', 'read'),
    async (req, res) => {
        try {
            const comments = await interventionCommentController.findAll(
                req.user,
                req.params.interventionId,
                req.query
            );
            res.status(200).json(comments);
        } catch (error) {
            res.status(error.status || 500).json({ error: error.message });
        }
    }
);

router.post(
    '/interventions/:interventionId/comments',
    checkPermission('comment', 'create'),
    validateComment,
    async (req, res) => {
        try {
            const newComment = await interventionCommentController.create(
                req.user,
                req.params.interventionId,
                req.body
            );
            res.status(201).json(newComment);
        } catch (error) {
            res.status(error.status || 500).json({ error: error.message });
        }
    }
);

router.put(
    '/comments/:id',
    checkPermission('comment', 'update'),
    validateComment,
    async (req, res) => {
        try {
            const updatedComment = await interventionCommentController.update(
                req.user,
                req.params.id,
                req.body
            );
            res.status(200).json(updatedComment);
        } catch (error) {
            res.status(error.status || 500).json({ error: error.message });
        }
    }
);

router.delete(
    '/comments/:id',
    checkPermission('comment', 'delete'),
    async (req, res) => {
        try {
            const result = await interventionCommentController.delete(
                req.user,
                req.params.id
            );
            res.status(200).json(result);
        } catch (error) {
            res.status(error.status || 500).json({ error: error.message });
        }
    }
);

module.exports = router;
