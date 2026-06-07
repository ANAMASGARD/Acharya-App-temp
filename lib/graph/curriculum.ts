import { runReadQuery } from "@/lib/neo4j";
import { serializeNeo4jValue } from "@/lib/neo4j-serialize";
import type {
  CurriculumBookSummary,
  CurriculumChapterSummary,
} from "@/types/question-paper";

type BookRow = Readonly<{
  book: Record<string, unknown>;
  chapterCount: number | { low: number; high: number };
}>;

type ChapterRow = Readonly<{
  chapter: Record<string, unknown>;
}>;

function toNumber(value: number | { low: number; high: number }): number {
  if (typeof value === "number") {
    return value;
  }

  return value.low;
}

export async function listCurriculumBooks(input: {
  classLevel: string;
  subject: string;
}): Promise<CurriculumBookSummary[]> {
  const rows = await runReadQuery<BookRow>(
    `
    MATCH (book:CurriculumBook)
    WHERE book.classLevel = $classLevel
      AND toLower(book.subject) = toLower($subject)
    OPTIONAL MATCH (ch:Chapter)-[:PART_OF]->(book)
    WITH book, count(ch) AS chapterCount
    RETURN book { .* } AS book, chapterCount
    ORDER BY book.title ASC
  `,
    {
      classLevel: input.classLevel,
      subject: input.subject,
    },
  );

  return rows.map((row) => {
    const book = serializeNeo4jValue(row.book) as Record<string, unknown>;

    return {
      bookId: String(book.bookId ?? ""),
      title: String(book.title ?? ""),
      classLevel: String(book.classLevel ?? input.classLevel),
      subject: String(book.subject ?? input.subject),
      chapterCount: toNumber(row.chapterCount),
      isPreloaded: Boolean(book.isPreloaded ?? false),
    };
  });
}

export async function getChaptersForBook(bookId: string): Promise<CurriculumChapterSummary[]> {
  const rows = await runReadQuery<ChapterRow>(
    `
    MATCH (ch:Chapter)-[:PART_OF]->(book:CurriculumBook { bookId: $bookId })
    RETURN ch { .* } AS chapter
    ORDER BY ch.index ASC, ch.title ASC
  `,
    { bookId },
  );

  return rows.map((row) => {
    const chapter = serializeNeo4jValue(row.chapter) as Record<string, unknown>;

    return {
      chapterId: String(chapter.chapterId ?? ""),
      title: String(chapter.title ?? chapter.chapterId ?? ""),
      index: typeof chapter.index === "number" ? chapter.index : 0,
    };
  });
}

export type CurriculumAvailabilitySlot = Readonly<{
  classLevel: string;
  subject: string;
}>;

/** Class + subject pairs that have at least one embedded book in Aura. */
export async function listCurriculumAvailability(): Promise<
  readonly CurriculumAvailabilitySlot[]
> {
  const rows = await runReadQuery<CurriculumAvailabilitySlot>(
    `
    MATCH (b:CurriculumBook)
    WHERE EXISTS {
      MATCH (c:Chunk)-[:IN_CHAPTER]->(:Chapter)-[:PART_OF]->(b)
    }
    RETURN DISTINCT b.classLevel AS classLevel, toLower(b.subject) AS subject
    ORDER BY classLevel, subject
  `,
    {},
  );

  return rows.map((row) => ({
    classLevel: String(row.classLevel),
    subject: String(row.subject),
  }));
}

export async function getBookTitles(bookIds: readonly string[]): Promise<string[]> {
  if (bookIds.length === 0) {
    return [];
  }

  const rows = await runReadQuery<BookRow>(
    `
    MATCH (book:CurriculumBook)
    WHERE book.bookId IN $bookIds
    RETURN book { .* } AS book, 0 AS chapterCount
    ORDER BY book.title ASC
  `,
    { bookIds: [...bookIds] },
  );

  return rows.map((row) => {
    const book = serializeNeo4jValue(row.book) as Record<string, unknown>;
    return String(book.title ?? book.bookId ?? "");
  });
}
