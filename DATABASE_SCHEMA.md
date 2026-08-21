# Esquema de Base de Datos
## Sistema de Gestion de Guayaberas

---

## Principios del esquema

1. Toda tabla de negocio incluye `tenant_id UUID NOT NULL` para aislamiento multi-tenant.
2. Toda tabla incluye `created_at` y `updated_at` con triggers automaticos.
3. Ningun registro con historial se elimina fisicamente. Se marca `is_active = false`.
4. Los movimientos de inventario son inmutables (no se editan, solo se agregan).
5. Las ventas se completan de forma atomica via Edge Function.

---

## Tablas raiz (multi-tenant)

### tenants
| Columna    | Tipo        | Descripcion                        |
|------------|-------------|-------------------------------------|
| id         | UUID PK     | Identificador unico del tenant      |
| name       | TEXT        | Nombre de la empresa                |
| slug       | TEXT UNIQUE | Identificador URL del catalogo      |
| rfc        | TEXT        | RFC de la empresa                   |
| phone      | TEXT        | Telefono de contacto                |
| email      | TEXT        | Correo de la empresa                |
| whatsapp   | TEXT        | Numero WhatsApp para catalogo       |
| logo_url   | TEXT        | URL del logo en Supabase Storage    |
| is_active  | BOOLEAN     | Estado del tenant                   |
| created_at | TIMESTAMPTZ | Fecha de registro                   |
| updated_at | TIMESTAMPTZ | Ultima actualizacion                |

### tenant_plans
| Columna               | Tipo        | Descripcion                    |
|-----------------------|-------------|--------------------------------|
| id                    | UUID PK     |                                |
| tenant_id             | UUID FK     | Referencia a tenants           |
| plan_type             | TEXT        | trial / basic / pro / enterprise|
| status                | TEXT        | active / suspended / cancelled |
| trial_ends_at         | TIMESTAMPTZ | Fin del periodo trial          |
| current_period_start  | TIMESTAMPTZ | Inicio del periodo de pago     |
| current_period_end    | TIMESTAMPTZ | Fin del periodo de pago        |

### tenant_settings
| Columna              | Tipo    | Descripcion                           |
|----------------------|---------|---------------------------------------|
| tenant_id            | UUID FK | Referencia a tenants (unico)          |
| currency             | TEXT    | Moneda (default: MXN)                 |
| timezone             | TEXT    | Zona horaria (default: America/Merida)|
| low_stock_threshold  | INTEGER | Umbral global de alerta bajo stock    |
| allow_negative_stock | BOOLEAN | Permite ventas sin existencia          |
| ticket_header        | TEXT    | Texto personalizado en tickets        |
| ticket_footer        | TEXT    | Pie de ticket personalizado           |

### user_profiles
| Columna    | Tipo    | Descripcion                              |
|------------|---------|------------------------------------------|
| id         | UUID PK | Vinculado con auth.users de Supabase     |
| tenant_id  | UUID FK | Empresa a la que pertenece               |
| full_name  | TEXT    | Nombre completo del usuario              |
| role       | TEXT    | admin / seller / production              |
| is_active  | BOOLEAN | Estado del usuario                       |

---

## Tablas de productos (Etapa 2)

### categorias
Clasificacion de productos: Guayabera clasica, Guayabera bordada, Camisa, etc.

### colores
Catalogo de colores disponibles: Blanco, Beige, Azul marino, etc.

### tallas
Catalogo de tallas: 38, 40, 42... o S, M, L, XL.

### tipos_manga
Manga corta, Manga larga, Manga 3/4.

### productos
Producto base (modelo). Ejemplo: "Valladolid", "Maya", "Presidencial".

### variantes_producto
Combinacion unica de producto + color + talla + manga.
Cada variante tiene su propio SKU, precio y existencias.

### imagenes_variante
Fotografias almacenadas en Supabase Storage, vinculadas a una variante.

---

## Tablas de inventario (Etapa 3)

### ubicaciones
Tienda, Bodega, Exhibicion, etc.

### existencias
Stock actual de cada variante en cada ubicacion.

### movimientos_inventario
Registro inmutable de cada cambio de existencia.
Tipos: entrada_produccion, entrada_compra, salida_venta,
       ajuste_positivo, ajuste_negativo, merma, danado.

---

## Tablas de ventas (Etapa 4)

### ventas
Encabezado de cada transaccion de venta.

### detalle_ventas
Lineas de productos de una venta.

### pagos_venta
Registro de pagos (efectivo, tarjeta, transferencia).

---

## Tablas de clientes (Etapa 5)

### clientes
Datos de clientes registrados, incluyendo tipo (normal / mayorista).

---

## Tablas de auditoria (Etapa 7)

### auditoria
Registro de todas las acciones importantes del sistema.
Columnas: usuario, accion, tabla_afectada, registro_id,
          valor_anterior, valor_nuevo, fecha.

---

## Relaciones criticas

```
tenants
  +-- user_profiles (muchos usuarios por tenant)
  +-- tenant_settings (uno a uno)
  +-- tenant_plans (uno a muchos)
  +-- productos (muchos por tenant)
       +-- variantes_producto
            +-- existencias (por ubicacion)
            +-- movimientos_inventario
  +-- ventas
       +-- detalle_ventas -> variantes_producto
       +-- pagos_venta
  +-- clientes
  +-- ubicaciones
  +-- auditoria
```
