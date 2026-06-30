<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { usePlaylistsStore } from "../stores/playlists";
import { useSongsStore } from "../stores/songs";
import { usePlayerStore } from "../stores/player";
import ProgressBar from "../components/ProgressBar.vue";
import Skeleton from "../components/Skeleton.vue";

const props = defineProps({ id: { type: [String, Number], required: true } });

const playlistsStore = usePlaylistsStore();
const songsStore = useSongsStore();
const player = usePlayerStore();
const router = useRouter();

const playlist = ref(null);
const loading = ref(true);
const tracks = ref([]); // editable working copy
const addSongId = ref("");
const saving = ref(false);

async function load() {
  loading.value = true;
  try {
    playlist.value = await playlistsStore.fetchOne(props.id);
    tracks.value = [...playlist.value.tracks];
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  load();
  if (songsStore.items.length === 0) songsStore.fetchAll();
});

const availableSongs = computed(() => {
  const includedIds = new Set(tracks.value.map((t) => t.id));
  return songsStore.items.filter((s) => !includedIds.has(s.id));
});

const isCurrent = computed(() => playlist.value && player.playlistId === playlist.value.id);
const isPlaying = computed(() => isCurrent.value && player.isPlaying);
const progressPercent = computed(() => (isCurrent.value ? player.combinedProgressPercent : 0));

function moveUp(index) {
  if (index === 0) return;
  [tracks.value[index - 1], tracks.value[index]] = [tracks.value[index], tracks.value[index - 1]];
}

function moveDown(index) {
  if (index === tracks.value.length - 1) return;
  [tracks.value[index + 1], tracks.value[index]] = [tracks.value[index], tracks.value[index + 1]];
}

function removeTrack(index) {
  tracks.value.splice(index, 1);
}

function addTrack() {
  const song = songsStore.items.find((s) => s.id === Number(addSongId.value));
  if (!song) return;
  tracks.value.push(song);
  addSongId.value = "";
}

async function saveOrder() {
  saving.value = true;
  try {
    playlist.value = await playlistsStore.update(props.id, { song_ids: tracks.value.map((t) => t.id) });
    tracks.value = [...playlist.value.tracks];
  } finally {
    saving.value = false;
  }
}

async function deletePlaylist() {
  if (confirm(`Supprimer la playlist "${playlist.value.name}" ?`)) {
    if (isCurrent.value) player.stop();
    await playlistsStore.remove(props.id);
    router.push("/playlists");
  }
}

function onSeek(percent) {
  if (isCurrent.value) player.seekCombined(percent);
}
</script>

<template>
  <div v-if="loading">
    <Skeleton width="40%" height="32px" />
    <div class="card" style="margin-top: 20px">
      <Skeleton v-for="n in 4" :key="n" height="20px" style="margin-bottom: 12px" />
    </div>
  </div>

  <div v-else-if="playlist">
    <div class="header-row">
      <div>
        <h1 class="page-title">{{ playlist.name }}</h1>
        <p class="muted">{{ playlist.owner_name }} · {{ tracks.length }} morceaux</p>
      </div>
      <div class="header-actions">
        <a class="btn-secondary btn" :href="playlistsStore.downloadUrl(playlist.id)">Télécharger (.zip)</a>
        <button class="btn-secondary btn danger-text" @click="deletePlaylist">Supprimer</button>
      </div>
    </div>

    <div class="card play-card">
      <button class="btn-icon big" @click="player.playPlaylist(playlist)">
        <span v-if="isPlaying">❚❚</span>
        <span v-else>▶</span>
      </button>
      <ProgressBar class="grow" :percent="progressPercent" :interactive="isCurrent" @seek="onSeek" />
    </div>

    <div class="card">
      <h3>Morceaux</h3>
      <ul class="track-list">
        <li v-for="(track, index) in tracks" :key="track.id" class="track-row">
          <span class="position">{{ index + 1 }}</span>
          <span class="track-title">{{ track.titre || track.file_name }}</span>
          <span class="muted">{{ track.artiste || "—" }}</span>
          <span class="muted">{{ track.duree }}</span>
          <span class="track-actions">
            <button class="btn-sm" :disabled="index === 0" @click="moveUp(index)">↑</button>
            <button class="btn-sm" :disabled="index === tracks.length - 1" @click="moveDown(index)">↓</button>
            <button class="btn-sm danger" @click="removeTrack(index)">Retirer</button>
          </span>
        </li>
      </ul>

      <div class="add-row">
        <select v-model="addSongId">
          <option value="" disabled>Ajouter un morceau...</option>
          <option v-for="song in availableSongs" :key="song.id" :value="song.id">
            {{ song.titre || song.file_name }} — {{ song.artiste || "—" }}
          </option>
        </select>
        <button class="btn-secondary btn-sm" :disabled="!addSongId" @click="addTrack">Ajouter</button>
      </div>

      <div class="save-row">
        <button class="btn" :disabled="saving" @click="saveOrder">
          {{ saving ? "Enregistrement..." : "Enregistrer les modifications" }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.header-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.danger-text:hover {
  color: var(--danger);
}

.play-card {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 20px;
}

.btn-icon.big {
  width: 52px;
  height: 52px;
  font-size: 16px;
}

.grow {
  flex: 1;
}

.track-list {
  list-style: none;
  margin: 0 0 16px;
  padding: 0;
}

.track-row {
  display: grid;
  grid-template-columns: 30px 1fr 160px 60px 170px;
  align-items: center;
  gap: 12px;
  padding: 8px;
  border-radius: var(--radius-sm);
}

.track-row:hover {
  background: var(--bg-highlight);
}

.position {
  color: var(--text-secondary);
}

.track-title {
  font-weight: 600;
}

.track-actions {
  display: flex;
  gap: 6px;
  justify-content: flex-end;
}

.btn-sm {
  padding: 6px 10px;
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

.btn-sm:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.add-row {
  display: flex;
  gap: 10px;
  padding-top: 12px;
  border-top: 1px solid var(--border);
}

.add-row select {
  flex: 1;
}

.save-row {
  margin-top: 16px;
}
</style>
