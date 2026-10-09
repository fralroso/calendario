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
      data/        Base local (Dexie/IndexedDB) y repositorio. Aquí se conectará Supabase.
      features/
        day/       Pantalla principal: actividades del día.
        activity/  Formulario crear / editar / eliminar.
      app/         Arranque de la aplicación.

## Subir a GitHub y publicar en Vercel

    git init
    git add .
    git commit -m "Calendario: estructura inicial y vista diaria"

Crea un repositorio vacío en GitHub, súbelo (`git remote add origin ...` y `git push -u origin main`)
y en Vercel elige "Add New > Project" e importa el repositorio. Vercel detecta Vite solo.
