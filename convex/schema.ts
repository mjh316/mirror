import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  userFiles: defineTable({
    userId: v.string(),
    fileName: v.string(),
    storageId: v.id("_storage"),
    uploadedAt: v.number(),
    questionId: v.optional(v.string()), // For tracking which question the file answers
    fileType: v.optional(v.string()), // "audio" or "transcription"
  }).index("by_user", ["userId"]).index("by_user_type", ["userId", "fileType"]),
});

