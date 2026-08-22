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
**Estado: Completado**

| Tarea | Estado |
|---|---|
| Migración SQL: ubicaciones, existencias, movimientos_inventario | Completado |
| Configurar RLS para tablas de inventario | Completado |
| Servicio inventory.service.ts | Completado |
| Página de inventario general con filtros avanzados | Completado |
| Vista de existencias por ubicación | Completado |
| Formulario de entrada de inventario | Completado |
| Formulario de ajuste de inventario (con motivo y auditoría) | Completado |
| Historial de movimientos de inventario | Completado |
| Sistema de alertas de bajo stock y agotados | Completado |
| Búsqueda rápida de inventario ("Valladolid blanco 40") | Completado |

---

### ETAPA 4 — Punto de Venta (POS)
**Estado: Completado**

| Tarea | Estado |
|---|---|
| Migración SQL: ventas, detalle_ventas, pagos_venta | Completado |
| Función generate_ticket_number (numero autoincremental) | Completado |
| Configurar RLS para tablas de ventas | Completado |
| Servicio sales.service.ts | Completado |
| Store de carrito POS con Zustand | Completado |
| Pantalla POS optimizada para tablet con buscador y catálogo | Completado |
| Carrito con cantidades editables y campo de descuento | Completado |
| Selector de método de pago (efectivo, tarjeta, transferencia) | Completado |
| Descuento global e instantáneo al vender | Completado |
| Descuento automático de inventario al completar venta | Completado |
| Ticket de venta con opción de imprimir | Completado |
| Página de historial de ventas con KPIs y detalle expandible | Completado |

---

### ETAPA 5 — Clientes y CRM
**Estado: Completado**

| Tarea | Estado |
|---|---|
| Migración SQL: tabla clientes con RLS | Completado |
| Servicio clients.service.ts | Completado |
| Listado de clientes con búsqueda y filtros por tipo (Regular/Mayorista) | Completado |
| Formulario de registro y edición de cliente (ClientModal.tsx) | Completado |
| Vista de detalle con historial de compras acumuladas (ClientDetailModal.tsx) | Completado |
| Integración de selección de cliente en el Punto de Venta (POS) con descuento automático | Completado |

---

### ETAPA 6 — Dashboard y KPIs
**Estado: Completado**

| Tarea | Estado |
|---|---|
| Servicio dashboard.service.ts con métricas agregadas y valuación de inventario | Completado |
| Tarjetas KPI: ventas del día, ventas de la semana, ingresos del mes, valuación total | Completado |
| Gráfica interactiva de tendencia de ventas semanales (SalesWeeklyChart.tsx con Recharts) | Completado |
| Gráfica interactiva de productos y guayaberas más vendidas (TopProductsChart.tsx con Recharts) | Completado |
| Tabla de últimas ventas registradas en tiempo real | Completado |
| Panel de alertas activas de reabastecimiento | Completado |
| Adaptación de vista y bienvenida personalizada según el rol del usuario | Completado |

---

### ETAPA 7 — Auditoría e historial
**Estado: Completado**

| Tarea | Estado |
|---|---|
| Migración SQL: tabla auditoria con RLS (006_audit.sql) | Completado |
| Servicio audit.service.ts | Completado |
| Registro automático de eventos sensibles (precios, stock, usuarios, ventas canceladas) | Completado |
| Página de historial de auditoría con filtros por entidad y acción (/auditoria) | Completado |
| Modal de inspección de comparativa JSON antes vs después (AuditDetailModal.tsx) | Completado |

---

### ETAPA 8 — Catálogo público compartible
**Estado: Completado**

| Tarea | Estado |
|---|---|
| Servicio public-catalog.service.ts con acceso libre por slug | Completado |
| Pantalla pública del catálogo libre de autenticación (/catalogo/[slug]) | Completado |
| Barra de 3 filtros principales de búsqueda (Modelo, Talla y Color) | Completado |
| Sincronización en tiempo real de URL y Deep-Linking compartible por WhatsApp | Completado |
| Generador de mensajes y pedidos automáticos para WhatsApp | Completado |
| Panel interno para vendedores (CatalogoLinkPage.tsx) para copiar enlaces filtrados | Completado |

---

### ETAPA 9 — Reportes e Informes Financieros
**Estado: Completado**

| Tarea | Estado |
|---|---|
| Servicio reports.service.ts con consultas agregadas | Completado |
| Reporte de ventas por periodo (día, semana, mes, personalizado) | Completado |
| Reporte de existencias de inventario valorizado y ganancia estimada ($33,640.00 MXN) | Completado |
| Reporte de rendimiento y ventas por vendedor | Completado |
| Exportación de reportes a CSV/Excel con codificación UTF-8 BOM | Completado |
| Pantalla principal de reportes (/reportes) con pestañas e indicadores | Completado |

---

### FASE 2 — Producción, Compras y Mayoreo
**Estado: En Desarrollo (Módulo de Producción Completado)**

| Tarea | Estado |
|---|---|
| Migración SQL: tablas etapas_produccion y ordenes_produccion con RLS (008_production.sql) | Completado |
| Servicio production.service.ts con sembrado de etapas predeterminadas de guayaberas | Completado |
| Secuencia predeterminada: Corte -> Alforza-Planchado -> Bordado -> Armado -> Acabado -> Terminado | Completado |
| Administrador de Etapas por Empresa (ProductionStageConfigModal.tsx): agregar, reordenar y eliminar | Completado |
| Tablero Kanban de producción por etapas con lanzamiento de lotes (/produccion) | Completado |
| Confirmación de lote terminado e ingreso automático de piezas al stock de inventario | Completado |
| Proveedores y registro de compras | Pendiente |
| Clientes mayoristas con precios y descuentos especiales | Completado (Etapa 5) |

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
