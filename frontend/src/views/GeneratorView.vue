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

const criteria = reactive({
  includeGenres: [],
  excludeGenres: [],
  includeArtists: [],
  excludeArtists: [],
  includeAlbums: [],
  includeLangues: [],
  year_min: "",
  year_max: "",
  minutes: 30,
});

const preview = ref([]);
const included = ref(new Set());
const playlistName = ref("");
const generating = ref(false);
const saving = ref(false);

onMounted(() => {
  if (songsStore.items.length === 0) songsStore.fetchAll();
});

const availableIncludeGenres   = computed(() => songsStore.genres.filter((g)  => !criteria.includeGenres.includes(g)   && !criteria.excludeGenres.includes(g)));
const availableExcludeGenres   = computed(() => songsStore.genres.filter((g)  => !criteria.excludeGenres.includes(g)   && !criteria.includeGenres.includes(g)));
const availableIncludeArtists  = computed(() => songsStore.artists.filter((a) => !criteria.includeArtists.includes(a)  && !criteria.excludeArtists.includes(a)));
const availableExcludeArtists  = computed(() => songsStore.artists.filter((a) => !criteria.excludeArtists.includes(a)  && !criteria.includeArtists.includes(a)));
const availableIncludeAlbums   = computed(() => songsStore.albums.filter((a)  => !criteria.includeAlbums.includes(a)));
const availableIncludeLangues  = computed(() => songsStore.langues.filter((l) => !criteria.includeLangues.includes(l)));

const includedTracks = computed(() => preview.value.filter((t) => included.value.has(t.id)));
const totalSeconds   = computed(() => includedTracks.value.reduce((sum, t) => sum + t.duration_seconds, 0));
const totalLabel     = computed(() => { const m = Math.floor(totalSeconds.value / 60); const s = totalSeconds.value % 60; return `${m}:${String(s).padStart(2, "0")}`; });

function addChip(arr, event) {
  const v = event.target.value;
  if (v && !arr.includes(v)) arr.push(v);
  event.target.value = "";
}
function removeChip(arr, value) {
  const i = arr.indexOf(value);
  if (i !== -1) arr.splice(i, 1);
}

async function generate() {
  generating.value = true;
  try {
    const data = await playlistsStore.generatePreview({
      genre:          criteria.includeGenres.length  ? criteria.includeGenres  : undefined,
      exclude_genre:  criteria.excludeGenres.length  ? criteria.excludeGenres  : undefined,
      artiste:        criteria.includeArtists.length ? criteria.includeArtists : undefined,
      exclude_artist: criteria.excludeArtists.length ? criteria.excludeArtists : undefined,
      album:          criteria.includeAlbums.length  ? criteria.includeAlbums  : undefined,
      langue:         criteria.includeLangues.length ? criteria.includeLangues : undefined,
      year_min:       criteria.year_min ? Number(criteria.year_min) : undefined,
      year_max:       criteria.year_max ? Number(criteria.year_max) : undefined,
      target_duration_seconds: criteria.minutes * 60,
    });
    preview.value = data.tracks;
    included.value = new Set(data.tracks.map((t) => t.id));
    if (!playlistName.value) {
      const parts = [...criteria.includeGenres, ...criteria.includeArtists].filter(Boolean);
      playlistName.value = parts.length ? `Playlist ${parts.join(", ")}` : "Nouvelle playlist";
    }
  } finally {
    generating.value = false;
  }
}

