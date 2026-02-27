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
ALTER TABLE `payment_links` ADD `usdExchangeRate` decimal(8,4) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `payment_links` ADD `commissionRate` decimal(5,2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `payment_links` ADD `commissionAmount` decimal(12,2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `payment_links` ADD `requireOtp` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `payment_links` ADD `requireSelfie` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `payment_links` ADD `chargebackProtectionText` text;--> statement-breakpoint
ALTER TABLE `transactions` ADD `commissionRate` decimal(5,2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `transactions` ADD `commissionAmount` decimal(12,2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `transactions` ADD `netAmount` decimal(12,2) NOT NULL;--> statement-breakpoint
ALTER TABLE `transactions` ADD `otpVerified` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `transactions` ADD `selfieVerified` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `transactions` ADD `selfieUrl` text;--> statement-breakpoint
ALTER TABLE `transactions` ADD `faceMatchScore` decimal(5,2);--> statement-breakpoint
ALTER TABLE `transactions` ADD `ipAddress` varchar(64);--> statement-breakpoint
ALTER TABLE `transactions` ADD `userAgent` text;--> statement-breakpoint
ALTER TABLE `users` ADD `createdByUserId` int;--> statement-breakpoint
ALTER TABLE `users` ADD `isActive` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `vendor_settings` ADD `commissionRate` decimal(5,2) DEFAULT '7.00' NOT NULL;--> statement-breakpoint
ALTER TABLE `vendor_settings` ADD `usdExchangeRate` decimal(8,4) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `vendor_settings` ADD `otpEnabled` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `vendor_settings` ADD `selfieEnabled` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `vendor_settings` ADD `chargebackText` text;--> statement-breakpoint
ALTER TABLE `vendor_settings` ADD CONSTRAINT `vendor_settings_userId_unique` UNIQUE(`userId`);