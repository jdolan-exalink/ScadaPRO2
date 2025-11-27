# 🤝 Guía de Contribución - SCADA Pro

¡Gracias por tu interés en contribuir a **SCADA Pro**! Este documento explica cómo puedes ayudar al proyecto.

## 📋 Código de Conducta

Este proyecto sigue un código de conducta para asegurar un ambiente colaborativo e inclusivo. Al participar, aceptas:

- Ser respetuoso con todos los colaboradores
- Mantener un lenguaje profesional
- Aceptar constructivamente críticas y sugerencias
- Enfocarte en lo que es mejor para el proyecto

## 🚀 Cómo Contribuir

### 1. Preparar el Entorno de Desarrollo

```bash
# Clonar el repositorio
git clone https://github.com/your-org/SCADApro.git
cd SCADApro

# Instalar dependencias
npm install

# Configurar entorno
cp .env.example .env.local

# Iniciar desarrollo
npm run dev
```

### 2. Flujo de Trabajo

#### Para Nuevas Características
```bash
# Crear rama desde main
git checkout -b feature/nueva-caracteristica

# Hacer cambios
# ...

# Verificar calidad del código
npm run lint
npm run type-check
npm run build

# Commit con mensaje descriptivo
git commit -m "feat: agregar nueva caracteristica

- Descripción de cambios
- Impacto en el sistema
- Tests realizados"

# Push y crear PR
git push origin feature/nueva-caracteristica
```

#### Para Corrección de Bugs
```bash
# Crear rama para el fix
git checkout -b fix/nombre-del-bug

# Hacer cambios
# ...

# Verificar que el fix funciona
npm run build

# Commit
git commit -m "fix: corregir bug en [componente]

- Descripción del problema
- Solución implementada
- Tests realizados"

# Push y crear PR
git push origin fix/nombre-del-bug
```

### 3. Estándares de Código

#### TypeScript/React
- Usar TypeScript estrictamente
- Interfaces para todos los props y state
- Funciones con tipado explícito
- Evitar `any` - usar tipos específicos

#### Estilo de Código
```typescript
// ✅ Correcto
interface WidgetProps {
  id: string;
  title: string;
  sensorCode: string;
}

const LineChartWidget: React.FC<WidgetProps> = ({ id, title, sensorCode }) => {
  // ...
};

// ❌ Incorrecto
const LineChartWidget = ({ id, title, sensorCode }) => {
  // ...
};
```

#### Commits
Seguir [Conventional Commits](https://conventionalcommits.org/):

```
feat: nueva caracteristica
fix: correccion de bug
docs: actualizacion de documentacion
style: cambios de formato
refactor: refactorizacion de codigo
test: agregar tests
chore: tareas de mantenimiento
```

### 4. Testing

```bash
# Verificar linting
npm run lint

# Verificar tipos
npm run type-check

# Verificar formato
npm run format:check

# Build de producción
npm run build

# Tests (cuando estén disponibles)
npm run test
```

### 5. Documentación

#### Actualizar README
- Mantener actualizado con nuevas características
- Documentar cambios importantes
- Incluir ejemplos de uso

#### Documentar Código
```typescript
/**
 * LineChartWidget - Componente para gráficos históricos
 *
 * @param id - ID único del widget
 * @param title - Título a mostrar
 * @param sensorCode - Código del sensor para datos históricos
 * @param unit - Unidad de medida (opcional)
 */
const LineChartWidget: React.FC<WidgetProps> = ({ id, title, sensorCode, unit }) => {
  // ...
};
```

## 🐛 Reportar Bugs

Usar el template de bug report en GitHub Issues:

```markdown
**Descripción del Bug**
Breve descripción del problema

**Pasos para Reproducir**
1. Ir a '...'
2. Hacer click en '...'
3. Ver error

**Comportamiento Esperado**
Qué debería pasar

**Comportamiento Actual**
Qué pasa en realidad

**Capturas de Pantalla**
Si aplica

**Entorno**
- OS: [Windows/Linux/Mac]
- Browser: [Chrome/Firefox/Safari]
- Version: [0.1.0]
```

## 💡 Sugerir Características

Usar el template de feature request:

```markdown
**¿Qué problema resuelve esta característica?**
Descripción del problema actual

**Solución Propuesta**
Descripción de la solución

**Alternativas Consideradas**
Otras soluciones evaluadas

**Contexto Adicional**
Cualquier información relevante
```

## 📖 Tipos de Contribuciones

### 💻 Desarrollo
- Nuevas características
- Corrección de bugs
- Optimización de rendimiento
- Mejoras de UI/UX

### 📚 Documentación
- Guías de usuario
- Documentación técnica
- Tutoriales
- Traducciones

### 🧪 Testing
- Unit tests
- Integration tests
- E2E tests
- Performance tests

### 🎨 Diseño
- UI/UX improvements
- Iconos y assets
- Temas y estilos

### 🌐 Internacionalización
- Traducciones
- Soporte multi-idioma

## 🔧 Configuración de Desarrollo

### VSCode Recomendado
Extensiones necesarias:
- TypeScript and JavaScript Language Features
- ESLint
- Prettier
- Tailwind CSS IntelliSense

### Pre-commit Hooks (Futuro)
```bash
# Configurar husky para pre-commit hooks
npm run prepare
```

## 📋 Checklist para Pull Requests

Antes de enviar un PR, verificar:

- [ ] Código sigue los estándares del proyecto
- [ ] `npm run lint` pasa sin errores
- [ ] `npm run type-check` pasa sin errores
- [ ] `npm run build` funciona correctamente
- [ ] Tests pasan (cuando aplicable)
- [ ] Documentación actualizada
- [ ] Commits siguen conventional commits
- [ ] PR tiene descripción clara
- [ ] Cambios probados en diferentes navegadores

## 🎯 Áreas de Alto Impacto

Características que el proyecto necesita:

### Críticas
- Sistema de autenticación/usuarios
- Tests automatizados
- CI/CD pipeline
- Monitoreo y logging avanzado

### Importantes
- Más tipos de widgets
- Export/import de configuraciones
- Temas personalizables
- Notificaciones en tiempo real

### Mejoras
- Optimización de rendimiento
- PWA capabilities
- Soporte offline
- API REST completa

## 📞 Comunicación

- **Issues**: Para bugs y feature requests
- **Discussions**: Para preguntas generales
- **Discord/Slack**: Para chat en tiempo real (futuro)

## 🙏 Reconocimiento

Todos los contribuidores serán reconocidos en:
- Archivo CONTRIBUTORS.md
- Release notes
- Menciones especiales en documentación

---

¡Gracias por contribuir a hacer SCADA Pro mejor! 🚀