// Конфигурация категорий
const categoriesConfig = [
  { id: 'nature_dead', name: 'Неживая природа', sub: [
    { id: 'weather', name: 'Погода' },
    { id: 'tech', name: 'Техника' },
    { id: 'accidents', name: 'Неприятности' }
  ]},
  { id: 'nature_alive', name: 'Живая природа', sub: [
    { id: 'pets', name: 'Домашние животные' },
    { id: 'wild', name: 'Дикие животные/птицы' }
  ]},
  { id: 'people', name: 'Люди', sub: [
    { id: 'home', name: 'Дома' },
    { id: 'work', name: 'На работе' },
    { id: 'street', name: 'На улице' }
  ]},
  { id: 'health', name: 'Самочувствие' }
];

let daysData = JSON.parse(localStorage.getItem('daysData')) || [];

// Функция для текстового описания оценки
function getRatingText(value) {
  if (value <= 3) return "Очень плохо";
  if (value <= 5) return "Удовлетворительно";
  if (value <= 7) return "Хорошо";
  return "Отлично";
}

// Инициализация формы
//==========================
function initForm() {
  const container = document.getElementById('categories');
  container.innerHTML = '';

  categoriesConfig.forEach(category => {
    const categoryDiv = document.createElement('div');
    categoryDiv.className = 'category-item';
    categoryDiv.innerHTML = `<h3>${category.name}</h3>`;
    container.appendChild(categoryDiv);

    if (category.sub) {
      category.sub.forEach(subCat => {
        const subDiv = document.createElement('div');
        subDiv.className = 'category-item';
        subDiv.innerHTML = `
          <label>${subCat.name}</label>
          <div class="slider-container">
            <input type="range" id="${subCat.id}_score" min="1" max="10" value="5">
          </div>
        `;
        container.appendChild(subDiv);
      });
    } else {
      const div = document.createElement('div');
      div.className = 'category-item';
      div.innerHTML = `
        <label>${category.name}</label>
        <div class="slider-container">
          <input type="range" id="${category.id}_score" min="1" max="10" value="5">
        </div>
      `;
      container.appendChild(div);
    }
  });

  // Добавляем обработчики для слайдеров на главной странице
  document.querySelectorAll('#categories input[type="range"]').forEach(slider => {
    const textElement = document.createElement('div');
    textElement.className = 'rating-text';
    textElement.id = `${slider.id}_text`;
    textElement.textContent = `Удовлетворительно (5)`;
    slider.parentNode.insertBefore(textElement, slider.nextSibling);

    slider.addEventListener('input', function() {
      const value = parseInt(this.value);
      const text = getRatingText(value);
      document.getElementById(`${this.id}_text`).textContent = `${text} (${value})`;
    });
  });
}

function openEditModal(index) {
  const modal = document.getElementById('editModal');
  const form = document.getElementById('editForm');
  const dayData = daysData[index];

  // Очищаем только содержимое формы (кроме кнопок)
  form.innerHTML = `
    <div id="editFormContent"></div>
    <div class="modal-buttons">
      <button id="saveEdit">Сохранить</button>
      <button id="deleteDay">Удалить</button>
    </div>
  `;

  const formContent = document.getElementById('editFormContent');
  
  // Заполняем форму текущими данными
  categoriesConfig.forEach(category => {
    if (category.sub) {
      category.sub.forEach(subCat => {
        const value = dayData.scores[subCat.id];
        formContent.innerHTML += `
          <div class="category-item">
            <label>${subCat.name}</label>
            <div class="slider-container">
              <input type="range" id="edit_${subCat.id}_score" min="1" max="10" value="${value}">
              <div class="rating-text">${getRatingText(value)} (${value})</div>
            </div>
          </div>
        `;
      });
    } else {
      const value = dayData.scores[category.id];
      formContent.innerHTML += `
        <div class="category-item">
          <label>${category.name}</label>
          <div class="slider-container">
            <input type="range" id="edit_${category.id}_score" min="1" max="10" value="${value}">
            <div class="rating-text">${getRatingText(value)} (${value})</div>
          </div>
        </div>
      `;
    }
  });

  // Обработчики для слайдеров
  document.querySelectorAll('#editFormContent input[type="range"]').forEach(slider => {
    const textElement = slider.nextElementSibling;
    
    slider.addEventListener('input', () => {
      const value = parseInt(slider.value);
      const text = getRatingText(value);
      textElement.textContent = `${text} (${value})`;
    });
  });

  // Обработчики для кнопок
  document.getElementById('saveEdit').addEventListener('click', () => saveEditedDay(index));
  document.getElementById('deleteDay').addEventListener('click', () => deleteDay(index));
  
  
  // Показываем модальное окно
  modal.style.display = 'block';
}
//=============================================
// Сохранение данных дня
document.getElementById('save').addEventListener('click', () => {
  const today = new Date().toISOString().split('T')[0];
  const scores = {};

  categoriesConfig.forEach(category => {
    if (category.sub) {
      category.sub.forEach(subCat => {
        scores[subCat.id] = parseInt(document.getElementById(`${subCat.id}_score`).value);
      });
    } else {
      scores[category.id] = parseInt(document.getElementById(`${category.id}_score`).value);
    }
  });

  daysData.push({ date: today, scores });
  localStorage.setItem('daysData', JSON.stringify(daysData));
  
  alert('День сохранён!');
  updateCharts();
  renderHistory();
});

