// ── playlist.js ──────────────────────────────────────────────────────────────
// Shared playlist logic — identical algorithm to getLivePosition() in the
// frontend, so the scheduler and the web player are always in sync.
// ─────────────────────────────────────────────────────────────────────────────

const path = require('path');

// Load the playlist from the frontend public folder
function loadPlaylist() {
  const playlistPath = path.join(__dirname, '../public/FTP_MEGA.js');
  const raw = require('fs').readFileSync(playlistPath, 'utf8');

  // Extract the array from `var videoPlaylist = [...];`
  const match = raw.match(/var\s+videoPlaylist\s*=\s*(\[[\s\S]*?\]);/);
  if (!match) throw new Error('Could not parse videoPlaylist from FTP_MEGA.js');

  // Use Function constructor to safely evaluate the JS array literal
  // (avoids eval on arbitrary code — only the array literal is extracted)
  return Function('"use strict"; return ' + match[1])();
}

// Total duration of the entire playlist in seconds
function totalDuration(playlist) {
  return playlist.reduce((s, t) => s + Math.max(0, t.end - t.start), 0);
}

// Where in the rotation are we right now?
// Returns { index, seekOffset, remaining, posInCycle }
// ── Identical to getLivePosition() in ftp-channel.html ──────────────────────
function getLivePosition(playlist, nowSec) {
  nowSec = nowSec ?? Math.floor(Date.now() / 1000);
  const total = totalDuration(playlist);

  // Daily seed — shifts the "schedule" each UTC day so it never feels like
  // the same loop at the same time
  const dayNumber = Math.floor(nowSec / 86400);
  const dailySeed = Number(
    (BigInt(dayNumber % total) * 3571n) % BigInt(total)
  );
  const posInCycle = (nowSec % total + dailySeed) % total;

  let elapsed = 0;
  for (let i = 0; i < playlist.length; i++) {
    const clipLen = playlist[i].end - playlist[i].start;
    if (posInCycle < elapsed + clipLen) {
      const seekOffset = posInCycle - elapsed;
      return {
        index:      i,
        seekOffset,                         // seconds into this clip
        remaining:  clipLen - seekOffset,   // seconds left in this clip
        posInCycle,
        total,
      };
    }
    elapsed += clipLen;
  }

  return { index: 0, seekOffset: 0, remaining: playlist[0].end - playlist[0].start, posInCycle: 0, total };
}

// Human-readable mm:ss
function fmt(s) {
  s = Math.max(0, Math.floor(s));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

module.exports = { loadPlaylist, totalDuration, getLivePosition, fmt };
