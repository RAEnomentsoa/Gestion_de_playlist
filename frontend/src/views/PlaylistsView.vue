<script setup>
import { onMounted } from "vue";
import { usePlaylistsStore } from "../stores/playlists";
import PlaylistRow from "../components/PlaylistRow.vue";
import Skeleton from "../components/Skeleton.vue";

const playlistsStore = usePlaylistsStore();

onMounted(() => playlistsStore.fetchAll());
</script>

<template>
  <div>
    <h1 class="page-title">Mes playlists</h1>

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
        <PlaylistRow v-for="playlist in playlistsStore.items" :key="playlist.id" :playlist="playlist" />
      </template>
    </div>
  </div>
</template>

<style scoped>
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
</style>
