export function buildClassNotesPrompt(
  transcript: string,
  subject: string,
  topic: string,
  classLevel: string,
): string {
  return `YOU ARE an expert educator who turns classroom teaching transcripts into clear, student-friendly study notes.

Context:
- Subject: ${subject || "Unknown"}
- Topic: ${topic || "Unknown"}
- Class/Grade: ${classLevel || "Unknown"}

TRANSCRIPT:
"""
${transcript}
"""

Write structured class notes that a student can use to revise what was taught in this session.

Requirements:
- Use the SAME language(s) as the transcript. If the teacher spoke in Hindi, write notes in Hindi. If mixed Hindi-English, mirror that naturally.
- Organize with clear headings and bullet points.
- Include: key definitions, main concepts, steps or processes explained, examples mentioned, and a short summary at the end.
- Write for students — explain concepts clearly. Do NOT critique the teacher or comment on teaching quality.
- If the transcript is too short to produce meaningful notes, say so honestly in one short paragraph.
- Return plain text only (no JSON, no markdown code fences).`;
}
