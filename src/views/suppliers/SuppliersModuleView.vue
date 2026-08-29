<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import SuppliersOverviewPanel from '@/components/suppliers/SuppliersOverviewPanel.vue'
import SupplierPayablesPanel from '@/components/suppliers/SupplierPayablesPanel.vue'
import SupplierInvoicesPanel from '@/components/suppliers/SupplierInvoicesPanel.vue'
import PurchaseOrdersPanel from '@/components/suppliers/PurchaseOrdersPanel.vue'
import SuppliersAnalyticsPanel from '@/components/suppliers/SuppliersAnalyticsPanel.vue'

const props = defineProps<{ orgId: string; branchId?: string; docId?: string }>()
const route = useRoute()
const auth = useAuthStore()

const isBranch = computed(() => auth.meta?.memberType === 'branch_member')
const panel = computed(() => route.meta.apPanel as string)

const titles: Record<string, string> = {
  overview: 'Suppliers · Overview',
  payables: 'Suppliers · Payables',
  invoices: 'Supplier invoices',
  'invoice-detail': 'Supplier invoice',
  'purchase-orders': 'Purchase orders',
  'po-detail': 'Purchase order',
  analytics: 'Suppliers · Analytics',
}
</script>

<template>
  <DashboardLayout :org-id="props.orgId" :branch-id="props.branchId" :title="titles[panel] ?? 'Suppliers'">
    <SuppliersOverviewPanel v-if="panel === 'overview'" :is-branch="isBranch" :org-id="props.orgId" :branch-id="props.branchId" />
    <SupplierPayablesPanel v-else-if="panel === 'payables'" :is-branch="isBranch" :org-id="props.orgId" :branch-id="props.branchId" />
    <SupplierInvoicesPanel
      v-else-if="panel === 'invoices' || panel === 'invoice-detail'"
      :is-branch="isBranch" :org-id="props.orgId" :branch-id="props.branchId"
      :doc-id="panel === 'invoice-detail' ? props.docId : undefined"
    />
    <PurchaseOrdersPanel
      v-else-if="panel === 'purchase-orders' || panel === 'po-detail'"
      :is-branch="isBranch" :org-id="props.orgId" :branch-id="props.branchId"
      :doc-id="panel === 'po-detail' ? props.docId : undefined"
    />
    <SuppliersAnalyticsPanel v-else-if="panel === 'analytics'" :is-branch="isBranch" :org-id="props.orgId" :branch-id="props.branchId" />
  </DashboardLayout>
</template>
