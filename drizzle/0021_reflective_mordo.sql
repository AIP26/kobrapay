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
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `subscriptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `subscriptions` ADD CONSTRAINT `subscriptions_ownerId_users_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;