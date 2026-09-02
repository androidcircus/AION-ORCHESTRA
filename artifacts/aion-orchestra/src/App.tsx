import { type FormEvent, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  ArrowUpRight,
  AudioLines,
  Check,
  ChevronDown,
  CircleHelp,
  Clock3,
  Cpu,
  Disc3,
  Download,
  FileAudio,
  Heart,
  Info,
  Layers3,
  Mic2,
  Menu,
  Music2,
  Pause,
  Play,
  Plus,
  Radio,
  RefreshCw,
  RotateCcw,
  RotateCw,
  SlidersHorizontal,
  Sparkles,
  Star,
  Video,
  WandSparkles,
  X,
} from 'lucide-react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import {
  GenerateSongInputModel,
  SongStatus,
  type GenerateSongInput,
  type RefineSongInput,
  type Song,
} from '@workspace/api-client-react';
import {
  getGetSongQueryKey,
  getGetWorkspaceSummaryQueryKey,
  getHealthCheckQueryKey,
  getListSongsQueryKey,
  useGenerateSong,
  useGetSong,
  useGetWorkspaceSummary,
  useHealthCheck,
  useListSongs,
  useToggleSongFavorite,
  useRefineSong,
  useRemixSong,
} from '@workspace/api-client-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { PresetBrowser } from '@/components/preset-browser';
import { NebulaCenterpiece, type NebulaHandle } from '@/components/nebula-centerpiece';
import { NebulaFeed } from '@/components/nebula-feed';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Slider } from '@/components/ui/slider';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import NotFound from '@/pages/not-found';
import { LibraryPage, StudioPage } from '@/pages/voice-to-instrument';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';

const queryClient = new QueryClient();

const STYLE_PRESETS = ['Alt R&B', 'Lo-fi house', 'Cinematic pop', 'Indie electronica', 'Ambient jazz'];
const MODEL_OPTIONS = [
  { value: GenerateSongInputModel.AION_Core_Ideation, note: 'Fast ideation' },
  { value: GenerateSongInputModel.Soundraw_Studio_Stems, note: 'Detailed texture' },
  { value: GenerateSongInputModel.Suno_Vocal_Focus, note: 'Vocal-forward' },
];

function formatDuration(seconds: number) {
  if (!seconds || seconds < 1) return '—';
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainder}`;
}

function formatRelativeDate(date: string) {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return 'recently';
  const difference = Date.now() - parsed.getTime();
  const minutes = Math.floor(difference / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function RefinePanel({ song, onRefine, onCancel }: { song: Song; onRefine: (data: RefineSongInput) => void; onCancel: () => void }) {
  const [energy, setEnergy] = useState(song.energy || 68);
  const [warmth, setWarmth] = useState(song.warmthPreset || 'Custom');

  return (
    <Card className="mt-4 cyber-card border-primary/30 bg-primary/5">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
          <Sparkles className="h-4 w-4 text-accent neon-text" />
          Neural Refinement: <span className="text-accent">{song.title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-[10px] font-mono uppercase mb-2 text-foreground/60">
              <span>Energy</span>
              <span className="text-accent">{energy}%</span>
            </div>
            <Slider value={[energy]} onValueChange={([v]) => setEnergy(v)} max={100} step={1} />
          </div>
          <div>
            <label className="text-[10px] font-mono uppercase mb-2 block text-foreground/60">Nebula Character</label>
            <PresetBrowser
              activePresetId={warmth.toLowerCase().replace(' ', '-')}
              onSelect={(id) => {
                const nameMap: Record<string, string> = {
                  'tube-warmth': 'Tube Warmth',
                  'tape-crush': 'Tape Crush',
                  'wide-air': 'Wide Air',
                  'pumping-space': 'Pumping Space',
                  'subtle-glow': 'Subtle Glow',
                  'lo-fi-hip-hop': 'Lo-Fi Hip Hop',
                  'cinematic-orchestral': 'Cinematic Orchestral',
                  'techno-pulse': 'Techno Pulse',
                  'dream-pop': 'Dream Pop',
                  'vintage-soul': 'Vintage Soul'
                };
                setWarmth(nameMap[id] || 'Custom');
              }}
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button size="sm" onClick={() => onRefine({ energy, warmthPreset: warmth as any })} className="flex-1 cyber-button cyber-button-primary">
              Re-Synthesize
            </Button>
            <Button size="sm" variant="outline" onClick={onCancel} className="border-border text-foreground/60 hover:text-foreground">
              Cancel
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AIArchitect({ onSeedIdea }: { onSeedIdea: (prompt: string, style: string) => void }) {
  const [log, setLog] = useState<string[]>(['[SYSTEM]: Architect Online...', '[SYSTEM]: Scanning Nebula protocols...']);
  const [isSynthesizing, setIsSynthesizing] = useState(false);

  const synthesize = () => {
    setIsSynthesizing(true);
    const ideas = [
      { prompt: "Cybernetic rain falling on a neon garden of glass flowers", style: "Dream Pop" },
      { prompt: "Aggressive pulse-lead driving through a high-speed orbital relay", style: "Techno Pulse" },
      { prompt: "Dusty analog memories drifting through a abandoned space station", style: "Lo-Fi Hip Hop" },
      { prompt: "Epic royal blue cinematic theme for a grand space arrival", style: "Cinematic Orchestral" }
    ];

    const randomIdea = ideas[Math.floor(Math.random() * ideas.length)];

    const updates = [
      '[AGENT]: Analyzing harmonic resonance...',
      '[AGENT]: Mapping Library of Congress Suite...',
      '[AGENT]: Restoring "Betts" Stradivarius (1704)...',
      '[AGENT]: Initializing Buchla Model 100 protocols...',
      '[AGENT]: Synthesizing Madison Crystal Flute...',
      '[SYSTEM]: Legendary Instrument Logic Synchronized.'
    ];

    updates.forEach((msg, i) => {
      setTimeout(() => {
        setLog(prev => [...prev, msg]);
        if (i === updates.length - 1) {
          setIsSynthesizing(false);
          onSeedIdea(randomIdea.prompt, randomIdea.style);
        }
      }, (i + 1) * 800);
    });
  };

  return (
    <section id="architect" className="aion-rise aion-delay-2 mt-12 cyber-card p-6" data-testid="section-architect">
      <div className="flex items-center justify-between border-b border-accent/20 pb-4 mb-6">
        <div>
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.2em] text-accent neon-text">
            <Cpu className="h-3.5 w-3.5" /> Generative Agent Node
          </div>
          <h2 className="font-serif text-3xl mt-1">AI <em className="text-primary">Architect.</em></h2>
        </div>
        <Button
          onClick={synthesize}
          disabled={isSynthesizing}
          className="cyber-button cyber-button-secondary"
        >
          {isSynthesizing ? <RotateCw className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
          Synthesize Code
        </Button>
      </div>

      <div className="bg-black/40 rounded-sm p-4 font-mono text-[11px] h-[200px] overflow-y-auto border border-border/50 shadow-inner">
        {log.map((line, i) => (
          <div key={i} className={`mb-1 ${line.startsWith('[SYSTEM]') ? 'text-accent' : 'text-foreground/70'}`}>
            <span className="opacity-30 mr-2">[{new Date().toLocaleTimeString()}]</span>
            {line}
          </div>
        ))}
        {isSynthesizing && <div className="text-primary animate-pulse mt-2">_COMPILE_IN_PROGRESS...</div>}
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-3 border border-border bg-white/5 rounded-sm">
          <div className="text-[10px] uppercase text-accent mb-1 font-bold">Neural Patch</div>
          <div className="text-xs text-foreground/60 italic">"Nebula-Core v4.2"</div>
        </div>
        <div className="p-3 border border-border bg-white/5 rounded-sm">
          <div className="text-[10px] uppercase text-primary mb-1 font-bold">Mobile Bridge</div>
          <div className="text-xs text-foreground/60 italic">"APK-Sync Active"</div>
        </div>
        <div className="p-3 border border-border bg-white/5 rounded-sm">
          <div className="text-[10px] uppercase text-secondary mb-1 font-bold">GitHub Sync</div>
          <div className="text-xs text-foreground/60 italic">"Push-to-Build OK"</div>
        </div>
      </div>
    </section>
  );
}

function StatusPill({ song }: { song: Song }) {
  const labels: Record<string, string> = {
    queued: 'Mapping',
    generating: song.stage || 'Synthesizing',
    completed: 'Captured',
    failed: 'Errored',
  };
  const statusClass: Record<string, string> = {
    queued: 'border-primary/30 bg-primary/10 text-primary shadow-[0_0_8px_rgba(0,35,255,0.2)]',
    generating: 'border-accent/30 bg-accent/10 text-accent',
    completed: 'border-green-500/30 bg-green-500/10 text-green-400 neon-text',
    failed: 'border-red-500/30 bg-red-500/10 text-red-400',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[.12em] ${statusClass[song.status] || statusClass.queued}`}>
      {song.status === SongStatus.generating && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />}
      {song.status === SongStatus.completed && <Check className="h-3 w-3" />}
      {labels[song.status] || song.status}
    </span>
  );
}

