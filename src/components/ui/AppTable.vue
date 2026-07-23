<script setup lang="ts">
// rowClick is optional and additive — every existing AppTable usage that
// doesn't listen for it is unaffected. When provided, rows get a pointer
// cursor and hover emphasis to signal they're clickable.
defineProps<{
  columns: { key: string; label: string; width?: string; class?: string }[]
  rows: Record<string, unknown>[]
  loading?: boolean
  emptyMessage?: string
  emptyIcon?: boolean
  clickable?: boolean
}>()

const emit = defineEmits<{ (e: 'row-click', row: Record<string, unknown>): void }>()
</script>

<template>
  <div class="overflow-x-auto rounded-2xl shadow-sm bg-surface">
    <table class="w-full min-w-[560px] text-sm">
      <!-- Head -->
      <thead>
        <tr class="bg-surface-2">
          <th
            v-for="col in columns"
            :key="col.key"
            :style="col.width ? `width: ${col.width}` : ''"
            :class="['px-4 py-3 text-left text-xs font-bold text-text-muted uppercase tracking-wider', col.class ?? '']"
          >
            {{ col.label }}
          </th>
        </tr>
      </thead>

      <!-- Loading skeleton -->
      <tbody v-if="loading">
        <tr v-for="n in 5" :key="n" class="border-b border-surface-2 last:border-0">
          <td v-for="col in columns" :key="col.key" class="px-4 py-3.5">
            <div class="h-4 rounded-lg bg-skeleton animate-pulse" :style="`width: ${50 + Math.random() * 40}%`" />
          </td>
        </tr>
      </tbody>

      <!-- Empty state -->
      <tbody v-else-if="!rows.length">
        <tr>
          <td :colspan="columns.length" class="px-4 py-16 text-center">
            <div class="flex flex-col items-center gap-3">
              <div v-if="emptyIcon !== false" class="w-12 h-12 rounded-2xl bg-surface-2 flex items-center justify-center">
                <svg class="w-5 h-5 text-text-disabled" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              </div>
              <p class="text-sm text-text-muted font-medium">{{ emptyMessage ?? 'No records found' }}</p>
            </div>
          </td>
        </tr>
      </tbody>

      <!-- Data rows -->
      <tbody v-else>
        <tr
          v-for="(row, i) in rows"
          :key="i"
          :class="[
            'border-b border-surface-2 last:border-0 hover:bg-surface-2 transition-colors duration-100',
            clickable ? 'cursor-pointer' : '',
          ]"
          @click="clickable && emit('row-click', row)"
        >
          <td
            v-for="col in columns"
            :key="col.key"
            :class="['px-4 py-3.5 text-text-primary', col.class ?? '']"
          >
            <slot :name="`cell-${col.key}`" :row="row" :value="row[col.key]">
              {{ row[col.key] ?? '—' }}
            </slot>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
