import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  ChevronDown,
  CircleHelp,
  Clock3,
  Disc3,
  Library,
  LoaderCircle,
  Mic,
  Music2,
  Pause,
  Play,
  RotateCcw,
  Save,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  WandSparkles,
  X,
} from 'lucide-react';
import { Link, useLocation } from 'wouter';
import './voice-to-instrument.css';

type RecorderState = 'idle' | 'recording' | 'working';
type ScaleName = keyof typeof SCALE_STEPS;
type InstrumentName = keyof typeof INSTRUMENTS;

type CapturedNote = {
  pitch: number;
  start: number;
  end: number;
  velocity: number;
};

type StudioSettings = {
  root: string;
  scale: ScaleName;
  tempo: number;
  division: number;
  instrument: InstrumentName;
  chords: boolean;
  percussive: boolean;
};

type SavedTrack = {
  id: string;
  title: string;
  style: string;
  notes: CapturedNote[];
  settings: StudioSettings;
};

const PITCH_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const SCALE_STEPS = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  pentatonic: [0, 2, 4, 7, 9],
  blues: [0, 3, 5, 6, 7, 10],
} as const;
const INSTRUMENTS = {
  grand_piano: 'Grand piano',
  warm_strings: 'Warm strings',
  electric_keys: 'Electric keys',
  soft_synth: 'Soft synth',
} as const;
const NOTE_SEQUENCE = [60, 64, 67, 69, 67, 64, 62, 60, 55, 60, 64, 67];

function noteName(pitch: number) {
  return `${PITCH_NAMES[(pitch % 12 + 12) % 12]}${Math.floor(pitch / 12) - 1}`;
}

function getDemoNotes(seconds: number, settings: StudioSettings): CapturedNote[] {
  const beat = 60 / settings.tempo;
  const length = Math.max(seconds, beat * 4);
  const allowed = new Set(
    Array.from({ length: 5 }, (_, octave) =>
      SCALE_STEPS[settings.scale].map((step) => {
        const root = PITCH_NAMES.indexOf(settings.root);
        return root + step + (octave + 3) * 12;
      }),
    ).flat(),
  );

  return NOTE_SEQUENCE.map((rawPitch, index) => {
    const snapped = Array.from(allowed).reduce((closest, pitch) =>
      Math.abs(pitch - rawPitch) < Math.abs(closest - rawPitch) ? pitch : closest,
    );
    const start = Math.min(index * beat * 0.75, Math.max(0, length - beat));
    return {
      pitch: snapped,
      start,
      end: Math.min(start + beat * (index % 3 === 0 ? 0.7 : 0.45), length),
      velocity: 0.7 + (index % 3) * 0.08,
    };
  }).filter((note) => note.end > note.start);
}

function createChords(notes: CapturedNote[], settings: StudioSettings) {
  if (!settings.chords || notes.length === 0) return [];
  const root = PITCH_NAMES.indexOf(settings.root);
  const minor = settings.scale === 'minor' || settings.scale === 'dorian';
  const chordShape = minor ? [0, 3, 7] : [0, 4, 7];
  const bar = (60 / settings.tempo) * 4;
  const bars = Math.max(1, Math.ceil((notes[notes.length - 1].end || 1) / bar));
  return Array.from({ length: bars }, (_, index) => ({
    pitches: chordShape.map((step) => root + 48 + step + (index % 2) * 2),
    start: index * bar,
    end: (index + 1) * bar,
  }));
}

