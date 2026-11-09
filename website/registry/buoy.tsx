"use client"

import * as React from "react"
import { Buoy as Island, type BuoyProps } from "buoy-ui"

export { buoy } from "buoy-ui"

/**
 * The Buoy island for this app. Render it once near the root (in app/layout.tsx with Next.js),
 * then call buoy("Saved") from anywhere. Docs: https://buoy-ui.vercel.app
 */
function Buoy(props: BuoyProps) {
  const colorScheme = useColorScheme()

  // The island lives at the end of <body>, so give it the app's font explicitly.
  React.useEffect(() => {
    const font = getComputedStyle(document.body).fontFamily
    if (font) document.documentElement.style.setProperty("--buoy-font", font)
  }, [])

  return <Island colorScheme={colorScheme} {...props} />
}

/** Follows the `dark` class on <html>, so the Frost and Paper themes match light and dark mode. */
function useColorScheme(): "light" | "dark" {
  const [dark, setDark] = React.useState(false)

  React.useEffect(() => {
    const root = document.documentElement
    const read = () => setDark(root.classList.contains("dark"))
    read()
    const observer = new MutationObserver(read)
    observer.observe(root, { attributes: true, attributeFilter: ["class"] })
    return () => observer.disconnect()
  }, [])

  return dark ? "dark" : "light"
}

export { Buoy }
