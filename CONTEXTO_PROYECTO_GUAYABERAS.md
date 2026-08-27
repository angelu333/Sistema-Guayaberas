# 📌 Documento Maestro de Contexto y Estado del Proyecto — Guayabera Manager

Este documento resume de forma comprimida y estructurada **todo lo hablado, diseñado, desarrollado y validado** en la plataforma **Guayabera Manager**. Puedes adjuntar este documento al iniciar un nuevo chat para transferir el contexto completo de forma eficiente y ahorrar tokens.

---

## 🏢 1. Modelo de Negocio y Visión del Producto
- **Giro**: Empresa dedicada a la **confección propia artesanal** y **comercialización de guayaberas finas** en Yucatán, México (ventas de mostrador en tienda física, catálogo digital público y cotizaciones al mayoreo para bodas/hoteles).
- **Arquitectura Multi-tenant**: Cada empresa o taller tiene su propio entorno aislado en la base de datos (con su propio `tenant_id`, logotipo, catálogo público, cotizaciones y folios).

---

## 💻 2. Stack Tecnológico & Entorno de Trabajo
- **Frontend**: Next.js (App Router), React, TypeScript, TailwindCSS + Vanilla CSS, Lucide Icons, Zustand (gestión de estado de carrito y sesión).
- **Backend / BD**: Supabase (PostgreSQL) con RLS (Row Level Security) multi-tenant y triggers automáticos.
- **Entorno Local**:
  - Servidor de desarrollo: `http://localhost:3005` (puerto 3005).
  - Repositorio Git: `https://github.com/angelu333/Sistema-Guayaberas.git` (último commit pushed: `74299d8`).
  - Usuario de prueba: `admintest@gmail.com` / Contraseña: `123456` (Tenant ID: `d028fc2c-89c7-4cc9-89c5-3978d40a6dfb`).

---

## 🚀 3. Módulos Desarrollados y Funcionalidades Completadas (100%)

### 🔑 Auth & Registro Multi-tenant (`/login`, `/registro`)
- Inicio de sesión por correo/contraseña y registro de nuevas empresas.
- Carga de datos de sesión y tenant en `auth.store` y `tenant.store`.

### 📊 Dashboard Principal (`/dashboard`)
- KPIs de ventas del día, semana, mes, valor del inventario y alertas de stock bajo.

### 🖼️ Catálogo de Productos y Galería (`/productos`)
- **Gestión de Modelos y Variantes**: Registro de guayaberas por modelo, SKU, color, talla y tipo de manga.
- **Carga de Fotos y Compresión en Cliente**: `ImageGalleryUploader.tsx` comprime automáticamente fotos pesadas de celulares/cámaras manteniendo nitidez.
- **Selector de Portada (⭐)**: Permite elegir la foto principal de la guayabera y hasta 4 fotos de detalle (alforzas, bordados, cuello).
- **Edición y Eliminación**: Modal `EditProductModal.tsx` para editar fotos/datos y botón de eliminación permanente de modelos.

### 🛍️ Catálogo Público Digital (`/catalogo/[slug]`)
- URL personalizada por empresa (`/catalogo/tu-marca`).
- Tarjetas visuales de guayaberas en alta calidad con badges de disponibilidad.
- **Modal con Carrusel Interactivo (`ProductDetailModal.tsx`)**: Carrusel de fotos con zoom, tiras de miniaturas y selector de **tallas reactivas que se adaptan al color seleccionado**.
- **Pedido por WhatsApp**: Botón flotante y directo que genera el mensaje estructurado con modelo, talla, color, cantidad y total.

### 🛒 Punto de Venta (POS) (`/pos`)
- **Cuadrícula Agrupada por Modelo**: Muestra 1 sola tarjeta limpia por modelo de guayabera (evitando repetir tarjetas por cada talla/color).
- **Modal de Selección Rápida (`POSVariantSelectModal.tsx`)**: El vendedor elige Color ➔ Talla filtrada ➔ Cantidad y agrega a la venta en un toque.
- **Buscador directo por SKU / Lectores de código de barras**.
- **Cobro y Ticket Térmico**: Soporta cobro en efectivo (con cálculo de cambio), tarjeta y transferencia. Genera ticket listo para imprimir.

### 🏭 Producción y Taller (`/produccion`)
- **Tablero Kanban por Etapas**: 6 fases predeterminadas (Corte ➔ Alforza-Planchado ➔ Bordado ➔ Armado ➔ Acabado ➔ Terminado).
- **Configurador de Etapas (`ProductionStageConfigModal.tsx`)**: Permite agregar, reordenar (⬆️ ⬇️), renombrar o eliminar fases del taller.
- **Ingreso Automático a Inventario**: Al mover una orden a "Terminado", confirma las piezas reales producidas e ingresa automáticamente las unidades al stock.

### 🧵 Materias Primas, Insumos y Recetas BOM (`/insumos`)
- Registro de telas, hilos, botones, etiquetas con alerta de stock mínimo.
- **Creador de Recetas BOM**: Define la lista de insumos requeridos para confeccionar cada guayabera.

