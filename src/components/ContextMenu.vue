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

<style scoped src="@/assets/css/components/ContextMenu.css">
</style>