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

<style scoped>
.collections-view {
  padding: 20px;
}

h1 {
  margin-bottom: 30px;
  text-align: center;
}

.loading, .error, .empty {
  text-align: center;
  padding: 20px;
  margin: 20px 0;
}

.error {
  color: red;
}

.collections-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.collection-card {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 15px;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  cursor: pointer;
}

.collection-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
}

.collection-title {
  font-weight: bold;
  font-size: 18px;
  margin-bottom: 10px;
}

.collection-map {
  color: #666;
  margin-bottom: 10px;
}

.collection-access {
  display: flex;
  align-items: center;
  color: #666;
  font-size: 14px;
}

.access-icon {
  margin-right: 8px;
}

.create-button {
  display: block;
  margin: 20px auto;
  padding: 10px 20px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
}

.create-button:hover {
  background-color: #45a049;
}
</style> 