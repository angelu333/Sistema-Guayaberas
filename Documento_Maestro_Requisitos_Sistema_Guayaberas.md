# Sistema de Gestión para Tienda y Producción de Guayaberas
## Documento Maestro de Requisitos — Versión 1.0

> Documento base para analizar, diseñar, cotizar y desarrollar un sistema personalizado para la gestión de inventario, ventas, producción, clientes y operaciones de un negocio de guayaberas.

---

# 1. Descripción general

El proyecto consiste en desarrollar un **sistema web de gestión para un negocio de guayaberas**, pensado para funcionar desde computadora, tablet y celular.

El sistema no debe limitarse a controlar entradas y salidas de inventario. Debe construirse con una **arquitectura modular y escalable**, de forma que pueda comenzar con las funciones esenciales y posteriormente incorporar producción, compras, clientes mayoristas, materias primas, reportes avanzados y otras automatizaciones.

El sistema tendrá como eje principal el inventario y conectará las operaciones del negocio:

```text
Productos
   ↓
Inventario
   ↓
Ventas / POS
   ↓
Clientes
   ↓
Reportes

Producción
   ↓
Entradas de inventario

Compras
   ↓
Materias primas / materiales
   ↓
Producción

Todo el sistema
   ↓
Dashboard / KPIs / Historial
```

# 2. Objetivos del sistema

## Objetivo principal

Centralizar y digitalizar la operación del negocio para conocer en todo momento:

- Qué productos existen.
- Cuántas piezas hay disponibles.
- Dónde están ubicadas.
- Qué se ha vendido.
- Qué se ha producido.
- Qué materiales existen.
- Qué pedidos o producciones están pendientes.
- Qué clientes compran más.
- Qué productos se venden más.
- Qué productos requieren reposición.
- Cuál es el comportamiento general del negocio.

## Objetivos específicos

1. Reducir errores humanos en el control de inventario.
2. Registrar automáticamente las entradas y salidas.
3. Evitar ventas que no afecten el inventario.
4. Facilitar la operación desde tablet o celular.
5. Permitir al dueño administrar productos, precios y existencias.
6. Facilitar la venta mediante un punto de venta (POS).
7. Permitir la impresión de tickets.
8. Facilitar la consulta de disponibilidad desde cualquier lugar.
9. Preparar el sistema para operaciones de mayoreo.
10. Generar información para tomar decisiones de producción y ventas.

# 3. Tipo de aplicación recomendado

## Aplicación web responsive + PWA

La primera versión será una **aplicación web responsive**, preparada para instalarse como PWA.

Debe funcionar correctamente en:

- Computadora de escritorio.
- Laptop.
- Tablet.
- Teléfono celular.

No se recomienda desarrollar inicialmente aplicaciones Android e iOS separadas.

### Ventajas

- Un solo código base.
- Menor costo de desarrollo y mantenimiento.
- Acceso desde cualquier navegador moderno.
- Puede instalarse en dispositivos compatibles como una aplicación.
- Permite al dueño consultar información cuando está fuera de la tienda.

# 4. Arquitectura tecnológica propuesta

## Frontend

- Next.js
- TypeScript
- Tailwind CSS
- Librería de componentes UI
- Diseño responsive
- PWA

## Backend / servicios

- Supabase

## Base de datos

- PostgreSQL

## Autenticación

- Supabase Auth

## Almacenamiento

- Supabase Storage para imágenes de productos y archivos necesarios.

## Hosting

- Vercel para la aplicación.
- Supabase para base de datos y servicios asociados.

## Principio importante

La arquitectura debe permitir agregar módulos posteriormente sin tener que reconstruir el sistema desde cero.

# 5. Usuarios y roles

El sistema debe manejar usuarios con diferentes permisos.

## Administrador

Puede:

