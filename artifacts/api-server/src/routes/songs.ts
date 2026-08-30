import { Router, type IRouter } from "express";
import { and, count, desc, eq } from "drizzle-orm";
import {
  GenerateSongBody,
  GenerateSongResponse,
  GetSongParams,
  GetSongResponse,
  GetWorkspaceSummaryResponse,
  ListSongsResponse,
  ToggleSongFavoriteParams,
  ToggleSongFavoriteResponse,
} from "@workspace/api-zod";
import { db, songsTable, type Song as DbSong } from "@workspace/db";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const seedSongs = [
  {
    id: "seed-neon-tide",
    title: "Neon Tide",
    prompt: "A late-night drive through a glowing city after the rain",
    lyrics: "Streetlights blur into the blue\nI hear the ocean in the avenue",
    style: "Cinematic synthwave",
    tags: ["synthwave", "night drive", "cinematic"],
    duration: 142,
    bpm: 112,
    musicalKey: "F# minor",
    status: "completed",
    progress: 100,
    stage: "Ready to play",
    model: "AION Demo Engine",
    audioUrl: "/api/audio/seed-neon-tide",
    coverHue: 278,
    isFavorite: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 38),
  },
  {
    id: "seed-signal-fire",
    title: "Signal Fire",
    prompt: "Warm indie folk with handclaps, worn guitars, and a hopeful chorus",
    lyrics: null,
    style: "Indie folk",
    tags: ["indie folk", "acoustic", "hopeful"],
    duration: 188,
    bpm: 96,
    musicalKey: "D major",
    status: "completed",
    progress: 100,
    stage: "Ready to play",
    model: "AION Demo Engine",
    audioUrl: "/api/audio/seed-signal-fire",
    coverHue: 32,
    isFavorite: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 95),
  },
];

async function ensureSeeded() {
  const [{ total }] = await db.select({ total: count() }).from(songsTable);
  if (Number(total) > 0) return;
  await db.insert(songsTable).values(seedSongs).onConflictDoNothing();
}

function toApiSong(song: DbSong) {
  return {
    ...song,
    lyrics: song.lyrics ?? null,
    audioUrl: song.audioUrl ?? null,
    createdAt: song.createdAt.toISOString(),
  };
}

function titleFromPrompt(prompt: string) {
  const cleaned = prompt
    .replace(/^(a|an|the)\s+/i, "")
    .split(/[.!?]/)[0]
    .trim();
  const words = cleaned.split(/\s+/).slice(0, 4);
  const title = words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
  return title || "Untitled Signal";
}

function hashString(value: string) {
  return [...value].reduce((hash, char) => ((hash << 5) - hash + char.charCodeAt(0)) | 0, 0);
}

function tagsFor(style: string, prompt: string) {
  const combined = `${style} ${prompt}`.toLowerCase();
  const candidates = [
    ["ambient", "ambient"],
    ["cinematic", "cinematic"],
    ["synth", "synthwave"],
    ["electronic", "electronic"],
    ["folk", "acoustic"],
    ["jazz", "jazz"],
    ["hip hop", "hip hop"],
    ["rap", "rap"],
    ["rock", "rock"],
    ["pop", "pop"],
    ["lo-fi", "lo-fi"],
    ["lofi", "lo-fi"],
  ];
  const tags = candidates
    .filter(([needle]) => combined.includes(needle))
    .map(([, tag]) => tag);
  return [...new Set([style.toLowerCase(), ...tags])].slice(0, 4);
}

function scheduleDemoGeneration(id: string) {
  const steps = [
    { delay: 850, progress: 28, stage: "Sketching motif" },
    { delay: 1650, progress: 61, stage: "Building arrangement" },
    { delay: 2600, progress: 100, stage: "Ready to play", status: "completed" },
  ];
  for (const step of steps) {
    setTimeout(async () => {
      try {
        await db
          .update(songsTable)
          .set({
            progress: step.progress,
            stage: step.stage,
            ...(step.status ? { status: step.status } : { status: "generating" }),
          })
          .where(eq(songsTable.id, id));
      } catch (error) {
        logger.error({ err: error, songId: id }, "Failed to update generation progress");
      }
    }, step.delay);
  }
}

router.get("/songs", async (req, res) => {
  try {
    await ensureSeeded();
    const songs = await db
      .select()
      .from(songsTable)
      .orderBy(desc(songsTable.createdAt));
    res.json(ListSongsResponse.parse(songs.map(toApiSong)));
  } catch (error) {
    req.log.error({ err: error }, "Failed to list songs");
    res.status(500).json({ error: "Unable to load songs" });
  }
});

router.post("/songs/generate", async (req, res) => {
  const parsed = GenerateSongBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Please provide a prompt, style, duration, energy, and model." });
    return;
  }

  const input = parsed.data;
  const id = `song-${Date.now()}-${Math.abs(hashString(input.prompt)).toString(36)}`;
  const hash = Math.abs(hashString(`${input.prompt}:${input.style}`));
  const song = {
    id,
    title: titleFromPrompt(input.prompt),
    prompt: input.prompt,
    lyrics: input.lyrics || null,
    style: input.style,
    tags: tagsFor(input.style, input.prompt),
    duration: input.duration,
    bpm: 78 + (hash % 68),
    musicalKey: ["C major", "D major", "E minor", "F# minor", "A minor"][hash % 5],
    status: "queued",
    progress: 8,
    stage: "Queued for AION",
    model: input.model,
    audioUrl: `/api/audio/${id}`,
    coverHue: 220 + (hash % 130),
    isFavorite: false,
  };

  try {
    await db.insert(songsTable).values(song);
    scheduleDemoGeneration(id);
    res.status(202).json(GenerateSongResponse.parse(toApiSong({ ...song, createdAt: new Date() })));
  } catch (error) {
    req.log.error({ err: error }, "Failed to start song generation");
    res.status(500).json({ error: "Unable to start generation" });
  }
});

