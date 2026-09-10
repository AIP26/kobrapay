# KobraPay

KobraPay es una plataforma de cobros para México. Permite a los comercios crear ligas de pago, recibir pagos con Stripe, administrar clientes y transacciones, manejar registros, POS, catálogo, facturación y contracargos.

## Arquitectura

- Frontend: React 19, Vite y Tailwind CSS 4.
- Backend: Node.js, Express 4 y tRPC 11.
- Persistencia: MySQL/TiDB mediante Drizzle ORM.
- Pagos: Stripe y Stripe Connect.
- Email: Resend.
- Almacenamiento de archivos: S3 mediante los helpers del proyecto.
- Pruebas: Vitest.

## Requisitos

Se requiere Node.js 22 o compatible, pnpm 10, una base de datos MySQL/TiDB accesible y las credenciales de las integraciones que se vayan a utilizar. GitHub almacena el código, pero no sustituye el servidor de aplicación, la base de datos ni las variables secretas.

## Instalación local

```bash
git clone https://github.com/dperuyeros-cpu/KOBRAPAY.git
cd KOBRAPAY
pnpm install --frozen-lockfile
touch .env
# Consulta ENV_VARIABLES.md para completar tu archivo .env
```

Completa `.env` con los valores reales de tu entorno. **Nunca subas `.env` al repositorio.** La guía `ENV_VARIABLES.md` solo contiene nombres de variables y no incluye credenciales.

## Variables de entorno

Las variables principales están documentadas en `ENV_VARIABLES.md`. Las esenciales para ejecutar el flujo base son `DATABASE_URL`, `JWT_SECRET`, `VITE_APP_ID`, `OAUTH_SERVER_URL`, `VITE_OAUTH_PORTAL_URL`, `OWNER_OPEN_ID`, `STRIPE_SECRET_KEY` y `VITE_STRIPE_PUBLISHABLE_KEY`. Para email se requiere `RESEND_API_KEY` y, opcionalmente, `FROM_EMAIL`.

Las siguientes integraciones son opcionales: `CONTENTAI_API_KEY`, `GHL_API_KEY`, `GHL_LOCATION_ID`, `GOOGLE_APPS_SCRIPT_URL`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_CONNECT_WEBHOOK_SECRET`, `KOBRAPAY_WEBHOOK_SECRET` y las variables del servicio Forge.

## Comandos

```bash
# Comprobación de TypeScript
pnpm check

# Pruebas unitarias
pnpm test

# Servidor de desarrollo
pnpm dev

# Compilación de producción
pnpm build

# Ejecución de la compilación
pnpm start
```

La aplicación de desarrollo utiliza el puerto indicado por `PORT` cuando está disponible. Si no se define, el servidor utiliza la configuración del entorno de ejecución.

## Base de datos

Antes de aplicar migraciones en una instalación propia, verifica que `DATABASE_URL` apunte a la base correcta y que exista una copia de seguridad. El script disponible es:

```bash
pnpm db:push
```

Este comando genera y aplica migraciones mediante Drizzle. No lo ejecutes contra producción sin revisar previamente el SQL y contar con respaldo.

## Webhooks de Stripe

El backend expone los endpoints:

- `/api/stripe/webhook` para eventos de la cuenta principal.
- `/api/stripe/connect-webhook` para eventos de cuentas conectadas de Stripe Connect.

Configura ambos endpoints en Stripe con los eventos correspondientes y guarda sus signing secrets únicamente como variables de entorno.

## Ejecutar en servidores propios

Consulta [`SELF_HOSTING.md`](./SELF_HOSTING.md) para conocer qué componentes no se incluyen en GitHub, las credenciales necesarias, la migración de base de datos y los pasos para reemplazar las dependencias de Manus.

## Seguridad

No se deben subir claves de Stripe, tokens OAuth, contraseñas, secretos JWT, credenciales de base de datos, archivos `.env`, archivos de logs ni datos reales de clientes. Antes de publicar cambios, revisa `git status` y el diff del commit.

## Estado de la migración

Este repositorio contiene la versión completa del proyecto KobraPay exportada desde el entorno de desarrollo administrado. Para correrlo fuera de Manus será necesario configurar las credenciales externas, la base de datos, el almacenamiento S3, Stripe/Stripe Connect y el proveedor de email en el nuevo entorno.
