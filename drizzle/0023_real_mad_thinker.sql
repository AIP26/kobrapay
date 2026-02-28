ALTER TABLE `employee_records` ADD `hourlyRate` decimal(10,2);--> statement-breakpoint
ALTER TABLE `employee_records` ADD `paymentCycle` varchar(16) DEFAULT 'biweekly';--> statement-breakpoint
ALTER TABLE `employee_records` ADD `bankName` varchar(128);--> statement-breakpoint
ALTER TABLE `employee_records` ADD `clabe` varchar(18);--> statement-breakpoint
ALTER TABLE `employee_records` ADD `bankAccountHolder` varchar(255);