function CoverArt({ song, size = 'normal' }: { song: Song; size?: 'normal' | 'large' }) {
  const hue = Number.isFinite(song.coverHue) ? song.coverHue : 220; // Default to Royal Blue
  return (
    <div
      className={`relative isolate shrink-0 overflow-hidden rounded-[3px] border border-white/10 bg-black ${size === 'large' ? 'h-28 w-28 sm:h-36 sm:w-36' : 'h-16 w-16'}`}
      style={{ background: `linear-gradient(145deg, hsl(${hue} 82% 50%), hsl(${(hue + 60) % 360} 90% 20%))` }}
      aria-label={`${song.title} cover art`}
      data-testid={`img-cover-${song.id}`}
    >
      <div className="absolute -right-5 -top-5 h-24 w-24 rounded-full border-[12px] border-primary/20 blur-xl" />
      <div className="absolute -bottom-8 -left-4 h-24 w-24 rounded-full border-[9px] border-secondary/20 blur-lg" />
      <div className="absolute inset-x-2 bottom-2 flex items-end gap-[3px] opacity-80">
        {[.42, .76, .3, .9, .58, .34, .66, .48, .82, .27].map((height, index) => (
          <span key={index} className="w-[3px] rounded-full bg-accent/60 shadow-[0_0_5px_rgba(0,240,255,0.5)]" style={{ height: `${height * (size === 'large' ? 30 : 18)}px` }} />
        ))}
      </div>
      <span className="absolute left-2 top-2 font-mono text-[8px] font-bold tracking-[.08em] text-white/70">
        X/{String(hue).padStart(3, '0')}
      </span>
    </div>
  );
}

function Waveform({ compact = false, active = false }: { compact?: boolean; active?: boolean }) {
  const bars = compact ? 34 : 58;
  return (
    <div className={`flex items-center gap-[3px] ${compact ? 'h-7' : 'h-16'}`} aria-label="audio waveform">
      {Array.from({ length: bars }).map((_, index) => {
        const wave = Math.abs(Math.sin(index * 0.62)) * .75 + .16;
        return (
          <span
            key={index}
            className={`wave-bar min-w-[2px] flex-1 rounded-full ${active ? 'bg-accent shadow-[0_0_10px_rgba(0,240,255,0.8)]' : 'bg-primary/30'}`}
            style={{ height: `${Math.max(14, wave * (compact ? 25 : 54))}%`, animationDelay: `${-(index % 7) * .14}s` }}
          />
        );
      })}
    </div>
  );
}

