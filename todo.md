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

## Fase 2 - Plataforma SaaS Multi-tenant (nueva solicitud)

### Base de datos y backend
- [x] Tabla tenant_settings: comisión %, tipo de cambio USD/MXN, nombre negocio, logo
- [x] Tabla tenant_users: relación admin → clientes de la plataforma
- [x] Campo verification_required en payment_links (OTP email/SMS/WhatsApp + selfie)
- [x] Campo chargeback_protection_text en payment_links
- [x] Campo usd_exchange_rate en payment_links (tipo de cambio al momento de crear)
- [x] Campo show_usd_equivalent en payment_links
- [x] Tabla identity_verifications: selfie_url, face_match_score, otp_verified, ip, user_agent
- [x] API: crear/editar/eliminar usuarios de la plataforma (admin only)
- [x] API: configurar comisión % y tipo de cambio por tenant
- [x] API: editar enlace pendiente (nombre, monto, descripción)
- [x] API: verificación OTP por email
- [x] API: subir selfie y comparar con reconocimiento facial (Face API)
- [x] API: exportar ventas CSV con desglose comisión
- [x] Middleware: cada usuario solo ve sus propios datos (tenant isolation)

### Panel de administración
- [x] Página "Mis Clientes" (admin): crear cuentas, ver actividad, configurar comisión individual
- [x] Configuración global: comisión default %, tipo de cambio USD/MXN
- [x] Toggle por enlace: requerir verificación OTP / selfie
- [x] Editar enlace pendiente desde la lista de Links
- [x] Vista admin: ver todos los clientes y sus ventas consolidadas
- [x] Exportar CSV con: fecha, cliente, monto bruto, comisión %, comisión $, neto

### Página pública de pago (rediseño estilo BillPocket)
- [x] Paso 1: Información del pago (monto MXN + equivalente USD si aplica)
- [x] Paso 2: Datos del cliente (nombre, apellido, email, teléfono)
- [x] Paso 3: Verificación OTP (si está activada) - código por email/SMS
- [x] Paso 4: Selfie + reconocimiento facial (si está activada)
- [x] Paso 5: Método de pago con tarjeta (Stripe Elements)
- [x] Aviso de no cancelación / protección contracargos visible antes de pagar
- [x] Footer con logos: Visa, Mastercard, Amex, Stripe Secure
- [x] Página de éxito con recibo descargable

## Fase 3 - Verificación de Identidad Avanzada
- [x] OTP por email funcional en flujo de pago
- [x] Captura de selfie en página de pago (webcam/cámara del dispositivo)
- [x] Almacenar selfie en S3 como evidencia de pago
- [x] Toggle en admin para activar/desactivar verificación por enlace
- [x] Mostrar evidencia de verificación en detalle de transacción

## Fase 4 - QR + MSI + Anti-Contracargos
- [x] Generar código QR de cada enlace de pago (librería qrcode)
- [x] Descargar QR como imagen PNG desde el panel
- [x] Nota legal de no cancelación visible en página de pago
- [x] Checkbox de aceptación de términos antes de pagar
- [ ] Meses Sin Intereses: opciones 3, 6, 9, 12 meses en página de pago (requiere Stripe MSI)
- [ ] Configurar MSI disponibles al crear enlace

## Fase 5 - Cobros Recurrentes y Programados
- [x] Página de Cobros Recurrentes (UI con casos de uso y roadmap)
- [ ] Crear enlace de pago recurrente (diario/semanal/mensual) - próxima fase
- [ ] Programar cobro para fecha futura específica - próxima fase
- [ ] Panel de suscripciones activas del comercio - próxima fase

## Fase 6 - Widget Embebible + Reportes PDF
- [x] Widget embebible: código HTML/JS para sitios externos
- [x] Preview del widget en el panel
- [x] Dashboard con gráfica de ventas por período (Recharts AreaChart 7 días)
- [ ] Reporte PDF mensual con membrete, logo y resumen de ventas - próxima fase

## Fase 7 - Plataforma FinTech Completa (visión futura)
- [ ] Pago de servicios (CFE, Telmex, agua) via API agregador (Baz/Conekta)
- [ ] Wallet con saldo (requiere licencia IFPE o alianza con proveedor regulado)
- [ ] Transferencias entre usuarios (requiere licencia IFPE + SPEI)
- [ ] Tarjeta débito propia (requiere alianza con banco emisor)
- [ ] App móvil (React Native)
- [ ] Integración con SAT para facturación automática (CFDI 4.0)
