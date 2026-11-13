<script setup lang="ts">
withDefaults(defineProps<{ path: string; viewBox?: string }>(), {
  viewBox: '0 0 24 24'
})
</script>

<template>
  <svg
    :viewBox="viewBox"
    fill="none"
    stroke="currentColor"
    stroke-width="1.7"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path :d="path" />
  </svg>
</template>
