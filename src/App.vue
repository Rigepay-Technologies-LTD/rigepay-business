<script setup lang="ts"></script>

<template>
  <div class="min-h-screen bg-bg">
    <router-view v-slot="{ Component }">
      <transition name="page" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>
  </div>
</template>
