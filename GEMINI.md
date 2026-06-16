# Proyecto Easytrack - Documentación del Sistema

Easytrack es una plataforma SaaS multi-inquilino (multi-tenant) diseñada para la gestión logística de paquetes, estantes (ubicaciones) y automatización mediante IA.

## 🏗️ Arquitectura de Entornos y Despliegue

A partir de junio de 2026, el proyecto opera bajo un modelo de aislamiento total para garantizar la seguridad de los clientes en producción.

### 1. Entorno de Laboratorio (Desarrollo)
- **Host**: Hetzner (Bare Metal).
- **Acceso**: Túnel ngrok dinámico y Tailscale (puerto 5173).
- **Base de Datos**: Proyecto Supabase independiente (`isffcijmzmdzrnsubdeg`).
- **Seguridad**: RLS desactivado en el laboratorio para agilidad de desarrollo.

### 2. Entorno de Producción
- **Frontend**: Vercel (conectado a rama `main`).
- **Backend**: Render (conectado a rama `main`).
- **Base de Datos**: Proyecto Supabase principal (`goehrvohidoqsoadwhrj`).
- **Backups**: Copia de seguridad limpia en `/root/Easytrack_PROD_BACKUP_LATEST`.

### 3. Flujo de Trabajo Git (Protocolo Safe-to-Prod)
1. **Desarrollo**: Se trabaja siempre en la rama `desarrollo`.
2. **Guardado**: `git add .` -> `git commit` -> `git push origin desarrollo`.
3. **Publicación**: Una vez validado en el laboratorio:
   - Sincronizar cambios estructurales en el Supabase de Producción (SQL).
   - Merge de `desarrollo` a `main`.
   - `git push origin main` activa el despliegue automático.

---

## 🚀 Módulos y Flujos Principales

### 1. Centro de Mando Global (Admin Dashboard)
- **Localización**: `/admin/dashboard`.
- **Métricas Tácticas**: MRR real (excluye VIPs), Salud de Red, Flujo Global y Gasto Gemini en tiempo real.
- **Micro-Pricing**: Los costes de IA se calculan y muestran con precisión de 4 decimales (Micro-EUR).
- **Cuentas VIP**: Slugs `blockhorn` y `estanco-benidoleig` están excluidos de las métricas de ingresos para no falsear el crecimiento.

### 2. Dashboard Operativo y Auditoría
- **Layout en 3 Bandas:** Diseño "unboxed" que separa Inventario, Flujo Diario y Caja de Hoy.
- **Auditoría Accionable**: Gestión de paquetes estancados mediante tarjetas móviles con botón "Entregar" integrado (actualización optimista).
- **Seguridad PIN**: Las métricas de ganancias se ocultan tras un candado (`PinGate.jsx`) si el administrador establece un PIN.

### 3. Área Financiera (Estratégica)
- **Capital Retenido:** Cálculo en base de datos que suma el ingreso potencial de los paquetes físicos actualmente en el local.
- **Optimización ROI:** Algoritmo que detecta "agencias parásitas" (alto volumen, bajo margen).

### 4. Configuración Modular (`ConfigPage`)
- Gestión visual de Almacén Dinámico (`num_rows` para alturas).
- Sincronización de PIN y ajustes de transportistas con snapshots inmutables.

---

## 💻 Convenciones y Ajustes de Servidor

### Frontend (Vite & UI Premium)
- **allowedHosts**: `true` en Vite para permitir conexiones móviles.
- **Estética Fintech:** Tipografías pesadas (`font-[1000]`), micro-interacciones de `framer-motion`, y layouts compactos de alta densidad.
- **Sincronización Sticky**: Altura fija de `72px` para navegación móvil y control estricto de capas Z.

### Backend (Node.js & Supabase)
- **RPCs V6**: Uso de funciones administrativas sincronizadas con el esquema de producción para evitar conflictos de caché (ej. `admin_get_tenants_final_v6`).
- **Seguridad**: El controlador de Admin incluye manejo de errores técnico visible en el frontend para diagnóstico rápido de fallos en DB.

---

## 📊 Base de Datos (Esquema Clave)

- `tenants`: Incluye `is_ai_active`, `ai_prompt_tokens`, `ai_completion_tokens`.
- `packages`: Historial de entradas/salidas con `ingreso_generado` calculado por transportista.
- `ubicaciones`: Estructura física. Usa `num_rows` para las alturas.
- `superadmins`: Control de acceso para el panel de Operaciones Globales.

---
*Este documento es la "Verdad Única" para el desarrollo. Mantener actualizado tras cambios arquitectónicos significativos.*
