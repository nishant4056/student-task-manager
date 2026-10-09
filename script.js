const KEY = "studentTasks";
let tasks = readTasks();
let filter = "all";
let query = "";
let editingId = null;

const $ = s => document.querySelector(s);

function readTasks() {
  try {
    const data = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function save() {
  localStorage.setItem(KEY, JSON.stringify(tasks));
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;",
    '"': "&quot;", "'": "&#39;"
  }[c]));
}

function dateText(s) {
  if (!s) return "No due date";
  const d = new Date(s + "T00:00:00");
  return Number.isNaN(d.getTime())
    ? "No due date"
    : d.toLocaleDateString(undefined, {
        day: "numeric", month: "short", year: "numeric"
      });
}

let toastTimer;

function notify(message) {
  $("#toast").textContent = message;
  $("#toast").classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(
    () => $("#toast").classList.remove("show"), 2200
  );
}

function shown() {
  let result = tasks.filter(t =>
    (filter === "all" ||
     (filter === "pending" && !t.completed) ||
     (filter === "completed" && t.completed)) &&
    t.title.toLowerCase().includes(query)
  );

  if ($("#sort").value === "due") {
    result.sort((a, b) =>
      (a.dueDate || "9999").localeCompare(b.dueDate || "9999")
    );
  } else if ($("#sort").value === "priority") {
    const rank = { high: 0, medium: 1, low: 2 };
    result.sort((a, b) => rank[a.priority] - rank[b.priority]);
  } else {
    result.sort((a, b) => b.createdAt - a.createdAt);
  }
  return result;
}

function render() {
  const total = tasks.length;
  const completed = tasks.filter(t => t.completed).length;
  const pending = total - completed;

  $("#total").textContent = total;
  $("#pending").textContent = pending;
  $("#completed").textContent = completed;
  $("#nav-all").textContent = total;
  $("#nav-pending").textContent = pending;
  $("#nav-completed").textContent = completed;
  $("#chip-total").textContent = total;

  $("#progress").textContent = total
    ? Math.round(completed / total * 100) + "% complete — keep going!"
    : "Let's make today count";

  document.querySelectorAll("[data-filter]").forEach(button => {
    button.classList.toggle("active", button.dataset.filter === filter);
  });

  const list = shown();

  $("#tasks").innerHTML = list.map(t => `
    <article class="task ${t.completed ? "done" : ""}">
      <input class="check" type="checkbox"
        data-action="toggle" data-id="${esc(t.id)}"
        aria-label="Complete task" ${t.completed ? "checked" : ""}>
      <div class="task-name">${esc(t.title)}</div>
      <time class="date">${esc(dateText(t.dueDate))}</time>
      <span class="priority ${esc(t.priority)}">
        ${esc(t.priority[0].toUpperCase() + t.priority.slice(1))}
      </span>
      <div class="actions">
        <button data-action="edit" data-id="${esc(t.id)}"
          aria-label="Edit task">✎</button>
        <button class="del" data-action="delete" data-id="${esc(t.id)}"
          aria-label="Delete task">⌫</button>
      </div>
    </article>
  `).join("");

  $("#empty").classList.toggle("visible", list.length === 0);

  if (!list.length) {
    $("#empty h3").textContent =
      query || filter !== "all" ? "No matching tasks" : "All clear for now";
    $("#empty p").textContent =
      query || filter !== "all"
        ? "Try another search or filter."
        : "Add a task above and take your next small step.";
  }
}

$("#task-form").addEventListener("submit", e => {
  e.preventDefault();
  const title = $("#title").value.trim();
  if (!title) return;

  tasks.push({
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    title,
    dueDate: $("#due").value,
    priority: $("#priority").value,
    completed: false,
    createdAt: Date.now()
  });

  save();
  $("#task-form").reset();
  $("#priority").value = "medium";
  filter = "all";
  render();
  $("#title").focus();
  notify("Task added successfully");
});

$("#tasks").addEventListener("click", e => {
  const button = e.target.closest("[data-action]");
  if (!button) return;

  const task = tasks.find(t => String(t.id) === button.dataset.id);
  if (!task) return;

  if (button.dataset.action === "toggle") {
    task.completed = button.checked;
    save();
    render();
    notify(task.completed ? "Task completed — nice work!" : "Task moved to pending");
  }

  if (button.dataset.action === "delete") {
    tasks = tasks.filter(t => String(t.id) !== String(task.id));
    save();
    render();
    notify("Task deleted");
  }

  if (button.dataset.action === "edit") {
    editingId = task.id;
    $("#edit-title").value = task.title;
    $("#edit-due").value = task.dueDate || "";
    $("#edit-priority").value = task.priority;
    $("#edit-dialog").showModal();
  }
});

$("#edit-form").addEventListener("submit", e => {
  e.preventDefault();
  const task = tasks.find(t => String(t.id) === String(editingId));
  const title = $("#edit-title").value.trim();

  if (task && title) {
    task.title = title;
    task.dueDate = $("#edit-due").value;
    task.priority = $("#edit-priority").value;
    save();
    render();
    notify("Task updated");
  }
  $("#edit-dialog").close();
});

$("#cancel-edit").addEventListener("click", () => {
  $("#edit-dialog").close();
});

document.querySelectorAll("[data-filter]").forEach(button => {
  button.addEventListener("click", () => {
    filter = button.dataset.filter;
    render();
  });
});

$("#search").addEventListener("input", () => {
  query = $("#search").value.trim().toLowerCase();
  render();
});

$("#sort").addEventListener("change", render);

$("#clear").addEventListener("click", () => {
  const count = tasks.filter(t => t.completed).length;
  if (!count) {
    notify("There are no completed tasks to clear");
    return;
  }
  tasks = tasks.filter(t => !t.completed);
  save();
  render();
  notify(count + " completed task(s) cleared");
});

$("#theme").addEventListener("click", () => {
  document.body.classList.toggle("dark");
  localStorage.setItem(
    "studentTaskTheme",
    document.body.classList.contains("dark") ? "dark" : "light"
  );
});

if (localStorage.getItem("studentTaskTheme") === "dark") {
  document.body.classList.add("dark");
}

$("#menu").addEventListener("click", () => {
  $("#sidebar").classList.toggle("open");
});

document.querySelector("main").addEventListener("click", e => {
  if (innerWidth <= 760 && !e.target.closest("#menu")) {
    $("#sidebar").classList.remove("open");
  }
});

$("#today").textContent = new Date().toLocaleDateString(undefined, {
  weekday: "short", day: "numeric", month: "short", year: "numeric"
});

document.addEventListener("keydown", e => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
    e.preventDefault();
    $("#search").focus();
  }
});

render();