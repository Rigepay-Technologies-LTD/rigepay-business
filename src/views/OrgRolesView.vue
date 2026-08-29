<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  fetchRBACPermissions, fetchCustomRoles, createCustomRole, updateCustomRole, deleteCustomRole,
  fetchOrgMembers, fetchMemberRBAC, assignMemberRBAC,
  fetchRequireApprovedPayees, setRequireApprovedPayees,
  type RBACPermission, type OrgCustomRole, type OrgMember,
} from '@/lib/orgApi'
import { extractErrorMessage } from '@/lib/errors'
import { useResponseModal } from '@/composables/useResponseModal'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import { ShieldIcon, Trash2Icon, PencilIcon } from 'lucide-vue-next'

const props = defineProps<{ orgId: string }>()
const { showError, showSuccess } = useResponseModal()

const permissions = ref<RBACPermission[]>([])
const roles = ref<OrgCustomRole[]>([])
const members = ref<OrgMember[]>([])
const requireApproved = ref(false)
const loading = ref(true)

const memberCaps = ref<Record<string, number>>({})
const memberRole = ref<Record<string, string>>({})

const permGroups = computed(() => {
  const g: Record<string, RBACPermission[]> = {}
  for (const p of permissions.value) (g[p.group] ||= []).push(p)
  return g
})

async function load() {
  loading.value = true
  try {
    const [perms, r, m, approved] = await Promise.all([
      fetchRBACPermissions(), fetchCustomRoles(), fetchOrgMembers(), fetchRequireApprovedPayees(),
    ])
    permissions.value = perms
    roles.value = r
    members.value = m
    requireApproved.value = approved
    for (const mem of m) {
      if (mem.role === 'owner') continue
      try {
        const rb = await fetchMemberRBAC(mem.id)
        memberCaps.value[mem.id] = Math.round(rb.per_txn_cents / 100)
        memberRole.value[mem.id] = rb.custom_role_id || ''
      } catch { /* ignore */ }
    }
  } catch (err) {
    showError(extractErrorMessage(err))
  } finally {
    loading.value = false
  }
}

async function toggleApproved() {
  try {
    await setRequireApprovedPayees(!requireApproved.value)
    requireApproved.value = !requireApproved.value
    showSuccess(requireApproved.value
      ? 'Payouts must now go to a saved beneficiary.'
      : 'Approved-payee mode turned off.')
  } catch (err) {
    showError(extractErrorMessage(err))
  }
}

// role editor
const showRoleModal = ref(false)
const editingRole = ref<OrgCustomRole | null>(null)
const roleForm = ref<{ name: string; description: string; permissions: string[] }>({ name: '', description: '', permissions: [] })
const roleSaving = ref(false)

function openRoleModal(role?: OrgCustomRole) {
  editingRole.value = role ?? null
  roleForm.value = role
    ? { name: role.name, description: role.description, permissions: [...role.permissions] }
    : { name: '', description: '', permissions: [] }
  showRoleModal.value = true
}

async function saveRole() {
  if (roleForm.value.name.trim().length < 2) {
    showError('Give the role a name.')
    return
  }
  roleSaving.value = true
  try {
    if (editingRole.value) {
      await updateCustomRole(editingRole.value.id, roleForm.value)
    } else {
      await createCustomRole(roleForm.value)
    }
    showRoleModal.value = false
    await load()
  } catch (err) {
    showError(extractErrorMessage(err))
  } finally {
    roleSaving.value = false
  }
}

async function removeRole(role: OrgCustomRole) {
  try {
    await deleteCustomRole(role.id)
    await load()
  } catch (err) {
    showError(extractErrorMessage(err))
  }
}

const roleSelectOptions = computed(() => [
  { value: '', label: 'Base role (no restriction)' },
  ...roles.value.map((r) => ({ value: r.id, label: r.name })),
])

async function saveMember(m: OrgMember) {
  try {
    await assignMemberRBAC(m.id, {
      custom_role_id: memberRole.value[m.id] || null,
      per_txn_cents: Math.max(0, Math.round((memberCaps.value[m.id] || 0) * 100)),
    })
    showSuccess(`Updated ${m.first_name}.`)
  } catch (err) {
    showError(extractErrorMessage(err))
  }
}

onMounted(load)
</script>

