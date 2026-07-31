import { reactive } from 'vue'

export type ResponseModalKind = 'error' | 'success' | 'info'

interface ResponseModalState {
  visible: boolean
  kind: ResponseModalKind
  title: string
  message: string
}

const state = reactive<ResponseModalState>({
  visible: false,
  kind: 'info',
  title: '',
  message: '',
})

function show(kind: ResponseModalKind, message: string, title?: string) {
  if (!message) return
  state.kind = kind
  state.title = title || (kind === 'error' ? 'Something went wrong' : kind === 'success' ? 'Success' : 'Notice')
  state.message = message
  state.visible = true
}

function close() {
  state.visible = false
}

export function useResponseModal() {
  return {
    state,
    showError: (message: string, title?: string) => show('error', message, title),
    showSuccess: (message: string, title?: string) => show('success', message, title),
    showInfo: (message: string, title?: string) => show('info', message, title),
    close,
  }
}
