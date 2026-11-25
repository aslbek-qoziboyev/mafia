import { describe, expect, it } from "vitest";
import { TRPCError } from "@trpc/server";
import { buildRoleDeck, resolveVotes } from "./gameRules";

describe("buildRoleDeck", () => {
  it("fills remaining Simple-mode seats with civilians", () => {
    const roles = buildRoleDeck({ mafia: 1, doctor: 1, commissioner: 1, civilian: 1 }, "simple", 5, () => 0);
    expect(roles).toHaveLength(5);
    expect(roles.filter(role => role === "civilian")).toHaveLength(2);
  });

  it("rejects roles unavailable in Simple mode", () => {
    expect(() => buildRoleDeck({ mafia: 1, maniac: 1 }, "simple", 4)).toThrow(TRPCError);
  });

  it("rejects unknown, negative, and fractional role counts", () => {
    const invalidConfigs: Record<string, number>[] = [{ unknown: 1 }, { mafia: -1 }, { mafia: 1.5 }];
    for (const config of invalidConfigs) {
      expect(() => buildRoleDeck(config, "simple", 4)).toThrow(TRPCError);
    }
  });

  it("requires at least three civilians and thirteen players when all roles are selected", () => {
    expect(() => buildRoleDeck({ mafia: 1, civilian: 2 }, "perfect", 4)).toThrow(TRPCError);
    const allRoles = { mafia: 1, don: 1, doctor: 1, commissioner: 1, civilian: 3, maniac: 1, jester: 1, lawyer: 1, bodyguard: 1, silencer: 1, witch: 1 };
    expect(() => buildRoleDeck(allRoles, "perfect", 12)).toThrow(TRPCError);
    expect(buildRoleDeck(allRoles, "perfect", 13)).toHaveLength(13);
  });

  it("rejects a configured role deck larger than the room", () => {
    expect(() => buildRoleDeck({ mafia: 2, civilian: 3 }, "simple", 4)).toThrow(TRPCError);
  });
});

describe("resolveVotes", () => {
  it("does not eliminate anyone when nobody voted", () => {
    expect(resolveVotes([])).toEqual({ highest: 0, tied: false, eliminatedUserId: null });
  });

  it("does not eliminate anyone on a tie for the highest vote count", () => {
    expect(resolveVotes([{ targetId: 1 }, { targetId: 1 }, { targetId: 2 }, { targetId: 2 }])).toEqual({ highest: 2, tied: true, eliminatedUserId: null });
  });

  it("eliminates only the unique highest-voted target", () => {
    expect(resolveVotes([{ targetId: 8 }, { targetId: 8 }, { targetId: 9 }])).toEqual({ highest: 2, tied: false, eliminatedUserId: 8 });
  });
});
