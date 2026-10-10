import { afterEach, describe, expect, it, vi } from 'vitest';
import Chord from './Chord';
import { singleOct } from './MajorScale';

describe('Chord', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('maps each major-scale degree to its semitone distance', () => {
        singleOct.forEach((semitones, index) => {
            expect(new Chord(index + 1, [], []).getSemitoneDist()).toBe(semitones);
        });
    });

    it('generates a root voicing with ascending octave-adjusted intervals', () => {
        const intervals = [0, 4, 7];
        const chord = new Chord(1, intervals, []);
        vi.spyOn(Math, 'random').mockReturnValue(0.75);

        expect(chord.generateVoicing(3)).toEqual([0, 4, 7]);
        expect(intervals).toEqual([0, 4, 7]);
    });

    it('keeps generated voicings ascending when interval order is shuffled', () => {
        const chord = new Chord(1, [0, 7, 4], []);
        vi.spyOn(Math, 'random').mockReturnValue(0.75);

        const voicing = chord.generateVoicing(3);
        expect(voicing[0]).toBe(0);
        expect(voicing.slice(1)).toEqual([7, 16]);
        expect(voicing[1]).toBeLessThan(voicing[2]);
    });

    it('selects configured next chords at random boundaries', () => {
        const chord = new Chord(1, [], [2, 4, 6]);
        vi.spyOn(Math, 'random').mockReturnValueOnce(0).mockReturnValueOnce(0.999);

        expect(chord.nextChordIdx()).toBe(2);
        expect(chord.nextChordIdx()).toBe(6);
    });
});
