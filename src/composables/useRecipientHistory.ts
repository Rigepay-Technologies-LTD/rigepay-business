import { ref } from 'vue'
import { fetchInvoiceRecipientHistory, type InvoiceRecipientHistoryEntry } from '@/lib/orgApi'

export function useRecipientHistory(isBranch = false) {
  const recipients = ref<InvoiceRecipientHistoryEntry[]>([])
  const loaded = ref(false)

  async function loadRecipientHistory() {
    if (loaded.value) return
    try {
      recipients.value = await fetchInvoiceRecipientHistory(isBranch)
      loaded.value = true
    } catch {
      console.log("failed to load")
    }
  }

  return { recipients, loadRecipientHistory }
}
