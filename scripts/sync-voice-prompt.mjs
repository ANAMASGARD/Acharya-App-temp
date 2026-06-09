import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const sourcePath = path.join(root, "lib/prompts/voice-agent.ts");
const targets = [
  path.join(root, "services/voice-local/prompts/acharya-voice.txt"),
  path.join(root, "services/voice-livekit/prompts/acharya-voice.txt"),
];

const source = fs.readFileSync(sourcePath, "utf8");
const match = source.match(
  /export const VOICE_AGENT_SYSTEM_PROMPT = `([\s\S]*?)`;/,
);

if (!match) {
  console.error("Could not extract VOICE_AGENT_SYSTEM_PROMPT from source file.");
  process.exit(1);
}

const prompt = match[1].replace(/\$\{VOICE_AGENT_OPENING_LINE\}/g, () => {
  const openingMatch = source.match(
    /export const VOICE_AGENT_OPENING_LINE =\s*\n?\s*"([^"]+)";/,
  );
  return openingMatch?.[1] ?? "Namaste, this is Acharya AI.";
});

for (const targetPath of targets) {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, `${prompt.trim()}\n`, "utf8");
  console.log(`Wrote ${targetPath}`);
}
