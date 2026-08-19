export type DiagramZoomAction = 'in' | 'out' | 'reset';

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;

export function adjustDiagramZoom(current: number, action: DiagramZoomAction): number {
  if (action === 'reset') return 1;
  const change = action === 'in' ? ZOOM_STEP : -ZOOM_STEP;
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, current + change));
}

export function formatDiagramZoom(scale: number): string {
  return `${Math.round(scale * 100)}%`;
}
