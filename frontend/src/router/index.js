import { createRouter, createWebHistory } from "vue-router";
import LibraryView from "../views/LibraryView.vue";
import GeneratorView from "../views/GeneratorView.vue";
import PlaylistsView from "../views/PlaylistsView.vue";
import PlaylistDetailView from "../views/PlaylistDetailView.vue";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", redirect: "/library" },
    { path: "/library", name: "library", component: LibraryView },
    { path: "/generate", name: "generate", component: GeneratorView },
    { path: "/playlists", name: "playlists", component: PlaylistsView },
    { path: "/playlists/:id", name: "playlist-detail", component: PlaylistDetailView, props: true },
  ],
});

export default router;
