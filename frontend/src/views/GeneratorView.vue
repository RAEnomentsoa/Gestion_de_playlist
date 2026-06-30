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

const criteria = reactive({ genres: [], minutes: 20 });
const preview = ref([]);
const included = ref(new Set());
const playlistName = ref("");
const generating = ref(false);
const saving = ref(false);

onMounted(() => {
  if (songsStore.items.length === 0) songsStore.fetchAll();
});

const availableGenres = computed(() => songsStore.genres.filter((g) => !criteria.genres.includes(g)));

function addGenre(event) {
  const value = event.target.value;
  if (value && !criteria.genres.includes(value)) {
    criteria.genres.push(value);
  }
  event.target.value = "";
}

function removeGenre(genre) {
  criteria.genres = criteria.genres.filter((g) => g !== genre);
}

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
      genre: criteria.genres.length ? criteria.genres : undefined,
      target_duration_seconds: criteria.minutes * 60,
    });
    preview.value = data.tracks;
    included.value = new Set(data.tracks.map((t) => t.id));
    if (!playlistName.value) {
      playlistName.value = criteria.genres.length ? `Playlist ${criteria.genres.join(", ")}` : "Nouvelle playlist";
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
      genre: criteria.genres.length ? criteria.genres.join(", ") : null,
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
      <label class="field genre-field">
        <span>Genres</span>
        <div class="genre-picker">
          <span v-for="g in criteria.genres" :key="g" class="chip">
            {{ g }}
            <button type="button" class="chip-remove" @click="removeGenre(g)">×</button>
          </span>
          <select class="genre-add" value="" @change="addGenre($event)">
            <option value="" disabled selected>+ Ajouter un genre</option>
            <option v-for="g in availableGenres" :key="g" :value="g">{{ g }}</option>
          </select>
        </div>
        <span class="hint muted">Aucun genre sélectionné = tous les genres</span>
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

.genre-field {
  min-width: 280px;
}

.genre-picker {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  background: var(--bg-highlight);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  min-height: 38px;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 6px 4px 10px;
  border-radius: 500px;
  background: var(--accent);
  color: #000;
  font-size: 12px;
  font-weight: 700;
}

.chip-remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  font-size: 13px;
  line-height: 1;
  color: #000;
}

.chip-remove:hover {
  background: rgba(0, 0, 0, 0.2);
}

.genre-add {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  font-size: 12px;
  padding: 4px 2px;
  flex: 1;
  min-width: 120px;
}

.hint {
  font-size: 11px;
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
