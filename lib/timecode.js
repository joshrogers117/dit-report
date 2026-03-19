// Timecode utilities for HH:MM:SS:FF format

function parseTimecode(tc) {
  if (!tc || tc === '00:00:00:00') return { hours: 0, minutes: 0, seconds: 0, frames: 0 };
  const parts = tc.split(':').map(Number);
  return {
    hours: parts[0] || 0,
    minutes: parts[1] || 0,
    seconds: parts[2] || 0,
    frames: parts[3] || 0
  };
}

function formatTimecode(h, m, s, f) {
  const pad = n => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}:${pad(f)}`;
}

function addTimecodes(tc1, tc2, fpsBase = 24) {
  const a = parseTimecode(tc1);
  const b = parseTimecode(tc2);

  let frames = a.frames + b.frames;
  let seconds = a.seconds + b.seconds;
  let minutes = a.minutes + b.minutes;
  let hours = a.hours + b.hours;

  seconds += Math.floor(frames / fpsBase);
  frames = frames % fpsBase;

  minutes += Math.floor(seconds / 60);
  seconds = seconds % 60;

  hours += Math.floor(minutes / 60);
  minutes = minutes % 60;

  return formatTimecode(hours, minutes, seconds, frames);
}

function sumTimecodes(timecodes, fpsBase = 24) {
  return timecodes
    .filter(Boolean)
    .reduce((acc, tc) => addTimecodes(acc, tc, fpsBase), '00:00:00:00');
}

function isValidTimecode(tc) {
  return /^\d{2}:\d{2}:\d{2}:\d{2}$/.test(tc);
}

module.exports = { parseTimecode, formatTimecode, addTimecodes, sumTimecodes, isValidTimecode };