function SideRail({ activeGenerations }: { activeGenerations: number }) {
  const performPath = `${import.meta.env.BASE_URL.replace(/\/$/, '')}/perform`;
  return (
    <aside className="hidden min-h-[100dvh] w-[250px] shrink-0 flex-col bg-card border-r border-border text-foreground lg:flex">
      <div className="flex items-center gap-3 border-b border-border px-7 py-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-white shadow-[0_0_15px_rgba(0,35,255,0.4)]">
          <AudioLines className="h-5 w-5" strokeWidth={2.5} />
        </div>
        <div>
          <div className="font-mono text-[13px] font-bold tracking-[.2em] neon-text text-primary uppercase">AION ORCHESTRA</div>
          <div className="mt-0.5 font-mono text-[8px] uppercase tracking-[.22em] text-foreground/45">Cyberpunk Lab / 01</div>
        </div>
      </div>
      <div className="px-4 pt-8">
        <p className="px-3 font-mono text-[9px] uppercase tracking-[.2em] text-foreground/30 font-bold">Intelligence</p>
        <nav className="mt-3 space-y-1" aria-label="Primary navigation">
          <a href="#signal" className="aion-focus flex items-center gap-3 rounded-md px-3 py-3 text-sm text-foreground/65 transition-colors hover:bg-white/5 hover:text-foreground" data-testid="link-signal">
            <Activity className="h-4 w-4 text-secondary" />
            Studio signal
            {activeGenerations > 0 && <span className="ml-auto rounded-full bg-primary px-1.5 py-0.5 font-mono text-[9px] text-white shadow-[0_0_8px_rgba(0,35,255,0.5)]">{activeGenerations}</span>}
          </a>
          <a href="#compose" className="aion-focus flex items-center gap-3 rounded-md bg-white/5 px-3 py-3 text-sm font-semibold text-foreground shadow-[0_0_10px_rgba(0,35,255,0.1)] hover:bg-white/10" data-testid="link-compose">
            <WandSparkles className="h-4 w-4 text-accent" />
            Compose
            <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent neon-border" />
          </a>
          <a href="#architect" className="aion-focus flex items-center gap-3 rounded-md px-3 py-3 text-sm text-foreground/65 transition-colors hover:bg-white/5 hover:text-foreground" data-testid="link-architect">
            <Cpu className="h-4 w-4 text-accent animate-pulse" />
            AI Architect
          </a>
          <a href="#timeline" className="aion-focus flex items-center gap-3 rounded-md px-3 py-3 text-sm text-foreground/65 transition-colors hover:bg-white/5 hover:text-foreground" data-testid="link-timeline">
            <Layers3 className="h-4 w-4 text-primary" />
            Timeline
          </a>
          <a href="#feed" className="aion-focus flex items-center gap-3 rounded-md px-3 py-3 text-sm text-foreground/65 transition-colors hover:bg-white/5 hover:text-foreground" data-testid="link-feed">
            <Radio className="h-4 w-4 text-accent" />
            Nebula Feed
            <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent neon-border animate-pulse" />
          </a>
          <a href="#creations" className="aion-focus flex items-center gap-3 rounded-md px-3 py-3 text-sm text-foreground/65 transition-colors hover:bg-white/5 hover:text-foreground" data-testid="link-creations">
            <Disc3 className="h-4 w-4 text-primary" />
            Creations
          </a>
          <a href={performPath} className="aion-focus flex items-center gap-3 rounded-md px-3 py-3 text-sm text-foreground/65 transition-colors hover:bg-white/5 hover:text-foreground" data-testid="link-voice-studio">
            <Mic2 className="h-4 w-4 text-secondary" />
            Voice studio
          </a>
        </nav>
      </div>
      <div className="mt-auto border-t border-border px-7 py-6">
        <div className="flex items-center gap-2 text-foreground/50">
          <CircleHelp className="h-4 w-4" />
          <span className="text-xs">System Assist</span>
          <span className="ml-auto font-mono text-[9px]">⌘ /</span>
        </div>
        <div className="mt-5 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary font-mono text-[11px] font-bold text-white shadow-[0_0_10px_rgba(0,35,255,0.3)] border border-white/20">AK</div>
          <div>
            <div className="text-xs font-bold text-foreground">Ari Kim</div>
            <div className="font-mono text-[9px] text-foreground/40 uppercase tracking-tighter">Prime Producer</div>
          </div>
          <ChevronDown className="ml-auto h-4 w-4 text-foreground/40" />
        </div>
      </div>
    </aside>
  );
}

function MobileHeader({ activeGenerations }: { activeGenerations: number }) {
  const [isOpen, setIsOpen] = useState(false);
  const performPath = `${import.meta.env.BASE_URL.replace(/\/$/, '')}/perform`;
  return (
    <header className="relative flex items-center justify-between border-b border-border bg-background/80 backdrop-blur-md px-5 py-4 lg:hidden">
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white shadow-[0_0_10px_rgba(0,35,255,0.5)]"><AudioLines className="h-4 w-4" /></div>
        <span className="font-mono text-[12px] font-bold tracking-[.18em] text-primary neon-text">AION / ORCHESTRA</span>
      </div>
      <div className="flex items-center gap-3">
        {activeGenerations > 0 && <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-wider text-accent"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" /> {activeGenerations} live</span>}
        <button onClick={() => setIsOpen((value) => !value)} className="aion-focus rounded-md p-1.5 text-foreground" data-testid="button-mobile-menu" aria-label={isOpen ? 'Close menu' : 'Open menu'} aria-expanded={isOpen}><Menu className="h-5 w-5" /></button>
      </div>
      {isOpen && (
        <nav className="aion-shadow-sm absolute inset-x-5 top-[calc(100%-1px)] z-20 rounded-b-[3px] border border-t-0 border-border bg-card p-2 shadow-[0_10px_30px_rgba(0,0,0,0.5)]" aria-label="Mobile navigation" data-testid="nav-mobile">
          <a href="#signal" onClick={() => setIsOpen(false)} className="flex items-center gap-3 px-3 py-3 text-xs font-semibold text-foreground/80 hover:text-secondary" data-testid="link-mobile-signal"><Activity className="h-4 w-4 text-secondary" /> Studio signal</a>
          <a href="#compose" onClick={() => setIsOpen(false)} className="flex items-center gap-3 px-3 py-3 text-xs font-semibold text-foreground/80 hover:text-accent" data-testid="link-mobile-compose"><WandSparkles className="h-4 w-4 text-accent" /> Compose</a>
          <a href="#architect" onClick={() => setIsOpen(false)} className="flex items-center gap-3 px-3 py-3 text-xs font-semibold text-foreground/80 hover:text-accent" data-testid="link-mobile-architect"><Cpu className="h-4 w-4 text-accent" /> AI Architect</a>
          <a href="#timeline" onClick={() => setIsOpen(false)} className="flex items-center gap-3 px-3 py-3 text-xs font-semibold text-foreground/80 hover:text-primary" data-testid="link-mobile-timeline"><Layers3 className="h-4 w-4 text-primary" /> Timeline</a>
          <a href="#feed" onClick={() => setIsOpen(false)} className="flex items-center gap-3 px-3 py-3 text-xs font-semibold text-foreground/80 hover:text-accent" data-testid="link-mobile-feed"><Radio className="h-4 w-4 text-accent" /> Nebula Feed</a>
          <a href="#creations" onClick={() => setIsOpen(false)} className="flex items-center gap-3 px-3 py-3 text-xs font-semibold text-foreground/80 hover:text-primary" data-testid="link-mobile-creations"><Disc3 className="h-4 w-4 text-primary" /> Creations</a>
          <a href={performPath} onClick={() => setIsOpen(false)} className="flex items-center gap-3 px-3 py-3 text-xs font-semibold text-foreground/80 hover:text-secondary" data-testid="link-mobile-voice-studio"><Mic2 className="h-4 w-4 text-secondary" /> Voice studio</a>
        </nav>
      )}
    </header>
  );
}

