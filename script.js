
const $ = (id) => document.getElementById(id);

const form = $("transactionForm");
const modal = $("modal");
const transactionList = $("transactionList");
const emptyMessage = $("emptyMessage");

const amount = Number(amountInput.value);



const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2
});

const icons = {
  Food: "🍔",
  Shopping: "🛍️",
  Transport: "🚕",
  Bills: "🧾",
  Salary: "💰",
  Freelance: "💻",
  Education: "📚",
  Other: "💳"
};

function getToday() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60000)
    .toISOString()
    .slice(0, 10);
}

$("date").value = getToday();

function loadTransactions() {
  try {
    const saved = JSON.parse(
      localStorage.getItem("moneyMateTransactions") || "[]"
    );

    if (!Array.isArray(saved)) return [];

    return saved.filter(item =>
      item &&
      typeof item.id === "string" &&
      typeof item.title === "string" &&
      Number.isFinite(item.amount) &&
      item.amount > 0 &&
      ["income", "expense"].includes(item.type) &&
      typeof item.category === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(item.date)
    );
  } catch {
    return [];
  }
}

let transactions = loadTransactions();

function saveTransactions() {
  try {
    localStorage.setItem(
      "moneyMateTransactions",
      JSON.stringify(transactions)
    );
    return true;
  } catch (error) {
    alert("Could not save data in this browser. Check browser storage.");
    return false;
  }
}

function formatMoney(amount) {
  return currency.format(amount);
}

function openModal() {
  form.reset();
  $("date").value = getToday();
  modal.classList.add("open");
  $("title").focus();
}

function closeModal() {
  modal.classList.remove("open");
}

$("addBtn").addEventListener("click", openModal);
$("closeBtn").addEventListener("click", closeModal);

