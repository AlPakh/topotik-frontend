<!-- src/views/CollectionDetails.vue -->
<template>
  <div class="collection-details">
    <div v-if="loading" class="loading">
      Загрузка коллекции...
    </div>
    
    <div v-else-if="error" class="error">
      {{ error }}
    </div>
    
    <div v-else>
      <div class="header">
        <h1>{{ collection.title }}</h1>
        <div class="map-info">
          Карта: {{ mapTitle }}
        </div>
        <div class="access-level">
          <span :class="getAccessIcon(collection.access_level)"></span>
          {{ getAccessLabel(collection.access_level) }}
        </div>
      </div>
      
      <div class="markers-section">
        <h2>Маркеры в коллекции</h2>
        
        <div v-if="markers.length === 0" class="empty-markers">
          В этой коллекции пока нет маркеров.
        </div>
        
        <div v-else class="markers-list">
          <div 
            v-for="marker in markers" 
            :key="marker.marker_id"
            class="marker-item"
            @click="viewMarker(marker.marker_id)"
          >
            <div class="marker-title">{{ marker.title || 'Без названия' }}</div>
            <div class="marker-coords">{{ formatCoords(marker.latitude, marker.longitude) }}</div>
            <div v-if="marker.description" class="marker-desc">{{ truncateText(marker.description, 100) }}</div>
          </div>
        </div>
      </div>
      
      <div class="actions">
        <button @click="goBack" class="back-button">Назад</button>
        <button @click="editCollection" class="edit-button">Редактировать</button>
        <button @click="confirmDelete" class="delete-button">Удалить</button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { getCollectionById, deleteCollection } from '../services/collections';
import { getMapById } from '../services/maps';
import { getMarkersByMap } from '../services/markers';

export default {
  name: 'CollectionDetails',
  
  setup() {
    const router = useRouter();
    const route = useRoute();
    const collectionId = route.params.id;
    
    const collection = ref({});
    const mapTitle = ref('');
    const markers = ref([]);
    const loading = ref(true);
    const error = ref('');
    
    const fetchData = async () => {
      loading.value = true;
      error.value = '';
      
      try {
        // Получаем данные о коллекции
        collection.value = await getCollectionById(collectionId);
        
        // Получаем данные о карте
        const mapData = await getMapById(collection.value.map_id);
        mapTitle.value = mapData.title;
        
        // Получаем маркеры для этой коллекции
        // Примечание: в API бэкенда нужно добавить метод для получения маркеров коллекции
        // Пока используем все маркеры карты
        const allMarkers = await getMarkersByMap(collection.value.map_id);
        markers.value = allMarkers;
        
      } catch (err) {
        error.value = 'Не удалось загрузить данные. Пожалуйста, попробуйте позже.';
        console.error('Ошибка при загрузке данных:', err);
      } finally {
        loading.value = false;
      }
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
    
    const formatCoords = (lat, lng) => {
      return `${parseFloat(lat).toFixed(6)}, ${parseFloat(lng).toFixed(6)}`;
    };
    
    const truncateText = (text, maxLength) => {
      if (!text) return '';
      return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    };
    
    const viewMarker = (markerId) => {
      router.push(`/markers/${markerId}`);
    };
    
    const goBack = () => {
      router.push('/collections');
    };
    
    const editCollection = () => {
      router.push(`/collections/edit/${collectionId}`);
    };
    
    const confirmDelete = async () => {
      if (confirm('Вы уверены, что хотите удалить эту коллекцию?')) {
        try {
          await deleteCollection(collectionId);
          router.push('/collections');
        } catch (err) {
          error.value = 'Не удалось удалить коллекцию. Пожалуйста, попробуйте позже.';
          console.error('Ошибка при удалении коллекции:', err);
        }
      }
    };
    
    onMounted(fetchData);
    
    return {
      collection,
      mapTitle,
      markers,
      loading,
      error,
      getAccessLabel,
      getAccessIcon,
      formatCoords,
      truncateText,
      viewMarker,
      goBack,
      editCollection,
      confirmDelete
    };
  }
};
</script>

<style scoped src="@/assets/css/views/CollectionDetails.css"></style> 