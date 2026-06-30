<script setup>
const props = defineProps({
  percent: { type: Number, default: 0 },
  interactive: { type: Boolean, default: false },
});
const emit = defineEmits(["seek"]);

function onClick(event) {
  if (!props.interactive) return;
  const rect = event.currentTarget.getBoundingClientRect();
  const percent = ((event.clientX - rect.left) / rect.width) * 100;
  emit("seek", Math.min(100, Math.max(0, percent)));
}
</script>

<template>
  <div class="progress-track" :class="{ interactive }" @click="onClick">
    <div class="progress-fill" :style="{ width: `${Math.min(100, percent)}%` }" />
  </div>
</template>

<style scoped>
.progress-track {
  position: relative;
  height: 4px;
  border-radius: 2px;
  background: var(--border);
  overflow: hidden;
}

.progress-track.interactive {
  cursor: pointer;
}

.progress-fill {
  position: absolute;
  inset: 0 auto 0 0;
  background: var(--text-primary);
  border-radius: 2px;
  transition: width 0.15s linear;
}

.progress-track.interactive:hover .progress-fill {
  background: var(--accent);
}
</style>
