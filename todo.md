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
- [x] Meses Sin Intereses: opciones 3, 6, 9, 12 meses en página de pago (requiere Stripe MSI)
- [x] Configurar MSI disponibles al crear enlace

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
- [x] Tabla chargebacks en DB (transacción, estatus, monto, afectación, documentos)
- [x] Webhook Stripe: detectar disputas automáticamente y guardar en DB (charge.dispute.created)
- [x] Página "Mis Aclaraciones" en dashboard
- [x] Tabla con: ID transacción, fecha, estatus, monto, afectación, última actualización
- [x] Subir documentos de evidencia para disputar
- [x] Notificación al admin cuando llega un contracargo nuevo

### Módulo Facturas
- [x] Tabla invoices en DB (folio, emisor RFC, receptor RFC, monto, conceptos, fecha)
- [x] Página "Mis Facturas" en dashboard
- [x] Formulario para crear factura (datos del cliente, conceptos, subtotal, IVA)
- [x] Generar PDF de factura con membrete del negocio
- [x] Descargar factura en PDF
- [x] Enviar factura por email al cliente (sendInvoiceEmail via Resend - botón real conectado)

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

## Fase 20 (Activa) - Módulo de Contratos
- [ ] Schema DB: tabla contracts (template, datos cliente, estado, firma_url, token único)
- [ ] Schema DB: tabla contract_documents (contrato, tipo doc, url S3)
- [ ] Migración SQL aplicada
- [ ] Backend: crear contrato con datos del cliente
- [ ] Backend: generar token único para enlace de firma
- [ ] Backend: subir firma digital del cliente (base64 → S3)
- [ ] Backend: subir documentos del cliente (INE, domicilio, RFC, CURP)
- [ ] Backend: actualizar estado del contrato (borrador→enviado→firmado→archivado)
- [ ] Backend: generar PDF del contrato con datos insertados
- [ ] Página Contratos en panel (solo super-admin/asistente)
- [ ] Formulario crear contrato con datos del cliente
- [ ] Lista de contratos con estado visual
- [ ] Página pública de firma (cliente ve contrato, firma y sube docs)
- [ ] PDF descargable del contrato firmado

## Rediseño Home - Layout tipo BillPocket (Feb 2026)
- [ ] Layout split-screen: izquierda texto bienvenida, derecha card con tabs Acceso/Registrar
- [ ] Features interactivas: clic en recuadro abre modal con descripción e imagen del panel
- [ ] Mantener colores y diseño actual (dark navy + verde KobraPay)

## Sesión Feb 28 - Completado
- [x] Home rediseñado con layout split-screen tipo BillPocket (izquierda: bienvenida, derecha: card Acceso/Registrar)
- [x] Features interactivas en Home: clic abre modal con explicación de cada funcionalidad
- [x] Favicon KobraPay actualizado
- [x] Página de Ayuda con manual por rol (vendedor, pagador, admin)
- [x] Reporte Mensual PDF: página con tabla de transacciones, KPIs y descarga con jsPDF
- [x] Reporte Mensual en sidebar del DashboardLayout
- [x] Dashboard: 4 nuevos KPIs (Cobrado hoy, Este mes, Clientes, Monto neto)
- [x] getDashboardStats mejorado con estadísticas del mes, hoy y total de clientes
- [x] Comprobante: botón "Ver" abre en nueva pestaña + botón "Descargar" en detalle de transacción
- [x] TypeScript: 0 errores
- [x] Tests: 61/61 pasando

## Fase 23 - Flujo de Acceso y Registro en Home
- [ ] Tab "Acceso" en Home: botón funcional que inicia sesión con OAuth
- [ ] Tab "Registrar" en Home: formulario con nombre completo, fecha de nacimiento, CURP, contraseña
- [ ] Tabla user_profiles en DB: nombre_completo, fecha_nacimiento, curp, rfc (opcional), telefono, negocio
- [ ] Backend: guardar perfil extendido al registrarse
- [ ] Validación de CURP (formato correcto 18 caracteres)
- [ ] Flujo de aprobación: nuevo registro queda en estado "pendiente" hasta que super-admin apruebe
- [ ] Email de bienvenida al aprobar cuenta

