CREATE TABLE `agent_commissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agentId` int NOT NULL,
	`transactionId` int NOT NULL,
	`clientUserId` int NOT NULL,
	`transactionAmount` decimal(12,2) NOT NULL,
	`commissionRate` decimal(5,2) NOT NULL,
	`commissionAmount` decimal(12,2) NOT NULL,
	`status` varchar(32) NOT NULL DEFAULT 'pending',
	`paidAt` timestamp,
	`paymentReference` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `agent_commissions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `agent_referrals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agentId` int NOT NULL,
	`clientUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `agent_referrals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `api_checkout_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`apiKeyId` int NOT NULL,
	`userId` int NOT NULL,
	`sessionId` varchar(100) NOT NULL,
	`amount` int NOT NULL,
	`currency` varchar(10) NOT NULL DEFAULT 'MXN',
	`description` varchar(500) NOT NULL,
	`customerEmail` varchar(320),
	`customerName` varchar(255),
	`successUrl` varchar(1000) NOT NULL,
	`cancelUrl` varchar(1000) NOT NULL,
	`checkoutUrl` varchar(1000),
	`metadata` text,
	`status` enum('pending','completed','expired','cancelled') NOT NULL DEFAULT 'pending',
	`transactionId` int,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `api_checkout_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `api_checkout_sessions_sessionId_unique` UNIQUE(`sessionId`)
);
--> statement-breakpoint
CREATE TABLE `api_keys` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`keyHash` varchar(255) NOT NULL,
	`keyPrefix` varchar(20) NOT NULL,
	`environment` enum('live','test') NOT NULL DEFAULT 'live',
	`permissions` varchar(255) NOT NULL DEFAULT 'checkout',
	`lastUsedAt` timestamp,
	`requestCount` int NOT NULL DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `api_keys_id` PRIMARY KEY(`id`),
	CONSTRAINT `api_keys_keyHash_unique` UNIQUE(`keyHash`)
);
--> statement-breakpoint
CREATE TABLE `associate_clients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`associate_id` int NOT NULL,
	`client_name` varchar(255) NOT NULL,
	`client_email` varchar(255) NOT NULL,
	`client_business_name` varchar(255),
	`client_phone` varchar(50),
	`assigned_plan` enum('express','connect','custom','enterprise'),
	`status` enum('pending','pre_approved','active','rejected','inactive') NOT NULL DEFAULT 'pending',
	`notes` text,
	`assistant_approved_by` int,
	`assistant_approved_at` int,
	`assistant_notes` text,
	`super_admin_approved_by` int,
	`super_admin_approved_at` int,
	`super_admin_notes` text,
	`created_at` int NOT NULL,
	`updated_at` int NOT NULL,
	CONSTRAINT `associate_clients_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `associate_commission_tiers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`min_clients` int NOT NULL,
	`max_clients` int,
	`commission_pct` decimal(5,2) NOT NULL,
	`label` varchar(64) NOT NULL,
	`description` text,
	`sort_order` int NOT NULL DEFAULT 0,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `associate_commission_tiers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `associate_commissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`associateUserId` int NOT NULL,
	`clientUserId` int,
	`clientEmail` varchar(320) NOT NULL,
	`clientName` varchar(255) NOT NULL,
	`clientBusinessName` varchar(255),
	`clientPhone` varchar(32),
	`status` enum('pending','assistant_approved','active','rejected','inactive') NOT NULL DEFAULT 'pending',
	`assignedPlan` varchar(50),
	`commissionRate` decimal(5,2) NOT NULL DEFAULT '1.00',
	`totalVolumeProcessed` decimal(14,2) NOT NULL DEFAULT '0.00',
	`totalCommissionEarned` decimal(14,2) NOT NULL DEFAULT '0.00',
	`notes` text,
	`paymentCycle` varchar(20) NOT NULL DEFAULT 'monthly',
	`approvedAt` bigint,
	`createdAt` bigint NOT NULL,
	`updatedAt` bigint NOT NULL,
	CONSTRAINT `associate_commissions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `associate_earnings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`associate_commission_id` int NOT NULL,
	`associate_user_id` int NOT NULL,
	`client_user_id` int NOT NULL,
	`transaction_id` int,
	`payment_amount` decimal(14,2) NOT NULL,
	`commission_rate` decimal(5,2) NOT NULL,
	`commission_amount` decimal(14,2) NOT NULL,
	`currency` varchar(10) NOT NULL DEFAULT 'MXN',
	`earning_status` enum('pending','paid') NOT NULL DEFAULT 'pending',
	`paid_at` bigint,
	`paid_reference` varchar(128),
	`created_at` bigint NOT NULL,
	CONSTRAINT `associate_earnings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `associate_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`phone` varchar(32),
	`city` varchar(100),
	`state` varchar(100),
	`bio` text,
	`experience` varchar(255),
	`bankName` varchar(100),
	`clabe` varchar(18),
	`bankAccountHolder` varchar(255),
	`totalClientsReferred` int NOT NULL DEFAULT 0,
	`totalCommissionEarned` decimal(14,2) NOT NULL DEFAULT '0.00',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `associate_profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `associate_profiles_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `attendance_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employeeId` int NOT NULL,
	`ownerId` int NOT NULL,
	`type` varchar(16) NOT NULL,
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	`ipAddress` varchar(64),
	`latitude` varchar(32),
	`longitude` varchar(32),
	`notes` text,
	`absenceType` varchar(32),
	`comment` text,
	`editedByUserId` int,
	`editedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `attendance_records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`userEmail` varchar(320),
	`action` varchar(64) NOT NULL,
	`resource` varchar(255) NOT NULL,
	`details` text,
	`ipAddress` varchar(64),
	`userAgent` text,
	`statusCode` int,
	`success` boolean NOT NULL DEFAULT true,
	`severity` enum('info','warning','critical') NOT NULL DEFAULT 'info',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bank_accounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`connect_type` enum('express','custom') NOT NULL DEFAULT 'express',
	`stripe_account_id` varchar(128),
	`stripe_status` enum('not_started','pending','active','restricted','disabled') NOT NULL DEFAULT 'not_started',
	`stripe_charges_enabled` boolean NOT NULL DEFAULT false,
	`stripe_payouts_enabled` boolean NOT NULL DEFAULT false,
	`stripe_details_submitted` boolean NOT NULL DEFAULT false,
	`stripe_onboarded_at` int,
	`account_alias` varchar(100),
	`bank_name` varchar(100),
	`clabe` varchar(18),
	`account_number` varchar(20),
	`card_number` varchar(16),
	`account_holder_name` varchar(255),
	`rfc` varchar(20),
	`curp` varchar(18),
	`razon_social` varchar(255),
	`regimen_fiscal` varchar(100),
	`is_primary` boolean NOT NULL DEFAULT false,
	`is_active` boolean NOT NULL DEFAULT true,
	`notes` text,
	`created_at` int NOT NULL,
	`updated_at` int NOT NULL,
	CONSTRAINT `bank_accounts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `blocked_ips` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ip` varchar(50) NOT NULL,
	`reason` varchar(200) NOT NULL DEFAULT 'auto_blocked',
	`alert_count` int NOT NULL DEFAULT 1,
	`blocked_at` bigint NOT NULL,
	`expires_at` bigint,
	`unblocked_at` bigint,
	`unblocked_by` int,
	`is_active` tinyint NOT NULL DEFAULT 1,
	CONSTRAINT `blocked_ips_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `chargebacks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`transactionId` int,
	`stripeDisputeId` varchar(128),
	`amount` int NOT NULL,
	`currency` varchar(8) NOT NULL DEFAULT 'mxn',
	`reason` varchar(128),
	`reasonEs` varchar(255),
	`status` varchar(32) NOT NULL DEFAULT 'open',
	`evidence` text,
	`notes` text,
	`dueBy` timestamp,
	`resolvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `chargebacks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `client_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`payerEmail` varchar(320) NOT NULL,
	`payerName` varchar(255),
	`payerPhone` varchar(32),
	`latestSelfieUrl` text,
	`latestSignatureUrl` text,
	`latestIdDocumentUrl` text,
	`latestFaceMatchScore` decimal(5,2),
	`selfieVerified` boolean NOT NULL DEFAULT false,
	`totalTransactions` int NOT NULL DEFAULT 0,
	`totalAmountPaid` decimal(14,2) NOT NULL DEFAULT '0',
	`firstSeenAt` timestamp NOT NULL DEFAULT (now()),
	`lastSeenAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `client_records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contract_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`contractId` int NOT NULL,
	`documentType` enum('ine','domicilio','rfc','curp','pasaporte','otro') NOT NULL,
	`documentUrl` text NOT NULL,
	`fileName` varchar(255),
	`uploadedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `contract_documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contracts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`createdByUserId` int NOT NULL,
	`clientName` varchar(255) NOT NULL,
	`clientEmail` varchar(320) NOT NULL,
	`clientPhone` varchar(32),
	`clientRfc` varchar(20),
	`clientCurp` varchar(20),
	`clientAddress` text,
	`businessName` varchar(255),
	`clientIneNumber` varchar(50),
	`title` varchar(255),
	`commissionRate` decimal(5,2) NOT NULL DEFAULT '6.00',
	`contractDurationMonths` int NOT NULL DEFAULT 0,
	`includeExclusivityClause` boolean NOT NULL DEFAULT false,
	`customTerms` text,
	`status` varchar(32) NOT NULL DEFAULT 'draft',
	`signToken` varchar(128),
	`signTokenExpiresAt` timestamp,
	`signatureUrl` text,
	`signedAt` timestamp,
	`signedFromIp` varchar(64),
	`ineUrl` text,
	`passportUrl` text,
	`addressProofUrl` text,
	`rfcDocUrl` text,
	`curpDocUrl` text,
	`situacionFiscalUrl` text,
	`situacionFiscalKey` text,
	`razonSocial` varchar(255),
	`representanteLegal` varchar(255),
	`rfcEmpresa` varchar(20),
	`adminSignatureUrl` text,
	`adminSignedAt` timestamp,
	`adminSignedByName` varchar(255),
	`internalNotes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `contracts_id` PRIMARY KEY(`id`),
	CONSTRAINT `contracts_signToken_unique` UNIQUE(`signToken`)
);
--> statement-breakpoint
CREATE TABLE `course_modules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`courseId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`content` text,
	`externalUrl` text,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `course_modules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `course_progress` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`courseId` int NOT NULL,
	`moduleId` int,
	`status` varchar(32) NOT NULL DEFAULT 'in_progress',
	`completedAt` timestamp,
	`evidenceUrl` text,
	`evidenceKey` text,
	`evidenceName` varchar(255),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `course_progress_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `courses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int,
	`title` varchar(255) NOT NULL,
	`description` text,
	`category` varchar(64) NOT NULL DEFAULT 'other',
	`level` varchar(32) DEFAULT 'general',
	`externalUrl` text,
	`content` text,
	`coverImageUrl` text,
	`durationMinutes` int DEFAULT 0,
	`sortOrder` int DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `courses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `customers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(320) NOT NULL,
	`phone` varchar(32),
	`countryCode` varchar(8) NOT NULL DEFAULT '+52',
	`totalPaid` decimal(12,2) NOT NULL DEFAULT '0',
	`totalTransactions` int NOT NULL DEFAULT 0,
	`lastPaymentAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `customers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `deposits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`fee` decimal(12,2) NOT NULL DEFAULT '0',
	`net_amount` decimal(12,2) NOT NULL,
	`currency` varchar(8) NOT NULL DEFAULT 'MXN',
	`deposit_status` enum('pending','completed','failed','cancelled') NOT NULL DEFAULT 'pending',
	`tracking_number` varchar(64),
	`destination_clabe` varchar(18),
	`destination_bank` varchar(128),
	`beneficiary_name` varchar(255),
	`reference` varchar(128),
	`failure_reason` text,
	`estimated_date` bigint,
	`completed_at` bigint,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `deposits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `doctor_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`fullName` varchar(255),
	`specialty` varchar(255),
	`licenseNumber` varchar(100),
	`institution` varchar(255),
	`officePhone` varchar(32),
	`officeAddress` text,
	`membreteUrl` text,
	`membreteKey` text,
	`stampUrl` text,
	`stampKey` text,
	`savedSignatureUrl` text,
	`savedSignatureKey` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `doctor_profiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `employee_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employeeId` int NOT NULL,
	`ownerId` int NOT NULL,
	`type` varchar(64) NOT NULL,
	`name` varchar(255) NOT NULL,
	`fileUrl` text NOT NULL,
	`fileKey` varchar(512) NOT NULL,
	`mimeType` varchar(128),
	`fileSize` int,
	`uploadedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `employee_documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `employee_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`employeeNumber` varchar(32),
	`fullName` varchar(255) NOT NULL,
	`position` varchar(128),
	`department` varchar(128),
	`email` varchar(255),
	`phone` varchar(32),
	`curp` varchar(20),
	`rfc` varchar(15),
	`address` text,
	`birthDate` varchar(16),
	`startDate` timestamp,
	`status` varchar(32) NOT NULL DEFAULT 'active',
	`photoUrl` text,
	`photoKey` varchar(512),
	`notes` text,
	`dailyRate` decimal(10,2),
	`dailyHours` decimal(5,2) DEFAULT '8.00',
	`restDay` varchar(16) DEFAULT 'sunday',
	`overtimeEnabled` boolean DEFAULT false,
	`overtimeRate` decimal(10,2),
	`paymentCycle` varchar(16) DEFAULT 'biweekly',
	`bankName` varchar(128),
	`clabe` varchar(18),
	`bankAccountHolder` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `employee_records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `feedback_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`userEmail` varchar(255) NOT NULL,
	`userName` varchar(255),
	`type` varchar(30) NOT NULL DEFAULT 'suggestion',
	`subject` varchar(255) NOT NULL,
	`message` text NOT NULL,
	`rating` int,
	`status` varchar(20) NOT NULL DEFAULT 'new',
	`adminReply` text,
	`repliedAt` bigint,
	`createdAt` bigint NOT NULL,
	CONSTRAINT `feedback_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ghl_sync_queue` (
	`id` int AUTO_INCREMENT NOT NULL,
	`transactionId` int NOT NULL,
	`stripePaymentIntentId` varchar(128),
	`payerName` varchar(255),
	`payerEmail` varchar(320),
	`payerPhone` varchar(32),
	`amountMxn` decimal(12,2) NOT NULL,
	`currency` varchar(8) NOT NULL DEFAULT 'MXN',
	`paymentMethod` varchar(64),
	`cardBrand` varchar(32),
	`cardLast4` varchar(4),
	`paidAt` timestamp NOT NULL,
	`paidAfterExpiry` boolean NOT NULL DEFAULT false,
	`paymentLinkDescription` varchar(500),
	`vendorUserId` int,
	`status` enum('pending','processing','synced','failed','skipped') NOT NULL DEFAULT 'pending',
	`attempts` int NOT NULL DEFAULT 0,
	`lastError` text,
	`ghlContactId` varchar(128),
	`ghlNoteId` varchar(128),
	`ghlAction` enum('created','updated','skipped'),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`syncedAt` timestamp,
	`nextRetryAt` timestamp,
	CONSTRAINT `ghl_sync_queue_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_ghl_uniq_pi` UNIQUE(`stripePaymentIntentId`)
);
--> statement-breakpoint
CREATE TABLE `invoices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`transactionId` int,
	`folio` varchar(32) NOT NULL,
	`uuid` varchar(64),
	`emisorRfc` varchar(13) NOT NULL,
	`emisorNombre` varchar(255) NOT NULL,
	`receptorRfc` varchar(13) NOT NULL,
	`receptorNombre` varchar(255) NOT NULL,
	`receptorEmail` varchar(255),
	`conceptos` text NOT NULL,
	`subtotal` int NOT NULL,
	`iva` int NOT NULL,
	`total` int NOT NULL,
	`currency` varchar(8) NOT NULL DEFAULT 'MXN',
	`status` varchar(32) NOT NULL DEFAULT 'draft',
	`xmlUrl` text,
	`pdfUrl` text,
	`cancelledAt` timestamp,
	`issuedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `invoices_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ip_allowlist` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`apiKeyId` int,
	`ipCidr` varchar(50) NOT NULL,
	`label` varchar(100),
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ip_allowlist_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `login_attempts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ipAddress` varchar(64) NOT NULL,
	`email` varchar(320),
	`attemptCount` int NOT NULL DEFAULT 0,
	`blockedUntil` timestamp,
	`lastAttemptAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `login_attempts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `magazines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`subtitle` varchar(500),
	`edition` varchar(100),
	`coverImageUrl` text,
	`coverImageKey` text,
	`content` text,
	`aiPrompt` text,
	`isPublished` boolean NOT NULL DEFAULT false,
	`publishedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `magazines_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `medical_appointments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`patientId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`appointmentDate` timestamp NOT NULL,
	`durationMinutes` int NOT NULL DEFAULT 30,
	`status` varchar(32) NOT NULL DEFAULT 'scheduled',
	`notes` text,
	`reminderSent` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `medical_appointments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `medical_patients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`firstName` varchar(128) NOT NULL,
	`lastName` varchar(128) NOT NULL,
	`email` varchar(255),
	`phone` varchar(32),
	`birthDate` varchar(16),
	`gender` varchar(16),
	`address` text,
	`photoUrl` varchar(512),
	`bloodType` varchar(8),
	`allergies` text,
	`medicalNotes` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `medical_patients_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `medical_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`patientId` int NOT NULL,
	`appointmentId` int,
	`recordDate` timestamp NOT NULL DEFAULT (now()),
	`diagnosis` text,
	`treatment` text,
	`prescription` text,
	`clinicalNotes` text,
	`attachments` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `medical_records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `module_access` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`module` varchar(64) NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`grantedBy` int NOT NULL,
	`grantedAt` timestamp NOT NULL DEFAULT (now()),
	`revokedAt` timestamp,
	`notes` text,
	CONSTRAINT `module_access_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `module_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`module` varchar(64) NOT NULL,
	`businessType` varchar(255),
	`message` text,
	`status` varchar(32) NOT NULL DEFAULT 'pending',
	`reviewedBy` int,
	`reviewedAt` timestamp,
	`reviewNotes` text,
	`requestedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `module_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` varchar(64) NOT NULL,
	`title` varchar(255) NOT NULL,
	`message` text NOT NULL,
	`isRead` boolean NOT NULL DEFAULT false,
	`actionUrl` varchar(512),
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `onboarding_surveys` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`business_type` varchar(100) NOT NULL,
	`business_size` varchar(50) NOT NULL,
	`monthly_revenue_estimate` varchar(50) NOT NULL,
	`needs_card_payments` boolean DEFAULT true,
	`needs_international_cards` boolean DEFAULT false,
	`needs_recurring_billing` boolean DEFAULT false,
	`needs_invoicing` boolean DEFAULT false,
	`needs_multiple_bank_accounts` boolean DEFAULT false,
	`interested_modules` text,
	`current_payment_processor` varchar(100),
	`main_challenge` text,
	`recommended_plan` varchar(50),
	`recommended_commission` decimal(5,2),
	`plan_reasoning` text,
	`skipped` boolean NOT NULL DEFAULT false,
	`status` varchar(30) NOT NULL DEFAULT 'pending_review',
	`assistant_notes` text,
	`reviewed_by_assistant_at` bigint,
	`reviewed_by_admin_at` bigint,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `onboarding_surveys_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `otp_verifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`paymentLinkToken` varchar(64) NOT NULL,
	`email` varchar(320),
	`phone` varchar(32),
	`code` varchar(8) NOT NULL,
	`verified` boolean NOT NULL DEFAULT false,
	`attempts` int NOT NULL DEFAULT 0,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `otp_verifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payer_blacklist` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` enum('email','card_last4') NOT NULL,
	`value` varchar(320) NOT NULL,
	`reason` varchar(255),
	`chargebackId` int,
	`transactionId` int,
	`payerName` varchar(255),
	`chargebackAmount` int,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `payer_blacklist_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payment_consents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`payment_token` varchar(128) NOT NULL,
	`transaction_id` int,
	`payer_name` varchar(255) NOT NULL,
	`payer_email` varchar(255) NOT NULL,
	`payer_phone` varchar(50),
	`ip_address` varchar(64),
	`user_agent` varchar(512),
	`service_description` text,
	`amount_accepted` decimal(14,2) NOT NULL,
	`currency` varchar(10) NOT NULL DEFAULT 'MXN',
	`terms_snapshot` text,
	`consent_at` bigint NOT NULL,
	`created_at` bigint NOT NULL,
	CONSTRAINT `payment_consents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payment_links` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`token` varchar(64) NOT NULL,
	`clientName` varchar(255) NOT NULL,
	`clientEmail` varchar(320),
	`clientPhone` varchar(32),
	`amount` decimal(12,2) NOT NULL,
	`currency` varchar(8) NOT NULL DEFAULT 'MXN',
	`description` text NOT NULL,
	`status` enum('pending','paid','expired','cancelled') NOT NULL DEFAULT 'pending',
	`expiresAt` timestamp,
	`paidAt` timestamp,
	`usdExchangeRate` decimal(8,4) NOT NULL DEFAULT '0',
	`commissionRate` decimal(5,2) NOT NULL DEFAULT '0',
	`commissionAmount` decimal(12,2) NOT NULL DEFAULT '0',
	`requireOtp` boolean NOT NULL DEFAULT false,
	`requireSelfie` boolean NOT NULL DEFAULT false,
	`requireSignature` boolean NOT NULL DEFAULT false,
	`requireIdUpload` boolean NOT NULL DEFAULT false,
	`chargebackProtectionText` text,
	`msiOptions` text,
	`allowedPaymentMethods` text,
	`tipEnabled` boolean NOT NULL DEFAULT false,
	`tipSuggestions` text,
	`countryCode` varchar(2) DEFAULT 'MX',
	`archived` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `payment_links_id` PRIMARY KEY(`id`),
	CONSTRAINT `payment_links_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `pharmacy_customers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`phone` varchar(32),
	`email` varchar(320),
	`birthDate` varchar(20),
	`gender` varchar(20),
	`address` text,
	`allergies` text,
	`notes` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pharmacy_customers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pharmacy_prescriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`customerId` int NOT NULL,
	`doctorName` varchar(255),
	`prescriptionDate` varchar(20),
	`fileUrl` text,
	`fileKey` text,
	`fileName` varchar(255),
	`fileMimeType` varchar(100),
	`medications` text,
	`notes` text,
	`status` varchar(32) NOT NULL DEFAULT 'pending',
	`dispensedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pharmacy_prescriptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `platform_clients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`adminUserId` int NOT NULL,
	`userId` int,
	`name` varchar(255) NOT NULL,
	`email` varchar(320) NOT NULL,
	`businessName` varchar(255),
	`phone` varchar(32),
	`commissionRate` decimal(5,2),
	`status` enum('active','suspended','pending') NOT NULL DEFAULT 'pending',
	`tempPassword` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `platform_clients_id` PRIMARY KEY(`id`),
	CONSTRAINT `platform_clients_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `platform_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`key` varchar(128) NOT NULL,
	`value` text NOT NULL,
	`description` varchar(255),
	`updated_at` bigint NOT NULL,
	`updated_by` int,
	CONSTRAINT `platform_config_id` PRIMARY KEY(`id`),
	CONSTRAINT `platform_config_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
