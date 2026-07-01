import { defineStore } from "pinia";
import api from "../services/api";

const STORAGE_KEY = "playlist-app:active-user";

export const useUserStore = defineStore("user", {
  state: () => ({
    active: JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"), // {id, name} or null
    users: [],
    loading: false,
  }),
  getters: {
    name: (state) => state.active?.name || "",
    isLoggedIn: (state) => !!state.active,
  },
  actions: {
    async fetchAll() {
      this.loading = true;
      try {
        const { data } = await api.get("/users");
        this.users = data;
      } finally {
        this.loading = false;
      }
    },
    async create(name) {
      const { data } = await api.post("/users", { name });
      this.users.push(data);
      this.login(data);
      return data;
    },
    login(user) {
      this.active = user;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    },
    logout() {
      this.active = null;
      localStorage.removeItem(STORAGE_KEY);
    },
  },
});