## Fase 24 - Flujo de Registro Propio + Panel de Aprobación Avanzado

- [x] Agregar campos accountType y permissions en user_profiles (DB + migración)
- [x] Crear página CompleteProfile.tsx con formulario completo post-OAuth
- [x] Rediseñar Registrations.tsx con panel lateral de aprobación y tipos de cuenta
- [x] Implementar permisos granulares en sidebar y rutas del dashboard
- [x] Email de bienvenida con tipo de cuenta asignado
- [x] Agregar sendWelcomeEmail en email.ts

## Fase 25 - Perfil Completo del Cliente + Guía de Uso en Email

- [x] Agregar campos bancarios y de empresa a user_profiles (CLABE, banco, razón social, dirección fiscal, etc.)
- [x] Rediseñar panel de Solicitudes de Registro con panel lateral avanzado (tipos de cuenta + permisos granulares)
- [x] Crear página de Perfil completo del cliente (4 secciones: personal, negocio, bancario, documentos)
- [x] Actualizar email de bienvenida con guía de uso paso a paso (único en el mercado)
- [x] Actualizar router de approve para guardar accountType y permissions en user_profiles

## Fase 26 - Perfil Completo Funcional

- [x] Campo avatarUrl en user_profiles + migración DB
- [x] Endpoint de upload de foto de perfil a S3 (multipart/form-data)
- [x] Endpoint de upload de documentos a S3 (INE, domicilio, acta)
- [x] Router userProfile: get, update, uploadAvatar, uploadDocument
- [x] Página MyProfile.tsx con 4 secciones: personal, negocio, bancario, documentos
- [x] Subida de foto de perfil funcional con preview inmediato
- [x] Subida de documentos funcional con vista previa y descarga
- [x] Ruta /dashboard/profile en App.tsx + acceso desde sidebar y header
- [x] Email de bienvenida con guía de uso de 5 pasos

## Fase 20 - Búsqueda Global + Comprobante PDF + Mejoras UX
- [x] Barra de búsqueda global en el header del dashboard (busca ventas, clientes, enlaces, páginas)
- [x] Comprobante PDF descargable desde el detalle de transacción en Mis Ventas (ya existía)
- [x] Firma e ID visibles en el modal de detalle de transacción (ya existía)
- [x] Búsqueda en Mis Ventas por nombre de cliente o número de operación (ya existía con debounce)

## Fase 21 - Registro Controlado + Contratos Completos
- [ ] Flujo de registro: cuenta nueva queda en estado "pending" automáticamente
- [ ] Super-admin recibe notificación al llegar registro nuevo
- [ ] Panel de aprobación en Registros: botón Aprobar/Rechazar con email automático
- [ ] Email de bienvenida al aprobar cuenta
- [ ] Email de rechazo con motivo al bloquear cuenta
- [ ] Schema DB: tabla contracts mejorada (template, datos cliente, token, estado, firma_url, docs)
- [ ] Schema DB: tabla contract_documents (contrato, tipo doc, url S3)
- [ ] Backend: CRUD completo de contratos (crear, listar, actualizar estado, subir firma, docs)
- [ ] Backend: token único para enlace de firma pública
- [ ] Backend: subir firma digital (base64 → S3)
- [ ] Backend: subir documentos del cliente (INE, domicilio, RFC, CURP → S3)
- [ ] Página pública de firma: cliente ve contrato completo, firma con canvas, sube docs
- [ ] Panel de contratos en dashboard: lista con estados, descarga PDF firmado
- [ ] Eliminar opción USD en crear enlace — solo MXN
- [ ] Agregar favicon KobraPay
- [ ] Reporte CSV de comisiones para superadmin (ingresos cliente vs comisiones KobraPay)

## Fase 22 - Centro de Notificaciones y Bienvenida Completa

- [ ] Tabla notifications en DB (tipo, titulo, mensaje, leida, userId, metadata, createdAt)
- [ ] Router backend: crear, listar, marcar como leida, contar no leidas
- [ ] Notificacion automatica al registrarse nuevo usuario (desde OAuth callback)
- [ ] Centro de notificaciones en header (campana con badge rojo de no leidas)
- [ ] Dropdown de notificaciones con link directo a Registros
- [ ] Job de recordatorio 24hrs: detectar registros pendientes y crear notificacion
- [ ] Email de bienvenida con certificado PDF al aprobar cuenta
- [ ] Pagina publica de Reglamento de Uso (/reglamento)
- [ ] Pagina publica de Aviso de Privacidad (/privacidad)
- [ ] Link a reglamento y privacidad en la pagina de pago publica y en el footer

