import React from "react"
import { Flex, Box, Heading, Spacer, Icon, Link } from "@chakra-ui/react"
import { GoMarkGithub as GithubIcon } from "react-icons/go"
import { ColorModeSwitcher } from "src/ColorModeSwitcher"

const GithubLink: React.FC = () => (
  <Link href="https://github.com/phillipdupuis/typescript-api-docs" isExternal>
    <Flex>
      <Box px="2">
        <Icon as={GithubIcon} />
      </Box>
      <Spacer />
      <Heading size="md" my="auto">
        Typescript API Docs
      </Heading>
    </Flex>
  </Link>
)

export const AppNavBar: React.FC = () => {
  return (
    <Flex p="2">
      <Box p="2">
        <GithubLink />
      </Box>
      <Spacer />
      <Box>
        <ColorModeSwitcher />
      </Box>
    </Flex>
  )
}
