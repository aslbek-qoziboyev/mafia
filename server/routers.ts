import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { profiles, rooms, roomMembers, joinAttempts, games, gamePlayers, gameMessages, gameVotes } from "../drizzle/schema";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { randomUUID, randomBytes } from "node:crypto";
import { buildRoleDeck, resolveVotes, ROLE_KEYS } from "./gameRules";

const phases = ["night", "dawn", "discussion", "voting", "results"] as const;
const dbOrFail = async () => { const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Ma’lumotlar bazasi hozircha mavjud emas." }); return db; };

async function ensureProfile(user: { id: number; name: string | null }) {
  const db = await dbOrFail();
  const [found] = await db.select().from(profiles).where(eq(profiles.userId, user.id)).limit(1);
  if (found) return found;
  const base = (user.name || `player${user.id}`).toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 18) || `player${user.id}`;
  let username = base;
  const [taken] = await db.select({ id: profiles.id }).from(profiles).where(eq(profiles.username, username)).limit(1);
  if (taken) username = `${base.slice(0, 15)}${user.id}`;
  await db.insert(profiles).values({ userId: user.id, username });
  const [created] = await db.select().from(profiles).where(eq(profiles.userId, user.id)).limit(1);
  return created;
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  profile: router({
    me: protectedProcedure.query(async ({ ctx }) => {
      const profile = await ensureProfile(ctx.user);
      return { ...profile, displayName: ctx.user.name };
    }),
    update: protectedProcedure.input(z.object({ username: z.string().trim().min(3).max(24).regex(/^[\p{L}\p{N}_]+$/u), statsVisible: z.enum(["everyone", "room", "private"]), historyVisible: z.enum(["everyone", "room", "private"]), avatarUrl: z.string().max(65000).nullable().optional() })).mutation(async ({ ctx, input }) => {
      const db = await dbOrFail();
      await ensureProfile(ctx.user);
      try {
        await db.update(profiles).set(input).where(eq(profiles.userId, ctx.user.id));
      } catch { throw new TRPCError({ code: "CONFLICT", message: "Bu foydalanuvchi nomi band." }); }
      return { success: true };
    }),
  }),
  rooms: router({
    list: publicProcedure.query(async () => {
      const db = await dbOrFail();
      const all = await db.select().from(rooms).where(and(eq(rooms.visibility, "public"), inArray(rooms.status, ["waiting", "playing"]))).orderBy(desc(rooms.createdAt)).limit(30);
      const out = [];
      for (const room of all) {
        const members = await db.select({ id: roomMembers.id }).from(roomMembers).where(and(eq(roomMembers.roomId, room.id), eq(roomMembers.state, "accepted")));
        out.push({ id: room.id, name: room.name, visibility: room.visibility, status: room.status, mode: room.mode, chatMode: room.chatMode, playerCount: members.length, maxPlayers: room.maxPlayers, language: room.language });
      }
      return out;
    }),
    mine: protectedProcedure.query(async ({ ctx }) => {
      const db = await dbOrFail();
      const memberships = await db.select({ room: rooms, member: roomMembers }).from(roomMembers).innerJoin(rooms, eq(rooms.id, roomMembers.roomId)).where(eq(roomMembers.userId, ctx.user.id)).orderBy(desc(rooms.createdAt)).limit(30);
      const output = [];
      for (const item of memberships) {
        const pending = item.room.ownerId === ctx.user.id ? await db.select({ id: joinAttempts.id }).from(joinAttempts).where(and(eq(joinAttempts.roomId, item.room.id), eq(joinAttempts.status, "pending"))) : [];
        const members = await db.select({ id: roomMembers.id }).from(roomMembers).where(and(eq(roomMembers.roomId, item.room.id), eq(roomMembers.state, "accepted")));
        output.push({ id: item.room.id, name: item.room.name, status: item.room.status, visibility: item.room.visibility, mode: item.room.mode, chatMode: item.room.chatMode, playerCount: members.length, maxPlayers: item.room.maxPlayers, membership: item.member.state, inviteCode: item.room.ownerId === ctx.user.id ? item.room.inviteCode : null, pendingCount: pending.length, isOwner: item.room.ownerId === ctx.user.id });
      }
      return output;
    }),
    requests: protectedProcedure.input(z.object({ roomId: z.string() })).query(async ({ ctx, input }) => {
      const db = await dbOrFail();
      const [room] = await db.select().from(rooms).where(and(eq(rooms.id, input.roomId), eq(rooms.ownerId, ctx.user.id))).limit(1);
      if (!room) throw new TRPCError({ code: "FORBIDDEN" });
      return db.select({ userId: joinAttempts.userId, username: profiles.username, createdAt: joinAttempts.createdAt }).from(joinAttempts).leftJoin(profiles, eq(profiles.userId, joinAttempts.userId)).where(and(eq(joinAttempts.roomId, input.roomId), eq(joinAttempts.status, "pending"))).orderBy(asc(joinAttempts.createdAt));
    }),
    create: protectedProcedure.input(z.object({ name: z.string().trim().min(3).max(64), visibility: z.enum(["public", "private"]), mode: z.enum(["simple", "perfect"]), chatMode: z.enum(["voice_text", "text"]), maxPlayers: z.number().int().min(4).max(20), roleConfig: z.record(z.string(), z.number().int().min(0).max(20)) })).mutation(async ({ ctx, input }) => {
      const db = await dbOrFail();
      await ensureProfile(ctx.user);
      for (const [key, count] of Object.entries(input.roleConfig)) if (!ROLE_KEYS.includes(key as typeof ROLE_KEYS[number]) || !Number.isInteger(count) || count < 0) throw new TRPCError({ code: "BAD_REQUEST", message: "Rol sozlamasi noto‘g‘ri." });
      if (input.mode === "perfect" && (Object.entries(input.roleConfig).some(([key, count]) => key !== "civilian" && count > 0 && count < 1) || (input.roleConfig.civilian ?? 0) < 3)) throw new TRPCError({ code: "BAD_REQUEST", message: "Mukammal rejimda fuqarolar kamida 3 ta bo‘lishi kerak." });
      const id = randomUUID();
      const inviteCode = randomBytes(18).toString("base64url");
      await db.insert(rooms).values({ ...input, id, ownerId: ctx.user.id, inviteCode, language: "uz" });
      await db.insert(roomMembers).values({ roomId: id, userId: ctx.user.id, state: "accepted" });
      return { id, inviteCode };
    }),
    requestJoin: protectedProcedure.input(z.object({ roomId: z.string().optional(), inviteCode: z.string().optional() })).mutation(async ({ ctx, input }) => {
      const db = await dbOrFail();
      const [room] = await db.select().from(rooms).where(input.inviteCode ? eq(rooms.inviteCode, input.inviteCode) : eq(rooms.id, input.roomId || "")).limit(1);
      if (!room || (room.visibility === "private" && !input.inviteCode)) throw new TRPCError({ code: "NOT_FOUND", message: "Xona topilmadi yoki taklif havolasi yaroqsiz." });
      if (room.status !== "waiting") throw new TRPCError({ code: "BAD_REQUEST", message: "Bu xona yangi o‘yinchi qabul qilmaydi." });
      if (room.ownerId === ctx.user.id) return { status: "accepted" as const };
      const [member] = await db.select().from(roomMembers).where(and(eq(roomMembers.roomId, room.id), eq(roomMembers.userId, ctx.user.id))).limit(1);
      if (member?.state === "accepted") return { status: "accepted" as const };
      const [count] = await db.select({ count: sql<number>`count(*)` }).from(roomMembers).where(and(eq(roomMembers.roomId, room.id), eq(roomMembers.state, "accepted")));
      if (Number(count?.count ?? 0) >= room.maxPlayers) throw new TRPCError({ code: "BAD_REQUEST", message: "Xona to‘la." });
      await db.transaction(async tx => {
        const [attempt] = await tx.select().from(joinAttempts).where(and(eq(joinAttempts.roomId, room.id), eq(joinAttempts.userId, ctx.user.id))).for("update").limit(1);
        if (room.visibility === "private" && attempt && attempt.attempts >= 2) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Maxfiy xona uchun so‘rov limiti tugadi." });
        if (attempt) await tx.update(joinAttempts).set({ attempts: attempt.attempts + 1, status: "pending" }).where(eq(joinAttempts.id, attempt.id));
        else await tx.insert(joinAttempts).values({ roomId: room.id, userId: ctx.user.id, attempts: 1, status: "pending" });
        if (member) await tx.update(roomMembers).set({ state: "pending" }).where(eq(roomMembers.id, member.id));
        else await tx.insert(roomMembers).values({ roomId: room.id, userId: ctx.user.id, state: "pending" });
      });
      return { status: "pending" as const };
    }),
    decide: protectedProcedure.input(z.object({ roomId: z.string(), userId: z.number().int(), accept: z.boolean() })).mutation(async ({ ctx, input }) => {
      const db = await dbOrFail();
      const [room] = await db.select().from(rooms).where(and(eq(rooms.id, input.roomId), eq(rooms.ownerId, ctx.user.id))).limit(1);
      if (!room) throw new TRPCError({ code: "FORBIDDEN", message: "Faqat xona egasi so‘rovni boshqarishi mumkin." });
      const state = input.accept ? "accepted" : "rejected";
      await db.update(roomMembers).set({ state }).where(and(eq(roomMembers.roomId, room.id), eq(roomMembers.userId, input.userId), eq(roomMembers.state, "pending")));
      await db.update(joinAttempts).set({ status: state }).where(and(eq(joinAttempts.roomId, room.id), eq(joinAttempts.userId, input.userId)));
      return { success: true };
    }),
  }),
  game: router({
    start: protectedProcedure.input(z.object({ roomId: z.string() })).mutation(async ({ ctx, input }) => {
      const db = await dbOrFail();
      const [room] = await db.select().from(rooms).where(eq(rooms.id, input.roomId)).limit(1);
      if (!room || room.ownerId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "Faqat xona egasi o‘yinni boshlaydi." });
      const participants = await db.select().from(roomMembers).where(and(eq(roomMembers.roomId, room.id), eq(roomMembers.state, "accepted")));
      if (participants.length < 4) throw new TRPCError({ code: "BAD_REQUEST", message: "O‘yinda hali jamoa a’zolari yetarli emas. Kamida 4 ta a’zo bo‘lishi kerak." });
      const configured = (room.roleConfig || {}) as Record<string, number>;
      const roleList = buildRoleDeck(configured, room.mode, participants.length);
      const gameId = randomUUID();
      await db.transaction(async tx => {
        await tx.insert(games).values({ id: gameId, roomId: room.id, phase: "night", state: { day: 1, unresolvedRules: true } });
        await tx.insert(gamePlayers).values(participants.map((member, idx) => ({ gameId, userId: member.userId, role: roleList[idx] || "civilian" })));
        await tx.update(rooms).set({ status: "playing" }).where(eq(rooms.id, room.id));
      });
      return { gameId };
    }),
    current: protectedProcedure.input(z.object({ roomId: z.string() })).query(async ({ ctx, input }) => {
      const db = await dbOrFail();
      const [room] = await db.select().from(rooms).where(eq(rooms.id, input.roomId)).limit(1);
      if (!room) throw new TRPCError({ code: "NOT_FOUND" });
      const [member] = await db.select().from(roomMembers).where(and(eq(roomMembers.roomId, room.id), eq(roomMembers.userId, ctx.user.id), eq(roomMembers.state, "accepted"))).limit(1);
      if (!member) throw new TRPCError({ code: "FORBIDDEN" });
      const [game] = await db.select().from(games).where(eq(games.roomId, room.id)).orderBy(desc(games.startedAt)).limit(1);
      if (!game) return { room, game: null, players: [], messages: [], votes: [] };
      const players = await db.select({ id: gamePlayers.id, userId: gamePlayers.userId, role: gamePlayers.role, alive: gamePlayers.alive, username: profiles.username, avatarUrl: profiles.avatarUrl }).from(gamePlayers).leftJoin(profiles, eq(profiles.userId, gamePlayers.userId)).where(eq(gamePlayers.gameId, game.id));
      const [self] = players.filter(p => p.userId === ctx.user.id);
      const safePlayers = players.map(p => ({ ...p, role: p.userId === ctx.user.id || !p.alive || game.endedAt ? p.role : null }));
      const messages = await db.select({ id: gameMessages.id, userId: gameMessages.userId, body: gameMessages.body, channel: gameMessages.channel, createdAt: gameMessages.createdAt, username: profiles.username }).from(gameMessages).leftJoin(profiles, eq(profiles.userId, gameMessages.userId)).where(and(eq(gameMessages.gameId, game.id), eq(gameMessages.channel, "public"))).orderBy(asc(gameMessages.createdAt)).limit(100);
      const votes = await db.select({ voterId: gameVotes.voterId, targetId: gameVotes.targetId }).from(gameVotes).where(eq(gameVotes.gameId, game.id));
      return { room: { id: room.id, name: room.name, ownerId: room.ownerId, mode: room.mode, chatMode: room.chatMode }, game: { id: game.id, phase: game.phase, startedAt: game.startedAt, state: game.state }, self, players: safePlayers, messages, votes };
    }),
    sendMessage: protectedProcedure.input(z.object({ roomId: z.string(), body: z.string().trim().min(1).max(1000) })).mutation(async ({ ctx, input }) => {
      const db = await dbOrFail();
      const [game] = await db.select().from(games).where(eq(games.roomId, input.roomId)).orderBy(desc(games.startedAt)).limit(1);
      if (!game) throw new TRPCError({ code: "NOT_FOUND" });
      const [player] = await db.select().from(gamePlayers).where(and(eq(gamePlayers.gameId, game.id), eq(gamePlayers.userId, ctx.user.id), eq(gamePlayers.alive, true))).limit(1);
      if (!player) throw new TRPCError({ code: "FORBIDDEN", message: "Faqat tirik o‘yinchilar yozishi mumkin." });
      await db.insert(gameMessages).values({ gameId: game.id, userId: ctx.user.id, body: input.body, channel: "public" });
      return { success: true };
    }),
    vote: protectedProcedure.input(z.object({ roomId: z.string(), targetId: z.number().int().nullable() })).mutation(async ({ ctx, input }) => {
      const db = await dbOrFail();
      const [game] = await db.select().from(games).where(eq(games.roomId, input.roomId)).orderBy(desc(games.startedAt)).limit(1);
      if (!game || game.phase !== "voting") throw new TRPCError({ code: "BAD_REQUEST", message: "Hozir ovoz berish bosqichi emas." });
      const [player] = await db.select().from(gamePlayers).where(and(eq(gamePlayers.gameId, game.id), eq(gamePlayers.userId, ctx.user.id), eq(gamePlayers.alive, true))).limit(1);
      if (!player) throw new TRPCError({ code: "FORBIDDEN" });
      if (input.targetId === null) await db.delete(gameVotes).where(and(eq(gameVotes.gameId, game.id), eq(gameVotes.voterId, ctx.user.id)));
      else {
        const [target] = await db.select().from(gamePlayers).where(and(eq(gamePlayers.gameId, game.id), eq(gamePlayers.userId, input.targetId), eq(gamePlayers.alive, true))).limit(1);
        if (!target) throw new TRPCError({ code: "BAD_REQUEST", message: "Ovoz maqsadi topilmadi." });
        await db.insert(gameVotes).values({ gameId: game.id, voterId: ctx.user.id, targetId: input.targetId }).onDuplicateKeyUpdate({ set: { targetId: input.targetId } });
      }
      return { success: true };
    }),
    nextPhase: protectedProcedure.input(z.object({ roomId: z.string() })).mutation(async ({ ctx, input }) => {
      const db = await dbOrFail();
      const [room] = await db.select().from(rooms).where(and(eq(rooms.id, input.roomId), eq(rooms.ownerId, ctx.user.id))).limit(1);
      if (!room) throw new TRPCError({ code: "FORBIDDEN" });
      const [game] = await db.select().from(games).where(eq(games.roomId, input.roomId)).orderBy(desc(games.startedAt)).limit(1);
      if (!game) throw new TRPCError({ code: "NOT_FOUND" });
      const next = phases[(phases.indexOf(game.phase) + 1) % phases.length];
      if (game.phase === "voting") {
        const allVotes = await db.select().from(gameVotes).where(eq(gameVotes.gameId, game.id));
        const outcome = resolveVotes(allVotes);
        if (outcome.eliminatedUserId !== null) await db.update(gamePlayers).set({ alive: false }).where(and(eq(gamePlayers.gameId, game.id), eq(gamePlayers.userId, outcome.eliminatedUserId)));
        await db.update(games).set({ state: { ...(game.state as Record<string, unknown>), lastResult: outcome.highest === 0 ? "no_votes" : outcome.tied ? "tie" : "eliminated", eliminatedUserId: outcome.eliminatedUserId } }).where(eq(games.id, game.id));
      }
      await db.update(games).set({ phase: next }).where(eq(games.id, game.id));
      return { phase: next };
    }),
  }),
});

export type AppRouter = typeof appRouter;
