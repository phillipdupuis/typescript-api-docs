import { useCallback, useState, SetStateAction, Dispatch } from "react"

/**
 * Like useState, but the state is also saved in localStorage
 * so it can persist across sessions.
 */
export function useLocalStorageState<T>(
  key: string,
  defaultValue: T
): [T, Dispatch<SetStateAction<T>>] {
  const [state, setState] = useState<T>(() => {
    const storedValue = localStorage.getItem(key)
    return storedValue !== null ? JSON.parse(storedValue) : defaultValue
  })

  const setLocalStorageState = useCallback(
    (action: SetStateAction<T>) => {
      const value =
        typeof action === "function"
          ? (action as (prevState: T) => T)(state)
          : action
      setState(value)
      localStorage.setItem(key, JSON.stringify(value))
    },
    [key]
  )

  return [state, setLocalStorageState]
}
