CREATE TABLE `client_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`payerEmail` varchar(320) NOT NULL,
	`payerName` varchar(255),
	`payerPhone` varchar(32),
	`latestSelfieUrl` text,
	`latestSignatureUrl` text,
	`latestIdDocumentUrl` text,
	`latestFaceMatchScore` decimal(5,2),
	`selfieVerified` boolean NOT NULL DEFAULT false,
	`totalTransactions` int NOT NULL DEFAULT 0,
	`totalAmountPaid` decimal(14,2) NOT NULL DEFAULT '0',
	`firstSeenAt` timestamp NOT NULL DEFAULT (now()),
	`lastSeenAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `client_records_id` PRIMARY KEY(`id`)
);