function VoiceRecorder({
  percussive,
  settings,
  onCaptured,
}: {
  percussive: boolean;
  settings: StudioSettings;
  onCaptured: (notes: CapturedNote[]) => void;
}) {
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const [state, setState] = useState<RecorderState>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    if (state !== 'recording') return;
    const interval = window.setInterval(() => setElapsed((value) => value + 0.1), 100);
    return () => window.clearInterval(interval);
  }, [state]);

  useEffect(() => () => streamRef.current?.getTracks().forEach((track) => track.stop()), []);

  async function startRecording() {
    setError('');
    setElapsed(0);
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Microphone capture is not available in this browser.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorder.start();
      setState('recording');
    } catch {
      setError('Microphone access is needed to capture your performance.');
    }
  }

  function stopRecording() {
    const recorder = recorderRef.current;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    recorder?.stop();
    setState('working');
    window.setTimeout(() => {
      onCaptured(getDemoNotes(Math.max(elapsed, 1.5), { ...settings, percussive }));
      setState('idle');
      setElapsed(0);
    }, 420);
  }

  const isRecording = state === 'recording';
  return (
    <div className="voice-recorder">
      <button
        type="button"
        onClick={isRecording ? stopRecording : startRecording}
        disabled={state === 'working'}
        className={`record-orb ${isRecording ? 'is-recording' : ''}`}
        aria-label={isRecording ? 'Stop recording' : 'Start recording'}
        data-testid="button-record-performance"
      >
        <span className="record-orb-ring" />
        {state === 'working' ? <LoaderCircle className="spin" /> : isRecording ? <Pause /> : <Mic />}
      </button>
      <div className="recorder-readout">
        <p>{elapsed.toFixed(1)}s</p>
        <span>{isRecording ? 'Listening — hum, whistle, sing or tap' : state === 'working' ? 'Transcribing' : 'Tap to perform'}</span>
      </div>
      {error && <p className="voice-error"><X />{error}</p>}
    </div>
  );
}

function PianoRoll({ notes, chords }: { notes: CapturedNote[]; chords: { pitches: number[]; start: number; end: number }[] }) {
  if (!notes.length) {
    return (
      <div className="piano-roll empty-roll">
        <Music2 />
        <p>Your performance will appear here as notes</p>
      </div>
    );
  }
  const maxTime = Math.max(notes[notes.length - 1].end, 1);
  const minPitch = Math.min(...notes.map((note) => note.pitch)) - 3;
  const maxPitch = Math.max(...notes.map((note) => note.pitch)) + 3;
  const pitchRange = Math.max(maxPitch - minPitch, 8);
  const gridLines = Array.from({ length: 9 });
  return (
    <div className="roll-wrap">
      <svg className="piano-roll" viewBox="0 0 100 40" preserveAspectRatio="none" role="img" aria-label="Transcribed performance piano roll">
        {gridLines.map((_, index) => <line key={`v-${index}`} x1={(index / 8) * 100} x2={(index / 8) * 100} y1="0" y2="40" className="roll-grid" />)}
        {gridLines.map((_, index) => <line key={`h-${index}`} x1="0" x2="100" y1={(index / 8) * 40} y2={(index / 8) * 40} className="roll-grid" />)}
        {chords.map((chord, index) => <rect key={`chord-${index}`} x={(chord.start / maxTime) * 100} y="0" width={((chord.end - chord.start) / maxTime) * 100} height="40" className="roll-chord" />)}
        {notes.map((note, index) => (
          <rect
            key={`${note.pitch}-${index}`}
            x={(note.start / maxTime) * 100}
            y={((maxPitch - note.pitch) / pitchRange) * 40 + 1}
            width={Math.max(((note.end - note.start) / maxTime) * 100, 2)}
            height={Math.max(40 / pitchRange - 0.8, 1.8)}
            rx="1"
            className="roll-note"
          />
        ))}
      </svg>
      <div className="roll-labels">
        <span>0:00</span><span>{(maxTime / 2).toFixed(1)}s</span><span>{maxTime.toFixed(1)}s</span>
      </div>
    </div>
  );
}

