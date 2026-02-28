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

## Fase 8 - Identidad de Marca KobraPay + Nuevos Módulos

### Logo y Branding
- [x] Subir logo KobraPay final a CDN
- [x] Aplicar logo en DashboardLayout (sidebar)
- [x] Aplicar logo en Home.tsx (landing page)
- [x] Aplicar logo en PayPage.tsx (página de pago pública)
- [x] Actualizar nombre "PagaFácil" → "KobraPay" en todos los archivos
- [ ] Actualizar favicon con ícono KobraPay
- [ ] Actualizar título de la app en settings

### Módulo Aclaraciones (Contracargos)
- [ ] Tabla chargebacks en DB (transacción, estatus, monto, afectación, documentos)
- [ ] Webhook Stripe: detectar disputas automáticamente y guardar en DB
- [x] Página "Mis Aclaraciones" en dashboard
- [x] Tabla con: ID transacción, fecha, estatus, monto, afectación, última actualización
- [x] Subir documentos de evidencia para disputar
- [x] Notificación al admin cuando llega un contracargo nuevo

### Módulo Facturas
- [ ] Tabla invoices en DB (folio, emisor RFC, receptor RFC, monto, conceptos, fecha)
- [x] Página "Mis Facturas" en dashboard
- [x] Formulario para crear factura (datos del cliente, conceptos, subtotal, IVA)
- [x] Generar PDF de factura con membrete del negocio
- [x] Descargar factura en PDF
- [x] Enviar factura por email al cliente

### Sección Lector Físico
- [x] Página "Compra tu Lector" en dashboard
- [x] Información sobre Stripe Terminal (modelos, precios)
- [x] Formulario de solicitud de lector (nombre, dirección, teléfono)

## Fase 9 - Seguridad Multi-Tenant y Ciberseguridad

### Aislamiento de datos (Multi-Tenant)
- [x] Middleware de tenant isolation: cada query filtra por owner_id obligatoriamente
- [x] Roles: superadmin (tú), admin (cliente tuyo), user (empleado del cliente)
- [x] superadmin ve todo; admin solo ve sus datos; user solo lo que admin le permita
- [x] Prohibir acceso cruzado entre tenants (un cliente no puede ver datos de otro)
- [x] Auditoría de accesos: log de quién accedió a qué y cuándo

### Hardening del servidor
- [x] Rate limiting: máximo N requests por IP por minuto (anti-brute force)
- [x] Helmet.js: headers de seguridad HTTP (CSP, HSTS, X-Frame-Options, etc.)
- [x] CORS restringido: solo dominios autorizados
- [x] Sanitización de inputs: prevenir SQL injection y XSS
- [x] Tokens JWT con expiración corta + refresh tokens (gestionado por Manus OAuth)
- [x] Bloqueo automático de IP tras intentos fallidos de login (10 intentos = 15 min bloqueo)
- [x] Logs de seguridad: intentos de acceso no autorizado

### Protección de rutas frontend
- [x] Rutas protegidas por rol: superadmin, admin, user
- [x] Redirección automática si no tiene permisos
- [x] No exponer datos sensibles en el frontend (comisiones de otros tenants, etc.)

## Fase 10 - Mejoras Críticas de UX y Funcionalidad

### Email al crear enlace de pago + Base de datos de clientes
- [ ] Agregar campo "Email del cliente" al formulario de crear enlace de pago
- [ ] Guardar email del cliente en payment_links al crear
- [ ] Tabla customers en BD: nombre, email, teléfono, total pagado, fecha primer pago
- [ ] Al completar un pago, crear/actualizar registro del cliente automáticamente
- [ ] Página "Mis Clientes" con tabla y buscador por nombre/email
- [ ] Al hacer click en cliente, ver historial de todas sus compras

### OTP por email (arreglar)
- [ ] Integrar servicio de email real (Resend o SendGrid) para enviar OTP
- [ ] Verificar que el código llegue correctamente al email del cliente
- [ ] Mejorar diseño del email OTP (plantilla HTML profesional)

### Selector de lada internacional en teléfono
- [ ] Agregar selector de código de país (+52 México, +1 USA, etc.) en campo teléfono
- [ ] Mostrar bandera del país seleccionado
- [ ] Guardar número completo con lada en la BD