## Fase 23 - UX y Mejoras Finales
- [ ] Favicon KobraPay en el navegador
- [ ] Datos fiscales en registro (RFC, CURP, nombre completo)
- [ ] Botón WhatsApp en detalle de transacción
- [ ] Notificación push al cobrar exitosamente
- [ ] Eliminar USD de crear enlace (solo MXN)
- [ ] Página de Ayuda con contenido real por sección
- [ ] Cobros Recurrentes con funcionalidad real

## Fase 24 - USD + Expedientes de Colaboradores
- [ ] Regresar USD al formulario de crear enlace con nota contextual para cobros internacionales
- [ ] Tabla employee_records en DB (nombre, foto, puesto, documentos, fecha ingreso)
- [ ] Backend CRUD de expedientes de colaboradores (crear, leer, actualizar, eliminar)
- [ ] Subida de documentos a S3 (CV, INE, comprobante domicilio, referencias laborales/personales)
- [ ] Página de lista de expedientes con foto de perfil y datos básicos
- [ ] Página de detalle de expediente con todos los documentos adjuntos
- [ ] Cada admin solo ve los expedientes de sus propios colaboradores (tenant isolation)

## Fase 25 - ES/EN, Reporte PDF y Cobros Recurrentes
- [ ] Selector de idioma ES/EN en la página de pago pública (PayPage)
- [ ] Reporte mensual PDF con membrete KobraPay descargable desde el panel
- [ ] Cobros recurrentes con Stripe Billing (suscripciones automáticas)

## Fase 26 - Mejoras Módulo RH y Reloj Checador
- [ ] Campo employeeNumber en tabla employee_records (automático o manual)
- [ ] Foto del colaborador en formulario de alta (subida directa desde el formulario)
- [ ] Tabla attendance_records para reloj checador (entrada/salida con timestamp y ubicación)
- [ ] Página de Reloj Checador: botón de entrada/salida y historial por colaborador
- [ ] Reporte de asistencia por período (exportar CSV)

## Correcciones y mejoras RH/Nómina/Checador (ronda 3)
- [ ] Corregir bug: eliminar colaborador dice "eliminado" pero no se borra de la BD
- [ ] Cambiar "salario por hora" a "salario diario" en todo el sistema
- [ ] Agregar campo "día de descanso" programable en perfil del colaborador
- [ ] Agregar campo "horas diarias" en perfil del colaborador
- [ ] Opción de horas extras (toggle + tarifa opcional)
- [ ] Reflejar descanso/permiso/ausencia en nómina con desglose
- [ ] Corregir historial del checador: mostrar día, hora entrada, hora salida, horas/minutos trabajados
- [ ] Corregir botón Calcular en Nómina (no abre nada)
- [ ] Reporte de nómina desglosado por días laborados, ausencias, horas extras

## Fase 27 - Notificaciones de Cita Médica + Reporte Comisiones PDF
- [ ] Notificación por email al paciente cuando se agenda una cita (fecha, hora, médico, motivo)
- [ ] Notificación por email al paciente cuando se modifica o cancela una cita
- [ ] Botón "Descargar Reporte PDF" en Desglose de Comisiones (superadmin) con resumen mensual

## Fase 28 - Manual de Puesto por Empleado
- [ ] Tabla job_position_files en DB (employeeId, fileName, fileUrl, fileKey, uploadedAt, uploadedBy)
- [ ] Backend: subir archivo de descripción de puesto a S3 (solo admin)
- [ ] Backend: listar archivos de descripción de puesto por empleado
- [ ] Backend: eliminar archivo de descripción de puesto (solo admin)
- [ ] En perfil de colaborador (admin): sección "Manual de Puesto" con subida de archivos PDF/Word/imagen
- [ ] En perfil de colaborador (empleado): sección "Mi Manual de Puesto" solo lectura con descarga

