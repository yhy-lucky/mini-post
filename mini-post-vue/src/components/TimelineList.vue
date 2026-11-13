<script setup lang="ts">
import { computed } from 'vue'
import EmptyState from '@/components/EmptyState.vue'
import EntryItem from '@/components/EntryItem.vue'
import { groupEntriesByDay } from '@/utils/group'
import type { Entry } from '@/types'

const props = defineProps<{ entries: Entry[]; now?: number; newEntryId?: string | null }>()
const emit = defineEmits<{ 'toggle-like': [id: string]; 'focus-composer': [] }>()

const groups = computed(() => groupEntriesByDay(props.entries, props.now))
</script>

<template>
  <section class="timeline-section" aria-label="心情记录">
    <div class="timeline-head">
      <h2 class="timeline-title">心情记录</h2>
      <span id="post-count" class="post-count">共 {{ entries.length }} 条</span>
    </div>

    <div v-if="entries.length" id="timeline" class="timeline">
      <section v-for="group in groups" :key="`${group.key}-${group.items[0]?.id}`" class="day-group">
        <div class="day-head">
          <span class="day-label">{{ group.label }}</span>
          <span class="day-date">{{ group.weekday }} · {{ group.items.length }} 条</span>
        </div>
        <div class="day-entries">
          <EntryItem
            v-for="entry in group.items"
            :key="entry.id"
            :entry="entry"
            :is-new="entry.id === newEntryId"
            @toggle-like="emit('toggle-like', $event)"
          />
        </div>
      </section>
    </div>

    <EmptyState v-else @focus-composer="emit('focus-composer')" />
  </section>
</template>
