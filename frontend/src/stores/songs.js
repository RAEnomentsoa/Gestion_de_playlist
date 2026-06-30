import { defineStore } from "pinia";
import api from "../services/api";

export const useSongsStore = defineStore("songs", {
  state: () => ({
    items: [],
    loading: false,
  }),
  getters: {
    genres(state)  { return [...new Set(state.items.map((s) => s.genre).filter(Boolean))].sort(); },
    artists(state) { return [...new Set(state.items.map((s) => s.artiste).filter(Boolean))].sort(); },
    albums(state)  { return [...new Set(state.items.map((s) => s.album).filter(Boolean))].sort(); },
    langues(state) { return [...new Set(state.items.map((s) => s.langue).filter(Boolean))].sort(); },
  },
  actions: {
    async fetchAll() {
      this.loading = true;
      try {
        const { data } = await api.get("/songs");
        this.items = data;
      } finally {
        this.loading = false;
      }
    },
    async update(id, fields) {
      const song = this.items.find((s) => s.id === id);
      await api.post("/songs", { absolute_path: song.absolute_path, file_name: song.file_name, ...fields });
      await this.fetchAll();
    },
    async remove(id) {
      await api.delete(`/songs/${id}`);
      this.items = this.items.filter((s) => s.id !== id);
    },
  },
});
