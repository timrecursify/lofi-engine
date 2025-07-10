// Client-side only wrapper for Tone.js engine modules
export async function loadEngineModules() {
  if (typeof window === 'undefined') {
    // Return mock objects during SSR
    return {
      Piano: class { getSampler() { return null; } },
      Kick: class { getSampler() { return null; } },
      Snare: class { getSampler() { return null; } },
      Hat: class { getSampler() { return null; } },
      Noise: null,
      ChordProgression: { generate: () => [] },
      intervalWeights: [],
      Keys: [],
      fiveToFive: []
    };
  }

  // Dynamically import modules on client side
  const [
    { default: Piano },
    { default: Kick },
    { default: Snare },
    { default: Hat },
    { default: Noise },
    { default: ChordProgression },
    { default: intervalWeights },
    { default: Keys },
    { fiveToFive }
  ] = await Promise.all([
    import('./Piano/Piano'),
    import('./Drums/Kick'),
    import('./Drums/Snare'),
    import('./Drums/Hat'),
    import('./Drums/Noise'),
    import('./Chords/ChordProgression'),
    import('./Chords/IntervalWeights'),
    import('./Chords/Keys'),
    import('./Chords/MajorScale')
  ]);

  return {
    Piano,
    Kick,
    Snare,
    Hat,
    Noise,
    ChordProgression,
    intervalWeights,
    Keys,
    fiveToFive
  };
} 