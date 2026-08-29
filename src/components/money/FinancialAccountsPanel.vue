<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { extractErrorMessage } from '@/lib/errors'
import { formatMoney, formatDate } from '@/lib/format'
import { useResponseModal } from '@/composables/useResponseModal'
import { useAuthStore } from '@/stores/auth'
import AppCard from '@/components/ui/AppCard.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppModal from '@/components/ui/AppModal.vue'
import {
  freezeOrgWallet, unfreezeOrgWallet, closeOrgWallet,
  type FinancialAccounts, type FinancialAccount,
} from '@/lib/orgApi'
import { XIcon } from 'lucide-vue-next'

const props = defineProps<{
  fetcher: (params?: { scope?: 'org' | 'consolidated' }) => Promise<FinancialAccounts>
  allowScope?: boolean
}>()

const { showError, showSuccess } = useResponseModal()
const auth = useAuthStore()
const canManage = computed(() => auth.meta?.role === 'owner' && auth.meta?.memberType !== 'branch_member')

const MANAGEABLE_TYPES = ['MAIN', 'ESCROW', 'CHARGEBACK', 'MARKETPLACE_ESCROW', 'VAULT']

const actionModal = ref<{ kind: 'freeze' | 'unfreeze' | 'close'; wallet: FinancialAccount } | null>(null)
const actionReason = ref('')
const actionPin = ref('')
const actionBusy = ref(false)

function openAction(kind: 'freeze' | 'unfreeze' | 'close', wallet: FinancialAccount) {
  actionModal.value = { kind, wallet }
  actionReason.value = ''
  actionPin.value = ''
}

async function runAction() {
  if (!actionModal.value) return
  const { kind, wallet } = actionModal.value
  if (!actionPin.value.trim()) {
    showError('Enter your transaction PIN.')
    return
  }
  actionBusy.value = true
  try {
    let res: { message?: string }
    if (kind === 'freeze') res = await freezeOrgWallet(wallet.id, actionReason.value.trim(), actionPin.value.trim())
    else if (kind === 'unfreeze') res = await unfreezeOrgWallet(wallet.id, actionPin.value.trim())
    else res = await closeOrgWallet(wallet.id, actionPin.value.trim())
    showSuccess(res.message || 'Done.')
    actionModal.value = null
    selected.value = null
    await load()
  } catch (err) {
    showError(extractErrorMessage(err))
  } finally {
    actionBusy.value = false
  }
}

const scope = ref('consolidated')
const data = ref<FinancialAccounts | null>(null)
const loading = ref(true)

const scopeOptions = [
  { value: 'consolidated', label: 'Consolidated (org + branches)' },
  { value: 'org', label: 'Organization wallets only' },
]

const TYPE_LABELS: Record<string, string> = {
  MAIN: 'Main / settlement',
  ESCROW: 'Escrow (pending delivery)',
  CHARGEBACK: 'Chargeback hold (72h)',
  MARKETPLACE_ESCROW: 'Marketplace escrow',
}

function label(t: string) {
  return TYPE_LABELS[t] ?? t
}

async function load() {
  loading.value = true
  try {
    data.value = await props.fetcher(props.allowScope ? { scope: scope.value as 'org' | 'consolidated' } : undefined)
  } catch (err) {
    showError(extractErrorMessage(err))
  } finally {
    loading.value = false
  }
}

const totalBalance = computed(() =>
  data.value ? data.value.groups.reduce((s, g) => s + g.balance_cents, 0) : 0,
)

function statusClass(s: string) {
  const v = s.toLowerCase()
  if (v === 'active') return 'bg-success-muted text-success'
  if (v.includes('frozen') || v.includes('freeze')) return 'bg-warning-muted text-warning'
  if (v.includes('block') || v.includes('closed')) return 'bg-error-muted text-error'
  return 'bg-surface-2 text-text-muted'
}

