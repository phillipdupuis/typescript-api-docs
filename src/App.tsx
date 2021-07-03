import React from "react"
import {
  Alert,
  AlertIcon,
  AlertDescription,
  Box,
  ChakraProvider,
  Container,
  Spinner,
  HStack,
  Link,
  Text,
  VStack,
  theme,
} from "@chakra-ui/react"
import { AppNavBar } from "src/AppNavBar"
import { PrettierContextProvider, PrettierOptionsManager } from "src/prettier"
import {
  TsApiDocsContextProvider,
  TsEndpointList,
  TsModelList,
  TsOpenApiOptionsManager,
  TsOpenApiSelect,
  useTsApiDocs,
} from "src/tsApiDocs"

const Description = () => (
  <Box w="full">
    <Text fontSize="md" my="3">
      Instantly generate typescript definitions from OpenAPI/Swagger
      specifications.
      <br />
      To view the source code/documentation or report issues, visit{" "}
      <Link
        isExternal
        textDecoration="underline"
        href="https://github.com/phillipdupuis/typescript-api-docs"
      >
        https://github.com/phillipdupuis/typescript-api-docs.
      </Link>
    </Text>
  </Box>
)

const TsDefinitions: React.FC = () => {
  const { error, loading, openApi } = useTsApiDocs()
  if (loading) {
    return <Spinner size="lg" m="auto" />
  } else if (error !== undefined) {
    return (
      <Alert status="error">
        <AlertIcon />
        <AlertDescription>{error.toString()}</AlertDescription>
      </Alert>
    )
  } else if (openApi !== undefined) {
    return (
      <>
        <TsEndpointList />
        <TsModelList />
      </>
    )
  }
  return null
}

const Content: React.FC = () => (
  <Box textAlign="left" fontSize="xl">
    <AppNavBar />
    <Container maxW="container.xl" marginBottom="5em">
      <VStack spacing="5">
        <Description />
        <TsOpenApiSelect />
        <HStack w="full">
          <TsOpenApiOptionsManager />
          <PrettierOptionsManager />
        </HStack>
        <TsDefinitions />
      </VStack>
    </Container>
  </Box>
)

export const App = () => {
  return (
    <ChakraProvider theme={theme}>
      <TsApiDocsContextProvider>
        <PrettierContextProvider>
          <Content />
        </PrettierContextProvider>
      </TsApiDocsContextProvider>
    </ChakraProvider>
  )
}
