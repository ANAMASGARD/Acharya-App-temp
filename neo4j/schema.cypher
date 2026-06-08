// Acharya graph schema — run against Neo4j Aura (neo4j+s://)
// Apply once per environment: cypher-shell -a $NEO4J_URI -u $NEO4J_USERNAME -p $NEO4J_PASSWORD -f neo4j/schema.cypher
// Safe to re-run: all DDL uses IF NOT EXISTS

// --- Uniqueness constraints (required before MERGE ingestion) ---

CREATE CONSTRAINT teacher_clerk_id IF NOT EXISTS
FOR (t:Teacher) REQUIRE t.clerkId IS UNIQUE;

CREATE CONSTRAINT session_id IF NOT EXISTS
FOR (s:Session) REQUIRE s.sessionId IS UNIQUE;

CREATE CONSTRAINT transcript_id IF NOT EXISTS
FOR (t:Transcript) REQUIRE t.transcriptId IS UNIQUE;

CREATE CONSTRAINT report_id IF NOT EXISTS
FOR (r:Report) REQUIRE r.reportId IS UNIQUE;

CREATE CONSTRAINT class_notes_id IF NOT EXISTS
FOR (cn:ClassNotes) REQUIRE cn.notesId IS UNIQUE;

CREATE CONSTRAINT curriculum_book_id IF NOT EXISTS
FOR (b:CurriculumBook) REQUIRE b.bookId IS UNIQUE;

CREATE CONSTRAINT chapter_id IF NOT EXISTS
FOR (c:Chapter) REQUIRE c.chapterId IS UNIQUE;

CREATE CONSTRAINT chunk_id IF NOT EXISTS
FOR (c:Chunk) REQUIRE c.chunkId IS UNIQUE;

CREATE CONSTRAINT audio_chunk_id IF NOT EXISTS
FOR (ac:AudioChunk) REQUIRE ac.chunkId IS UNIQUE;

CREATE CONSTRAINT verification_report_id IF NOT EXISTS
FOR (v:VerificationReport) REQUIRE v.verificationId IS UNIQUE;

CREATE CONSTRAINT chat_conversation_id IF NOT EXISTS
FOR (c:ChatConversation) REQUIRE c.conversationId IS UNIQUE;

CREATE CONSTRAINT chat_message_id IF NOT EXISTS
FOR (m:ChatMessage) REQUIRE m.messageId IS UNIQUE;

CREATE CONSTRAINT community_post_id IF NOT EXISTS
FOR (p:CommunityPost) REQUIRE p.postId IS UNIQUE;

CREATE CONSTRAINT community_post_image_id IF NOT EXISTS
FOR (i:CommunityPostImage) REQUIRE i.imageId IS UNIQUE;

CREATE CONSTRAINT community_comment_id IF NOT EXISTS
FOR (c:CommunityComment) REQUIRE c.commentId IS UNIQUE;

CREATE CONSTRAINT community_group_id IF NOT EXISTS
FOR (g:CommunityGroup) REQUIRE g.groupId IS UNIQUE;

CREATE CONSTRAINT group_message_id IF NOT EXISTS
FOR (m:GroupMessage) REQUIRE m.messageId IS UNIQUE;

// --- Lookup indexes ---

CREATE INDEX session_recorded_at IF NOT EXISTS
FOR (s:Session) ON (s.recordedAt);

CREATE INDEX session_teacher_clerk IF NOT EXISTS
FOR (s:Session) ON (s.teacherClerkId);

CREATE INDEX chunk_source IF NOT EXISTS
FOR (c:Chunk) ON (c.source);

CREATE INDEX curriculum_book_class_subject IF NOT EXISTS
FOR (b:CurriculumBook) ON (b.classLevel, b.subject);

CREATE INDEX curriculum_book_preloaded IF NOT EXISTS
FOR (b:CurriculumBook) ON (b.isPreloaded);

CREATE INDEX verification_report_mode IF NOT EXISTS
FOR (v:VerificationReport) ON (v.mode);

CREATE INDEX chat_message_created IF NOT EXISTS
FOR (m:ChatMessage) ON (m.createdAt);

CREATE INDEX community_post_created IF NOT EXISTS
FOR (p:CommunityPost) ON (p.createdAt);

CREATE INDEX community_group_join_code IF NOT EXISTS
FOR (g:CommunityGroup) ON (g.joinCode);

CREATE INDEX group_message_created IF NOT EXISTS
FOR (m:GroupMessage) ON (m.createdAt);

// --- Vector index for RAG (adjust dimensions to match embedder) ---

CREATE VECTOR INDEX chunk_embedding IF NOT EXISTS
FOR (c:Chunk) ON (c.embedding)
OPTIONS {
  indexConfig: {
    `vector.dimensions`: 1536,
    `vector.similarity_function`: 'cosine'
  }
};
