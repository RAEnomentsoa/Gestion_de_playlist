<script setup>
import { ref } from "vue";
import { useUserStore } from "../stores/user";
import NowPlayingBar from "./NowPlayingBar.vue";

const user = useUserStore();
const editingName = ref(!user.name);
const draftName = ref(user.name);

function saveName() {
  const trimmed = draftName.value.trim();
  if (trimmed) {
    user.setName(trimmed);
    editingName.value = false;
  }
}
</script>

<template>
  <div class="shell">
    <div class="body">
      <aside class="sidebar">
        <div class="brand">Playlist<span class="brand-accent">App</span></div>

        <nav class="nav">
          <RouterLink to="/library" class="nav-link">Bibliothèque</RouterLink>
          <RouterLink to="/generate" class="nav-link">Générer une playlist</RouterLink>
          <RouterLink to="/playlists" class="nav-link">Mes playlists</RouterLink>
        </nav>

        <div class="user-box">
          <template v-if="editingName">
            <input
              v-model="draftName"
              placeholder="Votre nom"
              @keyup.enter="saveName"
            />
            <button class="btn" :disabled="!draftName.trim()" @click="saveName">OK</button>
          </template>
          <template v-else>
            <div class="user-name" @click="editingName = true" title="Changer de nom">
              {{ user.name }}
            </div>
          </template>
        </div>
      </aside>

      <main class="content">
        <slot />
      </main>
    </div>

    <NowPlayingBar />
  </div>
</template>

<style scoped>
.shell {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.body {
  display: flex;
  flex: 1;
  min-height: 0;
}

.sidebar {
  width: 240px;
  flex-shrink: 0;
  background: var(--bg-base);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  padding: 20px 14px;
}

.brand {
  font-size: 20px;
  font-weight: 800;
  padding: 8px 10px 24px;
}

.brand-accent {
  color: var(--accent);
}

.nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.nav-link {
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  font-weight: 600;
  font-size: 14px;
}

.nav-link:hover {
  color: var(--text-primary);
  background: var(--bg-highlight);
}

.nav-link.router-link-active {
  color: var(--text-primary);
  background: var(--bg-highlight);
}

.user-box {
  padding-top: 16px;
  border-top: 1px solid var(--border);
  display: flex;
  gap: 8px;
  align-items: center;
}

.user-box input {
  flex: 1;
  min-width: 0;
}

.user-name {
  width: 100%;
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
}

.user-name:hover {
  background: var(--bg-highlight);
}

.content {
  flex: 1;
  overflow-y: auto;
  padding: 32px 40px;
}
</style>
