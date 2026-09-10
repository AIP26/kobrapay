# Ejecutar KobraPay en servidores propios

## Resumen ejecutivo

El repositorio de GitHub contiene el código fuente, las migraciones SQL, las pruebas, los scripts y la configuración del proyecto. No contiene credenciales, datos de clientes, registros de transacciones, archivos subidos, sesiones, secretos de Stripe, configuración DNS ni recursos administrados por Manus. Esos componentes deben migrarse o recrearse de forma independiente.

La exportación actual sigue dependiendo de algunos servicios de Manus. Por lo tanto, existen dos rutas:

1. **Migración rápida:** ejecutar KobraPay en tu servidor y conservar Manus OAuth, Forge y el almacenamiento administrado. Requiere mantener accesibles sus URLs y credenciales.
2. **Migración independiente:** reemplazar OAuth, almacenamiento, notificaciones y cualquier API de Forge por proveedores propios o equivalentes. Esta ruta elimina la dependencia operativa de Manus, pero requiere cambios de código y pruebas adicionales.

## Qué sí está en GitHub

El repositorio incluye React/Vite, Express/tRPC, Drizzle, los archivos del esquema y migraciones SQL, las páginas del dashboard, el flujo de pagos, Stripe webhooks, pruebas Vitest, scripts de integración, `README.md` y `ENV_VARIABLES.md`.

## Qué no se copió

| Elemento | Estado | Qué debes hacer |
|---|---|---|
| Secretos y variables `.env` | No incluidos intencionalmente | Crear variables en el servidor o en su gestor de secretos. |
| Datos actuales de MySQL/TiDB | No incluidos | Exportar un respaldo de la base actual y restaurarlo en tu MySQL/TiDB. |
| Archivos de S3 y evidencias | No incluidos | Migrar objetos y actualizar sus URLs, o configurar un almacenamiento nuevo. |
| Sesiones y usuarios OAuth | No incluidos | Configurar el proveedor OAuth y verificar usuarios; no copies cookies ni JWT existentes. |
| DNS y certificados TLS | No incluidos | Apuntar el dominio al servidor y emitir certificados HTTPS. |
| Configuración de webhooks en Stripe | No incluida | Crear endpoints nuevos y registrar sus signing secrets. |
| Configuración externa de Resend, GHL y Google Sheets | No incluida | Recrear las integraciones y verificar sus URLs/credenciales. |
| Panel de despliegue de Manus | No aplicable fuera de Manus | Sustituir sus variables y servicios por infraestructura propia si buscas independencia total. |

Los archivos `client/public/__manus__/*` y `.project-config.json` no son necesarios para la lógica de pagos en un servidor propio. El archivo `.project-config.json` se excluye del repositorio por seguridad y por ser metadato del entorno administrado.

## Variables requeridas

### Mínimas para el backend y autenticación actual

```text
NODE_ENV=production
PORT=3000
DATABASE_URL=...
JWT_SECRET=...
VITE_APP_ID=...
OAUTH_SERVER_URL=...
VITE_OAUTH_PORTAL_URL=...
OWNER_OPEN_ID=...
VITE_OWNER_OPEN_ID=...
```

El OAuth actual usa servicios de Manus. Si quieres autenticación completamente independiente, deberás reemplazar `server/_core/oauth.ts`, `server/_core/sdk.ts`, el contexto de autenticación y el hook frontend `useAuth` por Auth0, Clerk, Keycloak, Auth.js u otro proveedor compatible.

### Stripe y pagos

```text
STRIPE_SECRET_KEY=...
VITE_STRIPE_PUBLISHABLE_KEY=...
STRIPE_WEBHOOK_SECRET=...
STRIPE_CONNECT_WEBHOOK_SECRET=...
KOBRAPAY_WEBHOOK_SECRET=...
```

Registra en Stripe, apuntando al dominio nuevo, al menos:

```text
https://TU_DOMINIO/api/stripe/webhook
https://TU_DOMINIO/api/stripe/connect-webhook
```

Configura el endpoint de Connect para eventos de cuentas conectadas. Nunca reutilices un signing secret de otro endpoint. Después valida pagos exitosos, pagos fallidos, reembolsos, suscripciones y contracargos en modo de prueba antes de activar producción.

