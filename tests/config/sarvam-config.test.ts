import { afterEach, describe, expect, it } from "vitest";
import { getSarvamConfig } from "@/lib/ai-config";

const original = { ...process.env };

afterEach(() => {
  process.env = { ...original };
});

describe("getSarvamConfig", () => {
  it("uses current Sarvam production model defaults", () => {
    process.env.SARVAM_API_KEY = "test-key";
    delete process.env.SARVAM_STT_MODEL;
    delete process.env.SARVAM_TTS_MODEL;

    expect(getSarvamConfig()).toMatchObject({
      sttModel: "saaras:v3",
      ttsModel: "bulbul:v3",
    });
  });
});
