<!-- src/views/NotFound.vue -->
<template>
  <div class="not-found">
    <h1>404</h1>
    <h2>Страница не найдена</h2>
    <p>Извините, но страница, которую вы ищете, не существует.</p>
    <router-link to="/" class="home-link">Вернуться на главную</router-link>
  </div>
</template>

<script>
export default {
  name: 'NotFound'
}
</script>

<style scoped src="@/assets/css/views/NotFound.css"></style> 