import { create } from 'zustand';

const defaultFxForStem = (stem) => {
  const eqBands = stem?.eq?.bands || [];
  const lowGain = eqBands[0]?.gain_db || 0;
  const midGain = eqBands[1]?.gain_db || 0;
  const highGain = eqBands[2]?.gain_db || 0;

  const comp = stem?.compressor || {};
  const sends = stem?.sends || {};

  return {
    eq: { low: lowGain, mid: midGain, high: highGain },
    comp: {
      thresh: comp.threshold_db ?? -16,
      ratio: comp.ratio ?? 3,
      makeup: comp.makeup_gain_db ?? 0,
    },
    sat: stem?.saturation ?? 0,
    sends: {
      reverb: sends.reverb ?? 0.1,
      delay: sends.delay ?? 0.05,
    },
  };
};

const useMixerStore = create((set, get) => ({
  selectedStemId: null,
  mutedStems: new Set(),
  soloedStemId: null,
  isPlaying: false,
  currentGains: {},  // stemId → current dB value
  bypass: false,

  // FX settings per stem: stemId → { eq: {low, mid, high}, comp: {thresh, ratio, makeup}, sat: number, sends: {reverb, delay} }
  fxSettings: {},

  // Dynamic stem configuration from /mix-v2 API response.
  activeStemConfig: null,
  mixResponse: null,  // Full raw API response from /mix-v2

  setActiveStemConfig: (config) => {
    // Initialize fxSettings for all stems from API config
    const initialFx = {};
    if (Array.isArray(config)) {
      config.forEach((stem) => {
        initialFx[stem.id] = defaultFxForStem(stem);
      });
    }
    set({ activeStemConfig: config, fxSettings: initialFx });
  },

  setMixResponse: (response) => set({ mixResponse: response }),

  // Reset mixer state for a new session
  resetMixer: () => set({
    selectedStemId: null,
    mutedStems: new Set(),
    soloedStemId: null,
    isPlaying: false,
    currentGains: {},
    fxSettings: {},
    bypass: false,
  }),

  selectStem: (stemId) => set({ selectedStemId: stemId }),

  // Update specific FX module parameter and trigger real-time Web Audio API update
  updateFx: (stemId, module, param, value, audioEngine) => {
    const { fxSettings } = get();
    const currentStemFx = fxSettings[stemId] || defaultFxForStem();

    let updatedStemFx;
    if (module === 'eq') {
      updatedStemFx = {
        ...currentStemFx,
        eq: { ...currentStemFx.eq, [param]: value },
      };
    } else if (module === 'comp') {
      updatedStemFx = {
        ...currentStemFx,
        comp: { ...currentStemFx.comp, [param]: value },
      };
    } else if (module === 'sat') {
      updatedStemFx = {
        ...currentStemFx,
        sat: value,
      };
    } else if (module === 'sends') {
      updatedStemFx = {
        ...currentStemFx,
        sends: { ...currentStemFx.sends, [param]: value },
      };
    } else {
      updatedStemFx = currentStemFx;
    }

    set({
      fxSettings: {
        ...fxSettings,
        [stemId]: updatedStemFx,
      },
    });

    if (audioEngine && typeof audioEngine.updateTrackFx === 'function') {
      audioEngine.updateTrackFx(stemId, updatedStemFx);
    }
  },

  toggleMute: (stemId, audioEngine) => {
    const { mutedStems, soloedStemId } = get();
    const next = new Set(mutedStems);
    if (next.has(stemId)) {
      next.delete(stemId);
      if (!soloedStemId || soloedStemId === stemId) {
        audioEngine.setChannelGain(stemId, get().currentGains[stemId] ?? 0);
      }
    } else {
      next.add(stemId);
      audioEngine.setChannelGain(stemId, -Infinity);
    }
    set({ mutedStems: next });
  },

  toggleSolo: (stemId, audioEngine, allStems) => {
    const { soloedStemId } = get();
    if (soloedStemId === stemId) {
      set({ soloedStemId: null });
      const { mutedStems } = get();
      allStems.forEach((s) => {
        if (mutedStems.has(s.id)) {
          audioEngine.setChannelGain(s.id, -Infinity);
        } else {
          audioEngine.setChannelGain(s.id, get().currentGains[s.id] ?? s.initialDB);
        }
      });
    } else {
      set({ soloedStemId: stemId });
      allStems.forEach((s) => {
        if (s.id !== stemId) {
          audioEngine.setChannelGain(s.id, -Infinity);
        } else {
          audioEngine.setChannelGain(s.id, get().currentGains[s.id] ?? s.initialDB);
        }
      });
    }
  },

  setGain: (stemId, dB) => {
    set((state) => ({ currentGains: { ...state.currentGains, [stemId]: dB } }));
  },

  setPlaying: (val) => set({ isPlaying: val }),

  toggleBypass: (audioEngine, allStems) => {
    const { bypass } = get();
    const newBypass = !bypass;

    const newGains = {};
    allStems.forEach((stem) => {
      const targetDB = newBypass ? 0 : stem.initialDB;
      newGains[stem.id] = targetDB;
      audioEngine.setChannelGain(stem.id, targetDB);
    });

    set({ bypass: newBypass, currentGains: newGains });
  },
}));

export default useMixerStore;
