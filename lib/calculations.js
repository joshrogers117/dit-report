import { sumTimecodes, addTimecodes } from './timecode.js';

function round2(n) {
  return Math.round(n * 100) / 100;
}

function computeDayTotals(rolls) {
  return {
    gb: round2(rolls.reduce((sum, r) => sum + (r.gb || 0), 0)),
    duration: sumTimecodes(rolls.map(r => r.duration_tc)),
    rollCount: rolls.length
  };
}

function computeProjectTotals(dayTotals) {
  return {
    gb: round2(dayTotals.reduce((sum, d) => sum + d.gb, 0)),
    duration: sumTimecodes(dayTotals.map(d => d.duration)),
    dayCount: dayTotals.length,
    rollCount: dayTotals.reduce((sum, d) => sum + d.rollCount, 0)
  };
}

function computeCumulativeTotals(dayTotals) {
  let gb = 0, duration = '00:00:00:00';
  return dayTotals.map(d => {
    gb = round2(gb + d.gb);
    duration = addTimecodes(duration, d.duration);
    return { gb, duration };
  });
}

export { computeDayTotals, computeProjectTotals, computeCumulativeTotals, round2 };
