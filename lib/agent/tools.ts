import { buildTeacherContextSnapshot } from "@/lib/graph/chat";
import { recallMemories, formatMemoriesForPrompt } from "@/lib/graph/memory";
import { searchCurriculumForAgent } from "@/lib/rag/retrieve";
import { isWebSearchConfigured, readWebPage, webSearch } from "@/lib/agent/web-search";
import { tool, type ToolSet } from "ai";
import { z } from "zod";

/** Official Indian school-board / curriculum domains the agent should prefer. */
const OFFICIAL_DOMAINS = [
  "cbse.gov.in",
  "ncert.nic.in",
  "cisce.org",
  "education.gov.in",
];

function toErrorString(error: unknown): string {
  return error instanceof Error ? error.message : "Tool failed. Continue without it.";
}

/**
 * Build the per-request tool set for the chat agent. Tools close over the
 * authenticated teacher's clerkId. Each tool returns a plain string (never
 * throws) so a single tool failure degrades gracefully instead of aborting the
 * turn. Web search is only registered when a provider key is configured.
 */
export function buildAgentTools({ clerkId }: { clerkId: string }): ToolSet {
  const tools: ToolSet = {
    searchCurriculum: tool({
      description:
        "Search the NCERT curriculum (textbook content) for grounded facts. Use this before answering subject/topic questions. Pass the teacher's class and subject when known.",
      inputSchema: z.object({
        query: z.string().describe("What to look up in the curriculum"),
        classLevel: z
          .string()
          .optional()
          .describe("e.g. class-6, class-10 (omit if unknown)"),
        subject: z.string().optional().describe("e.g. science, english (omit if unknown)"),
      }),
      execute: async ({ query, classLevel, subject }) => {
        try {
          const matches = await searchCurriculumForAgent({
            query,
            classLevel,
            subject,
            limit: 6,
          });
          if (matches.length === 0) {
            return "No matching curriculum content found.";
          }
          return matches
            .map(
              (match, index) =>
                `[${index + 1}] ${match.bookTitle} · ${match.chapterTitle}\n${match.text.slice(0, 500)}`,
            )
            .join("\n\n");
        } catch (error) {
          return toErrorString(error);
        }
      },
    }),

    recallTeacherMemory: tool({
      description:
        "Recall durable facts you previously learned about this teacher (subjects, classes, struggles, goals, preferences).",
      inputSchema: z.object({
        query: z.string().describe("What you want to recall about the teacher"),
      }),
      execute: async ({ query }) => {
        try {
          const memories = await recallMemories(clerkId, query, 6);
          const block = formatMemoriesForPrompt(memories);
          return block || "No relevant memories about this teacher yet.";
        } catch (error) {
          return toErrorString(error);
        }
      },
    }),

    getTeacherHistory: tool({
      description:
        "Get a summary of this teacher's recent recorded classes (topic, class, subject, score) to personalize advice.",
      inputSchema: z.object({}),
      execute: async () => {
        try {
          const snapshot = await buildTeacherContextSnapshot(clerkId);
          return snapshot || "No recorded teaching sessions yet.";
        } catch (error) {
          return toErrorString(error);
        }
      },
    }),

    readWebPage: tool({
      description:
        "Open a specific URL (e.g. an official cbse.gov.in / ncert.nic.in page) and read its text to get exact, up-to-date details.",
      inputSchema: z.object({
        url: z.string().describe("Full https URL of the page to read"),
      }),
      execute: async ({ url }) => {
        try {
          const page = await readWebPage(url);
          return `Content of ${page.url}:\n${page.text}`;
        } catch (error) {
          return toErrorString(error);
        }
      },
    }),
  };

  if (isWebSearchConfigured()) {
    tools.webSearch = tool({
      description:
        "Search the live web for CURRENT or official information (latest CBSE/ICSE syllabus, exam dates, circulars, recent news). Use official=true to restrict to government/board sites. Always prefer official sources and cite them.",
      inputSchema: z.object({
        query: z.string().describe("The search query"),
        official: z
          .boolean()
          .optional()
          .describe("Restrict to official board/government domains"),
      }),
      execute: async ({ query, official }) => {
        try {
          const response = await webSearch(query, {
            maxResults: 5,
            includeDomains: official ? OFFICIAL_DOMAINS : undefined,
          });
          const lines = response.results.map(
            (result, index) =>
              `[${index + 1}] ${result.title}\n${result.url}\n${result.snippet}`,
          );
          const answer = response.answer ? `Answer: ${response.answer}\n\n` : "";
          return `${answer}${lines.join("\n\n") || "No results found."}`;
        } catch (error) {
          return toErrorString(error);
        }
      },
    });
  }

  return tools;
}