- Crear usuarios.
- Editar usuarios.
- Activar/desactivar usuarios.
- Gestionar productos.
- Cambiar precios.
- Gestionar inventario.
- Consultar ventas.
- Gestionar producción.
- Gestionar compras.
- Consultar reportes.
- Consultar historial.
- Configurar parámetros del sistema.

## Vendedor

Puede:

- Consultar productos.
- Consultar disponibilidad.
- Registrar ventas.
- Aplicar descuentos según permisos.
- Registrar clientes.
- Imprimir tickets.
- Consultar información necesaria para atender al cliente.

## Encargado de producción

Puede:

- Consultar órdenes de producción.
- Crear o actualizar etapas de producción según permisos.
- Registrar producción terminada.
- Consultar materiales necesarios.
- Consultar existencias relacionadas con producción.

> Los roles exactos pueden ajustarse durante el levantamiento final de requisitos.

# 6. Módulo de Dashboard

El dashboard será la pantalla principal después de iniciar sesión.

Debe mostrar, según el rol del usuario:

- Total de piezas disponibles.
- Valor total del inventario.
- Productos con bajo stock.
- Productos agotados.
- Ventas del día.
- Ventas de la semana.
- Ventas del mes.
- Entradas de producción.
- Salidas por ventas.
- Pedidos pendientes.
- Producciones pendientes.
- Indicadores relevantes.

## Ejemplo de tarjetas

```text
VENTAS DE HOY
$4,850

INVENTARIO
1,245 piezas

BAJO STOCK
8 productos

PEDIDOS PENDIENTES
6

PRODUCCIÓN EN PROCESO
4 órdenes
```

## Gráficas sugeridas

- Ventas por día.
- Ventas por periodo.
- Productos más vendidos.
- Colores más vendidos.
- Tallas más vendidas.
- Inventario por categoría.
- Producción por estado.

# 7. Módulo de productos

El administrador debe poder administrar completamente el catálogo interno.

## Operaciones

- Crear producto.
- Editar producto.
- Desactivar producto.
- Reactivar producto.
- Eliminar cuando sea seguro hacerlo.
- Modificar precios.
- Modificar costos.
- Cambiar descripción.
- Cambiar fotografías.
- Gestionar variantes.

## Datos principales

- Código/SKU.
- Nombre.
- Modelo.
- Descripción.
- Categoría.
- Marca, si aplica.
- Tipo de manga.
- Tipo de tela.
- Precio de costo.
- Precio de venta.
- Estado.
- Fotografías.

# 8. Variantes de producto

No se debe asumir que cada guayabera es un único registro independiente.

Un modelo puede tener:

- Diferentes colores.
- Diferentes tallas.
- Diferentes mangas.
- Diferentes combinaciones.

## Ejemplo

```text
Modelo: Valladolid

Blanco / 38 / Manga corta
Blanco / 40 / Manga corta
Blanco / 42 / Manga corta
Beige / 38 / Manga larga
Beige / 40 / Manga larga
```

Cada variante debe poder tener su propio:

- SKU.
- Existencia.
- Precio si aplica.
- Ubicación.
- Código de barras si aplica.
- Estado.

# 9. Módulo de inventario

El inventario debe ser central para todo el sistema.

## Debe permitir

- Consultar existencias.
- Buscar por modelo.
- Buscar por color.
- Buscar por talla.
- Buscar por manga.
- Buscar por SKU.
- Buscar por ubicación.
- Filtrar por disponibilidad.
- Filtrar por bajo stock.
- Filtrar por agotados.

## Ejemplo de búsqueda rápida

```text
Valladolid blanco 40
```

Resultado esperado:

```text
Modelo: Valladolid
Color: Blanco
Talla: 40
Manga: Corta
Existencia: 15
Ubicación: Bodega
Precio: $750
```

# 10. Ubicaciones

El sistema debe contemplar que una misma empresa pueda manejar diferentes ubicaciones.

Ejemplos:

- Tienda.
- Bodega.
- Exhibición.
- Otra sucursal, en una futura versión.

