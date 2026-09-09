# Variables de entorno de KobraPay

Crea un archivo `.env` local y completa estas variables con valores reales. **No subas `.env` a GitHub.** Esta guía no contiene secretos.

## Entorno

```text
NODE_ENV=development
PORT=3000
```

## Base de datos y sesión

```text
DATABASE_URL=
JWT_SECRET=
```

## Manus OAuth

```text
VITE_APP_ID=
OAUTH_SERVER_URL=
VITE_OAUTH_PORTAL_URL=
OWNER_OPEN_ID=
VITE_OWNER_OPEN_ID=
```

## APIs internas / Forge

```text
BUILT_IN_FORGE_API_URL=
BUILT_IN_FORGE_API_KEY=
VITE_FRONTEND_FORGE_API_URL=
VITE_FRONTEND_FORGE_API_KEY=
```

## Stripe

```text
STRIPE_SECRET_KEY=
VITE_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_CONNECT_WEBHOOK_SECRET=
KOBRAPAY_WEBHOOK_SECRET=
```

## Email

```text
RESEND_API_KEY=
FROM_EMAIL=noreply@kobrapay.mx
```

## Integraciones opcionales

```text
CONTENTAI_API_KEY=
GHL_API_KEY=
GHL_LOCATION_ID=
GOOGLE_APPS_SCRIPT_URL=
VITE_TURNSTILE_SITE_KEY=
```

## Recomendaciones

Usa valores distintos para desarrollo y producción. Genera un `JWT_SECRET` fuerte y no reutilices claves entre proyectos. Los signing secrets de Stripe deben corresponder al endpoint correcto: `STRIPE_WEBHOOK_SECRET` para la cuenta principal y `STRIPE_CONNECT_WEBHOOK_SECRET` para cuentas conectadas. Las claves secretas deben almacenarse en el gestor de secretos del proveedor de despliegue, no en el código ni en commits.
