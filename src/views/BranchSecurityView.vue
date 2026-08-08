<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import QRCode from 'qrcode'
import {
  fetchEnrolled2FAMethods, addTotpSetup, addTotpVerify, regenerateBackupCodes,
  addPasskeyBegin, addPasskeyFinish, disableTotp, deletePasskey, type Enrolled2FAMethods,
  fetchLoginHistory, type OrgMemberLoginHistoryRow,
} from '@/lib/orgApi'
import { extractErrorMessage } from '@/lib/errors'
import { formatDate } from '@/lib/format'
import { decodeCreationOptions, encodeAttestationResponse, isWebAuthnSupported } from '@/lib/webauthn'
import { useAuthStore } from '@/stores/auth'
import { useResponseModal } from '@/composables/useResponseModal'
import { useConfirmModal } from '@/composables/useConfirmModal'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppBadge from '@/components/ui/AppBadge.vue'

const props = defineProps<{ orgId: string; branchId: string }>()
const auth = useAuthStore()
const isBranchSession = computed(() => auth.meta?.memberType === 'branch_member')
const { showError } = useResponseModal()
const { confirmAction } = useConfirmModal()

const methods = ref<Enrolled2FAMethods | null>(null)
const methodsLoading = ref(true)
const methodsError = ref<string | null>(null)

async function loadMethods() {
  methodsLoading.value = true
  try {
    methods.value = await fetchEnrolled2FAMethods(isBranchSession.value)
  } catch (err) {
    const msg = extractErrorMessage(err)
    methodsError.value = msg
    showError(msg)
  } finally {
    methodsLoading.value = false
  }
}
onMounted(loadMethods)

const showAddTotp = ref(false)
const totpSecret = ref('')
const totpUri = ref('')
const totpQrDataUrl = ref('')
const totpCode = ref('')
const addingTotp = ref(false)
const totpError = ref<string | null>(null)
const revealedBackupCodes = ref<string[] | null>(null)

async function beginAddTotp() {
  totpError.value = null
  addingTotp.value = true
  try {
    const result = await addTotpSetup(isBranchSession.value)
    totpSecret.value = result.secret
    totpUri.value = result.otpauth_uri
    totpQrDataUrl.value = await QRCode.toDataURL(result.otpauth_uri)
    showAddTotp.value = true
  } catch (err) {
    const msg = extractErrorMessage(err)
    totpError.value = msg
    showError(msg)
  } finally {
    addingTotp.value = false
  }
}

async function verifyAddTotp() {
  totpError.value = null
  if (!/^\d{6}$/.test(totpCode.value)) {
    totpError.value = 'Enter the 6-digit code from your authenticator app.'
    return
  }
  addingTotp.value = true
  try {
    revealedBackupCodes.value = await addTotpVerify(isBranchSession.value, totpCode.value)
    showAddTotp.value = false
    totpCode.value = ''
    await loadMethods()
  } catch (err) {
    const msg = extractErrorMessage(err)
    totpError.value = msg
    showError(msg)
  } finally {
    addingTotp.value = false
  }
}

const regenerating = ref(false)
const regenerateError = ref<string | null>(null)

async function handleRegenerateBackupCodes() {
  regenerateError.value = null
  regenerating.value = true
  try {
    revealedBackupCodes.value = await regenerateBackupCodes(isBranchSession.value)
  } catch (err) {
    const msg = extractErrorMessage(err)
    regenerateError.value = msg
    showError(msg)
  } finally {
    regenerating.value = false
  }
}

const addingPasskey = ref(false)
const passkeyError = ref<string | null>(null)
const passkeyName = ref('')

async function handleAddPasskey() {
  passkeyError.value = null
  if (!isWebAuthnSupported()) {
    passkeyError.value = 'Passkeys are not supported in this browser.'
    return
  }
  addingPasskey.value = true
  try {
    const begin = await addPasskeyBegin(isBranchSession.value)
    const publicKey = decodeCreationOptions((begin.creation_options as { publicKey: unknown }).publicKey)
    const credential = await navigator.credentials.create({ publicKey }) as PublicKeyCredential
    const attestation = encodeAttestationResponse(credential)
    await addPasskeyFinish(isBranchSession.value, begin.session_id, passkeyName.value.trim() || 'Passkey', attestation)
    passkeyName.value = ''
    await loadMethods()
  } catch (err: any) {
    let msg: string
    if (err?.name === 'NotAllowedError') {
      msg = 'Passkey setup was cancelled or timed out. Please try again.'
    } else if (err?.name === 'InvalidStateError') {
      msg = 'This passkey is already registered on this device.'
    } else {
      msg = extractErrorMessage(err)
    }
    passkeyError.value = msg
    showError(msg)
  } finally {
    addingPasskey.value = false
  }
}