function StatStrip({ totalSongs, completedSongs, minutesCreated, favoriteCount, loading, error }: { totalSongs: number; completedSongs: number; minutesCreated: number; favoriteCount: number; loading: boolean; error?: boolean }) {
  const stats = [
    { label: 'Tracks in nebula', value: totalSongs.toString().padStart(2, '0'), icon: Layers3 },
    { label: 'Playable signals', value: completedSongs.toString().padStart(2, '0'), icon: FileAudio },
    { label: 'Minutes synthesized', value: minutesCreated.toFixed(1), icon: Clock3 },
    { label: 'Neural keepers', value: favoriteCount.toString().padStart(2, '0'), icon: Heart },
  ];
  return (
    <section id="signal" className={`grid grid-cols-2 border-y border-border bg-card/40 backdrop-blur-sm sm:grid-cols-4 shadow-[0_0_20px_rgba(0,0,0,0.2)] transition-opacity ${error ? 'opacity-50 grayscale' : ''}`} data-testid="section-stats">
      {stats.map(({ label, value, icon: Icon }, index) => (
        <div key={label} className={`group flex items-center gap-3 px-4 py-4 sm:px-5 ${index < stats.length - 1 ? 'border-r border-border' : ''}`}>
          <Icon className={`h-4 w-4 transition-transform duration-300 group-hover:scale-110 neon-text ${error ? 'text-destructive' : 'text-accent'}`} />
          <div>
            {loading ? (
              <Skeleton className="h-5 w-10 bg-white/5" data-testid={`skeleton-stat-${index}`} />
            ) : error ? (
              <div className="font-mono text-[18px] font-bold leading-none tracking-[-.06em] text-destructive">ERR</div>
            ) : (
              <div className="font-mono text-[18px] font-bold leading-none tracking-[-.06em] text-foreground" data-testid={`text-stat-${index}`}>{value}</div>
            )}
            <div className="mt-1 text-[10px] uppercase tracking-[.09em] text-foreground/40 font-bold">{label}</div>
          </div>
        </div>
      ))}
    </section>
  );
}