El inventario debe poder asociarse a una ubicación.

# 11. Movimientos de inventario

Todo cambio importante en las existencias debe generar un movimiento.

## Tipos de movimiento

- Entrada por producción.
- Entrada por compra.
- Salida por venta.
- Ajuste positivo.
- Ajuste negativo.
- Merma.
- Producto dañado.
- Transferencia entre ubicaciones.
- Otros movimientos definidos posteriormente.

## Ejemplo

```text
05/08/2026
+25
Valladolid
Blanco
Talla 40
Motivo: Producción
Usuario: Juan
```

Después:

```text
05/08/2026
-3
Valladolid
Blanco
Talla 40
Motivo: Venta
Usuario: Ana
```

Esto permitirá reconstruir el historial del inventario.

# 12. Regla crítica del inventario

Una venta completada **siempre debe afectar las existencias**.

El sistema debe evitar inconsistencias como:

```text
Venta registrada
↓
Inventario sin actualizar
```

El flujo correcto será:

```text
Venta
 ↓
Validar existencia
 ↓
Registrar venta
 ↓
Registrar detalle de venta
 ↓
Descontar inventario
 ↓
Registrar movimiento
 ↓
Actualizar datos
 ↓
Generar ticket
```

La operación debe manejarse de forma segura para evitar que se complete una venta y solamente una parte del proceso quede registrada.

# 13. Historial y auditoría

El sistema debe guardar quién realizó acciones importantes.

Debe poder registrar:

- Usuario.
- Acción.
- Fecha.
- Hora.
- Producto o registro afectado.
- Valor anterior cuando corresponda.
- Valor nuevo cuando corresponda.
- Motivo, cuando corresponda.

## Ejemplo

```text
Usuario: Carlos
Acción: Modificó precio
Producto: Valladolid Blanco 40
Anterior: $700
Nuevo: $750
Fecha: 05/08/2026 15:42
```

Esto será especialmente importante para modificaciones de inventario, precios y datos sensibles.

# 14. Productos activos e inactivos

No se recomienda borrar físicamente productos que ya tengan historial de ventas.

En su lugar:

```text
Activo: Sí
Activo: No
```

Un producto descontinuado seguirá existiendo en el historial, pero no aparecerá como producto disponible para nuevas ventas.

Esto evita romper relaciones históricas.

# 15. Alertas de inventario

Cada variante podrá tener un nivel mínimo de stock.

Ejemplo:

```text
Stock actual: 4
Stock mínimo: 5
```

El sistema mostrará:

> Bajo stock.

También debe permitir configurar distintos niveles de alerta.

# 16. Punto de Venta (POS)

El POS permitirá realizar ventas directamente desde la tienda.

## Flujo esperado

```text
Nueva venta
↓
Buscar o escanear producto
↓
Seleccionar variante
↓
Indicar cantidad
↓
Agregar al carrito
↓
Aplicar descuento si corresponde
↓
Seleccionar método de pago
↓
Registrar cliente (opcional / según reglas)
↓
Confirmar venta
↓
Descontar inventario
↓
Registrar movimiento
↓
Generar ticket
↓
Imprimir
```

## Métodos de pago

Inicialmente:

- Efectivo.
- Tarjeta.
- Transferencia.

Podrán agregarse otros métodos posteriormente.

# 17. Ticket de venta

El sistema debe generar un ticket preparado para impresión.

Contenido sugerido:

- Nombre del negocio.
- Logo.
- Fecha.
- Número de ticket.
- Productos.
- Cantidades.
- Precios.
- Descuentos.
- Subtotal.
- Total.
- Forma de pago.
- Vendedor.
- Cliente, cuando aplique.

## Impresión

Antes de desarrollar una integración específica se deberá identificar:

- Marca de la impresora.
- Modelo.
- Conexión.
- Sistema operativo del dispositivo desde el cual se imprimirá.

Primera versión recomendada:

```text
Finalizar venta
↓
Generar ticket
↓
Imprimir
```