router.get("/songs/:songId", async (req, res) => {
  const parsed = GetSongParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid song id" });
    return;
  }
  try {
    const [song] = await db
      .select()
      .from(songsTable)
      .where(eq(songsTable.id, parsed.data.songId))
      .limit(1);
    if (!song) {
      res.status(404).json({ error: "Song not found" });
      return;
    }
    res.json(GetSongResponse.parse(toApiSong(song)));
  } catch (error) {
    req.log.error({ err: error }, "Failed to load song");
    res.status(500).json({ error: "Unable to load song" });
  }
});

router.patch("/songs/:songId/favorite", async (req, res) => {
  const parsed = ToggleSongFavoriteParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid song id" });
    return;
  }
  try {
    const [current] = await db
      .select({ isFavorite: songsTable.isFavorite })
      .from(songsTable)
      .where(eq(songsTable.id, parsed.data.songId))
      .limit(1);
    if (!current) {
      res.status(404).json({ error: "Song not found" });
      return;
    }
    const [updated] = await db
      .update(songsTable)
      .set({ isFavorite: !current.isFavorite })
      .where(eq(songsTable.id, parsed.data.songId))
      .returning();
    res.json(ToggleSongFavoriteResponse.parse(toApiSong(updated)));
  } catch (error) {
    req.log.error({ err: error }, "Failed to toggle favorite");
    res.status(500).json({ error: "Unable to update favorite" });
  }
});

router.get("/workspace/summary", async (req, res) => {
  try {
    await ensureSeeded();
    const songs = await db.select().from(songsTable);
    const completed = songs.filter((song) => song.status === "completed");
    const latest = [...songs].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] ?? null;
    res.json(
      GetWorkspaceSummaryResponse.parse({
        totalSongs: songs.length,
        completedSongs: completed.length,
        minutesCreated: Math.round((completed.reduce((sum, song) => sum + song.duration, 0) / 60) * 10) / 10,
        favoriteCount: songs.filter((song) => song.isFavorite).length,
        activeGenerations: songs.filter((song) => song.status === "queued" || song.status === "generating").length,
        latestSong: latest ? toApiSong(latest) : null,
      }),
    );
  } catch (error) {
    req.log.error({ err: error }, "Failed to load workspace summary");
    res.status(500).json({ error: "Unable to load workspace summary" });
  }
});

router.get("/audio/:songId", async (req, res) => {
  try {
    const [song] = await db
      .select()
      .from(songsTable)
      .where(and(eq(songsTable.id, req.params.songId), eq(songsTable.status, "completed")))
      .limit(1);
    if (!song) {
      res.status(404).json({ error: "Audio is not ready yet" });
      return;
    }

    const sampleRate = 22050;
    const seconds = Math.min(Math.max(song.duration, 15), 45);
    const sampleCount = sampleRate * seconds;
    const dataSize = sampleCount * 2;
    const wav = Buffer.alloc(44 + dataSize);
    wav.write("RIFF", 0);
    wav.writeUInt32LE(36 + dataSize, 4);
    wav.write("WAVE", 8);
    wav.write("fmt ", 12);
    wav.writeUInt32LE(16, 16);
    wav.writeUInt16LE(1, 20);
    wav.writeUInt16LE(1, 22);
    wav.writeUInt32LE(sampleRate, 24);
    wav.writeUInt32LE(sampleRate * 2, 28);
    wav.writeUInt16LE(2, 32);
    wav.writeUInt16LE(16, 34);
    wav.write("data", 36);
    wav.writeUInt32LE(dataSize, 40);
    const seed = Math.abs(hashString(song.id));
    const root = 150 + (seed % 120);
    for (let index = 0; index < sampleCount; index += 1) {
      const time = index / sampleRate;
      const pulse = Math.sin(time * Math.PI * 2 * (song.bpm / 60)) > 0.4 ? 1 : 0.35;
      const melody = Math.sin(time * Math.PI * 2 * root) * 0.24;
      const harmony = Math.sin(time * Math.PI * 2 * (root * 1.5)) * 0.12;
      const bass = Math.sin(time * Math.PI * 2 * (root / 2)) * 0.16;
      const attack = Math.min(1, time * 12);
      const release = Math.min(1, (seconds - time) * 4);
      const sample = Math.max(-1, Math.min(1, (melody + harmony + bass) * pulse * attack * release));
      wav.writeInt16LE(Math.round(sample * 32767), 44 + index * 2);
    }
    res.set({
      "Content-Type": "audio/wav",
      "Content-Length": wav.length.toString(),
      "Cache-Control": "public, max-age=3600",
      "Accept-Ranges": "bytes",
    });
    res.send(wav);
  } catch (error) {
    req.log.error({ err: error }, "Failed to render audio");
    res.status(500).json({ error: "Unable to render audio" });
  }
});

export default router;