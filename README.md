# VGArchive

VGArchive busca juegos por nombre dentro de los metadatos de torrents que tengas en tu equipo. Permite filtrar por fabricante y consola, y descargar un archivo seleccionado sin marcar el resto de archivos del mismo torrent.

## Requisitos

- Windows, macOS o Linux
- Node.js 20.11 o posterior
- pnpm 12.16.1
- Los archivos `.torrent` que quieras indexar, guardados en `minerva_torrents/`

## Instalación y ejecución

```sh
pnpm install
pnpm start
```

Abre [http://localhost:3000](http://localhost:3000). En Windows también puedes iniciar el proyecto con `Iniciar VGArchive.bat`.

Para usar otro puerto, define `PORT` antes de iniciar el servidor. En PowerShell:

```powershell
$env:PORT=8080
pnpm start
```

## Catálogo local

Copia los archivos `.torrent` a `minerva_torrents/` y reinicia VGArchive para reconstruir el índice. Esa carpeta está excluida de Git porque los archivos de catálogo pueden ser grandes y dependen de cada instalación. El repositorio incluye un `.gitkeep` para conservar la carpeta vacía.

VGArchive reconoce las plataformas listadas en el menú de Atari, Nintendo, Sony, Microsoft y SEGA. Las consolas sin torrents compatibles en el catálogo local aparecerán sin resultados.

## Descargas

Cuando eliges un juego, VGArchive busca su ruta exacta dentro del torrent y selecciona únicamente ese archivo. La sección **Descargas** muestra el progreso, tamaño recibido, velocidad y fuentes, y permite cancelar la tarea. Los archivos descargados se guardan en `downloads/`, una carpeta local también excluida de Git.

## Scripts

- `pnpm start`: inicia el servidor web local.

