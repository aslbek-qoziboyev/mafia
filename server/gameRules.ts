import { TRPCError } from "@trpc/server";
import { randomInt } from "node:crypto";

export const ROLE_KEYS = ["mafia", "don", "doctor", "commissioner", "civilian", "maniac", "jester", "lawyer", "bodyguard", "silencer", "witch"] as const;
export type RoleKey = typeof ROLE_KEYS[number];

export function buildRoleDeck(config: Record<string, number>, mode: "simple" | "perfect", playerCount: number, randomIndex: (maxExclusive: number) => number = randomInt): RoleKey[] {
  for (const [role, count] of Object.entries(config)) {
    if (!ROLE_KEYS.includes(role as RoleKey) || !Number.isInteger(count) || count < 0) throw new TRPCError({ code: "BAD_REQUEST", message: "Rol sozlamasi noto‘g‘ri." });
  }
  const selected = Object.entries(config).filter(([, count]) => count > 0);
  if (mode === "simple" && selected.some(([role]) => !["mafia", "doctor", "commissioner", "civilian"].includes(role))) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Oddiy rejimda faqat Mafia, Shifokor, Komissar va Fuqaro rollari ishlatiladi." });
  }
  if (mode === "perfect") {
    if ((config.civilian ?? 0) < 3) throw new TRPCError({ code: "BAD_REQUEST", message: "Mukammal rejimda fuqarolar kamida 3 ta bo‘lishi kerak." });
    if (selected.some(([role, count]) => role !== "civilian" && count < 1)) throw new TRPCError({ code: "BAD_REQUEST", message: "Tanlangan maxsus rollar kamida bittadan bo‘lishi kerak." });
    if (selected.length === 11 && playerCount < 13) throw new TRPCError({ code: "BAD_REQUEST", message: "Barcha 11 rol uchun kamida 13 o‘yinchi kerak." });
  }
  const deck: RoleKey[] = [];
  for (const [role, count] of selected) for (let i = 0; i < count; i++) deck.push(role as RoleKey);
  if (deck.length > playerCount) throw new TRPCError({ code: "BAD_REQUEST", message: "Rollar soni o‘yinchilar sonidan ko‘p." });
  while (deck.length < playerCount) deck.push("civilian");
  for (let i = deck.length - 1; i > 0; i--) {
    const j = randomIndex(i + 1);
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export function resolveVotes(votes: Array<{ targetId: number }>) {
  const totals = new Map<number, number>();
  for (const vote of votes) totals.set(vote.targetId, (totals.get(vote.targetId) ?? 0) + 1);
  const highest = Math.max(0, ...totals.values());
  const leaders = [...totals.entries()].filter(([, count]) => count === highest);
  return { highest, tied: highest > 0 && leaders.length > 1, eliminatedUserId: highest > 0 && leaders.length === 1 ? leaders[0][0] : null };
}
