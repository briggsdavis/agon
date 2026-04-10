// =========================================================
// SUPABASE SETUP
// =========================================================
// Paste your credentials from: supabase.com → project → Settings → API

const SUPABASE_URL     = 'https://your-project-id.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key-here';

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// =========================================================
// BEFORE YOU START — run this SQL in your Supabase SQL editor
// to create the tasks table:
//
//   CREATE TABLE tasks (
//     id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
//     content      text NOT NULL,
//     completed    boolean DEFAULT false,
//     dashboard_id text NOT NULL,
//     created_at   timestamp with time zone DEFAULT now()
//   );
//
// =========================================================


// =========================================================
// DASHBOARD CONFIG
// =========================================================

const DASHBOARDS = [
  { id: 'BriggsDavis', label: 'BriggsDavis', color: '#A855F7', shortcut: 'b' },
  { id: 'Work',        label: 'Work',        color: '#22C55E', shortcut: 'w' },
  { id: 'Esade',       label: 'Esade',       color: '#60A5FA', shortcut: 'e' },
  { id: 'Ennova',      label: 'Ennova',      color: '#1E40AF', shortcut: 'n' },
  { id: 'Personal',    label: 'Personal',    color: '#F97316', shortcut: 'p' },
];

// Map shortcut letters → dashboard IDs
const SHORTCUT_MAP = {};
DASHBOARDS.forEach(d => { SHORTCUT_MAP[d.shortcut] = d.id; });


// =========================================================
// STATE
// =========================================================

let tasks          = [];   // All tasks loaded from Supabase
let targetDashboard = DASHBOARDS[0].id;
let inputStep      = 'dashboard';  // 'dashboard' | 'task'
let draggedTaskId  = null;

// Dashboard minimized state is stored in localStorage (it's just a UI preference)
let dashboardStates = {};

function loadDashboardStates() {
  try {
    const saved = localStorage.getItem('agon_dashboard_states');
    if (saved) dashboardStates = JSON.parse(saved);
  } catch (e) { /* ignore */ }
  // Make sure every dashboard has an entry
  DASHBOARDS.forEach(d => {
    if (!dashboardStates[d.id]) dashboardStates[d.id] = { minimized: false };
  });
}

function saveDashboardStates() {
  localStorage.setItem('agon_dashboard_states', JSON.stringify(dashboardStates));
}


// =========================================================
// SUPABASE — DATABASE FUNCTIONS
// =========================================================

async function loadTasks() {
  const { data, error } = await db
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error loading tasks:', error.message);
    return;
  }

  // Map database columns (snake_case) to our JS objects (camelCase)
  tasks = data.map(row => ({
    id:          row.id,
    content:     row.content,
    completed:   row.completed,
    dashboardId: row.dashboard_id,
    createdAt:   row.created_at,
  }));

  renderAll();
}

async function addTask(content, dashboardId) {
  const { data, error } = await db
    .from('tasks')
    .insert([{ content, completed: false, dashboard_id: dashboardId }])
    .select()
    .single();

  if (error) {
    console.error('Error adding task:', error.message);
    return;
  }

  tasks.unshift({
    id:          data.id,
    content:     data.content,
    completed:   data.completed,
    dashboardId: data.dashboard_id,
    createdAt:   data.created_at,
  });

  renderAll();
}

async function deleteTask(id) {
  // Play exit animation first
  const card = document.querySelector(`.task-card[data-id="${id}"]`);
  if (card) {
    card.classList.add('removing');
    await new Promise(r => setTimeout(r, 150));
  }

  const { error } = await db.from('tasks').delete().eq('id', id);
  if (error) {
    console.error('Error deleting task:', error.message);
    return;
  }

  tasks = tasks.filter(t => t.id !== id);
  renderAll();
}

// Completing a task removes it (matching original app behavior)
async function toggleTask(id) {
  await deleteTask(id);
}

async function editTask(id, newContent) {
  const { error } = await db
    .from('tasks')
    .update({ content: newContent })
    .eq('id', id);

  if (error) {
    console.error('Error editing task:', error.message);
    return;
  }

  const task = tasks.find(t => t.id === id);
  if (task) {
    task.content = newContent;
    renderAll();
  }
}

