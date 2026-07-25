<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'
import type { Component } from 'vue'

export interface QuickAction {
  label: string
  icon: Component
  to: RouteLocationRaw
}

defineProps<{ actions: QuickAction[] }>()
</script>

<template>
  <section class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
    <router-link
      v-for="a in actions"
      :key="a.label"
      :to="a.to"
      class="group flex flex-col items-center justify-center gap-2.5 rounded-2xl bg-surface shadow-sm py-5 px-3 text-center transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
    >
      <span class="w-10 h-10 rounded-xl flex items-center justify-center bg-primary-muted transition-colors group-hover:bg-primary group-hover:text-white text-primary">
        <component :is="a.icon" class="w-5 h-5" />
      </span>
      <span class="text-xs font-semibold text-text-primary leading-tight">{{ a.label }}</span>
    </router-link>
  </section>
</template>
