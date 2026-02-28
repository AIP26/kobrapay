CREATE TABLE `agent_commissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agentId` int NOT NULL,
	`transactionId` int NOT NULL,
	`clientUserId` int NOT NULL,
	`transactionAmount` decimal(12,2) NOT NULL,
	`commissionRate` decimal(5,2) NOT NULL,
	`commissionAmount` decimal(12,2) NOT NULL,
	`status` varchar(32) NOT NULL DEFAULT 'pending',
	`paidAt` timestamp,
	`paymentReference` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `agent_commissions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `agent_referrals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agentId` int NOT NULL,
	`clientUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `agent_referrals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contracts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`createdByUserId` int NOT NULL,
	`clientName` varchar(255) NOT NULL,
	`clientEmail` varchar(320) NOT NULL,
	`clientPhone` varchar(32),
	`clientRfc` varchar(20),
	`clientCurp` varchar(20),
	`clientAddress` text,
	`businessName` varchar(255),
	`clientIneNumber` varchar(50),
	`commissionRate` decimal(5,2) NOT NULL DEFAULT '6.00',
	`contractDurationMonths` int NOT NULL DEFAULT 0,
	`includeExclusivityClause` boolean NOT NULL DEFAULT false,
	`customTerms` text,
	`status` varchar(32) NOT NULL DEFAULT 'draft',
	`signToken` varchar(128),
	`signTokenExpiresAt` timestamp,
	`signatureUrl` text,
	`signedAt` timestamp,
	`signedFromIp` varchar(64),
	`ineUrl` text,
	`passportUrl` text,
	`addressProofUrl` text,
	`rfcDocUrl` text,
	`curpDocUrl` text,
	`internalNotes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `contracts_id` PRIMARY KEY(`id`),
	CONSTRAINT `contracts_signToken_unique` UNIQUE(`signToken`)
);
--> statement-breakpoint
CREATE TABLE `sales_agents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`createdByUserId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(320) NOT NULL,
	`phone` varchar(32),
	`commissionRate` decimal(5,2) NOT NULL DEFAULT '0.50',
	`bankName` varchar(128),
	`clabe` varchar(18),
	`bankAccountHolder` varchar(255),
	`paymentCycle` varchar(16) NOT NULL DEFAULT 'biweekly',
	`isActive` boolean NOT NULL DEFAULT true,
	`referralCode` varchar(32),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sales_agents_id` PRIMARY KEY(`id`),
	CONSTRAINT `sales_agents_email_unique` UNIQUE(`email`),
	CONSTRAINT `sales_agents_referralCode_unique` UNIQUE(`referralCode`)
);
