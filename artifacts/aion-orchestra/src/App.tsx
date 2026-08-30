import { type FormEvent, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  ArrowUpRight,
  AudioLines,
  Check,
  ChevronDown,
  CircleHelp,
  Clock3,
  Disc3,
  FileAudio,
  Heart,
  Info,
  Layers3,
  Menu,
  Music2,
  Pause,
  Play,
  Plus,
  Radio,
  RefreshCw,
  RotateCw,
  SlidersHorizontal,
  Sparkles,
  Star,
  WandSparkles,
  X,
} from 'lucide-react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import {
  GenerateSongInputModel,
  SongStatus,
  type GenerateSongInput,
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
} from '@workspace/api-client-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';

const queryClient = new QueryClient();

const STYLE_PRESETS = ['Alt R&B', 'Lo-fi house', 'Cinematic pop', 'Indie electronica', 'Ambient jazz'];
const MODEL_OPTIONS = [
  { value: GenerateSongInputModel.AION_Demo_Engine, note: 'Fast ideation' },
  { value: GenerateSongInputModel['ACE-Step_15'], note: 'Detailed texture' },
  { value: GenerateSongInputModel.YuE, note: 'Vocal-forward' },
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

function StatusPill({ song }: { song: Song }) {
  const labels: Record<string, string> = {
    queued: 'In queue',
    generating: song.stage || 'Generating',
    completed: 'Ready to play',
    failed: 'Could not finish',
  };
  const statusClass: Record<string, string> = {
    queued: 'border-[#e4bd67] bg-[#fff3cf] text-[#815e10]',
    generating: 'border-[#8ea0fb] bg-[#e9edff] text-[#324ab0]',
    completed: 'border-[#87d1bf] bg-[#e4faf2] text-[#147263]',
    failed: 'border-[#ec9b8c] bg-[#fff0ed] text-[#a23e2b]',
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
  const hue = Number.isFinite(song.coverHue) ? song.coverHue : 18;
  return (
    <div
      className={`relative isolate shrink-0 overflow-hidden rounded-[3px] border border-[#1b1f29]/15 bg-[#24364d] ${size === 'large' ? 'h-28 w-28 sm:h-36 sm:w-36' : 'h-16 w-16'}`}
      style={{ background: `linear-gradient(145deg, hsl(${hue} 82% 65%), hsl(${(hue + 86) % 360} 64% 28%))` }}
      aria-label={`${song.title} cover art`}
      data-testid={`img-cover-${song.id}`}
    >
      <div className="absolute -right-5 -top-5 h-24 w-24 rounded-full border-[12px] border-[#f6d67c]/55" />
      <div className="absolute -bottom-8 -left-4 h-24 w-24 rounded-full border-[9px] border-[#162031]/50" />
      <div className="absolute inset-x-2 bottom-2 flex items-end gap-[3px] opacity-80">
        {[.42, .76, .3, .9, .58, .34, .66, .48, .82, .27].map((height, index) => (
          <span key={index} className="w-[3px] rounded-full bg-[#f8f4eb]" style={{ height: `${height * (size === 'large' ? 30 : 18)}px` }} />
        ))}
      </div>
      <span className="absolute left-2 top-2 font-mono text-[8px] font-bold tracking-[.08em] text-[#f8f4eb]/90">
        A/{String(hue).padStart(3, '0')}
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
            className={`wave-bar min-w-[2px] flex-1 rounded-full ${active ? 'bg-[#ff8468]' : 'bg-[#2b59ff]/50'}`}
            style={{ height: `${Math.max(14, wave * (compact ? 25 : 54))}%`, animationDelay: `${-(index % 7) * .14}s` }}
          />
        );
      })}
    </div>
  );
}

