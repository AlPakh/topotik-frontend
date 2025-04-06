<template>
  <li class="tree-item">
    <div class="item-line"
         @click="onSelectItem"
         @mouseover="hovered = true"
         @mouseleave="hovered = false"
         draggable="true"
         @dragstart="onDragStart"
         @dragover.prevent="onDragOver"
         @drop.prevent="onDrop"
         @dragenter.prevent="dragEnter = true"
         @dragleave="dragEnter = false"
         :class="{ 'drag-over': dragEnter }">
      <!-- Иконка в зависимости от типа -->
      <span v-if="item.type === 'folder'" class="folder-icon">
        <span v-if="isOpen">📂</span>
        <span v-else>📁</span>
      </span>
      <span v-else-if="item.mapType === 'real'" class="icon">🗺️</span>
      <span v-else class="icon">🗒️</span>

      <span class="item-name" :title="item.name">{{ displayName }}</span>

      <!-- Если название слишком длинное, CSS может его обрезать. 
           При наведении справа появляется «три точки» -->
      <button v-if="hovered" class="dots-button" @click.stop="toggleMenu">
        ⋮
      </button>

      <!-- Контекстное меню -->
      <div v-if="showMenu" class="context-menu">
        <button @click="renameItem">Переименовать</button>
        <button @click="deleteItem" class="delete-button">Удалить</button>
      </div>

      <!-- Если это папка, отображаем стрелочку раскрывания -->
      <span v-if="item.type === 'folder'" class="toggle-folder" @click.stop="toggleFolder">
        {{ isOpen ? '▾' : '▸' }}
      </span>
    </div>

    <!-- Список дочерних элементов (если это папка) -->
    <ul v-if="item.type === 'folder' && isOpen" class="child-list">
      <folder-tree-item
        v-for="child in item.children"
        :key="child.id"
        :item="child"
        @selectItem="$emit('selectItem', $event)"
        @moveItem="handleMoveItem"
        @renameItem="$emit('renameItem', $event)"
        @deleteItem="$emit('deleteItem', $event)"
      />
    </ul>
  </li>
</template>

<script>
import FolderTreeItem from './FolderTreeItem.vue'

export default {
  name: 'FolderTreeItem',
  components: {
    FolderTreeItem
  },
  props: {
    item: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      hovered: false,
      showMenu: false,
      isOpen: false,
      dragEnter: false
    }
  },
  computed: {
    displayName() {
      // Для примера: если имя слишком длинное, обрезаем визуально, 
      // а при наведении можно title отобразить
      return this.item.name
    }
  },
  methods: {
    onSelectItem() {
      this.$emit('selectItem', this.item)
    },
    toggleFolder() {
      this.isOpen = !this.isOpen
    },
    toggleMenu() {
      this.showMenu = !this.showMenu
    },
    renameItem() {
      this.showMenu = false
      const newName = prompt('Новое имя?', this.item.name)
      if (newName) {
        // Вместо прямого изменения свойства item.name, генерируем событие
        this.$emit('renameItem', { 
          id: this.item.id, 
          newName: newName 
        })
      }
    },
    deleteItem() {
      this.showMenu = false
      this.$emit('deleteItem', { 
        id: this.item.id, 
        name: this.item.name,
        type: this.item.type
      })
    },
    onDragStart(event) {
      // Передаем информацию о перетаскиваемом элементе
      event.dataTransfer.setData('text/plain', JSON.stringify({
        id: this.item.id,
        type: this.item.type,
        name: this.item.name,
        mapType: this.item.mapType
      }))
      event.dataTransfer.effectAllowed = 'move'
    },
    onDragOver(event) {
      // Разрешаем перетаскивание (по умолчанию браузеры блокируют)
      event.preventDefault()
      this.dragEnter = true
    },
    onDrop(event) {
      this.dragEnter = false
      const sourceItemData = JSON.parse(event.dataTransfer.getData('text/plain'))
      
      // Не позволяем перетаскивать элемент сам в себя
      if (sourceItemData.id === this.item.id) {
        return
      }
      
      // Только папки могут быть целью для перетаскивания
      if (this.item.type === 'folder') {
        this.$emit('moveItem', { 
          sourceId: sourceItemData.id, 
          targetId: this.item.id 
        })
        
        // Автоматически раскрываем папку при перетаскивании в нее
        if (!this.isOpen) {
          this.isOpen = true
        }
      }
    },
    handleMoveItem(moveData) {
      // Прокидываем событие дальше наверх
      this.$emit('moveItem', moveData)
    }
  }
}
</script>

<style scoped src="@/assets/css/components/FolderTreeItem.css"></style>
