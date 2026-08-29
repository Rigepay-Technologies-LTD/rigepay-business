<script setup lang="ts">
import { computed } from 'vue'
import { formatMoney } from '@/lib/format'
import type { SupplierLineItem } from '@/lib/orgApi'
import { PlusIcon, Trash2Icon } from 'lucide-vue-next'

const props = defineProps<{ modelValue: SupplierLineItem[] }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: SupplierLineItem[]): void }>()

function update(rows: SupplierLineItem[]) {
  emit('update:modelValue', rows)
}
function addRow() {
  update([...props.modelValue, { description: '', quantity_milli: 1000, unit_price_cents: 0, tax_rate_bps: 0, discount_cents: 0 }])
}
function removeRow(i: number) {
  update(props.modelValue.filter((_, idx) => idx !== i))
}

function lineSub(r: SupplierLineItem) {
  const qty = (r.quantity_milli ?? 1000) / 1000
  return Math.round((r.unit_price_cents || 0) * qty)
}
function lineTax(r: SupplierLineItem) {
  const bps = r.tax_rate_bps || 0
  if (bps > 0) {
    return Math.max(0, Math.round(((lineSub(r) - (r.discount_cents || 0)) * bps) / 10000))
  }
  return r.tax_cents || 0
}
function lineTotal(r: SupplierLineItem) {
  return lineSub(r) + lineTax(r) - (r.discount_cents || 0)
}

const subtotal = computed(() => props.modelValue.reduce((s, r) => s + lineSub(r), 0))
const taxTotal = computed(() => props.modelValue.reduce((s, r) => s + lineTax(r), 0))
const discountTotal = computed(() => props.modelValue.reduce((s, r) => s + (r.discount_cents || 0), 0))
const total = computed(() => subtotal.value + taxTotal.value - discountTotal.value)

function setTaxRate(r: SupplierLineItem, raw: string) {
  const pct = parseFloat(raw || '0')
  r.tax_rate_bps = Number.isFinite(pct) && pct > 0 ? Math.round(pct * 100) : 0
  r.tax_cents = lineTax(r)
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="overflow-x-auto">
      <table class="w-full min-w-176 text-sm">
        <thead>
          <tr class="text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted bg-surface-2/40 border-b border-border">
            <th class="py-2 pr-2">Description</th>
            <th class="py-2 px-2 w-20">Qty</th>
            <th class="py-2 px-2 w-28">Unit (KES)</th>
            <th class="py-2 px-2 w-24">Disc (KES)</th>
            <th class="py-2 px-2 w-20">Tax %</th>
            <th class="py-2 px-2 text-right w-24">Tax</th>
            <th class="py-2 px-2 text-right w-28">Line total</th>
            <th class="w-8"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(r, i) in modelValue" :key="i" class="border-b border-border last:border-0">
            <td class="py-1.5 pr-2"><input v-model="r.description" class="w-full bg-transparent outline-none text-text-primary" placeholder="Item" /></td>
            <td class="py-1.5 px-2"><input :value="(r.quantity_milli ?? 1000) / 1000" type="number" step="0.001" class="w-full bg-transparent outline-none" @input="r.quantity_milli = Math.round(parseFloat(($event.target as HTMLInputElement).value || '0') * 1000)" /></td>
            <td class="py-1.5 px-2"><input :value="(r.unit_price_cents || 0) / 100" type="number" step="0.01" class="w-full bg-transparent outline-none" @input="r.unit_price_cents = Math.round(parseFloat(($event.target as HTMLInputElement).value || '0') * 100)" /></td>
            <td class="py-1.5 px-2"><input :value="(r.discount_cents || 0) / 100" type="number" step="0.01" class="w-full bg-transparent outline-none" @input="r.discount_cents = Math.round(parseFloat(($event.target as HTMLInputElement).value || '0') * 100)" /></td>
            <td class="py-1.5 px-2"><input :value="(r.tax_rate_bps || 0) / 100" type="number" step="0.5" placeholder="16" class="w-full bg-transparent outline-none" @input="setTaxRate(r, ($event.target as HTMLInputElement).value)" /></td>
            <td class="py-1.5 px-2 text-right text-text-secondary">{{ formatMoney(lineTax(r)) }}</td>
            <td class="py-1.5 px-2 text-right font-semibold text-text-primary">{{ formatMoney(lineTotal(r)) }}</td>
            <td class="py-1.5"><button type="button" class="text-text-muted hover:text-error" @click="removeRow(i)"><Trash2Icon class="w-4 h-4" /></button></td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="flex flex-wrap items-start justify-between gap-4">
      <button type="button" class="inline-flex items-center gap-1.5 text-sm font-semibold text-primary" @click="addRow">
        <PlusIcon class="w-4 h-4" /> Add line
      </button>
      <div class="text-sm text-right space-y-0.5">
        <p class="text-text-muted">Subtotal: <span class="font-semibold text-text-primary">KES {{ formatMoney(subtotal) }}</span></p>
        <p v-if="discountTotal" class="text-text-muted">Discount: <span class="font-semibold text-error">− KES {{ formatMoney(discountTotal) }}</span></p>
        <p class="text-text-muted">Tax: <span class="font-semibold text-text-primary">KES {{ formatMoney(taxTotal) }}</span></p>
        <p class="text-base font-bold text-text-primary pt-0.5 border-t border-border">Total: KES {{ formatMoney(total) }}</p>
      </div>
    </div>
  </div>
</template>
