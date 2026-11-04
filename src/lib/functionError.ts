import { FunctionsHttpError } from "@supabase/supabase-js";

export async function getFunctionErrorMessage(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.clone().json();
      if (typeof body?.error === "string") return body.error;
    } catch {
      // Fall back to the SDK message if the response cannot be decoded.
    }
  }
  return error instanceof Error ? error.message : "Unable to create rider. Please try again.";
}