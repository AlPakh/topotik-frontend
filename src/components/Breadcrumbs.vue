<template>
  <h2 class="breadcrumbs">
    <span class="breadcrumb-item root" @click="navigateTo(null)">Главная</span>

    <!-- Первые 2 элемента пути -->
    <div
      v-for="item in getFirstItems(2)"
      :key="`first-${item.id}`"
      class="breadcrumb-item-container"
    >
      <span class="breadcrumb-separator">/</span>
      <span class="breadcrumb-item" @click="navigateTo(item)">{{
        item.name
      }}</span>
    </div>

    <!-- Свернутая часть -->
    <div v-if="pathItems.length > 5" class="breadcrumb-item-container">
      <span class="breadcrumb-separator">/</span>
      <span
        class="breadcrumb-item collapsed"
        @click="toggleMenu"
        ref="collapseToggle"
        >...</span
      >

      <!-- Выпадающее меню -->
      <div v-if="showMenu" class="breadcrumb-menu">
        <div
          v-for="item in getMiddleItems()"
          :key="`mid-${item.id}`"
          class="breadcrumb-menu-item"
          @click.stop="navigateTo(item)"
        >
          {{ item.name }}
        </div>
      </div>
    </div>

    <!-- Последние 2 элемента пути -->
    <div
      v-for="(item, index) in getLastItems(2)"
      :key="`last-${item.id}`"
      class="breadcrumb-item-container"
    >
      <span class="breadcrumb-separator">/</span>
      <span
        class="breadcrumb-item"
        :class="{ current: index === getLastItems(2).length - 1 }"
        @click="navigateTo(item)"
        >{{ item.name }}</span
      >
    </div>
  </h2>
</template>

<script>
export default {
  name: "BreadcrumbsNavigation",
  props: {
    // Путь в виде массива объектов с id и name
    pathItems: {
      type: Array,
      default: () => [],
    },
  },
  data() {
    return {
      showMenu: false,
    };
  },
  methods: {
    navigateTo(item) {
      // Если item равен null, значит переходим в корневой каталог
      console.log(
        "Breadcrumbs - переход к элементу:",
        item ? item.name : "Главная"
      );
      this.showMenu = false; // Закрываем меню при навигации
      this.$emit("navigate", item);
    },

    getFirstItems(count) {
      // Получаем первые элементы пути, если путь достаточно длинный
      return this.pathItems.length > 5 ? this.pathItems.slice(0, count) : [];
    },

    getMiddleItems() {
      // Получаем средние элементы пути для отображения в выпадающем меню
      if (this.pathItems.length <= 5) return [];
      return this.pathItems.slice(2, this.pathItems.length - 2);
    },

    getLastItems(count) {
      // Получаем последние элементы пути
      if (this.pathItems.length <= 5) {
        return this.pathItems; // Если путь короткий, возвращаем весь путь
      }
      return this.pathItems.slice(Math.max(0, this.pathItems.length - count));
    },

    toggleMenu() {
      // Переключаем видимость выпадающего меню
      this.showMenu = !this.showMenu;
    },

    closeMenu(e) {
      // Закрываем меню при клике вне
      if (
        this.$refs.collapseToggle &&
        !this.$refs.collapseToggle.contains(e.target)
      ) {
        this.showMenu = false;
      }
    },
  },

  mounted() {
    // Добавляем обработчик клика для закрытия меню
    document.addEventListener("click", this.closeMenu);
  },

  beforeUnmount() {
    // Удаляем обработчик при уничтожении компонента
    document.removeEventListener("click", this.closeMenu);
  },
};
</script>

<style scoped>
.breadcrumbs {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  font-size: 1.5rem;
  margin: 0;
  font-weight: normal;
  position: relative;
}

.breadcrumb-item-container {
  display: flex;
  align-items: center;
}

.breadcrumb-item {
  color: #4a90e2;
  cursor: pointer;
  transition: color 0.2s;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.breadcrumb-item:hover {
  color: #2a6fc7;
  text-decoration: underline;
}

.breadcrumb-item.current {
  color: #333;
  cursor: default;
  font-weight: 500;
}

.breadcrumb-item.current:hover {
  text-decoration: none;
}

.breadcrumb-item.root {
  color: #4a90e2;
}

.breadcrumb-separator {
  margin: 0 6px;
  color: #888;
}

/* Стили для свернутой части */
.breadcrumb-item.collapsed {
  font-weight: bold;
  background-color: #f0f7ff;
  padding: 2px 8px;
  border-radius: 4px;
  position: relative;
}

.breadcrumb-item.collapsed:hover {
  background-color: #e0f0ff;
}

/* Стили для выпадающего меню */
.breadcrumb-menu {
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 100;
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  border-radius: 4px;
  min-width: 200px;
  max-height: 300px;
  overflow-y: auto;
  margin-top: 5px;
}

.breadcrumb-menu-item {
  padding: 8px 16px;
  font-size: 14px;
  cursor: pointer;
  white-space: normal;
  transition: background-color 0.2s;
}

.breadcrumb-menu-item:hover {
  background-color: #f5f5f5;
}
</style> 