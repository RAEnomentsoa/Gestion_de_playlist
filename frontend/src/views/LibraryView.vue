<script setup>
import { onMounted, ref } from "vue";
import { useSongsStore } from "../stores/songs";
import SongTable from "../components/SongTable.vue";
import SongEditModal from "../components/SongEditModal.vue";

const songsStore = useSongsStore();
const editingSong = ref(null);

onMounted(() => songsStore.fetchAll());

function openEdit(song) {
  editingSong.value = song;
}

async function saveEdit(fields) {
  await songsStore.update(editingSong.value.id, fields);
  editingSong.value = null;
}

async function deleteSong(song) {
  if (confirm(`Supprimer "${song.titre || song.file_name}" de la bibliothèque ?`)) {
    await songsStore.remove(song.id);
  }
}
</script>

<template>
  <div>
    <h1 class="page-title">Bibliothèque</h1>
    <div class="card">
      <SongTable
        :songs="songsStore.items"
        :loading="songsStore.loading"
        @edit="openEdit"
        @delete="deleteSong"
      />
    </div>

    <SongEditModal v-if="editingSong" :song="editingSong" @save="saveEdit" @close="editingSong = null" />
  </div>
</template>
