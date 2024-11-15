// src/routes/intervention.routes.js
const express = require('express');
const InterventionController = require('../controllers/intervention.controller'); // Importar la clase
const { checkPermission } = require('../middleware/permission.middleware');
const { validateIntervention } = require('../middleware/validators');

const router = express.Router();
const interventionController = new InterventionController(); // Crear instancia explícita

// Rutas para intervenciones
router.get(
    '/',
    checkPermission('intervention', 'read'),
    async (req, res) => {
        try {
            const interventions = await interventionController.findAll(req.user, req.query);
            res.status(200).json(interventions);
        } catch (error) {
            res.status(error.status || 500).json({ error: error.message });
        }
    }
);

router.get(
    '/:id',
    checkPermission('intervention', 'read'),
    async (req, res) => {
        try {
            const intervention = await interventionController.findOne(req.user, req.params.id);
            res.status(200).json(intervention);
        } catch (error) {
            res.status(error.status || 500).json({ error: error.message });
        }
    }
);

router.post(
    '/',
    checkPermission('intervention', 'create'),
    validateIntervention,
    async (req, res) => {
        try {
            const newIntervention = await interventionController.create(req.user, req.body);
            res.status(201).json(newIntervention);
        } catch (error) {
            res.status(error.status || 500).json({ error: error.message });
        }
    }
);

router.put(
    '/:id',
    checkPermission('intervention', 'update'),
    validateIntervention,
    async (req, res) => {
        try {
            const updatedIntervention = await interventionController.update(req.user, req.params.id, req.body);
            res.status(200).json(updatedIntervention);
        } catch (error) {
            res.status(error.status || 500).json({ error: error.message });
        }
    }
);

router.delete(
    '/:id',
    checkPermission('intervention', 'delete'),
    async (req, res) => {
        try {
            const result = await interventionController.delete(req.user, req.params.id);
            res.status(200).json(result);
        } catch (error) {
            res.status(error.status || 500).json({ error: error.message });
        }
    }
);

module.exports = router;
