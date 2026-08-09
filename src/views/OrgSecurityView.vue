<script setup lang="ts">
import { ref, onMounted } from 'vue'
import QRCode from 'qrcode'
import { useAuthStore } from '@/stores/auth'
import {
  setTransactionPin, fetchEnrolled2FAMethods, addTotpSetup, addTotpVerify, regenerateBackupCodes,
  addPasskeyBegin, addPasskeyFinish, disableTotp, deletePasskey, type Enrolled2FAMethods,
  fetchLoginHistory, fetchOrganizationLoginHistory, type OrgMemberLoginHistoryRow,
  setOrgPanicPin, requestOrgPanicPinChange, requestOrgPanicPinChangeOtp, finalizeOrgPanicPinChange,
} from '@/lib/orgApi'
import { extractErrorMessage } from '@/lib/errors'
import { formatDate } from '@/lib/format'
import { useResponseModal } from '@/composables/useResponseModal'
import { useConfirmModal } from '@/composables/useConfirmModal'
import { decodeCreationOptions, encodeAttestationResponse, isWebAuthnSupported } from '@/lib/webauthn'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppBadge from '@/components/ui/AppBadge.vue'

const props = defineProps<{ orgId: string }>()
const auth = useAuthStore()
const isOwner = auth.meta?.role === 'owner'
const isBranchSession = auth.meta?.memberType === 'branch_member'
const { showError, showSuccess } = useResponseModal()
const { confirmAction } = useConfirmModal()

const currentPassword = ref('')
const pin = ref('')
const confirmPin = ref('')
const saving = ref(false)
const error = ref<string | null>(null)
const saved = ref(false)

async function save() {
  error.value = null
  saved.value = false
  if (!currentPassword.value) {
    error.value = 'Enter your account password to confirm this change.'
    return
  }
  if (!/^\d{4}$/.test(pin.value)) {
    error.value = 'PIN must be exactly 4 digits.'
    return
  }
  if (pin.value !== confirmPin.value) {
    error.value = 'PINs do not match.'
    return
  }
  saving.value = true
  try {
    await setTransactionPin(currentPassword.value, pin.value)
    saved.value = true
    showSuccess('Transaction PIN set successfully.')
    currentPassword.value = ''
    pin.value = ''
    confirmPin.value = ''
  } catch (err) {
    const msg = extractErrorMessage(err)
    error.value = msg
    showError(msg)
  } finally {
    saving.value = false
  }
}

// --- Panic PIN (duress protection) ---
// Entering this instead of the real transaction PIN during a payout
// silently freezes the account and alerts RigePay security — nothing in
// the UI response reveals that a panic PIN was entered.
const panicHasPin = ref(false) // best-effort local flag; server is the source of truth
const panicPassword = ref('')
const panicPin = ref('')
const panicPinConfirm = ref('')
const panicSaving = ref(false)
const panicError = ref<string | null>(null)

async function savePanicPin() {
  panicError.value = null
  if (!panicPassword.value) {
    panicError.value = 'Enter your account password to confirm this change.'
    return
  }
  if (!/^\d{4}$/.test(panicPin.value)) {
    panicError.value = 'Panic PIN must be exactly 4 digits.'
    return
  }
  if (panicPin.value !== panicPinConfirm.value) {
    panicError.value = 'PINs do not match.'
    return
  }
  panicSaving.value = true
  try {
    await setOrgPanicPin(panicPassword.value, panicPin.value)
    panicHasPin.value = true
    showSuccess('Panic PIN set. Entering it instead of your real PIN during a payout will silently freeze your account and alert our security team.')
    panicPassword.value = ''
    panicPin.value = ''
    panicPinConfirm.value = ''
  } catch (err) {
    const msg = extractErrorMessage(err)
    panicError.value = msg
    showError(msg)
  } finally {
    panicSaving.value = false
  }
}

// Change/removal flow: request (24h cooldown) -> request OTP -> finalize.
const panicChangeStep = ref<'idle' | 'requested' | 'otp_sent'>('idle')
const panicChangeAction = ref<'change' | 'remove'>('change')
const panicChangePassword = ref('')
const panicChangeAvailableAt = ref<string | null>(null)
const panicChangeOtp = ref('')
const panicChangeNewPin = ref('')
const panicChangeNewPinConfirm = ref('')
const panicChangeBusy = ref(false)
const panicChangeError = ref<string | null>(null)

