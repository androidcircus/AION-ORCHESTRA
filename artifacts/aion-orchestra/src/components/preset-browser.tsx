import React from 'react';
import { Button } from './ui/button';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Music, Sliders, Waves, Wind, Sparkles, Headphones, Ghost, Zap, Cloud, Heart } from 'lucide-react';

interface Preset {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  tags: string[];
}

const presets: Preset[] = [
  {
    id: 'tube-warmth',
    name: 'Tube Warmth',
    description: 'Smooth analog harmonics with a soft top end.',
    icon: <Wind className="w-4 h-4" />,
    tags: ['Warm', 'Analog'],
  },
  {
    id: 'tape-crush',
    name: 'Tape Crush',
    description: 'Heavy saturation and grit for that vintage lo-fi feel.',
    icon: <Sliders className="w-4 h-4" />,
    tags: ['Grit', 'Lo-Fi'],
  },
  {
    id: 'wide-air',
    name: 'Wide Air',
    description: 'Expansive stereo width with bright, airy presence.',
    icon: <Waves className="w-4 h-4" />,
    tags: ['Wide', 'Airy'],
  },
  {
    id: 'pumping-space',
    name: 'Pumping Space',
    description: 'Massive reverb with deep sidechain pumping.',
    icon: <Music className="w-4 h-4" />,
    tags: ['Ambient', 'Pumping'],
  },
  {
    id: 'subtle-glow',
    name: 'Subtle Glow',
    description: 'A light, polished saturation for final mastering.',
    icon: <Sparkles className="w-4 h-4" />,
    tags: ['Polished', 'Pro'],
  },
  {
    id: 'lo-fi-hip-hop',
    name: 'Lo-Fi Hip Hop',
    description: 'Dark, dusty character with heavy mid-range focus.',
    icon: <Headphones className="w-4 h-4" />,
    tags: ['Dark', 'Dusty'],
  },
  {
    id: 'cinematic-orchestral',
    name: 'Cinematic Orchestral',
    description: 'Massive hall reverb and ultra-wide spatial depth.',
    icon: <Ghost className="w-4 h-4" />,
    tags: ['Epic', 'Hall'],
  },
  {
    id: 'techno-pulse',
    name: 'Techno Pulse',
    description: 'Hard clipping saturation and aggressive rhythmic pumping.',
    icon: <Zap className="w-4 h-4" />,
    tags: ['Hard', 'Driven'],
  },
  {
    id: 'dream-pop',
    name: 'Dream Pop',
    description: 'Lush chorus-heavy atmosphere with soft clouds of reverb.',
    icon: <Cloud className="w-4 h-4" />,
    tags: ['Lush', 'Ethereal'],
  },
  {
    id: 'vintage-soul',
    name: 'Vintage Soul',
    description: 'Warm mid-saturated mono-compatible vintage tone.',
    icon: <Heart className="w-4 h-4" />,
    tags: ['Classic', 'Soul'],
  },
];

interface PresetBrowserProps {
  onSelect: (presetId: string) => void;
  activePresetId?: string;
}

export function PresetBrowser({ onSelect, activePresetId }: PresetBrowserProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mt-6">
      {presets.map((preset) => (
        <Card
          key={preset.id}
          className={`cyber-card cursor-pointer ${
            activePresetId === preset.id ? 'border-accent bg-accent/10 shadow-[0_0_15px_rgba(0,240,255,0.2)]' : ''
          }`}
          onClick={() => onSelect(preset.id)}
        >
          <CardHeader className="p-4 pb-2">
            <CardTitle className={`text-xs font-bold flex items-center gap-2 uppercase tracking-tighter ${activePresetId === preset.id ? 'text-accent neon-text' : 'text-primary'}`}>
              {preset.icon}
              {preset.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-[10px] leading-tight text-foreground/60 mb-3">{preset.description}</p>
            <div className="flex gap-1 flex-wrap">
              {preset.tags.map(tag => (
                <span key={tag} className="text-[8px] px-1.5 py-0.5 rounded-sm bg-secondary/20 text-secondary border border-secondary/30 uppercase font-mono">
                  {tag}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
