// src/database/seeds/index.js
const { createConnection } = require('typeorm');
const dbConfig = require('../../config/database');
const bcrypt = require('bcryptjs');
const logger = require('../../config/logger');

async function seed() {
    let connection;
    try {
        connection = await createConnection(dbConfig);

        // 1. Crear usuarios iniciales
        const userRepository = connection.getRepository('User');
        const users = await userRepository.save([
            {
                firstName: 'Admin',
                lastName: 'Sistema',
                email: 'admin@sistema.com',
                password: await bcrypt.hash('Admin123!', 10),
                rut: '11.111.111-1',
                role: 'Admin',
                staffType: 'Directivo',
                department: 'Dirección',
                isActive: true
            },
            {
                firstName: 'Usuario',
                lastName: 'Normal',
                email: 'usuario@sistema.com',
                password: await bcrypt.hash('Usuario123!', 10),
                rut: '22.222.222-2',
                role: 'User',
                staffType: 'Docente',
                department: 'Departamento Lenguaje',
                isActive: true
            }
        ]);

        // 2. Crear estudiantes de prueba
        const studentRepository = connection.getRepository('Student');
        const students = await studentRepository.save([
            {
                firstName: 'Juan',
                lastName: 'Pérez',
                rut: '33.333.333-3',
                birthDate: new Date('2010-01-01'),
                grade: '8° Básico',
                academicYear: 2024,
                section: 'A',
                matriculaNumber: 'MAT001',
                comuna: 'Santiago',
                region: 'Metropolitana',
                apoderadoTitular: {
                    nombre: 'María Pérez',
                    rut: '44.444.444-4',
                    telefono: '+56912345678',
                    parentesco: 'Madre'
                },
                contactosEmergencia: [
                    {
                        nombre: 'María Pérez',
                        telefono: '+56912345678',
                        parentesco: 'Madre'
                    }
                ]
            },
            {
                firstName: 'Ana',
                lastName: 'García',
                rut: '55.555.555-5',
                birthDate: new Date('2009-06-15'),
                grade: '8° Básico',
                academicYear: 2024,
                section: 'A',
                matriculaNumber: 'MAT002',
                comuna: 'Santiago',
                region: 'Metropolitana',
                apoderadoTitular: {
                    nombre: 'Pedro García',
                    rut: '66.666.666-6',
                    telefono: '+56987654321',
                    parentesco: 'Padre'
                },
                contactosEmergencia: [
                    {
                        nombre: 'Pedro García',
                        telefono: '+56987654321',
                        parentesco: 'Padre'
                    }
                ]
            }
        ]);

        // 3. Crear algunas intervenciones de prueba
        const interventionRepository = connection.getRepository('Intervention');
        await interventionRepository.save([
            {
                title: 'Dificultad en matemáticas',
                description: 'El estudiante presenta dificultades en operaciones básicas',
                type: 'Académica',
                status: 'En Proceso',
                priority: 'Alta',
                dateReported: new Date(),
                interventionScope: 'Individual',
                student: students[0],
                informer: users[1],
                responsible: users[1]
            },
            {
                title: 'Problema de conducta',
                description: 'Comportamiento disruptivo en clase',
                type: 'Conductual',
                status: 'Pendiente',
                priority: 'Media',
                dateReported: new Date(),
                interventionScope: 'Individual',
                student: students[1],
                informer: users[1],
                responsible: users[0]
            }
        ]);

        logger.info('Datos de prueba insertados correctamente');
    } catch (error) {
        logger.error('Error al insertar datos de prueba:', error);
    } finally {
        if (connection) {
            await connection.close();
        }
    }
}

seed();