async function startPanicChange(action: 'change' | 'remove') {
  panicChangeError.value = null
  panicChangeAction.value = action
  if (!panicChangePassword.value) {
    panicChangeError.value = 'Enter your account password to confirm this request.'
    return
  }
  panicChangeBusy.value = true
  try {
    const { available_at } = await requestOrgPanicPinChange(panicChangePassword.value, action)
    panicChangeAvailableAt.value = available_at
    panicChangeStep.value = 'requested'
    showSuccess('Request received — a 24-hour cooldown applies before this can be confirmed.')
  } catch (err) {
    const msg = extractErrorMessage(err)
    panicChangeError.value = msg
    showError(msg)
  } finally {
    panicChangeBusy.value = false
  }
}

async function sendPanicChangeOtp() {
  panicChangeError.value = null
  panicChangeBusy.value = true
  try {
    await requestOrgPanicPinChangeOtp(panicChangePassword.value)
    panicChangeStep.value = 'otp_sent'
    showSuccess('Confirmation code sent to your registered phone number.')
  } catch (err) {
    const msg = extractErrorMessage(err)
    panicChangeError.value = msg
    showError(msg)
  } finally {
    panicChangeBusy.value = false
  }
}

async function finalizePanicChange() {
  panicChangeError.value = null
  if (panicChangeAction.value === 'change') {
    if (!/^\d{4}$/.test(panicChangeNewPin.value) || panicChangeNewPin.value !== panicChangeNewPinConfirm.value) {
      panicChangeError.value = 'Enter matching 4-digit PINs.'
      return
    }
  }
  panicChangeBusy.value = true
  try {
    await finalizeOrgPanicPinChange(panicChangePassword.value, panicChangeOtp.value, panicChangeAction.value === 'change' ? panicChangeNewPin.value : undefined)
    showSuccess(panicChangeAction.value === 'remove' ? 'Panic PIN removed.' : 'Panic PIN changed.')
    panicChangeStep.value = 'idle'
    panicChangePassword.value = ''
    panicChangeOtp.value = ''
    panicChangeNewPin.value = ''
    panicChangeNewPinConfirm.value = ''
    panicHasPin.value = panicChangeAction.value === 'change'
  } catch (err) {
    const msg = extractErrorMessage(err)
    panicChangeError.value = msg
    showError(msg)
  } finally {
    panicChangeBusy.value = false
  }
}

const methods = ref<Enrolled2FAMethods | null>(null)
const methodsLoading = ref(true)
const methodsError = ref<string | null>(null)

