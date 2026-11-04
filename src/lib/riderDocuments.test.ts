import { expect, it } from "vitest";
import { validateDocument } from "./riderDocuments";
it("accepts photos and PDFs but rejects executable files and oversized documents", () => {
  expect(() => validateDocument({ type: "application/pdf", size: 1024 })).not.toThrow();
  expect(() => validateDocument({ type: "image/jpeg", size: 1024 })).not.toThrow();
  expect(() => validateDocument({ type: "text/html", size: 1024 })).toThrow();
  expect(() => validateDocument({ type: "application/pdf", size: 10 * 1024 * 1024 + 1 })).toThrow();
});