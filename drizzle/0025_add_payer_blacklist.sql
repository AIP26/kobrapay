CREATE TABLE `payer_blacklist` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int NOT NULL,
  `type` enum('email','card_last4') NOT NULL,
  `value` varchar(320) NOT NULL,
  `reason` varchar(255),
  `chargebackId` int,
  `transactionId` int,
  `payerName` varchar(255),
  `chargebackAmount` int,
  `isActive` boolean NOT NULL DEFAULT true,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `payer_blacklist_id` PRIMARY KEY(`id`)
);

ALTER TABLE `payer_blacklist` ADD CONSTRAINT `payer_blacklist_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;
ALTER TABLE `payer_blacklist` ADD CONSTRAINT `payer_blacklist_chargebackId_chargebacks_id_fk` FOREIGN KEY (`chargebackId`) REFERENCES `chargebacks`(`id`) ON DELETE no action ON UPDATE no action;
ALTER TABLE `payer_blacklist` ADD CONSTRAINT `payer_blacklist_transactionId_transactions_id_fk` FOREIGN KEY (`transactionId`) REFERENCES `transactions`(`id`) ON DELETE no action ON UPDATE no action;