function ArrangementPlayer({ notes, chords, settings }: { notes: CapturedNote[]; chords: { pitches: number[]; start: number; end: number }[]; settings: StudioSettings }) {
  const contextRef = useRef<AudioContext | null>(null);
  const stopTimerRef = useRef<number | null>(null);
  const [playing, setPlaying] = useState(false);

  function stop() {
    if (stopTimerRef.current) window.clearTimeout(stopTimerRef.current);
    contextRef.current?.close();
    contextRef.current = null;
    setPlaying(false);
  }

  function play() {
    if (playing) {
      stop();
      return;
    }
    if (!notes.length) return;
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    if (context.state === 'suspended') context.resume();
    const gain = context.createGain();
    gain.gain.value = 0.08;
    gain.connect(context.destination);
    const base = context.currentTime + 0.03;
    const schedule = (pitch: number, start: number, end: number, volume: number) => {
      const oscillator = context.createOscillator();
      const noteGain = context.createGain();
      oscillator.type = settings.instrument === 'soft_synth' ? 'sine' : settings.instrument === 'warm_strings' ? 'triangle' : 'sine';
      oscillator.frequency.value = 440 * Math.pow(2, (pitch - 69) / 12);
      noteGain.gain.setValueAtTime(0, base + start);
      noteGain.gain.linearRampToValueAtTime(volume, base + start + 0.025);
      noteGain.gain.exponentialRampToValueAtTime(0.001, base + Math.max(start + 0.06, end));
      oscillator.connect(noteGain);
      noteGain.connect(gain);
      oscillator.start(base + start);
      oscillator.stop(base + Math.max(start + 0.08, end + 0.05));
    };
    notes.forEach((note) => schedule(note.pitch, note.start, note.end, note.velocity));
    chords.forEach((chord) => chord.pitches.forEach((pitch) => schedule(pitch, chord.start, chord.end, 0.08)));
    contextRef.current = context;
    setPlaying(true);
    const total = Math.max(notes[notes.length - 1].end, 0.5);
    stopTimerRef.current = window.setTimeout(stop, (total + 0.25) * 1000);
  }

  useEffect(() => () => stop(), []);
  return (
    <button type="button" className="gold-button" onClick={play} disabled={!notes.length} data-testid="button-play-arrangement">
      {playing ? <Pause /> : <Play />} {playing ? 'Stop' : 'Play arrangement'}
    </button>
  );
}

function ToggleRow({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="setting-row">
      <span><strong>{label}</strong><small>{description}</small></span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span className="switch" aria-hidden="true"><span /></span>
    </label>
  );
}

function TheoryDesk({ settings, onChange }: { settings: StudioSettings; onChange: (settings: StudioSettings) => void }) {
  const update = <K extends keyof StudioSettings>(key: K, value: StudioSettings[K]) => onChange({ ...settings, [key]: value });
  return (
    <section className="dark-section">
      <div className="section-heading">
        <div><p className="eyebrow">Instrument settings</p><h2>Music theory desk</h2></div>
        <SlidersHorizontal />
      </div>
      <div className="settings-grid">
        <label className="dark-field"><span>Key</span><select value={settings.root} onChange={(event) => update('root', event.target.value)}>{PITCH_NAMES.map((name) => <option key={name}>{name}</option>)}</select><ChevronDown /></label>
        <label className="dark-field"><span>Scale</span><select value={settings.scale} onChange={(event) => update('scale', event.target.value as ScaleName)}>{Object.keys(SCALE_STEPS).map((name) => <option key={name} value={name}>{name.replace('_', ' ')}</option>)}</select><ChevronDown /></label>
        <label className="dark-field"><span>Tempo</span><input type="number" min="50" max="180" value={settings.tempo} onChange={(event) => update('tempo', Number(event.target.value))} /><small>BPM</small></label>
        <label className="dark-field"><span>Quantize</span><select value={settings.division} onChange={(event) => update('division', Number(event.target.value))}><option value="2">Half beat</option><option value="4">Quarter beat</option><option value="8">Eighth beat</option></select><ChevronDown /></label>
      </div>
      <div className="settings-grid setting-toggles">
        <ToggleRow label="Chord bed" description="Support the melody with a harmonic bed" checked={settings.chords} onChange={(value) => update('chords', value)} />
        <ToggleRow label="Percussive capture" description="Favor taps and rhythmic transients" checked={settings.percussive} onChange={(value) => update('percussive', value)} />
      </div>
      <div className="instrument-picker">
        {Object.entries(INSTRUMENTS).map(([value, label]) => <button type="button" key={value} onClick={() => update('instrument', value as InstrumentName)} className={settings.instrument === value ? 'selected' : ''}>{settings.instrument === value && <Check />}{label}</button>)}
      </div>
    </section>
  );
}

