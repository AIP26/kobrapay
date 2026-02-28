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
ALTER TABLE `chargebacks` ADD CONSTRAINT `chargebacks_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `chargebacks` ADD CONSTRAINT `chargebacks_transactionId_transactions_id_fk` FOREIGN KEY (`transactionId`) REFERENCES `transactions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_transactionId_transactions_id_fk` FOREIGN KEY (`transactionId`) REFERENCES `transactions`(`id`) ON DELETE no action ON UPDATE no action;