const removingTotp = ref(false)
const removingPasskeyId = ref<string | null>(null)
const removeError = ref<string | null>(null)

async function handleDisableTotp() {
  removeError.value = null
  const ok = await confirmAction({
    title: 'Remove your authenticator app?',
    message: 'You will need to use another 2FA method to log in.',
    confirmLabel: 'Remove',
    cancelLabel: 'Keep it',
    danger: true,
  })
  if (!ok) return
  removingTotp.value = true
  try {
    await disableTotp(isBranchSession.value)
    await loadMethods()
  } catch (err) {
    const msg = extractErrorMessage(err)
    removeError.value = msg
    showError(msg)
  } finally {
    removingTotp.value = false
  }
}

async function handleDeletePasskey(id: string) {
  removeError.value = null
  const ok = await confirmAction({
    title: 'Remove this passkey?',
    message: 'It will no longer work for signing in.',
    confirmLabel: 'Remove',
    cancelLabel: 'Keep it',
    danger: true,
  })
  if (!ok) return
  removingPasskeyId.value = id
  try {
    await deletePasskey(isBranchSession.value, id)
    await loadMethods()
  } catch (err) {
    const msg = extractErrorMessage(err)
    removeError.value = msg
    showError(msg)
  } finally {
    removingPasskeyId.value = null
  }
}

const loginHistory = ref<OrgMemberLoginHistoryRow[]>([])
const loginHistoryLoading = ref(true)
const loginHistoryError = ref<string | null>(null)

async function loadLoginHistory() {
  loginHistoryLoading.value = true
  loginHistoryError.value = null
  try {
    loginHistory.value = await fetchLoginHistory(isBranchSession.value)
  } catch (err) {
    const msg = extractErrorMessage(err)
    loginHistoryError.value = msg
    showError(msg)
  } finally {
    loginHistoryLoading.value = false
  }
}
onMounted(loadLoginHistory)

function locationLabel(row: OrgMemberLoginHistoryRow) {
  const parts = [row.city, row.country].filter(Boolean)
  return parts.length ? parts.join(', ') : 'Unknown location'
}

function methodLabel(method: string) {
  if (method === 'totp') return 'Authenticator app'
  if (method === 'backup_code') return 'Backup code'
  if (method === 'passkey_register') return 'Passkey (added)'
  if (method === 'passkey_auth') return 'Passkey'
  return method || 'Unknown'
}
</script>

