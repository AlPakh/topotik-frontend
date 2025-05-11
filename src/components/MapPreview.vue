<template>
  <div class="map-preview-container">
    <div class="map-info">
      <h2>{{ map.name }}</h2>
      <p>Тип карты: {{ mapTypeDisplay }}</p>
    </div>
    
    <div class="map-preview">
      <div v-if="map.mapType === 'real'" class="real-map-preview">
        <!-- Здесь может быть превью OSM карты (в реальном приложении) -->
        <div class="osm-map-placeholder">
          <img src="@/assets/images/osm-preview.jpg" alt="OSM Map Preview" class="preview-img" v-if="hasFakePreview" />
          <div class="placeholder-text" v-else>Превью карты OpenStreetMap</div>
        </div>
      </div>
      <div v-else class="custom-map-preview">
        <!-- Здесь может быть превью пользовательской карты -->
        <div class="custom-map-placeholder">
          <div class="placeholder-text">Превью пользовательской карты</div>
        </div>
      </div>
    </div>
    
    <div class="map-actions">
      <button @click="openMap" class="open-map-button">Открыть карту</button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'MapPreview',
  props: {
    map: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      // Флаг для демонстрации превью (в реальном приложении превью будет загружаться с сервера)
      hasFakePreview: false
    }
  },
  computed: {
    mapTypeDisplay() {
      return this.map.mapType === 'real' ? 'Карта местности' : 'Пользовательская карта'
    }
  },
  methods: {
    openMap() {
      this.$emit('openMap', this.map.id, this.map.name)
    }
  },
  mounted() {
    // Имитация загрузки превью (в реальном приложении будет запрос к серверу)
    setTimeout(() => {
      this.hasFakePreview = true
    }, 500)
  }
}
</script>

<style scoped src="@/assets/css/components/MapPreview.css"></style>