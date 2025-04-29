  // Конфигурация вопросов
  const questionsConfig = [
    { id: 'health', text: 'Какое у вас самочувствие? Оцените по шкале от 0 до 10' },
    { id: 'home', text: 'Как к вам относились дома? Оцените по шкале от 0 до 10' },
    { id: 'work', text: 'Как к вам относились на работе? Оцените по шкале от 0 до 10', skipOnWeekend: true },
    { id: 'street', text: 'Как к вам относились на улице? Оцените по шкале от 0 до 10' },
    { id: 'weather', text: 'Какая была погода? Оцените по шкале от 0 до 10' },
    { id: 'nature_dead', text: 'Отношение неживой природы (например, порезались при бритье, ударились)? Оцените по шкале от 0 до 10' },
    { id: 'nature_alive', text: 'Отношение живой природы (например, укусила собака, поцарапала кошка)? Оцените по шкале от 0 до 10' }
  ];

  let daysData = JSON.parse(localStorage.getItem('daysData')) || [];
  let currentQuestion = 0;
  let currentAnswers = {};
  let currentDate = new Date();
  let historyChart = null;
  let dateModal = null;
  let isAddingMissedDay = false;

  // Инициализация при загрузке
  document.addEventListener('DOMContentLoaded', function() {
    dateModal = new bootstrap.Modal(document.getElementById('dateModal'));
    updateCurrentDateDisplay();
    initQuestionnaire();
    renderHistory();
    updateChart();
    
    document.getElementById('addMissedDay').addEventListener('click', showDateModal);
    document.getElementById('confirmDate').addEventListener('click', startMissedDayQuestionnaire);
  });

  function updateCurrentDateDisplay() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
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
    if (value <= 3) return "Очень плохо";
    if (value <= 5) return "Средне";
    if (value <= 7) return "Хорошо";
    return "Отлично";
  }

  function showQuestion(index) {
    document.querySelectorAll('.question-card').forEach(card => {
      card.classList.remove('active-question');
    });
    
    // Пропускаем вопросы о работе в выходные
    const isWeekend = [0, 6].includes(currentDate.getDay()); // 0 - воскресенье, 6 - суббота
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
    document.getElementById('prevQuestion').style.display = index === 0 ? 'none' : 'inline-block';
    
    if (index === questionsConfig.length - 1) {
      document.getElementById('nextQuestion').textContent = 'Сохранить';
    } else {
      document.getElementById('nextQuestion').textContent = 'Далее';
    }
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
    // Фильтруем null значения (пропущенные вопросы)
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
      // После сохранения пропущенного дня возвращаемся к текущей дате
      isAddingMissedDay = false;
      currentDate = new Date();
    }
    
    resetQuestionnaire();
    renderHistory();
    updateChart();
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
    
    // Проверяем, не существует ли уже запись для этой даты
    const dateStr = selectedDate.toISOString().split('T')[0];
    const existingIndex = daysData.findIndex(d => d.date === dateStr);
    
    if (existingIndex >= 0) {
      if (!confirm('Для этой даты уже есть запись. Хотите отредактировать её?')) {
        dateModal.hide();
        return;
      }
      
      // Загружаем существующие данные для редактирования
      currentAnswers = {...daysData[existingIndex].scores};
    }
    
    isAddingMissedDay = true;
    currentDate = selectedDate;
    dateModal.hide();
    updateCurrentDateDisplay();
    initQuestionnaire();
    
    // Прокручиваем к опроснику
    document.getElementById('questionnaire').scrollIntoView({ behavior: 'smooth' });
  }

  function renderHistory() {
    const tbody = document.querySelector('#historyTable tbody');
    tbody.innerHTML = '';
    
    // Сортируем по дате (новые сверху)
    daysData.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach((day, index) => {
      const scores = Object.values(day.scores).filter(v => v !== null);
      const avgScore = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : 'N/A';
      
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${new Date(day.date).toLocaleDateString('ru-RU')}</td>
        <td>${avgScore}</td>
        <td>${avgScore !== 'N/A' ? getRatingText(avgScore) : 'N/A'}</td>
        <td>
          <button class="btn btn-sm btn-outline-primary edit-btn" data-index="${index}">✏️</button>
          <button class="btn btn-sm btn-outline-danger delete-btn" data-index="${index}">🗑️</button>
        </td>
      `;
      tbody.appendChild(row);
    });
    
    // Добавляем обработчики для кнопок редактирования/удаления
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
    
    // Прокручиваем к опроснику
    document.getElementById('questionnaire').scrollIntoView({ behavior: 'smooth' });
  }

  function deleteDay(index) {
    daysData.splice(index, 1);
    localStorage.setItem('daysData', JSON.stringify(daysData));
    renderHistory();
    updateChart();
  }

  function updateChart() {
    const ctx = document.getElementById('historyChart').getContext('2d');
    
    if (historyChart) {
      historyChart.destroy();
    }
    
    if (daysData.length === 0) return;
    
    // Подготовка данных
    const labels = daysData.map(d => new Date(d.date).toLocaleDateString('ru-RU')).reverse();
    const avgScores = daysData.map(d => {
      const scores = Object.values(d.scores).filter(v => v !== null);
      return scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length) : null;
    }).reverse();
    
    historyChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Средняя оценка дня',
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
          y: {
            min: 0,
            max: 10,
            ticks: {
              stepSize: 1
            }
          },
          x: {
            ticks: {
              autoSkip: false,
              maxRotation: 45,
              minRotation: 45
            }
          }
        }
      }
    });
  }