<template>
  <DashboardLayout :org-id="props.orgId" :branch-id="props.branchId" title="Security">
    <div class="flex flex-col gap-6">
      <div v-if="revealedBackupCodes" class="text-sm bg-warning-light text-warning-text rounded-xl px-4 py-3 flex flex-col gap-2">
        <p class="font-semibold">Save these backup codes now — they will not be shown again.</p>
        <div class="grid grid-cols-2 sm:grid-cols-5 gap-2 font-mono text-xs">
          <span v-for="code in revealedBackupCodes" :key="code" class="bg-surface rounded-lg px-2 py-1 text-center">{{ code }}</span>
        </div>
        <button type="button" class="text-xs font-semibold self-start hover:underline" @click="revealedBackupCodes = null">Dismiss</button>
      </div>

      <AppCard>
        <h2 class="text-sm font-bold text-text-primary mb-1">Two-factor authentication</h2>
        <p class="text-xs text-text-muted mb-5">You must have at least one method enrolled to access the dashboard — add a second one here so you're never locked out.</p>
        <p v-if="methodsLoading" class="text-sm text-text-muted">Loading…</p>
        <div v-else-if="methods" class="flex flex-col gap-4">
          <div class="flex items-center justify-between rounded-xl bg-surface-2 px-4 py-3">
            <div>
              <p class="text-sm font-semibold text-text-primary">Authenticator app (TOTP)</p>
              <p class="text-xs text-text-muted">Google Authenticator, Authy, or similar</p>
            </div>
            <div class="flex items-center gap-2">
              <AppBadge :variant="methods.totp_enabled ? 'success' : 'neutral'" size="sm">{{ methods.totp_enabled ? 'Enabled' : 'Not set up' }}</AppBadge>
              <AppButton v-if="methods.totp_enabled" size="sm" variant="ghost" :loading="removingTotp" @click="handleDisableTotp">Remove</AppButton>
            </div>
          </div>

          <div v-if="methods.passkeys.length > 0" class="flex flex-col gap-2">
            <div v-for="pk in methods.passkeys" :key="pk.id" class="flex items-center justify-between rounded-xl bg-surface-2 px-4 py-3">
              <div>
                <p class="text-sm font-semibold text-text-primary">{{ pk.name }}</p>
                <p class="text-xs text-text-muted">{{ pk.last_used_at ? `Last used ${pk.last_used_at}` : 'Never used' }}</p>
              </div>
              <AppButton size="sm" variant="ghost" :loading="removingPasskeyId === pk.id" @click="handleDeletePasskey(pk.id)">Remove</AppButton>
            </div>
          </div>
          <div v-else class="flex items-center justify-between rounded-xl bg-surface-2 px-4 py-3">
            <div>
              <p class="text-sm font-semibold text-text-primary">Passkeys</p>
              <p class="text-xs text-text-muted">Face ID, Touch ID, or a security key</p>
            </div>
            <AppBadge variant="neutral" size="sm">0 registered</AppBadge>
          </div>

          <div class="border-t border-border pt-4 flex flex-col gap-3">
            <div v-if="!showAddTotp" class="flex flex-wrap gap-2">
              <AppButton size="sm" variant="secondary" :loading="addingTotp" @click="beginAddTotp">
                {{ methods.totp_enabled ? 'Replace authenticator app' : 'Add authenticator app' }}
              </AppButton>
              <AppButton v-if="methods.totp_enabled" size="sm" variant="secondary" :loading="regenerating" @click="handleRegenerateBackupCodes">
                Regenerate backup codes
              </AppButton>
            </div>
            <div v-if="showAddTotp" class="flex flex-col gap-3 max-w-sm">
              <p class="text-xs text-text-muted">Scan this into your authenticator app, or enter the secret manually.</p>
              <div class="flex justify-center">
                <img v-if="totpQrDataUrl" :src="totpQrDataUrl" alt="TOTP QR code" class="w-40 h-40 rounded-lg border border-border" />
              </div>
              <p class="font-mono text-xs bg-surface-2 rounded-lg px-3 py-2 break-all">{{ totpSecret }}</p>
              <div v-if="totpError" class="text-xs text-error-text">{{ totpError }}</div>
              <AppInput v-model="totpCode" label="6-digit code from the app" placeholder="000000" />
              <div class="flex gap-2">
                <AppButton size="sm" :loading="addingTotp" @click="verifyAddTotp">Confirm</AppButton>
                <AppButton size="sm" variant="ghost" @click="showAddTotp = false">Cancel</AppButton>
              </div>
            </div>

            <div class="flex items-end gap-2 flex-wrap">
              <AppInput v-model="passkeyName" label="Passkey name (optional)" placeholder="e.g. My laptop" class="max-w-xs" />
              <AppButton size="sm" variant="secondary" :loading="addingPasskey" @click="handleAddPasskey">Add a passkey</AppButton>
            </div>
            <div v-if="passkeyError" class="text-xs text-error-text">{{ passkeyError }}</div>
          </div>
        </div>
      </AppCard>

      <AppCard>
        <h2 class="text-sm font-bold text-text-primary mb-1">Login activity</h2>
        <p class="text-xs text-text-muted mb-5">Recent sign-ins to your account, with approximate location.</p>
        <p v-if="loginHistoryLoading" class="text-sm text-text-muted">Loading…</p>
        <p v-else-if="!loginHistory.length" class="text-sm text-text-muted">No login activity recorded yet.</p>
        <div v-else class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left text-xs text-text-muted uppercase tracking-wide border-b border-border">
                <th class="py-2 pr-4 font-semibold">When</th>
                <th class="py-2 pr-4 font-semibold">Location</th>
                <th class="py-2 pr-4 font-semibold">IP address</th>
                <th class="py-2 pr-4 font-semibold">Method</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in loginHistory" :key="row.id" class="border-b border-border last:border-0">
                <td class="py-2 pr-4 whitespace-nowrap text-text-primary">{{ formatDate(row.created_at) }}</td>
                <td class="py-2 pr-4 text-text-primary">{{ locationLabel(row) }}</td>
                <td class="py-2 pr-4 font-mono text-xs text-text-muted">{{ row.ip_address || '—' }}</td>
                <td class="py-2 pr-4">
                  <AppBadge variant="neutral" size="sm">{{ methodLabel(row.login_method) }}</AppBadge>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </AppCard>
    </div>
  </DashboardLayout>
</template>
