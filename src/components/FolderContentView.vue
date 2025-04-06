<template>
  <div :class="['folder-content', viewMode]">
    <div
      v-for="item in items"
      :key="item.id"
      class="item-card"
      @click="onSelect(item)"
      draggable="true"
      @dragstart="onDragStart($event, item)"
      @dragover.prevent
      @drop.prevent="onDrop($event, item)"
      @dragenter.prevent="highlightItem($event)"
      @dragleave="unhighlightItem($event)"
    >
      <!-- Иконка и название -->
      <div v-if="item.type === 'folder'" class="item-content folder">
        <span class="item-icon">📁</span>
        <span class="item-name" :title="item.name">{{ item.name }}</span>
      </div>
      <div v-else-if="item.type === 'map'" class="item-content">
        <span v-if="item.mapType === 'real'" class="item-icon">🗺️</span>
        <span v-else class="item-icon">🗒️</span>
        <span class="item-name" :title="item.name">{{ item.name }}</span>
      </div>
    </div>

    <!-- Сообщение, если папка пуста -->
    <div v-if="items.length === 0" class="empty-folder">
      <p>Папка пуста</p>
      <p class="hint">Создайте новую карту или папку, либо перетащите существующие элементы сюда</p>
    </div>
  </div>
</template>

<script>
export default {
  name: 'FolderContentView',
  props: {
    items: {
      type: Array,
      default: () => []
    },
    viewMode: {
      type: String,
      default: 'list'
    }
  },
  methods: {
    onSelect(item) {
      this.$emit('selectItem', item)
    },
    onDragStart(event, item) {
      event.dataTransfer.setData('text/plain', JSON.stringify({
        id: item.id,
        type: item.type,
        name: item.name,
        mapType: item.mapType
      }))
      event.dataTransfer.effectAllowed = 'move'
    },
    onDrop(event, targetItem) {
      // Сбрасываем подсветку
      event.currentTarget.classList.remove('drag-over')
      
      const sourceItemData = JSON.parse(event.dataTransfer.getData('text/plain'))
      
      // Если целевой элемент - папка, переместить внутрь
      if (targetItem.type === 'folder') {
        this.$emit('moveItem', { 
          sourceId: sourceItemData.id, 
          targetId: targetItem.id 
        })
      }
    },
    highlightItem(event) {
      // Подсвечиваем только папки при перетаскивании
      if (event.currentTarget.querySelector('.folder')) {
        event.currentTarget.classList.add('drag-over')
      }
    },
    unhighlightItem(event) {
      event.currentTarget.classList.remove('drag-over')
    }
  }
}
</script>

<style scoped src="@/assets/css/components/FolderContentView.css"></style>