const selected = ref<FinancialAccount | null>(null)
const drawerRows = computed(() => {
  const a = selected.value
  if (!a) return [] as { label: string; value: string; mono?: boolean }[]
  return [
    { label: 'Wallet ID', value: a.id, mono: true },
    { label: 'Type', value: a.type },
    { label: 'Wallet name', value: a.wallet_name, mono: true },
    { label: 'Display name', value: a.name || '—' },
    { label: 'Currency', value: a.currency },
    { label: 'Status', value: a.status },
    { label: 'Freeze reason', value: a.freeze_reason || '—' },
    { label: 'Balance', value: `KES ${formatMoney(a.balance_cents)}` },
    { label: 'Reserved', value: `KES ${formatMoney(a.reserved_cents)}` },
    { label: 'Locked', value: `KES ${formatMoney(a.locked_cents)}` },
    { label: 'Available', value: `KES ${formatMoney(a.available_cents)}` },
    { label: 'Scope', value: a.branch_name || 'Organization' },
    { label: 'Organization ID', value: a.organization_id || '—', mono: true },
    { label: 'Branch ID', value: a.branch_id || '—', mono: true },
    { label: 'Store ID', value: a.store_id || '—', mono: true },
    { label: 'Last credited', value: a.last_credited_at ? formatDate(a.last_credited_at) : '—' },
    { label: 'Created', value: a.created_at ? formatDate(a.created_at) : '—' },
  ]
})

onMounted(load)
</script>