async function moveTask(id, newDashboardId) {
  const { error } = await db
    .from('tasks')
    .update({ dashboard_id: newDashboardId })
    .eq('id', id);

  if (error) {
    console.error('Error moving task:', error.message);
    return;
  }

  const task = tasks.find(t => t.id === id);
  if (task) {
    task.dashboardId = newDashboardId;
    renderAll();
  }
}


// =========================================================
// STRESS BAR
// =========================================================

function updateStressBar() {
  const incomplete = tasks.filter(t => !t.completed);

  // Esade and Ennova tasks count double (they're more stressful)
  const weighted = incomplete.reduce((sum, t) =>
    sum + (t.dashboardId === 'Esade' || t.dashboardId === 'Ennova' ? 2 : 1), 0);

  // Urgent = any single dashboard has 10+ incomplete tasks
  const isUrgent = DASHBOARDS.some(d =>
    incomplete.filter(t => t.dashboardId === d.id).length >= 10);

  let fill = Math.min(100, (weighted / 30) * 100);
  if (isUrgent) fill = Math.max(90, fill);

  let color = '#E5E5E5';
  if      (isUrgent)   color = '#DC2626';
  else if (fill > 60)  color = '#F97316';
  else if (fill > 30)  color = '#FBBF24';

  document.getElementById('stress-bar-fill').style.height = fill + '%';
  document.getElementById('stress-bar-fill').style.background = color;

  const critical = document.getElementById('stress-critical');
  isUrgent ? critical.classList.remove('hidden') : critical.classList.add('hidden');
}


// =========================================================
// RENDERING
// =========================================================

function renderAll() {
  renderColumns();
  updateStressBar();
  renderShortcutBar();
}

function renderColumns() {
  const container = document.getElementById('columns-container');

  DASHBOARDS.forEach(dashboard => {
    let col = document.getElementById(`col-${dashboard.id}`);
    if (!col) {
      col = buildColumn(dashboard);
      container.appendChild(col);
    }
    refreshColumnTasks(dashboard, col);
  });
}

function buildColumn(dashboard) {
  const state = dashboardStates[dashboard.id];
  const col   = document.createElement('div');
  col.className = 'dashboard-column' + (state.minimized ? ' minimized' : '');
  col.id = `col-${dashboard.id}`;

  col.innerHTML = `
    <div class="column-header" onclick="toggleMinimize('${dashboard.id}')">

      <div class="column-header-expanded">
        <div class="header-top">
          <div class="header-title-group">
            ${svgGrid(dashboard.color)}
            <h2 class="column-title">${dashboard.label}</h2>
          </div>
          <span class="task-count" id="count-${dashboard.id}">0</span>
        </div>
        <div class="column-underline" style="background:${dashboard.color}"></div>
      </div>

      <div class="column-header-minimized">
        ${svgGrid(dashboard.color)}
        <span class="minimized-label" style="color:${dashboard.color}">${dashboard.label}</span>
      </div>

    </div>
    <div
      class="column-content${state.minimized ? ' hidden' : ''}"
      id="tasks-${dashboard.id}"
      ondragover="onDragOver(event, '${dashboard.id}')"
      ondragleave="onDragLeave(event)"
      ondrop="onDrop(event, '${dashboard.id}')">
    </div>
  `;

  return col;
}

function refreshColumnTasks(dashboard, colEl) {
  const col      = colEl || document.getElementById(`col-${dashboard.id}`);
  const content  = col.querySelector('.column-content');
  const countEl  = document.getElementById(`count-${dashboard.id}`);
  const colTasks = tasks.filter(t => t.dashboardId === dashboard.id);
  const state    = dashboardStates[dashboard.id];

  // Toggle visibility
  if (state.minimized) {
    content.classList.add('hidden');
    col.classList.add('minimized');
  } else {
    content.classList.remove('hidden');
    col.classList.remove('minimized');
  }

  if (countEl) countEl.textContent = colTasks.length;

  // Full re-render of task list
  content.innerHTML = '';
  colTasks.forEach(task => {
    content.appendChild(buildTaskCard(task, dashboard.color));
  });
}

