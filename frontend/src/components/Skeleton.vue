<script setup>
defineProps({
  width: { type: String, default: "100%" },
  height: { type: String, default: "16px" },
  rounded: { type: String, default: "var(--radius-sm)" },
});
</script>

<template>
  <div class="skeleton" :style="{ width, height, borderRadius: rounded }" />
</template>
