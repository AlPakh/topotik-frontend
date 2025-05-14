<template>
  <div
    v-if="show"
    class="context-menu"
    :style="positionStyle"
    @click.stop
    @mouseover="handleMenuMouseEnter"
    @mouseleave="handleMenuMouseLeave"
    ref="menu"
  >
    <div
      v-for="(item, index) in items"
      :key="index"
      class="menu-item"
      :class="{
        danger: item.danger,
        disabled: item.disabled,
      }"
      @click="handleItemClick(item)"
    >
      <span v-if="item.icon" class="menu-item-icon">
        <i v-if="typeof item.icon === 'string'" class="menu-icon">{{
          item.icon
        }}</i>
        <img
          v-else-if="item.icon.src"
          :src="item.icon.src"
          :alt="item.icon.alt || ''"
          class="icon-image"
        />
      </span>
      <span class="menu-item-label">{{ item.label }}</span>
    </div>
  </div>
</template>

<script>
export default {
  name: "ContextMenu",
  props: {
    show: {
      type: Boolean,
      default: false,
    },
    position: {
      type: Object,
      default: () => ({ x: 0, y: 0 }),
    },
    items: {
      type: Array,
      default: () => [],
    },
    autoClose: {
      type: Boolean,
      default: true,
    },
    closeDelay: {
      type: Number,
      default: 300,
    },
  },
  data() {
    return {
      closeMenuTimer: null,
      menuHovered: false,
    };
  },
  computed: {
    positionStyle() {
      // Динамическое позиционирование на основе доступного пространства окна
      return {
        top: `${this.position.y}px`,
        left: `${this.position.x}px`,
      };
    },
  },
  watch: {
    show(newValue) {
      if (newValue) {
        // При открытии меню проверяем его позицию
        this.$nextTick(() => {
          this.adjustMenuPosition();
        });
      } else {
        // При закрытии меню очищаем таймер
        this.clearCloseTimer();
      }
    },
  },
  mounted() {
    // Добавляем обработчик клика вне меню для его закрытия
    document.addEventListener("click", this.onClickOutside);

    // Проверяем, не выходит ли меню за границы окна
    this.$nextTick(() => {
      this.adjustMenuPosition();
    });
  },
  beforeUnmount() {
    // Удаляем обработчик при уничтожении компонента
    document.removeEventListener("click", this.onClickOutside);

    // Очищаем таймеры
    this.clearCloseTimer();
  },
  methods: {
    handleItemClick(item) {
      // Если пункт меню неактивен, ничего не делаем
      if (item.disabled) return;

      // Вызываем обработчик клика, передавая действие
      this.$emit("action", item.action);
      this.$emit("select", item.action);

      // Закрываем меню после выбора пункта
      this.closeMenu();
    },
    onClickOutside(event) {
      // Проверяем, был ли клик вне меню
      if (this.$refs.menu && !this.$refs.menu.contains(event.target)) {
        this.closeMenu();
      }
    },
    adjustMenuPosition() {
      if (!this.$refs.menu) return;

      const menu = this.$refs.menu;
      const rect = menu.getBoundingClientRect();
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;

      let x = this.position.x;
      let y = this.position.y;

      // Если меню выходит за правую границу экрана
      if (rect.right > windowWidth) {
        x = windowWidth - rect.width - 10;
      }

      // Если меню выходит за нижнюю границу экрана
      if (rect.bottom > windowHeight) {
        y = windowHeight - rect.height - 10;
      }

      // Убеждаемся, что меню не выходит за верхний или левый край
      if (x < 10) x = 10;
      if (y < 10) y = 10;

      // Обновляем позицию, если она изменилась
      if (x !== this.position.x || y !== this.position.y) {
        this.$emit("update:position", { x, y });
      }
    },
    handleMenuMouseEnter() {
      this.menuHovered = true;
      // Очищаем таймер закрытия при наведении на меню
      this.clearCloseTimer();
    },
    handleMenuMouseLeave() {
      this.menuHovered = false;
      // Запускаем таймер для закрытия меню при уходе курсора
      if (this.autoClose) {
        this.closeMenuTimer = setTimeout(() => {
          this.closeMenu();
        }, this.closeDelay);
      }
    },
    clearCloseTimer() {
      if (this.closeMenuTimer) {
        clearTimeout(this.closeMenuTimer);
        this.closeMenuTimer = null;
      }
    },
    closeMenu() {
      this.$emit("update:show", false);
      this.$emit("close");
    },
  },
};
</script>

<style scoped>
.context-menu {
  position: fixed;
  background-color: white;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  min-width: 160px;
  z-index: 1000;
  padding: 5px 0;
  font-size: 14px;
  user-select: none;
}

.menu-item {
  padding: 8px 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  transition: background-color 0.2s;
  white-space: nowrap;
}

.menu-item:hover {
  background-color: #f5f5f5;
}

.menu-item.danger {
  color: #ff4d4f;
}

.menu-item.danger:hover {
  background-color: #fff1f0;
}

.menu-item.disabled {
  color: #d9d9d9;
  cursor: not-allowed;
}

.menu-item.disabled:hover {
  background-color: transparent;
}

.menu-item-icon {
  margin-right: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
}

.menu-icon {
  font-style: normal;
}

.icon-image {
  width: 16px;
  height: 16px;
}

.menu-item-label {
  flex: 1;
}
</style> 