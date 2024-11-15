// src/routes/user.routes.js
const express = require('express');
const UserController = require('../controllers/user.controller'); // Importación de la clase
const { checkRole, checkPermission } = require('../middleware/permission.middleware');
const { validateUser } = require('../middleware/validators');

const router = express.Router();
const userController = new UserController(); // Instancia explícita

// Rutas para usuarios
router.get(
    '/',
    checkPermission('user', 'read'),
    async (req, res) => {
        try {
            const users = await userController.findAll(req.user, req.query);
            res.status(200).json(users);
        } catch (error) {
            res.status(error.status || 500).json({ error: error.message });
        }
    }
);

router.get(
    '/:id',
    checkPermission('user', 'read'),
    async (req, res) => {
        try {
            const user = await userController.findOne(req.user, req.params.id);
            res.status(200).json(user);
        } catch (error) {
            res.status(error.status || 500).json({ error: error.message });
        }
    }
);

router.post(
    '/',
    checkRole(['Admin']),
    validateUser,
    async (req, res) => {
        try {
            const newUser = await userController.create(req.user, req.body);
            res.status(201).json(newUser);
        } catch (error) {
            res.status(error.status || 500).json({ error: error.message });
        }
    }
);

router.put(
    '/:id',
    checkPermission('user', 'update'),
    validateUser,
    async (req, res) => {
        try {
            const updatedUser = await userController.update(req.user, req.params.id, req.body);
            res.status(200).json(updatedUser);
        } catch (error) {
            res.status(error.status || 500).json({ error: error.message });
        }
    }
);

router.delete(
    '/:id',
    checkPermission('user', 'delete'),
    async (req, res) => {
        try {
            const result = await userController.delete(req.user, req.params.id);
            res.status(200).json(result);
        } catch (error) {
            res.status(error.status || 500).json({ error: error.message });
        }
    }
);

module.exports = router;
