# Proyecto Easytrack - Documentación del Sistema

Easytrack es una plataforma SaaS multi-inquilino (multi-tenant) diseñada para la gestión logística de paquetes, estantes (ubicaciones) y automatización mediante IA.

## 🏗️ Arquitectura del Proyecto

El proyecto sigue una estructura de monorepo simplificada:

- **`apps/backend`**: Servidor Node.js (Express) que gestiona la lógica de negocio, IA y pagos.
- **`apps/frontend`**: Aplicación Single Page (React 19) optimizada para velocidad y UX.

### Stack Tecnológico
- **Frontend**: React 19, Vite, Tailwind CSS, Framer Motion (animaciones), Lucide React (iconos), Recharts.
- **Backend**: Node.js, Express, Supabase (PostgreSQL + Auth), Stripe (Pagos), Google Gemini (IA).
- **Infraestructura**: Supabase (Service Role en backend para bypass RLS), Google Gemini SDK.

---

## 🚀 Módulos y Flujos Principales

### 1. Onboarding y UX Guiado
- **Onboarding Tour**: Sistema de guiado interactivo (`OnboardingTour.jsx`) que se activa para nuevos usuarios. Detecta el estado mediante `localStorage` (`onboarding_done`).
- **Import Wizard**: Asistente de importación masiva (`ImportWizard.jsx`) con flujo de 3 pasos (Pegar -> Revisar -> Confirmar) para facilitar la migración de datos.

### 2. Configuración Modular (`ConfigPage`)
Sistema centralizado de ajustes con detección de cambios (`dirty state`) y snapshots:
- **Identidad**: Nombre de empresa y configuración básica.
- **Transportistas**: Gestión de agencias de transporte y precios de entrega.
- **Almacén Dinámico**: Configuración visual de estantes y huecos.
- **Seguridad**: Gestión de PIN de acceso para operarios.

### 3. Gestión de Paquetes e IA
- **Registro Inteligente**: `AnadirPaquete.jsx` integra escaneo de etiquetas mediante IA.
- **Infraestructura de IA**: El backend utiliza un sistema de redundancia con múltiples modelos de Gemini (`2.5-flash`, `2.0-flash`, `2.0-flash-lite`) y lógica de reintentos para errores 503.
- **Extracción de Datos**: El prompt está optimizado para capturar `cliente`, `empresa` (normalizada) y `telefono`.
- **Seguimiento de Uso**: Registro de tokens consumidos por inquilino mediante la función RPC `increment_ai_usage`.

### 4. Gestión de Inquilinos (Multi-tenancy)
- Aislamiento total mediante `tenant_id`.
- El frontend gestiona el contexto global en `TenantContext.jsx`.
- Middleware `subscriptionFirewall` bloquea funcionalidades premium según el estado de Stripe.

---

## 💻 Convenciones de Desarrollo

### Backend (CommonJS)
- **Controladores**: Manejan la lógica de negocio.
- **Utils**: `supabaseClient.js` expone `supabaseAdmin` para operaciones administrativas y `supabaseAuth` para verificaciones de usuario.
- **Rutas**: Protegidas por `requireAuth`.

### Frontend (React Moderno)
- **Componentes**: Uso de `motion` (Framer Motion) para transiciones fluidas.
- **Servicios**: Los servicios en `src/services/` (ej. `paquetesService.js`) centralizan las llamadas a la API y normalizan las respuestas.
- **Estilos**: Tailwind CSS con una paleta personalizada (`brand-500` para el color corporativo).

---

## 📊 Base de Datos (Esquema Clave)

- `tenants`: Configuración del negocio, slug, Stripe ID y límites de IA.
- `packages`: Inventario. Soporta esquema nuevo (`ubicacion_id`, `ubicacion_label`) y legacy (`balda_id`, `compartimento`).
- `ubicaciones`: Estructura física del almacén (etiquetas, orden, coordenadas).
- `memberships`: Vínculo entre usuarios de Auth y inquilinos.
- `billing_plans`: Definición de planes y límites.

---
*Este documento es la "Verdad Única" para el desarrollo. Mantener actualizado tras cambios arquitectónicos significativos.*
