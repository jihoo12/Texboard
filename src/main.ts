// ============================================================
// TeX Board — main.ts
// Entry point: wires toolbar, drag, keyboard shortcuts
// ============================================================

import './style.css';
import { showToast } from './toast';
import { clearAllConnections, updateAllConnections } from './connections';
import {
  attachEditorEvents,
  onMouseMove,
  onMouseUp,
  isDraggingConnection,
} from './node';

// ---- DOM refs ----------------------------------------------
const workspace     = document.getElementById('workspace')        as HTMLDivElement;
const addBtn        = document.getElementById('addTextareaBtn')   as HTMLButtonElement;
const toggleLineBtn = document.getElementById('toggleLineBtn')    as HTMLButtonElement;
const connectLabel  = document.getElementById('connectLabel')     as HTMLSpanElement;
const clearBtn      = document.getElementById('clearLinesBtn')    as HTMLButtonElement;
const statusHint    = document.getElementById('statusHint')       as HTMLDivElement;

// ---- State -------------------------------------------------
let nodeCounter    = 3;
let currentDrag:   HTMLElement | null = null;
let dragOffsetX    = 0;
let dragOffsetY    = 0;
let isConnectMode  = false;

// ---- Init default nodes ------------------------------------
document.querySelectorAll<HTMLElement>('.draggable-container').forEach(el =>
  attachEditorEvents(el)
);

// ---- Toolbar: Connect Mode ---------------------------------
toggleLineBtn.addEventListener('click', () => {
  isConnectMode = !isConnectMode;
  if (isConnectMode) {
    connectLabel.textContent = 'Cancel';
    toggleLineBtn.classList.add('active');
    document.body.classList.add('drawing-mode');
    statusHint.textContent = "Click a node\u2019s dot to start \u00B7 Click another to connect";
    statusHint.classList.add('alert');
  } else {
    resetConnectMode();
  }
});

function resetConnectMode(): void {
  isConnectMode = false;
  connectLabel.textContent = 'Connect';
  toggleLineBtn.classList.remove('active');
  document.body.classList.remove('drawing-mode');
  statusHint.textContent = 'Drag handles to move · Drag dots to connect nodes';
  statusHint.classList.remove('alert');
}

// ---- Toolbar: Clear connections ----------------------------
clearBtn.addEventListener('click', () => {
  clearAllConnections();
  showToast('All connections cleared');
});

// ---- Toolbar: New Node -------------------------------------
addBtn.addEventListener('click', () => {
  const container = document.createElement('div');
  container.className = 'draggable-container';

  const top  = Math.floor(Math.random() * 35) + 20;
  const left = Math.floor(Math.random() * 40) + 20;
  container.style.top  = `${top}%`;
  container.style.left = `${left}%`;

  const label = `Node ${nodeLabel(nodeCounter++)}`;

  container.innerHTML = `
    <div class="node-header">
      <div class="drag-handle">
        <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
          <path d="M0 1h12M0 4h12M0 7h12" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
        </svg>
      </div>
      <input class="node-title" type="text" value="${label}" placeholder="Label…" spellcheck="false">
      <button class="node-delete" title="Delete node">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </button>
    </div>
    <div class="editor-wrapper">
      <textarea placeholder="Type TeX here…"></textarea>
      <div class="tex-preview"></div>
    </div>
    <div class="node-connect-dot" data-dir="top"></div>
    <div class="node-connect-dot" data-dir="right"></div>
    <div class="node-connect-dot" data-dir="bottom"></div>
    <div class="node-connect-dot" data-dir="left"></div>
  `;

  workspace.appendChild(container);
  container.classList.add('node-enter');
  setTimeout(() => container.classList.remove('node-enter'), 300);

  attachEditorEvents(container);

  setTimeout(() => {
    container.classList.add('editing');
    container.querySelector<HTMLTextAreaElement>('textarea')!.focus();
  }, 50);
});

// ---- Drag handling -----------------------------------------
document.addEventListener('mousedown', (e: MouseEvent) => {
  const handle = (e.target as Element).closest<HTMLElement>('.drag-handle');
  if (!handle || isDraggingConnection()) return;

  const container = handle.closest<HTMLElement>('.draggable-container');
  if (!container) return;

  currentDrag = container;
  const rect = container.getBoundingClientRect();
  dragOffsetX = e.clientX - rect.left;
  dragOffsetY = e.clientY - rect.top;
  container.classList.add('is-dragging');

  document.querySelectorAll<HTMLElement>('.draggable-container').forEach(el => {
    el.style.zIndex = '2';
  });
  container.style.zIndex = '100';
  e.preventDefault();
});

document.addEventListener('mousemove', (e: MouseEvent) => {
  // Delegate to node.ts for drag-to-connect
  onMouseMove(e);

  if (!currentDrag) return;

  const workspaceRect = workspace.getBoundingClientRect();
  const toolbar = document.querySelector<HTMLElement>('.toolbar');
  const toolbarBottom = toolbar
    ? toolbar.getBoundingClientRect().bottom - workspaceRect.top + 10
    : 0;

  let x = e.clientX - workspaceRect.left - dragOffsetX + workspace.scrollLeft;
  let y = e.clientY - workspaceRect.top  - dragOffsetY + workspace.scrollTop;

  const maxX = workspaceRect.width  - currentDrag.offsetWidth;
  const maxY = workspaceRect.height - currentDrag.offsetHeight;
  x = Math.max(0, Math.min(x, maxX));
  y = Math.max(toolbarBottom, Math.min(y, maxY));

  currentDrag.style.left = `${x}px`;
  currentDrag.style.top  = `${y}px`;
  updateAllConnections();
});

document.addEventListener('mouseup', (e: MouseEvent) => {
  // Delegate connection finalization to node.ts first
  const handledByConn = onMouseUp(e);

  if (handledByConn && isConnectMode) {
    resetConnectMode();
  }

  if (currentDrag) {
    currentDrag.classList.remove('is-dragging');
    currentDrag = null;
  }
});

// ---- Keyboard shortcuts ------------------------------------
document.addEventListener('keydown', (e: KeyboardEvent) => {
  const tag = (e.target as HTMLElement).tagName;
  if (tag === 'TEXTAREA' || tag === 'INPUT') return;

  if (e.key === 'n' || e.key === 'N') addBtn.click();
  if (e.key === 'c' || e.key === 'C') toggleLineBtn.click();
  if (e.key === 'Escape') resetConnectMode();
});

// ---- Resize / scroll update --------------------------------
window.addEventListener('resize', updateAllConnections);
workspace.addEventListener('scroll', updateAllConnections);

// ---- Helpers -----------------------------------------------
function nodeLabel(n: number): string {
  // A, B, C … Z, AA, AB …
  let label = '';
  let num = n;
  while (num > 0) {
    num--;
    label = String.fromCharCode(65 + (num % 26)) + label;
    num = Math.floor(num / 26);
  }
  return label;
}
