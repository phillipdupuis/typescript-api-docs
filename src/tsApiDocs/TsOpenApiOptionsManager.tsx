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
  const { openApi, setOpenApi, openApiOptions, setOpenApiOptions } =
    useTsApiDocs()
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [newEntry, setNewEntry] = useState("")
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
      <Drawer size="lg" isOpen={isOpen} onClose={onClose} placement="left">
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
                >
                  <Link flex="1" href={o} isExternal>
                    {o}
                  </Link>
                  <IconButton
                    aria-label={`Delete option: ${o}`}
                    icon={<DeleteIcon />}
                    disabled={isRequiredOption(o)}
                    onClick={() => {
                      setOpenApiOptions(openApiOptions.filter((v) => v !== o))
                      if (openApi === o) {
                        setOpenApi(undefined)
                      }
                    }}
                    size="sm"
                    variant="outline"
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
                />
                <IconButton
                  aria-label={`Add option: ${newEntry}`}
                  disabled={!newEntry}
                  icon={<AddIcon />}
                  onClick={() => {
                    if (!openApiOptions.includes(newEntry)) {
                      setOpenApiOptions([...openApiOptions, newEntry])
                    }
                    setNewEntry("")
                  }}
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