La integración directa con hardware específico puede tratarse como una tarea técnica posterior dependiendo de la impresora.

# 18. Catálogo público

Funcionalidad recomendada para el proyecto.

El inventario interno podrá alimentar un catálogo público.

## Objetivo

Permitir al dueño consultar y compartir productos aunque se encuentre fuera de la tienda.

## Ejemplo

```text
GUAYABERA VALLADOLID

Blanco
Talla 40
Manga corta

$750

Disponible: 15

[Consultar por WhatsApp]
```

## Funciones

- Ver productos disponibles.
- Filtrar por modelo.
- Filtrar por talla.
- Filtrar por color.
- Ver fotografías.
- Ver precio.
- Consultar disponibilidad.
- Compartir enlace.
- Botón de contacto por WhatsApp.

El catálogo debe mostrar solamente información pública y no exponer datos internos.

# 19. Clientes

El sistema debe permitir registrar clientes.

## Datos

- Nombre.
- Teléfono.
- Correo, si aplica.
- Tipo de cliente.
- Empresa, si aplica.
- RFC, si aplica.
- Dirección, si aplica.
- Notas.
- Historial de compras.

# 20. Clientes mayoristas

El sistema debe contemplar clientes de mayoreo.

## Datos adicionales

- Empresa.
- RFC.
- Descuento.
- Condiciones comerciales.
- Historial de compras.
- Monto acumulado.
- Última compra.

## Ejemplo

```text
Cliente: Distribuidora Maya
Tipo: Mayorista
Descuento: 10%
Compras acumuladas: $85,400
```

# 21. Descuentos

Los descuentos deben manejarse mediante reglas definidas por el negocio.

Pueden existir:

- Descuento por cliente.
- Descuento por mayoreo.
- Descuento manual con permisos.
- Promoción, en una etapa posterior.

Los vendedores no deben poder cambiar libremente reglas sensibles si no tienen permiso.

# 22. Módulo de producción

Este módulo debe controlar órdenes de producción.

## Ejemplo

```text
Orden #215

Valladolid: 50
Maya: 30
Presidencial: 20
```

## Estados propuestos

```text
Pendiente
↓
En corte
↓
En costura
↓
Bordado
↓
Terminado
↓
Ingresado a inventario
```

El sistema debe guardar fecha, usuario y cambios de estado importantes.

# 23. Lotes de producción

La producción deberá manejarse por órdenes o lotes.

Cada lote debe registrar:

- Número de orden.
- Fecha de creación.
- Productos.
- Variantes.
- Cantidades.
- Estado.
- Responsable.
- Fechas de cambio de estado.
- Observaciones.

Cuando una producción quede terminada, deberá existir un flujo para ingresar las piezas terminadas al inventario.

# 24. Materia prima y materiales

Este módulo permitirá gestionar:

- Tela.
- Botones.
- Entretela.
- Hilo.
- Etiquetas.
- Bolsas.
- Otros materiales.

## Concepto futuro: receta de producción / BOM

Un producto puede requerir cantidades de materiales.

Ejemplo:

```text
Guayabera Valladolid

1.80 m de tela
8 botones
1 etiqueta
1 bolsa
```

Al producir una determinada cantidad, el sistema podrá descontar automáticamente los materiales.

# 25. Compras y proveedores

El sistema deberá permitir registrar compras.

## Datos de proveedor

- Nombre.
- Empresa.
- RFC, si aplica.
- Teléfono.
- Correo.
- Dirección.
- Productos/materiales suministrados.

## Compra

- Proveedor.
- Fecha.
- Material/producto.
- Cantidad.
- Costo.
- Factura, si aplica.
- Observaciones.

Las compras podrán generar entradas de inventario cuando corresponda.

# 26. Reportes

El sistema deberá permitir consultar información para toma de decisiones.

## Reportes iniciales

