// ============================================================
// TeX Board — types.ts
// ============================================================

export type Direction = 'top' | 'right' | 'bottom' | 'left';

export interface Point {
  x: number;
  y: number;
}

export interface DotPair {
  fromDir: Direction;
  toDir: Direction;
}

export interface Connection {
  from: HTMLElement;
  to: HTMLElement;
  path: SVGPathElement;
  deleteBtn: SVGGElement;
  fromDir: Direction;
  toDir: Direction;
}

// Augment the global Window interface to include MathJax
declare global {
  interface Window {
    MathJax: {
      typesetPromise?: (nodes: Element[]) => Promise<void>;
      startup?: {
        defaultReady: () => void;
      };
      tex?: object;
      options?: object;
    };
  }
}
