<script setup>
import { onMounted, ref } from "vue";
import { useSongsStore } from "../stores/songs";
import SongTable from "../components/SongTable.vue";
import SongEditModal from "../components/SongEditModal.vue";
import api from "../services/api";

const songsStore = useSongsStore();
const editingSong = ref(null);

const fileInput = ref(null);
const selectedFile = ref(null);
const uploading = ref(false);
const uploadMsg = ref(null); // { type: 'success'|'error', text }

onMounted(() => songsStore.fetchAll());

function onFileChange(e) {
  selectedFile.value = e.target.files[0] || null;
  uploadMsg.value = null;
}

async function uploadFile() {
  if (!selectedFile.value) return;
  uploading.value = true;
  uploadMsg.value = null;
  try {
    const form = new FormData();
    form.append("file", selectedFile.value);
    const { data } = await api.post("/upload", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    uploadMsg.value = {
      type: "success",
      text: `✓ "${data.filename}" ajouté dans New_music — le pipeline le traitera automatiquement.`,
    };
    selectedFile.value = null;
    if (fileInput.value) fileInput.value.value = "";
  } catch (err) {
    uploadMsg.value = {
      type: "error",
      text: err.response?.data?.error || "Erreur lors de l'envoi.",
    };
  } finally {
    uploading.value = false;
  }
}

function openEdit(song) { editingSong.value = song; }

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

    <!-- ── upload widget ── -->
    <div class="card upload-card">
      <span class="upload-label">Uploader un nouveau morceau (.mp3)</span>
      <div class="upload-row">
        <label class="file-picker">
          <input
            ref="fileInput"
            type="file"
            accept=".mp3,audio/mpeg"
            @change="onFileChange"
          />
          <span class="file-btn btn-secondary btn">Choisir un fichier</span>
          <span class="file-name muted">{{ selectedFile ? selectedFile.name : "Aucun fichier choisi" }}</span>
        </label>
        <button class="btn" :disabled="!selectedFile || uploading" @click="uploadFile">
          {{ uploading ? "Envoi..." : "Ajouter à la bibliothèque" }}
        </button>
      </div>
      <p v-if="uploadMsg" class="upload-msg" :class="uploadMsg.type">{{ uploadMsg.text }}</p>
    </div>

    <!-- ── song list ── -->
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

<style scoped>
.upload-card {
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.upload-label {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-secondary);
}

.upload-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.file-picker {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}

.file-picker input[type="file"] {
  display: none;
}

.file-btn {
  white-space: nowrap;
  font-size: 13px;
  padding: 8px 16px;
}

.file-name {
  font-size: 13px;
  max-width: 240px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.upload-msg {
  margin: 0;
  font-size: 13px;
  padding: 8px 12px;
  border-radius: var(--radius-sm);
}

.upload-msg.success {
  background: rgba(29, 185, 84, 0.12);
  color: var(--accent);
}

.upload-msg.error {
  background: rgba(231, 76, 60, 0.12);
  color: var(--danger);
}
</style>
