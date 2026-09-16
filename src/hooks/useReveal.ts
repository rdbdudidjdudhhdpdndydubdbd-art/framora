import { useEffect, useRef, useState } from 'react'

// 区块进入视口时触发一次淡入上移。系统开启「减弱动态效果」时直接显示。
export function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setRevealed(true)
      return
    }

    const element = ref.current
    if (!element || typeof IntersectionObserver === 'undefined') {
      setRevealed(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setRevealed(true)
          observer.disconnect()
        }
      },
      { threshold: 0.15 },
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return { ref, revealed }
}
