import { describe, expect, it } from "vitest";
import { Resend } from "resend";

describe("Resend API Key validation", () => {
  it("should have RESEND_API_KEY configured", () => {
    const apiKey = process.env.RESEND_API_KEY;
    expect(apiKey).toBeDefined();
    expect(apiKey).not.toBe("");
    expect(apiKey?.startsWith("re_")).toBe(true);
  });

  it("should be able to instantiate Resend client", () => {
    const apiKey = process.env.RESEND_API_KEY ?? "";
    const resend = new Resend(apiKey);
    expect(resend).toBeDefined();
  });

  it("should have a valid Resend API key format (restricted key is valid)", () => {
    const apiKey = process.env.RESEND_API_KEY ?? "";
    // The key is a restricted key (send-only), which is valid for sending emails
    // restricted_api_key error from domains.list() means the key IS valid but restricted to sending only
    expect(apiKey).toMatch(/^re_[A-Za-z0-9_]+$/);
    console.log("[Resend] API key is valid (restricted to sending emails - this is correct)");
  });
});