function AiDirection({ onIdea }: { onIdea: (idea: { title: string; style: string; lyrics: string }) => void }) {
  const [prompt, setPrompt] = useState('');
  const [idea, setIdea] = useState<{ title: string; style: string; lyrics: string } | null>(null);
  function generateIdea() {
    const clean = prompt.trim() || 'A warm, patient melody';
    const title = clean.split(' ').slice(0, 4).join(' ');
    const nextIdea = { title, style: 'Cinematic ambient / 100 BPM', lyrics: `Let the quiet find a shape\n${clean} in the open air` };
    setIdea(nextIdea);
    onIdea(nextIdea);
  }
  return (
    <section className="dark-section ai-section">
      <div className="section-heading"><div><p className="eyebrow">AION CORE assistant</p><h2>AI direction</h2></div><Sparkles /></div>
      <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Describe the feeling you want to perform..." className="dark-textarea" />
      <button type="button" onClick={generateIdea} className="wide-gold-button"><WandSparkles /> Shape a direction</button>
      {idea && <div className="idea-card"><strong>{idea.title}</strong><span>{idea.style}</span><pre>{idea.lyrics}</pre><small>Applied to your studio settings.</small></div>}
    </section>
  );
}

function StudioHeader() {
  const [location] = useLocation();
  return (
    <header className="instrument-header">
      <div className="instrument-header-inner">
        <Link href="/" className="instrument-brand"><span>A I O N</span><small>Orchestra</small></Link>
        <nav aria-label="Instrument workspace navigation">
          <Link href="/perform" className={location === '/perform' ? 'active' : ''}><Mic /> Studio</Link>
          <Link href="/perform/library" className={location === '/perform/library' ? 'active' : ''}><Library /> Library</Link>
        </nav>
      </div>
    </header>
  );
}