<template>
  <div class="flex flex-col gap-5">
    <div v-if="props.allowScope" class="flex items-end gap-3">
      <AppSelect v-model="scope" label="Scope" :options="scopeOptions" class="min-w-56" @update:modelValue="load" />
    </div>

    <p v-if="loading" class="text-sm text-text-muted">Loading accounts…</p>

    <template v-else-if="data">
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <AppCard padding="sm">
          <p class="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1">Total held</p>
          <p class="text-lg font-bold text-text-primary">KES {{ formatMoney(totalBalance) }}</p>
        </AppCard>
        <AppCard v-for="g in data.groups" :key="g.type" padding="sm">
          <p class="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1">{{ label(g.type) }}</p>
          <p class="text-lg font-bold text-text-primary">KES {{ formatMoney(g.balance_cents) }}</p>
          <p class="text-xs text-text-muted mt-0.5">{{ g.count }} wallet(s) · {{ formatMoney(g.available_cents) }} available</p>
        </AppCard>
      </div>

      <AppCard padding="none">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted bg-surface-2/40 border-b border-border">
                <th class="px-5 py-2">Account</th>
                <th class="px-5 py-2">Scope</th>
                <th class="px-5 py-2">Status</th>
                <th class="px-5 py-2 text-right">Balance</th>
                <th class="px-5 py-2 text-right">Reserved</th>
                <th class="px-5 py-2 text-right">Available</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="a in data.accounts" :key="a.id" class="border-b border-border last:border-0 hover:bg-surface-2/60 cursor-pointer" @click="selected = a">
                <td class="px-5 py-2.5">
                  <p class="font-medium text-text-primary">{{ label(a.type) }}</p>
                  <p class="text-xs text-text-muted">{{ a.wallet_name }} · {{ a.currency }}</p>
                </td>
                <td class="px-5 py-2.5 text-text-secondary">{{ a.branch_name || 'Organization' }}</td>
                <td class="px-5 py-2.5">
                  <span class="inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold" :class="statusClass(a.status)">
                    {{ a.status }}
                  </span>
                  <span v-if="a.freeze_reason" class="block text-xs text-warning mt-0.5">{{ a.freeze_reason }}</span>
                </td>
                <td class="px-5 py-2.5 text-right font-semibold text-text-primary">{{ formatMoney(a.balance_cents) }}</td>
                <td class="px-5 py-2.5 text-right text-text-muted">{{ a.reserved_cents || a.locked_cents ? formatMoney(a.reserved_cents + a.locked_cents) : '—' }}</td>
                <td class="px-5 py-2.5 text-right font-semibold text-success">{{ formatMoney(a.available_cents) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </AppCard>

      <p v-if="!canManage" class="text-xs text-text-muted">
        Wallet freeze / close controls are available to organization owners. Contact RigePay support if an account frozen by a system check needs to be reopened.
      </p>
    </template>

    <Teleport to="body">
      <Transition
        enter-active-class="transition-opacity duration-200" enter-from-class="opacity-0"
        leave-active-class="transition-opacity duration-150" leave-to-class="opacity-0"
      >
        <div v-if="selected" class="fixed inset-0 z-9800 bg-black/40" @click="selected = null" />
      </Transition>
      <Transition
        enter-active-class="transition-transform duration-200 ease-out" enter-from-class="translate-x-full"
        leave-active-class="transition-transform duration-150 ease-in" leave-to-class="translate-x-full"
      >
        <aside v-if="selected" class="fixed top-0 right-0 z-9800 h-full w-full max-w-md bg-surface border-l border-border shadow-2xl flex flex-col">
          <div class="flex items-start justify-between gap-4 px-6 py-5 border-b border-border">
            <div>
              <p class="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Financial account</p>
              <h2 class="text-base font-bold text-text-primary mt-0.5">{{ label(selected.type) }}</h2>
              <p class="text-2xl font-bold text-text-primary tracking-tight mt-1">KES {{ formatMoney(selected.balance_cents) }}</p>
              <span class="inline-flex mt-2 rounded-full px-2 py-0.5 text-[11px] font-semibold" :class="statusClass(selected.status)">{{ selected.status }}</span>
            </div>
            <button type="button" class="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-2" @click="selected = null">
              <XIcon class="w-4 h-4" />
            </button>
          </div>
          <div class="flex-1 overflow-y-auto px-6 py-5">
            <dl class="flex flex-col divide-y divide-border text-sm">
              <div v-for="r in drawerRows" :key="r.label" class="flex justify-between gap-4 py-2.5">
                <dt class="text-text-muted shrink-0">{{ r.label }}</dt>
                <dd class="font-medium text-text-primary text-right break-all" :class="r.mono ? 'font-mono text-xs' : ''">{{ r.value }}</dd>
              </div>
            </dl>

            <div v-if="canManage && selected && MANAGEABLE_TYPES.includes(selected.type)" class="mt-6 pt-5 border-t border-border">
              <p class="text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-2">Wallet controls</p>
              <div class="flex flex-wrap gap-2">
                <AppButton
                  v-if="selected.status === 'frozen'"
                  size="sm" variant="secondary"
                  @click="openAction('unfreeze', selected)"
                >Unfreeze</AppButton>
                <AppButton
                  v-else
                  size="sm" variant="secondary"
                  @click="openAction('freeze', selected)"
                >Freeze</AppButton>
                <AppButton
                  v-if="selected.type !== 'MAIN' && selected.status !== 'closed'
                    && selected.balance_cents === 0 && selected.locked_cents === 0 && selected.reserved_cents === 0"
                  size="sm" variant="secondary"
                  @click="openAction('close', selected)"
                >Close</AppButton>
              </div>
              <p class="text-xs text-text-muted mt-2">Freezing stops money leaving this wallet. Money can still come in.</p>
            </div>
          </div>
        </aside>
      </Transition>
    </Teleport>

    <AppModal
      v-if="actionModal"
      :model-value="!!actionModal"
      :title="actionModal.kind === 'freeze' ? 'Freeze wallet' : actionModal.kind === 'unfreeze' ? 'Unfreeze wallet' : 'Close wallet'"
      size="sm"
      @update:model-value="(v: boolean) => { if (!v) actionModal = null }"
    >
      <div class="flex flex-col gap-3">
        <p class="text-sm text-text-secondary">
          {{ label(actionModal.wallet.type) }} · KES {{ formatMoney(actionModal.wallet.balance_cents) }}
        </p>
        <div v-if="actionModal.kind === 'freeze'" class="flex flex-col gap-1.5">
          <label class="text-[13px] font-medium text-text-secondary">Reason (optional)</label>
          <input v-model="actionReason" type="text" placeholder="Why are you freezing this wallet?"
            class="h-10 rounded-lg border border-input-border bg-input-bg px-3.5 text-sm text-text-primary outline-none focus:border-input-border-focused focus:ring-2 focus:ring-primary/15" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-[13px] font-medium text-text-secondary">Transaction PIN</label>
          <input v-model="actionPin" type="password" inputmode="numeric" autocomplete="off"
            class="h-10 rounded-lg border border-input-border bg-input-bg px-3.5 text-sm text-text-primary outline-none focus:border-input-border-focused focus:ring-2 focus:ring-primary/15" />
        </div>
      </div>
      <template #footer>
        <AppButton variant="secondary" @click="actionModal = null">Cancel</AppButton>
        <AppButton :loading="actionBusy" @click="runAction">Confirm</AppButton>
      </template>
    </AppModal>
  </div>
</template>
