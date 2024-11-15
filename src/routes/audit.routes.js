// src/routes/audit.routes.js
const express = require('express');
const BaseController = require('../controllers/base.controller');
const { checkRole } = require('../middleware/permission.middleware');
const { validateAuditQuery } = require('../middleware/validators');

const router = express.Router();
const auditController = new BaseController('Audit'); // Instancia para el manejo de auditoría

// Ruta para consultar registros de auditoría (solo para Admin)
router.get(
    '/',
    checkRole(['Admin']),
    validateAuditQuery,
    async (req, res) => {
        try {
            const { entityName, action, userId, module, dateFrom, dateTo } = req.query;
            const { page, limit, skip, order } = auditController.buildPaginationQuery(req);

            const filters = {};
            if (entityName) filters.entityName = entityName;
            if (action) filters.action = action;
            if (userId) filters.userId = userId;
            if (module) filters.module = module;
            if (dateFrom || dateTo) filters.createdAt = {
                ...(dateFrom && { $gte: dateFrom }),
                ...(dateTo && { $lte: dateTo }),
            };

            const repository = await auditController.getRepository();
            const [results, total] = await repository.findAndCount({
                where: filters,
                skip,
                take: limit,
                order: order || { createdAt: 'DESC' }
            });

            res.status(200).json(auditController.buildResponse(results, page, limit, total));
        } catch (error) {
            res.status(500).json({ error: 'Error al consultar la auditoría', details: error.message });
        }
    }
);

module.exports = router;
