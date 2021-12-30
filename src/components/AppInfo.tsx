import React from "react"
import { Box, Text, Link } from "@chakra-ui/react"

export const AppInfo: React.FC = () => (
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
