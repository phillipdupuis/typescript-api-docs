import React, { useState, useCallback, useEffect } from "react"
import {
  Box,
  Link,
  HStack,
  Heading,
  ButtonGroup,
  IconButton,
  Accordion,
  AccordionButton,
  AccordionPanel,
  AccordionItem,
  AccordionIcon,
} from "@chakra-ui/react"
import { VscExpandAll, VscCollapseAll } from "react-icons/vsc"
import { useCollapseAll } from "./useCollapseAll"
import { useExpandAll } from "./useExpandAll"

type Renderer<T> = (v: T) => React.ReactNode

interface BaseItem {
  id: string
}

export interface EntityListProps<Item extends BaseItem> {
  title: string
  items?: Item[]
  itemIsDisabled?: (item: Item) => boolean
  renderLabel: Renderer<Item>
  renderPanel: Renderer<Item>
}

export const EntityList = <Item extends BaseItem>({
  title,
  items,
  itemIsDisabled,
  renderLabel,
  renderPanel,
}: EntityListProps<Item>) => {
  const [index, setIndex] = useState<number[]>([])

  const accordionOnChange = useCallback(
    (v: number | number[]) => setIndex(Array.isArray(v) ? v : [v]),
    []
  )

  const { expandAll, enableExpandAll } = useExpandAll({
    items: items ?? [],
    itemIsDisabled,
    index,
    setIndex,
  })

  const { collapseAll, enableCollapseAll } = useCollapseAll({
    items: items ?? [],
    index,
    setIndex,
  })

  const itemHash = useCallback((item: Item) => `${title}_${item.id}`, [title])

  useEffect(() => {
    const hash = window.location.hash?.slice(1)
    const activeIndex = !hash
      ? undefined
      : items?.findIndex((item) => hash === itemHash(item))
    if (activeIndex !== undefined) {
      setIndex([activeIndex])
      document.getElementById(hash)?.scrollIntoView()
    }
  }, [])

  return (
    <>
      <HStack spacing="1" w="full">
        <Heading flex="1" id={title}>
          <Link href={`#${title}`}>{title}</Link>
        </Heading>
        <ButtonGroup size="sm" isAttached variant="outline">
          <IconButton
            aria-label={`Expand all ${title}`}
            title="Expand all"
            icon={<VscExpandAll />}
            disabled={!enableExpandAll}
            onClick={expandAll}
          />
          <IconButton
            aria-label={`Collapse all ${title}`}
            title="Collapse all"
            icon={<VscCollapseAll />}
            disabled={!enableCollapseAll}
            onClick={collapseAll}
          />
        </ButtonGroup>
      </HStack>
      <Accordion
        allowMultiple
        w="full"
        mx="3"
        index={index}
        onChange={accordionOnChange}
      >
        {items === undefined
          ? `No ${title}`
          : items.map((item, i) => (
              <AccordionItem
                key={i}
                id={String(i)}
                isDisabled={itemIsDisabled?.(item)}
              >
                <h2>
                  <AccordionButton>
                    <Box
                      id={itemHash(item)}
                      display="inline-flex"
                      flex="1"
                      role="group"
                    >
                      {renderLabel(item)}
                      {!itemIsDisabled?.(item) && (
                        <Link
                          href={`#${itemHash(item)}`}
                          paddingLeft={2}
                          display="none"
                          _groupHover={{ display: "initial" }}
                        >
                          #
                        </Link>
                      )}
                    </Box>
                    {!itemIsDisabled?.(item) && <AccordionIcon />}
                  </AccordionButton>
                </h2>
                <AccordionPanel>
                  {index.includes(i) ? renderPanel(item) : <></>}
                </AccordionPanel>
              </AccordionItem>
            ))}
      </Accordion>
    </>
  )
}
