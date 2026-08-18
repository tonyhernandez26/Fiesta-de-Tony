# Boletos — Cumple + Despedida de Tony

Página de venta de boletos lista para publicar como sitio web real (con
lista de invitados y reservas compartidas entre todos, no solo en tu
dispositivo).

## Editar los datos del evento

Abre `src/App.tsx` y edita el objeto `EVENT` al inicio del archivo (fecha,
lugar, precios, cuentas, PIN de anfitrión, etc.).

## Publicarla en línea (gratis, ~5 minutos)

1. **Crea un repositorio en GitHub** (si no tienes cuenta, créala gratis en
   github.com/signup).
   - Ve a github.com/new, ponle un nombre como `boletos-fiesta-tony`,
     déjalo público o privado, no agregues README, y crea el repositorio.
   - En la página del repositorio vacío, haz clic en
     **"uploading an existing file"** y arrastra ahí *todos* los archivos y
     carpetas de este proyecto (menos `node_modules`, `dist` y `.vercel`,
     que no hacen falta). Confirma el commit.

2. **Despliega en Vercel** (gratis).
   - Ve a vercel.com y entra con **"Continue with GitHub"**.
   - Haz clic en **"Add New..." → "Project"**, elige el repositorio que
     acabas de subir, y dale a **Deploy**. Vercel detecta automáticamente
     que es un proyecto Vite y lo construye solo.
   - En 1-2 minutos tendrás un enlace público tipo
     `https://boletos-fiesta-tony.vercel.app`.

3. **Conecta el almacenamiento compartido** (para que las reservas se vean
   igual desde cualquier celular o computadora).
   - Dentro del proyecto en Vercel, ve a la pestaña **Storage**.
   - Elige crear una base de datos tipo **Redis** (integración de Upstash,
     aparece en el marketplace de Vercel) y conéctala a este proyecto.
     Vercel configura automáticamente las variables de entorno necesarias.
   - Vuelve a la pestaña **Deployments** y vuelve a desplegar (**Redeploy**)
     para que la función `api/manifest` tome la nueva conexión.

Listo — comparte el enlace `https://tu-proyecto.vercel.app` con tus
invitados. Sin conectar la base de datos, la página funciona igual pero
las reservas no se guardan de forma permanente ni compartida entre
dispositivos.

## Desarrollo local

```bash
npm install
npm run dev
```
