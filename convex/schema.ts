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
  })
    .index("by_user", ["userId"])
    .index("by_user_type", ["userId", "fileType"]),

  fishModels: defineTable({
    userId: v.string(),
    modelId: v.string(), // Fish Audio model ID
    fishModelId: v.string(), // Internal Fish model ID (_id from API response)
    title: v.string(),
    description: v.optional(v.string()),
    visibility: v.string(),
    trainMode: v.string(),
    state: v.string(), // "created", "training", "trained", "failed"
    audioFiles: v.array(v.id("_storage")), // Storage IDs of audio files used
    createdAt: v.number(),
  }).index("by_user", ["userId"]),
});