function SideRail({ activeGenerations }: { activeGenerations: number }) {
  return (
    <aside className="hidden min-h-[100dvh] w-[250px] shrink-0 flex-col bg-[#1b1f29] text-[#f4f1ea] lg:flex">
      <div className="flex items-center gap-3 border-b border-[#f4f1ea]/10 px-7 py-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#ff8468] text-[#1b1f29]">
          <AudioLines className="h-5 w-5" strokeWidth={2.5} />
        </div>
        <div>
          <div className="font-mono text-[13px] font-bold tracking-[.2em]">AION</div>
          <div className="mt-0.5 font-mono text-[8px] uppercase tracking-[.22em] text-[#f4f1ea]/45">Orchestra / 01</div>
        </div>
      </div>
      <div className="px-4 pt-8">
        <p className="px-3 font-mono text-[9px] uppercase tracking-[.2em] text-[#f4f1ea]/35">Workspace</p>
        <nav className="mt-3 space-y-1" aria-label="Primary navigation">
          <a href="#compose" className="aion-focus flex items-center gap-3 rounded-md bg-[#f4f1ea]/10 px-3 py-3 text-sm font-semibold text-[#f4f1ea]" data-testid="link-compose">
            <WandSparkles className="h-4 w-4 text-[#ff8468]" />
            Compose
            <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#ff8468]" />
          </a>
          <a href="#creations" className="aion-focus flex items-center gap-3 rounded-md px-3 py-3 text-sm text-[#f4f1ea]/65 transition-colors hover:bg-[#f4f1ea]/8 hover:text-[#f4f1ea]" data-testid="link-creations">
            <Disc3 className="h-4 w-4" />
            Creations
          </a>
          <a href="#signal" className="aion-focus flex items-center gap-3 rounded-md px-3 py-3 text-sm text-[#f4f1ea]/65 transition-colors hover:bg-[#f4f1ea]/8 hover:text-[#f4f1ea]" data-testid="link-signal">
            <Activity className="h-4 w-4" />
            Studio signal
            {activeGenerations > 0 && <span className="ml-auto rounded-full bg-[#2b59ff] px-1.5 py-0.5 font-mono text-[9px] text-white">{activeGenerations}</span>}
          </a>
        </nav>
      </div>
      <div className="mt-auto border-t border-[#f4f1ea]/10 px-7 py-6">
        <div className="flex items-center gap-2 text-[#f4f1ea]/50">
          <CircleHelp className="h-4 w-4" />
          <span className="text-xs">Need a hand?</span>
          <span className="ml-auto font-mono text-[9px]">⌘ /</span>
        </div>
        <div className="mt-5 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2b59ff] font-mono text-[11px] font-bold">AK</div>
          <div>
            <div className="text-xs font-semibold">Ari Kim</div>
            <div className="font-mono text-[9px] text-[#f4f1ea]/40">Producer seat</div>
          </div>
          <ChevronDown className="ml-auto h-4 w-4 text-[#f4f1ea]/40" />
        </div>
      </div>
    </aside>
  );
}

