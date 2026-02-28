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
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `attendance_records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `employee_records` ADD `employeeNumber` varchar(32);--> statement-breakpoint
ALTER TABLE `attendance_records` ADD CONSTRAINT `attendance_records_employeeId_employee_records_id_fk` FOREIGN KEY (`employeeId`) REFERENCES `employee_records`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `attendance_records` ADD CONSTRAINT `attendance_records_ownerId_users_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;