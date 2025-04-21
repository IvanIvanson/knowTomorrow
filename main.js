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
let currentEditIndex = null;

// Универсальная функция обработки категорий
function processCategories(callback) {
  categoriesConfig.forEach(category => {
    if (category.sub) {
      category.sub.forEach(subCat => callback(subCat));
    } else {
      callback(category);
    }
  });
}

// Функция для текстового описания оценки
function getRatingText(value) {
  const num = parseInt(value);
  if (num <= 3) return "Очень плохо";
  if (num <= 5) return "Удовлетворительно";
  if (num <= 7) return "Хорошо";
  return "Отлично";
}

// Инициализация формы
function initForm() {
  const container = document.getElementById('categories');
  container.innerHTML = '';

  processCategories(item => {
    container.insertAdjacentHTML('beforeend', `
      <div class="category-item mb-3">
        <label class="form-label">${item.name}</label>
        <div class="slider-container">
          <input type="range" class="form-range" id="${item.id}_score" min="1" max="10" value="5">
          <div class="rating-text" id="${item.id}_text">Удовлетворительно (5)</div>
        </div>
      </div>
    `);
  });

  // Обработчики для слайдеров
  document.querySelectorAll('#categories input[type="range"]').forEach(slider => {
    const textElement = document.getElementById(`${slider.id}_text`);
    
    slider.addEventListener('input', () => {
      const value = slider.value;
      const text = getRatingText(value);
      textElement.textContent = `${text} (${value})`;
    });
  });
}

// Сохранение данных дня
document.getElementById('save').addEventListener('click', () => {
  const today = new Date().toISOString().split('T')[0];
  const scores = {};

  processCategories(item => {
    scores[item.id] = parseInt(document.getElementById(`${item.id}_score`).value);
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

  // More robust destruction check
  if (window.dayChart instanceof Chart) {
    window.dayChart.destroy();
  }
  if (window.weekChart instanceof Chart) {
    window.weekChart.destroy();
  }

  const lastDay = daysData[daysData.length - 1];
  
  if (lastDay) {
    window.dayChart = new Chart(ctxDay, {
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
    
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${new Date(day.date).toLocaleDateString()}</td>
      <td>${avgScore}</td>
      <td>${getRatingText(avgScore)}</td>
      <td>
        <button class="btn btn-sm btn-outline-primary edit-btn" data-index="${index}">✏️</button>
        <button class="btn btn-sm btn-outline-danger delete-btn" data-index="${index}">🗑️</button>
      </td>
    `;
    tbody.appendChild(row);
  });

  // Обработчики кнопок
  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      currentEditIndex = parseInt(e.target.dataset.index);
      openEditModal(currentEditIndex);
    });
  });

  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      if (confirm('Удалить эту запись?')) {
        deleteDay(parseInt(e.target.dataset.index));
      }
    });
  });
}

// Открытие модального окна редактирования
function openEditModal(index) {
  const form = document.getElementById('editForm');
  const dayData = daysData[index];

  form.innerHTML = '';
  
  processCategories(item => {
    const value = dayData.scores[item.id];
    form.innerHTML += `
      <div class="mb-3">
        <label class="form-label">${item.name}</label>
        <div class="slider-container">
          <input type="range" class="form-range" id="edit_${item.id}_score" min="1" max="10" value="${value}">
          <div class="rating-text">${getRatingText(value)} (${value})</div>
        </div>
      </div>
    `;
  });

  // Обработчики слайдеров в модалке
  document.querySelectorAll('#editForm input[type="range"]').forEach(slider => {
    const textElement = slider.nextElementSibling;
    
    slider.addEventListener('input', () => {
      const value = slider.value;
      const text = getRatingText(value);
      textElement.textContent = `${text} (${value})`;
    });
  });

  // Показываем модальное окно через Bootstrap
  const modal = new bootstrap.Modal(document.getElementById('editModal'));
  modal.show();
}

// Сохранение изменений
document.getElementById('saveEdit').addEventListener('click', () => {
  if (currentEditIndex !== null) {
    const editedData = { date: daysData[currentEditIndex].date, scores: {} };

    processCategories(item => {
      editedData.scores[item.id] = parseInt(document.getElementById(`edit_${item.id}_score`).value);
    });

    daysData[currentEditIndex] = editedData;
    localStorage.setItem('daysData', JSON.stringify(daysData));
    
    const modal = bootstrap.Modal.getInstance(document.getElementById('editModal'));
    modal.hide();
    
    renderHistory();
    updateCharts();
  }
});

// Удаление дня
function deleteDay(index) {
  daysData.splice(index, 1);
  localStorage.setItem('daysData', JSON.stringify(daysData));
  renderHistory();
  updateCharts();
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
  initForm();
  if (daysData.length > 0) {
    updateCharts();
    renderHistory();
  }
});