CREATE TABLE `prescriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`doctorId` int NOT NULL,
	`patientId` int,
	`patientName` varchar(255) NOT NULL,
	`patientAge` varchar(20),
	`patientGender` varchar(20),
	`prescriptionDate` timestamp NOT NULL DEFAULT (now()),
	`diagnosis` text,
	`medications` text NOT NULL,
	`instructions` text,
	`membreteUrl` text,
	`membreteKey` text,
	`signatureUrl` text,
	`signatureKey` text,
	`status` varchar(32) NOT NULL DEFAULT 'draft',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `prescriptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pricing_plans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`plan_key` varchar(50) NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` varchar(255),
	`total_rate` decimal(5,2) NOT NULL,
	`fixed_fee` decimal(8,2) NOT NULL DEFAULT '3.50',
	`min_volume` int NOT NULL DEFAULT 0,
	`max_volume` int NOT NULL DEFAULT 0,
	`color` varchar(30) NOT NULL DEFAULT 'cyan',
	`features` text NOT NULL DEFAULT ('[]'),
	`badge` varchar(50),
	`sort_order` int NOT NULL DEFAULT 0,
	`is_active` boolean NOT NULL DEFAULT true,
	`updated_at` bigint NOT NULL,
	`updated_by` int,
	CONSTRAINT `pricing_plans_id` PRIMARY KEY(`id`),
	CONSTRAINT `pricing_plans_plan_key_unique` UNIQUE(`plan_key`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`price` decimal(12,2) NOT NULL,
	`category` varchar(128),
	`imageUrl` text,
	`trackStock` boolean NOT NULL DEFAULT false,
	`stock` int NOT NULL DEFAULT 0,
	`lowStockAlert` int NOT NULL DEFAULT 5,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `products_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quote_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sender_id` int NOT NULL,
	`sender_name` varchar(255) NOT NULL DEFAULT '',
	`prospect_email` varchar(255) NOT NULL,
	`prospect_name` varchar(255) NOT NULL DEFAULT '',
	`monthly_volume` decimal(15,2) NOT NULL DEFAULT '0',
	`single_amount` decimal(15,2) NOT NULL DEFAULT '0',
	`kp_rate` decimal(5,2) NOT NULL DEFAULT '0',
	`mode` varchar(20) NOT NULL DEFAULT 'online',
	`net_amount` decimal(15,2) NOT NULL DEFAULT '0',
	`total_fee` decimal(15,2) NOT NULL DEFAULT '0',
	`effective_rate` decimal(5,2) NOT NULL DEFAULT '0',
	`registered` tinyint NOT NULL DEFAULT 0,
	`registered_at` bigint,
	`email_sent` tinyint NOT NULL DEFAULT 1,
	`created_at` bigint NOT NULL,
	CONSTRAINT `quote_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `registration_scores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int,
	`associate_client_id` int,
	`onboarding_survey_id` int,
	`applicant_email` varchar(255) NOT NULL,
	`applicant_name` varchar(255),
	`business_name` varchar(255),
	`ai_score` int NOT NULL DEFAULT 0,
	`decision` enum('auto_approved','manual_review','auto_rejected') NOT NULL DEFAULT 'manual_review',
	`score_factors` text,
	`risk_flags` text,
	`captcha_verified` boolean NOT NULL DEFAULT false,
	`captcha_token` varchar(500),
	`ip_address` varchar(45),
	`user_agent` text,
	`ai_reasoning` text,
	`reviewed_by` int,
	`reviewed_at` bigint,
	`reviewer_notes` text,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `registration_scores_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sales_agents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`createdByUserId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(320) NOT NULL,
	`phone` varchar(32),
	`commissionRate` decimal(5,2) NOT NULL DEFAULT '0.50',
	`bankName` varchar(128),
	`clabe` varchar(18),
	`bankAccountHolder` varchar(255),
	`paymentCycle` varchar(16) NOT NULL DEFAULT 'biweekly',
	`isActive` boolean NOT NULL DEFAULT true,
	`referralCode` varchar(32),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sales_agents_id` PRIMARY KEY(`id`),
	CONSTRAINT `sales_agents_email_unique` UNIQUE(`email`),
	CONSTRAINT `sales_agents_referralCode_unique` UNIQUE(`referralCode`)
);
--> statement-breakpoint
CREATE TABLE `security_alerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`type` enum('brute_force','sensitive_file_access','ip_blocked','invalid_api_key','webhook_attack','rate_limit_exceeded','ip_not_allowed','suspicious_request') NOT NULL,
	`severity` enum('low','medium','high','critical') NOT NULL DEFAULT 'medium',
	`ip` varchar(50),
	`resource` varchar(500),
	`message` text NOT NULL,
	`metadata` text,
	`isRead` boolean NOT NULL DEFAULT false,
	`notifiedOwner` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `security_alerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `security_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`config_key` varchar(100) NOT NULL,
	`config_value` varchar(500) NOT NULL,
	`description` varchar(300),
	`updated_at` bigint NOT NULL,
	`updated_by` int,
	CONSTRAINT `security_config_id` PRIMARY KEY(`id`),
	CONSTRAINT `security_config_config_key_unique` UNIQUE(`config_key`)
);
--> statement-breakpoint
CREATE TABLE `sheets_sync_queue` (
	`id` int AUTO_INCREMENT NOT NULL,
	`stripePaymentIntentId` varchar(128) NOT NULL,
	`eventType` enum('payment_succeeded','payment_failed','payment_processing') NOT NULL,
	`payerEmail` varchar(320),
	`payerName` varchar(255),
	`amountMxn` decimal(12,2),
	`currency` varchar(8) DEFAULT 'MXN',
	`paymentMethod` varchar(64),
	`paymentStatus` varchar(64),
	`paymentLinkToken` varchar(128),
	`errorMessage` text,
	`paidAfterExpiry` boolean NOT NULL DEFAULT false,
	`vendorUserId` int,
	`payloadJson` text,
	`status` enum('pending','synced','failed','skipped') NOT NULL DEFAULT 'pending',
	`retries` int NOT NULL DEFAULT 0,
	`lastError` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sheets_sync_queue_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`stripeProductId` varchar(128),
	`stripePriceId` varchar(128),
	`stripeSubscriptionId` varchar(128),
	`stripeCustomerId` varchar(128),
	`name` varchar(255) NOT NULL,
	`description` text,
	`amount` int NOT NULL,
	`currency` varchar(8) NOT NULL DEFAULT 'mxn',
	`interval` varchar(32) NOT NULL,
	`intervalCount` int NOT NULL DEFAULT 1,
	`customerEmail` varchar(255) NOT NULL,
	`customerName` varchar(255),
	`status` varchar(32) NOT NULL DEFAULT 'active',
	`currentPeriodStart` timestamp,
	`currentPeriodEnd` timestamp,
	`cancelAtPeriodEnd` boolean NOT NULL DEFAULT false,
	`sourcePlatform` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `subscriptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `suppliers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`company` varchar(255),
	`phone` varchar(32),
	`email` varchar(320),
	`category` varchar(64) NOT NULL DEFAULT 'other',
	`notes` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `suppliers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `support_tickets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`userEmail` varchar(255) NOT NULL,
	`userName` varchar(255),
	`category` varchar(50) NOT NULL DEFAULT 'technical',
	`subject` varchar(255) NOT NULL,
	`description` text NOT NULL,
	`status` varchar(20) NOT NULL DEFAULT 'open',
	`priority` varchar(20) NOT NULL DEFAULT 'medium',
	`resolution` text,
	`resolvedAt` bigint,
	`createdAt` bigint NOT NULL,
	`updatedAt` bigint NOT NULL,
	CONSTRAINT `support_tickets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`paymentLinkId` int NOT NULL,
	`userId` int NOT NULL,
	`stripePaymentIntentId` varchar(128),
	`stripeChargeId` varchar(128),
	`amount` decimal(12,2) NOT NULL,
	`currency` varchar(8) NOT NULL DEFAULT 'MXN',
	`commissionRate` decimal(5,2) NOT NULL DEFAULT '0',
	`commissionAmount` decimal(12,2) NOT NULL DEFAULT '0',
	`netAmount` decimal(12,2) NOT NULL,
	`status` enum('pending','processing','succeeded','failed','refunded') NOT NULL DEFAULT 'pending',
	`payerName` varchar(255),
	`payerEmail` varchar(320),
	`payerPhone` varchar(32),
	`cardLast4` varchar(4),
	`cardBrand` varchar(32),
	`otpVerified` boolean NOT NULL DEFAULT false,
	`selfieVerified` boolean NOT NULL DEFAULT false,
	`selfieUrl` text,
	`faceMatchScore` decimal(5,2),
	`signatureUrl` text,
	`idDocumentUrl` text,
	`ipAddress` varchar(64),
	`userAgent` text,
	`operationNumber` varchar(32),
	`errorMessage` text,
	`metadata` text,
	`msiMonths` int,
	`refundRequestedBy` int,
	`refundRequestedAt` timestamp,
	`refundRequestReason` varchar(64),
	`refundRequestStatus` enum('pending','approved','rejected'),
	`paidAfterExpiry` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `transactions_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_uniq_stripe_pi_id` UNIQUE(`stripePaymentIntentId`)
);
--> statement-breakpoint
CREATE TABLE `transfer_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`type` enum('sent','received') NOT NULL DEFAULT 'sent',
	`transfer_type` enum('spei','wire','zelle','crypto','other') NOT NULL DEFAULT 'spei',
	`amount` decimal(12,2) NOT NULL,
	`currency` varchar(8) NOT NULL DEFAULT 'MXN',
	`status` enum('pending','completed','failed','cancelled') NOT NULL DEFAULT 'pending',
	`tracking_number` varchar(128),
	`sender_name` varchar(255),
	`sender_bank` varchar(128),
	`sender_clabe` varchar(18),
	`recipient_name` varchar(255),
	`recipient_bank` varchar(128),
	`recipient_clabe` varchar(18),
	`recipient_account` varchar(64),
	`concept` varchar(255),
	`notes` text,
	`failure_reason` text,
	`completed_at` bigint,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `transfer_records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`fullName` varchar(255),
	`birthDate` varchar(16),
	`curp` varchar(18),
	`rfc` varchar(13),
	`phone` varchar(32),
	`businessName` varchar(255),
	`businessType` varchar(128),
	`avatarUrl` text,
	`razonSocial` varchar(255),
	`direccionFiscal` text,
	`codigoPostal` varchar(10),
	`ciudad` varchar(128),
	`estado` varchar(64),
	`sitioWeb` varchar(255),
	`clabe` varchar(18),
	`banco` varchar(128),
	`titularCuenta` varchar(255),
	`rfcTitular` varchar(13),
	`ineUrl` text,
	`domicilioUrl` text,
	`actaConstitutiva` text,
	`accountType` varchar(32) DEFAULT 'business',
	`permissions` text,
	`profileCompleted` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_profiles_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin','superadmin','assistant','associate') NOT NULL DEFAULT 'user',
	`staffRole` enum('asistente','operador') DEFAULT 'operador',
	`accountStatus` enum('pending','active','blocked') NOT NULL DEFAULT 'pending',
	`createdByUserId` int,
	`isActive` boolean NOT NULL DEFAULT true,
	`passwordHash` varchar(255),
	`passwordResetToken` varchar(128),
	`passwordResetExpires` timestamp,
	`emailVerified` boolean NOT NULL DEFAULT false,
	`emailVerifyToken` varchar(128),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	`onboardingCompleted` boolean NOT NULL DEFAULT false,
	`welcomeShown` boolean NOT NULL DEFAULT false,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
