<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { useSongsStore } from "../stores/songs";
import { usePlaylistsStore } from "../stores/playlists";
import { useUserStore } from "../stores/user";

const songsStore = useSongsStore();
const playlistsStore = usePlaylistsStore();
const userStore = useUserStore();
const router = useRouter();

const criteria = reactive({ genre: "", minutes: 20 });
const preview = ref([]);
const included = ref(new Set());
const playlistName = ref("");
const generating = ref(false);
const saving = ref(false);

onMounted(() => {
  if (songsStore.items.length === 0) songsStore.fetchAll();
});

const includedTracks = computed(() => preview.value.filter((t) => included.value.has(t.id)));
const totalSeconds = computed(() => includedTracks.value.reduce((sum, t) => sum + t.duration_seconds, 0));
const totalLabel = computed(() => {
  const m = Math.floor(totalSeconds.value / 60);
  const s = totalSeconds.value % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
});

async function generate() {
  generating.value = true;
  try {
    const data = await playlistsStore.generatePreview({
      genre: criteria.genre || undefined,
      target_duration_seconds: criteria.minutes * 60,
    });
    preview.value = data.tracks;
    included.value = new Set(data.tracks.map((t) => t.id));
    if (!playlistName.value) {
      playlistName.value = criteria.genre ? `Playlist ${criteria.genre}` : "Nouvelle playlist";
    }
  } finally {
    generating.value = false;
  }
}

function toggleTrack(id) {
  if (included.value.has(id)) {
    included.value.delete(id);
  } else {
    included.value.add(id);
  }
  // trigger reactivity on the Set
  included.value = new Set(included.value);
}

async function savePlaylist() {
  if (!userStore.name) {
    alert("Entrez votre nom dans la barre latérale avant d'enregistrer une playlist.");
    return;
  }
  saving.value = true;
  try {
    const playlist = await playlistsStore.save({
      name: playlistName.value || "Playlist",
      owner_name: userStore.name,
      genre: criteria.genre || null,
      target_duration: criteria.minutes * 60,
      song_ids: includedTracks.value.map((t) => t.id),
    });
    router.push(`/playlists/${playlist.id}`);
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div>
    <h1 class="page-title">Générer une playlist</h1>

    <div class="card form-card">
      <label class="field">
        <span>Genre</span>
        <select v-model="criteria.genre">
          <option value="">Tous les genres</option>
          <option v-for="g in songsStore.genres" :key="g" :value="g">{{ g }}</option>
        </select>
      </label>

      <label class="field">
        <span>Durée cible (minutes)</span>
        <input v-model.number="criteria.minutes" type="number" min="1" />
      </label>

      <button class="btn" :disabled="generating" @click="generate">
        {{ generating ? "Génération..." : "Générer" }}
      </button>
    </div>

    <div v-if="preview.length" class="card preview-card">
      <div class="preview-header">
        <h3>Aperçu — {{ includedTracks.length }} morceaux, {{ totalLabel }}</h3>
        <span class="muted">Décochez pour exclure un morceau</span>
      </div>

      <ul class="track-list">
        <li v-for="track in preview" :key="track.id">
          <label class="track-row">
            <input type="checkbox" :checked="included.has(track.id)" @change="toggleTrack(track.id)" />
            <span class="track-title">{{ track.titre || "Sans titre" }}</span>
            <span class="muted">{{ track.artiste || "—" }}</span>
            <span class="muted">{{ track.duree }}</span>
          </label>
        </li>
      </ul>

      <div class="save-row">
        <input v-model="playlistName" placeholder="Nom de la playlist" class="name-input" />
        <button class="btn" :disabled="saving || includedTracks.length === 0" @click="savePlaylist">
          {{ saving ? "Enregistrement..." : "Enregistrer la playlist" }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.form-card {
  display: flex;
  gap: 20px;
  align-items: flex-end;
  margin-bottom: 24px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  color: var(--text-secondary);
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 12px;
}

.preview-header h3 {
  margin: 0;
}

.track-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.track-row {
  display: grid;
  grid-template-columns: 24px 1fr 160px 60px;
  align-items: center;
  gap: 12px;
  padding: 10px 8px;
  border-radius: var(--radius-sm);
  cursor: pointer;
}

.track-row:hover {
  background: var(--bg-highlight);
}

.track-title {
  font-weight: 600;
}

.save-row {
  display: flex;
  gap: 12px;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
}

.name-input {
  flex: 1;
}
</style>
