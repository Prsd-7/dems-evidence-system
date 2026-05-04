// ThemeContext.jsx
// Provides global dark/light theme state to the entire app.
// Theme is persisted to localStorage so it survives page refresh.
// Usage:
//   const { theme, toggleTheme } = useTheme()
import { createContext, useContext, useEffect, useState } from "react"

const ThemeContext = createContext()

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    // On first load: check localStorage, then system preference, then default dark
    const saved = localStorage.getItem("dems_theme")
    if (saved === "light" || saved === "dark") return saved
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
    return prefersDark ? "dark" : "light"
  })

  // Apply theme to <html> element so all CSS vars cascade everywhere
  useEffect(() => {
    const root = document.documentElement
    if (theme === "light") {
      root.setAttribute("data-theme", "light")
    } else {
      root.removeAttribute("data-theme")   // dark is the :root default
    }
    localStorage.setItem("dems_theme", theme)
  }, [theme])

  const toggleTheme = () => setTheme(t => t === "dark" ? "light" : "dark")

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}