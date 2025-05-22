// Обработчик выбора элемента (папки или карты)
async handleSelectItem(item) {
  try {
    this.loading = true;
    this.error = null;

    // Если выбрана папка (folder), загружаем её содержимое
    if (item.type === "folder") {
      console.log("Выбрана папка:", item.name);
      this.selectedItem = item;
      this.currentFolderId = item.id;
      saveLastOpenedFolder(item.id); // Сохраняем ID последней открытой папки
    }
    // Если выбрана карта, обрабатываем её
    else if (item.type === "map") {
      console.log("Выбрана карта:", item.name || item.title);
      
      // Загружаем полные данные карты, чтобы получить информацию о фоновом изображении
      try {
        const mapData = await getMapById(item.id);
        console.log("Загружены полные данные карты:", mapData);
        
        // Объединяем данные карты с уже существующими (чтобы сохранить поля из структуры папок)
        this.selectedItem = {
          ...item,
          ...mapData,
          id: item.id, // Сохраняем оригинальный ID из структуры папок
          type: 'map', // Убеждаемся, что тип остается 'map'
        };
        
        console.log("Данные для отображения карты:", this.selectedItem);
      } catch (error) {
        console.error("Ошибка при загрузке полных данных карты:", error);
        // Если не удалось загрузить полные данные, используем то, что есть
        this.selectedItem = item;
      }
    }
    
    this.loading = false;
    this.error = null;
  } catch (error) {
    console.error("Ошибка при выборе элемента:", error);
    this.loading = false;
    this.error = "Ошибка при загрузке элемента. Попробуйте позже.";
  }
}, 