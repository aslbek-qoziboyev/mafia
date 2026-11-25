import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, json, boolean, uniqueIndex, index } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const profiles = mysqlTable("profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  username: varchar("username", { length: 24 }).notNull().unique(),
  avatarUrl: text("avatarUrl"),
  statsVisible: mysqlEnum("statsVisible", ["everyone", "room", "private"]).default("everyone").notNull(),
  historyVisible: mysqlEnum("historyVisible", ["everyone", "room", "private"]).default("room").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const rooms = mysqlTable("rooms", {
  id: varchar("id", { length: 36 }).primaryKey(),
  ownerId: int("ownerId").notNull(),
  name: varchar("name", { length: 64 }).notNull(),
  visibility: mysqlEnum("visibility", ["public", "private"]).notNull(),
  status: mysqlEnum("status", ["waiting", "playing", "finished"]).default("waiting").notNull(),
  mode: mysqlEnum("mode", ["simple", "perfect"]).default("simple").notNull(),
  chatMode: mysqlEnum("chatMode", ["voice_text", "text"]).default("text").notNull(),
  language: varchar("language", { length: 12 }).default("uz").notNull(),
  maxPlayers: int("maxPlayers").default(15).notNull(),
  roleConfig: json("roleConfig").$type<Record<string, number>>().notNull(),
  inviteCode: varchar("inviteCode", { length: 48 }).notNull().unique(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("rooms_visibility_status_idx").on(table.visibility, table.status)]);

export const roomMembers = mysqlTable("room_members", {
  id: int("id").autoincrement().primaryKey(),
  roomId: varchar("roomId", { length: 36 }).notNull(),
  userId: int("userId").notNull(),
  state: mysqlEnum("state", ["pending", "accepted", "rejected"]).default("accepted").notNull(),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
}, table => [uniqueIndex("room_member_pair_uq").on(table.roomId, table.userId)]);

export const joinAttempts = mysqlTable("join_attempts", {
  id: int("id").autoincrement().primaryKey(),
  roomId: varchar("roomId", { length: 36 }).notNull(),
  userId: int("userId").notNull(),
  attempts: int("attempts").default(1).notNull(),
  status: mysqlEnum("status", ["pending", "accepted", "rejected"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [uniqueIndex("join_attempt_pair_uq").on(table.roomId, table.userId)]);

export const games = mysqlTable("games", {
  id: varchar("id", { length: 36 }).primaryKey(),
  roomId: varchar("roomId", { length: 36 }).notNull(),
  phase: mysqlEnum("phase", ["night", "dawn", "discussion", "voting", "results"]).default("night").notNull(),
  phaseEndsAt: timestamp("phaseEndsAt"),
  state: json("state").$type<Record<string, unknown>>().notNull(),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  endedAt: timestamp("endedAt"),
}, table => [index("game_room_idx").on(table.roomId)]);

export const gamePlayers = mysqlTable("game_players", {
  id: int("id").autoincrement().primaryKey(),
  gameId: varchar("gameId", { length: 36 }).notNull(),
  userId: int("userId").notNull(),
  role: varchar("role", { length: 24 }).notNull(),
  alive: boolean("alive").default(true).notNull(),
  isAi: boolean("isAi").default(false).notNull(),
  selfHeals: int("selfHeals").default(0).notNull(),
}, table => [uniqueIndex("game_player_pair_uq").on(table.gameId, table.userId)]);

export const gameMessages = mysqlTable("game_messages", {
  id: int("id").autoincrement().primaryKey(),
  gameId: varchar("gameId", { length: 36 }).notNull(),
  userId: int("userId").notNull(),
  channel: mysqlEnum("channel", ["public", "mafia", "ghost"]).default("public").notNull(),
  body: varchar("body", { length: 1000 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("game_messages_idx").on(table.gameId, table.createdAt)]);

export const gameVotes = mysqlTable("game_votes", {
  id: int("id").autoincrement().primaryKey(),
  gameId: varchar("gameId", { length: 36 }).notNull(),
  voterId: int("voterId").notNull(),
  targetId: int("targetId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [uniqueIndex("game_vote_pair_uq").on(table.gameId, table.voterId)]);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