### Email

```text
RESEND_API_KEY=...
FROM_EMAIL=noreply@tu-dominio.mx
```

Verifica el dominio remitente en Resend y configura SPF, DKIM y DMARC. El correo de alerta de contracargo depende de esta integración.

### Servicios de Manus que la exportación todavía utiliza

```text
BUILT_IN_FORGE_API_URL=...
BUILT_IN_FORGE_API_KEY=...
VITE_FRONTEND_FORGE_API_URL=...
VITE_FRONTEND_FORGE_API_KEY=...
```

Estas variables se utilizan para funciones como OAuth/SDK, almacenamiento S3 proxy, notificaciones del owner, mapas, voz, imágenes y algunos servicios internos. Si no las configuras, esas funciones fallarán aunque el servidor y el flujo básico de Stripe arranquen correctamente.

### Integraciones opcionales

```text
CONTENTAI_API_KEY=...
GHL_API_KEY=...
GHL_LOCATION_ID=...
GOOGLE_APPS_SCRIPT_URL=...
VITE_TURNSTILE_SITE_KEY=...
```

No actives GHL ni Google Sheets hasta tener sus credenciales y haber probado sus colas de sincronización.

## Base de datos

Las migraciones están versionadas en `drizzle/`, pero no contienen los datos actuales. En el servidor nuevo crea una base vacía, configura `DATABASE_URL`, revisa las migraciones y ejecuta:

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm db:push
```

Para conservar usuarios, vendedores, links, transacciones, chargebacks y configuraciones, necesitas restaurar un respaldo de la base actual. Hazlo únicamente sobre una base nueva o con un procedimiento de migración controlado; no ejecutes comandos destructivos contra producción.

## Almacenamiento de archivos

El proyecto usa `server/storage.ts`, que actualmente llama al proxy de almacenamiento de Manus mediante Forge. Las evidencias de identidad, documentos, firmas, imágenes y otros archivos no están en GitHub. Para una operación independiente debes elegir una de estas opciones:

- Mantener Forge/Manus y configurar sus credenciales.
- Reemplazar `storagePut` y `storageGet` por AWS S3, Cloudflare R2, MinIO u otro almacenamiento compatible.
- Migrar los objetos existentes y conservar en la base de datos las nuevas URLs o claves.

No guardes archivos binarios directamente en MySQL.

## Notificaciones y tareas externas

`notifyOwner` utiliza el servicio de notificaciones de Manus. En servidores propios puedes conservarlo con Forge o sustituirlo por email, Slack, WhatsApp o un servicio de notificaciones propio. Las notificaciones internas almacenadas en la base de datos sí forman parte del código y del esquema, pero los datos existentes requieren migración de base de datos.

## Servidor, HTTPS y procesos

Para producción configura Node.js 22, pnpm 10, un reverse proxy como Nginx o Caddy, TLS, firewall, copias de seguridad, rotación de logs y un supervisor como systemd, Docker Compose o PM2. El servidor debe conservar el proceso activo y aceptar tráfico HTTPS para que Stripe pueda entregar webhooks.

Ejemplo de ejecución después de configurar las variables:

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm test
pnpm build
NODE_ENV=production pnpm start
```

No uses el servidor de desarrollo en producción. Configura `PORT` desde el entorno y no hardcodees el puerto en el código.

## Orden recomendado de migración

Primero provisiona el servidor, MySQL/TiDB, almacenamiento y HTTPS. Después clona el repositorio, configura secretos, ejecuta las migraciones en una base nueva, restaura los datos y migra archivos. Luego configura OAuth, Resend y Stripe, registra los webhooks con el dominio nuevo y ejecuta pruebas de extremo a extremo. Finalmente cambia el DNS, monitoriza logs y conserva el despliegue actual como respaldo hasta confirmar que los pagos, emails, webhooks y contracargos funcionan.

## Regla de seguridad

Nunca compartas por chat ni subas a GitHub `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_CONNECT_WEBHOOK_SECRET`, `RESEND_API_KEY`, `DATABASE_URL`, `JWT_SECRET`, claves Forge, tokens OAuth o credenciales de GHL/Google. Si alguna clave apareció en logs, capturas, commits o mensajes públicos, revócala y genera una nueva.