### Recibos profesionales
- [ ] Rediseñar email de recibo con membrete, logo KobraPay, datos del negocio
- [ ] Incluir: número de transacción, fecha, descripción, monto, datos del cliente
- [ ] Diseño tipo factura/recibo formal con colores de marca
- [ ] PDF descargable del recibo desde la página de éxito

## Fase 11 - Detalle de Transacciones, Estatus de Fallo y Comprobantes

- [ ] Número de operación único visible en cada transacción en Mis Ventas
- [ ] Estatus claro con colores: Pagado (verde), Fallido (rojo), Pendiente (amarillo), Reembolsado (azul)
- [ ] Razón de fallo en español (banco rechazó, fondos insuficientes, tarjeta expirada, etc.)
- [ ] Mensaje de acción sugerida cuando falla (llamar al banco, usar otra tarjeta)
- [ ] Vista de detalle de venta al hacer click en una transacción
- [ ] Comprobante de pago descargable en PDF desde el detalle de venta
- [ ] Selector de lada internacional en campo teléfono en PayPage
- [ ] Módulo de Clientes con buscador (nombre, email, teléfono)
- [ ] Historial de compras por cliente
- [ ] Botón de idioma ES/EN en la página de pago pública (toggle español/inglés)

## Fase 12 - Búsqueda en Mis Ventas (estilo MercadoPago)
- [ ] Barra de búsqueda en Mis Ventas por nombre de cliente o número de operación
- [ ] Agrupación de ventas por fecha (ej: "26 de febrero")
- [ ] Estatus visual: rechazado en rojo, exitoso en verde, con ícono de bolsa de compras
- [ ] Número de operación visible debajo del nombre del cliente
- [ ] Backend: procedimiento de búsqueda de transacciones por nombre/operación

## Fase 13 - OTP, Moneda, Superadmin y Comisiones
- [ ] Arreglar OTP por email real con Resend (configurar RESEND_API_KEY)
- [ ] Eliminar opción USD en enlaces de pago — solo MXN
- [ ] Panel superadmin: crear cuentas de clientes con usuario/contraseña
- [ ] Panel superadmin: asignar límites y permisos por cliente
- [ ] Reporte privado de comisiones para superadmin (no visible al cliente)
- [ ] CSV de exportación con tabla separada: ingresos del cliente vs comisiones de KobraPay
- [ ] Investigar e implementar Stripe Connect para separación automática de fondos

## Fase 14 - Mejoras completadas (sesión actual)
- [x] Configurar RESEND_API_KEY en el proyecto
- [x] Verificar dominio kobrapay.mx en Resend (DNS records verificados en GoDaddy)
- [x] Filtros avanzados en página de Ventas (por fecha, estado)
- [x] Módulo de colaboradores/empleados por negocio con permisos limitados
- [ ] Modal de detalle de transacción con recibo PDF descargable (próxima sesión)
- [ ] Reporte de comisiones para superadmin (próxima sesión)

## Fase 15 - Catálogo, POS, Facturación y Pago de Servicios
- [x] Schema DB: tabla products (nombre, precio, foto opcional, categoría, stock opcional, activo)
- [x] Backend CRUD de productos (crear, editar, eliminar, listar por negocio)
- [x] Página Catálogo/Inventario con toggle de stock, subida de foto opcional
- [x] Página POS con carrito: seleccionar productos, ajustar cantidades, generar cobro
- [x] Integrar catálogo al crear cobro (elegir producto en lugar de escribir manualmente)
- [ ] Módulo de Facturación: datos fiscales del negocio, generar factura PDF
- [ ] Módulo de Pago de Servicios: CFE, Telmex, agua, etc.

## Fase 16 - QR automático, Apple Pay/Google Pay, Stripe Connect
- [x] QR automático en modal de detalle de enlace de pago
- [x] Botón de descarga del QR como PNG
- [x] Apple Pay / Google Pay en página de pago (Stripe Payment Request Button)
- [x] Sidebar actualizado con Catálogo y POS
- [x] POS: cobro manual (sin catálogo) con QR y WhatsApp
- [x] POS: QR del enlace generado en modal
- [x] POS: botón de compartir por WhatsApp
- [x] 28 nuevos tests para módulo de productos y carrito POS (61 tests totales)
- [ ] Planificación Stripe Connect para que negocios conecten su banco