## Fase 29 - Propina en Links de Pago y Proceso de Cobro
- [ ] Campo "habilitar propina" (toggle) en formulario de crear link de pago
- [ ] Opciones de propina sugeridas: 10%, 15%, 20% (botones de selección rápida)
- [ ] Campo de propina manual en pesos (input numérico)
- [ ] Mostrar propina en la página pública de pago (PayPage) cuando está habilitada
- [ ] Incluir monto de propina en el total del cobro al procesar el pago
- [ ] Mostrar propina desglosada en el comprobante de pago y en Mis Ventas

## Pendiente para el final (no implementar aún)
- [ ] Manual de procedimientos completo con imágenes por área (superadmin, admin, empleado)

## Fase 22 - Mejoras Agenda Médica (sesión actual)
- [x] Corregir colores del panel de paciente (texto visible sobre fondo oscuro)
- [x] Agregar vista de calendario interactivo (tab Calendario con mini-calendario)
- [x] Botón Reagendar/Modificar cita en agenda, calendario y panel de paciente
- [x] Botón Cancelar cita con cambio de estado (no envía recordatorios)
- [x] Sistema de emails de cumpleaños para pacientes (del consultorio)
- [x] Sistema de emails de cumpleaños para empleados (de KobraPay y de la empresa)
- [x] Banner de cumpleaños del día en la Agenda Médica con botones de envío
- [x] Campo birthDate en tabla employee_records (migración aplicada)

## Fase 23 - Mejoras Agenda Médica (continuación)
- [x] Campo birthDate visible en formulario de Expedientes RH
- [x] Recordatorio al paciente 24h antes de su cita (email + enlace WhatsApp)
- [x] Recordatorio post-cita al admin para marcar como completada o cancelada

## Fase 24 - Correcciones urgentes
- [x] Corregir acceso restringido en página de Registros para super-admin (DPERUYEROS)
- [x] Agregar procedimientos sendAppointmentReminder y sendPostAppointmentAlert en el router
- [x] Actualizar MedicalAgenda con botones de recordatorio 24h y alerta post-cita

## Fase 25 - Auditoría y correcciones
- [x] Corregir employees.create y employees.update para incluir birthDate en el router
- [x] Agregar campo title al formulario de contratos (nombre del contrato)
- [x] Módulo de Capacitaciones: schema, router, páginas y menú

## Fase 26 - Bugs urgentes Agenda Médica
- [x] Corregir bug: archivos del paciente no se guardan (tab Archivos muestra 0)
- [x] Corregir texto invisible en botón "+ Nueva cita" y título de página
- [x] Mejorar botón Recordar: modal con Email + WhatsApp
- [x] Agregar campanita de alertas de citas del día con opción de desactivar/marcar como visto
- [x] Implementar recordatorios de cita personalizados con marca del negocio (logo, doctor, teléfonos)
- [x] Agregar página de Capacitaciones con cursos de KobraPay

## Fase 27 - Contenido de Cursos de Capacitaciones
- [ ] Agregar módulos y lecciones a los 15 cursos de KobraPay en la BD
- [ ] Vista detallada de curso con módulos, lecciones y progreso por módulo
- [ ] PDFs y videos enlazados en cada lección
- [ ] Vista de progreso del empleado (CV de capacitaciones)

## Capacitaciones - Mejoras (Mar 2026)
- [x] Arreglar bug de "Subiendo..." atascado en evidencia de cursos
- [x] Agregar opción de borrar evidencia si se equivocaron de archivo
- [x] Cursos con contenido interno (sin depender de URLs externas) - módulos con texto, guías, tips
- [x] Perfil profesional: sección de cursos completados en MyProfile con fecha y evidencia
- [x] Al marcar completado, aparece automáticamente en el perfil del usuario

