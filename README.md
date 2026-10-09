# Calendario

Agenda sencilla: "¿Qué tengo que hacer ahora y qué después?".
Funciona sin internet: los datos se guardan primero en el propio dispositivo.

## Cómo ejecutarlo

Requiere Node.js 18 o superior.

    npm install
    npm run dev

Abre la dirección que muestra la terminal (normalmente http://localhost:5173).

## Estructura

    src/
      domain/      Reglas puras (tipos, conflictos de horario, fechas). Sin pantalla ni base de datos.
      data/        Base local (Dexie/IndexedDB), repositorio, cliente de Supabase y sincronización.
      features/
        day/       Pantalla principal: actividades del día.
        activity/  Formulario crear / editar / eliminar.
        auth/      Inicio de sesión.
        sync/      Indicador de respaldo.
      app/         Arranque de la aplicación.

## Respaldo en la nube (Supabase)

1. En Supabase crea un proyecto (o usa uno existente).
2. SQL Editor: pega todo `supabase/schema.sql` y presiona Run.
3. Authentication > Sign In / Providers > Email: desactiva "Confirm email" (solo para el piloto).
4. Project Settings > API: copia la URL del proyecto y la clave `anon` (o `publishable`).
5. Copia `.env.example` como `.env.local` y pega esos dos valores.
6. `npm install` y `npm run dev`. Toca "Iniciar sesión para respaldar" y crea tu cuenta.
7. En Vercel: Settings > Environment Variables, agrega `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`
   con los mismos valores y vuelve a desplegar.

Sin las claves, la app funciona igual pero solo en el dispositivo.

## Subir a GitHub y publicar en Vercel

    git init
    git add .
    git commit -m "Calendario: estructura inicial y vista diaria"

Crea un repositorio vacío en GitHub, súbelo (`git remote add origin ...` y `git push -u origin main`)
y en Vercel elige "Add New > Project" e importa el repositorio. Vercel detecta Vite solo.