### 📄 Cotizaciones de Mayoreo (`/cotizaciones` y `/cotizacion/[id]`)
- Generación de presupuestos por volumen con folio único (`COT-XXXX`).
- **Escalas de Mayoreo Configurables (`WholesaleTierModal.tsx`)**: CRUD interactivo para definir descuentos por rangos de piezas (ej. 20-50 pzas = 20%).
- **Ticket / PDF Membretado con Logo (`QuotePreviewModal.tsx`)**: Formato limpio de 1 hoja listo para imprimir o enviar.
- **Enlace Interactivo Compartible por WhatsApp**: El cliente abre su cotización en `/cotizacion/[id]` y ajusta cantidades en vivo.
- **Conversión de Cotización Aceptada ➔ Venta Real**: El botón **"Cobrar / Vender"** genera la venta oficial, **descuenta automáticamente el inventario físico**, registra en el Historial de Ventas (`/ventas`) e incrementa los ingresos del Dashboard.

### ⚙️ Configuración e Identidad de Marca (`/configuracion`)
- **Cargador de Logotipo Oficial (`BrandLogoUploader.tsx`)**: Sube y optimiza logotipos PNG/WebP transparentes con selector de contraste.
- **Datos Comercial e Identidad**: Nombre comercial, slug de catálogo, WhatsApp de atención, teléfono, correo, RFC, dirección del taller y mensaje de pie de ticket.
- **Perfil y Seguridad**: Edición de nombre completo y cambio de contraseña con validación Supabase Auth.
- **Propagación del Logo**: Muestra el logotipo oficial en Sidebar, Header, Catálogo Público, Cotizaciones y Tickets.

### 🏬 Módulo Multi-Sucursal y Transferencias (`/sucursales`)
- **Gestión Multi-Tienda**: Registro, edición y activación/desactivación de tiendas, talleres y bodegas.
- **Ventas por Sucursal**: Descuento automático de stock de la sucursal activa seleccionada por el usuario.
- **Traspasos entre Tiendas**: Transferencias de existencias entre ubicaciones con folios `TRF-YYYYMMDD-XXXX` y movimientos atómicos.
- **Selector de Sucursal Integrado**: Selector interactivo en el pie del Sidebar.
- **Consolidación de Menú**: Sidebar optimizado y limpio con 10 secciones principales.

### 📱 PWA + Notificaciones Push Web (`/configuracion → Notificaciones Push`)
- **App Instalable**: La web es una PWA con `manifest.json`, íconos en 8 tamaños (72→512px) e ícono de guayabera artesanal.
- **Service Worker**: `sw.js` registrado automáticamente. Maneja notificaciones push en segundo plano y página offline.
- **Panel de Control**: Configuración → "Notificaciones Push" permite activar/desactivar alertas por dispositivo y enviar notificación de prueba.
- **Alerta de Nueva Venta**: Al cobrar en el POS se dispara un push a todos los dispositivos suscritos del tenant.
- **Tabla Supabase**: `push_subscriptions` con RLS por tenant y limpieza automática de endpoints expirados.
- **⚠️ Pendiente del usuario**: Ejecutar `014_push_subscriptions.sql` en Supabase y poner `SUPABASE_SERVICE_ROLE_KEY` en `.env.local`.

---

## 🗄️ 4. Estructura de Migraciones SQL Aplicadas
1. `001_tenants.sql`: Estructura multi-tenant (`tenants`, `tenant_plans`, `tenant_settings`, `user_profiles`).
2. `002_catalog_base.sql`: Tablas base (`categorias`, `colores`, `tallas`, `tipos_manga`).
3. `003_products.sql`: Tablas de `productos` y `variantes_producto`.
4. `004_inventory.sql`: `ubicaciones_inventario`, `existencias`, `movimientos_inventario`.
5. `005_sales.sql`: `clientes`, `ventas`, `detalle_ventas`, `pagos_venta` y función `generate_ticket_number()`.
6. `008_production.sql`: `etapas_produccion` y `ordenes_produccion`.
7. `009_suppliers.sql`: `proveedores` y `ordenes_compra`.
8. `010_inputs.sql`: `insumos` y `recetas_produccion` (BOM).
9. `011_quotes.sql`: `rangos_mayoreo`, `cotizaciones` y `detalle_cotizaciones`.
10. `012_product_images.sql`: `imagenes_producto` y columna `image_url` en `productos`.
11. `013_multistore_and_transfers.sql`: Columna `location_id` en `ventas`, tablas `transferencias` y `detalle_transferencias`, y función `generate_transfer_folio()`.
12. `014_push_subscriptions.sql`: Tabla `push_subscriptions` con RLS, índices y trigger `updated_at` para notificaciones push Web.

---

## 📋 5. Instrucciones para la Siguiente Sesión Chat
Cuando inicies un nuevo chat, simplemente puedes pegar este mensaje de bienvenida:

> *"Hola, estoy continuando el desarrollo del proyecto **Guayabera Manager**. Tengo adjunto el archivo `CONTEXTO_PROYECTO_GUAYABERAS.md` con todo el contexto, módulos completados, base de datos y arquitectura. El repositorio está al día en GitHub (commit `242522d`). ¿Podemos continuar con el siguiente paso?"*

