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
	`fullName` varchar(255) NOT NULL,
	`position` varchar(128),
	`department` varchar(128),
	`email` varchar(255),
	`phone` varchar(32),
	`curp` varchar(20),
	`rfc` varchar(15),
	`address` text,
	`startDate` timestamp,
	`status` varchar(32) NOT NULL DEFAULT 'active',
	`photoUrl` text,
	`photoKey` varchar(512),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `employee_records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `employee_documents` ADD CONSTRAINT `employee_documents_employeeId_employee_records_id_fk` FOREIGN KEY (`employeeId`) REFERENCES `employee_records`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `employee_documents` ADD CONSTRAINT `employee_documents_ownerId_users_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `employee_records` ADD CONSTRAINT `employee_records_ownerId_users_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;