// ============================================================
// TeX Board — nodeDrag.ts
// Handles moving nodes around the workspace via drag-handle.
// ============================================================

import { updateAllConnections } from './connections';
import { isDraggingConnection } from './node';

const workspace = document.getElementById('workspace') as HTMLDivElement;

interface DragState {
  node:    HTMLElement | null;
  offsetX: number;
  offsetY: number;
}

const state: DragState = { node: null, offsetX: 0, offsetY: 0 };

document.addEventListener('mousedown', (e: MouseEvent) => {
  if (isDraggingConnection()) return;

  const handle    = (e.target as Element).closest<HTMLElement>('.drag-handle');
  const container = handle?.closest<HTMLElement>('.draggable-container');
  if (!container) return;

  state.node    = container;
  const rect    = container.getBoundingClientRect();
  state.offsetX = e.clientX - rect.left;
  state.offsetY = e.clientY - rect.top;

  document.querySelectorAll<HTMLElement>('.draggable-container').forEach(el => {
    el.style.zIndex = '2';
  });
  container.style.zIndex = '100';
  container.classList.add('is-dragging');
  e.preventDefault();
});

document.addEventListener('mousemove', (e: MouseEvent) => {
  const { node, offsetX, offsetY } = state;
  if (!node) return;

  const wr            = workspace.getBoundingClientRect();
  const toolbar       = document.querySelector<HTMLElement>('.toolbar');
  const toolbarBottom = toolbar
    ? toolbar.getBoundingClientRect().bottom - wr.top + 10
    : 0;

  const x = clamp(
    e.clientX - wr.left - offsetX + workspace.scrollLeft,
    0,
    wr.width - node.offsetWidth,
  );
  const y = clamp(
    e.clientY - wr.top - offsetY + workspace.scrollTop,
    toolbarBottom,
    wr.height - node.offsetHeight,
  );

  node.style.left = `${x}px`;
  node.style.top  = `${y}px`;
  updateAllConnections();
});

document.addEventListener('mouseup', () => {
  if (!state.node) return;
  state.node.classList.remove('is-dragging');
  state.node = null;
});

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max));
}