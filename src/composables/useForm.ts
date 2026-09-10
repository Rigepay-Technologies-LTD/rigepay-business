import { reactive, computed, toRaw } from 'vue'
import { firstError, type Rule } from '@/lib/validators'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>

export type Schema<T extends AnyRecord> = Partial<Record<keyof T & string, Rule[]>>

/**
 * Minimal form validation helper — no dependency.
 *
 *   const f = useForm(
 *     { phone: '', amount: '' },
 *     { phone: [required('Phone'), kenyanPhone], amount: [required(), amountKes({ min: 10 })] },
 *   )
 *   <AppInput v-model="f.values.phone" :error="f.errors.phone" @blur="f.touch('phone')" />
 *   if (!f.validateAll()) return
 */
export function useForm<T extends AnyRecord>(initial: T, schema: Schema<T>) {
  const values = reactive({ ...initial }) as T
  const errors = reactive<Record<string, string>>({})
  const touched = reactive<Record<string, boolean>>({})

  function validateField(field: keyof T & string): boolean {
    const rules = schema[field]
    if (!rules) {
      delete errors[field]
      return true
    }
    const err = firstError(values[field], rules, toRaw(values) as Record<string, unknown>)
    if (err) {
      errors[field] = err
      return false
    }
    delete errors[field]
    return true
  }

  function touch(field: keyof T & string) {
    touched[field] = true
    validateField(field)
  }

  function validateAll(): boolean {
    let ok = true
    for (const field of Object.keys(schema) as (keyof T & string)[]) {
      touched[field] = true
      if (!validateField(field)) ok = false
    }
    return ok
  }

  function reset(next?: Partial<T>) {
    Object.assign(values, initial, next ?? {})
    for (const k of Object.keys(errors)) delete errors[k]
    for (const k of Object.keys(touched)) delete touched[k]
  }

  const isValid = computed(() => Object.keys(errors).length === 0)

  return { values, errors, touched, validateField, touch, validateAll, reset, isValid }
}
