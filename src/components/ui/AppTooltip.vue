<script setup lang="ts">
import { InfoIcon } from 'lucide-vue-next'

// Contextual help for form fields — "where do I find my Registration
// Number?", "what counts as a valid Proof of Address?" etc. A small (i) icon
// next to the field label; hover/focus reveals the explanation. Deliberately
// not a permanent AppInput `hint` line — with this many KYC/KYB fields on
// one screen, always-visible hint text under every field would double the
// form's height. Pure CSS (Tailwind group-hover/group-focus-within), no
// extra JS state, no new dependency.
defineProps<{
  text: string
}>()
</script>

<template>
  <span class="group relative inline-flex items-center align-middle ml-1">
    <button
      type="button"
      tabindex="0"
      class="text-text-muted hover:text-primary focus-visible:text-primary outline-none transition-colors"
      aria-label="More information"
    >
      <InfoIcon class="w-3.5 h-3.5" />
    </button>
    <span
      role="tooltip"
      :class="[
        'pointer-events-none absolute z-20 bottom-full left-1/2 -translate-x-1/2 mb-2',
        'w-56 rounded-xl bg-text-primary text-surface text-[11px] leading-relaxed font-medium',
        'px-3 py-2 shadow-lg',
        'opacity-0 scale-95 origin-bottom transition-all duration-150',
        'group-hover:opacity-100 group-hover:scale-100 group-focus-within:opacity-100 group-focus-within:scale-100',
      ]"
    >
      {{ text }}
      <span class="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 rotate-45 bg-text-primary" />
    </span>
  </span>
</template>
