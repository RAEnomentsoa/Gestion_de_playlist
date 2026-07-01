<script setup>
import { onMounted, ref, computed } from "vue";
import { usePlaylistsStore } from "../stores/playlists";
import { useUserStore } from "../stores/user";
import PlaylistRow from "../components/PlaylistRow.vue";
import Skeleton from "../components/Skeleton.vue";

const playlistsStore = usePlaylistsStore();
const userStore = useUserStore();

onMounted(() => playlistsStore.fetchAll());

// --- Fusion mode ---
const selectMode = ref(false);
const selectedIds = ref(new Set());
const showModal = ref(false);
const fusionName = ref("");
const fusionLoading = ref(false);
const fusionError = ref("");

const selectedCount = computed(() => selectedIds.value.size);

function toggleSelectMode() {
  selectMode.value = !selectMode.value;
  selectedIds.value = new Set();
  showModal.value = false;
  fusionError.value = "";
}

function toggleSelect(id) {
  const s = new Set(selectedIds.value);
  if (s.has(id)) s.delete(id);
  else s.add(id);
  selectedIds.value = s;
}

function openModal() {
  fusionName.value = "";
  fusionError.value = "";
  showModal.value = true;
}

async function confirmFusion() {
  if (!fusionName.value.trim()) {
    fusionError.value = "Veuillez entrer un nom.";
    return;
  }
  fusionLoading.value = true;
  fusionError.value = "";
  try {
    // Collect song IDs in playlist order, deduplicated
    const seen = new Set();
    const songIds = [];
    for (const playlist of playlistsStore.items) {
      if (!selectedIds.value.has(playlist.id)) continue;
      for (const track of playlist.tracks) {
        if (!seen.has(track.id)) {
          seen.add(track.id);
          songIds.push(track.id);
        }
      }
    }
    const ownerName = userStore.name || "Anonyme";
    await playlistsStore.save({
      name: fusionName.value.trim(),
      owner_name: ownerName,
      song_ids: songIds,
    });
    showModal.value = false;
    selectMode.value = false;
    selectedIds.value = new Set();
  } catch {
    fusionError.value = "Erreur lors de la création. Réessayez.";
  } finally {
    fusionLoading.value = false;
  }
}
</script>

<template>
  <div>
    <div class="header-row">
      <h1 class="page-title">Mes playlists</h1>
      <button
        v-if="!playlistsStore.loading && playlistsStore.items.length >= 2"
        class="btn"
        :class="selectMode ? 'btn-secondary' : ''"
        @click="toggleSelectMode"
      >
        {{ selectMode ? "Annuler" : "Fusionner des playlists" }}
      </button>
    </div>

    <div class="card">
      <template v-if="playlistsStore.loading">
        <div v-for="n in 4" :key="n" class="skeleton-row">
          <Skeleton width="44px" height="44px" rounded="50%" />
          <div class="skeleton-info">
            <Skeleton width="40%" height="14px" />
            <Skeleton width="25%" height="12px" />
          </div>
        </div>
      </template>

      <template v-else-if="playlistsStore.items.length === 0">
        <p class="muted">
          Aucune playlist enregistrée. Allez dans
          <RouterLink to="/generate" class="link">Générer une playlist</RouterLink>
          pour en créer une.
        </p>
      </template>

      <template v-else>
        <div
          v-for="playlist in playlistsStore.items"
          :key="playlist.id"
          class="row-wrapper"
        >
          <!-- transparent overlay that captures clicks in select mode -->
          <div
            v-if="selectMode"
            class="select-overlay"
            @click="toggleSelect(playlist.id)"
          >
            <span class="checkbox" :class="{ checked: selectedIds.has(playlist.id) }">
              <svg v-if="selectedIds.has(playlist.id)" viewBox="0 0 12 10" fill="none">
                <path d="M1 5l3.5 3.5L11 1" stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </span>
          </div>

          <div :class="{ 'row-shifted': selectMode }">
            <PlaylistRow :playlist="playlist" />
          </div>
        </div>
      </template>
    </div>

    <!-- action bar -->
    <div v-if="selectMode" class="action-bar">
      <span class="muted">{{ selectedCount }} playlist(s) sélectionnée(s)</span>
      <button
        class="btn"
        :disabled="selectedCount < 2"
        @click="openModal"
      >
        Fusionner ({{ selectedCount }})
      </button>
    </div>

    <!-- fusion modal -->
    <Teleport to="body">
      <div v-if="showModal" class="modal-backdrop" @click.self="showModal = false">
        <div class="modal">
          <h2 class="modal-title">Fusionner {{ selectedCount }} playlists</h2>
          <p class="muted">
            {{ selectedCount }} playlists · Les morceaux en double seront fusionnés.
          </p>
          <input
            v-model="fusionName"
            class="fusion-input"
            placeholder="Nom de la nouvelle playlist"
            autofocus
            @keyup.enter="confirmFusion"
          />
          <p v-if="fusionError" class="error-text">{{ fusionError }}</p>
          <div class="modal-actions">
            <button class="btn btn-secondary" @click="showModal = false">Annuler</button>
            <button
              class="btn"
              :disabled="!fusionName.trim() || fusionLoading"
              @click="confirmFusion"
            >
              {{ fusionLoading ? "Création…" : "Créer la playlist" }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.header-row .page-title {
  margin: 0;
}

.skeleton-row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
}

.skeleton-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.link {
  color: var(--accent);
  font-weight: 600;
}

/* selection mode */
.row-wrapper {
  position: relative;
}

.select-overlay {
  position: absolute;
  inset: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  padding-left: 16px;
  cursor: pointer;
}

.row-shifted {
  padding-left: 52px;
  pointer-events: none; /* prevent RouterLink navigation while in select mode */
}

.checkbox {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2px solid var(--border);
  background: var(--bg-hover);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: border-color 0.15s, background 0.15s;
}

.checkbox.checked {
  border-color: var(--accent);
  background: var(--accent);
}

.checkbox svg {
  width: 12px;
  height: 10px;
}

/* action bar */
.action-bar {
  position: fixed;
  bottom: 90px; /* above NowPlayingBar */
  left: 50%;
  transform: translateX(-50%);
  background: var(--bg-hover);
  border: 1px solid var(--border);
  border-radius: 500px;
  padding: 12px 20px;
  display: flex;
  align-items: center;
  gap: 20px;
  box-shadow: var(--shadow);
  z-index: 100;
}

/* modal */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
}

.modal {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 32px;
  width: 420px;
  max-width: 90vw;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.modal-title {
  margin: 0;
  font-size: 20px;
  font-weight: 800;
}

.fusion-input {
  width: 100%;
  font-size: 15px;
  padding: 10px 14px;
}

.error-text {
  color: var(--danger);
  font-size: 13px;
  margin: 0;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 8px;
}
</style>
