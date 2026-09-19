const STORAGE_KEY = 'todos';
const THEME_KEY = 'todo-theme';

const input = document.getElementById('task-input');
const priorityInput = document.getElementById('priority-input');
const dueInput = document.getElementById('due-input');
const addBtn = document.getElementById('add-btn');
const list = document.getElementById('task-list');
const themeToggle = document.getElementById('theme-toggle');
const filterSelect = document.getElementById('filter-select');
const sortSelect = document.getElementById('sort-select');
const taskCounter = document.getElementById('task-counter');
const emptyState = document.getElementById('empty-state');
const clearDoneBtn = document.getElementById('clear-done-btn');
const exportBtn = document.getElementById('export-btn');
const importBtn = document.getElementById('import-btn');
const importFile = document.getElementById('import-file');
const optionsToggle = document.getElementById('options-toggle');
const optionsRow = document.getElementById('options-row');

let draggedId = null;

const PRIORITY_RANK = { high: 0, medium: 1, low: 2 };

function loadTasks() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

function saveTasks(tasks) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function getVisibleTasks() {
  const tasks = loadTasks();
  const filter = filterSelect.value;

  let visible = tasks.filter(task => {
    if (filter === 'active') return !task.done;
    if (filter === 'done') return task.done;
    return true;
  });

  const sort = sortSelect.value;
  if (sort === 'priority') {
    visible = visible.slice().sort((a, b) =>
      (PRIORITY_RANK[a.priority] ?? 1) - (PRIORITY_RANK[b.priority] ?? 1));
  } else if (sort === 'due') {
    visible = visible.slice().sort((a, b) => {
      if (!a.due && !b.due) return 0;
      if (!a.due) return 1;
      if (!b.due) return -1;
      return a.due.localeCompare(b.due);
    });
  }

  return visible;
}

function isOverdue(task) {
  return task.due && !task.done && task.due < new Date().toISOString().slice(0, 10);
}

function formatDueDate(task) {
  if (!task.due) return null;

  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  if (task.due === today) {
    return { text: 'Today', class: 'today' };
  } else if (task.due === tomorrow) {
    return { text: 'Tomorrow', class: 'tomorrow' };
  } else if (task.due < today) {
    return { text: `Overdue: ${task.due}`, class: 'overdue' };
  } else {
    const date = new Date(task.due + 'T00:00:00');
    const formatted = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return { text: formatted, class: '' };
  }
}

function render() {
  const allTasks = loadTasks();
  const tasks = getVisibleTasks();
  list.innerHTML = '';

  emptyState.hidden = allTasks.length > 0;

  const doneCount = allTasks.filter(t => t.done).length;
  taskCounter.textContent = allTasks.length
    ? `${doneCount} of ${allTasks.length} done`
    : '';

  const reorderable = sortSelect.value === 'none' && filterSelect.value === 'all';

  tasks.forEach(task => {
    const li = document.createElement('li');
    li.className = `${task.done ? 'done' : ''} priority-${task.priority || 'medium'}`.trim();
    li.tabIndex = 0;
    li.dataset.id = task.id;

    li.addEventListener('keydown', e => {
      if (e.key === 'Delete' && e.target === li) deleteTask(task.id);
    });

    if (reorderable) {
      li.draggable = true;
      li.addEventListener('dragstart', () => {
        draggedId = task.id;
        li.classList.add('dragging');
      });
      li.addEventListener('dragend', () => li.classList.remove('dragging'));
      li.addEventListener('dragover', e => e.preventDefault());
      li.addEventListener('drop', e => {
        e.preventDefault();
        if (draggedId !== null && draggedId !== task.id) reorderTasks(draggedId, task.id);
      });
    }

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = task.done;
    checkbox.addEventListener('change', () => toggleTask(task.id));

    const span = document.createElement('span');
    span.textContent = task.text;
    span.title = 'Click to edit';
    span.addEventListener('click', () => startEditing(li, task, span));

    const dueLabel = document.createElement('span');
    dueLabel.className = 'due-label';
    const dueDateInfo = formatDueDate(task);
    if (dueDateInfo) {
      dueLabel.textContent = dueDateInfo.text;
      if (dueDateInfo.class) dueLabel.classList.add(dueDateInfo.class);
    }

    const prioritySelect = document.createElement('select');
    prioritySelect.className = 'priority-badge';
    ['low', 'medium', 'high'].forEach(level => {
      const option = document.createElement('option');
      option.value = level;
      option.textContent = level;
      prioritySelect.appendChild(option);
    });
    prioritySelect.value = task.priority || 'medium';
    prioritySelect.addEventListener('change', () => setPriority(task.id, prioritySelect.value));

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '✕';
    deleteBtn.addEventListener('click', () => deleteTask(task.id));

    li.append(checkbox, span, dueLabel, prioritySelect, deleteBtn);
    list.appendChild(li);
  });
}

