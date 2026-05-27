// ============================================================
// TeX Board — node.ts
// Handles per-node rendering, events, and lifecycle
// ============================================================

import type { Direction } from './types';
import { showToast } from './toast';
import {
  removeConnectionsForNode,
  updateAllConnections,
  finalizeConnection,
  getDotPoint,
  updateLinePath,
} from './connections';

const svgCanvas = document.getElementById('svg-canvas') as unknown as SVGSVGElement;

// ---- Shared drag-to-connect state (set by each dot) -------
let activeLine:      SVGPathElement | null = null;
let startContainer:  HTMLElement    | null = null;
let startDir:        Direction      | null = null;
let isDraggingConn                        = false;

// ---- MathJax rendering ------------------------------------
export function renderMath(container: HTMLElement): void {
  const textarea = container.querySelector<HTMLTextAreaElement>('textarea')!;
  const preview  = container.querySelector<HTMLDivElement>('.tex-preview')!;
  const raw      = textarea.value;

  if (!raw.trim()) {
    preview.innerHTML = `<span style="color:var(--text-dim);font-size:12px;">${textarea.placeholder}</span>`;
    return;
  }

  preview.innerHTML = raw.replace(/\n/g, '<br>');

  if (window.MathJax?.typesetPromise) {
    window.MathJax.typesetPromise([preview]).then(() => {
      updateAllConnections();
    });
  }
}

// ---- Sync preview size to the resizable textarea ----------
function syncPreviewSize(container: HTMLElement): void {
  const textarea = container.querySelector<HTMLTextAreaElement>('textarea')!;
  const preview  = container.querySelector<HTMLDivElement>('.tex-preview')!;
  const wrapper  = container.querySelector<HTMLDivElement>('.editor-wrapper')!;
  const w = textarea.offsetWidth;
  const h = textarea.offsetHeight;
  if (w > 0 && h > 0) {
    wrapper.style.width  = `${w}px`;
    wrapper.style.height = `${h}px`;
    preview.style.width  = `${w}px`;
    preview.style.height = `${h}px`;
  }
}

// ---- Attach all events to a node container ----------------
export function attachEditorEvents(container: HTMLElement): void {
  container.id = generateId();

  const textarea = container.querySelector<HTMLTextAreaElement>('textarea')!;
  const preview  = container.querySelector<HTMLDivElement>('.tex-preview')!;
  const deleteBtn = container.querySelector<HTMLButtonElement>('.node-delete')!;
  const titleInput = container.querySelector<HTMLInputElement>('.node-title')!;
  const dots = container.querySelectorAll<HTMLElement>('.node-connect-dot');

  // ---- Editing mode toggle --------------------------------
  textarea.addEventListener('focus', () => container.classList.add('editing'));
  textarea.addEventListener('blur',  () => {
    container.classList.remove('editing');
    renderMath(container);
  });

  preview.addEventListener('click', () => {
    if (isDraggingConn) return;
    container.classList.add('editing');
    textarea.focus();
  });

  // ---- Resize observer ------------------------------------
  const resizeObserver = new ResizeObserver(() => {
    syncPreviewSize(container);
    updateAllConnections();
  });
  resizeObserver.observe(textarea);

  // ---- Delete button --------------------------------------
  deleteBtn.addEventListener('click', (e: MouseEvent) => {
    e.stopPropagation();
    deleteNode(container);
  });

  // ---- Title input — block drag from propagating ----------
  titleInput.addEventListener('mousedown', (e: MouseEvent) => e.stopPropagation());

  // ---- Connect dots — drag-to-connect always active -------
  dots.forEach(dot => {
    dot.addEventListener('mousedown', (e: MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      const dir = dot.dataset['dir'] as Direction;
      startConnection(container, e, dir);
    });
  });

  renderMath(container);
}

// ---- Start drawing a preview connection line --------------
function startConnection(
  container: HTMLElement,
  e: MouseEvent,
  dir: Direction
): void {
  startContainer    = container;
  startDir          = dir;
  isDraggingConn    = true;
  container.classList.add('connect-source');
  document.body.classList.add('drawing-mode');

  activeLine = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  activeLine.setAttribute('class', 'preview-path');
  svgCanvas.appendChild(activeLine);

  const start = getDotPoint(container, dir);
  updateLinePath(
    activeLine,
    start.x, start.y,
    e.clientX + window.scrollX,
    e.clientY + window.scrollY,
    dir, null
  );
}

// ---- Global mousemove handler (exported for main.ts) ------
export function onMouseMove(e: MouseEvent): void {
  if (!isDraggingConn || !activeLine || !startContainer || !startDir) return;

  const start = getDotPoint(startContainer, startDir);
  updateLinePath(
    activeLine,
    start.x, start.y,
    e.clientX + window.scrollX,
    e.clientY + window.scrollY,
    startDir, null
  );

  // Highlight target
  clearHovers();
  const targetDot  = (e.target as Element).closest<HTMLElement>('.node-connect-dot');
  const targetNode = (e.target as Element).closest<HTMLElement>('.draggable-container');

  if (targetDot && targetDot.closest('.draggable-container') !== startContainer) {
    targetDot.classList.add('dot-target-hover');
  } else if (targetNode && targetNode !== startContainer) {
    targetNode.classList.add('connect-target-hover');
  }
}

// ---- Global mouseup handler (exported for main.ts) --------
export function onMouseUp(e: MouseEvent): boolean {
  if (!isDraggingConn || !startContainer) return false;

  const targetDot  = (e.target as Element).closest<HTMLElement>('.node-connect-dot');
  const targetNode = targetDot
    ? targetDot.closest<HTMLElement>('.draggable-container')
    : (e.target as Element).closest<HTMLElement>('.draggable-container');

  if (targetNode && targetNode !== startContainer) {
    finalizeConnection(startContainer, targetNode);
  }

  cleanupDrag();
  return true;
}

export function isDraggingConnection(): boolean {
  return isDraggingConn;
}

// ---- Internal cleanup ------------------------------------
function cleanupDrag(): void {
  if (activeLine)     { activeLine.remove(); activeLine = null; }
  if (startContainer) {
    startContainer.classList.remove('connect-source');
    startContainer = null;
  }
  clearHovers();
  startDir       = null;
  isDraggingConn = false;
  document.body.classList.remove('drawing-mode');
}

function clearHovers(): void {
  document.querySelectorAll('.connect-target-hover, .dot-target-hover').forEach(el => {
    el.classList.remove('connect-target-hover', 'dot-target-hover');
  });
}

// ---- Delete a node and all its connections ----------------
function deleteNode(container: HTMLElement): void {
  removeConnectionsForNode(container);
  container.style.transition = 'opacity 0.2s, transform 0.2s';
  container.style.opacity    = '0';
  container.style.transform  = 'scale(0.9)';
  setTimeout(() => container.remove(), 200);
  showToast('Node deleted');
}

// ---- Unique ID generator ----------------------------------
function generateId(): string {
  return 'node_' + Math.random().toString(36).substring(2, 11);
}
