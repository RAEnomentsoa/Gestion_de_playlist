import { defineStore } from "pinia";

const STORAGE_KEY = "playlist-app:display-name";

export const useUserStore = defineStore("user", {
  state: () => ({
    name: localStorage.getItem(STORAGE_KEY) || "",
  }),
  actions: {
    setName(name) {
      this.name = name;
      localStorage.setItem(STORAGE_KEY, name);
    },
  },
});
