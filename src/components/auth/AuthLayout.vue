<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const props = defineProps<{
  title: string
  subtitle?: string
  /** 1-based current step; when set with `steps`, renders the progress bar */
  step?: number
  steps?: string[]
}>()

const quotes = [
  { stat: '12 branches', body: 'one login, one ledger — every collection and payout in real time.' },
  { stat: 'Bank-grade', body: 'double-entry accounting on every shilling, CBK-compliant by design.' },
  { stat: 'Maker–checker', body: 'role-based approvals so no payout leaves without a second pair of eyes.' },
  { stat: 'Passkeys + 2FA', body: 'phishing-resistant sign-in for owners, managers and branch staff.' },
]
const qi = ref(0)
let timer: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  timer = setInterval(() => {
    qi.value = (qi.value + 1) % quotes.length
  }, 4500)
})
onBeforeUnmount(() => clearInterval(timer))

const stepList = computed<string[]>(() => props.steps ?? [])
const currentStep = computed(() => props.step ?? 0)
const hasStepper = computed(() => stepList.value.length > 0 && currentStep.value > 0)
</script>

<template>
  <div class="min-h-screen flex flex-col lg:flex-row bg-bg">
    <!-- Brand panel -->
    <div
      class="hidden lg:flex lg:w-[46%] xl:w-[42%] relative flex-col justify-between p-12 xl:p-14 overflow-hidden text-white auth-brand"
    >
      <div class="auth-mesh" aria-hidden="true" />
      <div class="auth-grain" aria-hidden="true" />

      <div class="relative z-10 flex items-center gap-3">
        <div
          class="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-md ring-1 ring-white/25 flex items-center justify-center font-bold text-sm shrink-0"
        >
          RB
        </div>
        <span class="font-bold tracking-tight text-base">RigePay&nbsp;Business</span>
      </div>

      <div class="relative z-10 flex flex-col gap-10">
        <h2 class="text-[2rem] xl:text-[2.6rem] font-bold leading-[1.1] tracking-tight max-w-md">
          Run your organization's money with confidence.
        </h2>

        <!-- Floating app preview -->
        <div class="auth-preview-wrap">
          <div class="auth-preview">
            <div class="ap-side">
              <span class="ap-dot" /><span class="ap-line" /><span class="ap-line short" />
              <span class="ap-line" /><span class="ap-line short" />
            </div>
            <div class="ap-main">
              <div class="ap-kpis">
                <div class="ap-kpi"><span class="ap-kpi-lbl" /><span class="ap-kpi-val" /></div>
                <div class="ap-kpi"><span class="ap-kpi-lbl" /><span class="ap-kpi-val" /></div>
                <div class="ap-kpi"><span class="ap-kpi-lbl" /><span class="ap-kpi-val" /></div>
              </div>
              <div class="ap-chart">
                <span style="height:38%" /><span style="height:64%" /><span style="height:47%" />
                <span style="height:82%" /><span style="height:58%" /><span style="height:71%" />
                <span style="height:44%" /><span style="height:90%" />
              </div>
            </div>
          </div>
          <div class="auth-toast">
            <span class="auth-toast-ico">✓</span>
            <span>Payout of KES 240,000 settled to Nakuru branch</span>
          </div>
        </div>

        <div class="relative min-h-[3.5rem]">
          <Transition name="quote" mode="out-in">
            <p :key="qi" class="text-[0.95rem] leading-relaxed text-white/80">
              <span class="font-semibold text-white">{{ quotes[qi].stat }}</span> — {{ quotes[qi].body }}
            </p>
          </Transition>
        </div>
      </div>

      <p class="relative z-10 text-xs text-white/45">
        © {{ new Date().getFullYear() }} RigePay Technologies Ltd
      </p>
    </div>

    <!-- Form panel -->
    <div class="flex-1 flex flex-col items-center justify-center px-4 py-10">
      <div class="w-full max-w-[26rem] flex flex-col gap-6">
        <div class="flex justify-center lg:hidden">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-lg bg-primary text-white flex items-center justify-center font-bold text-xs">RB</div>
            <span class="font-bold tracking-tight text-text-primary">RigePay Business</span>
          </div>
        </div>

        <div class="auth-card">
          <!-- Stepper -->
          <div v-if="hasStepper" class="mb-7">
            <div class="flex items-center">
              <template v-for="(label, i) in stepList" :key="label">
                <div class="flex flex-col items-center gap-1.5 shrink-0">
                  <div
                    :class="[
                      'w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-colors',
                      i + 1 < currentStep
                        ? 'bg-primary text-white'
                        : i + 1 === currentStep
                          ? 'bg-primary/10 text-primary ring-2 ring-primary'
                          : 'bg-surface-2 text-text-muted',
                    ]"
                  >
                    <svg v-if="i + 1 < currentStep" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                    <span v-else>{{ i + 1 }}</span>
                  </div>
                  <span
                    :class="[
                      'text-[10px] font-medium whitespace-nowrap hidden sm:block',
                      i + 1 === currentStep ? 'text-text-primary' : 'text-text-muted',
                    ]"
                  >{{ label }}</span>
                </div>
                <div
                  v-if="i < stepList.length - 1"
                  :class="['h-0.5 flex-1 mx-1 rounded-full transition-colors', i + 1 < currentStep ? 'bg-primary' : 'bg-surface-2']"
                />
              </template>
            </div>
          </div>

          <div class="mb-6">
            <h1 class="text-[1.35rem] font-bold text-text-primary tracking-tight">{{ title }}</h1>
            <p v-if="subtitle" class="text-sm text-text-secondary mt-1.5 leading-relaxed">{{ subtitle }}</p>
          </div>

          <slot />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-brand {
  background: linear-gradient(135deg, var(--color-primary-dark) 0%, var(--color-primary) 55%, #4f46e5 100%);
}
.auth-mesh {
  position: absolute;
  inset: -20%;
  background:
    radial-gradient(35% 45% at 18% 20%, rgba(255, 255, 255, 0.28) 0%, transparent 60%),
    radial-gradient(30% 40% at 85% 75%, rgba(129, 140, 248, 0.45) 0%, transparent 60%),
    radial-gradient(28% 38% at 70% 15%, rgba(59, 130, 246, 0.4) 0%, transparent 60%),
    radial-gradient(32% 42% at 25% 85%, rgba(255, 255, 255, 0.12) 0%, transparent 60%);
  filter: blur(6px);
  animation: mesh-drift 22s ease-in-out infinite alternate;
  will-change: transform;
}
@keyframes mesh-drift {
  0% { transform: translate3d(-3%, -2%, 0) scale(1.05) rotate(0deg); }
  100% { transform: translate3d(4%, 3%, 0) scale(1.12) rotate(6deg); }
}
.auth-grain {
  position: absolute;
  inset: 0;
  opacity: 0.05;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' /%3E%3C/svg%3E");
}
.auth-preview-wrap {
  position: relative;
  max-width: 22rem;
}
.auth-preview {
  display: flex;
  gap: 10px;
  padding: 12px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.18);
  box-shadow: 0 30px 60px -20px rgba(0, 0, 0, 0.45);
  transform: perspective(1200px) rotateX(6deg) rotateY(-9deg);
  animation: preview-float 6s ease-in-out infinite alternate;
}
@keyframes preview-float {
  from { transform: perspective(1200px) rotateX(6deg) rotateY(-9deg) translateY(0); }
  to { transform: perspective(1200px) rotateX(4deg) rotateY(-7deg) translateY(-8px); }
}
.ap-side { width: 46px; display: flex; flex-direction: column; gap: 7px; padding-top: 4px; }
.ap-dot { width: 14px; height: 14px; border-radius: 5px; background: rgba(255, 255, 255, 0.6); }
.ap-line { height: 6px; border-radius: 3px; background: rgba(255, 255, 255, 0.28); }
.ap-line.short { width: 60%; }
.ap-main { flex: 1; display: flex; flex-direction: column; gap: 10px; }
.ap-kpis { display: flex; gap: 6px; }
.ap-kpi { flex: 1; background: rgba(255, 255, 255, 0.14); border-radius: 8px; padding: 8px 7px; display: flex; flex-direction: column; gap: 5px; }
.ap-kpi-lbl { height: 4px; width: 70%; border-radius: 2px; background: rgba(255, 255, 255, 0.4); }
.ap-kpi-val { height: 8px; width: 90%; border-radius: 3px; background: rgba(255, 255, 255, 0.7); }
.ap-chart { flex: 1; min-height: 74px; display: flex; align-items: flex-end; gap: 6px; padding: 0 2px; }
.ap-chart span { flex: 1; border-radius: 3px 3px 0 0; background: linear-gradient(to top, rgba(255, 255, 255, 0.85), rgba(255, 255, 255, 0.35)); }
.auth-toast {
  position: absolute;
  right: -14px;
  bottom: -22px;
  display: flex;
  align-items: center;
  gap: 8px;
  max-width: 15rem;
  padding: 9px 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.95);
  color: var(--color-text-primary);
  font-size: 11px;
  font-weight: 600;
  line-height: 1.3;
  box-shadow: 0 20px 40px -12px rgba(0, 0, 0, 0.4);
  animation: toast-in 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.6s both;
}
.auth-toast-ico {
  width: 16px; height: 16px; border-radius: 999px;
  background: var(--color-success); color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-size: 10px; flex-shrink: 0;
}
@keyframes toast-in {
  from { opacity: 0; transform: translateY(8px) scale(0.96); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
.auth-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 20px;
  padding: 2rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04), 0 12px 40px -14px rgba(17, 24, 39, 0.15);
  animation: card-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
}
@keyframes card-in {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}
.quote-enter-active, .quote-leave-active { transition: all 0.4s ease; }
.quote-enter-from { opacity: 0; transform: translateY(6px); }
.quote-leave-to { opacity: 0; transform: translateY(-6px); }

@media (prefers-reduced-motion: reduce) {
  .auth-mesh, .auth-preview, .auth-card, .auth-toast { animation: none; }
}
</style>
