# Proyecto Easytrack - Documentación del Sistema

Easytrack es una plataforma SaaS multi-inquilino (multi-tenant) diseñada para la gestión logística de paquetes, estantes (ubicaciones) y automatización mediante IA.

## 🏗️ Arquitectura de Entornos y Despliegue

A partir de junio de 2026, el proyecto opera bajo un modelo de aislamiento total para garantizar la seguridad de los clientes en producción.

### 1. Entorno de Laboratorio (Desarrollo)
- **Host**: Hetzner (Bare Metal).
- **Acceso**: Túnel ngrok dinámico y Tailscale (puerto 5173).
- **Base de Datos**: Proyecto Supabase independiente (`isffcijmzmdzrnsubdeg`).
- **Configuración**: Archivos `.env` locales en `apps/backend` y `apps/frontend` (Nunca subir a Git).
- **Seguridad**: RLS desactivado en el laboratorio para agilidad de desarrollo.

### 2. Entorno de Producción
- **Frontend**: Vercel (conectado a rama `main`).
- **Backend**: Render (conectado a rama `main`).
- **Base de Datos**: Proyecto Supabase principal (`goehrvohidoqsoadwhrj`).
- **Variables**: Gestionadas exclusivamente desde los paneles de Vercel/Render.

### 3. Flujo de Trabajo Git (Protocolo Safe-to-Prod)
1. **Desarrollo**: Se trabaja siempre en la rama `desarrollo`.
2. **Guardado**: `git add .` -> `git commit` -> `git push origin desarrollo`.
3. **Publicación**: Una vez validado en el laboratorio:
   - Sincronizar cambios estructurales en el Supabase de Producción (SQL).
   - Merge de `desarrollo` a `main`.
   - `git push origin main` activa el despliegue automático.

---

## 🚀 Módulos y Flujos Principales

### 1. Onboarding y UX Guiado
- **Onboarding Tour**: Sistema de guiado interactivo (`OnboardingTour.jsx`) que se activa para nuevos usuarios. Detecta el estado mediante `localStorage` (`onboarding_done`).
- **Corrección Crítica**: El tooltip se oculta automáticamente si el elemento objetivo desaparece durante la navegación, reapareciendo solo cuando detecta el nuevo objetivo.

### 2. Configuración Modular (`ConfigPage`)
Sistema centralizado de ajustes con detección de cambios (`dirty state`) y snapshots:
- **Identidad**: Nombre de empresa y configuración básica.
- **Transportistas**: Gestión de agencias de transporte y precios de entrega.
- **Almacén Dinámico**: Configuración visual de estantes y huecos.
- **Seguridad**: Gestión de PIN de acceso para operarios mediante funciones RPC (`tenant_pin_status`, `tenant_pin_set`, etc.).

### 3. Gestión de Paquetes e IA
... (rest of the file as before) ...

## 💻 Convenciones y Ajustes de Servidor

### Frontend (Vite)
- **allowedHosts**: En desarrollo, Vite está configurado con `allowedHosts: true` en `vite.config.js` para permitir el acceso a través de túneles ngrok sin bloqueos de seguridad.

### Backend (Node.js)
- **Trust Proxy**: Habilitado (`app.set('trust proxy', 1)`) para capturar correctamente la IP del cliente a través de ngrok/Vercel.
- **Logging**: Incluye un middleware de logging básico para monitorear rutas y tiempos de respuesta en desarrollo.

---
*Este documento es la "Verdad Única" para el desarrollo. Mantener actualizado tras cambios arquitectónicos significativos.*

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
