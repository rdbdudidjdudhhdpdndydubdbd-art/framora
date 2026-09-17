import { useEffect, useRef, useState } from 'react'

type RevealOptions = {
  /** 进入视口后延迟多少毫秒触发，用于照片墙的错落浮现。 */
  delay?: number
  /** 元素可见比例达到该值才触发，默认 0.15。 */
  threshold?: number
  /** 提前多少像素触发（正值向下提前，可让滚动中更早出现）。 */
  rootMargin?: string
}

// 区块/元素进入视口时触发一次淡入上移，支持错落延迟（苹果官网式浮现）。
// 系统开启「减弱动态效果」时直接显示、不延迟。
export function useReveal<T extends HTMLElement>(options: RevealOptions = {}) {
  const { delay = 0, threshold = 0.15, rootMargin = '0px 0px -8% 0px' } = options
  const ref = useRef<T>(null)
  const [revealed, setRevealed] = useState(false)
  const delayRef = useRef(delay)
  delayRef.current = delay

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
        if (!entries.some((entry) => entry.isIntersecting)) return
        window.setTimeout(() => {
          setRevealed(true)
        }, delayRef.current)
        observer.disconnect()
      },
      { threshold, rootMargin },
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [threshold, rootMargin])

  return { ref, revealed }
}