function toggleTrack(id) {
  if (included.value.has(id)) included.value.delete(id);
  else included.value.add(id);
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
      genre: [...criteria.includeGenres, ...criteria.excludeGenres.map((g) => `!${g}`)].join(", ") || null,
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
  <div class="layout">
    <!-- ── left: filters ────────────────────────────────── -->
    <div class="card filters-card">
      <h2 class="section-title">Générer une playlist</h2>

      <!-- ── Genres ── -->
      <div class="filter-group">
        <span class="group-label">Genre(s) Musical(aux)</span>
        <div class="group-row">
          <label class="sub-field">
            <span class="hint muted">Inclure</span>
            <div class="chip-box">
              <span v-for="g in criteria.includeGenres" :key="g" class="chip chip-include">
                {{ g }}<button type="button" @click="removeChip(criteria.includeGenres, g)">×</button>
              </span>
              <select v-if="availableIncludeGenres.length" @change="addChip(criteria.includeGenres, $event)">
                <option value="" disabled selected>+ Ajouter</option>
                <option v-for="g in availableIncludeGenres" :key="g" :value="g">{{ g }}</option>
              </select>
            </div>
          </label>
          <label class="sub-field">
            <span class="hint muted">Exclure</span>
            <div class="chip-box">
              <span v-for="g in criteria.excludeGenres" :key="g" class="chip chip-exclude">
                {{ g }}<button type="button" @click="removeChip(criteria.excludeGenres, g)">×</button>
              </span>
              <select v-if="availableExcludeGenres.length" @change="addChip(criteria.excludeGenres, $event)">
                <option value="" disabled selected>+ Exclure</option>
                <option v-for="g in availableExcludeGenres" :key="g" :value="g">{{ g }}</option>
              </select>
            </div>
          </label>
        </div>
      </div>

      <div class="sep" />

      <!-- ── Artistes ── -->
      <div class="filter-group">
        <span class="group-label">Artiste(s)</span>
        <div class="group-row">
          <label class="sub-field">
            <span class="hint muted">Inclure</span>
            <div class="chip-box">
              <span v-for="a in criteria.includeArtists" :key="a" class="chip chip-include">
                {{ a }}<button type="button" @click="removeChip(criteria.includeArtists, a)">×</button>
              </span>
              <select v-if="availableIncludeArtists.length" @change="addChip(criteria.includeArtists, $event)">
                <option value="" disabled selected>+ Ajouter</option>
                <option v-for="a in availableIncludeArtists" :key="a" :value="a">{{ a }}</option>
              </select>
            </div>
          </label>
          <label class="sub-field">
            <span class="hint muted">Exclure</span>
            <div class="chip-box">
              <span v-for="a in criteria.excludeArtists" :key="a" class="chip chip-exclude">
                {{ a }}<button type="button" @click="removeChip(criteria.excludeArtists, a)">×</button>
              </span>
              <select v-if="availableExcludeArtists.length" @change="addChip(criteria.excludeArtists, $event)">
                <option value="" disabled selected>+ Exclure</option>
                <option v-for="a in availableExcludeArtists" :key="a" :value="a">{{ a }}</option>
              </select>
            </div>
          </label>
        </div>
      </div>

      <div class="sep" />

      <!-- ── Albums ── -->
      <div class="filter-group">
        <span class="group-label">Album(s)</span>
        <div class="chip-box">
          <span v-for="a in criteria.includeAlbums" :key="a" class="chip chip-include">
            {{ a }}<button type="button" @click="removeChip(criteria.includeAlbums, a)">×</button>
          </span>
          <select v-if="availableIncludeAlbums.length" @change="addChip(criteria.includeAlbums, $event)">
            <option value="" disabled selected>+ Ajouter un album</option>
            <option v-for="a in availableIncludeAlbums" :key="a" :value="a">{{ a }}</option>
          </select>
        </div>
      </div>

      <div class="sep" />

      <!-- ── Misc ── -->
      <div class="filter-group date-group">
        <div class="group-row">
          <label class="sub-field">
            <span class="group-label">Année min</span>
            <input v-model="criteria.year_min" type="number" placeholder="Min" style="width:100px ;"/>
          </label>
          <label class="sub-field">
            <span class="group-label">Année max</span>
            <input v-model="criteria.year_max" type="number" placeholder="Max" style="width:100px ;" />
          </label>
        </div>
      </div>

      <div class="sep" />

      <div class="filter-group">
        <span class="group-label">Langue(s)</span>
        <div class="chip-box">
          <span v-for="l in criteria.includeLangues" :key="l" class="chip chip-include">
            {{ l }}<button type="button" @click="removeChip(criteria.includeLangues, l)">×</button>
          </span>
          <select v-if="availableIncludeLangues.length" @change="addChip(criteria.includeLangues, $event)">
            <option value="" disabled selected>+ Ajouter</option>
            <option v-for="l in availableIncludeLangues" :key="l" :value="l">{{ l }}</option>
          </select>
          <span v-else-if="criteria.includeLangues.length === 0" class="muted" style="font-size:12px">
            Définir via Modifier dans la Bibliothèque
          </span>
        </div>
        <span class="hint muted">Vide = toutes les langues</span>
      </div>

      <div class="sep" />

      <label class="field">
        <span class="group-label">Durée totale souhaitée (minutes)</span>
        <input v-model.number="criteria.minutes" type="number" min="1" />
      </label>

      <button class="btn generate-btn" :disabled="generating" @click="generate">
        {{ generating ? "Génération..." : "Générer la Playlist ✦" }}
      </button>
    </div>

    <!-- ── right: preview ───────────────────────────────── -->
    <div v-if="preview.length" class="card preview-card">
      <div class="preview-header">
        <div>
          <h3>Aperçu de la Sélection</h3>
          <span class="muted">Morceaux : {{ includedTracks.length }}</span>
          &nbsp;·&nbsp;
          <span class="muted">Durée totale : {{ totalLabel }} (Cible : {{ criteria.minutes }}min)</span>
        </div>
        <input v-model="playlistName" class="name-input" placeholder="Nom de la playlist" />
      </div>

      <ul class="track-list">
        <li v-for="(track, i) in preview" :key="track.id">
          <label class="track-row">
            <span class="track-num muted">{{ i + 1 }}.</span>
            <span class="track-main">
              <span class="track-title">{{ track.titre || "Sans titre" }}</span>
              <span class="muted track-artist">{{ track.artiste || "—" }}</span>
            </span>
            <span class="muted">{{ track.duree }}</span>
            <input type="checkbox" :checked="included.has(track.id)" @change="toggleTrack(track.id)" />
          </label>
        </li>
      </ul>

      <button class="btn save-btn" :disabled="saving || includedTracks.length === 0" @click="savePlaylist">
        {{ saving ? "Enregistrement..." : "Enregistrer la Playlist dans mon Espace" }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.layout {
  display: grid;
  grid-template-columns: 360px 1fr;
  gap: 24px;
  align-items: start;
}

.section-title {
  margin: 0 0 20px;
  font-size: 20px;
  font-weight: 800;
}

.filters-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.sep {
  border: none;
  border-top: 1px solid var(--border);
  margin: 4px 0;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.group-label {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-primary);
}

.date-group {
  background: var(--bg-hover);
  border-radius: var(--radius-sm);
  padding: 10px 12px;
}

.date-group input {
  background: var(--bg-elevated);
  text-align: center;
}

.group-row {
  display: flex;
  gap: 10px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  color: var(--text-secondary);
}

.sub-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  color: var(--text-secondary);
  flex: 1;
}

.chip-box {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  background: var(--bg-hover);
  border-radius: var(--radius-sm);
  min-height: 38px;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 6px 4px 10px;
  border-radius: 500px;
  font-size: 12px;
  font-weight: 700;
}

.chip-include {
  background: var(--accent);
  color: #000;
}

.chip-exclude {
  background: var(--danger);
  color: #fff;
}

.chip button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  font-size: 13px;
}

.chip-include button:hover { background: rgba(0,0,0,.2); }
.chip-exclude button:hover { background: rgba(255,255,255,.2); }

.chip-box select {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  font-size: 12px;
  padding: 4px 2px;
  flex: 1;
  min-width: 100px;
}

.hint { font-size: 11px; }

.generate-btn {
  width: 100%;
  justify-content: center;
  margin-top: 4px;
}

/* preview */
.preview-card {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.preview-header h3 {
  margin: 0 0 6px;
}

.name-input {
  width: 100%;
  margin-top: 10px;
}

.track-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.track-row {
  display: grid;
  grid-template-columns: 24px 1fr 60px 20px;
  align-items: center;
  gap: 10px;
  padding: 8px;
  border-radius: var(--radius-sm);
  cursor: pointer;
}

.track-row:hover { background: var(--bg-highlight); }

.track-num { font-size: 12px; }
.track-main { display: flex; flex-direction: column; gap: 2px; }
.track-title { font-weight: 600; font-size: 14px; }
.track-artist { font-size: 12px; }

.save-btn {
  width: 100%;
  justify-content: center;
}
</style>