// Обновление графиков
function updateCharts() {
  const ctxDay = document.getElementById('dayChart').getContext('2d');
  const ctxWeek = document.getElementById('weekChart').getContext('2d');

  // Безопасное уничтожение предыдущих графиков
  if (typeof window.dayChart !== 'undefined' && window.dayChart instanceof Chart) {
    window.dayChart.destroy();
  }
  if (typeof window.weekChart !== 'undefined' && window.weekChart instanceof Chart) {
    window.weekChart.destroy();
  }

  const lastDay = daysData[daysData.length - 1];
  
  if (lastDay) {
    window.dayChart = new Chart(ctxDay, {
      // ... остальные параметры графика
     
        type: 'radar',
        data: {
          labels: Object.keys(lastDay.scores),
          datasets: [{
            label: 'Оценки',
            data: Object.values(lastDay.scores),
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            borderColor: 'rgba(75, 192, 192, 1)',
            pointBackgroundColor: 'rgba(75, 192, 192, 1)'
          }]
        },
        options: {
          scales: {
            r: {
              angleLines: { display: true },
              suggestedMin: 0,
              suggestedMax: 10
            }
          }
        }
     
    });

    const weekData = daysData.slice(-7);
    window.weekChart = new Chart(ctxWeek, {
      // ... остальные параметры графика
      type: 'line',
      data: {
        labels: weekData.map(day => day.date),
        datasets: [{
          label: 'Средняя оценка',
          data: weekData.map(day => {
            const scores = Object.values(day.scores);
            return (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
          }),
          borderColor: 'rgba(153, 102, 255, 1)',
          tension: 0.1
        }]
      },
      options: {
        scales: {
          y: { min: 0, max: 10 }
        }
      }
    });
  }
}

// Отображение истории
function renderHistory() {
  const tbody = document.querySelector('#historyTable tbody');
  tbody.innerHTML = '';

  daysData.forEach((day, index) => {
    const scores = Object.values(day.scores);
    const avgScore = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
    const date = new Date(day.date).toLocaleDateString();
    
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${date}</td>
      <td>${avgScore}</td>
      <td>${getRatingText(avgScore)}</td>
      <td>
        <button class="action-btn edit-btn" data-index="${index}">✏️</button>
        <button class="action-btn delete-btn" data-index="${index}">🗑️</button>
      </td>
    `;
    tbody.appendChild(row);
  });

  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => openEditModal(parseInt(e.target.dataset.index)));
  });

  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => deleteDay(parseInt(e.target.dataset.index)));
  });
}

// Редактирование записи
function openEditModal(index) {
  const modal = document.getElementById('editModal');
  const form = document.getElementById('editForm');
  const dayData = daysData[index];

  form.innerHTML = '';
  
  categoriesConfig.forEach(category => {
    if (category.sub) {
      category.sub.forEach(subCat => {
        const value = dayData.scores[subCat.id];
        form.innerHTML += `
          <div class="category-item">
            <label>${subCat.name}</label>
            <div class="slider-container">
              <input type="range" id="edit_${subCat.id}_score" min="1" max="10" value="${value}">
              <div class="rating-text">${getRatingText(value)} (${value})</div>
            </div>
          </div>
        `;
      });
    } else {
      const value = dayData.scores[category.id];
      form.innerHTML += `
        <div class="category-item">
          <label>${category.name}</label>
          <div class="slider-container">
            <input type="range" id="edit_${category.id}_score" min="1" max="10" value="${value}">
            <div class="rating-text">${getRatingText(value)} (${value})</div>
          </div>
        </div>
      `;
    }
  });

  // Обработчики для слайдеров в модалке
  document.querySelectorAll('#editForm input[type="range"]').forEach(slider => {
    const textElement = slider.nextElementSibling;
    
    slider.addEventListener('input', () => {
      const value = parseInt(slider.value);
      const text = getRatingText(value);
      textElement.textContent = `${text} (${value})`;
    });
  });

  document.getElementById('saveEdit').onclick = () => saveEditedDay(index);
  document.getElementById('deleteDay').onclick = () => deleteDay(index);

  modal.style.display = 'block';
 
}
document.getElementById('close').addEventListener('click', () => closeModal());
function closeModal() {
  document.getElementById('editModal').style.display = 'none';
  
}


// Сохранение изменений
function saveEditedDay(index) {
  const editedData = { date: daysData[index].date, scores: {} };

  categoriesConfig.forEach(category => {
    if (category.sub) {
      category.sub.forEach(subCat => {
        editedData.scores[subCat.id] = parseInt(document.getElementById(`edit_${subCat.id}_score`).value);
      });
    } else {
      editedData.scores[category.id] = parseInt(document.getElementById(`edit_${category.id}_score`).value);
    }
  });

  daysData[index] = editedData;
  localStorage.setItem('daysData', JSON.stringify(daysData));
  
  document.getElementById('editModal').style.display = 'none';
  renderHistory();
  updateCharts();
}

// Удаление дня
function deleteDay(index) {
  if (confirm('Удалить эту запись?')) {
    daysData.splice(index, 1);
    localStorage.setItem('daysData', JSON.stringify(daysData));
    renderHistory();
    updateCharts();
  }
}

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
  initForm();
  if (daysData.length > 0) {
    updateCharts();
    renderHistory();
  }
});