## Fase 28 - Contratos Digitales Completos (Mar 2026)
- [ ] Campos en schema: adminSignatureUrl, adminSignedAt, adminSignedByName en contracts
- [ ] Campos KYC en contracts: razonSocial, representanteLegal, rfcEmpresa, situacionFiscalUrl, comprobanteDomicilioUrl, ineUrl (ya existe), passportUrl (ya existe)
- [ ] Migrar BD con nuevos campos
- [ ] SignContract.tsx: canvas de firma con react-signature-canvas, subida de INE/situación fiscal/domicilio
- [ ] Contracts.tsx: botón "Firmar como KobraPay" con canvas de firma del superadmin
- [ ] Al firmar ambas partes: enviar email con copia del contrato firmado a ambos
- [ ] Vista de documentos KYC del cliente en Clients.tsx (perfil del cliente para superadmin)
- [ ] Contrato siempre actualizado con nuevas funcionalidades de la plataforma

## Sesión actual - Bugs y mejoras
- [ ] Fix YouTube: videos en módulos de cursos no se muestran (embedding desactivado)
- [ ] Agregar botón de actualizar progreso en Training sin recargar página completa
- [ ] Magazine: agregar subida de imagen de portada y archivos adjuntos
- [ ] Magazine: mejorar viewer con diseño de revista real (portada visual)
- [ ] Cursos: agregar subida de imagen de portada en formulario de creación
- [ ] Actualizar plantillas de contratos con todas las funcionalidades nuevas
- [ ] Agregar opción "Ver como Asistente" en dropdown del superadmin

## Agenda de Proveedores (nueva funcionalidad)
- [ ] Schema DB: tabla suppliers (ownerId, nombre, empresa, teléfono, correo, categoría, notas, activo)
- [ ] Backend tRPC: CRUD de proveedores (crear, editar, eliminar, listar, buscar)
- [ ] Página Proveedores.tsx con buscador en tiempo real por nombre/empresa/teléfono
- [ ] Categorías de proveedores: Alimentos, Tecnología, Limpieza, Salud, Transporte, Otro
- [x] Agregar al sidebar en grupo "Empresa"
- [ ] Acceso para superadmin, admin y asistente

## Prescripciones Médicas (nueva funcionalidad)
- [x] Schema DB: tabla prescriptions (patientId, doctorId, patientName, age, date, medications, diagnosis, instructions, signatureUrl, membreteUrl)
- [x] Backend tRPC: CRUD prescripciones, subida de membrete del doctor, guardar firma
- [x] Página Prescriptions.tsx: formulario con membrete, firma digital con canvas, imprimir, enviar WhatsApp/email
- [x] Subida de imagen de membrete/licencia del doctor en configuración
- [ ] Integrar prescripciones en perfil del paciente en MedicalAgenda
- [x] Agregar ruta /dashboard/prescriptions al sidebar (solo para médicos)

## Módulo Farmacia (nueva funcionalidad)
- [x] Schema DB: tabla pharmacy_customers (nombre, teléfono, correo, fecha nacimiento, notas)
- [ ] Schema DB: tabla pharmacy_prescriptions (customerId, doctorName, date, fileUrl, medications, notes, status: pending/dispensed)
- [x] Backend tRPC: CRUD clientes farmacia, subir prescripción escaneada, marcar como surtida
- [x] Página Farmacia.tsx: lista de clientes con buscador, perfil de cliente con historial de prescripciones
- [x] Subida de archivos: foto, PDF, imagen escaneada de prescripción
- [x] Agregar al sidebar en grupo "Empresa"

## Control de Acceso por Módulo (Prescripciones / Farmacia)
- [ ] Tabla module_access: (userId, module, grantedBy, grantedAt, isActive, notes)
- [ ] Tabla module_requests: (userId, module, requestedAt, status, reviewedBy, reviewedAt, notes)
- [ ] Backend: superadmin puede listar solicitudes, aprobar/revocar acceso por módulo
- [ ] Backend: admin puede solicitar acceso a módulo y gestionar acceso de sus colaboradores
- [ ] Frontend: Prescriptions y Farmacia muestran pantalla de "acceso restringido" si no tienen permiso
- [ ] Frontend: botón "Solicitar acceso" que notifica al superadmin
- [ ] Panel superadmin: lista de solicitudes pendientes con botón aprobar/rechazar
- [ ] Sidebar: ocultar Prescripciones y Farmacia si no tienen acceso
- [ ] Notificación al superadmin cuando llega solicitud de acceso farmacéutico

