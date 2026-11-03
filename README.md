# VGArchive

VGArchive busca juegos por nombre dentro de metadatos de torrents locales, consulta información e imágenes de los juegos en Wikipedia y permite descargar un archivo seleccionado del torrent. La interfaz se adapta a móviles y muestra resultados en cuadrícula.

## Requisitos

- Node.js 22 o posterior
- pnpm 12.16.1
- Archivos `.torrent` que quieras indexar en `minerva_torrents/`

## Ejecución local

```sh
pnpm install
pnpm start
```

Abre [http://localhost:3000](http://localhost:3000). En Windows puedes usar `Iniciar VGArchive.bat`.

Para acceder desde un móvil en la misma red Wi-Fi, inicia el servidor en la interfaz de red local.

```powershell
$env:HOST='0.0.0.0'
$env:PORT='3000'
pnpm start
```

En el móvil, abre `http://<IP-del-PC>:3000`. La app Android permite guardar esa misma dirección desde **Servidor**. El móvil y el PC deben estar en la misma red; las descargas se guardan en el PC que ejecuta el servidor.

## Portadas y metadatos

VGArchive consulta la API pública de Wikipedia al mostrar tarjetas visibles. Carga la miniatura, un resumen y un enlace a la página fuente. La búsqueda de metadatos se hace de forma diferida y se cachea en memoria; si no encuentra una página coincidente o no hay conexión, la tarjeta conserva un marcador de portada. Usa [PageImages](https://www.mediawiki.org/wiki/Extension:PageImages) para recuperar la imagen asociada al artículo y sigue las [recomendaciones de uso de la API](https://www.mediawiki.org/wiki/API:Etiquette), incluida la identificación del cliente.

## Catálogo local

Copia los archivos `.torrent` a `minerva_torrents/` y reinicia VGArchive para reconstruir el índice. Esa carpeta y `downloads/` están excluidas de Git. El repositorio conserva `minerva_torrents/.gitkeep` para que la carpeta se cree al clonar.

En las versiones de escritorio empaquetadas, los torrents y las descargas se guardan dentro de la carpeta de datos de usuario de VGArchive, bajo `data/minerva_torrents/` y `data/downloads/`.

## Versiones

### Web móvil instalable

VGArchive incluye un manifiesto PWA y una caché del shell. Desde un navegador móvil compatible puedes instalar la web cuando la sirvas por HTTPS o desde `localhost`.

### Android APK

Se necesita Node.js 22+, pnpm y Android Studio con Android SDK. Android Studio incluye el JDK compatible.

```sh
pnpm install
pnpm android:apk
```

El APK de depuración se genera en `android/app/build/outputs/apk/debug/app-debug.apk`. Es una app móvil cliente: conéctala a una instancia de VGArchive en el PC para buscar y descargar.

### Windows y Linux

```sh
pnpm install
pnpm build:windows
pnpm build:linux
```

Windows genera un instalador NSIS y una versión portable; Linux genera paquetes AppImage y `.deb`. Los resultados quedan en `dist-apps/`. GitHub Actions construye los tres destinos al enviar cambios a `main`; también puedes iniciarlo desde la acción **Build VGArchive**.

Los lanzadores de escritorio guardan los torrents en la carpeta de datos de usuario. Para permitir que el APK se conecte a la app Electron en la red local, inicia el escritorio con `VGARCHIVE_LAN=1`; usa la dirección IP del PC y el puerto `3000` en el móvil.

## Scripts

- `pnpm start`: servidor web local.
- `pnpm desktop`: abre VGArchive como app de escritorio durante el desarrollo.
- `pnpm android:apk`: prepara Capacitor y genera el APK de depuración.
- `pnpm build:windows`: genera instalador y versión portable de Windows.
- `pnpm build:linux`: genera AppImage y paquete `.deb`.
