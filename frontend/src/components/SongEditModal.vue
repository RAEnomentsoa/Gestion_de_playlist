<script setup>
import { reactive, watch } from "vue";

const props = defineProps({
  song: { type: Object, required: true },
});
const emit = defineEmits(["save", "close"]);

const form = reactive({
  titre: "",
  artiste: "",
  album: "",
  genre: "",
  date_sortie: "",
  langue: "",
});

watch(
  () => props.song,
  (song) => {
    form.titre = song.titre || "";
    form.artiste = song.artiste || "";
    form.album = song.album || "";
    form.genre = song.genre || "";
    form.date_sortie = song.date_sortie || "";
    form.langue = song.langue || "";
  },
  { immediate: true }
);

function submit() {
  emit("save", { ...form });
}
</script>

<template>
  <div class="overlay" @click.self="$emit('close')">
    <div class="modal card">
      <h3>Modifier le morceau</h3>

      <label class="field">
        <span>Titre</span>
        <input v-model="form.titre" />
      </label>
      <label class="field">
        <span>Artiste</span>
        <input v-model="form.artiste" />
      </label>
      <label class="field">
        <span>Album</span>
        <input v-model="form.album" />
      </label>
      <label class="field">
        <span>Genre</span>
        <input v-model="form.genre" />
      </label>
      <label class="field">
        <span>Date de sortie</span>
        <input v-model="form.date_sortie" />
      </label>
      <label class="field">
        <span>Langue</span>
        <input v-model="form.langue" placeholder="ex: fr, en, mg" />
      </label>

      <div class="modal-actions">
        <button class="btn-secondary btn-sm" @click="$emit('close')">Annuler</button>
        <button class="btn" @click="submit">Enregistrer</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
}

.modal {
  width: 420px;
  box-shadow: var(--shadow);
}

.modal h3 {
  margin: 0 0 16px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 12px;
  font-size: 13px;
  color: var(--text-secondary);
}

.field input {
  width: 100%;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 16px;
}
</style>