<template>
  <DashboardLayout :org-id="props.orgId" title="Roles & permissions">
    <div class="flex flex-col gap-6">
      <div>
        <p class="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Settings</p>
        <h1 class="text-xl font-bold text-text-primary mt-0.5">Roles &amp; permissions</h1>
        <p class="text-sm text-text-muted mt-1">Define custom roles, cap what team members can send, and lock payouts to saved beneficiaries.</p>
      </div>

      <p v-if="loading" class="text-sm text-text-muted">Loading…</p>

      <template v-else>
        <AppCard>
          <div class="flex items-start justify-between gap-4">
            <div>
              <h2 class="text-sm font-bold text-text-primary flex items-center gap-2">
                <ShieldIcon class="w-4 h-4 text-text-muted" /> Require approved payees
              </h2>
              <p class="text-xs text-text-muted mt-1">When on, every payout must go to a beneficiary saved in your organization's book.</p>
            </div>
            <button
              type="button" role="switch" :aria-checked="requireApproved"
              class="relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors"
              :class="requireApproved ? 'bg-primary' : 'bg-surface-2 border border-border'"
              @click="toggleApproved"
            >
              <span class="inline-block h-5 w-5 rounded-full bg-white shadow transition-transform mt-0.5"
                :class="requireApproved ? 'translate-x-5' : 'translate-x-0.5'" />
            </button>
          </div>
        </AppCard>

        <AppCard padding="none">
          <div class="flex items-center justify-between px-5 pt-5">
            <h2 class="text-sm font-bold text-text-primary">Custom roles</h2>
            <AppButton size="sm" @click="openRoleModal()">New role</AppButton>
          </div>
          <p class="text-xs text-text-muted px-5 mt-1 mb-3">A member with a custom role can only do what the role allows. Members without one keep their base role.</p>
          <p v-if="!roles.length" class="text-sm text-text-muted px-5 pb-5">No custom roles yet.</p>
          <ul v-else class="divide-y divide-border">
            <li v-for="r in roles" :key="r.id" class="px-5 py-3 flex items-center justify-between gap-4">
              <div class="min-w-0">
                <p class="text-sm font-semibold text-text-primary">{{ r.name }}</p>
                <p class="text-xs text-text-muted truncate">{{ r.permissions.length }} permission{{ r.permissions.length === 1 ? '' : 's' }}<span v-if="r.description"> · {{ r.description }}</span></p>
              </div>
              <div class="flex items-center gap-1 shrink-0">
                <button class="p-1.5 text-text-muted hover:text-primary" @click="openRoleModal(r)"><PencilIcon class="w-4 h-4" /></button>
                <button class="p-1.5 text-text-muted hover:text-error" @click="removeRole(r)"><Trash2Icon class="w-4 h-4" /></button>
              </div>
            </li>
          </ul>
        </AppCard>

        <AppCard padding="none">
          <h2 class="text-sm font-bold text-text-primary px-5 pt-5">Team members</h2>
          <p class="text-xs text-text-muted px-5 mt-1 mb-3">Assign a custom role and a per-payout cap. Owners can't be restricted.</p>
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted bg-surface-2/40 border-y border-border">
                  <th class="px-5 py-2">Member</th><th class="px-5 py-2">Custom role</th><th class="px-5 py-2">Per-payout cap (KES)</th><th class="px-5 py-2"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="m in members" :key="m.id" class="border-b border-border last:border-0">
                  <td class="px-5 py-2.5">
                    <p class="text-text-primary font-medium">{{ m.first_name }} {{ m.last_name }}</p>
                    <p class="text-xs text-text-muted">{{ m.role }}</p>
                  </td>
                  <td class="px-5 py-2.5">
                    <span v-if="m.role === 'owner'" class="text-xs text-text-muted">—</span>
                    <AppSelect v-else v-model="memberRole[m.id]" :options="roleSelectOptions" class="min-w-44" />
                  </td>
                  <td class="px-5 py-2.5">
                    <input
                      v-if="m.role !== 'owner'"
                      v-model.number="memberCaps[m.id]" type="number" min="0" placeholder="No cap"
                      class="h-9 w-32 rounded-lg border border-input-border bg-input-bg px-3 text-sm text-text-primary outline-none focus:border-input-border-focused focus:ring-2 focus:ring-primary/15"
                    />
                    <span v-else class="text-xs text-text-muted">—</span>
                  </td>
                  <td class="px-5 py-2.5 text-right">
                    <AppButton v-if="m.role !== 'owner'" size="sm" variant="secondary" @click="saveMember(m)">Save</AppButton>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </AppCard>
      </template>

      <AppModal
        v-if="showRoleModal"
        :model-value="showRoleModal"
        :title="editingRole ? 'Edit role' : 'New role'"
        size="md"
        @update:model-value="(v: boolean) => { if (!v) showRoleModal = false }"
      >
        <div class="flex flex-col gap-4">
          <div class="flex flex-col gap-1.5">
            <label class="text-[13px] font-medium text-text-secondary">Role name</label>
            <input v-model="roleForm.name" type="text" placeholder="e.g. Finance operator"
              class="h-10 rounded-lg border border-input-border bg-input-bg px-3.5 text-sm text-text-primary outline-none focus:border-input-border-focused focus:ring-2 focus:ring-primary/15" />
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-[13px] font-medium text-text-secondary">Description (optional)</label>
            <input v-model="roleForm.description" type="text"
              class="h-10 rounded-lg border border-input-border bg-input-bg px-3.5 text-sm text-text-primary outline-none focus:border-input-border-focused focus:ring-2 focus:ring-primary/15" />
          </div>
          <div v-for="(perms, group) in permGroups" :key="group">
            <p class="text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-1.5">{{ group }}</p>
            <div class="flex flex-col gap-1.5">
              <label v-for="p in perms" :key="p.key" class="flex items-center gap-2.5 text-sm text-text-secondary">
                <input type="checkbox" :value="p.key" v-model="roleForm.permissions" class="rounded border-border" />
                {{ p.label }}
              </label>
            </div>
          </div>
        </div>
        <template #footer>
          <AppButton variant="secondary" @click="showRoleModal = false">Cancel</AppButton>
          <AppButton :loading="roleSaving" @click="saveRole">{{ editingRole ? 'Save role' : 'Create role' }}</AppButton>
        </template>
      </AppModal>
    </div>
  </DashboardLayout>
</template>
