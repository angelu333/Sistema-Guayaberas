# Keepalive seguro para proyectos Supabase

Este mecanismo sirve para dar actividad mínima a proyectos Free sin modificar
información de negocio. No crea ventas, cotizaciones, movimientos de inventario,
clientes, usuarios ni archivos.

> Supabase puede pausar proyectos Free con poca actividad durante siete días.
> Un ping externo es una medida práctica, pero el plan Pro es la única garantía
> oficial contra pausas por inactividad.

## 1. Preparar cada base de datos

En el **SQL Editor** de cada proyecto Supabase, ejecutar una vez el contenido de:

`backend/supabase/migrations/021_keepalive_sin_datos.sql`

Para comprobarlo dentro de la misma base:

```sql
select public.keepalive();
```

El resultado esperado es un JSON con `"ok": true` y la hora de comprobación.
No se registra ninguna fila ni se cambia ningún dato.

## 2. Obtener valores por proyecto

Para cada proyecto se necesita:

- URL del proyecto: `https://<project-ref>.supabase.co`
- **Anon / Publishable key**, no la `service_role`.

La clave `service_role` nunca debe usarse para este keepalive ni guardarse en
GitHub para este propósito.

## 3. Guardar un secreto en GitHub

En el repositorio: **Settings → Secrets and variables → Actions → New repository
secret**. Crear el secreto llamado `SUPABASE_KEEPALIVE_PROJECTS` con este formato:

```json
[
  {
    "name": "Guayaberas Dzib",
    "url": "https://tu-proyecto-dzib.supabase.co",
    "anonKey": "tu-anon-key-de-dzib"
  },
  {
    "name": "Guayaberas Betel",
    "url": "https://tu-proyecto-betel.supabase.co",
    "anonKey": "tu-anon-key-de-betel"
  }
]
```

No publicar ese JSON en el código ni enviarlo por chat. Para añadir otra base
después, agrega otro objeto al arreglo.

## 4. Verificar la automatización

Después de subir el cambio:

1. Abrir GitHub → **Actions** → **Keep Supabase projects active**.
2. Elegir **Run workflow** para probarlo manualmente.
3. Debe terminar con marca verde. El workflow sólo muestra el nombre de cada
   proyecto, nunca su URL ni su clave.

Luego se ejecutará automáticamente lunes y jueves. Si un ping falla, el run se
marcará en rojo para que puedas revisar el proyecto antes de que llegue a una
pausa prolongada.
