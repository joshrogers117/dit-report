const { sumTimecodes, addTimecodes } = require('./timecode');

function round2(n) {
  return Math.round(n * 100) / 100;
}

function computeDayTotals(rolls) {
  const dataRolls = rolls.filter(r => !r.is_break);
  return {
    gb: round2(dataRolls.reduce((sum, r) => sum + (r.gb || 0), 0)),
    duration: sumTimecodes(dataRolls.map(r => r.duration_tc)),
    frames: dataRolls.reduce((sum, r) => sum + (r.frames || 0), 0),
    rollCount: dataRolls.length
  };
}

function computeProjectTotals(dayTotals) {
  return {
    gb: round2(dayTotals.reduce((sum, d) => sum + d.gb, 0)),
    duration: sumTimecodes(dayTotals.map(d => d.duration)),
    frames: dayTotals.reduce((sum, d) => sum + d.frames, 0),
    dayCount: dayTotals.length,
    rollCount: dayTotals.reduce((sum, d) => sum + d.rollCount, 0)
  };
}

function computeCumulativeTotals(dayTotals) {
  let gb = 0, frames = 0, duration = '00:00:00:00';
  return dayTotals.map(d => {
    gb = round2(gb + d.gb);
    frames += d.frames;
    duration = addTimecodes(duration, d.duration);
    return { gb, duration, frames };
  });
}

module.exports = { computeDayTotals, computeProjectTotals, computeCumulativeTotals, round2 };
