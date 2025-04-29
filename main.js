 // Конфигурация вопросов
 const questionsConfig = [
  { id: 'health', text: 'Самочувствие (0-10)' },
  { id: 'home', text: 'Отношение дома (0-10)' },
  { id: 'work', text: 'Отношение на работе (0-10)', skipOnWeekend: true },
  { id: 'street', text: 'Отношение на улице (0-10)' },
  { id: 'weather', text: 'Погода (0-10)' },
  { id: 'nature_dead', text: 'Неживая природа (0-10)' },
  { id: 'nature_alive', text: 'Живая природа (0-10)' }
];

let daysData = JSON.parse(localStorage.getItem('daysData')) || [];
let currentQuestion = 0;
let currentAnswers = {};
let currentDate = new Date();
let historyChart = null;
let radarChart = null;
let dateModal = null;
let isAddingMissedDay = false;

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', function() {
  dateModal = new bootstrap.Modal(document.getElementById('dateModal'));
  updateCurrentDateDisplay();
  initQuestionnaire();
  renderHistory();
  updateCharts();
  
  document.getElementById('addMissedDay').addEventListener('click', showDateModal);
  document.getElementById('confirmDate').addEventListener('click', startMissedDayQuestionnaire);
  
  // Обновляем радар при переключении вкладок
  const radarTab = document.getElementById('radar-tab');
  radarTab.addEventListener('shown.bs.tab', updateRadarChart);
});

function updateCurrentDateDisplay() {
  const options = { day: 'numeric', month: 'long', year: 'numeric' };
  document.getElementById('currentDate').textContent = currentDate.toLocaleDateString('ru-RU', options);
}

function initQuestionnaire() {
  const container = document.getElementById('questionContainer');
  container.innerHTML = '';
  
  questionsConfig.forEach((q, index) => {
    container.innerHTML += `
      <div class="question-card ${index === 0 ? 'active-question' : ''}" id="question-${q.id}">
        <h3>${q.text}</h3>
        <input type="range" class="form-range" min="0" max="10" value="5" id="input-${q.id}">
        <div class="rating-text" id="rating-${q.id}">Средне (5)</div>
      </div>
    `;
  });

  // Инициализация обработчиков
  questionsConfig.forEach(q => {
    const input = document.getElementById(`input-${q.id}`);
    input.addEventListener('input', function() {
      const value = this.value;
      document.getElementById(`rating-${q.id}`).textContent = 
        `${getRatingText(value)} (${value})`;
      currentAnswers[q.id] = value;
    });
    
    // Устанавливаем сохраненные значения при редактировании
    if (currentAnswers[q.id] !== undefined) {
      input.value = currentAnswers[q.id];
      document.getElementById(`rating-${q.id}`).textContent = 
        `${getRatingText(currentAnswers[q.id])} (${currentAnswers[q.id]})`;
    }
  });

  document.getElementById('prevQuestion').addEventListener('click', prevQuestion);
  document.getElementById('nextQuestion').addEventListener('click', nextQuestion);
  
  showQuestion(currentQuestion);
}

function getRatingText(value) {
  value = parseInt(value);
  if (value <= 3) return "Плохо";
  if (value <= 5) return "Средне";
  if (value <= 7) return "Хорошо";
  return "Отлично";
}

function showQuestion(index) {
  document.querySelectorAll('.question-card').forEach(card => {
    card.classList.remove('active-question');
  });
  
  // Пропускаем вопросы о работе в выходные
  const isWeekend = [0, 6].includes(currentDate.getDay());
  const currentQ = questionsConfig[index];
  
  if (currentQ.skipOnWeekend && isWeekend) {
    currentAnswers[currentQ.id] = null;
    if (index < questionsConfig.length - 1) {
      showQuestion(index + 1);
    } else {
      saveDay();
    }
    return;
  }
  
  document.getElementById(`question-${currentQ.id}`).classList.add('active-question');
  
  // Обновляем видимость кнопок
  document.getElementById('prevQuestion').style.display = index === 0 ? 'none' : 'block';
  document.getElementById('nextQuestion').textContent = 
    index === questionsConfig.length - 1 ? 'Сохранить' : 'Далее';
}

function prevQuestion() {
  if (currentQuestion > 0) {
    currentQuestion--;
    showQuestion(currentQuestion);
  }
}

function nextQuestion() {
  if (currentQuestion < questionsConfig.length - 1) {
    currentQuestion++;
    showQuestion(currentQuestion);
  } else {
    saveDay();
  }
}

