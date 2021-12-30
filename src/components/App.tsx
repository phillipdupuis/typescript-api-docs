import React from "react"
import {
  Box,
  ChakraProvider,
  Container,
  HStack,
  VStack,
  theme,
} from "@chakra-ui/react"
import { AppInfo } from "src/components/AppInfo"
import { AppNavBar } from "src/components/AppNavBar"
import { PrettierOptionsManager } from "src/components/PrettierOptionsManager"
import { TsDefinitions } from "src/components/TsDefinitions"
import { TsOpenApiOptionsManager } from "src/components/TsOpenApiOptionsManager"
import { TsOpenApiSelect } from "src/components/TsOpenApiSelect"

export const App = () => {
  return (
    <ChakraProvider theme={theme}>
      <Box textAlign="left" fontSize="xl">
        <AppNavBar />
        <Container maxW="container.xl" marginBottom="5em">
          <VStack spacing="5">
            <AppInfo />
            <TsOpenApiSelect />
            <HStack w="full">
              <TsOpenApiOptionsManager />
              <PrettierOptionsManager />
            </HStack>
            <TsDefinitions />
          </VStack>
        </Container>
      </Box>
    </ChakraProvider>
  )
}