function MobileHeader({ activeGenerations }: { activeGenerations: number }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <header className="relative flex items-center justify-between border-b border-[#d5d0c5] bg-[#f4f1ea] px-5 py-4 lg:hidden">
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#ff8468] text-[#1b1f29]"><AudioLines className="h-4 w-4" /></div>
        <span className="font-mono text-[12px] font-bold tracking-[.18em]">AION / ORCHESTRA</span>
      </div>
      <div className="flex items-center gap-3">
        {activeGenerations > 0 && <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-wider text-[#2b59ff]"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#2b59ff]" /> {activeGenerations} live</span>}
        <button onClick={() => setIsOpen((value) => !value)} className="aion-focus rounded-md p-1.5" data-testid="button-mobile-menu" aria-label={isOpen ? 'Close menu' : 'Open menu'} aria-expanded={isOpen}><Menu className="h-5 w-5" /></button>
      </div>
      {isOpen && (
        <nav className="aion-shadow-sm absolute inset-x-5 top-[calc(100%-1px)] z-20 rounded-b-[3px] border border-t-0 border-[#d5d0c5] bg-[#fbfaf6] p-2" aria-label="Mobile navigation" data-testid="nav-mobile">
          <a href="#compose" onClick={() => setIsOpen(false)} className="flex items-center gap-3 px-3 py-3 text-xs font-semibold" data-testid="link-mobile-compose"><WandSparkles className="h-4 w-4 text-[#ff6542]" /> Compose</a>
          <a href="#creations" onClick={() => setIsOpen(false)} className="flex items-center gap-3 px-3 py-3 text-xs font-semibold" data-testid="link-mobile-creations"><Disc3 className="h-4 w-4 text-[#2b59ff]" /> Creations</a>
          <a href="#signal" onClick={() => setIsOpen(false)} className="flex items-center gap-3 px-3 py-3 text-xs font-semibold" data-testid="link-mobile-signal"><Activity className="h-4 w-4 text-[#2b59ff]" /> Studio signal</a>
        </nav>
      )}
    </header>
  );
}

function StatStrip({ totalSongs, completedSongs, minutesCreated, favoriteCount, loading }: { totalSongs: number; completedSongs: number; minutesCreated: number; favoriteCount: number; loading: boolean }) {
  const stats = [
    { label: 'Tracks in the room', value: totalSongs.toString().padStart(2, '0'), icon: Layers3 },
    { label: 'Playable cuts', value: completedSongs.toString().padStart(2, '0'), icon: FileAudio },
    { label: 'Minutes made', value: minutesCreated.toFixed(1), icon: Clock3 },
    { label: 'Kept close', value: favoriteCount.toString().padStart(2, '0'), icon: Heart },
  ];
  return (
    <section id="signal" className="grid grid-cols-2 border-y border-[#d5d0c5] sm:grid-cols-4" data-testid="section-stats">
      {stats.map(({ label, value, icon: Icon }, index) => (
        <div key={label} className={`group flex items-center gap-3 px-4 py-4 sm:px-5 ${index < stats.length - 1 ? 'border-r border-[#d5d0c5]' : ''}`}>
          <Icon className="h-4 w-4 text-[#2b59ff] transition-transform duration-300 group-hover:scale-110" />
          <div>
            {loading ? <Skeleton className="h-5 w-10 bg-[#e1ddd4]" data-testid={`skeleton-stat-${index}`} /> : <div className="font-mono text-[18px] font-bold leading-none tracking-[-.06em]" data-testid={`text-stat-${index}`}>{value}</div>}
            <div className="mt-1 text-[10px] uppercase tracking-[.09em] text-[#68707d]">{label}</div>
          </div>
        </div>
      ))}
    </section>
  );
}

function Composer() {
  const queryClient = useQueryClient();
  const [prompt, setPrompt] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [style, setStyle] = useState('Alt R&B');
  const [duration, setDuration] = useState('120');
  const [energy, setEnergy] = useState(68);
  const [instrumental, setInstrumental] = useState(false);
  const [model, setModel] = useState<GenerateSongInput['model']>(GenerateSongInputModel.AION_Demo_Engine);
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
    <section id="compose" className="aion-rise aion-delay-1 relative overflow-hidden rounded-[5px] border border-[#d5d0c5] bg-[#fbfaf6] aion-shadow" data-testid="section-composer">
      <div className="absolute right-0 top-0 hidden h-full w-[38%] bg-[#e7efff] opacity-50 lg:block" style={{ clipPath: 'polygon(28% 0, 100% 0, 100% 100%, 0 100%)' }} />
      <div className="relative grid lg:grid-cols-[1.05fr_.95fr]">
        <div className="aion-grid border-b border-[#d5d0c5] p-5 sm:p-8 lg:border-b-0 lg:border-r lg:p-10">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.2em] text-[#68707d]"><span className="h-2 w-2 rounded-full bg-[#ff8468]" /> Input channel 01</span>
            <span className="font-mono text-[10px] text-[#9ba0a8]">AION / 001</span>
          </div>
          <h1 className="mt-10 max-w-[500px] font-serif text-[52px] leading-[.86] tracking-[-.055em] text-[#1b1f29] sm:text-[74px]">
            Put the idea<br /><em>in motion.</em>
          </h1>
          <p className="mt-7 max-w-[370px] text-sm leading-6 text-[#68707d]">Describe the feeling, the scene, or the hook. AION turns a clear signal into something you can play.</p>
          <div className="mt-12 hidden items-center gap-4 lg:flex">
            <div className="h-px w-12 bg-[#ff8468]" />
            <span className="font-mono text-[9px] uppercase tracking-[.2em] text-[#9ba0a8]">A focused music lab for unfinished thoughts</span>
          </div>
        </div>
        <form className="relative p-5 sm:p-8 lg:p-10" onSubmit={handleSubmit} data-testid="form-generate-song">
          <div className="flex items-center justify-between">
            <label htmlFor="song-prompt" className="font-mono text-[10px] font-bold uppercase tracking-[.16em] text-[#1b1f29]">Start with a signal</label>
            <span className="font-mono text-[10px] text-[#9ba0a8]">required</span>
          </div>
          <textarea
            id="song-prompt"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="A late-night groove for driving through a city after rain..."
            className="aion-focus mt-3 min-h-[130px] w-full resize-none rounded-[3px] border border-[#bcb8af] bg-[#fffefb] px-4 py-4 text-[15px] leading-6 text-[#1b1f29] placeholder:text-[#9ba0a8] focus:border-[#ff8468] focus:outline-none focus:ring-2 focus:ring-[#ff8468]/15"
            data-testid="input-song-prompt"
          />
          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between">
              <label className="font-mono text-[10px] font-bold uppercase tracking-[.16em]">Shape the sound</label>
              <span className="font-mono text-[10px] text-[#9ba0a8]">style / genre</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {STYLE_PRESETS.map((preset) => (
                <button type="button" key={preset} onClick={() => setStyle(preset)} className={`aion-focus rounded-full border px-3 py-2 text-[11px] transition-all ${style === preset ? 'border-[#1b1f29] bg-[#1b1f29] text-[#fbfaf6]' : 'border-[#cbc7bd] bg-[#fbfaf6] text-[#68707d] hover:border-[#1b1f29] hover:text-[#1b1f29]'}`} data-testid={`button-style-${preset.toLowerCase().replaceAll(' ', '-')}`}>{style === preset && <Check className="mr-1 inline h-3 w-3" />}{preset}</button>
              ))}
              <input value={STYLE_PRESETS.includes(style) ? '' : style} onChange={(event) => setStyle(event.target.value)} placeholder="other..." className="aion-focus min-w-[85px] rounded-full border border-dashed border-[#bcb8af] bg-transparent px-3 py-2 text-[11px] outline-none placeholder:text-[#9ba0a8]" data-testid="input-custom-style" />
            </div>
          </div>
          <div className="mt-6 grid grid-cols-[1fr_auto] items-end gap-5">
            <div>
              <label htmlFor="song-duration" className="mb-2 block font-mono text-[10px] font-bold uppercase tracking-[.16em]">Length</label>
              <div className="flex items-center border-b border-[#bcb8af] pb-2">
                <input id="song-duration" type="range" min="15" max="240" step="15" value={duration} onChange={(event) => setDuration(event.target.value)} className="h-1 w-full cursor-pointer accent-[#ff8468]" data-testid="input-song-duration" />
                <span className="ml-3 w-10 font-mono text-xs font-bold" data-testid="text-song-duration">{formatDuration(Number(duration))}</span>
              </div>
            </div>
            <button type="button" onClick={() => setInstrumental((value) => !value)} className={`aion-focus flex items-center gap-2 pb-2 text-[11px] ${instrumental ? 'text-[#2b59ff]' : 'text-[#68707d]'}`} data-testid="button-toggle-instrumental">
              <span className={`flex h-5 w-9 items-center rounded-full p-0.5 transition-colors ${instrumental ? 'bg-[#2b59ff]' : 'bg-[#c9c5bb]'}`}><span className={`h-4 w-4 rounded-full bg-[#fbfaf6] transition-transform ${instrumental ? 'translate-x-4' : ''}`} /></span>
              instrumental
            </button>
          </div>
          <button type="button" onClick={() => setIsLyricsOpen((value) => !value)} className="aion-focus mt-6 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.13em] text-[#2b59ff]" data-testid="button-toggle-lyrics">
            <Plus className={`h-3.5 w-3.5 transition-transform ${isLyricsOpen ? 'rotate-45' : ''}`} /> {isLyricsOpen ? 'Close lyric sheet' : 'Add optional lyrics'}
          </button>
          {isLyricsOpen && (
            <textarea value={lyrics} onChange={(event) => setLyrics(event.target.value)} placeholder="Drop in a hook, a verse, or a few words to steer the vocal..." className="aion-focus mt-3 min-h-[86px] w-full resize-y rounded-[3px] border border-[#bcb8af] bg-[#fffefb] px-3 py-3 text-xs leading-5 outline-none focus:border-[#2b59ff]" data-testid="input-song-lyrics" />
          )}
          <div className="mt-7 border-t border-[#e1ddd4] pt-5">
            <div className="flex items-center justify-between">
              <label htmlFor="energy" className="font-mono text-[10px] font-bold uppercase tracking-[.16em]">Energy</label>
              <span className="font-mono text-[11px] font-bold text-[#ff6542]" data-testid="text-energy">{energy}<span className="ml-0.5 text-[#9ba0a8]">/ 100</span></span>
            </div>
            <input id="energy" type="range" min="0" max="100" value={energy} onChange={(event) => setEnergy(Number(event.target.value))} className="mt-3 h-1 w-full cursor-pointer accent-[#ff8468]" data-testid="input-energy" />
          </div>
          <div className="mt-6 flex items-center gap-2">
            <SlidersHorizontal className="h-3.5 w-3.5 text-[#9ba0a8]" />
            <select value={model} onChange={(event) => setModel(event.target.value as GenerateSongInput['model'])} className="aion-focus w-full bg-transparent font-mono text-[10px] uppercase tracking-[.11em] text-[#68707d] outline-none" data-testid="select-model">
              {MODEL_OPTIONS.map((option) => <option value={option.value} key={option.value}>{option.value} — {option.note}</option>)}
            </select>
          </div>
          {notice && <div className={`mt-5 flex items-start gap-2 rounded-[3px] border px-3 py-2.5 text-xs ${notice.includes('could not') || notice.includes('stopped') ? 'border-[#ec9b8c] bg-[#fff0ed] text-[#a23e2b]' : 'border-[#b9ddd2] bg-[#e8f8f2] text-[#147263]'}`} data-testid="status-generation-notice"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />{notice}</div>}
          <button type="submit" disabled={isGenerating} className="aion-sheen aion-focus mt-6 flex w-full items-center justify-center gap-3 rounded-[3px] bg-[#ff8468] px-5 py-4 text-sm font-bold text-[#1b1f29] transition-transform hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-70" data-testid="button-generate-song">
            {isGenerating ? <><RotateCw className="h-4 w-4 animate-spin" /> {progressSong?.stage || 'Opening the session...'}</> : <><Sparkles className="h-4 w-4" /> Generate a track <ArrowUpRight className="h-4 w-4" /></>}
          </button>
        </form>
      </div>
      {isGenerating && (
        <div className="relative flex items-center gap-4 border-t border-[#d5d0c5] bg-[#f0f4ff] px-5 py-3.5 sm:px-10" data-testid="status-active-generation">
          <div className="flex items-center gap-1">{Array.from({ length: 7 }).map((_, index) => <span key={index} className="wave-bar w-1 rounded-full bg-[#2b59ff]" style={{ height: `${8 + (index % 4) * 4}px`, animationDelay: `${-index * .12}s` }} />)}</div>
          <div className="flex-1 text-xs text-[#324ab0]"><strong className="font-semibold">Rendering your idea.</strong> {progressSong?.stage || 'Finding the first downbeat'}.</div>
          {progressSong?.progress !== undefined && <span className="font-mono text-[11px] font-bold text-[#324ab0]">{progressSong.progress}%</span>}
        </div>
      )}
    </section>
  );
}