function Composer({ seedIdea }: { seedIdea?: { prompt: string; style: string } }) {
  const queryClient = useQueryClient();
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState('Alt R&B');

  useEffect(() => {
    if (seedIdea) {
      setPrompt(seedIdea.prompt);
      setStyle(seedIdea.style);
    }
  }, [seedIdea]);

  const [lyrics, setLyrics] = useState('');
  const [warmthPreset, setWarmthPreset] = useState<string>('Custom');
  const [duration, setDuration] = useState('120');
  const [energy, setEnergy] = useState(68);
  const [instrumental, setInstrumental] = useState(false);
  const [model, setModel] = useState<GenerateSongInput['model']>(GenerateSongInputModel.AION_Core_Ideation);
  const [activeGenerationId, setActiveGenerationId] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [isLyricsOpen, setIsLyricsOpen] = useState(false);
  const generateSong = useGenerateSong();
  const activeSongQuery = useGetSong(activeGenerationId ?? '', {
    query: {
      enabled: Boolean(activeGenerationId),
      queryKey: getGetSongQueryKey(activeGenerationId ?? ''),
      refetchInterval: activeGenerationId ? 2500 : false,
    },
  });

  const progressSong = activeSongQuery.data;
  const progressStatus = progressSong?.status;

  useEffect(() => {
    if (!progressSong || !activeGenerationId) return;
    if (progressStatus === SongStatus.completed || progressStatus === SongStatus.failed) {
      setNotice(progressStatus === SongStatus.completed ? 'Your track is ready in Creations.' : 'Generation stopped. Try a more specific prompt.');
      setActiveGenerationId(null);
      queryClient.invalidateQueries({ queryKey: getListSongsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetWorkspaceSummaryQueryKey() });
    }
  }, [activeGenerationId, progressStatus, queryClient]);

  const isGenerating = generateSong.isPending || Boolean(activeGenerationId);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice('');
    if (prompt.trim().length < 3 || style.trim().length < 1) {
      setNotice('Give the idea and a style a little more shape first.');
      return;
    }
    const data: GenerateSongInput = {
      prompt: prompt.trim(),
      style: style.trim(),
      duration: Number(duration),
      instrumental,
      energy,
      warmthPreset: warmthPreset as GenerateSongInput['warmthPreset'],
      model,
      ...(lyrics.trim() && !instrumental ? { lyrics: lyrics.trim() } : {}),
    };
    generateSong.mutate({ data }, {
      onSuccess: (song) => {
        setActiveGenerationId(song.id);
        setNotice('The room is listening. Your idea is becoming a track.');
        queryClient.invalidateQueries({ queryKey: getListSongsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetWorkspaceSummaryQueryKey() });
      },
      onError: () => setNotice('The generation could not start. Check your connection and try again.'),
    });
  }

  return (
    <section id="compose" className="aion-rise aion-delay-1 relative overflow-hidden rounded-[5px] border border-border bg-card shadow-[0_0_20px_rgba(0,35,255,0.05)]" data-testid="section-composer">
      <div className="absolute right-0 top-0 hidden h-full w-[38%] bg-primary/5 opacity-50 lg:block" style={{ clipPath: 'polygon(28% 0, 100% 0, 100% 100%, 0 100%)' }} />
      <div className="relative grid lg:grid-cols-[1.05fr_.95fr]">
        <div className="aion-grid border-b border-border p-5 sm:p-8 lg:border-b-0 lg:border-r lg:p-10">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.2em] text-accent neon-text"><span className="h-2 w-2 rounded-full bg-accent animate-pulse" /> Input channel 01</span>
            <span className="font-mono text-[10px] text-foreground/40">AION / 001</span>
          </div>
          <h1 className="mt-10 max-w-[500px] font-serif text-[52px] leading-[.86] tracking-[-.055em] text-foreground sm:text-[74px]">
            Put the idea<br /><em>in motion.</em>
          </h1>
          <p className="mt-7 max-w-[370px] text-sm leading-6 text-foreground/60">Describe the feeling, the scene, or the hook. AION turns a clear signal into something you can play.</p>
          <div className="mt-12 hidden items-center gap-4 lg:flex">
            <div className="h-px w-12 bg-primary" />
            <span className="font-mono text-[9px] uppercase tracking-[.2em] text-foreground/30">A generative music lab for unfinished thoughts</span>
          </div>
        </div>
        <form className="relative p-5 sm:p-8 lg:p-10" onSubmit={handleSubmit} data-testid="form-generate-song">
          <div className="flex items-center justify-between">
            <label htmlFor="song-prompt" className="font-mono text-[10px] font-bold uppercase tracking-[.16em] text-foreground">Start with a signal</label>
            <span className="font-mono text-[10px] text-foreground/30">required</span>
          </div>
          <textarea
            id="song-prompt"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="A late-night groove for driving through a city after rain..."
            className="aion-focus mt-3 min-h-[130px] w-full resize-none rounded-[3px] border border-border bg-black/20 px-4 py-4 text-[15px] leading-6 text-foreground placeholder:text-foreground/30 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/10"
            data-testid="input-song-prompt"
          />
          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between">
              <label className="font-mono text-[10px] font-bold uppercase tracking-[.16em] text-foreground">Shape the sound</label>
              <span className="font-mono text-[10px] text-foreground/30">style / genre</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {STYLE_PRESETS.map((p) => (
                <button type="button" key={p} onClick={() => setStyle(p)} aria-pressed={style === p} className={`aion-focus rounded-full border px-3 py-2 text-[11px] transition-all ${style === p ? 'border-primary bg-primary text-white shadow-[0_0_10px_rgba(0,35,255,0.3)]' : 'border-border bg-white/5 text-foreground/60 hover:border-primary hover:text-primary'}`}>{style === p && <Check className="mr-1 inline h-3 w-3" />}{p}</button>
              ))}
              <input value={STYLE_PRESETS.includes(style) ? '' : style} onChange={(event) => setStyle(event.target.value)} placeholder="other..." aria-label="Custom music style" className="aion-focus min-w-[85px] rounded-full border border-dashed border-border bg-transparent px-3 py-2 text-[11px] outline-none placeholder:text-foreground/30" data-testid="input-custom-style" />
            </div>
          </div>
          <div className="mt-6 grid grid-cols-[1fr_auto] items-end gap-5">
            <div>
              <label htmlFor="song-duration" className="mb-2 block font-mono text-[10px] font-bold uppercase tracking-[.16em] text-foreground">Length</label>
              <div className="flex items-center border-b border-border pb-2">
                <input id="song-duration" type="range" min="15" max="240" step="15" value={duration} aria-valuetext={formatDuration(Number(duration))} onChange={(event) => setDuration(event.target.value)} className="h-1 w-full cursor-pointer accent-accent" data-testid="input-song-duration" />
                <span className="ml-3 w-10 font-mono text-xs font-bold text-accent" data-testid="text-song-duration">{formatDuration(Number(duration))}</span>
              </div>
            </div>
            <button type="button" onClick={() => setInstrumental((v) => !v)} role="switch" aria-checked={instrumental} className={`aion-focus flex items-center gap-2 pb-2 text-[11px] ${instrumental ? 'text-accent' : 'text-foreground/50'}`} data-testid="button-toggle-instrumental">
              <span className={`flex h-5 w-9 items-center rounded-full p-0.5 transition-colors ${instrumental ? 'bg-accent' : 'bg-white/10'}`}><span className={`h-4 w-4 rounded-full bg-white transition-transform ${instrumental ? 'translate-x-4' : ''}`} /></span>
              instrumental
            </button>
          </div>
          <button type="button" onClick={() => setIsLyricsOpen((v) => !v)} className="aion-focus mt-6 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.13em] text-accent" data-testid="button-toggle-lyrics">
            <Plus className={`h-3.5 w-3.5 transition-transform ${isLyricsOpen ? 'rotate-45' : ''}`} /> {isLyricsOpen ? 'Close lyric sheet' : 'Add optional lyrics'}
          </button>
          {isLyricsOpen && (
            <textarea value={lyrics} onChange={(event) => setLyrics(event.target.value)} placeholder="Drop in a hook, a verse, or a few words to steer the vocal..." className="aion-focus mt-3 min-h-[86px] w-full resize-y rounded-[3px] border border-border bg-black/20 px-3 py-3 text-xs leading-5 outline-none focus:border-accent" data-testid="input-song-lyrics" />
          )}
          <div className="mt-7 border-t border-border pt-5">
            <label className="font-mono text-[10px] font-bold uppercase tracking-[.16em] text-foreground">Warmth Preset</label>
            <PresetBrowser onSelect={(id) => {
              const nameMap: Record<string, string> = {
                'tube-warmth': 'Tube Warmth',
                'tape-crush': 'Tape Crush',
                'wide-air': 'Wide Air',
                'pumping-space': 'Pumping Space',
                'subtle-glow': 'Subtle Glow',
                'lo-fi-hip-hop': 'Lo-Fi Hip Hop',
                'cinematic-orchestral': 'Cinematic Orchestral',
                'techno-pulse': 'Techno Pulse',
                'dream-pop': 'Dream Pop',
                'vintage-soul': 'Vintage Soul'
              };
              setWarmthPreset(nameMap[id] || 'Custom');
            }} activePresetId={warmthPreset.toLowerCase().replace(' ', '-')} />
          </div>
          <div className="mt-7 border-t border-border pt-5">
            <div className="flex items-center justify-between">
              <label htmlFor="energy" className="font-mono text-[10px] font-bold uppercase tracking-[.16em] text-foreground">Energy</label>
              <span className="font-mono text-[11px] font-bold text-primary neon-text" data-testid="text-energy">{energy}<span className="ml-0.5 text-foreground/30">/ 100</span></span>
            </div>
            <input id="energy" type="range" min="0" max="100" value={energy} aria-label="Energy intensity" onChange={(event) => setEnergy(Number(event.target.value))} className="mt-3 h-1 w-full cursor-pointer accent-primary" data-testid="input-energy" />
          </div>
          <div className="mt-6 flex items-center gap-2">
            <SlidersHorizontal className="h-3.5 w-3.5 text-foreground/30" />
            <select value={model} onChange={(event) => setModel(event.target.value as any)} className="aion-focus w-full bg-transparent font-mono text-[10px] uppercase tracking-[.11em] text-foreground/60 outline-none" data-testid="select-model">
              {MODEL_OPTIONS.map((option) => <option value={option.value} key={option.value} className="bg-background">{option.value} — {option.note}</option>)}
            </select>
          </div>
          {notice && <div className={`mt-5 flex items-start gap-2 rounded-[3px] border px-3 py-2.5 text-xs ${notice.includes('could not') || notice.includes('stopped') ? 'border-destructive/30 bg-destructive/10 text-destructive' : 'border-accent/30 bg-accent/10 text-accent'}`} data-testid="status-generation-notice"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />{notice}</div>}
          <button type="submit" disabled={isGenerating} className="cyber-button cyber-button-primary mt-6 flex w-full items-center justify-center gap-3 px-5 py-4 text-sm font-bold shadow-[0_0_20px_rgba(0,35,255,0.4)] transition-transform hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-70" data-testid="button-generate-song">
            {isGenerating ? <><RotateCw className="h-4 w-4 animate-spin" /> {progressSong?.stage || 'Synthesizing...'}</> : <><Sparkles className="h-4 w-4" /> Initialize Core <ArrowUpRight className="h-4 w-4" /></>}
          </button>
        </form>
      </div>
      {isGenerating && (
        <div className="relative flex items-center gap-4 border-t border-border bg-primary/5 px-5 py-3.5 sm:px-10" data-testid="status-active-generation">
          <div className="flex items-center gap-1">{Array.from({ length: 7 }).map((_, index) => <span key={index} className="wave-bar w-1 rounded-full bg-accent" style={{ height: `${8 + (index % 4) * 4}px`, animationDelay: `${-index * .12}s` }} />)}</div>
          <div className="flex-1 text-xs text-accent"><strong className="font-semibold neon-text">Rendering Signal.</strong> {progressSong?.stage || 'Mapping harmonics'}.</div>
          {progressSong?.progress !== undefined && <span className="font-mono text-[11px] font-bold text-accent">{progressSong.progress}%</span>}
        </div>
      )}
    </section>
  );
}

