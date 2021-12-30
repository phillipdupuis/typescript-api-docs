import React, { useMemo, useCallback } from "react"
import { useSyncedRef } from "@react-hookz/web"

interface UseExpandAllProps<Item> {
  items: Item[]
  itemIsDisabled?: (item: Item) => boolean
  index: number[]
  setIndex: React.Dispatch<React.SetStateAction<number[]>>
}

export function useExpandAll<Item>({
  items,
  itemIsDisabled,
  index,
  setIndex,
}: UseExpandAllProps<Item>) {
  const itemsRef = useSyncedRef(items)

  const expandAll = useCallback(
    () =>
      setIndex(
        itemsRef.current
          .map((item, i) =>
            !itemIsDisabled || !itemIsDisabled(item) ? i : undefined
          )
          .filter((i): i is number => i !== undefined)
      ),
    [itemsRef, itemIsDisabled]
  )

  const enableExpandAll = useMemo(
    () =>
      !items
        ? false
        : !itemIsDisabled
        ? items.length !== index.length
        : items.filter((x) => !itemIsDisabled(x)).length !== index.length,
    [items, index, itemIsDisabled]
  )

  return { expandAll, enableExpandAll }
}
