import React, { useState } from "react"
import {
  Box,
  Button,
  IconButton,
  Input,
  Link,
  List,
  ListItem,
  Drawer,
  DrawerBody,
  DrawerHeader,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  useDisclosure,
} from "@chakra-ui/react"
import { AddIcon, DeleteIcon } from "@chakra-ui/icons"
import { SiSwagger } from "react-icons/si"
import { DEFAULT_OPEN_API_OPTIONS } from "src/environment"
import { useTsApiDocs } from "src/tsApiDocs"

function isRequiredOption(openApiOption: string): boolean {
  return DEFAULT_OPEN_API_OPTIONS.includes(openApiOption)
}

export const TsOpenApiOptionsManager: React.FC = () => {
  const { isOpen, onOpen, onClose } = useDisclosure()
  const { openApi, setOpenApi, openApiOptions, setOpenApiOptions } =
    useTsApiDocs()
  const [newEntry, setNewEntry] = useState("")

  const addOption = () => {
    if (newEntry && !openApiOptions.includes(newEntry)) {
      setOpenApiOptions([...openApiOptions, newEntry])
      setNewEntry("")
    }
  }

  const deleteOption = (o: string) => {
    setOpenApiOptions(openApiOptions.filter((v) => v !== o))
    if (openApi === o) {
      setOpenApi(undefined)
    }
  }

  return (
    <>
      <Button
        isFullWidth
        size="md"
        onClick={onOpen}
        aria-label="Edit OpenAPI Options"
        leftIcon={<SiSwagger />}
      >
        Add/remove APIs
      </Button>
      <Drawer size="xl" isOpen={isOpen} onClose={onClose} placement="left">
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader>OpenAPI Options</DrawerHeader>
          <DrawerBody>
            <Box pb="5" fontStyle="italic">
              Manage the OpenAPI documents available for selection.
              <br />
              An extensive list of publicly available documents can be found at{" "}
              <Link href="https://apis.guru/" isExternal>
                https://apis.guru/
              </Link>
              .
            </Box>
            <List spacing={2}>
              {openApiOptions.map((o, i) => (
                <ListItem
                  key={`OptionsList${o}`}
                  display="flex"
                  flexDirection="row"
                  borderBottom="1px solid"
                  borderBottomColor="inherit"
                >
                  <Link
                    flex="1"
                    href={o}
                    isExternal
                    overflowWrap="anywhere"
                    pr="0.5em"
                  >
                    {o}
                  </Link>
                  <IconButton
                    aria-label={`Delete option: ${o}`}
                    icon={<DeleteIcon />}
                    disabled={isRequiredOption(o)}
                    onClick={() => deleteOption(o)}
                    size="sm"
                    variant="outline"
                    mb="0.5em"
                  />
                </ListItem>
              ))}
              <ListItem display="flex" flexDirection="row">
                <Input
                  flex="1"
                  size="md"
                  marginRight="1em"
                  placeholder="URL"
                  value={newEntry}
                  onChange={(e) => setNewEntry(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      addOption()
                    }
                  }}
                />
                <IconButton
                  aria-label={`Add option: ${newEntry}`}
                  icon={<AddIcon />}
                  disabled={!newEntry || openApiOptions.includes(newEntry)}
                  onClick={addOption}
                  size="md"
                  colorScheme="blue"
                />
              </ListItem>
            </List>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  )
}
