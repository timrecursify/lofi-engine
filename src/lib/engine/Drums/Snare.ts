import * as Tone from 'tone';

const samplePath = `assets/engine/DrumSamples/snare.mp3`;
const samples = {C4: samplePath};

const lpf = new Tone.Filter(6000, "lowpass");
const vol = new Tone.Volume(-6);
const sw = new Tone.StereoWidener(0.3);

class Snare {
	public sampler: Tone.Sampler;

	constructor(cb: () => void) {
		this.sampler = new Tone.Sampler(samples, () => {
			cb();
		}).chain(lpf, vol, sw, Tone.getDestination());
	}

	getSampler(): Tone.Sampler {
		return this.sampler;
	}
}

export default Snare;