- Ventas por día.
- Ventas por semana.
- Ventas por mes.
- Productos más vendidos.
- Productos menos vendidos.
- Colores más vendidos.
- Tallas más vendidas.
- Ventas por vendedor.
- Inventario actual.
- Productos agotados.
- Productos con bajo stock.

## Reportes avanzados

- Utilidad estimada.
- Valor del inventario.
- Rotación de inventario.
- Costo de inventario.
- Rendimiento por modelo.
- Rendimiento por cliente.
- Tiempo promedio de producción.
- Pedidos pendientes.
- Cumplimiento de entregas.

# 27. KPIs

Indicadores sugeridos:

- Inventario total.
- Inventario valorizado.
- Ventas del periodo.
- Utilidad estimada.
- Rotación por modelo.
- Productos agotados.
- Productos con bajo stock.
- Tiempo promedio de producción.
- Tiempo promedio de entrega.
- Pedidos pendientes.
- Nivel de cumplimiento.
- Clientes mayoristas principales.

# 28. Modelo de datos conceptual

La base de datos debe diseñarse desde el principio para crecer.

## Entidades principales

```text
usuarios
roles

productos
categorias
colores
tallas
variantes_producto
imagenes_producto

ubicaciones
existencias
movimientos_inventario

ventas
detalle_ventas
metodos_pago

clientes
clientes_mayoristas

ordenes_produccion
detalle_produccion
estados_produccion

materiales
recetas_produccion
detalle_receta

proveedores
compras
detalle_compras

auditoria
```

La estructura exacta se definirá durante el diseño de base de datos.

# 29. Reglas de negocio importantes

## Inventario

1. No se debe vender una variante sin existencia suficiente, salvo que el negocio habilite ventas bajo pedido.
2. Toda venta completada debe afectar existencias.
3. Toda entrada debe generar un movimiento.
4. Toda salida debe generar un movimiento.
5. Los movimientos deben conservar historial.
6. Productos históricos no deben eliminarse físicamente cuando tengan relaciones.

## Productos

1. Cada variante debe contar con identificación única.
2. El SKU debe ser único.
3. Los precios deben ser administrables.
4. El producto puede estar activo o inactivo.

## Usuarios

1. Cada usuario debe autenticarse.
2. Los permisos dependen del rol.
3. Las operaciones sensibles deben quedar auditadas.

## Producción

1. Una orden de producción debe tener estado.
2. Cambios de estado deben conservarse en historial.
3. La producción terminada debe poder alimentar inventario.

# 30. Búsqueda rápida

La búsqueda debe ser una de las funciones más importantes de la aplicación.

Debe permitir consultas como:

```text
Valladolid blanco 40
```

y devolver:

- Modelo.
- Color.
- Talla.
- Manga.
- Existencia.
- Ubicación.
- Precio.
- SKU.

También debe funcionar mediante filtros.

# 31. Experiencia para tablet

La pantalla de venta debe estar especialmente optimizada para tablet.

Prioridades:

- Botones grandes.
- Búsqueda rápida.
- Carrito visible.
- Cantidad fácil de modificar.
- Lectura clara del total.
- Acceso rápido a pago.
- Acceso rápido a imprimir.
- Interfaz sin elementos innecesarios.

# 32. Experiencia para celular

Desde celular se priorizará:

- Consultar inventario.
- Consultar ventas.
- Consultar alertas.
- Consultar pedidos.
- Compartir catálogo.
- Consultar productos.
- Consultar dashboard.
- Operaciones rápidas.

El flujo de POS completo puede optimizarse principalmente para tablet/computadora, aunque debe ser usable en celular.

# 33. Seguridad

El sistema deberá implementar:

- Autenticación.
- Control de acceso.
- Roles.
- Permisos.
- Protección de datos privados.
- Validación de operaciones.
- Auditoría.
- Políticas de acceso a la base de datos.

Los datos internos del negocio no deben ser públicos.

# 34. Arquitectura funcional

