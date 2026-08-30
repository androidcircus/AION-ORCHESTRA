import { createInsertSchema } from "drizzle-zod";
import { boolean, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const songsTable = pgTable("songs", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  prompt: text("prompt").notNull(),
  lyrics: text("lyrics"),
  style: text("style").notNull(),
  tags: text("tags").array().notNull().default([]),
  duration: integer("duration").notNull(),
  bpm: integer("bpm").notNull(),
  musicalKey: text("musical_key").notNull(),
  status: text("status").notNull().default("completed"),
  progress: integer("progress").notNull().default(100),
  stage: text("stage").notNull().default("Ready to play"),
  model: text("model").notNull(),
  audioUrl: text("audio_url"),
  coverHue: integer("cover_hue").notNull().default(280),
  isFavorite: boolean("is_favorite").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSongSchema = createInsertSchema(songsTable).omit({
  createdAt: true,
});

export type InsertSong = z.infer<typeof insertSongSchema>;
export type Song = typeof songsTable.$inferSelect;