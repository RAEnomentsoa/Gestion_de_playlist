function parseDurationToSeconds(duree) {
  if (!duree) return 0;
  const parts = String(duree).split(":").map(Number);
  if (parts.some(Number.isNaN)) return 0;
  if (parts.length === 3) {
    const [hours, minutes, seconds] = parts;
    return hours * 3600 + minutes * 60 + seconds;
  }
  if (parts.length === 2) {
    const [minutes, seconds] = parts;
    return minutes * 60 + seconds;
  }
  return parts[0] || 0;
}

function formatSecondsToDuration(totalSeconds) {
  const seconds = Math.floor(totalSeconds % 60);
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = totalMinutes % 60;
  const hours = Math.floor(totalMinutes / 60);
  const pad = (n) => String(n).padStart(2, "0");
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}

module.exports = { parseDurationToSeconds, formatSecondsToDuration };
