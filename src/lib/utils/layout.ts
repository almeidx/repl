const MIN_CONSOLE_HEIGHT = 50
const CONSOLE_TOP_OFFSET = 150
const MIN_SIDEBAR_WIDTH = 200
const MAX_SIDEBAR_WIDTH = 400

export function clampConsoleHeight(height: number, viewportHeight: number): number {
  return Math.max(MIN_CONSOLE_HEIGHT, Math.min(height, viewportHeight - CONSOLE_TOP_OFFSET))
}

export function clampSidebarWidth(width: number): number {
  return Math.max(MIN_SIDEBAR_WIDTH, Math.min(width, MAX_SIDEBAR_WIDTH))
}

export function getResizedConsoleHeight(viewportHeight: number, pointerY: number): number {
  const nextHeight = viewportHeight - pointerY
  return clampConsoleHeight(nextHeight, viewportHeight)
}

export function getResizedSidebarWidth(viewportWidth: number, pointerX: number): number {
  const nextWidth = viewportWidth - pointerX
  return clampSidebarWidth(nextWidth)
}