modal.addEventListener("click", (event) => {
  if (event.target === modal) closeModal();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeModal();
});

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const title = $("title").value.trim();
  const amount = Number($("amount").value);
  const type = $("type").value;
  const category = $("category").value;
  const date = $("date").value;

  if (!title) {
    alert("Please enter a transaction name.");
    return;
  }

  if (
    !Number.isFinite(amount) ||
    amount <= 0 ||
    amount > 1000000000
  ) {
    alert("Enter a valid amount greater than zero.");
    return;
  }

  if (!["income", "expense"].includes(type)) {
    alert("Please select a valid transaction type.");
    return;
  }

  if (!date || date > getToday()) {
    alert("Please select a valid date that is not in the future.");
    return;
  }

  const transaction = {
    id: crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`,
    title,
    amount: Math.round(amount * 100) / 100,
    type,
    category,
    date
  };

  transactions.unshift(transaction);

  if (!saveTransactions()) {
    transactions.shift();
    return;
  }

  renderApp();
  closeModal();
});

$("filter").addEventListener("change", renderTransactions);

function calculateTotals() {
  let income = 0;
  let expenses = 0;

  transactions.forEach(transaction => {
    if (transaction.type === "income") {
      income += transaction.amount;
    } else {
      expenses += transaction.amount;
    }
  });

  return {
    income,
    expenses,
    balance: income - expenses
  };
}

function renderSummary() {
  const totals = calculateTotals();

  $("balance").textContent = formatMoney(totals.balance);
  $("balanceIncome").textContent = formatMoney(totals.income);
  $("balanceExpense").textContent = formatMoney(totals.expenses);
  $("income").textContent = formatMoney(totals.income);
  $("expenses").textContent = formatMoney(totals.expenses);

  $("transactionCount").textContent = transactions.length;

  const savingsRate = totals.income > 0
    ? ((totals.income - totals.expenses) / totals.income) * 100
    : 0;

  $("savingsRate").textContent =
    `${Math.round(savingsRate)}%`;
}

function renderTransactions() {
  const filter = $("filter").value;

  const filtered = transactions.filter(transaction =>
    filter === "all" || transaction.type === filter
  );

  transactionList.replaceChildren();
  emptyMessage.style.display = filtered.length ? "none" : "block";

  filtered.forEach(transaction => {
    const row = document.createElement("div");
    row.className = "transaction";

    const icon = document.createElement("div");
    icon.className = "transaction-icon";
    icon.textContent = icons[transaction.category] || "💳";

    const info = document.createElement("div");
    info.className = "transaction-info";

    const title = document.createElement("h3");
    title.textContent = transaction.title;

    const details = document.createElement("p");
    details.textContent =
      `${transaction.category} · ${transaction.date}`;

    info.append(title, details);

    const right = document.createElement("div");
    right.className = "transaction-right";

    const amount = document.createElement("div");
    amount.className = `transaction-amount ${transaction.type}`;

    amount.textContent =
      `${transaction.type === "income" ? "+" : "−"}${formatMoney(transaction.amount)}`;

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "delete-btn";
    deleteButton.textContent = "Delete";
    deleteButton.setAttribute(
      "aria-label",
      `Delete ${transaction.title}`
    );

    deleteButton.addEventListener("click", () => {
      const confirmed = confirm(
        `Delete "${transaction.title}"?`
      );

      if (!confirmed) return;

      const previous = transactions;
      transactions = transactions.filter(
        item => item.id !== transaction.id
      );

      if (!saveTransactions()) {
        transactions = previous;
        return;
      }

      renderApp();
    });

    right.append(amount, deleteButton);
    row.append(icon, info, right);
    transactionList.append(row);
  });
}

function getWeekStart(date) {
  const result = new Date(date + "T12:00:00");
  const day = result.getDay();

  // Monday is the first day of the week.
  result.setDate(result.getDate() - ((day + 6) % 7));
  result.setHours(0, 0, 0, 0);

  return result;
}

function renderChart() {
  const chartBars = $("chartBars");
  chartBars.replaceChildren();

  const today = getToday();
  const currentWeek = getWeekStart(today);

  const weeks = [];

  // Display the current week and previous three weeks.
  for (let i = 3; i >= 0; i--) {
    const start = new Date(currentWeek);
    start.setDate(start.getDate() - i * 7);

    const end = new Date(start);
    end.setDate(end.getDate() + 7);

    const income = transactions
      .filter(t => t.type === "income")
      .filter(t => {
        const d = new Date(t.date + "T12:00:00");
        return d >= start && d < end;
      })
      .reduce((sum, t) => sum + t.amount, 0);

    const expenses = transactions
      .filter(t => t.type === "expense")
      .filter(t => {
        const d = new Date(t.date + "T12:00:00");
        return d >= start && d < end;
      })
      .reduce((sum, t) => sum + t.amount, 0);

    weeks.push({
      label: `Week ${4 - i}`,
      income,
      expenses
    });
  }

  const maxValue = Math.max(
    4000,
    ...weeks.map(w => Math.max(w.income, w.expenses))
  );

  weeks.forEach(week => {
    const group = document.createElement("div");
    group.className = "week-group";

    const pair = document.createElement("div");
    pair.className = "bar-pair";

    [
      { value: week.income, type: "income", label: "Income" },
      { value: week.expenses, type: "expense", label: "Expenses" }
    ].forEach(item => {
      const bar = document.createElement("div");
      bar.className = `bar ${item.type}`;

      const height = item.value > 0
        ? Math.max(2, (item.value / maxValue) * 100)
        : 0;

      bar.style.height = `${height}%`;
      bar.title = `${item.label}: ${formatMoney(item.value)}`;
      bar.setAttribute(
        "aria-label",
        `${item.label}: ${formatMoney(item.value)}`
      );

      pair.append(bar);
    });

    const label = document.createElement("div");
    label.className = "week-label";
    label.textContent = week.label;

    group.append(pair, label);
    chartBars.append(group);
  });
}

function renderApp() {
  renderSummary();
  renderTransactions();
  renderChart();
}

renderApp();