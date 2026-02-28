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
ALTER TABLE `contracts` ADD `title` varchar(255);