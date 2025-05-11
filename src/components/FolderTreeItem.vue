<template>
  <li class="tree-item">
    <div class="item-line"
         @click="onSelectItem"
         @mouseover="hovered = true"
         @mouseleave="handleMouseLeave"
         draggable="true"
         @dragstart="onDragStart"
         @dragover.prevent="onDragOver"
         @drop.prevent="onDrop"
         @dragenter.prevent="dragEnter = true"
         @dragleave="dragEnter = false"
         :class="{ 'drag-over': dragEnter }">
      <!-- Иконка в зависимости от типа -->
      <div v-if="item.type === 'folder'" class="folder-icon" :class="{ 'hovered': hovered }">
        <div v-if="!hovered">
          <div v-if="isOpen">📂</div>
          <div v-else>📁</div>
        </div>
        <div v-else class="arrow-icon" :class="{ 'arrow-down': isOpen }" @click.stop="toggleFolder">
          <img src="../assets/svg/arrow.svg" alt="Arrow" />
        </div>
      </div>
      <div v-else-if="item.mapType === 'real'" class="icon">🗺️</div>
      <div v-else class="icon">📔</div>

      <span class="item-name" :title="item.name">{{ displayName }}</span>

      <!-- Кнопка с тремя точками (всегда в разметке) -->
      <button class="dots-button" @click.stop="toggleMenu">
        ⋮
      </button>

      <!-- Контекстное меню -->
      <div v-if="showMenu" class="context-menu" @mouseover="menuHovered = true" @mouseleave="menuHovered = false">
        <button @click="renameItem">Переименовать</button>
        <button @click="deleteItem" class="delete-button">Удалить</button>
      </div>
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
      menuHovered: false,
      showMenu: false,
      isOpen: false,
      dragEnter: false,
      closeMenuTimer: null
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
    handleMouseLeave() {
      this.hovered = false
      
      // Закрываем меню с задержкой, чтобы можно было навести курсор на само меню
      clearTimeout(this.closeMenuTimer)
      this.closeMenuTimer = setTimeout(() => {
        if (!this.menuHovered) {
          this.showMenu = false
        }
      }, 300)
    },
    renameItem() {
      this.showMenu = false
      // Удаляем проверку типа карты
      
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
      // Удаляем проверку типа карты
      
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
        // Если пытаемся переместить папку, проверяем, что не создаем циклическую зависимость
        if (sourceItemData.type === 'folder') {
          // Генерируем событие moveItem с дополнительным полем для проверки на циклическую зависимость
          this.$emit('moveItem', { 
            sourceId: sourceItemData.id, 
            targetId: this.item.id,
            checkCycle: true // Добавляем флаг для проверки на циклическую зависимость
          })
        } else {
          // Для карт просто перемещаем
          this.$emit('moveItem', { 
            sourceId: sourceItemData.id, 
            targetId: this.item.id 
          })
          
          // Автоматически раскрываем папку при перетаскивании в нее
          if (!this.isOpen) {
            this.isOpen = true
          }
        }
      }
    },
    handleMoveItem(moveData) {
      // Прокидываем событие дальше наверх
      this.$emit('moveItem', moveData)
    }
  },
  beforeUnmount() {
    // Очищаем таймер при уничтожении компонента
    clearTimeout(this.closeMenuTimer)
  }
}
</script>

<style scoped src="@/assets/css/components/FolderTreeItem.css"></style>