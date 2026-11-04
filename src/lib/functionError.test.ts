import { describe, expect, it } from "vitest";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { getFunctionErrorMessage } from "./functionError";

describe("rider creation error handling", () => {
  it("returns the actual weak-password rejection from a 400 response", async () => {
    const message = "Password is known to be weak and easy to guess, please choose a different one.";
    const response = new Response(JSON.stringify({ error: message }), { status: 400 });
    expect(await getFunctionErrorMessage(new FunctionsHttpError(response))).toBe(message);
    expect(response.bodyUsed).toBe(false);
  });

  it("falls back safely for an unreadable response", async () => {
    const error = new FunctionsHttpError(new Response("Not JSON", { status: 500 }));
    expect(await getFunctionErrorMessage(error)).toBe(error.message);
  });

  it("preserves network errors", async () => {
    expect(await getFunctionErrorMessage(new Error("Connection unavailable"))).toBe("Connection unavailable");
  });
});