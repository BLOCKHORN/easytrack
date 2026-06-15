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

### 1. Dashboard Operativo (Táctico)
- **Layout en 3 Bandas:** Diseño "unboxed" y minimalista que separa Inventario, Flujo Diario y Caja de Hoy.
- **Seguridad para Empleados:** Las métricas de ganancias están protegidas por el componente `PinGate.jsx`. Si el administrador establece un PIN en configuración, los números se ocultan tras un candado.
- **Actividad en Vivo:** Feed en tiempo real de entradas y salidas para dar sensación de pulso operativo.
- **Top Fidelidad:** Ranking de los mejores clientes mostrado tácticamente para mejorar el trato en el mostrador.

### 2. Área Financiera (Estratégica)
- **Capital Retenido:** Cálculo en base de datos (`get_area_personal_stats`) que suma el ingreso potencial de los paquetes físicos actualmente en el local.
- **Optimización ROI:** Algoritmo que detecta "agencias parásitas" (alto volumen, bajo margen) y sugiere mejoras de rentabilidad por estante.
- **Auditorías de Cierre:** Generación de snapshots inmutables del estado del negocio (exclusivo para usuarios PRO).

### 3. Configuración Modular (`ConfigPage`)
- Sistema centralizado de ajustes con detección de cambios (`dirty state`).
- Gestión visual de Almacén Dinámico (`num_rows` reemplazó a `rows` por seguridad SQL).
- Gestión de PIN de acceso mediante funciones RPC (`tenant_pin_status`, `tenant_pin_set`).

### 4. Gestión de Paquetes e IA
- **Infraestructura de IA**: El backend utiliza un sistema de redundancia con múltiples modelos de Gemini (`2.5-flash`, `2.0-flash`, `2.0-flash-lite`) y lógica de reintentos para errores 503.
- **Extracción de Datos**: Captura normalizada de `cliente`, `empresa` y `telefono`.
- **Logos de Agencias**: Componente `CarrierLogo.jsx` mapea dinámicamente nombres a logotipos oficiales a todo color.

---

## 💻 Convenciones y Ajustes de Servidor

### Frontend (Vite & UI Premium)
- **allowedHosts**: `true` en Vite para permitir conexiones ngrok durante el desarrollo móvil.
- **Estética Fintech:** Uso extensivo de tipografías pesadas (`font-[1000]`), Tailwind CSS, `framer-motion` para micro-interacciones, y layouts compactos sin bordes agresivos para maximizar la densidad de datos sin agobiar.
- **Sincronización Sticky**: Control estricto del eje Z y alturas fijas (`72px`) para la navegación móvil.

### Backend (Node.js & Supabase)
- **Trust Proxy**: Habilitado para capturar la IP real del cliente a través de túneles y Vercel.
- **RPCs Inteligentes**: Gran parte del "Business Intelligence" (cálculo de crecimiento, benchmarks globales, capital retenido) se ha delegado a funciones de PostgreSQL (`get_area_personal_stats`, `obtener_resumen_dashboard`) para garantizar tiempos de respuesta por debajo de los 100ms.
- **Servicios Unificados**: Evitar llamadas directas a `/api/X` con `API_BASE` hardcodeadas; utilizar siempre los servicios de `apps/frontend/src/services/` (ej. `billingService.js`).

---

## 📊 Base de Datos (Esquema Clave)

- `tenants`: Configuración del negocio, slug, Stripe ID y límites de IA.
- `packages`: Inventario vivo e histórico.
- `ubicaciones`: Estructura física del almacén. Utiliza `num_rows` para las alturas.
- `billing_plans` / `subscriptions`: Gestión del tier del usuario. En desarrollo ("lab"), los planes PRO y VIP se simulan mediante flags de base de datos (`plan_id = 'pro'`).

---

## 📝 Estado Actual y Tareas Pendientes (Junio 2026)
- ✅ **Completado:** Rediseño total del Dashboard y Área Financiera con métricas avanzadas (Capital Retenido, ROI, Benchmarks).
- ✅ **Completado:** Sistema de seguridad PIN integrado nativamente en los componentes financieros.
- ✅ **Completado:** Despliegue a rama `main` validado y sincronizado con Supabase Producción.
- ⏳ **Pendiente:** Sincronizar o poblar la tabla `billing_plans` del entorno de Laboratorio si se desean hacer pruebas locales de la pasarela de pago sin que se muestren datos hardcodeados o "dummy".
- ⏳ **Pendiente:** Realizar pruebas E2E (End-to-End) del flujo de registro -> pago en Stripe -> redirección, una vez Vercel haya terminado de desplegar `main`.

---
*Este documento es la "Verdad Única" para el desarrollo. Mantener actualizado tras cambios arquitectónicos significativos.*