## Mejoras Prescripciones y Sidebar Clínico
- [ ] Campo stamp_url en tabla prescriptions (sello del doctor)
- [ ] Backend: updatePrescription (editar receta existente)
- [ ] Backend: uploadStamp (subir sello en perfil del doctor)
- [ ] Prescriptions.tsx: botón editar en cada receta guardada
- [ ] Prescriptions.tsx: campo para subir sello en perfil del doctor
- [ ] Sidebar: grupo colapsable "Clínico" con Agenda Médica, Prescripciones, Farmacia, Proveedores, Control de Módulos

## Flujo de aprobación dos niveles (asistente + superadmin)
- [ ] Agregar rol 'assistant' en tabla users (enum admin|user|assistant)
- [ ] Agregar campo reviewed_by, reviewed_at, review_status en module_requests
- [ ] Backend: asistente puede pre-aprobar/rechazar solicitudes de módulos
- [ ] Backend: superadmin da visto bueno final en solicitudes pre-aprobadas
- [ ] Backend: asistente puede dar accesos generales sin aprobación del superadmin
- [ ] Panel de asistente para revisar solicitudes y gestionar accesos
- [ ] Panel de superadmin actualizado con bandeja de solicitudes pre-aprobadas
- [ ] Notificación al aprobar acceso (al negocio)
- [ ] Historial de recetas por paciente en Agenda Médica
- [ ] Exportar receta como PDF descargable

## Flujo de aprobación dos niveles (asistente + superadmin)
- [ ] Agregar rol 'assistant' en tabla users y schema
- [ ] Agregar campos reviewed_by, reviewed_at, review_status en module_requests
- [ ] Backend: asistente puede pre-aprobar/rechazar solicitudes de módulos
- [ ] Backend: superadmin da visto bueno final en solicitudes pre-aprobadas
- [ ] Backend: asistente puede dar accesos generales sin aprobación del superadmin
- [ ] Panel de asistente para revisar solicitudes y gestionar accesos
- [ ] Panel de superadmin actualizado con bandeja de solicitudes pre-aprobadas
- [ ] Notificación al aprobar acceso (al negocio)
- [ ] Historial de recetas por paciente en Agenda Médica
- [ ] Exportar receta como PDF descargable

## Completado en esta sesión (Mar 1, 2026)
- [x] Magazine: subida de imagen de portada y archivos PDF/imágenes
- [x] Magazine: modo "Crear con IA" vs "Subir mi revista"
- [x] Panel de asistente (AssistantPanel.tsx) creado
- [x] Tarjetas del panel clickeables con navegación
- [x] Historial de recetas por paciente en MedicalAgenda
- [x] Exportar receta como PDF (generatePrescriptionPdf.ts)
- [x] Botón de descarga PDF en Prescriptions.tsx
- [x] Agenda de Proveedores con buscador en tiempo real
- [x] Prescripciones médicas con firma digital canvas
- [x] Farmacia con clientes y subida de prescripciones escaneadas
- [x] Sector Salud como grupo colapsable en sidebar
- [x] ModuleGuard con superadmin sin restricciones
- [x] Panel de Control de Módulos corregido para superadmin
- [x] isSuperAdmin reconoce role=admin en BD
- [x] EditPrescriptionModal para editar recetas existentes
- [x] Sello del doctor en perfil de prescripciones
- [x] 15 opciones de negocio en formulario de solicitud (incluyendo dentista)
- [x] Panel de asistente con flujo de dos niveles
- [x] Training: botón refresh y subida de imagen de portada
- [x] uploadCourseCover en backend

## Sesión 2026-03-01 - Correcciones y mejoras

- [x] Corregir notificaciones duplicadas: job de recordatorio ahora usa hasRecentNotification para evitar duplicados en < 3 horas
- [x] Limpiar notificaciones duplicadas existentes en la BD (pending_reminder)
- [x] Corregir auth.me para pasar el role al verificar isSuperAdmin (bug: solo pasaba openId)
- [x] Agregar notificación al usuario cuando el superadmin aprueba su solicitud de módulo
- [x] Agregar más tipos de iconos al NotificationBell (module_approved, module_rejected, appointment_reminder, birthday, new_payment)
- [x] Vincular prescripciones con pacientes de la Agenda Médica: búsqueda en tiempo real al crear receta
