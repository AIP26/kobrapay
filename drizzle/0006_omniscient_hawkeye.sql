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
