CREATE TABLE `game_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`gameId` varchar(36) NOT NULL,
	`userId` int NOT NULL,
	`channel` enum('public','mafia','ghost') NOT NULL DEFAULT 'public',
	`body` varchar(1000) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `game_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `game_players` (
	`id` int AUTO_INCREMENT NOT NULL,
	`gameId` varchar(36) NOT NULL,
	`userId` int NOT NULL,
	`role` varchar(24) NOT NULL,
	`alive` boolean NOT NULL DEFAULT true,
	`isAi` boolean NOT NULL DEFAULT false,
	`selfHeals` int NOT NULL DEFAULT 0,
	CONSTRAINT `game_players_id` PRIMARY KEY(`id`),
	CONSTRAINT `game_player_pair_uq` UNIQUE(`gameId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `game_votes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`gameId` varchar(36) NOT NULL,
	`voterId` int NOT NULL,
	`targetId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `game_votes_id` PRIMARY KEY(`id`),
	CONSTRAINT `game_vote_pair_uq` UNIQUE(`gameId`,`voterId`)
);
--> statement-breakpoint
CREATE TABLE `games` (
	`id` varchar(36) NOT NULL,
	`roomId` varchar(36) NOT NULL,
	`phase` enum('night','dawn','discussion','voting','results') NOT NULL DEFAULT 'night',
	`phaseEndsAt` timestamp,
	`state` json NOT NULL,
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`endedAt` timestamp,
	CONSTRAINT `games_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `join_attempts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`roomId` varchar(36) NOT NULL,
	`userId` int NOT NULL,
	`attempts` int NOT NULL DEFAULT 1,
	`status` enum('pending','accepted','rejected') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `join_attempts_id` PRIMARY KEY(`id`),
	CONSTRAINT `join_attempt_pair_uq` UNIQUE(`roomId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`username` varchar(24) NOT NULL,
	`avatarUrl` text,
	`statsVisible` enum('everyone','room','private') NOT NULL DEFAULT 'everyone',
	`historyVisible` enum('everyone','room','private') NOT NULL DEFAULT 'room',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `profiles_userId_unique` UNIQUE(`userId`),
	CONSTRAINT `profiles_username_unique` UNIQUE(`username`)
);
--> statement-breakpoint
CREATE TABLE `room_members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`roomId` varchar(36) NOT NULL,
	`userId` int NOT NULL,
	`state` enum('pending','accepted','rejected') NOT NULL DEFAULT 'accepted',
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `room_members_id` PRIMARY KEY(`id`),
	CONSTRAINT `room_member_pair_uq` UNIQUE(`roomId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `rooms` (
	`id` varchar(36) NOT NULL,
	`ownerId` int NOT NULL,
	`name` varchar(64) NOT NULL,
	`visibility` enum('public','private') NOT NULL,
	`status` enum('waiting','playing','finished') NOT NULL DEFAULT 'waiting',
	`mode` enum('simple','perfect') NOT NULL DEFAULT 'simple',
	`chatMode` enum('voice_text','text') NOT NULL DEFAULT 'text',
	`language` varchar(12) NOT NULL DEFAULT 'uz',
	`maxPlayers` int NOT NULL DEFAULT 15,
	`roleConfig` json NOT NULL,
	`inviteCode` varchar(48) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `rooms_id` PRIMARY KEY(`id`),
	CONSTRAINT `rooms_inviteCode_unique` UNIQUE(`inviteCode`)
);
--> statement-breakpoint
CREATE INDEX `game_messages_idx` ON `game_messages` (`gameId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `game_room_idx` ON `games` (`roomId`);--> statement-breakpoint
CREATE INDEX `rooms_visibility_status_idx` ON `rooms` (`visibility`,`status`);