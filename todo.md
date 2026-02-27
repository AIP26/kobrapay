# Procesador de Pagos - TODO

## Base de Datos y Backend
- [x] Esquema de base de datos: tablas payment_links, transactions, bank_accounts
- [x] Migración y aplicación del esquema SQL
- [x] Helpers de base de datos en server/db.ts
- [x] API tRPC: crear enlace de pago
- [x] API tRPC: obtener enlace de pago por token (público)
- [x] API tRPC: listar enlaces de pago del vendedor
- [x] API tRPC: historial de transacciones
- [x] API tRPC: guardar/actualizar datos bancarios del vendedor
- [x] API tRPC: procesar pago con Stripe (crear PaymentIntent)
- [x] API tRPC: webhook de Stripe para confirmar pagos
- [x] Sistema de notificaciones al vendedor cuando se completa un pago

## Panel de Administración (Vendedor)
- [x] Layout del dashboard con sidebar de navegación
- [x] Página de inicio del dashboard con métricas (total cobrado, pagos pendientes, etc.)
- [x] Formulario para crear enlace de pago (nombre cliente, monto, descripción)
- [x] Generador de enlace único y copiable al portapapeles
- [x] Lista de enlaces de pago creados con estado (pendiente, pagado, expirado)
- [x] Historial de transacciones con filtros
- [x] Página de configuración de datos bancarios/Stripe

## Página Pública de Pago (Cliente)
- [x] Página de pago pública accesible por token único
- [x] Resumen del pago (monto, descripción, vendedor)
- [x] Formulario de datos personales del cliente (nombre, email, teléfono)
- [x] Formulario de tarjeta de crédito/débito con Stripe Elements
- [x] Validación de enlace (expirado, ya pagado, no encontrado)
- [x] Página de confirmación de pago exitoso
- [x] Página de error de pago

## Integración Stripe
- [x] Configurar Stripe con webdev_add_feature
- [x] Crear PaymentIntent en el servidor
- [x] Stripe Elements en el frontend para captura segura de tarjeta
- [x] Webhook para confirmar pagos y actualizar estado en DB
- [ ] Conectar cuenta Stripe del vendedor (Stripe Connect - requiere plan Stripe avanzado)

## Diseño y UX
- [x] Paleta de colores profesional (azul/blanco para finanzas)
- [x] Tema global en index.css
- [x] Diseño responsive (mobile-first)
- [x] Estados de carga y error en todos los formularios
- [x] Animaciones y micro-interacciones

## Pruebas
- [x] Tests unitarios para procedimientos tRPC principales (9 tests pasando)
- [x] Verificación de flujo completo de pago

## Mejoras UI estilo BillPocket (nueva solicitud)
- [x] Sidebar oscuro estilo BillPocket con secciones: Panel, Mis Ventas, Links de Pago, Configuración
- [x] Tabla de ventas con monitoreo en tiempo real (columnas: fecha, cliente, monto, estado, acciones)
- [x] Al generar enlace: opciones de Copiar, Enviar por WhatsApp, Enviar por Email
- [x] Recibo automático por email al cliente cuando el pago sea exitoso (via Stripe receipt_email)
- [x] Mejorar página de confirmación de pago con diseño de recibo formal
- [x] Dashboard con acciones rápidas y resumen de ventas
