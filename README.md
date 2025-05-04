# frontMobile
Repositorio dedicado al Front-End específico para la aplicación móvil de **EchoBeat**

EchoBeat es una aplicacición de reproducción de audio, fruto de un proyecto grupal para la asignatura [*Proyecto Software* (30226)](https://estudios.unizar.es/estudio/asignatura?anyo_academico=2024&asignatura_id=30226&estudio_id=20240148&centro_id=110&plan_id_nk=439)
Es un proyecto ambicioso con el objetivo de poder investigar y conocer nuevas tecnologías de desarrollo Software así como la adquisición de conocimientos
relacionados con el trabajo en equipos más grandes de lo habitual. 

Es un trabajo en el que se podrán meter mejoras de todo tipo: optimizaciones, mejoras estéticas, etc, pero lo que sí es verdad es que es un proyecto hecho con el 
corazón y para un (posible) consumidor.

---

## 📦 Releases y descarga de la APK

Hemos publicado la última versión estable como **Release** en GitHub. Para descargar la APK:

1. Accede a la sección de **Releases** de este repositorio:  
   <https://github.com/UNIZAR-30226-2025-03/frontMobile/releases/tag/latest>
2. En **Assets**, haz clic sobre `EchoBeat-v1.0.0.apk` (o la versión más reciente) para iniciar la descarga.

---

## 📲 Instalación en un dispositivo Android real

Para instalar la APK directamente en tu móvil:

1. **Permitir orígenes desconocidos**  
   - En tu dispositivo, ve a **Ajustes → Seguridad → Instalar aplicaciones desconocidas** (o similar).  
   - Habilita el permiso para el navegador o gestor de archivos desde el que vayas a abrir la APK.

2. **Descargar la APK**  
   - Desde el móvil, abre el enlace de la Release en GitHub.  
   - Descarga `EchoBeat-vX.Y.Z.apk`.

3. **Instalar la APK**  
   - Una vez descargada, abre el archivo `.apk` desde el gestor de archivos o la barra de notificaciones.  
   - Confirma la instalación cuando el sistema lo solicite.

4. **Ejecutar la app**  
   - Busca el icono de **EchoBeat** en tu lista de apps y ábrela.  
   - ¡Ya puedes navegar por la aplicación y probar todas las funciones!

---

## 🖥️ Instalación en un emulador Android

Si prefieres probar la APK en un emulador (Android Studio AVD) sigue estos pasos:

1. **Descarga e instala Android Studio** (si no lo tienes).  

2. **Crea o arranca un AVD**  
   - Abre Android Studio → **AVD Manager** → selecciona o crea un dispositivo virtual → pulsa ▶️ para iniciarlo.

3. **Cargar la APK en el emulador**  
   - **Opción A: ADB**  
     ```bash
     adb install path/to/EchoBeat-vX.Y.Z.apk
     ```
   - **Opción B: UI de Android Studio**  
     - Con el emulador abierto, haz clic en los tres puntos (…) → **App → Install APK**.  
     - Selecciona el `EchoBeat-vX.Y.Z.apk` y confirma la instalación.

4. **Abrir la app**  
   - En el emulador encontrarás el icono de **EchoBeat**: púlsalo para arrancar.
