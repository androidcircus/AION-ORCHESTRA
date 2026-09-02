import React from 'react';
import { useListPublicFeed, useRemixSong, getListSongsQueryKey, getGetWorkspaceSummaryQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { RefreshCw, Play, RotateCcw, Radio, Heart } from 'lucide-react';
import { Skeleton } from './ui/skeleton';

export function NebulaFeed() {
  const queryClient = useQueryClient();
  const feedQuery = useListPublicFeed({ query: { refetchInterval: 10000 } });
  const remixMutation = useRemixSong();
  const [playingId, setPlayingId] = React.useState<string | null>(null);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  const handlePlay = (song: any) => {
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
  };

  const handleRemix = (songId: string) => {
    remixMutation.mutate({ songId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListSongsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetWorkspaceSummaryQueryKey() });
        window.location.hash = 'compose'; // Scroll to composer
      }
    });
  };

  if (feedQuery.isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-[200px] w-full bg-white/5 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <section id="feed" className="aion-rise aion-delay-4 mt-20">
      <div className="flex items-center justify-between border-b border-primary/20 pb-4 mb-8">
        <div>
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.2em] text-accent neon-text">
            <Radio className="h-3.5 w-3.5" /> Public Signal Stream
          </div>
          <h2 className="font-serif text-4xl mt-1">Nebula <em className="text-primary">Feed.</em></h2>
        </div>
        <Button variant="ghost" size="sm" onClick={() => feedQuery.refetch()} className="text-foreground/40 hover:text-accent">
          <RefreshCw className={`h-4 w-4 mr-2 ${feedQuery.isFetching ? 'animate-spin' : ''}`} /> Sync Feed
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {feedQuery.data?.map((song) => (
          <Card key={song.id} className="cyber-card group overflow-hidden border-primary/10 hover:border-accent/40 bg-black/40">
            <div
              className="h-2 w-full"
              style={{ background: `linear-gradient(90deg, hsl(${song.coverHue} 82% 50%), transparent)` }}
            />
            <CardHeader className="p-5 pb-2">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg font-serif tracking-tight truncate flex-1">
                  {song.title}
                </CardTitle>
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-foreground/40 uppercase">
                  <Heart className={`h-3 w-3 ${song.isFavorite ? 'fill-secondary text-secondary' : ''}`} />
                  {Math.floor(Math.random() * 50) + 1}
                </div>
              </div>
              <p className="text-[10px] font-mono text-secondary uppercase tracking-wider">{song.style} / {song.bpm} BPM</p>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <p className="text-xs text-foreground/60 italic mb-4 line-clamp-2">"{song.prompt}"</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handlePlay(song)}
                  className={`flex-1 cyber-button h-8 text-[10px] rounded-md flex items-center justify-center transition-all ${playingId === song.id ? 'bg-accent text-background shadow-[0_0_10px_rgba(0,240,255,0.5)]' : 'bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30'}`}
                >
                  {playingId === song.id ? <Pause className="h-3 w-3 mr-1.5 fill-current" /> : <Play className="h-3 w-3 mr-1.5 fill-current" />}
                  {playingId === song.id ? 'Stop' : 'Preview'}
                </button>
                <Button
                  size="sm"
                  onClick={() => handleRemix(song.id)}
                  disabled={remixMutation.isPending}
                  className="flex-1 cyber-button cyber-button-primary h-8 text-[10px] bg-accent/20 border-accent/40 text-accent"
                >
                  <RotateCcw className={`h-3 w-3 mr-1.5 ${remixMutation.isPending ? 'animate-spin' : ''}`} /> Remix
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
