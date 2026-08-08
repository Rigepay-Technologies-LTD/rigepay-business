import { reactive } from 'vue'

interface ConfirmModalOptions {
  title?: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
}

interface ConfirmModalState extends Required<Omit<ConfirmModalOptions, 'message'>> {
  visible: boolean
  message: string
  resolve: ((value: boolean) => void) | null
}

const state = reactive<ConfirmModalState>({
  visible: false,
  title: 'Please confirm',
  message: '',
  confirmLabel: 'Confirm',
  cancelLabel: 'Cancel',
  danger: false,
  resolve: null,
})

function confirmAction(options: ConfirmModalOptions | string): Promise<boolean> {
  const opts = typeof options === 'string' ? { message: options } : options
  state.title = opts.title || (opts.danger ? 'Are you sure?' : 'Please confirm')
  state.message = opts.message
  state.confirmLabel = opts.confirmLabel || 'Confirm'
  state.cancelLabel = opts.cancelLabel || 'Cancel'
  state.danger = opts.danger ?? false
  state.visible = true
  return new Promise<boolean>((resolve) => {
    state.resolve = resolve
  })
}

function settle(result: boolean) {
  state.visible = false
  state.resolve?.(result)
  state.resolve = null
}

export function useConfirmModal() {
  return {
    state,
    confirmAction,
    handleConfirm: () => settle(true),
    handleCancel: () => settle(false),
  }
}
