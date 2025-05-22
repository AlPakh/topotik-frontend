<template>
  <div class="map-sidebar">
    <div class="create-btn-container">
      <button class="create-btn" @click="$emit('show-create-panel')">
        Создать
      </button>
    </div>

    <div class="sidebar-header">
      <h3>{{ mapName }}</h3>
    </div>

    <div class="marker-categories">
      <div v-for="category in categories" :key="category.id" class="category">
        <div class="category-header" :style="{ color: category.color }">
          <span class="toggle-icon" @click="toggleCategory(category)">
            <div
              class="arrow-icon"
              :class="{ 'arrow-down': category.expanded }"
            >
              <img src="@/assets/svg/arrow.svg" alt="Arrow" />
            </div>
          </span>
          <span class="category-name">{{ category.name }}</span>
          <span
            class="visibility-toggle"
            @click="toggleCategoryVisibility(category)"
          >
            <span v-if="category.visible">👁️</span>
            <span v-else>👁️‍🗨️</span>
          </span>
          <button
            class="dots-button"
            @click="showCategoryMenu(category, $event)"
          >
            ⋮
          </button>
        </div>

        <div v-if="category.expanded" class="markers-list">
          <div
            v-for="marker in category.markers"
            :key="marker.id"
            class="marker-item"
            :style="{ borderLeftColor: category.color }"
            draggable="true"
            @dragstart="onMarkerDragStart($event, marker, category)"
            @dragover.prevent
            @dragenter.prevent="dragEnterMarker = marker.id"
            @dragleave="dragEnterMarker = null"
            :class="{ 'drag-over': dragEnterMarker === marker.id }"
            @drop="onMarkerDrop($event, marker, category)"
          >
            <span class="marker-name">{{ marker.name || marker.title }}</span>
            <span
              class="visibility-toggle"
              @click="toggleMarkerVisibility(marker)"
            >
              <span v-if="marker.visible">👁️</span>
              <span v-else>👁️‍🗨️</span>
            </span>
            <button
              class="dots-button"
              @click="showMarkerMenu(marker, category, $event)"
            >
              ⋮
            </button>
          </div>

          <!-- Область для перетаскивания метки в пустую категорию -->
          <div
            v-if="category.markers.length === 0"
            class="empty-category-drop"
            @dragover.prevent
            @dragenter.prevent="dragEnterCategory = category.id"
            @dragleave="dragEnterCategory = null"
            :class="{ 'drag-over': dragEnterCategory === category.id }"
            @drop="onCategoryDrop($event, category)"
          >
            Перетащите сюда метку
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: "MapSidebar",
  props: {
    categories: {
      type: Array,
      required: true,
    },
    mapName: {
      type: String,
      default: "Карта без названия",
    },
  },
  data() {
    return {
      dragEnterCategory: null,
      dragEnterMarker: null,
    };
  },
  methods: {
    toggleCategory(category) {
      category.expanded = !category.expanded;
      this.$emit("category-toggled", category);
    },
    toggleCategoryVisibility(category) {
      category.visible = !category.visible;
      this.$emit("category-visibility-changed", category);
    },
    toggleMarkerVisibility(marker) {
      marker.visible = !marker.visible;
      this.$emit("marker-visibility-changed", marker);
    },
    showCategoryMenu(category, event) {
      // Предотвращаем всплытие события
      event.stopPropagation();

      // Отправляем событие в родительский компонент
      this.$emit("show-category-menu", {
        category,
        position: {
          x: event.clientX,
          y: event.clientY,
        },
      });
    },
    showMarkerMenu(marker, category, event) {
      // Предотвращаем всплытие события
      event.stopPropagation();

      // Отправляем событие в родительский компонент
      this.$emit("show-marker-menu", {
        marker,
        category,
        position: {
          x: event.clientX,
          y: event.clientY,
        },
      });
    },
    onMarkerDragStart(event, marker, category) {
      // Сохраняем информацию о перетаскиваемой метке
      event.dataTransfer.setData(
        "text/plain",
        JSON.stringify({
          markerId: marker.id,
          categoryId: category.id,
        })
      );
      event.dataTransfer.effectAllowed = "move";

      // Изменяем стиль элемента при перетаскивании
      if (event.target.classList.contains("marker-item")) {
        event.target.classList.add("dragging");
      }

      this.$emit("marker-drag-start", { marker, category });
    },
    onMarkerDrop(event, targetMarker, targetCategory) {
      // Сбрасываем состояние перетаскивания
      this.dragEnterMarker = null;

      try {
        // Получаем данные о перетаскиваемой метке
        const data = JSON.parse(event.dataTransfer.getData("text/plain"));
        const { markerId, categoryId } = data;

        // Отправляем событие в родительский компонент для обработки перетаскивания
        this.$emit("marker-drop", {
          sourceMarkerId: markerId,
          sourceCategoryId: categoryId,
          targetMarker,
          targetCategory,
        });
      } catch (error) {
        console.error("Ошибка при перетаскивании метки:", error);
      }
    },
    onCategoryDrop(event, targetCategory) {
      // Сбрасываем состояние перетаскивания
      this.dragEnterCategory = null;

      try {
        // Получаем данные о перетаскиваемой метке
        const data = JSON.parse(event.dataTransfer.getData("text/plain"));
        const { markerId, categoryId } = data;

        // Отправляем событие в родительский компонент для обработки перетаскивания
        this.$emit("category-drop", {
          sourceMarkerId: markerId,
          sourceCategoryId: categoryId,
          targetCategory,
        });
      } catch (error) {
        console.error("Ошибка при перетаскивании метки в категорию:", error);
      }
    },
  },
};
</script>

<style scoped src="@/assets/css/views/MapView.css"></style>