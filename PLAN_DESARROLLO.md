# Plan Maestro de Desarrollo
## Sistema de Gestión para Tienda y Producción de Guayaberas
### Versión del plan: 1.0 — En progreso

---

> Este documento es el registro vivo del desarrollo del sistema. Se actualiza conforme se avanza en cada etapa. Cada sección indica su estado actual: Pendiente, En progreso o Completado.

---

## Índice

1. [Visión general del proyecto](#1-visión-general-del-proyecto)
2. [Modelo de negocio multi-tenant](#2-modelo-de-negocio-multi-tenant)
3. [Arquitectura tecnológica](#3-arquitectura-tecnológica)
4. [Estructura de carpetas](#4-estructura-de-carpetas)
5. [Paleta de colores y design system](#5-paleta-de-colores-y-design-system)
6. [Plan de desarrollo por etapas](#6-plan-de-desarrollo-por-etapas)
7. [Fases futuras de expansión](#7-fases-futuras-de-expansión)
8. [Estándares de código](#8-estándares-de-código)
9. [Estrategia de pruebas](#9-estrategia-de-pruebas)
10. [Registro de avances](#10-registro-de-avances)

---

## 1. Visión general del proyecto

El sistema es una **plataforma SaaS multi-tenant** para la gestión integral de negocios de guayaberas y tiendas de ropa.
Cualquier empresa puede registrarse, crear su cuenta y operar de forma completamente aislada de otros clientes.

### Qué resuelve

- Control de inventario por variantes (modelo, talla, color, manga)
- Punto de venta con descuento automático de inventario
- Gestión de clientes y mayoristas
- Dashboard con KPIs del negocio
- Historial de movimientos y auditoría
- Catálogo público compartible
- Gestión de producción por órdenes y lotes (Fase 2)
- Control de materias primas y recetas BOM (Fase 3)

### Principio rector

```text
FUNCIONAR BIEN
      |
SER FÁCIL DE USAR
      |
SER SEGURO
      |
SER ESCALABLE
      |
AUTOMATIZAR
```

---

## 2. Modelo de negocio multi-tenant

El sistema está diseñado para ser adquirido por múltiples empresas. Cada empresa es un **tenant** independiente.

### Estrategia de aislamiento

Se utilizará el enfoque **Row Level Security (RLS) de Supabase/PostgreSQL**.

- Cada tabla principal contiene una columna `tenant_id` (UUID).
- Las políticas RLS garantizan que cada usuario solo acceda a los datos de su tenant.
- Un mismo servidor y base de datos atiende a múltiples empresas de forma segura.

### Flujo de registro de una nueva empresa

```text
Empresa llega a la plataforma
        |
Pantalla de registro pública
        |
Ingresa datos de la empresa (nombre, RFC, correo, contraseña)
        |
Se crea el tenant en la tabla "tenants"
        |
Se crea el usuario administrador vinculado al tenant
        |
Se activa el plan (trial o de pago)
        |
Redirección al dashboard de la empresa
```

---

## 3. Arquitectura tecnológica

### Frontend

| Tecnología | Versión objetivo | Propósito |
|---|---|---|
| Next.js | 16 (App Router) | Framework principal |
| TypeScript | 5+ | Tipado estricto |
| Tailwind CSS | 4 | Estilos utilitarios |
| React Hook Form | Última estable | Formularios |
| Zod | Última estable | Validación de esquemas |
| Recharts | Última estable | Gráficas y reportes |
| Zustand | Última estable | Estado global del cliente |

### Backend / Servicios

| Tecnología | Propósito |
|---|---|
| Supabase | BaaS principal |
| PostgreSQL | Base de datos relacional |
| Supabase Auth | Autenticación y sesiones |
| Supabase Storage | Imágenes de productos y archivos |
| Supabase Edge Functions | Lógica de servidor personalizada |
| Row Level Security | Aislamiento multi-tenant |

---

## 4. Estructura de carpetas

```text
Inventario Guayabera/
├── frontend/                          # Aplicación Next.js
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/               # Rutas públicas: login, registro
│   │   │   ├── (dashboard)/          # Rutas protegidas
│   │   │   │   ├── dashboard/
│   │   │   │   ├── productos/
│   │   │   │   ├── inventario/
│   │   │   │   ├── pos/
│   │   │   │   ├── ventas/
│   │   │   │   ├── clientes/
│   │   │   │   ├── produccion/
│   │   │   │   ├── reportes/
│   │   │   │   ├── configuracion/
│   │   │   ├── catalogo/             # Catálogo público
│   │   ├── components/
│   │   │   ├── ui/                   # Button, Input, Badge, Card
│   │   │   ├── layout/               # Sidebar, Header
│   │   ├── services/                 # Capa de datos (auth.service, etc.)
│   │   ├── stores/                   # Stores Zustand
│   │   ├── types/                    # Tipos TypeScript
│   ├── package.json
├── backend/                           # Supabase
│   ├── supabase/
│   │   ├── migrations/               # Migraciones SQL versionadas
│   │   │   ├── 001_tenants.sql
│   │   │   ├── 007_rls_policies.sql
│   │   ├── seed/
│   │   │   ├── seed.sql
├── DATABASE_SCHEMA.md
├── Documento_Maestro_Requisitos_Sistema_Guayaberas.md
├── PLAN_DESARROLLO.md
├── package.json
└── .gitignore
```

---

## 5. Paleta de colores y design system

| Nombre | Token | Hex |
|---|---|---|
| Marfil / Ivory | color-bg-base | #F8F6F1 |
| Blanco cálido | color-bg-white | #FFFFFF |
| Gris piedra | color-bg-subtle | #E7E3DA |
| Verde oliva | color-primary | #556B5D |
| Verde salvia | color-secondary | #8FA393 |
| Dorado champán | color-accent | #C49A5A |
| Carbón | color-text | #26302B |
| Éxito | color-success | #3F7D58 |
| Advertencia | color-warning | #D89B2B |
| Error | color-error | #B85450 |

---

## 6. Plan de desarrollo por etapas

---

### ETAPA 0 — Configuración inicial
**Estado: Completado**

| Tarea | Estado |
|---|---|
| Crear monorepo con estructura de carpetas en Inventario Guayabera | Completado |
| Inicializar Next.js 16 con TypeScript y Tailwind v4 | Completado |
| Configurar variables de entorno y Supabase clients | Completado |
| Design system configurado en globals.css con paleta de colores | Completado |
| Componentes UI base creados (Button, Input, Badge, Card) | Completado |
| Servidor de desarrollo verificado en localhost:3000 | Completado |

---

### ETAPA 1 — Multi-tenant: Registro y autenticación
**Estado: Completado**

| Tarea | Estado |
|---|---|
| Migración SQL: tabla tenants, tenant_plans, tenant_settings, user_profiles | Completado |
| Configurar políticas RLS de aislamiento por tenant | Completado |
| Servicio de autenticación y registro (auth.service.ts) | Completado |
| Stores de Zustand (auth.store.ts, tenant.store.ts) | Completado |
| Pantalla de registro de nueva empresa (/register) | Completado |
| Pantalla de inicio de sesión (/login) | Completado |
| Middleware de autenticación y protección de rutas | Completado |
| Layout protegido del Dashboard | Completado |
| Sidebar de navegación (con roles y paleta de colores) | Completado |
| Header de aplicación con buscador y acciones | Completado |
| Pruebas unitarias de auth.service.ts | Completado |

---

### ETAPA 2 — Catálogo de productos y variantes
**Estado: Completado**
**Estado: Pendiente**

| Tarea | Estado |
|---|---|
| Migración SQL: categorias, colores, tallas, tipos_manga, productos, variantes_producto | Completado |
| Configurar RLS para tablas de productos | Completado |
| Servicio products.service.ts | Completado |
| Página de listado de productos con tabla y filtros | Completado |
| Formulario de creación y edición de productos | Completado |
| Gestión de variantes (tallas, colores, mangas, precios) | Completado |
| Generación automática de SKU único por tenant | Completado |
| Subida de imágenes a Supabase Storage | Completado |
| Vista de detalle de producto y activación/desactivación | Completado |

---

### ETAPA 3 — Inventario y movimientos
**Estado: Pendiente**

| Tarea | Estado |
|---|---|
| Migración SQL: ubicaciones, existencias, movimientos_inventario | Pendiente |
| Configurar RLS para tablas de inventario | Pendiente |
| Servicio inventory.service.ts | Pendiente |
| Página de inventario general con filtros avanzados | Pendiente |
| Vista de existencias por ubicación | Pendiente |
| Formulario de entrada de inventario | Pendiente |
| Formulario de ajuste de inventario (con motivo y auditoría) | Pendiente |
| Historial de movimientos de inventario | Pendiente |
| Sistema de alertas de bajo stock y agotados | Pendiente |
| Búsqueda rápida de inventario ("Valladolid blanco 40") | Pendiente |

---

### ETAPA 4 — Punto de Venta (POS)
**Estado: Pendiente**

| Tarea | Estado |
|---|---|
| Migración SQL: ventas, detalle_ventas, pagos_venta | Pendiente |
| Edge Function complete-sale (transacción atómica) | Pendiente |
| Configurar RLS para tablas de ventas | Pendiente |
| Servicio sales.service.ts | Pendiente |
| Store de carrito POS con Zustand | Pendiente |
| Pantalla POS optimizada para tablet con buscador y catálogo | Pendiente |
| Carrito con cantidades editables y campo de descuento | Pendiente |
| Selector de método de pago (efectivo, tarjeta, transferencia) | Pendiente |
| Selector de cliente (opcional / mayorista) | Pendiente |
| Descuento automático e instantáneo de inventario al vender | Pendiente |
| Generación de ticket de venta (HTML imprimible) | Pendiente |
| Página de historial de ventas y detalle de venta | Pendiente |

---

### ETAPA 5 — Clientes
**Estado: Pendiente**

| Tarea | Estado |
|---|---|
| Migración SQL: clientes | Pendiente |
| Configurar RLS para clientes | Pendiente |
| Servicio clients.service.ts | Pendiente |
| Listado de clientes con búsqueda y filtros | Pendiente |
| Formulario de registro y edición de cliente | Pendiente |
| Vista de detalle con historial de compras acumuladas | Pendiente |
| Integración de selección de cliente en el Punto de Venta | Pendiente |

---

### ETAPA 6 — Dashboard y KPIs
**Estado: Pendiente**

| Tarea | Estado |
|---|---|
| Queries optimizadas para métricas del dashboard | Pendiente |
| Tarjetas KPI: ventas del día, inventario total, bajo stock, agotados | Pendiente |
| Gráfica de ventas por día (semana actual) | Pendiente |
| Gráfica de productos y colores más vendidos | Pendiente |
| Tabla de últimas ventas registradas | Pendiente |
| Panel de alertas activas de stock | Pendiente |
| Adaptación de vista según rol del usuario | Pendiente |

---

### ETAPA 7 — Auditoría e historial
**Estado: Pendiente**

| Tarea | Estado |
|---|---|
| Migración SQL: tabla auditoria | Pendiente |
| Triggers de base de datos para acciones auditables | Pendiente |
| Registro automático: cambios de precios, ajustes, usuarios | Pendiente |
| Página de historial de auditoría con filtros por usuario y fecha | Pendiente |

---

### ETAPA 8 — Catálogo público
**Estado: Pendiente**

| Tarea | Estado |
|---|---|
| Ruta pública /catalogo/[tenant-slug] | Pendiente |
| Query pública (sin autenticación) con RLS | Pendiente |
| Catálogo visual con filtros por modelo, talla y color | Pendiente |
| Vista de producto con fotografías y disponibilidad | Pendiente |
| Botón de contacto directo por WhatsApp | Pendiente |
| Funcionalidad de compartir enlace de productos | Pendiente |

---

### ETAPA 9 — Reportes básicos
**Estado: Pendiente**

| Tarea | Estado |
|---|---|
| Reporte de ventas por periodo (día, semana, mes) | Pendiente |
| Reporte de productos más y menos vendidos | Pendiente |
| Reporte de existencias de inventario valorizado | Pendiente |
| Reporte de productos agotados y bajo stock | Pendiente |
| Reporte de ventas por vendedor | Pendiente |
| Exportación de reportes a CSV | Pendiente |

---

## 7. Fases futuras de expansión

### FASE 2 — Producción, Compras y Mayoreo
- Órdenes de producción y lotes
- Flujo de estados (Pendiente → Corte → Costura → Bordado → Terminado)
- Ingreso de producción terminada a inventario
- Proveedores y registro de compras
- Clientes mayoristas con precios y descuentos especiales

### FASE 3 — Materias primas y análisis avanzado
- Control de insumos (telas, botones, hilo, etiquetas)
- Recetas de producción (BOM) con descuento automático de materiales
- KPIs avanzados: rotación de inventario, utilidad estimada, tiempo promedio de producción
- Transferencias entre ubicaciones (tienda, bodega)

### FASE 4 — Integraciones y automatización
- Integración avanzada con WhatsApp
- Pedidos en línea desde catálogo
- Integración avanzada con impresoras térmicas de tickets
- Soporte para lectores de código de barras
- Mejoras PWA / soporte offline

---

## 8. Estándares de código

- **Sin emojis** en código fuente ni en la interfaz de usuario.
- **TypeScript estricto**: `strict: true` en `tsconfig.json`.
- **Nombres en inglés** para variables, funciones, clases y archivos de código.
- **Comentarios en español** cuando se documenta lógica de negocio.
- **Componentes funcionales** únicamente con React Hooks.
- **Servicios separados**: Los componentes no invocan la base de datos directamente, sino a través de la capa de servicios (`services/*.service.ts`).

---

## 9. Estrategia de pruebas

Por cada módulo se realizarán:
1. Pruebas unitarias de servicios y utilidades (Jest).
2. Pruebas de componentes UI (React Testing Library).
3. Pruebas de integración de flujos completos (ej. registro de venta y descuento de stock).
4. Pruebas de aislamiento multi-tenant (verificación de RLS).

---

## 10. Registro de avances

| Fecha | Etapa | Descripción | Estado |
|---|---|---|---|
| 2026-08-21 | — | Plan maestro creado | Completado |
| 2026-08-21 | 0 | Monorepo, Next.js 16, Tailwind design system, dependencias, UI base | Completado |
| 2026-08-21 | 1 | Registro de empresas multi-tenant, login, auth.service, RLS policies, Sidebar, Header | Completado |

---

**Última actualización:** 2026-08-21 — Etapa 2 completada, listo para Etapa 3
