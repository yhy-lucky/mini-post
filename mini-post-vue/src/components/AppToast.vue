<script setup lang="ts">
import { useToast } from '@/composables/useToast'

const { message, visible, isError } = useToast()
</script>

<template>
  <div
    id="toast"
    class="toast"
    :class="{ 'is-visible': visible, 'is-error': isError }"
    role="status"
    aria-live="polite"
  >
    {{ message }}
  </div>
</template>
