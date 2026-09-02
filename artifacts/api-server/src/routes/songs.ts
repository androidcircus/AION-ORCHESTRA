import { Router, type IRouter } from "express";
import { and, count, desc, eq } from "drizzle-orm";
import {
  GenerateSongBody,
  GenerateSongResponse,
  GetSongParams,
  GetSongResponse,
  GetWorkspaceSummaryResponse,
  ListSongsResponse,
  RefineSongInput,
  RefineSongParams,
  ToggleSongFavoriteParams,
  ToggleSongFavoriteResponse,
  ListProjectsResponse,
  ProjectInput,
  Project,
  GetProjectParams,
  UpdateProjectParams,
  RemixSongParams,
  GetAudioParams,
  GetMidiParams,
} from "@workspace/api-zod";
import { db, songsTable, type Song as DbSong } from "@workspace/db";
import { logger } from "../lib/logger";
import { applySaturation, LowPassFilter, Chorus, getTapeHiss, Widener, GranularTexture, Reverb, SidechainDucker, TiltEQ, AionLimiter, VinylCrackle, Aion808, AionEPiano, NebulaPad, PulseLead, applyMasterTone, CyberKick, NeonSnare, GlitchHats, AionVox, generateMidiData, AionStrings, AionBrass, AionFlute, AionGuitar, StradivariusNode, CrystalFluteNode, BuchlaNode, HarpsichordNode, KhluiNode, WorldPerc } from "../lib/dsp";

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
    model: "AION Core (Ideation)",
    warmthPreset: "Custom",
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
    model: "AION Core (Ideation)",
    warmthPreset: "Custom",
    audioUrl: "/api/audio/seed-signal-fire",
    coverHue: 32,
    isFavorite: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 95),
  },
  {
    id: "seed-lofi-nebula",
    title: "Midnight Nebula",
    prompt: "Dusty lo-fi hip hop with a deep royal blue sub bass and ethereal purple pads",
    lyrics: "Floating through the violet haze\nLost inside the digital maze",
    style: "Lo-Fi Hip Hop",
    tags: ["lo-fi", "chill", "cyberpunk", "nebula"],
    duration: 120,
    bpm: 84,
    musicalKey: "C minor",
    status: "completed",
    progress: 100,
    stage: "Ready to play",
    model: "AION Core (Ideation)",
    warmthPreset: "Lo-Fi Hip Hop",
    audioUrl: "/api/audio/seed-lofi-nebula",
    coverHue: 260,
    isFavorite: true,
    createdAt: new Date(),
  },
  {
    id: "seed-techno-pulse",
    title: "Orbital Relay",
    prompt: "Aggressive pulse-lead techno with high-impact cyber-kick and 100% sidechain pumping",
    lyrics: "Circuit breaker / High speed relay / Pulse of the machine",
    style: "Techno Pulse",
    tags: ["techno", "aggressive", "cyberpunk", "nebula"],
    duration: 160,
    bpm: 128,
    musicalKey: "F minor",
    status: "completed",
    progress: 100,
    stage: "Ready to play",
    model: "AION Core (Ideation)",
    warmthPreset: "Techno Pulse",
    audioUrl: "/api/audio/seed-techno-pulse",
    coverHue: 200,
    isFavorite: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 5),
  },
  {
    id: "seed-vintage-soul",
    title: "Electric Memories",
    prompt: "Warm vintage soul with crystalline bell piano, thick sub bass, and a classic mid-saturated tone",
    lyrics: "Neon reflections in a velvet night / Echoes of a soul in flight",
    style: "Vintage Soul",
    tags: ["soul", "vintage", "epiano", "warm"],
    duration: 155,
    bpm: 72,
    musicalKey: "A major",
    status: "completed",
    progress: 100,
    stage: "Ready to play",
    model: "AION Core (Ideation)",
    warmthPreset: "Vintage Soul",
    audioUrl: "/api/audio/seed-vintage-soul",
    coverHue: 45,
    isFavorite: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 12),
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
    ["dnb", "drum and bass"],
    ["dubstep", "dubstep"],
    ["house", "house"],
    ["dance", "dance"],
    ["country", "country"],
    ["bluegrass", "bluegrass"],
    ["trap", "trap"],
    ["metal", "heavy metal"],
    ["bardcore", "bardcore"],
    ["r&b", "r&b"],
    ["trap", "trap"],
    ["dnb", "drum and bass"],
    ["dubstep", "dubstep"],
    ["house", "house"],
    ["dance", "dance"],
    ["bluegrass", "bluegrass"],
    ["country", "country"],
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
    lyrics: input.instrumental ? null : (input.lyrics || null),
    style: input.style,
    tags: tagsFor(input.style, input.prompt),
    duration: input.duration,
    bpm: 78 + (hash % 68),
    musicalKey: ["C major", "D major", "E minor", "F# minor", "A minor"][hash % 5],
    status: "queued",
    progress: 8,
    stage: "Queued for AION",
    model: input.model,
    energy: input.energy,
    warmthPreset: input.warmthPreset || "Custom",
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

    if (!updated) {
      res.status(500).json({ error: "Failed to update favorite" });
      return;
    }
    res.json(ToggleSongFavoriteResponse.parse(toApiSong(updated)));
  } catch (error) {
    req.log.error({ err: error }, "Failed to toggle favorite");
    res.status(500).json({ error: "Unable to update favorite" });
  }
});