function SongRow({ song, onFavorite, onPlay, onRefine, onRemix, isPlaying }: { song: Song; onFavorite: (song: Song) => void; onPlay: (song: Song) => void; onRefine: (song: Song) => void; onRemix: (songId: string) => void; isPlaying: boolean }) {
  return (
    <article className="group grid items-center gap-4 border-b border-border py-4 transition-colors hover:bg-primary/5 sm:grid-cols-[auto_1fr_auto] sm:px-3" data-testid={`card-song-${song.id}`}>
      <div className="flex items-center gap-3">
        <CoverArt song={song} />
        <button type="button" disabled={song.status !== SongStatus.completed || !song.audioUrl} onClick={() => onPlay(song)} className={`cyber-button flex h-9 w-9 items-center justify-center rounded-full transition-all ${isPlaying ? 'bg-accent text-background shadow-[0_0_15px_rgba(0,240,255,0.5)]' : 'bg-primary text-white shadow-[0_0_10px_rgba(0,35,255,0.3)]'} disabled:cursor-not-allowed disabled:opacity-35 sm:hidden`} data-testid={`button-play-${song.id}`} aria-label={`Play ${song.title}`}>
          {isPlaying ? <Pause className="h-3.5 w-3.5 fill-current" /> : <Play className="ml-0.5 h-3.5 w-3.5 fill-current" />}
        </button>
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate text-sm font-bold tracking-[-.02em] text-foreground neon-text" data-testid={`text-song-title-${song.id}`}>{song.title || 'Untitled signal'}</h3>
          <StatusPill song={song} />
        </div>
        <p className="mt-1 truncate text-xs text-foreground/50">{song.prompt}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2 font-mono text-[9px] uppercase tracking-[.1em] text-foreground/40">
          <span className="text-secondary font-bold">{song.style}</span><span className="text-border">/</span><span>{song.bpm || '—'} BPM</span><span className="text-border">/</span><span>{song.musicalKey || '—'}</span><span className="text-border">/</span><span>{formatRelativeDate(song.createdAt)}</span>
        </div>
        {(song.status === SongStatus.generating || song.status === SongStatus.queued) && <div className="mt-3 h-1 max-w-[270px] overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-primary transition-[width] duration-700 shadow-[0_0_10px_rgba(0,35,255,0.5)]" style={{ width: `${song.progress || 4}%` }} /></div>}
      </div>
      <div className="hidden items-center gap-2 sm:flex">
        <button type="button" onClick={() => onRefine(song)} className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-foreground/60 transition-all hover:border-accent hover:text-accent hover:shadow-[0_0_10px_rgba(0,240,255,0.2)]" title="Neural Refine">
          <SlidersHorizontal className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => onRemix(song.id)} className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-foreground/60 transition-all hover:border-secondary hover:text-secondary hover:shadow-[0_0_10px_rgba(188,0,255,0.2)]" title="Neural Remix">
          <RotateCcw className="h-4 w-4" />
        </button>
        <button type="button" disabled={song.status !== SongStatus.completed} className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-foreground/60 transition-all hover:border-accent hover:text-accent hover:shadow-[0_0_10px_rgba(0,240,255,0.2)]" title="Export Stems (Nebula Ready)" onClick={() => window.open(song.audioUrl || '', '_blank')}>
          <Download className="h-4 w-4" />
        </button>
        <button type="button" disabled={song.status !== SongStatus.completed || !song.audioUrl} onClick={() => onPlay(song)} className={`flex h-9 w-9 items-center justify-center rounded-full border transition-all ${isPlaying ? 'bg-accent text-background border-accent shadow-[0_0_15px_rgba(0,240,255,0.5)]' : 'bg-card text-foreground/60 border-border hover:border-accent hover:text-accent'} disabled:cursor-not-allowed disabled:opacity-35`} data-testid={`button-play-${song.id}`} aria-label={`Play ${song.title}`}>
          {isPlaying ? <Pause className="h-3.5 w-3.5 fill-current" /> : <Play className="ml-0.5 h-3.5 w-3.5 fill-current" />}
        </button>
        <button type="button" onClick={() => onFavorite(song)} className={`flex h-9 w-9 items-center justify-center rounded-full border transition-all ${song.isFavorite ? 'border-secondary bg-secondary/10 text-secondary shadow-[0_0_10px_rgba(188,0,255,0.3)]' : 'border-border bg-card text-foreground/40 hover:border-secondary hover:text-secondary'}`} data-testid={`button-favorite-${song.id}`} aria-label={`${song.isFavorite ? 'Remove' : 'Add'} ${song.title} ${song.isFavorite ? 'from favorites' : 'to favorites'}`}>
          <Heart className="h-4 w-4" fill={song.isFavorite ? 'currentColor' : 'none'} />
        </button>
      </div>
    </article>
  );
}

function SongSkeleton() {
  return (
    <div className="flex items-center gap-4 border-b border-border py-4">
      <Skeleton className="h-16 w-16 shrink-0 bg-white/5" />
      <div className="flex-1 space-y-2"><Skeleton className="h-4 w-44 bg-white/5" /><Skeleton className="h-3 w-72 max-w-full bg-white/5" /><Skeleton className="h-2 w-36 bg-white/5" /></div>
      <Skeleton className="hidden h-9 w-20 bg-white/5 sm:block" />
    </div>
  );
}

