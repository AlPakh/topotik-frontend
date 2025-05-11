<!-- src/views/Collections.vue -->
<template>
  <div class="collections-view">
    <h1>Коллекции</h1>
    
    <div v-if="loading" class="loading">
      Загрузка коллекций...
    </div>
    
    <div v-else-if="error" class="error">
      {{ error }}
    </div>
    
    <div v-else-if="collections.length === 0" class="empty">
      У вас пока нет коллекций. Создайте свою первую коллекцию!
    </div>
    
    <div v-else class="collections-grid">
      <div
        v-for="collection in collections"
        :key="collection.collection_id"
        class="collection-card"
        @click="viewCollection(collection.collection_id)"
      >
        <div class="collection-title">{{ collection.title }}</div>
        <div class="collection-map">Карта: {{ getMapTitle(collection.map_id) }}</div>
        <div class="collection-access">
          <span class="access-icon">
            <i :class="getAccessIcon(collection.access_level)"></i>
          </span>
          {{ getAccessLabel(collection.access_level) }}
        </div>
      </div>
    </div>
    
    <button class="create-button" @click="createNewCollection">
      Создать новую коллекцию
    </button>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { getCollections } from '../services/collections';
import { getMaps } from '../services/maps';

export default {
  name: 'CollectionsView',
  
  setup() {
    const router = useRouter();
    const collections = ref([]);
    const maps = ref([]);
    const loading = ref(true);
    const error = ref('');
    
    const fetchData = async () => {
      loading.value = true;
      error.value = '';
      
      try {
        // Загружаем и коллекции, и карты параллельно
        const [collectionsData, mapsData] = await Promise.all([
          getCollections(),
          getMaps()
        ]);
        
        collections.value = collectionsData;
        maps.value = mapsData;
      } catch (err) {
        error.value = 'Не удалось загрузить данные. Пожалуйста, попробуйте позже.';
        console.error('Ошибка при загрузке данных:', err);
      } finally {
        loading.value = false;
      }
    };
    
    const getMapTitle = (mapId) => {
      const map = maps.value.find(m => m.map_id === mapId);
      return map ? map.title : 'Неизвестная карта';
    };
    
    const getAccessLabel = (level) => {
      const labels = {
        'private': 'Приватная',
        'link': 'По ссылке',
        'public': 'Публичная'
      };
      return labels[level] || level;
    };
    
    const getAccessIcon = (level) => {
      const icons = {
        'private': 'fas fa-lock',
        'link': 'fas fa-link',
        'public': 'fas fa-globe'
      };
      return icons[level] || 'fas fa-question';
    };
    
    const viewCollection = (collectionId) => {
      router.push(`/collections/${collectionId}`);
    };
    
    const createNewCollection = () => {
      router.push('/collections/create');
    };
    
    onMounted(fetchData);
    
    return {
      collections,
      loading,
      error,
      getMapTitle,
      getAccessLabel,
      getAccessIcon,
      viewCollection,
      createNewCollection
    };
  }
};
</script>

<style scoped src="@/assets/css/views/Collections.css"></style> 