function startEditing(li, task, span) {
  const editInput = document.createElement('input');
  editInput.type = 'text';
  editInput.value = task.text;
  editInput.className = 'edit-input';

  const finish = (save) => {
    if (save) {
      const text = editInput.value.trim();
      if (text) editTask(task.id, text);
      else render();
    } else {
      render();
    }
  };

  editInput.addEventListener('blur', () => finish(true));
  editInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') finish(true);
    if (e.key === 'Escape') finish(false);
  });

  li.replaceChild(editInput, span);
  editInput.focus();
  editInput.select();
}

function addTask() {
  const text = input.value.trim();
  if (!text) return;

  const tasks = loadTasks();
  tasks.push({
    id: Date.now(),
    text,
    done: false,
    priority: priorityInput.value,
    due: dueInput.value || null,
  });
  saveTasks(tasks);

  input.value = '';
  dueInput.value = '';
  render();
}

function editTask(id, text) {
  const tasks = loadTasks();
  const task = tasks.find(t => t.id === id);
  if (task) task.text = text;
  saveTasks(tasks);
  render();
}

function toggleTask(id) {
  const tasks = loadTasks();
  const task = tasks.find(t => t.id === id);
  if (task) task.done = !task.done;
  saveTasks(tasks);
  render();
}

function setPriority(id, priority) {
  const tasks = loadTasks();
  const task = tasks.find(t => t.id === id);
  if (task) task.priority = priority;
  saveTasks(tasks);
  render();
}

function deleteTask(id) {
  const tasks = loadTasks().filter(t => t.id !== id);
  saveTasks(tasks);
  render();
}

function reorderTasks(draggedTaskId, targetTaskId) {
  const tasks = loadTasks();
  const fromIndex = tasks.findIndex(t => t.id === draggedTaskId);
  const toIndex = tasks.findIndex(t => t.id === targetTaskId);
  if (fromIndex === -1 || toIndex === -1) return;

  const [moved] = tasks.splice(fromIndex, 1);
  tasks.splice(toIndex, 0, moved);
  saveTasks(tasks);
  render();
}

function clearCompleted() {
  const tasks = loadTasks().filter(t => !t.done);
  saveTasks(tasks);
  render();
}

function exportTasks() {
  const blob = new Blob([JSON.stringify(loadTasks(), null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'todos.json';
  a.click();
  URL.revokeObjectURL(url);
}

function importTasks(file) {
  const MAX_FILE_SIZE = 1024 * 1024;
  if (file.size > MAX_FILE_SIZE) {
    alert('File is too large. Maximum size is 1MB.');
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const imported = JSON.parse(reader.result);
      if (!Array.isArray(imported)) throw new Error('Invalid file format');

      if (imported.length > 1000) throw new Error('Too many tasks');

      const validated = imported.map((task, index) => {
        if (typeof task !== 'object' || task === null) throw new Error(`Task ${index}: invalid type`);
        if (typeof task.id !== 'number') throw new Error(`Task ${index}: invalid ID`);
        if (typeof task.text !== 'string') throw new Error(`Task ${index}: invalid text`);
        if (typeof task.done !== 'boolean') throw new Error(`Task ${index}: invalid done flag`);
        if (!['low', 'medium', 'high'].includes(task.priority)) throw new Error(`Task ${index}: invalid priority`);
        if (task.due !== null && typeof task.due !== 'string') throw new Error(`Task ${index}: invalid due date`);

        return {
          id: task.id,
          text: task.text,
          done: task.done,
          priority: task.priority,
          due: task.due || null
        };
      });

      saveTasks(validated);
      render();
    } catch (err) {
      alert('Could not import file. Please ensure it is a valid export.');
    }
  };
  reader.readAsText(file);
}

function applyTheme(theme) {
  document.body.classList.toggle('dark', theme === 'dark');
  themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
}

function loadTheme() {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored) return stored;
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

themeToggle.addEventListener('click', () => {
  const next = loadTheme() === 'dark' ? 'light' : 'dark';
  localStorage.setItem(THEME_KEY, next);
  applyTheme(next);
});

optionsToggle.addEventListener('click', () => {
  optionsRow.classList.toggle('open');
  optionsToggle.textContent = optionsRow.classList.contains('open') ? '- Fewer options' : '+ More options';
});

addBtn.addEventListener('click', addTask);
input.addEventListener('keydown', e => {
  if (e.key === 'Enter') addTask();
  if (e.key === 'Escape') input.value = '';
});
filterSelect.addEventListener('change', render);
sortSelect.addEventListener('change', render);
clearDoneBtn.addEventListener('click', clearCompleted);
exportBtn.addEventListener('click', exportTasks);
importBtn.addEventListener('click', () => importFile.click());
importFile.addEventListener('change', () => {
  if (importFile.files[0]) importTasks(importFile.files[0]);
  importFile.value = '';
});

applyTheme(loadTheme());
render();
