// src/routes/student.routes.js
const express = require('express');
const StudentController = require('../controllers/student.controller'); // Importar la clase
const { checkPermission } = require('../middleware/permission.middleware');
const { validateStudent } = require('../middleware/validators');

const router = express.Router();
const studentController = new StudentController(); // Crear instancia explícita

// Rutas para estudiantes
router.get(
    '/',
    checkPermission('student', 'read'),
    async (req, res) => {
        try {
            const students = await studentController.findAll(req.user, req.query);
            res.status(200).json(students);
        } catch (error) {
            res.status(error.status || 500).json({ error: error.message });
        }
    }
);

router.get(
    '/:id',
    checkPermission('student', 'read'),
    async (req, res) => {
        try {
            const student = await studentController.findOne(req.user, req.params.id);
            res.status(200).json(student);
        } catch (error) {
            res.status(error.status || 500).json({ error: error.message });
        }
    }
);

router.post(
    '/',
    checkPermission('student', 'create'),
    validateStudent,
    async (req, res) => {
        try {
            const newStudent = await studentController.create(req.user, req.body);
            res.status(201).json(newStudent);
        } catch (error) {
            res.status(error.status || 500).json({ error: error.message });
        }
    }
);

router.put(
    '/:id',
    checkPermission('student', 'update'),
    validateStudent,
    async (req, res) => {
        try {
            const updatedStudent = await studentController.update(req.user, req.params.id, req.body);
            res.status(200).json(updatedStudent);
        } catch (error) {
            res.status(error.status || 500).json({ error: error.message });
        }
    }
);

router.delete(
    '/:id',
    checkPermission('student', 'delete'),
    async (req, res) => {
        try {
            const result = await studentController.delete(req.user, req.params.id);
            res.status(200).json(result);
        } catch (error) {
            res.status(error.status || 500).json({ error: error.message });
        }
    }
);

module.exports = router;
