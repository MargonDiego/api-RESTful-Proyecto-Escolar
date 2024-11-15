# Sistema de Gestión Educativa - API REST

## 📋 Descripción
API RESTful para la gestión de estudiantes, intervenciones y seguimiento educativo. Desarrollada con Node.js, Express y TypeORM, proporciona una interfaz robusta para el manejo de información académica y seguimiento estudiantil.

## 🚀 Características Principales
- Gestión completa de usuarios con roles y permisos
- Sistema de autenticación JWT con refresh tokens
- Gestión de estudiantes e intervenciones
- Sistema de auditoría completo
- Caché con Redis
- Logging rotativo
- Validaciones robustas
- Manejo de errores centralizado

## 🛠️ Tecnologías Utilizadas
- Node.js
- Express.js
- TypeORM
- SQLite
- Redis
- JWT
- Winston

## 📦 Requisitos Previos
- Node.js (v14 o superior)
- npm o yarn
- Redis Server
- SQLite

## 🔧 Instalación

1. **Clonar el repositorio**
```bash
git clone [URL_DEL_REPOSITORIO]
cd [NOMBRE_DEL_PROYECTO]
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar variables de entorno**
```bash
cp .env.example .env
# Editar .env con tus configuraciones
```

4. **Iniciar Redis**
```bash
# En Linux/Mac
redis-server

# En Windows (con WSL)
sudo service redis-server start
```

5. **Ejecutar migraciones**
```bash
npm run migration:run
```

6. **Iniciar el servidor**
```bash
# Desarrollo
npm run dev

# Producción
npm start
```

## 🗄️ Estructura del Proyecto
```
src/
├── config/          # Configuraciones (DB, cache, logger)
├── controllers/     # Controladores de la aplicación
├── entities/        # Modelos de datos
├── middleware/      # Middlewares personalizados
├── routes/          # Rutas de la API
├── utils/          # Utilidades y helpers
├── logs/           # Archivos de log
└── server.js       # Punto de entrada
```

## 📚 API Endpoints

### 🔐 Autenticación
```
POST   /api/auth/login            # Iniciar sesión
POST   /api/auth/refresh-token    # Refrescar token
POST   /api/auth/logout           # Cerrar sesión
POST   /api/auth/reset-password   # Resetear contraseña
```

### 👥 Usuarios
```
GET    /api/users                 # Listar usuarios
GET    /api/users/:id            # Obtener usuario
POST   /api/users                # Crear usuario
PUT    /api/users/:id            # Actualizar usuario
DELETE /api/users/:id            # Eliminar usuario
```

### 👨‍🎓 Estudiantes
```
GET    /api/students             # Listar estudiantes
GET    /api/students/:id        # Obtener estudiante
POST   /api/students            # Crear estudiante
PUT    /api/students/:id        # Actualizar estudiante
DELETE /api/students/:id        # Eliminar estudiante
```

### 📝 Intervenciones
```
GET    /api/interventions             # Listar intervenciones
GET    /api/interventions/:id         # Obtener intervención
POST   /api/interventions             # Crear intervención
PUT    /api/interventions/:id         # Actualizar intervención
DELETE /api/interventions/:id         # Eliminar intervención
```

### 💬 Comentarios de Intervenciones
```
GET    /api/interventions/:id/comments     # Listar comentarios
POST   /api/interventions/:id/comments     # Crear comentario
PUT    /api/comments/:id                   # Actualizar comentario
DELETE /api/comments/:id                   # Eliminar comentario
```

## 🔑 Roles y Permisos

### Roles Disponibles
- **Admin**: Acceso completo al sistema
- **User**: Acceso a operaciones normales
- **Viewer**: Acceso solo lectura

### Matriz de Permisos
| Recurso       | Admin | User  | Viewer |
|---------------|-------|--------|---------|
| Usuarios      | CRUD  | R      | R       |
| Estudiantes   | CRUD  | CRUD   | R       |
| Intervenciones| CRUD  | CRUD   | R       |
| Comentarios   | CRUD  | CRUD   | R       |

## 📊 Sistema de Auditoría
- Registro completo de acciones
- Seguimiento de cambios
- Logs detallados
- Reportes de actividad

## ⚙️ Scripts Disponibles
```bash
# Desarrollo
npm run dev           # Iniciar servidor en modo desarrollo

# Producción
npm start            # Iniciar servidor en producción

# Base de datos
npm run migration:create   # Crear nueva migración
npm run migration:run     # Ejecutar migraciones
npm run migration:revert  # Revertir última migración
npm run db:seed          # Poblar base de datos

# Tests
npm test             # Ejecutar tests
npm run test:watch   # Ejecutar tests en modo watch
npm run test:coverage # Generar reporte de cobertura

# Linting
npm run lint        # Verificar estilo de código
npm run lint:fix    # Corregir estilo de código
```

## 🔒 Configuración de Seguridad
- JWT con refresh tokens
- Rate limiting
- CORS configurado
- Helmet para headers HTTP
- Validación de datos
- Encriptación de contraseñas
- Protección contra ataques comunes

## 📝 Logs
- Rotación diaria de logs
- Separación de logs por nivel
- Formato JSON para mejor análisis
- Almacenamiento de errores detallado

## 🚀 Recomendaciones de Despliegue
1. Configurar variables de entorno
2. Asegurar conexiones de base de datos
3. Configurar Redis para producción
4. Establecer límites de tasa apropiados
5. Habilitar HTTPS
6. Configurar respaldos automáticos

## 🐛 Resolución de Problemas
- Verificar logs en `logs/`
- Comprobar conexión a Redis
- Validar variables de entorno
- Revisar permisos de archivos
- Verificar estado de la base de datos

## 🤝 Contribución
1. Fork del repositorio
2. Crear rama feature (`git checkout -b feature/AmazingFeature`)
3. Commit de cambios (`git commit -m 'Add AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir Pull Request

## 📄 Licencia
Este proyecto es de uso comun.

## 👥 Autores
- **[Diego Martinez]** - *Trabajo Inicial*

## 📮 Contacto
- Email: [martinez gonzalez]
- Proyecto: []