router.patch("/songs/:songId/refine", async (req, res) => {
  const params = RefineSongParams.safeParse(req.params);
  const body = RefineSongInput.safeParse(req.body);

  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid refine request" });
    return;
  }

  try {
    const [song] = await db
      .select()
      .from(songsTable)
      .where(eq(songsTable.id, params.data.songId))
      .limit(1);

    if (!song) {
      res.status(404).json({ error: "Song not found" });
      return;
    }

    const updates = {
      ...body.data,
      status: "generating",
      progress: 50,
      stage: "Refining Soundraw stems",
    };

    const [updated] = await db
      .update(songsTable)
      .set(updates)
      .where(eq(songsTable.id, params.data.songId))
      .returning();

    if (!updated) {
      res.status(500).json({ error: "Failed to refine song" });
      return;
    }

    scheduleDemoGeneration(song.id);

    res.json(GetSongResponse.parse(toApiSong(updated)));
  } catch (error) {
    req.log.error({ err: error }, "Failed to refine song");
    res.status(500).json({ error: "Unable to refine song" });
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

router.get("/feed", async (req, res) => {
  try {
    const feed = await db
      .select()
      .from(songsTable)
      .where(eq(songsTable.status, "completed"))
      .orderBy(desc(songsTable.createdAt))
      .limit(50);
    res.json(ListSongsResponse.parse(feed.map(toApiSong)));
  } catch (error) {
    req.log.error({ err: error }, "Failed to load public feed");
    res.status(500).json({ error: "Unable to load feed" });
  }
});

router.post("/songs/:songId/remix", async (req, res) => {
  const params = RemixSongParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid song id" });
    return;
  }
  try {
    const [original] = await db
      .select()
      .from(songsTable)
      .where(eq(songsTable.id, params.data.songId))
      .limit(1);

    if (!original) return res.status(404).json({ error: "Original song not found" });

    const id = `remix-${Date.now()}-${Math.abs(hashString(original.prompt)).toString(36)}`;
    const remix = {
      ...original,
      id,
      title: `Remix: ${original.title}`,
      status: "queued" as const,
      progress: 15,
      stage: "Neural Link Established",
      isFavorite: false,
      createdAt: new Date(),
    };

    await db.insert(songsTable).values(remix);
    scheduleDemoGeneration(id);
    res.status(201).json(GenerateSongResponse.parse(toApiSong(remix)));
  } catch (error) {
    req.log.error({ err: error }, "Failed to initialize remix");
    res.status(500).json({ error: "Remix synthesis failed" });
  }
});

router.get("/audio/:songId", async (req, res) => {
  const params = GetAudioParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid song id" });
    return;
  }
  try {
    const [song] = await db
      .select()
      .from(songsTable)
      .where(and(eq(songsTable.id, params.data.songId), eq(songsTable.status, "completed")))
      .limit(1);
    if (!song) {
      res.status(404).json({ error: "Audio is not ready yet" });
      return;
    }

    const sampleRate = 22050;
    const seconds = Math.min(Math.max(song.duration, 15), 45);
    const sampleCount = sampleRate * seconds;
    const dataSize = sampleCount * 4; // Stereo: 2 channels * 2 bytes
    const wav = Buffer.alloc(44 + dataSize);
    wav.write("RIFF", 0);
    wav.writeUInt32LE(36 + dataSize, 4);
    wav.write("WAVE", 8);
    wav.write("fmt ", 12);
    wav.writeUInt32LE(16, 16);
    wav.writeUInt16LE(1, 20);
    wav.writeUInt16LE(2, 22); // Channels: 2
    wav.writeUInt32LE(sampleRate, 24);
    wav.writeUInt32LE(sampleRate * 4, 28); // Byte rate
    wav.writeUInt16LE(4, 32); // Block align
    wav.writeUInt16LE(16, 34);
    wav.write("data", 36);
    wav.writeUInt32LE(dataSize, 40);
    const seed = Math.abs(hashString(song.id));
    const root = 150 + (seed % 120);

    // Setup DSP chain
    const lpfL = new LowPassFilter(0.4 + (song.bpm / 400));
    const lpfR = new LowPassFilter(0.4 + (song.bpm / 400));
    const chorusL = new Chorus();
    const chorusR = new Chorus();
    const texture = new GranularTexture();
    const reverbL = new Reverb();
    const reverbR = new Reverb();
    const duckerL = new SidechainDucker();
    const duckerR = new SidechainDucker();
    const tiltL = new TiltEQ();
    const tiltR = new TiltEQ();
    const vinyl = new VinylCrackle();
    const widener = new Widener();
    const limiter = new AionLimiter();

    // Instrument Instances
    const synth808 = new Aion808();
    const epiano = new AionEPiano();
    const pad = new NebulaPad();
    const lead = new PulseLead();
    const vox = new AionVox();

    // Drum Machine Instances
    const kick = new CyberKick();
    const snare = new NeonSnare();
    const hats = new GlitchHats();

    // Orchestral Instances
    const strings = new AionStrings();
    const brass = new AionBrass();
    const flute = new AionFlute();
    const guitar = new AionGuitar();
    const worldPerc = new WorldPerc();

    // Legendary Library of Congress Instances
    const strad = new StradivariusNode();
    const crystalFlute = new CrystalFluteNode();
    const buchla = new BuchlaNode();
    const harpsichord = new HarpsichordNode();
    const khlui = new KhluiNode();
    const metalGuitar = new HeavyMetalGuitar();
    const banjo = new BanjoNode();
    const wobble = new WobbleBass();

    guitar.init(root * 2, sampleRate);
    metalGuitar.init(root * 2, sampleRate);
    banjo.init(root * 3, sampleRate);

    // Preset Overrides
    let drive = 1.8 + (seed % 10) / 5;
    let revMix = 0.3;
    let duckMix = 0.7;
    let stereoWidth = 1.3;
    let lpfCutoff = 0.4 + (song.bpm / 400);
    let tilt = 0.5;

    if (song.warmthPreset === "Tube Warmth") {
      drive = 3.5;
      lpfCutoff = 0.35;
      revMix = 0.15;
      tilt = 0.4;
    } else if (song.warmthPreset === "Tape Crush") {
      drive = 7.0;
      lpfCutoff = 0.25;
      revMix = 0.2;
      tilt = 0.35;
    } else if (song.warmthPreset === "Wide Air") {
      drive = 1.5;
      lpfCutoff = 0.6;
      stereoWidth = 1.8;
      revMix = 0.4;
      tilt = 0.65;
    } else if (song.warmthPreset === "Pumping Space") {
      drive = 3.0;
      revMix = 0.7;
      duckMix = 0.9;
      stereoWidth = 1.6;
      tilt = 0.5;
    } else if (song.warmthPreset === "Subtle Glow") {
      drive = 2.2;
      revMix = 0.1;
      duckMix = 0.2;
      tilt = 0.55;
    } else if (song.warmthPreset === "Lo-Fi Hip Hop") {
      drive = 5.5;
      lpfCutoff = 0.15;
      tilt = 0.3;
      stereoWidth = 0.85;
      revMix = 0.25;
      duckMix = 0.1;
    } else if (song.warmthPreset === "Cinematic Orchestral") {
      drive = 1.2;
      lpfCutoff = 0.9;
      tilt = 0.6;
      stereoWidth = 1.95;
      revMix = 0.75;
      duckMix = 0.0;
    } else if (song.warmthPreset === "Techno Pulse") {
      drive = 9.0;
      lpfCutoff = 0.5;
      tilt = 0.55;
      stereoWidth = 1.0;
      revMix = 0.1;
      duckMix = 1.0;
    } else if (song.warmthPreset === "Dream Pop") {
      drive = 2.5;
      lpfCutoff = 0.7;
      tilt = 0.7;
      stereoWidth = 1.7;
      revMix = 0.65;
      duckMix = 0.3;
    } else if (song.warmthPreset === "Vintage Soul") {
      drive = 4.0;
      lpfCutoff = 0.3;
      tilt = 0.45;
      stereoWidth = 0.95;
      revMix = 0.2;
      duckMix = 0.0;
    } else if (song.warmthPreset === "Drum and Bass") {
      drive = 4.5;
      lpfCutoff = 0.45;
      revMix = 0.15;
      duckMix = 0.4;
      stereoWidth = 1.1;
    } else if (song.warmthPreset === "Dubstep") {
      drive = 8.0;
      lpfCutoff = 0.35;
      revMix = 0.3;
      duckMix = 0.5;
      stereoWidth = 1.4;
    } else if (song.warmthPreset === "Heavy Metal") {
      drive = 10.0;
      lpfCutoff = 0.6;
      revMix = 0.2;
      duckMix = 0.0;
      stereoWidth = 1.2;
    } else if (song.warmthPreset === "Bardcore") {
      drive = 1.5;
      lpfCutoff = 0.8;
      revMix = 0.5;
      duckMix = 0.0;
      stereoWidth = 1.3;
    }

    lpfL.setCutoff(lpfCutoff);
    lpfR.setCutoff(lpfCutoff);

    for (let index = 0; index < sampleCount; index += 1) {
      const time = index / sampleRate;
      const pulse = Math.sin(time * Math.PI * 2 * (song.bpm / 60)) > 0.4 ? 1 : 0.35;

      // Sidechain trigger based on pulse peaks (simulated kick)
      const sidechainTrigger = Math.sin(time * Math.PI * 2 * (song.bpm / 60)) > 0.9 ? 1.0 : 0.0;

      const melody = Math.sin(time * Math.PI * 2 * root) * 0.24;
      const subBass = Math.sin(time * Math.PI * 2 * (root / 2)) * 0.2;
      const grit = (time * root * 2 % 1) * 0.05;

      // Add atmospheric texture layer
      const atmosphere = texture.process(root * 2, sampleRate) * 0.15;

      // Orchestral and Worldwide Layers
      const stringLayer = strings.process(time % 4, root, 'violin') * 0.2;
      const brassLayer = brass.process(time % 2, root / 2) * 0.15;
      const fluteLayer = flute.process(time % 8, root * 2) * 0.1;
      const guitarLayer = guitar.process() * 0.2;

      // Legendary Instrument Layers
      const stradLayer = strad.process(time % 4, root) * 0.25;
      const crystalLayer = crystalFlute.process(time % 6, root * 3) * 0.15;
      const buchlaLayer = buchla.process(time, root / 4) * 0.3;
      const harpsichordLayer = harpsichord.process(time % 2, root * 1.5) * 0.15;
      const khluiLayer = khlui.process(time % 4, root) * 0.1;

      // Neural Vocal Synthesis
      const vocalFreq = root * 2.1; // Melodic relation
      const vocalSample = song.lyrics ? vox.process(time % 4, vocalFreq, song.lyrics, sampleRate) : 0;

      // Nebula Drum Machine logic
      const beatProgress = (time * (song.bpm / 60)) % 1;
      const step = Math.floor(beatProgress * 4); // 4-step internal sequencer
      const stepTime = (time % (60 / (song.bpm * 4)));

      const kickTrigger = step === 0;
      const snareTrigger = step === 2;
      const hatTrigger = true; // Pulse on every 16th essentially

      const drumSample =
        kick.process(stepTime, kickTrigger) * 0.8 +
        snare.process(stepTime, snareTrigger) * 0.5 +
        hats.process(stepTime, hatTrigger) * 0.2;

      // Bass Package logic (Sub Bass and Wobble)
      const subBassDrive = (song.warmthPreset === "Drum and Bass" || song.warmthPreset === "Dubstep" || song.warmthPreset === "Trap") ? 0.8 : 0.4;
      const subBassSample = Math.sin(time * Math.PI * 2 * (root / 4)) * subBassDrive;

      // Generative Instrument Arrangement based on Preset
      let instrumentSample = 0;
      if (song.warmthPreset === "Techno Pulse") {
        instrumentSample = lead.process(time, root * 2) * 0.3 + synth808.process(time % (60/song.bpm), true, 40) * 0.5 + drumSample + vocalSample * 0.2 + buchlaLayer;
      } else if (song.warmthPreset === "Lo-Fi Hip Hop") {
        instrumentSample = melody * 0.3 + subBass * 0.4 + drumSample * 0.6 + atmosphere + vocalSample * 0.4 + guitarLayer + harpsichordLayer;
      } else if (song.warmthPreset === "Vintage Soul") {
        instrumentSample = epiano.process(time % 2, root) * 0.5 + subBass * 0.5 + drumSample * 0.4 + vocalSample * 0.5 + khluiLayer + (worldPerc ? worldPerc.process(stepTime, kickTrigger) * 0.25 : 0);
      } else if (song.warmthPreset === "Cinematic Orchestral") {
        instrumentSample = stradLayer + brassLayer + pad.process(time, root, sampleRate) * 0.4 + vocalSample * 0.3 + crystalLayer;
      } else if (song.warmthPreset === "Dream Pop") {
        instrumentSample = pad.process(time, root, sampleRate) * 0.6 + fluteLayer + atmosphere + vocalSample * 0.3 + crystalLayer;
      } else if (song.warmthPreset === "Drum and Bass") {
        instrumentSample = wobble.process(time, root / 2, 8) * 0.6 + drumSample * 0.8 + vocalSample * 0.2 + subBassSample;
      } else if (song.warmthPreset === "Dubstep") {
        instrumentSample = wobble.process(time, root / 4, 4) * 0.7 + drumSample * 0.6 + vocalSample * 0.3 + subBassSample;
      } else if (song.warmthPreset === "Heavy Metal") {
        instrumentSample = metalGuitar.process() * 0.6 + brassLayer * 0.4 + drumSample * 0.5 + subBassSample * 0.2;
      } else if (song.warmthPreset === "Bardcore") {
        instrumentSample = harpsichordLayer + fluteLayer + vocalSample * 0.4 + strings.process(time % 4, root * 1.5, 'violin') * 0.3;
      } else if (song.style.toLowerCase().includes("trap")) {
        instrumentSample = synth808.process(time % (60/song.bpm), true, 60) * 0.6 + drumSample * 0.7 + vocalSample * 0.4 + subBassSample * 0.5;
      } else if (song.style.toLowerCase().includes("bluegrass")) {
        instrumentSample = banjo.process() * 0.5 + fluteLayer * 0.3 + (worldPerc ? worldPerc.process(stepTime, kickTrigger) * 0.2 : 0) + strings.process(time % 4, root, 'violin') * 0.4;
      } else {
        instrumentSample = (melody + subBass + grit + atmosphere + drumSample * 0.3 + vocalSample * 0.5 + stradLayer + (worldPerc ? worldPerc.process(stepTime, kickTrigger) * 0.2 : 0) + subBassSample * 0.3);
      }
erc.process(stepTime, kickTrigger) * 0.2);
      }

      const rawSample = instrumentSample * pulse * 0.7; // Scaled to prevent clipping

      // Apply DSP chain in stereo
      let procL = chorusL.process(rawSample, 0.4, 0.015);
      let procR = chorusR.process(rawSample, 0.5, 0.018); // Slightly different rate for natural width

      procL = applySaturation(procL, drive);
      procR = applySaturation(procR, drive);

      procL = lpfL.process(procL);
      procR = lpfR.process(procR);

      // Advanced Reverb
      const revL = reverbL.process(procL, 0.85, 0.4);
      const revR = reverbR.process(procR, 0.85, 0.4);

      procL += revL * revMix;
      procR += revR * revMix;

      // Sidechain Ducking (pumping effect)
      procL = duckerL.process(procL, sidechainTrigger, duckMix);
      procR = duckerR.process(procR, sidechainTrigger, duckMix);

      // Widening
      const { l, r } = widener.process(procL, procR, stereoWidth);

      // Final Tone and Limiting
      let finalL = tiltL.process(l, tilt);
      let finalR = tiltR.process(r, tilt);

      finalL = limiter.process(applyMasterTone(finalL + getTapeHiss(0.002) + (song.warmthPreset === "Lo-Fi Hip Hop" ? vinyl.process(0.02) : 0)));
      finalR = limiter.process(applyMasterTone(finalR + getTapeHiss(0.002) + (song.warmthPreset === "Lo-Fi Hip Hop" ? vinyl.process(0.02) : 0)));

      const attack = Math.min(1, time * 12);
      const release = Math.min(1, (seconds - time) * 4);

      wav.writeInt16LE(Math.round(finalL * attack * release * 32767), 44 + index * 4);
      wav.writeInt16LE(Math.round(finalR * attack * release * 32767), 44 + index * 4 + 2);
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

router.get("/midi/:songId", async (req, res) => {
  const params = GetMidiParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).send("Invalid song id");
    return;
  }
  try {
    const [song] = await db
      .select()
      .from(songsTable)
      .where(eq(songsTable.id, params.data.songId))
      .limit(1);

    if (!song) return res.status(404).send("Not found");

    // Generate symbolic MIDI notes based on song ID and BPM
    const seed = Math.abs(hashString(song.id));
    const notes = Array.from({ length: 16 }).map((_, i) => ({
      pitch: 60 + (seed % 12) + (i % 7), // Basic melodic sequence
      start: i * 0.5,
      duration: 0.4
    }));

    const midi = generateMidiData(notes);

    res.set({
      "Content-Type": "audio/midi",
      "Content-Disposition": `attachment; filename="${song.title}.mid"`,
    });
    res.send(midi);
  } catch (error) {
    res.status(500).send("MIDI synthesis failed");
  }
});

const projectStorage = new Map<string, Project>();

router.get("/projects", (req, res) => {
  res.json(ListProjectsResponse.parse(Array.from(projectStorage.values())));
});

router.post("/projects", (req, res) => {
  const body = ProjectInput.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid project input" });
    return;
  }
  const id = `project-${Date.now()}`;
  const project = { id, name: body.data.name || "New Nebula Arrangement", items: body.data.items || [] };
  projectStorage.set(id, project);
  res.status(201).json(Project.parse(project));
});

router.get("/projects/:projectId", (req, res) => {
  const params = GetProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).send("Invalid project id");
    return;
  }
  const project = projectStorage.get(params.data.projectId);
  if (!project) return res.status(404).send("Project not found");
  res.json(Project.parse(project));
});

router.patch("/projects/:projectId", (req, res) => {
  const params = UpdateProjectParams.safeParse(req.params);
  const body = ProjectInput.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid project update" });
    return;
  }
  const project = projectStorage.get(params.data.projectId);
  if (!project) return res.status(404).send("Project not found");
  const updated = { ...project, ...body.data };
  projectStorage.set(params.data.projectId, updated);
  res.json(Project.parse(updated));
});

export default router;
