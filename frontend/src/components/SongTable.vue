<script setup>
import Skeleton from "./Skeleton.vue";
import { usePlayerStore } from "../stores/player";
import { parseDurationToSeconds } from "../utils/duration";

defineProps({
  songs: { type: Array, required: true },
  loading: { type: Boolean, default: false },
});
defineEmits(["edit", "delete"]);

const player = usePlayerStore();

function pseudoPlaylist(song) {
  return {
    id: `song-${song.id}`,
    name: song.titre || song.file_name,
    tracks: [{
      id: song.id,
      titre: song.titre,
      artiste: song.artiste,
      duree: song.duree,
      duration_seconds: parseDurationToSeconds(song.duree),
      stream_url: `/api/songs/${song.id}/stream`,
    }],
  };
}

function isPlaying(song) {
  return player.playlistId === `song-${song.id}` && player.isPlaying;
}
</script>

<template>
  <div class="song-list">
    <div class="header-row">
      <span></span>
      <span>Titre</span>
      <span>Artiste</span>
      <span>Album</span>
      <span>Genre</span>
      <span>Durée</span>
      <span></span>
    </div>

    <template v-if="loading">
      <div class="row" v-for="n in 6" :key="`sk-${n}`">
        <Skeleton width="32px" height="32px" rounded="50%" />
        <Skeleton width="70%" />
        <Skeleton width="50%" />
        <Skeleton width="50%" />
        <Skeleton width="40%" />
        <Skeleton width="30%" />
        <span></span>
      </div>
    </template>

    <template v-else>
      <div
        class="row"
        v-for="song in songs"
        :key="song.id"
        :class="{ playing: player.playlistId === `song-${song.id}` }"
      >
        <button class="btn-icon play-btn" @click="player.playPlaylist(pseudoPlaylist(song))">
          <span v-if="isPlaying(song)">❚❚</span>
          <span v-else>▶</span>
        </button>
        <span class="title-cell">{{ song.titre || song.file_name }}</span>
        <span class="muted">{{ song.artiste || "—" }}</span>
        <span class="muted">{{ song.album || "—" }}</span>
        <span class="muted">{{ song.genre || "—" }}</span>
        <span class="muted">{{ song.duree || "—" }}</span>
        <span class="actions">
          <button class="btn-secondary btn-sm" @click="$emit('edit', song)">Modifier</button>
          <button class="btn-secondary btn-sm danger" @click="$emit('delete', song)">Supprimer</button>
        </span>
      </div>
      <div class="row empty-row" v-if="songs.length === 0">
        <span class="muted empty">Aucun morceau dans la bibliothèque.</span>
      </div>
    </template>
  </div>
</template>

<style scoped>
.song-list {
  width: 100%;
}

.header-row,
.row {
  display: grid;
  grid-template-columns: 48px 2fr 1.4fr 1.4fr 1fr 80px auto;
  align-items: center;
  gap: 14px;
}

.header-row {
  padding: 10px 14px;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-secondary);
  border-bottom: 1px solid var(--border);
}

.row {
  padding: 10px 14px;
  font-size: 14px;
  border-bottom: 1px solid var(--border);
}

.row:hover,
.row.playing {
  background: var(--bg-highlight);
}

.row:last-child {
  border-bottom: none;
}

.play-btn {
  width: 32px;
  height: 32px;
  font-size: 11px;
}

.title-cell {
  font-weight: 600;
}

.actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.btn-sm {
  padding: 6px 12px;
  border-radius: var(--radius-sm);
  background: var(--bg-hover);
  font-size: 12px;
  font-weight: 600;
}

.btn-sm:hover {
  background: var(--border);
}

.btn-sm.danger:hover {
  background: var(--danger);
  color: #fff;
}

.empty-row {
  grid-template-columns: 1fr;
  justify-items: center;
}

.empty {
  padding: 24px 0;
}
</style>
