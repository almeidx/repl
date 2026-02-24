const MIN_CONSOLE_HEIGHT = 50
const CONSOLE_TOP_OFFSET = 150
const MIN_SIDEBAR_WIDTH = 200
const MAX_SIDEBAR_WIDTH = 400

export function getResizedConsoleHeight(viewportHeight: number, pointerY: number): number {
  const nextHeight = viewportHeight - pointerY
  return Math.max(MIN_CONSOLE_HEIGHT, Math.min(nextHeight, viewportHeight - CONSOLE_TOP_OFFSET))
}

export function getResizedSidebarWidth(viewportWidth: number, pointerX: number): number {
  const nextWidth = viewportWidth - pointerX
  return Math.max(MIN_SIDEBAR_WIDTH, Math.min(nextWidth, MAX_SIDEBAR_WIDTH))
}
