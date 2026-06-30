<script setup>
import { computed } from "vue";
import { usePlayerStore } from "../stores/player";
import ProgressBar from "./ProgressBar.vue";

const props = defineProps({
  playlist: { type: Object, required: true },
});

const player = usePlayerStore();

const isCurrent = computed(() => player.playlistId === props.playlist.id);
const isPlaying = computed(() => isCurrent.value && player.isPlaying);
const progressPercent = computed(() => (isCurrent.value ? player.combinedProgressPercent : 0));

const totalLabel = computed(() => {
  const total = props.playlist.total_duration_seconds || 0;
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
});

const elapsedLabel = computed(() => {
  if (!isCurrent.value) return "0:00";
  const elapsed = Math.floor(player.combinedElapsed);
  const m = Math.floor(elapsed / 60);
  const s = elapsed % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
});

function onSeek(percent) {
  if (!isCurrent.value) return;
  player.seekCombined(percent);
}
</script>

<template>
  <RouterLink :to="`/playlists/${playlist.id}`" class="row-link">
    <div class="playlist-row" :class="{ active: isCurrent }">
      <button class="btn-icon" @click.stop.prevent="player.playPlaylist(playlist)">
        <span v-if="isPlaying">❚❚</span>
        <span v-else>▶</span>
      </button>

      <div class="info">
        <div class="name">{{ playlist.name }}</div>
        <div class="muted">{{ playlist.owner_name }} · {{ playlist.tracks.length }} morceaux</div>
      </div>

      <div class="combined-bar" @click.stop.prevent>
        <ProgressBar :percent="progressPercent" :interactive="isCurrent" @seek="onSeek" />
        <div class="time muted">{{ elapsedLabel }} / {{ totalLabel }}</div>
      </div>
    </div>
  </RouterLink>
</template>

<style scoped>
.row-link {
  display: block;
}

.playlist-row {
  display: grid;
  grid-template-columns: 44px 1fr 240px;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
  border-radius: var(--radius-md);
}

.playlist-row:hover,
.playlist-row.active {
  background: var(--bg-highlight);
}

.info .name {
  font-weight: 700;
}

.combined-bar {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.time {
  font-size: 11px;
  text-align: right;
}
</style>
