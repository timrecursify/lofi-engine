import { singleOct } from './MajorScale';

class Chord {
    public degree: number;
    public semitoneDist: number;
    public intervals: number[];
    public nextChordIdxs: number[];

    constructor(degree: number, intervals: number[], nextChordIdxs: number[]) {
        this.degree = degree;
        this.semitoneDist = singleOct[degree-1];
        this.intervals = intervals;
        this.nextChordIdxs = nextChordIdxs;
    }
    
    getDegree(): number {
    	return this.degree;
    }

    getSemitoneDist(): number {
        return this.semitoneDist;
    }

    getIntervals(): number[] {
        return this.intervals;
    }

    getNextChordIdxs(): number[] {
        return this.nextChordIdxs;
    }

    nextChordIdx(): number {
        return this.nextChordIdxs[Math.floor(Math.random()*this.nextChordIdxs.length)];
    }

    generateVoicing(size: number): number[] {
        if(size<3)
            return this.intervals.slice(0,3);
        let voicing = this.intervals.slice(1,size);
        voicing.sort(() => Math.random()-0.5);
        for(let i = 1; i<voicing.length; i++) {
            while(voicing[i] < voicing[i-1]){
                voicing[i] += 12;
            }
        }
        voicing.unshift(0);
        return voicing;
    }

    generateMode(): number[] {
        return this.intervals.map(n => {
            if(n>=12)
                return n-12;
            else
                return n;
        });
    }
}

export default Chord;