function buildTaskCard(task, color) {
  const card = document.createElement('div');
  card.className = 'task-card';
  card.dataset.id = task.id;
  card.draggable = true;

  card.innerHTML = `
    <div class="task-card-inner">
      <button class="task-toggle-btn" title="Complete task">
        ${task.completed ? svgCheckCircle() : svgCircle()}
      </button>
      <div class="task-content-area">
        <span class="task-text${task.completed ? ' completed' : ''}">${escapeHtml(task.content)}</span>
      </div>
      <div class="task-actions">
        <button class="task-action-btn edit-btn" title="Edit">
          ${svgEdit()}
        </button>
        <button class="task-action-btn delete-btn" title="Delete">
          ${svgTrash()}
        </button>
      </div>
    </div>
  `;

  // Wire up buttons
  card.querySelector('.task-toggle-btn').addEventListener('click', () => toggleTask(task.id));
  card.querySelector('.edit-btn').addEventListener('click',       () => startEdit(task.id));
  card.querySelector('.delete-btn').addEventListener('click',     () => deleteTask(task.id));

  // Double-click to edit
  card.addEventListener('dblclick', (e) => {
    if (!e.target.closest('button')) startEdit(task.id);
  });

  // Drag events
  card.addEventListener('dragstart', (e) => onDragStart(e, task.id));
  card.addEventListener('dragend',   onDragEnd);

  return card;
}

// =========================================================
// INLINE EDITING
// =========================================================

function startEdit(taskId) {
  const card = document.querySelector(`.task-card[data-id="${taskId}"]`);
  if (!card) return;
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;

  // Already editing?
  if (card.querySelector('.task-edit-input')) return;

  const textEl = card.querySelector('.task-text');
  textEl.style.display = 'none';

  const textarea = document.createElement('textarea');
  textarea.className = 'task-edit-input';
  textarea.value = task.content;
  textarea.rows  = Math.max(1, task.content.split('\n').length);
  card.querySelector('.task-content-area').appendChild(textarea);
  textarea.focus();
  textarea.select();

  function save() {
    const newContent = textarea.value.trim();
    if (newContent && newContent !== task.content) {
      editTask(taskId, newContent);
    } else {
      cancelEdit(taskId);
    }
  }

  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); save(); }
    if (e.key === 'Escape') cancelEdit(taskId);
  });

  textarea.addEventListener('blur', save);
}

function cancelEdit(taskId) {
  const card = document.querySelector(`.task-card[data-id="${taskId}"]`);
  if (!card) return;
  const textEl  = card.querySelector('.task-text');
  const input   = card.querySelector('.task-edit-input');
  if (textEl) textEl.style.display = '';
  if (input)  input.remove();
}


// =========================================================
// TOGGLE MINIMIZE
// =========================================================

function toggleMinimize(dashboardId) {
  dashboardStates[dashboardId].minimized = !dashboardStates[dashboardId].minimized;
  saveDashboardStates();
  const dashboard = DASHBOARDS.find(d => d.id === dashboardId);
  const col       = document.getElementById(`col-${dashboardId}`);
  refreshColumnTasks(dashboard, col);
}


// =========================================================
// DRAG AND DROP
// =========================================================

function onDragStart(e, taskId) {
  draggedTaskId = taskId;
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', taskId);
  // Delay so the browser snapshot doesn't show the faded card
  setTimeout(() => {
    const card = document.querySelector(`.task-card[data-id="${taskId}"]`);
    if (card) card.classList.add('dragging');
  }, 0);
}

function onDragEnd() {
  if (draggedTaskId) {
    const card = document.querySelector(`.task-card[data-id="${draggedTaskId}"]`);
    if (card) card.classList.remove('dragging');
  }
  document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
  draggedTaskId = null;
}

function onDragOver(e, dashboardId) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  document.getElementById(`tasks-${dashboardId}`).classList.add('drag-over');
}

function onDragLeave(e) {
  const el = e.currentTarget;
  if (!el.contains(e.relatedTarget)) el.classList.remove('drag-over');
}

function onDrop(e, dashboardId) {
  e.preventDefault();
  document.getElementById(`tasks-${dashboardId}`).classList.remove('drag-over');
  if (!draggedTaskId) return;

  const task = tasks.find(t => t.id === draggedTaskId);
  if (task && task.dashboardId !== dashboardId) {
    task.dashboardId = dashboardId; // Optimistic update
    moveTask(draggedTaskId, dashboardId);
  }
}


// =========================================================
// GLOBAL INPUT — two-step: pick dashboard → type task
// =========================================================