function saveDay() {
  // Фильтруем null значения
  const filteredAnswers = {};
  for (const key in currentAnswers) {
    if (currentAnswers[key] !== null && currentAnswers[key] !== undefined) {
      filteredAnswers[key] = parseInt(currentAnswers[key]);
    }
  }
  
  const dateStr = currentDate.toISOString().split('T')[0];
  const existingIndex = daysData.findIndex(d => d.date === dateStr);
  
  if (existingIndex >= 0) {
    daysData[existingIndex] = { date: dateStr, scores: filteredAnswers };
  } else {
    daysData.push({ date: dateStr, scores: filteredAnswers });
  }
  
  localStorage.setItem('daysData', JSON.stringify(daysData));
  
  if (isAddingMissedDay) {
    isAddingMissedDay = false;
    currentDate = new Date();
  }
  
  resetQuestionnaire();
  renderHistory();
  updateCharts();
  alert('День сохранён!');
}

function resetQuestionnaire() {
  currentQuestion = 0;
  currentAnswers = {};
  updateCurrentDateDisplay();
  initQuestionnaire();
}

function showDateModal() {
  document.getElementById('selectedDate').valueAsDate = new Date();
  dateModal.show();
}

function startMissedDayQuestionnaire() {
  const selectedDate = new Date(document.getElementById('selectedDate').value);
  if (selectedDate.toString() === 'Invalid Date') {
    alert('Пожалуйста, выберите корректную дату');
    return;
  }
  
  const dateStr = selectedDate.toISOString().split('T')[0];
  const existingIndex = daysData.findIndex(d => d.date === dateStr);
  
  if (existingIndex >= 0) {
    if (!confirm('Для этой даты уже есть запись. Хотите отредактировать её?')) {
      dateModal.hide();
      return;
    }
    currentAnswers = {...daysData[existingIndex].scores};
  }
  
  isAddingMissedDay = true;
  currentDate = selectedDate;
  dateModal.hide();
  updateCurrentDateDisplay();
  initQuestionnaire();
  document.getElementById('questionnaire').scrollIntoView({ behavior: 'smooth' });
}

function renderHistory() {
  const tbody = document.querySelector('#historyTable tbody');
  tbody.innerHTML = '';
  
  daysData.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach((day, index) => {
    const scores = Object.values(day.scores).filter(v => v !== null);
    const avgScore = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : 'N/A';
    
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${new Date(day.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}</td>
      <td>${avgScore}</td>
      <td>${avgScore !== 'N/A' ? getRatingText(avgScore) : 'N/A'}</td>
      <td>
        <button class="btn btn-sm btn-outline-primary edit-btn" data-index="${index}">✏️</button>
        <button class="btn btn-sm btn-outline-danger delete-btn" data-index="${index}">🗑️</button>
      </td>
    `;
    tbody.appendChild(row);
  });
  
  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      editDay(parseInt(this.dataset.index));
    });
  });
  
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      if (confirm('Удалить эту запись?')) {
        deleteDay(parseInt(this.dataset.index));
      }
    });
  });
}

function editDay(index) {
  const dayData = daysData[index];
  currentDate = new Date(dayData.date);
  currentAnswers = {...dayData.scores};
  isAddingMissedDay = false;
  
  updateCurrentDateDisplay();
  initQuestionnaire();
  document.getElementById('questionnaire').scrollIntoView({ behavior: 'smooth' });
}

function deleteDay(index) {
  daysData.splice(index, 1);
  localStorage.setItem('daysData', JSON.stringify(daysData));
  renderHistory();
  updateCharts();
}

function updateCharts() {
  updateHistoryChart();
  updateRadarChart();
}

function updateHistoryChart() {
  const ctx = document.getElementById('historyChart').getContext('2d');
  
  if (historyChart) historyChart.destroy();
  if (daysData.length === 0) return;
  
  const labels = daysData.map(d => new Date(d.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })).reverse();
  const avgScores = daysData.map(d => {
    const scores = Object.values(d.scores).filter(v => v !== null);
    return scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length) : null;
  }).reverse();
  
  historyChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Средняя оценка',
        data: avgScores,
        borderColor: 'rgba(75, 192, 192, 1)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.1,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { min: 0, max: 10, ticks: { stepSize: 1 } },
        x: { ticks: { maxRotation: 45, minRotation: 45 } }
      }
    }
  });
}

function updateRadarChart() {
  const ctx = document.getElementById('radarChart').getContext('2d');
  
  if (radarChart) radarChart.destroy();
  if (daysData.length === 0) return;
  
  const lastDay = daysData[daysData.length - 1];
  const labels = [];
  const data = [];
  
  questionsConfig.forEach(q => {
    if (lastDay.scores[q.id] !== undefined && lastDay.scores[q.id] !== null) {
      labels.push(q.text.split(' (')[0]); // Убираем (0-10) из названий
      data.push(lastDay.scores[q.id]);
    }
  });
  
  radarChart = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Оценки за день',
        data: data,
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        borderColor: 'rgba(54, 162, 235, 1)',
        pointBackgroundColor: 'rgba(54, 162, 235, 1)',
        pointRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        r: {
          angleLines: { display: true },
          suggestedMin: 0,
          suggestedMax: 10,
          ticks: { stepSize: 1 }
        }
      },
      plugins: {
        legend: {
          position: 'top'
        }
      }
    }
  });
}