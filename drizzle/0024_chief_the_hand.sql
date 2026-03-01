ALTER TABLE `attendance_records` ADD `absenceType` varchar(32);--> statement-breakpoint
ALTER TABLE `attendance_records` ADD `comment` text;--> statement-breakpoint
ALTER TABLE `attendance_records` ADD `editedByUserId` int;--> statement-breakpoint
ALTER TABLE `attendance_records` ADD `editedAt` timestamp;