function SongRow({ song, onFavorite, onPlay, isPlaying }: { song: Song; onFavorite: (song: Song) => void; onPlay: (song: Song) => void; isPlaying: boolean }) {
  return (
    <article className="group grid items-center gap-4 border-b border-[#d5d0c5] py-4 transition-colors hover:bg-[#f8f6f0] sm:grid-cols-[auto_1fr_auto] sm:px-3" data-testid={`card-song-${song.id}`}>
      <div className="flex items-center gap-3">
        <CoverArt song={song} />
        <button type="button" disabled={song.status !== SongStatus.completed || !song.audioUrl} onClick={() => onPlay(song)} className="aion-focus flex h-9 w-9 items-center justify-center rounded-full border border-[#d5d0c5] bg-[#fbfaf6] text-[#1b1f29] transition-all hover:border-[#ff8468] hover:bg-[#ff8468] disabled:cursor-not-allowed disabled:opacity-35 sm:hidden" data-testid={`button-play-${song.id}`} aria-label={`Play ${song.title}`}>
          {isPlaying ? <Pause className="h-3.5 w-3.5 fill-current" /> : <Play className="ml-0.5 h-3.5 w-3.5 fill-current" />}
        </button>
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate text-sm font-bold tracking-[-.02em]" data-testid={`text-song-title-${song.id}`}>{song.title || 'Untitled signal'}</h3>
          <StatusPill song={song} />
        </div>
        <p className="mt-1 truncate text-xs text-[#68707d]">{song.prompt}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2 font-mono text-[9px] uppercase tracking-[.1em] text-[#9ba0a8]">
          <span>{song.style}</span><span className="text-[#d5d0c5]">/</span><span>{song.bpm || '—'} BPM</span><span className="text-[#d5d0c5]">/</span><span>{song.musicalKey || '—'}</span><span className="text-[#d5d0c5]">/</span><span>{formatRelativeDate(song.createdAt)}</span>
        </div>
        {(song.status === SongStatus.generating || song.status === SongStatus.queued) && <div className="mt-3 h-1 max-w-[270px] overflow-hidden rounded-full bg-[#e1e6f8]"><div className="h-full rounded-full bg-[#2b59ff] transition-[width] duration-700" style={{ width: `${song.progress || 4}%` }} /></div>}
      </div>
      <div className="hidden items-center gap-2 sm:flex">
        <button type="button" disabled={song.status !== SongStatus.completed || !song.audioUrl} onClick={() => onPlay(song)} className="aion-focus flex h-9 w-9 items-center justify-center rounded-full border border-[#d5d0c5] bg-[#fbfaf6] text-[#1b1f29] transition-all hover:border-[#ff8468] hover:bg-[#ff8468] disabled:cursor-not-allowed disabled:opacity-35" data-testid={`button-play-${song.id}`} aria-label={`Play ${song.title}`}>
          {isPlaying ? <Pause className="h-3.5 w-3.5 fill-current" /> : <Play className="ml-0.5 h-3.5 w-3.5 fill-current" />}
        </button>
        <button type="button" onClick={() => onFavorite(song)} className={`aion-focus flex h-9 w-9 items-center justify-center rounded-full border transition-colors ${song.isFavorite ? 'border-[#ff8468] bg-[#fff0eb] text-[#ff6542]' : 'border-[#d5d0c5] bg-[#fbfaf6] text-[#9ba0a8] hover:border-[#ff8468] hover:text-[#ff6542]'}`} data-testid={`button-favorite-${song.id}`} aria-label={`${song.isFavorite ? 'Remove' : 'Add'} ${song.title} ${song.isFavorite ? 'from favorites' : 'to favorites'}`}>
          <Heart className="h-4 w-4" fill={song.isFavorite ? 'currentColor' : 'none'} />
        </button>
      </div>
      <button type="button" onClick={() => onFavorite(song)} className={`aion-focus absolute right-2 top-4 sm:hidden ${song.isFavorite ? 'text-[#ff6542]' : 'text-[#9ba0a8]'}`} data-testid={`button-favorite-mobile-${song.id}`} aria-label={`${song.isFavorite ? 'Remove' : 'Add'} favorite`}>
        <Heart className="h-4 w-4" fill={song.isFavorite ? 'currentColor' : 'none'} />
      </button>
    </article>
  );
}

function SongSkeleton() {
  return (
    <div className="flex items-center gap-4 border-b border-[#d5d0c5] py-4">
      <Skeleton className="h-16 w-16 shrink-0 bg-[#e4e0d7]" />
      <div className="flex-1 space-y-2"><Skeleton className="h-4 w-44 bg-[#e4e0d7]" /><Skeleton className="h-3 w-72 max-w-full bg-[#e4e0d7]" /><Skeleton className="h-2 w-36 bg-[#e4e0d7]" /></div>
      <Skeleton className="hidden h-9 w-20 bg-[#e4e0d7] sm:block" />
    </div>
  );
}

function Creations() {
  const queryClient = useQueryClient();
  const songsQuery = useListSongs({ query: { queryKey: getListSongsQueryKey(), refetchInterval: 5000 } });
  const favoriteMutation = useToggleSongFavorite();
  const songs = useMemo(() => songsQuery.data ?? [], [songsQuery.data]);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [showFavorites, setShowFavorites] = useState(false);
  const visibleSongs = showFavorites ? songs.filter((song) => song.isFavorite) : songs;

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

  return (
    <section id="creations" className="aion-rise aion-delay-3 mt-12" data-testid="section-creations">
      <div className="flex flex-col justify-between gap-4 border-b border-[#1b1f29] pb-4 sm:flex-row sm:items-end">
        <div>
          <div className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.2em] text-[#68707d]"><Radio className="h-3.5 w-3.5 text-[#ff6542]" /> Your recent sessions</div>
          <h2 className="font-serif text-[40px] leading-none tracking-[-.04em] sm:text-[48px]">Creations <em className="text-[#2b59ff]">in orbit.</em></h2>
        </div>
        <button type="button" onClick={() => setShowFavorites((value) => !value)} className={`aion-focus flex items-center gap-2 self-start rounded-full border px-3 py-2 font-mono text-[10px] uppercase tracking-[.12em] transition-colors sm:self-auto ${showFavorites ? 'border-[#ff8468] bg-[#fff0eb] text-[#b84d36]' : 'border-[#d5d0c5] text-[#68707d] hover:border-[#1b1f29] hover:text-[#1b1f29]'}`} data-testid="button-filter-favorites">
          <Star className="h-3.5 w-3.5" fill={showFavorites ? 'currentColor' : 'none'} /> {showFavorites ? 'Showing favorites' : 'Favorites only'}
        </button>
      </div>
      {songsQuery.isLoading && <div className="mt-2"><SongSkeleton /><SongSkeleton /><SongSkeleton /></div>}
      {songsQuery.isError && (
        <div className="mt-5 flex flex-col items-center justify-center border border-dashed border-[#ec9b8c] bg-[#fff6f3] px-5 py-12 text-center" data-testid="state-creations-error">
          <X className="h-7 w-7 text-[#d35c45]" />
          <h3 className="mt-4 text-sm font-bold">The archive is out of tune.</h3>
          <p className="mt-1 text-xs text-[#68707d]">We couldn't load your sessions right now.</p>
          <Button variant="outline" size="sm" onClick={() => songsQuery.refetch()} className="mt-5 border-[#ec9b8c] bg-transparent" data-testid="button-retry-songs"><RefreshCw className="h-3.5 w-3.5" /> Try again</Button>
        </div>
      )}
      {!songsQuery.isLoading && !songsQuery.isError && visibleSongs.length === 0 && (
        <div className="aion-grid mt-2 flex flex-col items-center justify-center border border-dashed border-[#bcb8af] px-5 py-16 text-center" data-testid="state-creations-empty">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[#ff8468] bg-[#fff0eb] text-[#ff6542]"><Music2 className="h-6 w-6" /></div>
          <h3 className="mt-5 font-serif text-2xl">{showFavorites ? 'Nothing kept close yet.' : 'The room is waiting.'}</h3>
          <p className="mt-2 max-w-xs text-xs leading-5 text-[#68707d]">{showFavorites ? 'Favorite a finished track and it will land here.' : 'Put a feeling into the composer above and your first session will appear here.'}</p>
          {showFavorites && <button type="button" onClick={() => setShowFavorites(false)} className="aion-focus mt-5 font-mono text-[10px] uppercase tracking-[.13em] text-[#2b59ff]" data-testid="button-show-all-creations">Show all creations</button>}
        </div>
      )}
      {!songsQuery.isLoading && !songsQuery.isError && visibleSongs.length > 0 && (
        <div className="relative">
          {visibleSongs.map((song) => <SongRow key={song.id} song={song} onFavorite={favoriteSong} onPlay={playSong} isPlaying={playingId === song.id} />)}
        </div>
      )}
      {favoriteMutation.isError && <p className="mt-3 text-right text-xs text-[#a23e2b]" data-testid="status-favorite-error">Couldn't update that favorite. Try again.</p>}
    </section>
  );
}

function LatestSong({ song }: { song: Song }) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
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
    <div className="aion-rise aion-delay-2 mt-5 overflow-hidden rounded-[4px] bg-[#1b1f29] text-[#f4f1ea] aion-shadow" data-testid="card-latest-song">
      <div className="flex items-center gap-4 p-5 sm:p-6">
        <CoverArt song={song} size="large" />
        <div className="min-w-0 flex-1">
          <div className="font-mono text-[9px] uppercase tracking-[.18em] text-[#ff8468]">Last signal captured</div>
          <h2 className="mt-2 truncate font-serif text-3xl tracking-[-.03em] sm:text-4xl" data-testid="text-latest-title">{song.title || 'Untitled signal'}</h2>
          <p className="mt-1 truncate text-xs text-[#f4f1ea]/55">{song.prompt}</p>
          <div className="mt-4 flex items-center gap-3 font-mono text-[9px] uppercase tracking-[.1em] text-[#f4f1ea]/45"><span>{song.style}</span><span className="text-[#f4f1ea]/20">/</span><span>{formatDuration(song.duration)}</span><span className="text-[#f4f1ea]/20">/</span><span>{song.bpm} bpm</span></div>
        </div>
        <button type="button" onClick={togglePlay} disabled={song.status !== SongStatus.completed || !song.audioUrl} className="aion-focus flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#ff8468] text-[#1b1f29] transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:opacity-45" data-testid="button-play-latest" aria-label={`Play latest song ${song.title}`}>
          {playing ? <Pause className="h-5 w-5 fill-current" /> : <Play className="ml-0.5 h-5 w-5 fill-current" />}
        </button>
      </div>
      <div className="border-t border-[#f4f1ea]/10 px-5 py-4 sm:px-6"><Waveform active={playing} /></div>
    </div>
  );
}

function Home() {
  const summaryQuery = useGetWorkspaceSummary({ query: { queryKey: getGetWorkspaceSummaryQueryKey(), refetchInterval: 5000 } });
  const healthQuery = useHealthCheck({ query: { queryKey: getHealthCheckQueryKey(), refetchInterval: 30000 } });
  const summary = summaryQuery.data;
  const activeGenerations = summary?.activeGenerations ?? 0;

  return (
    <div className="aion-noise min-h-[100dvh] bg-[#f4f1ea] text-[#1b1f29]">
      <div className="flex min-h-[100dvh]">
        <SideRail activeGenerations={activeGenerations} />
        <main className="min-w-0 flex-1">
          <MobileHeader activeGenerations={activeGenerations} />
          <div className="mx-auto max-w-[1420px] px-5 pb-20 pt-7 sm:px-8 lg:px-12 lg:pt-10">
            <header className="aion-rise flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.18em] text-[#68707d]"><span className="h-1.5 w-1.5 rounded-full bg-[#2b59ff]" /> Thursday, studio time</div>
                <p className="mt-2 text-sm text-[#68707d]">Good to see you, Ari. What are we hearing today?</p>
              </div>
              <div className="hidden items-center gap-2 rounded-full border border-[#d5d0c5] px-3 py-2 font-mono text-[9px] uppercase tracking-[.12em] text-[#68707d] sm:flex" data-testid="status-health">
                <span className={`h-1.5 w-1.5 rounded-full ${healthQuery.isError ? 'bg-[#d35c45]' : 'bg-[#2aa485]'}`} />
                {healthQuery.isLoading ? 'checking engine' : healthQuery.isError ? 'engine offline' : 'engine online'}
              </div>
            </header>
            <div className="mt-8"><StatStrip loading={summaryQuery.isLoading} totalSongs={summary?.totalSongs ?? 0} completedSongs={summary?.completedSongs ?? 0} minutesCreated={summary?.minutesCreated ?? 0} favoriteCount={summary?.favoriteCount ?? 0} /></div>
            {summaryQuery.isError && <div className="mt-4 flex items-center gap-2 rounded-[3px] border border-[#ec9b8c] bg-[#fff0ed] px-3 py-2 text-xs text-[#a23e2b]" data-testid="status-summary-error"><Info className="h-3.5 w-3.5" /> Summary is taking a moment. Your composer is still ready.</div>}
            <div className="mt-8"><Composer /></div>
            {summary?.latestSong && <LatestSong song={summary.latestSong} />}
            <Creations />
            <footer className="mt-16 flex flex-col justify-between gap-3 border-t border-[#d5d0c5] pt-5 font-mono text-[9px] uppercase tracking-[.15em] text-[#9ba0a8] sm:flex-row">
              <span>AION Orchestra / signal over noise</span><span>Model availability can change with the session</span>
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