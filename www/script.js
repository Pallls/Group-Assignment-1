$(document).ready(function() {
      // Initialize state
      let expenses = JSON.parse(localStorage.getItem('expenses')) || [];
      let monthlyBudget = parseFloat(localStorage.getItem('monthlyBudget')) || 2000.00;
      let categoryChart = null;
      let trendChart = null;

      // Category colors
      const categoryColors = {
        Food: '#2563eb',
        Transport: '#16a34a',
        Shopping: '#ca8a04',
        Bills: '#dc2626',
        Entertainment: '#7c3aed',
        Healthcare: '#0891b2',
        Others: '#6b7280'
      };

      // Initialize charts
      function initializeCharts() {
        // Category chart
        const ctxCategory = document.getElementById('categoryChart').getContext('2d');
        categoryChart = new Chart(ctxCategory, {
          type: 'doughnut',
          data: {
            labels: [],
            datasets: [{
              data: [],
              backgroundColor: Object.values(categoryColors)
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'right'
              }
            }
          }
        });

        // Trend chart
        const ctxTrend = document.getElementById('trendChart').getContext('2d');
        trendChart = new Chart(ctxTrend, {
          type: 'line',
          data: {
            labels: [],
            datasets: [{
              label: 'Daily Expenses',
              data: [],
              borderColor: '#2563eb',
              tension: 0.4,
              fill: true,
              backgroundColor: 'rgba(37, 99, 235, 0.1)'
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: false
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                ticks: {
                  callback: value => `MYR ${value}`
                }
              }
            }
          }
        });
      }

      // Update dashboard
      function updateDashboard() {
        // Update budget card
        const totalSpent = expenses.reduce((sum, exp) => sum + exp.amount, 0);
        const remaining = monthlyBudget - totalSpent;
        const percentageUsed = (totalSpent / monthlyBudget) * 100;

        $('#budgetAmount').text(monthlyBudget.toFixed(2));
        $('#spentAmount').text(totalSpent.toFixed(2));
        $('#remainingAmount').text(remaining.toFixed(2));
        $('#budgetProgress')
          .css('width', `${percentageUsed}%`)
          .removeClass('bg-success bg-warning bg-danger')
          .addClass(percentageUsed > 90 ? 'bg-danger' : percentageUsed > 70 ? 'bg-warning' : 'bg-success');

        // Update quick stats
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        
        // Calculate daily average
        const dailyAvg = totalSpent / daysInMonth;
        $('#dailyAvg').text(`MYR ${dailyAvg.toFixed(2)}`);

        // Calculate most spent category
        const categoryTotals = expenses.reduce((acc, exp) => {
          acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
          return acc;
        }, {});
        const topCategory = Object.entries(categoryTotals)
          .sort(([,a], [,b]) => b - a)[0]?.[0] || 'None';
        $('#topCategory').text(topCategory);

        // Calculate this week's total
        const weekStart = new Date(today.setDate(today.getDate() - today.getDay()));
        const weeklyTotal = expenses
          .filter(exp => new Date(exp.date) >= weekStart)
          .reduce((sum, exp) => sum + exp.amount, 0);
        $('#weeklyTotal').text(`MYR ${weeklyTotal.toFixed(2)}`);

        updateCharts();
        renderExpenseList();
        saveData();
      }

      // Update charts
      function updateCharts() {
        // Update category chart
        const categoryData = expenses.reduce((acc, exp) => {
          acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
          return acc;
        }, {});

        categoryChart.data.labels = Object.keys(categoryData);
        categoryChart.data.datasets[0].data = Object.values(categoryData);
        categoryChart.update();

        // Update trend chart
        const dailyData = expenses.reduce((acc, exp) => {
          acc[exp.date] = (acc[exp.date] || 0) + exp.amount;
          return acc;
        }, {});

        const sortedDates = Object.keys(dailyData).sort();
        trendChart.data.labels = sortedDates.map(date => new Date(date).toLocaleDateString());
        trendChart.data.datasets[0].data = sortedDates.map(date => dailyData[date]);
        trendChart.update();
      }

      // Render expense list
      function renderExpenseList() {
        const expenseList = $('.expense-list');
        expenseList.empty();

        const sortedExpenses = [...expenses].sort((a, b) => new Date(b.date) - new Date(a.date));
        let currentDate = '';

        sortedExpenses.forEach((expense, index) => {
          const expenseDate = new Date(expense.date).toLocaleDateString();
          
          // Add date separator if it's a new date
          if (expenseDate !== currentDate) {
            currentDate = expenseDate;
            expenseList.append(`
              <div class="d-flex align-items-center p-2 bg-light">
                <small class="date-chip">${expenseDate}</small>
              </div>
            `);
          }

          expenseList.append(`
            <div class="expense-item" data-expense-id="${index}">
              <div>
                <h6 class="mb-1">${expense.description || expense.category}</h6>
                <span class="category-badge" style="background-color: ${categoryColors[expense.category]}20; color: ${categoryColors[expense.category]}">
                  <i class="fas fa-tag"></i> ${expense.category}
                </span>
                ${expense.isRecurring ? '<span class="ms-2 badge bg-secondary"><i class="fas fa-sync-alt"></i> Recurring</span>' : ''}
              </div>
              <div class="text-end">
                <h6 class="mb-1">MYR ${expense.amount.toFixed(2)}</h6>
                <div class="btn-group btn-group-sm">
                  <button class="btn btn-outline-secondary btn-sm edit-expense" title="Edit">
                    <i class="fas fa-edit"></i>
                  </button>
                  <button class="btn btn-outline-danger btn-sm delete-expense" title="Delete">
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
              </div>
            </div>
          `);
        });
      }

      // Save data to localStorage
      function saveData() {
        localStorage.setItem('expenses', JSON.stringify(expenses));
        localStorage.setItem('monthlyBudget', monthlyBudget);
      }

      // Event handlers
      $('#expenseForm').on('submit', function(e) {
        e.preventDefault();
        
        const newExpense = {
          amount: parseFloat($('#expenseAmount').val()),
          category: $('#expenseCategory').val(),
          description: $('#expenseDescription').val().trim(),
          date: $('#expenseDate').val(),
          isRecurring: $('#isRecurring').is(':checked')
        };

        expenses.push(newExpense);
        updateDashboard();
        $('#addExpenseModal').modal('hide');
        this.reset();

        // Show notification if over budget threshold
        const totalSpent = expenses.reduce((sum, exp) => sum + exp.amount, 0);
        if (totalSpent >= monthlyBudget * 0.8 && $('#enableNotifications').is(':checked')) {
          showNotification('Budget Alert', 'You have used 80% of your monthly budget!');
        }
      });

      $('#budgetForm').on('submit', function(e) {
        e.preventDefault();
        
        monthlyBudget = parseFloat($('#newBudgetAmount').val());
        updateDashboard();
        $('#budgetModal').modal('hide');
        this.reset();
      });

      // Search functionality
      $('#searchExpense').on('input', function() {
        const searchTerm = $(this).val().toLowerCase();
        $('.expense-item').each(function() {
          const expenseText = $(this).text().toLowerCase();
          $(this).toggle(expenseText.includes(searchTerm));
        });
      });

      // Delete expense
      $('.expense-list').on('click', '.delete-expense', function(e) {
        e.stopPropagation();
        const expenseId = $(this).closest('.expense-item').data('expense-id');
        
        if (confirm('Are you sure you want to delete this expense?')) {
          expenses.splice(expenseId, 1);
          updateDashboard();
        }
      });

      // Edit expense
      $('.expense-list').on('click', '.edit-expense', function(e) {
        e.stopPropagation();
        const expenseId = $(this).closest('.expense-item').data('expense-id');
        const expense = expenses[expenseId];

        // Populate form with expense data
        $('#expenseAmount').val(expense.amount);
        $('#expenseCategory').val(expense.category);
        $('#expenseDescription').val(expense.description);
        $('#expenseDate').val(expense.date);
        $('#isRecurring').prop('checked', expense.isRecurring);

        // Switch form to edit mode
        $('#addExpenseModal').modal('show');
        expenses.splice(expenseId, 1); // Remove old expense (will be replaced on form submit)
      });

      // Show notification
      function showNotification(title, message) {
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(title, { body: message });
        } else if ('Notification' in window && Notification.permission !== 'denied') {
          Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
              new Notification(title, { body: message });
            }
          });
        }
      }

      // Initialize
      initializeCharts();
      updateDashboard();

      // Set today's date as default in forms
      const today = new Date().toISOString().split('T')[0];
      $('#expenseDate').val(today);
      $('#budgetStartDate').val(today);
    });