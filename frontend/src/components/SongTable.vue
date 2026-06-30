<script setup>
import Skeleton from "./Skeleton.vue";

defineProps({
  songs: { type: Array, required: true },
  loading: { type: Boolean, default: false },
});
defineEmits(["edit", "delete"]);
</script>

<template>
  <table class="song-table">
    <thead>
      <tr>
        <th>Titre</th>
        <th>Artiste</th>
        <th>Album</th>
        <th>Genre</th>
        <th>Durée</th>
        <th></th>
      </tr>
    </thead>
    <tbody>
      <template v-if="loading">
        <tr v-for="n in 6" :key="`sk-${n}`">
          <td><Skeleton width="70%" /></td>
          <td><Skeleton width="50%" /></td>
          <td><Skeleton width="50%" /></td>
          <td><Skeleton width="40%" /></td>
          <td><Skeleton width="30%" /></td>
          <td></td>
        </tr>
      </template>
      <template v-else>
        <tr v-for="song in songs" :key="song.id">
          <td class="title-cell">{{ song.titre || song.file_name }}</td>
          <td class="muted">{{ song.artiste || "—" }}</td>
          <td class="muted">{{ song.album || "—" }}</td>
          <td class="muted">{{ song.genre || "—" }}</td>
          <td class="muted">{{ song.duree || "—" }}</td>
          <td class="actions">
            <button class="btn-secondary btn-sm" @click="$emit('edit', song)">Modifier</button>
            <button class="btn-secondary btn-sm danger" @click="$emit('delete', song)">Supprimer</button>
          </td>
        </tr>
        <tr v-if="songs.length === 0">
          <td colspan="6" class="muted empty">Aucun morceau dans la bibliothèque.</td>
        </tr>
      </template>
    </tbody>
  </table>
</template>

<style scoped>
.song-table {
  width: 100%;
  border-collapse: collapse;
}

.song-table th {
  text-align: left;
  padding: 10px 14px;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-secondary);
  border-bottom: 1px solid var(--border);
}

.song-table td {
  padding: 12px 14px;
  border-bottom: 1px solid var(--border);
  font-size: 14px;
}

.song-table tbody tr:hover {
  background: var(--bg-highlight);
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

.empty {
  text-align: center;
  padding: 32px;
}
</style>