async function loadMethods() {
  methodsLoading.value = true
  try {
    methods.value = await fetchEnrolled2FAMethods(isBranchSession)
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
    const result = await addTotpSetup(isBranchSession)
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
    revealedBackupCodes.value = await addTotpVerify(isBranchSession, totpCode.value)
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
    revealedBackupCodes.value = await regenerateBackupCodes(isBranchSession)
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
    const begin = await addPasskeyBegin(isBranchSession)
    const publicKey = decodeCreationOptions((begin.creation_options as { publicKey: unknown }).publicKey)
    const credential = await navigator.credentials.create({ publicKey }) as PublicKeyCredential
    const attestation = encodeAttestationResponse(credential)
    await addPasskeyFinish(isBranchSession, begin.session_id, passkeyName.value.trim() || 'Passkey', attestation)
    passkeyName.value = ''
    await loadMethods()
  } catch (err: any) {
    if (err?.name === 'NotAllowedError') {
      passkeyError.value = 'Passkey setup was cancelled or timed out. Please try again.'
    } else if (err?.name === 'InvalidStateError') {
      passkeyError.value = 'This passkey is already registered on this device.'
    } else {
      passkeyError.value = extractErrorMessage(err)
    }
    showError(passkeyError.value)
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
    await disableTotp(isBranchSession)
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
    await deletePasskey(isBranchSession, id)
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
const showOrgWideHistory = ref(false)
const loginHistoryPage = ref(1)
const loginHistoryTotalPages = ref(1)
const loginHistoryPageSize = 20
const loginHistorySearch = ref('')
let loginHistorySearchTimer: ReturnType<typeof setTimeout> | undefined

async function loadLoginHistory(page = 1) {
  loginHistoryLoading.value = true
  loginHistoryError.value = null
  try {
    const result = showOrgWideHistory.value
      ? await fetchOrganizationLoginHistory(page, loginHistoryPageSize, loginHistorySearch.value)
      : await fetchLoginHistory(isBranchSession, page, loginHistoryPageSize, loginHistorySearch.value)
    loginHistory.value = result.rows
    loginHistoryPage.value = result.page
    loginHistoryTotalPages.value = result.totalPages
  } catch (err) {
    const msg = extractErrorMessage(err)
    loginHistoryError.value = msg
    showError(msg)
  } finally {
    loginHistoryLoading.value = false
  }
}
onMounted(() => loadLoginHistory())

function toggleOrgWideHistory() {
  showOrgWideHistory.value = !showOrgWideHistory.value
  loadLoginHistory(1)
}

function onLoginHistorySearchInput() {
  if (loginHistorySearchTimer) clearTimeout(loginHistorySearchTimer)
  loginHistorySearchTimer = setTimeout(() => loadLoginHistory(1), 350)
}

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
  <DashboardLayout :org-id="props.orgId" title="Security">
    <div class="flex flex-col gap-6">
      <div v-if="revealedBackupCodes" class="text-sm bg-warning-light text-warning-text rounded-xl px-4 py-3 flex flex-col gap-2">
        <p class="font-semibold">Save these backup codes now — they will not be shown again.</p>
        <div class="grid grid-cols-2 sm:grid-cols-5 gap-2 font-mono text-xs">
          <span v-for="code in revealedBackupCodes" :key="code" class="bg-surface rounded-lg px-2 py-1 text-center">{{ code }}</span>
        </div>
        <button type="button" class="text-xs font-semibold self-start hover:underline" @click="revealedBackupCodes = null">Dismiss</button>
      </div>

      <AppCard v-if="!isOwner">
        <p class="text-sm text-text-muted">Transaction PIN management is owner-only. You confirm your own payouts with your account password instead.</p>
      </AppCard>

      <AppCard v-else>
        <h2 class="text-sm font-bold text-text-primary mb-1">Transaction PIN</h2>
        <p class="text-xs text-text-muted mb-5">
          As the owner, you confirm every payout with this 4-digit PIN instead of your password. Set it once here —
          you can change it any time by re-confirming your account password.
        </p>
        <div v-if="error" class="text-xs text-error-text bg-error-light rounded-lg px-3 py-2 mb-4">{{ error }}</div>
        <form class="flex flex-col gap-4 max-w-sm" @submit.prevent="save">
          <AppInput v-model="currentPassword" type="password" label="Current account password" required />
          <div class="grid grid-cols-2 gap-4">
            <AppInput v-model="pin" type="password" label="New 4-digit PIN" placeholder="0000" required />
            <AppInput v-model="confirmPin" type="password" label="Confirm PIN" placeholder="0000" required />
          </div>
          <AppButton type="submit" :loading="saving" class="self-start">Save PIN</AppButton>
        </form>
      </AppCard>

      <AppCard v-if="isOwner">
        <h2 class="text-sm font-bold text-text-primary mb-1">Panic PIN</h2>
        <p class="text-xs text-text-muted mb-5">
          A second, secret 4-digit PIN for emergencies. If someone forces you to authorize a payout, enter this
          instead of your real transaction PIN — the payout is silently blocked, all further payouts are frozen,
          and RigePay security is alerted immediately. It must be different from your real PIN.
        </p>
        <div v-if="panicChangeStep === 'idle'">
          <div v-if="panicError" class="text-xs text-error-text bg-error-light rounded-lg px-3 py-2 mb-4">{{ panicError }}</div>
          <form class="flex flex-col gap-4 max-w-sm mb-6" @submit.prevent="savePanicPin">
            <AppInput v-model="panicPassword" type="password" label="Current account password" required />
            <div class="grid grid-cols-2 gap-4">
              <AppInput v-model="panicPin" type="password" label="New panic PIN" placeholder="0000" required />
              <AppInput v-model="panicPinConfirm" type="password" label="Confirm panic PIN" placeholder="0000" required />
            </div>
            <AppButton type="submit" :loading="panicSaving" class="self-start">Set panic PIN</AppButton>
          </form>

          <div class="border-t border-border pt-4">
            <p class="text-xs text-text-muted mb-3">Already have a panic PIN set? Changing or removing it requires a 24-hour cooldown plus a confirmation code, so it can't be disabled under duress.</p>
            <div v-if="panicChangeError" class="text-xs text-error-text bg-error-light rounded-lg px-3 py-2 mb-3">{{ panicChangeError }}</div>
            <div class="flex items-end gap-2 flex-wrap">
              <AppInput v-model="panicChangePassword" type="password" label="Current account password" class="max-w-xs" />
              <AppButton size="sm" variant="secondary" :loading="panicChangeBusy" @click="startPanicChange('change')">Request PIN change</AppButton>
              <AppButton size="sm" variant="ghost" :loading="panicChangeBusy" @click="startPanicChange('remove')">Request removal</AppButton>
            </div>
          </div>
        </div>

        <div v-else-if="panicChangeStep === 'requested'" class="text-sm">
          <p class="text-text-primary mb-2">Cooldown started — you can request a confirmation code after:</p>
          <p class="font-mono text-xs bg-surface-2 rounded-lg px-3 py-2 inline-block mb-4">{{ panicChangeAvailableAt }}</p>
          <div v-if="panicChangeError" class="text-xs text-error-text bg-error-light rounded-lg px-3 py-2 mb-3">{{ panicChangeError }}</div>
          <div class="flex gap-2">
            <AppButton size="sm" :loading="panicChangeBusy" @click="sendPanicChangeOtp">Send confirmation code</AppButton>
            <AppButton size="sm" variant="ghost" @click="panicChangeStep = 'idle'">Cancel</AppButton>
          </div>
        </div>

        <div v-else-if="panicChangeStep === 'otp_sent'" class="flex flex-col gap-4 max-w-sm">
          <div v-if="panicChangeError" class="text-xs text-error-text bg-error-light rounded-lg px-3 py-2">{{ panicChangeError }}</div>
          <AppInput v-model="panicChangeOtp" label="6-digit confirmation code" placeholder="000000" />
          <template v-if="panicChangeAction === 'change'">
            <div class="grid grid-cols-2 gap-4">
              <AppInput v-model="panicChangeNewPin" type="password" label="New panic PIN" placeholder="0000" />
              <AppInput v-model="panicChangeNewPinConfirm" type="password" label="Confirm" placeholder="0000" />
            </div>
          </template>
          <div class="flex gap-2">
            <AppButton size="sm" :loading="panicChangeBusy" @click="finalizePanicChange">Confirm {{ panicChangeAction === 'remove' ? 'removal' : 'change' }}</AppButton>
            <AppButton size="sm" variant="ghost" @click="panicChangeStep = 'idle'">Cancel</AppButton>
          </div>
        </div>
      </AppCard>

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
            <div v-if="regenerateError" class="text-xs text-error-text">{{ regenerateError }}</div>

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
        <div class="flex items-center justify-between mb-1">
          <h2 class="text-sm font-bold text-text-primary">Login activity</h2>
          <AppButton v-if="isOwner && !isBranchSession" size="sm" variant="ghost" @click="toggleOrgWideHistory">
            {{ showOrgWideHistory ? 'Show my logins only' : 'Show all organization logins' }}
          </AppButton>
        </div>
        <p class="text-xs text-text-muted mb-3">Recent sign-ins to your account, with approximate location.</p>
        <AppInput
          v-model="loginHistorySearch"
          placeholder="Search by IP, city, country, or method"
          class="max-w-xs mb-4"
          @update:model-value="onLoginHistorySearchInput"
        />
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
        <div v-if="loginHistoryTotalPages > 1" class="flex items-center justify-between mt-4 pt-3 border-t border-border">
          <AppButton size="sm" variant="ghost" :disabled="loginHistoryPage <= 1 || loginHistoryLoading" @click="loadLoginHistory(loginHistoryPage - 1)">Previous</AppButton>
          <span class="text-xs text-text-muted">Page {{ loginHistoryPage }} of {{ loginHistoryTotalPages }}</span>
          <AppButton size="sm" variant="ghost" :disabled="loginHistoryPage >= loginHistoryTotalPages || loginHistoryLoading" @click="loadLoginHistory(loginHistoryPage + 1)">Next</AppButton>
        </div>
      </AppCard>
    </div>
  </DashboardLayout>
</template>
