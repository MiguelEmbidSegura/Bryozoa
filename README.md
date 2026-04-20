# Catalogo de Briozoos Web

Version web moderna del catalogo, pensada para despliegue estatico y uso sin backend obligatorio.

Directorio del proyecto:

`\\smicro14\cienciadigital\Briozoos_Franceses\bryozoa_catalog_web`

## Que incluye

- Interfaz mapa-primero: el mapa se ve antes que el listado.
- Carga local de `JSON`, `XLSX` y `XLS` directamente en navegador.
- Filtros en vivo por busqueda, pais, familia, tipo, clase, orden y presencia de contenido.
- Ficha visible a un clic desde mapa o tarjetas.
- Dos tipos de icono en el mapa:
  - registros con fotos
  - registros sin fotos
- Exportacion del subconjunto filtrado a `JSON`.
- Muestra incluida en `public/data/ejemplo.json`.

## Stack

- `React 19`
- `TypeScript`
- `Vite`
- `MapLibre GL JS`
- `xlsx` para leer Excel en cliente

## Estructura

```text
bryozoa_catalog_web/
  index.html
  package.json
  vite.config.ts
  README.md
  public/
    favicon.svg
    icons.svg
    data/
      ejemplo.json
  src/
    App.tsx
    index.css
    main.tsx
    components/
      CatalogMap.tsx
      FiltersPanel.tsx
      RecordSpotlight.tsx
      ResultsList.tsx
    lib/
      catalog.ts
```

## Ejecutar en local

No abras `index.html` con doble clic. Esta aplicacion debe servirse por `http://localhost` o por un hosting estatico como Vercel o GitHub Pages.

### Instalacion

```powershell
Set-Location '\\smicro14\cienciadigital\Briozoos_Franceses\bryozoa_catalog_web'
npm install
```

Si PowerShell bloquea `npm.ps1`, usa `npm.cmd`:

```powershell
npm.cmd install
```

Lo mismo aplica a `npx` y a `vercel`: en PowerShell usa `npx.cmd` o `vercel.cmd`, no el comando sin extension.

### Desarrollo

```powershell
npm run dev
```

Tambien puedes lanzar directamente:

```powershell
.\run_web_dev.bat
```

### Build de produccion

```powershell
npm run build
```

### Vista previa del build

```powershell
npm run preview
```

O con el lanzador preparado:

```powershell
.\run_web_preview.bat
```

## Comportamiento de datos

La web replica la logica util del escritorio, pero adaptada al navegador:

- Lee la primera hoja del Excel.
- Recorta las columnas fantasma de Excels con dimension inflada.
- Normaliza cabeceras y corrige variantes como `Order_`, `Longitud`, `Date Qualifier`, `Donor / Collection` e `Indentifie`.
- Si faltan columnas conocidas, las completa como `N/A`.
- Si no existe `OID_`, lo genera automaticamente.
- El mapa solo representa registros con coordenadas validas.
- Los iconos cambian segun haya fotos o no en los campos `Image1` a `Image17`.

## Limitaciones importantes

- Al ejecutarse en navegador, las rutas locales de imagen tipo `C:\...` o `\\servidor\...` no se pueden abrir directamente por seguridad del navegador.
- Las imagenes se previsualizan bien si son URLs `http(s)` o rutas web accesibles desde la propia aplicacion desplegada.
- Aunque una imagen no se pueda previsualizar, el registro seguira marcado como "con fotos" si los campos de imagen contienen informacion.

## Diseno y uso

- El mapa es el punto de entrada principal.
- La ficha destacada aparece justo debajo del mapa.
- El listado queda despues, como apoyo para navegar o comparar.
- El clic sobre marcador o tarjeta selecciona el registro y lo enfoca.

## Despliegue

### Recomendacion: Vercel

Para este proyecto, `Vercel` es la opcion mas directa:

- Detecta proyectos `Vite` automaticamente.
- Encaja bien con sitios estaticos.
- Es comodo para previews por rama o pull request.

Pasos minimos:

1. Sube este directorio a un repositorio Git.
2. Importa el repositorio en Vercel.
3. Vercel detectara `Vite`.
4. Build command: `npm run build`
5. Output directory: `dist`

Referencia oficial:

- Vite static deploy: https://vite.dev/guide/static-deploy.html
- Vite on Vercel: https://vercel.com/docs/frameworks/frontend/vite

### Despliegue desde PowerShell en Windows

Si PowerShell bloquea `npm.ps1` o `npx.ps1`, no hace falta cambiar la politica de ejecucion del equipo. Usa una de estas dos opciones:

```powershell
npx.cmd vercel@latest login
npx.cmd vercel@latest link --project bryozoasendino
npx.cmd vercel@latest --prod
```

O bien usa los lanzadores incluidos en este directorio:

```powershell
.\vercel_cli.bat login
.\vercel_cli.bat link --project bryozoasendino
.\deploy_vercel_prod.bat
```

Notas practicas:

- `vercel_cli.bat` ejecuta `npx.cmd vercel@latest ...` desde este directorio.
- `deploy_vercel_prod.bat` lanza el deploy de produccion con `--archive=tgz --logs`.
- `deploy_vercel_prod_debug.bat` anade tambien `--debug` para diagnosticar fallos de subida o build.
- Si Vercel te pregunta por el `scope`, elige la cuenta o equipo donde ya existe el proyecto `bryozoasendino`.
- No borres el proyecto si quieres conservar `bryozoasendino.vercel.app`.

### GitHub Pages

Tambien es valido, pero requiere pipeline de build.

Notas practicas:

- Vite documenta despliegue con `GitHub Actions`.
- Este proyecto usa `base: './'` en `vite.config.ts` para hacerlo mas portable como sitio estatico.
- Si mas adelante prefieres una base absoluta, ajusta `vite.config.ts` segun la URL final.

Referencia oficial:

- Vite static deploy / GitHub Pages: https://vite.dev/guide/static-deploy.html#github-pages

## Si luego anades rutas SPA

Ahora mismo la aplicacion no necesita router cliente. Si en el futuro anades rutas tipo `/registro/123`, en Vercel te convendra anadir un `vercel.json` con rewrite a `index.html`, tal como indica su documentacion para SPAs en Vite.

## Estado verificado

Comprobado en este directorio:

- `npm run lint`
- `npm run build`

El build generado queda en:

`dist/`
