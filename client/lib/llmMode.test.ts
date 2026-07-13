import { describe, expect, it } from "vitest";

import { describeLlmMode } from "@/lib/llmMode";

describe("describeLlmMode", () => {
  it("signale explicitement le mode simulation", () => {
    const result = describeLlmMode({
      provider: "mock_json",
      ready: true,
      message: "Mode simulation actif",
    });
    expect(result.mode).toBe("simulation");
    expect(result.title).toContain("simulation");
  });

  it("signale une IA connectée quand le provider est prêt", () => {
    const result = describeLlmMode({
      provider: "openai_compatible",
      ready: true,
      message: "LLM prêt",
      model: "llama3.2",
    });
    expect(result.mode).toBe("live");
    expect(result.detail).toContain("llama3.2");
  });

  it("signale l'indisponibilité quand le LLM n'est pas prêt", () => {
    const result = describeLlmMode({
      provider: "disabled",
      ready: false,
      message: "LLM désactivé",
    });
    expect(result.mode).toBe("unavailable");
    expect(result.title).toContain("non connectée");
  });
});
