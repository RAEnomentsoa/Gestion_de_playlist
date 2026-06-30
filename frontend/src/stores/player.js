import { defineStore } from "pinia";
import { ref, computed } from "vue";

const API_ORIGIN = "http://localhost:8080";

// One shared <audio> for the whole app — starting a new playlist always
// stops whatever else was playing, same as Spotify.
const audio = new Audio();

export const usePlayerStore = defineStore("player", () => {
  const playlistId = ref(null);
  const playlistName = ref("");
  const tracks = ref([]);
  const trackIndex = ref(0);
  const isPlaying = ref(false);
  const currentTime = ref(0);

  const currentTrack = computed(() => tracks.value[trackIndex.value] || null);
  const elapsedBeforeCurrentTrack = computed(() =>
    tracks.value.slice(0, trackIndex.value).reduce((sum, t) => sum + t.duration_seconds, 0)
  );
  const combinedTotal = computed(() => tracks.value.reduce((sum, t) => sum + t.duration_seconds, 0));
  const combinedElapsed = computed(() => elapsedBeforeCurrentTrack.value + currentTime.value);
  const combinedProgressPercent = computed(() =>
    combinedTotal.value > 0 ? (combinedElapsed.value / combinedTotal.value) * 100 : 0
  );

  function loadTrack(index, autoplay) {
    trackIndex.value = index;
    audio.src = `${API_ORIGIN}${tracks.value[index].stream_url}`;
    if (autoplay) audio.play();
  }

  function playPlaylist(playlist) {
    if (playlistId.value === playlist.id) {
      togglePause();
      return;
    }
    playlistId.value = playlist.id;
    playlistName.value = playlist.name || "";
    tracks.value = playlist.tracks;
    currentTime.value = 0;
    loadTrack(0, true);
  }

  function togglePause() {
    if (audio.paused) {
      audio.play();
    } else {
      audio.pause();
    }
  }

  function stop() {
    audio.pause();
    playlistId.value = null;
    playlistName.value = "";
    tracks.value = [];
    trackIndex.value = 0;
    currentTime.value = 0;
  }

  function seekCombined(percent) {
    if (combinedTotal.value <= 0) return;
    let targetSeconds = (percent / 100) * combinedTotal.value;
    let index = 0;
    while (index < tracks.value.length - 1 && targetSeconds > tracks.value[index].duration_seconds) {
      targetSeconds -= tracks.value[index].duration_seconds;
      index += 1;
    }
    if (index !== trackIndex.value) {
      loadTrack(index, isPlaying.value);
    }
    audio.currentTime = targetSeconds;
    currentTime.value = targetSeconds;
  }

  audio.addEventListener("timeupdate", () => {
    currentTime.value = audio.currentTime;
  });
  audio.addEventListener("play", () => {
    isPlaying.value = true;
  });
  audio.addEventListener("pause", () => {
    isPlaying.value = false;
  });
  audio.addEventListener("ended", () => {
    if (trackIndex.value + 1 < tracks.value.length) {
      loadTrack(trackIndex.value + 1, true);
    } else {
      stop();
    }
  });

  return {
    playlistId,
    playlistName,
    trackIndex,
    currentTrack,
    isPlaying,
    combinedTotal,
    combinedElapsed,
    combinedProgressPercent,
    playPlaylist,
    togglePause,
    stop,
    seekCombined,
  };
});