```text
                 ┌─────────────────────┐
                 │       USUARIOS       │
                 └──────────┬──────────┘
                            │
                            ▼
                 ┌─────────────────────┐
                 │     DASHBOARD       │
                 └──────────┬──────────┘
                            │
      ┌───────────────┬─────┴─────┬───────────────┐
      ▼               ▼           ▼               ▼
 INVENTARIO          POS      PRODUCCIÓN       COMPRAS
      │               │           │               │
      ▼               ▼           ▼               ▼
 PRODUCTOS          VENTAS      ÓRDENES        PROVEEDORES
 VARIANTES          TICKETS      LOTES          MATERIALES
 UBICACIONES        CLIENTES     ESTADOS
      │
      └────────────────┬─────────────────────┐
                       ▼                     ▼
                  CLIENTES                 REPORTES
                       │                     │
                       └─────────┬───────────┘
                                 ▼
                              KPIs
```

# 35. MVP — Primera versión recomendada

La primera versión NO debe intentar implementar todo.

## Módulos que sí entran

### 1. Autenticación
- Login.
- Usuarios.
- Roles básicos.

### 2. Dashboard
- Ventas.
- Inventario.
- Bajo stock.
- Productos agotados.

### 3. Productos
- Crear.
- Editar.
- Desactivar.
- Precios.
- Variantes.
- Fotografías.

### 4. Inventario
- Existencias.
- Ubicaciones.
- Entradas.
- Salidas.
- Movimientos.
- Historial.

### 5. POS
- Nueva venta.
- Carrito.
- Métodos de pago.
- Descuento.
- Cliente.
- Descuento automático de inventario.

### 6. Ticket
- Generar.
- Imprimir.

### 7. Clientes
- Registro.
- Historial básico.

### 8. Catálogo público
- Productos.
- Disponibilidad.
- Compartir.

# 36. Fase 2

Después de validar el MVP:

- Producción.
- Órdenes de producción.
- Estados de producción.
- Compras.
- Proveedores.
- Clientes mayoristas.
- Descuentos por cliente.
- Reportes ampliados.

# 37. Fase 3

Funciones avanzadas:

- Materias primas.
- Recetas/BOM.
- Descuento automático de materiales.
- KPIs avanzados.
- Rotación.
- Utilidad.
- Análisis de producción.
- Transferencias entre ubicaciones.

# 38. Fase 4

Integraciones y automatización:

- WhatsApp.
- Automatización de mensajes.
- Catálogo más avanzado.
- Pedidos en línea.
- Integración avanzada con impresoras.
- Código de barras.
- Mejoras offline.
- Múltiples sucursales.
- Otras integraciones externas.

# 39. Qué debe preguntarse al cliente antes de programar

Antes de cerrar arquitectura y cotización se debe realizar un levantamiento de requisitos.

## Negocio

- ¿Cuántas tiendas tiene actualmente?
- ¿Tiene bodega?
- ¿Planea abrir más sucursales?
- ¿Maneja ventas de mayoreo?
- ¿También fabrica las guayaberas?
- ¿Qué productos maneja actualmente?
- ¿Cuántos modelos tiene aproximadamente?

## Inventario

- ¿Cómo controla hoy el inventario?
- ¿Utiliza Excel, libretas u otro sistema?
- ¿Cómo identifica cada producto?
- ¿Usa SKU?
- ¿Usa códigos de barras?
- ¿Cuántas tallas maneja?
- ¿Cuántos colores?
- ¿Cómo maneja las ubicaciones?

## Ventas

- ¿Cuántas ventas realiza aproximadamente por día?
- ¿Qué métodos de pago utiliza?
- ¿Necesita factura?
- ¿Necesita manejar devoluciones?
- ¿Maneja descuentos?
- ¿Tiene clientes recurrentes?

## POS

- ¿Qué tablet utilizará?
- ¿Qué computadora utilizará?
- ¿Qué impresora tiene?
- ¿Cuál es la marca y modelo de la impresora?
- ¿Tiene lector de códigos?
- ¿Cómo está conectada la impresora?

