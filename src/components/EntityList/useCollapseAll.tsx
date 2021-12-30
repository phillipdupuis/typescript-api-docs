import React, { useMemo, useCallback } from "react"

interface UseCollapseAllProps<Item> {
  items: Item[]
  index: number[]
  setIndex: React.Dispatch<React.SetStateAction<number[]>>
}

export function useCollapseAll<Item>({
  items,
  index,
  setIndex,
}: UseCollapseAllProps<Item>) {
  const collapseAll = useCallback(() => setIndex([]), [])

  const enableCollapseAll = useMemo(
    () => (!items ? false : index.length > 0),
    [items, index]
  )

  return { collapseAll, enableCollapseAll }
}