function Creations() {
  const queryClient = useQueryClient();
  const songsQuery = useListSongs({ query: { queryKey: getListSongsQueryKey(), refetchInterval: 5000 } });
  const favoriteMutation = useToggleSongFavorite();
  const songs = useMemo(() => songsQuery.data ?? [], [songsQuery.data]);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [refiningSong, setRefiningSong] = useState<Song | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [showFavorites, setShowFavorites] = useState(false);
  const visibleSongs = showFavorites ? songs.filter((song) => song.isFavorite) : songs;
  const refineMutation = useRefineSong();
  const remixMutation = useRemixSong();

  function playSong(song: Song) {
    if (!song.audioUrl) return;
    if (playingId === song.id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    if (!audioRef.current) audioRef.current = new Audio();
    audioRef.current.src = song.audioUrl;
    audioRef.current.onended = () => setPlayingId(null);
    audioRef.current.play().then(() => setPlayingId(song.id)).catch(() => setPlayingId(null));
  }

  function favoriteSong(song: Song) {
    favoriteMutation.mutate({ songId: song.id }, {
      onSuccess: (updatedSong) => {
        queryClient.setQueryData<Song[]>(getListSongsQueryKey(), (current) => current?.map((entry) => entry.id === updatedSong.id ? updatedSong : entry));
        queryClient.invalidateQueries({ queryKey: getGetWorkspaceSummaryQueryKey() });
      },
    });
  }

  function handleRefine(songId: string, data: RefineSongInput) {
    refineMutation.mutate({ songId, data }, {
      onSuccess: () => {
        setRefiningSong(null);
        queryClient.invalidateQueries({ queryKey: getListSongsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetWorkspaceSummaryQueryKey() });
      },
    });
  }

  function handleRemix(songId: string) {
    remixMutation.mutate({ songId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListSongsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetWorkspaceSummaryQueryKey() });
        window.location.hash = 'creations';
      },
    });
  }

  return (
    <section id="creations" className="aion-rise aion-delay-3 mt-12" data-testid="section-creations">
      <div className="flex flex-col justify-between gap-4 border-b border-primary/30 pb-4 sm:flex-row sm:items-end">
        <div>
          <div className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.2em] text-accent neon-text"><Radio className="h-3.5 w-3.5" /> Project Signal History</div>
          <h2 className="font-serif text-[40px] leading-none tracking-[-.04em] sm:text-[48px] text-foreground">Archive <em className="text-secondary neon-text">in nebula.</em></h2>
        </div>
        <button type="button" onClick={() => setShowFavorites((v) => !v)} className={`cyber-button flex items-center gap-2 self-start rounded-full border px-3 py-2 font-mono text-[10px] uppercase tracking-[.12em] transition-all sm:self-auto ${showFavorites ? 'border-primary bg-primary/20 text-primary shadow-[0_0_10px_rgba(0,35,255,0.2)]' : 'border-border text-foreground/40 hover:border-primary hover:text-primary'}`} data-testid="button-filter-favorites">
          <Star className="h-3.5 w-3.5" fill={showFavorites ? 'currentColor' : 'none'} /> {showFavorites ? 'Signals stored' : 'All signals'}
        </button>
      </div>

      {refiningSong && (
        <RefinePanel
          song={refiningSong}
          onCancel={() => setRefiningSong(null)}
          onRefine={(data) => handleRefine(refiningSong.id, data)}
        />
      )}
      {songsQuery.isLoading && <div className="mt-2"><SongSkeleton /><SongSkeleton /><SongSkeleton /></div>}
      {songsQuery.isError && (
        <div className="mt-5 flex flex-col items-center justify-center border border-dashed border-destructive/30 bg-destructive/5 px-5 py-12 text-center" data-testid="state-creations-error">
          <X className="h-7 w-7 text-destructive" />
          <h3 className="mt-4 text-sm font-bold text-foreground">The archive is out of tune.</h3>
          <p className="mt-1 text-xs text-foreground/50">We couldn't load your sessions right now.</p>
          <Button variant="outline" size="sm" onClick={() => songsQuery.refetch()} className="mt-5 border-destructive/30 bg-transparent text-destructive hover:bg-destructive/10" data-testid="button-retry-songs"><RefreshCw className="h-3.5 w-3.5" /> Try again</Button>
        </div>
      )}
      {!songsQuery.isLoading && !songsQuery.isError && visibleSongs.length === 0 && (
        <div className="aion-grid mt-2 flex flex-col items-center justify-center border border-dashed border-border px-5 py-16 text-center" data-testid="state-creations-empty">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-primary bg-primary/10 text-primary shadow-[0_0_15px_rgba(0,35,255,0.3)]"><Music2 className="h-6 w-6" /></div>
          <h3 className="mt-5 font-serif text-2xl text-foreground">{showFavorites ? 'Nothing kept close yet.' : 'The room is waiting.'}</h3>
          <p className="mt-2 max-w-xs text-xs leading-5 text-foreground/50">{showFavorites ? 'Favorite a finished track and it will land here.' : 'Put a feeling into the composer above and your first session will appear here.'}</p>
          {showFavorites && <button type="button" onClick={() => setShowFavorites(false)} className="aion-focus mt-5 font-mono text-[10px] uppercase tracking-[.13em] text-accent" data-testid="button-show-all-creations">Show all creations</button>}
        </div>
      )}
      {!songsQuery.isLoading && !songsQuery.isError && visibleSongs.length > 0 && (
        <div className="relative">
          {visibleSongs.map((song) => <SongRow key={song.id} song={song} onFavorite={favoriteSong} onPlay={playSong} onRefine={setRefiningSong} onRemix={handleRemix} isPlaying={playingId === song.id} />)}
        </div>
      )}
      {favoriteMutation.isError && <p className="mt-3 text-right text-xs text-destructive" data-testid="status-favorite-error">Couldn't update that favorite. Try again.</p>}
    </section>
  );
}

