# Guía de Conexión ODBC a PostgreSQL (TimescaleDB)

Esta guía detalla los pasos para configurar una conexión ODBC (Open Database Connectivity) al servidor de base de datos del sistema, permitiendo acceder a los datos desde herramientas como Microsoft Excel, Power BI, Microsoft Access, o cualquier otra aplicación compatible con ODBC.

## 1. Prerrequisitos

Necesitas instalar el controlador ODBC para PostgreSQL en tu máquina Windows.

1.  Descarga el instalador **psqlODBC** desde el sitio oficial:
    *   [https://www.postgresql.org/ftp/odbc/versions/msi/](https://www.postgresql.org/ftp/odbc/versions/msi/)
    *   Se recomienda descargar la última versión (ej. `psqlodbc_16_00_0000-x64.zip` para sistemas de 64 bits).
2.  Descomprime el archivo y ejecuta el instalador (`psqlodbc_x64.msi`).
3.  Sigue las instrucciones de instalación (acepta los valores por defecto).

## 2. Datos de Conexión

Estos son los parámetros que necesitarás para configurar la conexión.

| Parámetro | Valor | Notas |
| :--- | :--- | :--- |
| **Data Source** | PostgreSQL35W | O "PostgreSQL Unicode" |
| **Database** | `industrial` | Nombre de la base de datos |
| **Server** | `localhost` | Si estás en la misma PC. Si es remoto, usa la IP del servidor (ej. `192.168.1.X`) |
| **Port** | `5432` | Puerto por defecto |
| **User Name** | `backend` | Usuario configurado en docker-compose |
| **Password** | `backend_pass` | Contraseña configurada en docker-compose |
| **SSL Mode** | `disable` | Para entornos locales/internos |

## 3. Configuración del DSN (Data Source Name) en Windows

1.  Presiona la tecla `Windows`, escribe **"ODBC"** y selecciona **"Orígenes de datos ODBC (64 bits)"** (ODBC Data Sources).
2.  Ve a la pestaña **"DSN de sistema"** (System DSN) si quieres que la conexión esté disponible para todos los usuarios, o **"DSN de usuario"** (User DSN) solo para ti.
3.  Haz clic en **"Agregar..."** (Add).
4.  Selecciona **"PostgreSQL Unicode(x64)"** de la lista y haz clic en **"Finalizar"**.
5.  Se abrirá una ventana de configuración. Rellena los campos con los datos del paso 2:
    *   **Data Source**: `PLC_Backend_DB` (Un nombre para identificar la conexión)
    *   **Database**: `industrial`
    *   **Server**: `localhost` (o la IP del servidor)
    *   **Port**: `5432`
    *   **User Name**: `backend`
    *   **Password**: `backend_pass`
    *   **Description**: (Opcional) ej. "Conexión a datos de sensores"
6.  Haz clic en el botón **"Test"** para verificar la conexión.
    *   Deberías ver un mensaje: *"Connection successful"*.
7.  Haz clic en **"Save"** para guardar.

## 4. Ejemplo: Conectar desde Excel

1.  Abre Microsoft Excel.
2.  Ve a la pestaña **Datos** > **Obtener datos** > **De otras fuentes** > **Desde ODBC**.
3.  En la lista desplegable, selecciona el nombre del DSN que creaste (ej. `PLC_Backend_DB`).
4.  Si te pide credenciales nuevamente, ingresa el usuario (`backend`) y contraseña (`backend_pass`).
5.  Se abrirá el "Navegador". Podrás ver las tablas disponibles:
    *   `machines`: Lista de máquinas.
    *   `plcs`: Lista de PLCs.
    *   `sensors`: Configuración de sensores.
    *   `sensor_data`: **Datos históricos de mediciones** (Esta tabla puede ser muy grande).
        > **Advertencia**: La tabla `sensor_data` puede contener millones de registros. Al importarla en Excel, se recomienda usar "Transformar datos" (Power Query) para filtrar por fecha o sensor antes de cargar, para evitar que Excel se congele.
    *   `sensor_last_value`: Último valor registrado de cada sensor.
6.  Selecciona la tabla que quieras y haz clic en **"Cargar"** o **"Transformar datos"**.

## Solución de Problemas

*   **Error de conexión**: Asegúrate de que el contenedor Docker `db` esté corriendo (`docker-compose ps`).
*   **Firewall**: Si te conectas desde otra PC, asegúrate de que el firewall del servidor permita el tráfico entrante en el puerto `5432`.
*   **Versión del Driver**: Asegúrate de instalar la versión x64 del driver si tu Windows y Office son de 64 bits.
