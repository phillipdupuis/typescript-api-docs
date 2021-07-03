import { useState, useEffect } from "react"

/**
 * The state value only stays "true" for the duration of the timeout,
 * then it reverts to false. Useful for briefly displaying feedback
 * to users.
 */
export function useTransitionTimeout(
  timeout: number
): [boolean, React.Dispatch<React.SetStateAction<boolean>>] {
  const [transitioning, setTransitioning] = useState(false)

  useEffect(() => {
    let timeoutId: number | null = null
    if (transitioning) {
      timeoutId = window.setTimeout(() => {
        setTransitioning(false)
      }, timeout)
    }
    return () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId)
      }
    }
  }, [timeout, transitioning])

  return [transitioning, setTransitioning]
}