--> statement-breakpoint
CREATE TABLE `vendor_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`businessName` varchar(255),
	`businessEmail` varchar(320),
	`businessPhone` varchar(32),
	`logoUrl` text,
	`currency` varchar(8) NOT NULL DEFAULT 'MXN',
	`stripeConnectAccountId` varchar(128),
	`stripeConnectStatus` enum('not_started','pending','active','restricted','disabled') NOT NULL DEFAULT 'not_started',
	`stripeConnectChargesEnabled` boolean NOT NULL DEFAULT false,
	`stripeConnectPayoutsEnabled` boolean NOT NULL DEFAULT false,
	`stripeConnectDetailsSubmitted` boolean NOT NULL DEFAULT false,
	`stripeConnectOnboardedAt` timestamp,
	`stripeAccountId` varchar(128),
	`stripeOnboarded` enum('pending','complete','restricted') NOT NULL DEFAULT 'pending',
	`commissionRate` decimal(5,2) NOT NULL DEFAULT '3.50',
	`ivaRate` decimal(5,2) NOT NULL DEFAULT '16.00',
	`ivaEnabled` boolean NOT NULL DEFAULT true,
	`usdExchangeRate` decimal(8,4) NOT NULL DEFAULT '0',
	`otpEnabled` boolean NOT NULL DEFAULT false,
	`selfieEnabled` boolean NOT NULL DEFAULT false,
	`chargebackText` text,
	`businessCountry` varchar(4) NOT NULL DEFAULT 'MX',
	`businessSlug` varchar(64),
	`publicBio` text,
	`websiteUrl` varchar(512),
	`publicProfileEnabled` boolean NOT NULL DEFAULT false,
	`deletePin` varchar(4),
	`referred_by_associate_commission_id` int,
	`facturApiKey` varchar(512),
	`facturApiEnabled` boolean NOT NULL DEFAULT false,
	`facturApiOrganizationId` varchar(128),
	`facturApiRfc` varchar(13),
	`facturApiRazonSocial` varchar(255),
	`facturApiRegimenFiscal` varchar(8),
	`facturApiVerifiedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vendor_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `vendor_settings_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `webhook_delivery_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`webhookEndpointId` int NOT NULL,
	`event` varchar(64) NOT NULL,
	`payload` text NOT NULL,
	`statusCode` int,
	`responseBody` text,
	`success` boolean NOT NULL DEFAULT false,
	`attemptedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `webhook_delivery_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `webhook_endpoints` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`url` varchar(512) NOT NULL,
	`description` varchar(255),
	`events` text NOT NULL DEFAULT ('["payment.success","payment.failed"]'),
	`secret` varchar(64) NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`lastTriggeredAt` timestamp,
	`lastStatusCode` int,
	`failureCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `webhook_endpoints_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `webhook_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`stripeEventId` varchar(128) NOT NULL,
	`eventType` varchar(128) NOT NULL,
	`payload` text NOT NULL,
	`status` enum('pending','processing','processed','failed','duplicate') NOT NULL DEFAULT 'pending',
	`attempts` int NOT NULL DEFAULT 0,
	`lastError` text,
	`paymentLinkToken` varchar(128),
	`stripePaymentIntentId` varchar(128),
	`relatedUserId` int,
	`receivedAt` timestamp NOT NULL DEFAULT (now()),
	`processedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `webhook_events_id` PRIMARY KEY(`id`),
	CONSTRAINT `webhook_events_stripeEventId_unique` UNIQUE(`stripeEventId`)
);
--> statement-breakpoint
ALTER TABLE `api_checkout_sessions` ADD CONSTRAINT `api_checkout_sessions_apiKeyId_api_keys_id_fk` FOREIGN KEY (`apiKeyId`) REFERENCES `api_keys`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `api_checkout_sessions` ADD CONSTRAINT `api_checkout_sessions_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `api_checkout_sessions` ADD CONSTRAINT `api_checkout_sessions_transactionId_transactions_id_fk` FOREIGN KEY (`transactionId`) REFERENCES `transactions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `api_keys` ADD CONSTRAINT `api_keys_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `associate_commissions` ADD CONSTRAINT `associate_commissions_associateUserId_users_id_fk` FOREIGN KEY (`associateUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `associate_profiles` ADD CONSTRAINT `associate_profiles_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `attendance_records` ADD CONSTRAINT `attendance_records_employeeId_employee_records_id_fk` FOREIGN KEY (`employeeId`) REFERENCES `employee_records`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `attendance_records` ADD CONSTRAINT `attendance_records_ownerId_users_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bank_accounts` ADD CONSTRAINT `bank_accounts_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `chargebacks` ADD CONSTRAINT `chargebacks_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `chargebacks` ADD CONSTRAINT `chargebacks_transactionId_transactions_id_fk` FOREIGN KEY (`transactionId`) REFERENCES `transactions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `course_modules` ADD CONSTRAINT `course_modules_courseId_courses_id_fk` FOREIGN KEY (`courseId`) REFERENCES `courses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `course_progress` ADD CONSTRAINT `course_progress_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `course_progress` ADD CONSTRAINT `course_progress_courseId_courses_id_fk` FOREIGN KEY (`courseId`) REFERENCES `courses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `course_progress` ADD CONSTRAINT `course_progress_moduleId_course_modules_id_fk` FOREIGN KEY (`moduleId`) REFERENCES `course_modules`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `doctor_profiles` ADD CONSTRAINT `doctor_profiles_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `employee_documents` ADD CONSTRAINT `employee_documents_employeeId_employee_records_id_fk` FOREIGN KEY (`employeeId`) REFERENCES `employee_records`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `employee_documents` ADD CONSTRAINT `employee_documents_ownerId_users_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `employee_records` ADD CONSTRAINT `employee_records_ownerId_users_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_transactionId_transactions_id_fk` FOREIGN KEY (`transactionId`) REFERENCES `transactions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ip_allowlist` ADD CONSTRAINT `ip_allowlist_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ip_allowlist` ADD CONSTRAINT `ip_allowlist_apiKeyId_api_keys_id_fk` FOREIGN KEY (`apiKeyId`) REFERENCES `api_keys`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `magazines` ADD CONSTRAINT `magazines_ownerId_users_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `medical_appointments` ADD CONSTRAINT `medical_appointments_ownerId_users_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `medical_appointments` ADD CONSTRAINT `medical_appointments_patientId_medical_patients_id_fk` FOREIGN KEY (`patientId`) REFERENCES `medical_patients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `medical_patients` ADD CONSTRAINT `medical_patients_ownerId_users_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `medical_records` ADD CONSTRAINT `medical_records_ownerId_users_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `medical_records` ADD CONSTRAINT `medical_records_patientId_medical_patients_id_fk` FOREIGN KEY (`patientId`) REFERENCES `medical_patients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `medical_records` ADD CONSTRAINT `medical_records_appointmentId_medical_appointments_id_fk` FOREIGN KEY (`appointmentId`) REFERENCES `medical_appointments`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `module_access` ADD CONSTRAINT `module_access_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `module_access` ADD CONSTRAINT `module_access_grantedBy_users_id_fk` FOREIGN KEY (`grantedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `module_requests` ADD CONSTRAINT `module_requests_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `onboarding_surveys` ADD CONSTRAINT `onboarding_surveys_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payer_blacklist` ADD CONSTRAINT `payer_blacklist_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payer_blacklist` ADD CONSTRAINT `payer_blacklist_chargebackId_chargebacks_id_fk` FOREIGN KEY (`chargebackId`) REFERENCES `chargebacks`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payer_blacklist` ADD CONSTRAINT `payer_blacklist_transactionId_transactions_id_fk` FOREIGN KEY (`transactionId`) REFERENCES `transactions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pharmacy_customers` ADD CONSTRAINT `pharmacy_customers_ownerId_users_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pharmacy_prescriptions` ADD CONSTRAINT `pharmacy_prescriptions_ownerId_users_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pharmacy_prescriptions` ADD CONSTRAINT `pharmacy_prescriptions_customerId_pharmacy_customers_id_fk` FOREIGN KEY (`customerId`) REFERENCES `pharmacy_customers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `prescriptions` ADD CONSTRAINT `prescriptions_doctorId_users_id_fk` FOREIGN KEY (`doctorId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `security_alerts` ADD CONSTRAINT `security_alerts_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `subscriptions` ADD CONSTRAINT `subscriptions_ownerId_users_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `suppliers` ADD CONSTRAINT `suppliers_ownerId_users_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `webhook_delivery_logs` ADD CONSTRAINT `webhook_delivery_logs_webhookEndpointId_webhook_endpoints_id_fk` FOREIGN KEY (`webhookEndpointId`) REFERENCES `webhook_endpoints`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `webhook_endpoints` ADD CONSTRAINT `webhook_endpoints_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;