## Producción

- ¿Realmente necesita controlar producción desde el sistema?
- ¿Qué etapas utiliza?
- ¿Quién cambia el estado?
- ¿Maneja lotes?
- ¿Cómo registra las cantidades producidas?

## Materias primas

- ¿Qué materiales quiere controlar?
- ¿Quiere descontarlos automáticamente?
- ¿Cada modelo necesita materiales diferentes?
- ¿Cómo calcula actualmente cuánto material necesita?

## Mayoreo

- ¿Cómo determina el precio de mayoreo?
- ¿El descuento depende del cliente?
- ¿Depende de cantidad?
- ¿Maneja precios especiales?

# 40. Criterio para eliminar funciones innecesarias

Una función debe entrar en la primera versión únicamente si:

1. Resuelve un problema real.
2. El negocio la utilizará frecuentemente.
3. Es necesaria para otra función.
4. Tiene impacto directo en operación o ventas.

Las funciones que no cumplan esto pueden pasar a una fase posterior.

# 41. Principio de diseño del proyecto

La aplicación debe construirse de manera que el negocio pueda comenzar utilizando las funciones esenciales y posteriormente incorporar módulos nuevos.

La prioridad es:

```text
FUNCIONAR BIEN
        ↓
SER FÁCIL DE USAR
        ↓
SER SEGURO
        ↓
SER ESCALABLE
        ↓
AUTOMATIZAR
```

No se debe priorizar tener muchas funciones por encima de tener procesos confiables.

# 42. Resultado esperado del sistema

Al finalizar la primera etapa, el dueño deberá poder:

```text
1. Iniciar sesión
2. Registrar productos
3. Crear variantes
4. Cambiar precios
5. Administrar fotografías
6. Consultar existencias
7. Registrar entradas
8. Registrar ajustes
9. Registrar ventas
10. Descontar inventario automáticamente
11. Registrar clientes
12. Imprimir tickets
13. Consultar historial
14. Ver dashboard
15. Ver alertas de bajo stock
16. Consultar desde celular o tablet
17. Compartir productos mediante catálogo
```

# 43. Consideración comercial para el desarrollo

Este proyecto debe cotizarse como un **sistema por módulos**, no como una aplicación pequeña de inventario.

Se recomienda separar claramente:

- Desarrollo inicial.
- Hosting.
- Dominio, si aplica.
- Mantenimiento.
- Soporte.
- Nuevas funciones.
- Integraciones externas.
- Hardware y configuración de impresoras.

Las integraciones y módulos adicionales deben poder cotizarse por separado.

# 44. Nota para el desarrollador

Este documento representa una base inicial de requisitos.

Antes de comenzar el desarrollo definitivo deberán realizarse:

1. Levantamiento de requisitos con el cliente.
2. Validación de módulos.
3. Diseño de flujo de procesos.
4. Diseño de base de datos.
5. Definición de roles y permisos.
6. Wireframes.
7. Diseño UI.
8. Definición del MVP.
9. Cotización.
10. Plan de desarrollo.
11. Pruebas con datos reales.
12. Pruebas con el hardware de la tienda.
13. Puesta en producción.

# 45. Decisión recomendada

La recomendación para este proyecto es construir primero:

> **Una aplicación web responsive/PWA con Next.js + TypeScript + Supabase/PostgreSQL**, enfocada inicialmente en **productos, variantes, inventario, movimientos, clientes, POS, tickets, dashboard y catálogo**, manteniendo una arquitectura preparada para integrar posteriormente **producción, compras, materias primas, mayoreo, reportes avanzados y automatizaciones**.

Este enfoque permite entregar valor real rápidamente sin sacrificar la posibilidad de convertir el sistema en una plataforma mucho más completa para el crecimiento del negocio.

---

## FIN DEL DOCUMENTO
