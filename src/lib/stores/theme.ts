import { writable } from 'svelte/store'

export type Theme = 'dark' | 'light'

export const theme = writable<Theme>('dark')

export function initTheme() {
  const stored = localStorage.getItem('theme') as Theme | null
  if (stored) {
    setTheme(stored)
  } else {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    setTheme(prefersDark ? 'dark' : 'light')
  }

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem('theme')) {
      setTheme(e.matches ? 'dark' : 'light')
    }
  })
}

function setTheme(t: Theme) {
  theme.set(t)
  document.documentElement.classList.toggle('light', t === 'light')
}

export function toggleTheme() {
  theme.update(t => {
    const newTheme = t === 'dark' ? 'light' : 'dark'
    localStorage.setItem('theme', newTheme)
    setTheme(newTheme)
    return newTheme
  })
}
