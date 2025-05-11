<!-- src/views/CreateMap.vue -->
<template>
  <div class="create-map">
    <h1>Создание новой карты</h1>
    
    <form @submit.prevent="handleCreateMap">
      <div class="form-group">
        <label for="title">Название карты</label>
        <input 
          id="title" 
          v-model="mapData.title" 
          type="text" 
          required 
          placeholder="Введите название карты"
        />
      </div>
      
      <div class="form-group">
        <label for="mapType">Тип карты</label>
        <select id="mapType" v-model="mapData.map_type" required>
          <option value="" disabled>Выберите тип карты</option>
          <option value="osm">OpenStreetMap</option>
          <option value="custom_image">Пользовательское изображение</option>
        </select>
      </div>
      
      <div class="form-group" v-if="mapData.map_type === 'custom_image'">
        <label for="imageUrl">URL изображения</label>
        <input 
          id="imageUrl" 
          v-model="mapData.image_url" 
          type="text" 
          placeholder="Введите URL изображения"
        />
      </div>
      
      <div class="form-group">
        <label for="accessLevel">Уровень доступа</label>
        <select id="accessLevel" v-model="mapData.access_level" required>
          <option value="private">Приватная</option>
          <option value="link">По ссылке</option>
          <option value="public">Публичная</option>
        </select>
      </div>
      
      <div v-if="error" class="error-message">
        {{ error }}
      </div>
      
      <div class="form-actions">
        <button type="button" @click="$router.go(-1)" class="cancel-button">Отмена</button>
        <button type="submit" :disabled="loading" class="create-button">
          {{ loading ? 'Создание...' : 'Создать карту' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { createMap } from '../services/maps';

export default {
  name: 'CreateMap',
  
  setup() {
    const router = useRouter();
    const loading = ref(false);
    const error = ref('');
    
    const mapData = ref({
      title: '',
      map_type: '',
      image_url: '',
      access_level: 'private'
    });
    
    const handleCreateMap = async () => {
      loading.value = true;
      error.value = '';
      
      try {
        const newMap = await createMap(mapData.value);
        router.push(`/map/${newMap.map_id}`);
      } catch (err) {
        error.value = err.response?.data?.detail || 'Не удалось создать карту. Пожалуйста, попробуйте позже.';
      } finally {
        loading.value = false;
      }
    };
    
    return {
      mapData,
      loading,
      error,
      handleCreateMap
    };
  }
};
</script>

<style scoped src="@/assets/css/views/CreateMap.css"></style> 