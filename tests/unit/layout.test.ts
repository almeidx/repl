import { describe, expect, it } from 'vitest'
import { getResizedConsoleHeight, getResizedSidebarWidth } from '../../src/lib/utils/layout'

describe('layout utils', () => {
	it('clamps console height between min and max bounds', () => {
		expect(getResizedConsoleHeight(1000, 980)).toBe(50)
		expect(getResizedConsoleHeight(1000, 10)).toBe(850)
		expect(getResizedConsoleHeight(1000, 650)).toBe(350)
	})

	it('clamps sidebar width between min and max bounds', () => {
		expect(getResizedSidebarWidth(1200, 1150)).toBe(200)
		expect(getResizedSidebarWidth(1200, 700)).toBe(400)
		expect(getResizedSidebarWidth(1200, 930)).toBe(270)
	})
})
