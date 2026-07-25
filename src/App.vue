<script setup lang="ts">
import { useRoute } from 'vue-router'

const route = useRoute()


const isDashboardRoute = () => route.path.startsWith('/org/')
</script>

<template>
  <div class="min-h-screen bg-bg">
    <router-view v-slot="{ Component }">
      <transition :name="isDashboardRoute() ? '' : 'page'" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>
  </div>
</template>
