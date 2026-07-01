<script setup>
import { ref, onMounted, computed } from "vue";
import { useUserStore } from "../stores/user";
import NowPlayingBar from "./NowPlayingBar.vue";

const user = useUserStore();

onMounted(() => user.fetchAll());

// --- Login screen state ---
const selectedUserId = ref(null);
const createMode = ref(false);
const newName = ref("");
const createError = ref("");
const createLoading = ref(false);
const loginError = ref("");

const selectedUser = computed(() =>
  user.users.find((u) => u.id === Number(selectedUserId.value)) || null
);

function handleLogin() {
  if (!selectedUser.value) {
    loginError.value = "Sélectionnez un utilisateur.";
    return;
  }
  loginError.value = "";
  user.login(selectedUser.value);
}

async function handleCreate() {
  const name = newName.value.trim();
  if (!name) {
    createError.value = "Entrez un nom.";
    return;
  }
  createLoading.value = true;
  createError.value = "";
  try {
    await user.create(name);
    newName.value = "";
    createMode.value = false;
  } catch (err) {
    const msg = err?.response?.data?.error;
    createError.value = msg || "Erreur lors de la création.";
  } finally {
    createLoading.value = false;
  }
}
</script>

<template>
  <!-- ── Login screen ─────────────────────────────────────────── -->
  <div v-if="!user.isLoggedIn" class="login-screen">
    <div class="login-card">
      <div class="login-brand">Playlist<span class="brand-accent">App</span></div>
      <p class="login-sub muted">Sélectionnez ou créez votre profil</p>

      <!-- Select existing user -->
      <div class="login-section">
        <label class="login-label">Utilisateur</label>
        <select v-model="selectedUserId" class="login-select">
          <option value="" disabled selected>-- Choisir --</option>
          <option v-for="u in user.users" :key="u.id" :value="u.id">{{ u.name }}</option>
        </select>
        <p v-if="loginError" class="err">{{ loginError }}</p>
        <button
          class="btn login-btn"
          :disabled="!selectedUserId"
          @click="handleLogin"
        >
          Connexion
        </button>
      </div>

      <div class="sep-or"><span>ou</span></div>

      <!-- Create new user -->
      <div class="login-section">
        <template v-if="!createMode">
          <button class="btn btn-secondary full-width" @click="createMode = true">
            + Créer un utilisateur
          </button>
        </template>
        <template v-else>
          <label class="login-label">Nouveau nom</label>
          <input
            v-model="newName"
            class="login-input"
            placeholder="Votre nom"
            autofocus
            @keyup.enter="handleCreate"
          />
          <p v-if="createError" class="err">{{ createError }}</p>
          <div class="create-actions">
            <button class="btn btn-secondary" @click="createMode = false; createError = ''">
              Annuler
            </button>
            <button
              class="btn"
              :disabled="!newName.trim() || createLoading"
              @click="handleCreate"
            >
              {{ createLoading ? "Création…" : "Créer" }}
            </button>
          </div>
        </template>
      </div>
    </div>
  </div>

  <!-- ── Main app shell ────────────────────────────────────────── -->
  <div v-else class="shell">
    <div class="body">
      <aside class="sidebar">
        <div class="brand">Playlist<span class="brand-accent">App</span></div>

        <nav class="nav">
          <RouterLink to="/library" class="nav-link">Bibliothèque</RouterLink>
          <RouterLink to="/generate" class="nav-link">Générer une playlist</RouterLink>
          <RouterLink to="/playlists" class="nav-link">Mes playlists</RouterLink>
        </nav>

        <div class="user-box">
          <div class="user-avatar">{{ user.name.charAt(0).toUpperCase() }}</div>
          <div class="user-info">
            <div class="user-name">{{ user.name }}</div>
            <button class="change-user" @click="user.logout()">Changer</button>
          </div>
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
/* ── Login ──────────────────────────────────────────────────── */
.login-screen {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-base);
}

.login-card {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 40px 36px;
  width: 380px;
  max-width: 90vw;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.login-brand {
  font-size: 26px;
  font-weight: 800;
  text-align: center;
}

.brand-accent {
  color: var(--accent);
}

.login-sub {
  text-align: center;
  margin: -12px 0 0;
}

.login-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.login-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
}

.login-select,
.login-input {
  width: 100%;
  font-size: 14px;
  padding: 10px 12px;
}

.login-btn,
.full-width {
  width: 100%;
  justify-content: center;
}

.create-actions {
  display: flex;
  gap: 10px;
}

.create-actions .btn {
  flex: 1;
  justify-content: center;
}

.sep-or {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--text-secondary);
  font-size: 12px;
}

.sep-or::before,
.sep-or::after {
  content: "";
  flex: 1;
  height: 1px;
  background: var(--border);
}

.err {
  color: var(--danger);
  font-size: 12px;
  margin: 0;
}

/* ── Shell ──────────────────────────────────────────────────── */
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
  align-items: center;
  gap: 10px;
}

.user-avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--accent);
  color: #000;
  font-weight: 800;
  font-size: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.user-info {
  flex: 1;
  min-width: 0;
}

.user-name {
  font-weight: 700;
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.change-user {
  font-size: 11px;
  color: var(--text-secondary);
  padding: 0;
  text-decoration: underline;
  cursor: pointer;
}

.change-user:hover {
  color: var(--text-primary);
}

.content {
  flex: 1;
  overflow-y: auto;
  padding: 32px 40px;
}
</style>
