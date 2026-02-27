ALTER TABLE `payment_links` ADD `requireSignature` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `payment_links` ADD `requireIdUpload` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `transactions` ADD `signatureUrl` text;--> statement-breakpoint
ALTER TABLE `transactions` ADD `idDocumentUrl` text;