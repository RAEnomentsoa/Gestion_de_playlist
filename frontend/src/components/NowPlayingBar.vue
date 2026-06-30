<script setup>
import { computed } from "vue";
import { usePlayerStore } from "../stores/player";
import ProgressBar from "./ProgressBar.vue";

const player = usePlayerStore();

function formatTime(seconds) {
  const total = Math.max(0, Math.floor(seconds || 0));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

const elapsedLabel = computed(() => formatTime(player.combinedElapsed));
const totalLabel = computed(() => formatTime(player.combinedTotal));
</script>

<template>
  <div v-if="player.currentTrack" class="now-playing-bar">
    <div class="track-info">
      <div class="title">{{ player.currentTrack.titre || "Sans titre" }}</div>
      <div class="muted">{{ player.currentTrack.artiste || "—" }}</div>
    </div>

    <div class="controls">
      <button class="btn-icon" @click="player.togglePause()">
        <span v-if="player.isPlaying">❚❚</span>
        <span v-else>▶</span>
      </button>
      <div class="progress-row">
        <span class="time muted">{{ elapsedLabel }}</span>
        <ProgressBar class="grow" :percent="player.combinedProgressPercent" interactive @seek="player.seekCombined" />
        <span class="time muted">{{ totalLabel }}</span>
      </div>
    </div>

    <div class="spacer"></div>
  </div>
</template>

<style scoped>
.now-playing-bar {
  display: grid;
  grid-template-columns: 1fr 2fr 1fr;
  align-items: center;
  gap: 20px;
  height: 72px;
  padding: 0 20px;
  background: var(--bg-elevated);
  border-top: 1px solid var(--border);
  flex-shrink: 0;
}

.track-info {
  min-width: 0;
}

.title {
  font-weight: 700;
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.controls {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.progress-row {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
}

.time {
  font-size: 11px;
  min-width: 32px;
}

.grow {
  flex: 1;
}

.spacer {
  /* keeps the controls column visually centered, mirrors track-info's width */
}
</style>
