import {
  Aion808, AionEPiano, NebulaPad, PulseLead, AionVox,
  AionStrings, AionBrass, AionFlute, AionGuitar,
  StradivariusNode, CrystalFluteNode, BuchlaNode, HarpsichordNode, KhluiNode,
  HeavyMetalGuitar, BanjoNode, WobbleBass, WorldPerc,
  CyberKick, NeonSnare, GlitchHats
} from "./dsp";

/**
 * Instrument Architect Virtual Machine
 * Handles dynamic registration and management of instruments and genre-based arrangements.
 */

export interface InstrumentNode {
  process(...args: any[]): number;
  init?(...args: any[]): void;
}

export interface GenreArrangement {
  id: string;
  instruments: string[];
  dspSettings: {
    drive: number;
    revMix: number;
    duckMix: number;
    stereoWidth: number;
    lpfCutoff: number;
    tilt: number;
  };
  arrangementLogic: (params: {
    time: number;
    root: number;
    sampleRate: number;
    bpm: number;
    stepTime: number;
    kickTrigger: boolean;
    snareTrigger: boolean;
    vocalSample: number;
    drumSample: number;
    melody: number;
    subBass: number;
    subBassSample: number;
    atmosphere: number;
    nodes: Record<string, InstrumentNode>;
  }) => number;
}

class InstrumentArchitectVM {
  private instruments: Record<string, new () => InstrumentNode> = {};
  private arrangements: Record<string, GenreArrangement> = {};

  constructor() {
    this.registerCoreInstruments();
    this.registerDefaultArrangements();
  }

  private registerCoreInstruments() {
    this.instruments = {
      epiano: AionEPiano,
      pad: NebulaPad,
      lead: PulseLead,
      vox: AionVox,
      strings: AionStrings,
      brass: AionBrass,
      flute: AionFlute,
      guitar: AionGuitar,
      strad: StradivariusNode,
      crystalFlute: CrystalFluteNode,
      buchla: BuchlaNode,
      harpsichord: HarpsichordNode,
      khlui: KhluiNode,
      metalGuitar: HeavyMetalGuitar,
      banjo: BanjoNode,
      wobble: WobbleBass,
      perc: WorldPerc,
      kick: CyberKick,
      snare: NeonSnare,
      hats: GlitchHats,
      sub808: Aion808
    };
  }

  private registerDefaultArrangements() {
    this.registerArrangement({
      id: "techno pulse",
      instruments: ["lead", "sub808", "buchla"],
      dspSettings: { drive: 9.0, revMix: 0.1, duckMix: 1.0, stereoWidth: 1.0, lpfCutoff: 0.5, tilt: 0.55 },
      arrangementLogic: ({ time, root, bpm, drumSample, vocalSample, nodes }) => {
        return nodes.lead.process(time, root * 2) * 0.3 +
               nodes.sub808.process(time % (60/bpm), true, 40) * 0.5 +
               drumSample + vocalSample * 0.2 + nodes.buchla.process(time, root / 4);
      }
    });

    this.registerArrangement({
      id: "lo-fi hip hop",
      instruments: ["guitar", "harpsichord"],
      dspSettings: { drive: 5.5, revMix: 0.25, duckMix: 0.1, stereoWidth: 0.85, lpfCutoff: 0.15, tilt: 0.3 },
      arrangementLogic: ({ time, root, melody, subBass, drumSample, atmosphere, vocalSample, nodes }) => {
        return melody * 0.3 + subBass * 0.4 + drumSample * 0.6 + atmosphere + vocalSample * 0.4 +
               nodes.guitar.process() + nodes.harpsichord.process(time % 2, root * 1.5) * 0.15;
      }
    });

    this.registerArrangement({
      id: "drum and bass",
      instruments: ["wobble"],
      dspSettings: { drive: 4.5, revMix: 0.15, duckMix: 0.4, stereoWidth: 1.1, lpfCutoff: 0.45, tilt: 0.5 },
      arrangementLogic: ({ time, root, drumSample, vocalSample, subBassSample, nodes }) => {
        return nodes.wobble.process(time, root / 2, 8) * 0.6 + drumSample * 0.8 + vocalSample * 0.2 + subBassSample;
      }
    });

    this.registerArrangement({
      id: "dubstep",
      instruments: ["wobble"],
      dspSettings: { drive: 8.0, revMix: 0.3, duckMix: 0.5, stereoWidth: 1.4, lpfCutoff: 0.35, tilt: 0.55 },
      arrangementLogic: ({ time, root, drumSample, vocalSample, subBassSample, nodes }) => {
        return nodes.wobble.process(time, root / 4, 4) * 0.7 + drumSample * 0.6 + vocalSample * 0.3 + subBassSample;
      }
    });

    this.registerArrangement({
      id: "heavy metal",
      instruments: ["metalGuitar", "brass"],
      dspSettings: { drive: 10.0, revMix: 0.2, duckMix: 0.0, stereoWidth: 1.2, lpfCutoff: 0.6, tilt: 0.45 },
      arrangementLogic: ({ drumSample, subBassSample, nodes }) => {
        return nodes.metalGuitar.process() * 0.6 + nodes.brass.process(0, 0) * 0.4 + drumSample * 0.5 + subBassSample * 0.2;
      }
    });

    this.registerArrangement({
      id: "bardcore",
      instruments: ["harpsichord", "flute", "strings"],
      dspSettings: { drive: 1.5, revMix: 0.5, duckMix: 0.0, stereoWidth: 1.3, lpfCutoff: 0.8, tilt: 0.5 },
      arrangementLogic: ({ time, root, vocalSample, nodes }) => {
        return nodes.harpsichord.process(time % 2, root * 1.5) + nodes.flute.process(time % 8, root * 2) + vocalSample * 0.4 + nodes.strings.process(time % 4, root * 1.5, 'violin') * 0.3;
      }
    });

    this.registerArrangement({
      id: "vintage soul",
      instruments: ["epiano", "sub808", "khlui"],
      dspSettings: { drive: 4.0, revMix: 0.2, duckMix: 0.0, stereoWidth: 0.95, lpfCutoff: 0.3, tilt: 0.45 },
      arrangementLogic: ({ time, root, drumSample, vocalSample, nodes }) => {
        return nodes.epiano.process(time % 2, root) * 0.5 + nodes.sub808.process(0, false, 40) * 0.5 + drumSample * 0.4 + vocalSample * 0.5 + nodes.khlui.process(time % 4, root) * 0.1;
      }
    });

    this.registerArrangement({
      id: "bluegrass",
      instruments: ["banjo", "guitar", "perc", "strings"],
      dspSettings: { drive: 1.8, revMix: 0.3, duckMix: 0.7, stereoWidth: 1.3, lpfCutoff: 0.5, tilt: 0.5 },
      arrangementLogic: ({ time, root, stepTime, kickTrigger, nodes }) => {
        return nodes.banjo.process() * 0.5 + nodes.guitar.process() * 0.3 + nodes.perc.process(stepTime, kickTrigger) * 0.2 + nodes.strings.process(time % 4, root, 'violin') * 0.4;
      }
    });
  }

  public registerArrangement(arrangement: GenreArrangement) {
    this.arrangements[arrangement.id.toLowerCase()] = arrangement;
  }

  public getArrangement(id: string): GenreArrangement | null {
    return this.arrangements[id.toLowerCase()] || null;
  }

  public createInstrument(id: string): InstrumentNode {
    const Ctor = this.instruments[id];
    if (!Ctor) throw new Error(`Instrument ${id} not found in Architect manifest.`);
    return new Ctor();
  }
}

export const architect = new InstrumentArchitectVM();
