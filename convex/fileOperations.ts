import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Generate an upload URL that the client can use to upload files
export const generateUploadUrl = mutation({
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

// Store file metadata after uploading
export const storeFileMetadata = mutation({
  args: {
    fileName: v.string(),
    userId: v.string(),
    storageId: v.id("_storage"),
    questionId: v.optional(v.string()),
    fileType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("userFiles", {
      userId: args.userId,
      fileName: args.fileName,
      storageId: args.storageId,
      uploadedAt: Date.now(),
      questionId: args.questionId,
      fileType: args.fileType,
    });
  },
});

// Get all files for a user
export const getFilesByUser = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("userFiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

// Get files for a user by type
export const getFilesByUserAndType = query({
  args: { userId: v.string(), fileType: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("userFiles")
      .withIndex("by_user_type", (q) => q.eq("userId", args.userId).eq("fileType", args.fileType))
      .collect();
  },
});

// Get a signed URL to download a file
export const getFileUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

