<script setup lang="ts">
import { computed } from 'vue'
import type { CashFlowDayPoint } from '@/lib/orgApi'
import { formatMoney } from '@/lib/format'

const props = defineProps<{ points: CashFlowDayPoint[] }>()

const chartWidth = 640
const chartHeight = 180
const paddingLeft = 8
const paddingBottom = 20

const maxValue = computed(() =>
  Math.max(1, ...props.points.map((p) => Math.max(p.collections_cents, p.payouts_cents))),
)

const barGroupWidth = computed(() => (chartWidth - paddingLeft) / Math.max(props.points.length, 1))

function barHeight(cents: number): number {
  return ((chartHeight - paddingBottom) * cents) / maxValue.value
}

function shortDate(date: string): string {
  const d = new Date(date)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}
</script>

<template>
  <div class="w-full overflow-x-auto">
    <svg :viewBox="`0 0 ${chartWidth} ${chartHeight}`" class="w-full" style="min-width: 480px" preserveAspectRatio="none">
      <line :x1="paddingLeft" :y1="chartHeight - paddingBottom" :x2="chartWidth" :y2="chartHeight - paddingBottom" stroke="currentColor" class="text-border" stroke-width="1" />
      <g v-for="(p, i) in points" :key="p.date">
        <rect
          :x="paddingLeft + i * barGroupWidth + barGroupWidth * 0.15"
          :y="chartHeight - paddingBottom - barHeight(p.collections_cents)"
          :width="barGroupWidth * 0.3"
          :height="barHeight(p.collections_cents)"
          class="fill-primary"
          rx="1.5"
        >
          <title>{{ shortDate(p.date) }} — Collected KES {{ formatMoney(p.collections_cents) }}</title>
        </rect>
        <rect
          :x="paddingLeft + i * barGroupWidth + barGroupWidth * 0.5"
          :y="chartHeight - paddingBottom - barHeight(p.payouts_cents)"
          :width="barGroupWidth * 0.3"
          :height="barHeight(p.payouts_cents)"
          class="fill-warning"
          rx="1.5"
        >
          <title>{{ shortDate(p.date) }} — Paid out KES {{ formatMoney(p.payouts_cents) }}</title>
        </rect>
        <text
          v-if="points.length <= 14 || i % 2 === 0"
          :x="paddingLeft + i * barGroupWidth + barGroupWidth * 0.5"
          :y="chartHeight - 4"
          text-anchor="middle"
          class="fill-current text-text-muted"
          font-size="9"
        >
          {{ shortDate(p.date) }}
        </text>
      </g>
    </svg>
    <div class="flex items-center gap-4 mt-2 text-[11px] text-text-muted">
      <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-sm bg-primary inline-block" />Collected</span>
      <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-sm bg-warning inline-block" />Paid out</span>
    </div>
  </div>
</template>
