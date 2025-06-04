<!-- src/components/MapsList.vue -->
<template>
  <div class="maps-list">
    <h2>Мои карты</h2>

    <div v-if="loading" class="loading">Загрузка...</div>

    <div v-else-if="error" class="error">
      {{ error }}
    </div>

    <div v-else-if="maps.length === 0" class="empty">
      У вас пока нет карт. Создайте свою первую карту!
    </div>

    <div v-else class="maps-grid">
      <div
        v-for="map in maps"
        :key="map.map_id"
        class="map-card"
        @click="viewMap(map.map_id)"
      >
        <div class="map-title">{{ map.title }}</div>
        <div class="map-type">{{ mapTypeLabel(map.map_type) }}</div>
        <div class="map-date">{{ formatDate(map.created_at) }}</div>
      </div>
    </div>

    <button class="create-button" @click="createNewMap">
      Создать новую карту
    </button>
  </div>
</template>

<script>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { getMaps } from "../services/maps";

export default {
  name: "MapsList",

  setup() {
    const router = useRouter();
    const maps = ref([]);
    const loading = ref(true);
    const error = ref("");

    const fetchMaps = async () => {
      loading.value = true;
      error.value = "";

      try {
        maps.value = await getMaps();
      } catch (err) {
        error.value =
          "Не удалось загрузить карты. Пожалуйста, попробуйте позже.";
        console.error("Ошибка при загрузке карт:", err);
      } finally {
        loading.value = false;
      }
    };

    const viewMap = (mapId) => {
      router.push(`/maps/${mapId}`);
    };

    const createNewMap = () => {
      router.push("/maps/create");
    };

    const mapTypeLabel = (type) => {
      const types = {
        osm: "OpenStreetMap",
        custom_image: "Пользовательское изображение",
      };
      return types[type] || type;
    };

    const formatDate = (dateString) => {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat("ru-RU", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(date);
    };

    onMounted(fetchMaps);

    return {
      maps,
      loading,
      error,
      viewMap,
      createNewMap,
      mapTypeLabel,
      formatDate,
    };
  },
};
</script>

<style scoped src="@/assets/css/components/MapsList.css">
</style>