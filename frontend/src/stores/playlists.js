import { defineStore } from "pinia";
import api from "../services/api";
import { useUserStore } from "./user";

export const usePlaylistsStore = defineStore("playlists", {
  state: () => ({
    items: [],
    loading: false,
    preview: null,
  }),
  actions: {
    async fetchAll() {
      this.loading = true;
      try {
        const userStore = useUserStore();
        const params = userStore.name ? { owner_name: userStore.name } : {};
        const { data } = await api.get("/playlists", { params });
        this.items = data;
      } finally {
        this.loading = false;
      }
    },
    async generatePreview({ genre, exclude_genre, artiste, exclude_artist, album, langue, year_min, year_max, target_duration_seconds }) {
      const { data } = await api.post("/playlists/generate", {
        genre, exclude_genre, artiste, exclude_artist, album, langue, year_min, year_max, target_duration_seconds,
      });
      this.preview = data;
      return data;
    },
    async save({ name, owner_name, genre, target_duration, song_ids }) {
      const { data } = await api.post("/playlists", { name, owner_name, genre, target_duration, song_ids });
      this.items.unshift(data);
      this.preview = null;
      return data;
    },
    async fetchOne(id) {
      const { data } = await api.get(`/playlists/${id}`);
      return data;
    },
    async update(id, fields) {
      const { data } = await api.put(`/playlists/${id}`, fields);
      const index = this.items.findIndex((p) => p.id === Number(id));
      if (index !== -1) this.items[index] = data;
      return data;
    },
    async remove(id) {
      await api.delete(`/playlists/${id}`);
      this.items = this.items.filter((p) => p.id !== Number(id));
    },
    downloadUrl(id) {
      return `http://localhost:8080/api/playlists/${id}/download`;
    },
  },
});