## Fase 17 - Firma Digital + Carga de Identificación en Pago
- [x] Schema DB: campos requireSignature, requireIdUpload en payment_links
- [x] Schema DB: campos signatureUrl, idDocumentUrl en transactions
- [x] Migración SQL aplicada
- [x] Backend: procedimiento uploadSignature (base64 → S3)
- [x] Backend: procedimiento uploadIdDocument (archivo → S3)
- [x] Backend: validaciones en createIntent (requireSignature, requireIdUpload)
- [x] Toggle en CreateLink: activar firma digital y/o carga de ID
- [x] Paso de firma en PayPage: canvas con firma dedo/mouse, botón limpiar y confirmar
- [x] Paso de carga de ID en PayPage: click para subir INE, pasaporte o PDF
- [x] Política de no cancelaciones visible en el paso de firma
- [x] StepProgress actualizado con pasos de firma e ID
- [ ] Mostrar firma e ID en el detalle de transacción del panel del comercio
- [ ] Checkpoint guardado

## Fase 18 - Flujo de registro controlado por super-admin
- [ ] Registro público crea cuenta en estado "pendiente"
- [ ] Super-admin recibe notificación de nuevo registro
- [ ] Panel de aprobación de cuentas en admin
- [ ] Al aprobar: cuenta activa + email de bienvenida
- [ ] Al rechazar: cuenta bloqueada + email de rechazo

## Fase 19 - Manual instructivo KobraPay
- [ ] Manual Markdown/PDF con capturas de pantalla
- [ ] Sección: Qué es KobraPay y cómo funciona
- [ ] Sección: Registro y activación de cuenta
- [ ] Sección: Crear primer cobro
- [ ] Sección: Opciones avanzadas (OTP, selfie, firma, ID)
- [ ] Sección: POS y catálogo
- [ ] Sección: Reportes y exportación
- [ ] Sección: Para el super-admin (gestión de clientes)

## Fase 20 - Módulo de Contratos (solo Super-Admin y Asistente)
- [ ] Schema DB: tabla contracts (template, datos del cliente, estado, firma_url, documentos)
- [ ] Plantilla de contrato legal en español con terminología mexicana (LFPDPPP)
- [ ] Toggle de cláusula de exclusividad en la plantilla (activar/desactivar)
- [ ] Panel privado "Contratos" solo visible para super-admin y asistente (no para clientes)
- [ ] Crear contrato: llenar datos del cliente (nombre completo, RFC, INE, dirección, CURP, negocio)
- [ ] Generar PDF del contrato con datos del cliente insertados automáticamente
- [ ] Enviar enlace único al cliente para revisar y firmar
- [ ] Página pública de firma: cliente ve contrato completo, firma con dedo/mouse
- [ ] Carga de documentos en el mismo enlace: INE/Pasaporte, comprobante de domicilio, RFC, CURP
- [ ] Guardar firma digital + documentos en S3
- [ ] Estado del contrato: Borrador → Enviado → Firmado → Archivado
- [ ] Descarga de contrato firmado en PDF con firma incluida

## Fase 21 - Roles de Colaboradores Avanzados
- [ ] Rol "asistente": acceso a contratos, documentos, cobros, clientes (sin comisiones ni reportes globales)
- [ ] Rol "operador": solo crear cobros y ver sus propias ventas
- [ ] Invitar colaborador por email con rol asignado desde el panel del super-admin
- [ ] Panel de gestión de colaboradores solo para super-admin
- [ ] Módulo de contratos visible solo para super-admin y asistente (nunca para clientes)

## Fase 22 - Manual de Ayuda Contextual por Rol
- [ ] Sección "Ayuda" en el panel con contenido diferente según el rol del usuario
- [ ] Manual básico para negocios clientes: cobros, POS, catálogo, ventas, compartir links
- [ ] Manual de colaboradores/operadores: funciones disponibles según su rol
- [ ] Manual de asistente: contratos, documentos, gestión de clientes
- [ ] Manual de super-admin: administración completa de la plataforma
- [ ] Capturas de pantalla y pasos numerados en cada sección del manual
