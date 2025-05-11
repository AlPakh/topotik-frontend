<template>
  <div id="app">
    <router-view />
    <app-alert />
  </div>
</template>

<script>
import AppAlert from '@/components/AppAlert.vue';

export default {
  name: 'App',
  components: {
    AppAlert
  }
}
</script>

<style src="@/assets/css/app.css"></style>
