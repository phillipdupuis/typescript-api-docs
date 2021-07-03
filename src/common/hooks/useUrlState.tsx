import { useCallback, useState, SetStateAction, Dispatch } from "react"

function updateUrlSearchParam(key: string, value: any): void {
  const url = new URL(window.location.href)
  if (value === undefined) {
    url.searchParams.delete(key)
  } else {
    url.searchParams.set(key, JSON.stringify(value))
  }
  window.history.replaceState(window.history.state, "", url.toString())
}

/**
 * Hook for deriving stateful values from URL query parameters.
 * State updates are propagated to the URL without reloading the page.
 *
 * The `defaultValue` will only be used if the named value is not present
 * in the URL initially.
 */
export function useUrlState<T>(
  key: string,
  defaultValue: T extends Function ? never : T
): [T, Dispatch<SetStateAction<T>>] {
  const [state, setState] = useState<T>(() => {
    const url = new URL(window.location.href)
    if (url.searchParams.has(key)) {
      return JSON.parse(url.searchParams.get(key)!)
    } else {
      updateUrlSearchParam(key, defaultValue)
      return defaultValue
    }
  })

  const setUrlState = useCallback(
    (action: SetStateAction<T>) => {
      const value =
        typeof action === "function"
          ? (action as (prevState: T) => T)(state)
          : action
      setState(value)
      updateUrlSearchParam(key, value)
    },
    [setState]
  )

  return [state, setUrlState]
}