function renderShortcutBar() {
  const bar = document.getElementById('shortcut-bar');
  bar.innerHTML = DASHBOARDS.map(d => {
    const isActive = d.id === targetDashboard;
    const style    = isActive
      ? `background:${d.color}; color:white`
      : '';
    return `
      <button
        class="shortcut-btn${isActive ? ' active-shortcut' : ''}"
        style="${style}"
        onclick="selectDashboard('${d.id}', '${d.shortcut}')">
        <span class="shortcut-key">[${d.shortcut.toUpperCase()}]</span>
        ${d.label}
      </button>
    `;
  }).join('');
}

function selectDashboard(dashboardId, shortcut) {
  targetDashboard = dashboardId;
  document.getElementById('dashboard-input').value = shortcut.toUpperCase();
  setInputStep('task');
  document.getElementById('task-input').focus();
  renderShortcutBar();
}

function setInputStep(step) {
  inputStep = step;
  const dashInput = document.getElementById('dashboard-input');
  const taskInput = document.getElementById('task-input');

  if (step === 'dashboard') {
    dashInput.classList.remove('inactive');
    taskInput.classList.remove('active');
    taskInput.placeholder = 'Add task...';
  } else {
    dashInput.classList.add('inactive');
    taskInput.classList.add('active');
    const d = DASHBOARDS.find(d => d.id === targetDashboard);
    taskInput.placeholder = d ? `Add to ${d.label}...` : 'Add task...';
  }
}

function initGlobalInput() {
  const dashInput = document.getElementById('dashboard-input');
  const taskInput = document.getElementById('task-input');

  // Dashboard letter input
  dashInput.addEventListener('input', () => {
    const letter = dashInput.value.toLowerCase();
    if (!SHORTCUT_MAP[letter]) {
      dashInput.value = '';
    } else {
      dashInput.value  = letter.toUpperCase();
      targetDashboard  = SHORTCUT_MAP[letter];
      renderShortcutBar();
    }
  });

  dashInput.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      const letter = dashInput.value.toLowerCase();
      if (SHORTCUT_MAP[letter]) {
        targetDashboard = SHORTCUT_MAP[letter];
        setInputStep('task');
        taskInput.focus();
        renderShortcutBar();
      }
    }
  });

  // Task content input
  taskInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const content = taskInput.value.trim();
      if (content) {
        addTask(content, targetDashboard);
        taskInput.value = '';
        dashInput.value = '';
        setInputStep('dashboard');
        dashInput.focus();
        renderShortcutBar();
      }
    }
    // Backspace on empty → go back to dashboard step
    if (e.key === 'Backspace' && taskInput.value === '') {
      dashInput.value = '';
      setInputStep('dashboard');
      dashInput.focus();
    }
  });

  setInputStep('dashboard');
}


// =========================================================
// KEYBOARD SHORTCUTS
// Press b/w/e/n/p anywhere to jump to that dashboard's input
// =========================================================

function initKeyboardShortcuts() {
  window.addEventListener('keydown', (e) => {
    const tag = document.activeElement.tagName.toLowerCase();
    if (tag === 'input' || tag === 'textarea') return;

    const letter = e.key.toLowerCase();
    if (SHORTCUT_MAP[letter]) {
      e.preventDefault();
      targetDashboard = SHORTCUT_MAP[letter];
      document.getElementById('dashboard-input').value = letter.toUpperCase();
      setInputStep('task');
      document.getElementById('task-input').focus();
      renderShortcutBar();
    }
  });
}


// =========================================================
// SVG ICONS (inline so no external icon library needed)
// =========================================================

function svgGrid(color) {
  return `<svg class="grid-icon" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
    <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
  </svg>`;
}

function svgCircle() {
  return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="12" cy="12" r="10"/>
  </svg>`;
}

function svgCheckCircle() {
  return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
    <polyline points="22 4 12 14.01 9 11.01"/>
  </svg>`;
}

function svgEdit() {
  return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>`;
}

function svgTrash() {
  return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6"/><path d="M14 11v6"/>
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>`;
}


// =========================================================
// UTILITIES
// =========================================================

// Prevent XSS when rendering task content
function escapeHtml(str) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}


// =========================================================
// INIT
// =========================================================

async function init() {
  loadDashboardStates();
  renderColumns();       // Draw empty columns immediately
  renderShortcutBar();
  initGlobalInput();
  initKeyboardShortcuts();
  await loadTasks();     // Fetch tasks from Supabase and fill in
}

document.addEventListener('DOMContentLoaded', init);