function LatestSong({ song, nebulaRef }: { song: Song; nebulaRef: React.RefObject<NebulaHandle | null> }) {
  const [playing, setPlaying] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();

  async function handleBroadcast() {
    if (!song.audioUrl || !nebulaRef.current) return;
    setIsBroadcasting(true);
    toast({
      title: "Synthesizing Broadcast",
      description: "Nebula is capturing the audio visualizer stream...",
    });

    try {
      const videoBlob = await nebulaRef.current.startBroadcast(song.audioUrl);
      const url = URL.createObjectURL(videoBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${song.title}_Nebula_Broadcast.webm`;
      a.click();
      URL.revokeObjectURL(url);
      toast({
        title: "Broadcast Captured",
        description: "Your video has been saved to your downloads.",
        variant: "default",
      });
    } catch (e) {
      console.error('Broadcast failed', e);
      toast({
        title: "Link Terminated",
        description: "Nebula failed to capture the broadcast. Try again.",
        variant: "destructive",
      });
    } finally {
      setIsBroadcasting(false);
    }
  }

  function togglePlay() {
    if (!song.audioUrl) return;
    if (!audioRef.current) audioRef.current = new Audio(song.audioUrl);
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
      audioRef.current.onended = () => setPlaying(false);
    }
  }
  return (
    <div className="aion-rise aion-delay-2 mt-5 overflow-hidden rounded-[4px] bg-card border border-primary/20 text-foreground shadow-[0_0_20px_rgba(0,35,255,0.1)]" data-testid="card-latest-song">
      <div className="flex items-center gap-4 p-5 sm:p-6">
        <CoverArt song={song} size="large" />
        <div className="min-w-0 flex-1">
          <div className="font-mono text-[9px] uppercase tracking-[.18em] text-accent neon-text">Last signal captured</div>
          <h2 className="mt-2 truncate font-serif text-3xl tracking-[-.03em] sm:text-4xl text-foreground" data-testid="text-latest-title">{song.title || 'Untitled signal'}</h2>
          <p className="mt-1 truncate text-xs text-foreground/50">{song.prompt}</p>
          <div className="mt-4 flex items-center gap-3 font-mono text-[9px] uppercase tracking-[.1em] text-foreground/40"><span>{song.style}</span><span className="text-border">/</span><span>{formatDuration(song.duration)}</span><span className="text-border">/</span><span>{song.bpm} bpm</span></div>
        </div>
        <div className="flex flex-col gap-2">
          <button type="button" onClick={togglePlay} disabled={song.status !== SongStatus.completed || !song.audioUrl} className={`cyber-button flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-all ${playing ? 'bg-accent text-background shadow-[0_0_15px_rgba(0,240,255,0.5)]' : 'bg-primary text-white shadow-[0_0_10px_rgba(0,35,255,0.3)]'} disabled:cursor-not-allowed disabled:opacity-45`} data-testid="button-play-latest" aria-label={`Play latest song ${song.title}`}>
            {playing ? <Pause className="h-5 w-5 fill-current" /> : <Play className="ml-0.5 h-5 w-5 fill-current" />}
          </button>
          <button
            type="button"
            onClick={handleBroadcast}
            disabled={isBroadcasting || song.status !== SongStatus.completed}
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-card transition-all ${isBroadcasting ? 'bg-secondary text-white animate-pulse' : 'text-foreground/40 hover:border-secondary hover:text-secondary'} disabled:opacity-30`}
            title="Broadcast to Video (Nebula MP4)"
          >
            <Video className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="border-t border-border px-5 py-4 sm:px-6"><Waveform active={playing} /></div>
    </div>
  );
}

function Timeline({ projects, onUpdate }: { projects: any[]; onUpdate: (id: string, items: any[]) => void }) {
  return (
    <section id="timeline" className="aion-rise aion-delay-4 mt-12 cyber-card p-6">
      <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.2em] text-accent neon-text mb-4">
        <Activity className="h-3.5 w-3.5" /> Linear Arranger v1.0
      </div>
      <h2 className="font-serif text-3xl mb-6">Nebula <em className="text-secondary">Timeline.</em></h2>

      <div className="relative h-[240px] bg-black/40 border border-border rounded-sm overflow-hidden group">
        {/* Timeline Grid */}
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{
          backgroundImage: 'linear-gradient(to right, #00f0ff 1px, transparent 1px)',
          backgroundSize: '40px 100%'
        }} />

        <div className="absolute inset-0 flex items-center justify-center text-foreground/20 font-mono text-xs uppercase tracking-widest italic group-hover:text-foreground/40 transition-colors">
          Drag signals here to build your arrangement
        </div>
      </div>

      <div className="mt-4 flex justify-between items-center text-[10px] font-mono text-foreground/40 uppercase">
        <span>00:00</span>
        <span>01:00</span>
        <span>02:00</span>
        <span>03:00</span>
        <span>04:00</span>
      </div>
    </section>
  );
}

function Home() {
  const summaryQuery = useGetWorkspaceSummary({ query: { queryKey: getGetWorkspaceSummaryQueryKey(), refetchInterval: 5000 } });
  const healthQuery = useHealthCheck({ query: { queryKey: getHealthCheckQueryKey(), refetchInterval: 30000 } });
  const summary = summaryQuery.data;
  const activeGenerations = summary?.activeGenerations ?? 0;
  const [seedIdea, setSeedIdea] = useState<{ prompt: string; style: string } | undefined>();
  const nebulaRef = useRef<NebulaHandle>(null);

  return (
    <div className="nebula-bg min-h-[100dvh]">
      <div className="flex min-h-[100dvh]">
        <SideRail activeGenerations={activeGenerations} />
        <main className="min-w-0 flex-1">
          <MobileHeader activeGenerations={activeGenerations} />
          <div className="mx-auto max-w-[1420px] px-5 pb-20 pt-7 sm:px-8 lg:px-12 lg:pt-10">
            <header className="aion-rise flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.18em] text-accent neon-text"><span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" /> [SYNC_OK] Signal established</div>
                <p className="mt-2 text-sm text-foreground/60">Autonomous Logic Node v4.2. Ready for synthesis, Ari.</p>
              </div>
              <div className="hidden items-center gap-2 rounded-full border border-border bg-card/40 px-3 py-2 font-mono text-[9px] uppercase tracking-[.12em] text-foreground/60 sm:flex shadow-[0_0_10px_rgba(0,35,255,0.05)]" data-testid="status-health">
                <span className={`h-1.5 w-1.5 rounded-full ${healthQuery.isError ? 'bg-red-500 animate-pulse' : 'bg-green-500 shadow-[0_0_5px_#22c55e]'}`} />
                {healthQuery.isLoading ? 'syncing...' : healthQuery.isError ? 'node offline' : <span className="text-green-500 neon-text">core online</span>}
              </div>
            </header>
            <div className="mt-8"><StatStrip loading={summaryQuery.isLoading} error={summaryQuery.isError} totalSongs={summary?.totalSongs ?? 0} completedSongs={summary?.completedSongs ?? 0} minutesCreated={summary?.minutesCreated ?? 0} favoriteCount={summary?.favoriteCount ?? 0} /></div>
            {summaryQuery.isError && <div className="mt-4 flex items-center gap-2 rounded-[3px] border border-red-500/30 bg-red-500/5 px-3 py-2 text-xs text-red-400" data-testid="status-summary-error"><Info className="h-3.5 w-3.5" /> Core link unstable. Local modules still active.</div>}

            <div className="mt-12"><NebulaCenterpiece ref={nebulaRef} /></div>

            <div className="mt-8"><Composer seedIdea={seedIdea} /></div>
            {summary?.latestSong && <LatestSong song={summary.latestSong} nebulaRef={nebulaRef} />}
            <AIArchitect onSeedIdea={(prompt, style) => setSeedIdea({ prompt, style })} />
            <Timeline projects={[]} onUpdate={() => {}} />
            <NebulaFeed />
            <Creations />
            <footer className="mt-16 flex flex-col justify-between gap-3 border-t border-border pt-5 font-mono text-[9px] uppercase tracking-[.15em] text-foreground/30 sm:flex-row">
              <span>AION Orchestra / neural sync established</span><span>Autonomous instrument logic active</span>
            </footer>
          </div>
        </main>
      </div>
    </div>
  );
}

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/perform" component={StudioPage} />
        <Route path="/perform/library" component={LibraryPage} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;