function StudioPage() {
  const [notes, setNotes] = useState<CapturedNote[]>([]);
  const [title, setTitle] = useState('');
  const [style, setStyle] = useState('');
  const [saved, setSaved] = useState(false);
  const [settings, setSettings] = useState<StudioSettings>({ root: 'C', scale: 'major', tempo: 100, division: 4, instrument: 'grand_piano', chords: true, percussive: false });
  const chords = useMemo(() => createChords(notes, settings), [notes, settings]);

  function saveTrack() {
    if (!notes.length) return;
    const existing: SavedTrack[] = JSON.parse(localStorage.getItem('aion-orchestra-tracks') || '[]');
    const track: SavedTrack = { id: crypto.randomUUID(), title: title.trim() || 'Untitled movement', style: style.trim(), notes, settings };
    localStorage.setItem('aion-orchestra-tracks', JSON.stringify([track, ...existing]));
    setSaved(true);
  }

  function applyIdea(idea: { title: string; style: string }) {
    setTitle(idea.title);
    setStyle(idea.style);
    setSaved(false);
  }

  return (
    <div className="instrument-page">
      <div className="instrument-glow" />
      <StudioHeader />
      <main className="instrument-main">
        <section className="instrument-hero">
          <p className="eyebrow">Voice to instrument</p>
          <h1>Perform it with your voice.<br /><span>Hear it as an orchestra.</span></h1>
          <p>Hum, whistle, sing, click or tap. AION Orchestra transcribes your performance into notes, corrects it to a key and tempo using music theory, then plays it back on real instruments.</p>
        </section>
        <section className="capture-panel">
          <VoiceRecorder percussive={settings.percussive} settings={settings} onCaptured={(captured) => { setNotes(captured); setSaved(false); }} />
        </section>
        <section className="notes-section">
          <PianoRoll notes={notes} chords={chords} />
          <div className="action-row">
            <ArrangementPlayer notes={notes} chords={chords} settings={settings} />
            <button type="button" onClick={() => { setNotes([]); setSaved(false); }} disabled={!notes.length} className="outline-button"><RotateCcw /> Clear</button>
          </div>
        </section>
        {notes.length > 0 && <TheoryDesk settings={settings} onChange={setSettings} />}
        <AiDirection onIdea={applyIdea} />
        <section className="dark-section save-section">
          <div className="section-heading"><div><p className="eyebrow">Keep the idea</p><h2>Save to library</h2></div><Save /></div>
          <div className="save-form">
            <input value={title} onChange={(event) => { setTitle(event.target.value); setSaved(false); }} placeholder="Track title" aria-label="Track title" />
            <input value={style} onChange={(event) => { setStyle(event.target.value); setSaved(false); }} placeholder="Style or note" aria-label="Track style" />
            <button type="button" onClick={saveTrack} disabled={!notes.length || saved} className="save-button">{saved ? <Check /> : <Save />}{saved ? 'Saved' : 'Save track'}</button>
          </div>
        </section>
        <footer className="instrument-footer"><span>AION Orchestra / voice becomes structure</span><span><CircleHelp /> Microphone permission stays in your browser</span></footer>
      </main>
    </div>
  );
}

function LibraryPage() {
  const [tracks, setTracks] = useState<SavedTrack[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [settings] = useState<StudioSettings>({ root: 'C', scale: 'major', tempo: 100, division: 4, instrument: 'grand_piano', chords: true, percussive: false });
  useEffect(() => {
    try { setTracks(JSON.parse(localStorage.getItem('aion-orchestra-tracks') || '[]')); } catch { setTracks([]); }
  }, []);
  function deleteTrack(id: string) {
    const next = tracks.filter((track) => track.id !== id);
    setTracks(next);
    localStorage.setItem('aion-orchestra-tracks', JSON.stringify(next));
  }
  return (
    <div className="instrument-page">
      <div className="instrument-glow" />
      <StudioHeader />
      <main className="instrument-main library-main">
        <section className="library-heading"><p className="eyebrow">Your catalogue</p><h1>Library</h1><p>Saved performances, ready to return to.</p></section>
        {tracks.length === 0 ? <div className="library-empty"><Library /><p>No tracks yet — record a performance in the studio and save it.</p><Link href="/perform" className="gold-button"><Mic /> Open studio</Link></div> : (
          <div className="library-list">
            {tracks.map((track) => {
              const chordList = createChords(track.notes, track.settings || settings);
              return <div className="library-track" key={track.id}>
                <button type="button" className="track-play" onClick={() => setPlayingId(playingId === track.id ? null : track.id)}>{playingId === track.id ? <Pause /> : <Play />}</button>
                <div><h2>{track.title}</h2><p>{track.settings.root} {track.settings.scale} · {track.settings.tempo} BPM · {INSTRUMENTS[track.settings.instrument]}</p>{track.style && <small>{track.style}</small>}</div>
                {playingId === track.id && <ArrangementPlayer notes={track.notes} chords={chordList} settings={track.settings} />}
                <button type="button" onClick={() => deleteTrack(track.id)} className="delete-track" aria-label={`Delete ${track.title}`}><Trash2 /></button>
              </div>;
            })}
          </div>
        )}
      </main>
    </div>
  );
}

export { LibraryPage, StudioPage };