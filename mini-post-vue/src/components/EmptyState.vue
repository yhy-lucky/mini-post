<script setup lang="ts">
const emit = defineEmits<{ 'focus-composer': [] }>()
</script>

<template>
  <div id="empty-state" class="empty">
    <span class="empty-icon" aria-hidden="true">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M6 4h9.5A2.5 2.5 0 0 1 18 6.5V20l-3-1.6L12 20l-3-1.6L6 20V4z" />
        <path d="M9 9h6M9 12.5h4" />
      </svg>
    </span>
    <p class="empty-title">还没有写下今天的心情</p>
    <p class="empty-desc">选一个心情，写几句话，这一天就会被温柔地记住。</p>
    <button id="empty-action" type="button" class="btn-ghost" @click="emit('focus-composer')">写下第一条</button>
  </div>
</template>
