// ============================================================
// TeX Board — connections.ts
// ============================================================

import type { Connection, Direction, DotPair, Point } from './types';
import { showToast } from './toast';

const svgCanvas = document.getElementById('svg-canvas') as unknown as SVGSVGElement;

export const connections: Connection[] = [];

// ---- Get exact pixel center of a directional dot ----------
export function getDotPoint(container: HTMLElement, dir: Direction): Point {
  const dot = container.querySelector<HTMLElement>(
    `.node-connect-dot[data-dir="${dir}"]`
  );
  if (!dot) return getNodeCenter(container);
  const r = dot.getBoundingClientRect();
  return {
    x: r.left + r.width  / 2 + window.scrollX,
    y: r.top  + r.height / 2 + window.scrollY,
  };
}

export function getNodeCenter(container: HTMLElement): Point {
  const rect = container.getBoundingClientRect();
  return {
    x: rect.left + rect.width  / 2 + window.scrollX,
    y: rect.top  + rect.height / 2 + window.scrollY,
  };
}

// ---- Find the closest dot pair between two nodes ----------
export function getBestDotPair(
  fromContainer: HTMLElement,
  toContainer: HTMLElement
): DotPair {
  const dirs: Direction[] = ['top', 'right', 'bottom', 'left'];
  let best: DotPair = { fromDir: 'right', toDir: 'left' };
  let bestDist = Infinity;

  for (const fd of dirs) {
    for (const td of dirs) {
      const fp = getDotPoint(fromContainer, fd);
      const tp = getDotPoint(toContainer, td);
      const dist = Math.hypot(fp.x - tp.x, fp.y - tp.y);
      if (dist < bestDist) {
        bestDist = dist;
        best = { fromDir: fd, toDir: td };
      }
    }
  }
  return best;
}

// ---- Direction-aware cubic Bézier path --------------------
export function updateLinePath(
  lineEl: SVGPathElement,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  fromDir: Direction | null,
  toDir: Direction | null
): void {
  const dist    = Math.hypot(x2 - x1, y2 - y1);
  const tension = Math.max(40, dist * 0.45);

  const c1 = controlPoint1(fromDir, x1, y1, x2, tension);
  const c2 = controlPoint2(toDir,   x1, x2, y2, tension);

  lineEl.setAttribute('d',
    `M ${x1} ${y1} C ${c1.cx} ${c1.cy}, ${c2.cx} ${c2.cy}, ${x2} ${y2}`
  );
}

function controlPoint1(
  dir: Direction | null,
  x1: number,
  y1: number,
  x2: number,
  t: number
): { cx: number; cy: number } {
  if (dir === 'right')  return { cx: x1 + t, cy: y1 };
  if (dir === 'left')   return { cx: x1 - t, cy: y1 };
  if (dir === 'bottom') return { cx: x1,     cy: y1 + t };
  if (dir === 'top')    return { cx: x1,     cy: y1 - t };
  return { cx: x1 + (x2 > x1 ? t : -t), cy: y1 };
}

function controlPoint2(
  dir: Direction | null,
  x1: number,
  x2: number,
  y2: number,
  t: number
): { cx: number; cy: number } {
  if (dir === 'right')  return { cx: x2 + t, cy: y2 };
  if (dir === 'left')   return { cx: x2 - t, cy: y2 };
  if (dir === 'bottom') return { cx: x2,     cy: y2 + t };
  if (dir === 'top')    return { cx: x2,     cy: y2 - t };
  return { cx: x2 - (x2 > x1 ? t : -t), cy: y2 };
}

// ---- Re-draw all connections ------------------------------
export function updateAllConnections(): void {
  for (const conn of connections) {
    const best = getBestDotPair(conn.from, conn.to);
    conn.fromDir = best.fromDir;
    conn.toDir   = best.toDir;

    const s = getDotPoint(conn.from, conn.fromDir);
    const e = getDotPoint(conn.to,   conn.toDir);
    updateLinePath(conn.path, s.x, s.y, e.x, e.y, conn.fromDir, conn.toDir);

    const mx = (s.x + e.x) / 2;
    const my = (s.y + e.y) / 2;
    conn.deleteBtn.setAttribute('transform', `translate(${mx}, ${my})`);
  }
}

// ---- Create a permanent connection with delete button -----
export function finalizeConnection(
  fromContainer: HTMLElement,
  toContainer: HTMLElement
): void {
  const alreadyExists = connections.some(
    c =>
      (c.from === fromContainer && c.to === toContainer) ||
      (c.from === toContainer   && c.to === fromContainer)
  );
  if (alreadyExists) {
    showToast('Connection already exists');
    return;
  }

  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('class', 'connection-path');
  svgCanvas.appendChild(path);

  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.setAttribute('class', 'conn-delete-btn');
  g.style.pointerEvents = 'all';
  g.innerHTML = `
    <circle r="9" cx="0" cy="0" />
    <path d="M-4 -4 L4 4 M4 -4 L-4 4" stroke-width="1.5" stroke-linecap="round"/>
  `;

  g.addEventListener('click', () => {
    const idx = connections.findIndex(c => c.path === path);
    if (idx !== -1) {
      connections[idx].path.remove();
      connections[idx].deleteBtn.remove();
      connections.splice(idx, 1);
      showToast('Connection removed');
    }
  });

  svgCanvas.appendChild(g);

  const best = getBestDotPair(fromContainer, toContainer);
  const conn: Connection = {
    from: fromContainer,
    to:   toContainer,
    path,
    deleteBtn: g,
    fromDir: best.fromDir,
    toDir:   best.toDir,
  };
  connections.push(conn);
  updateAllConnections();
  showToast('Nodes connected');
}

// ---- Remove all connections involving a given node --------
export function removeConnectionsForNode(container: HTMLElement): void {
  for (let i = connections.length - 1; i >= 0; i--) {
    const conn = connections[i];
    if (conn.from === container || conn.to === container) {
      conn.path.remove();
      conn.deleteBtn.remove();
      connections.splice(i, 1);
    }
  }
}

// ---- Clear every connection -------------------------------
export function clearAllConnections(): void {
  for (const conn of connections) {
    conn.path.remove();
    conn.deleteBtn.remove();
  }
  connections.length = 0;
}
