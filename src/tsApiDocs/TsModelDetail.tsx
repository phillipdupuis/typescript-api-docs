import React, { useState, useMemo, useCallback } from "react"
import {
  Spinner,
  Code,
  Button,
  ButtonGroup,
  useMediaQuery,
} from "@chakra-ui/react"
import { useTransitionTimeout } from "src/common/hooks/useTransitionTimeout"
import { useTsApiDocs } from "src/tsApiDocs"
import { usePrettier } from "src/prettier/hooks"
import { TsModel } from "./models"

/**
 * Ensure that there are at least 2 lines of content.
 * The 'Copy' button overflows if only 1 line is shown.
 */
function padLines(code: string) {
  const numLines = (code.match(/\n/g)?.length ?? 0) + 1
  return numLines > 2 ? code : code + "\n".repeat(3 - numLines)
}

/**
 * Primary component for displaying a typescript definition generated from JSON schema.
 */
export const TsModelDetail: React.FC<{ modelId: string }> = ({ modelId }) => {
  const { models } = useTsApiDocs()
  const prettier = usePrettier()
  const { format } = prettier
  const [widerThan50em] = useMediaQuery("(min-width: 50em)")
  const [copied, setCopied] = useTransitionTimeout(1500)
  const [showDependencies, setShowDependencies] = useState(false)

  const instance = useMemo(
    () => (!models?.entities ? undefined : models.entities[modelId]),
    [models?.entities]
  )

  const dependencies = useMemo(
    () =>
      !instance
        ? []
        : instance.dependencies
            .filter((id) => id !== instance.id)
            .map(
              (id) =>
                models!.entities[id] ??
                models!.entities[id.replaceAll("__", "_")]
            )
            .filter((m): m is TsModel => m !== undefined),
    [models?.entities, instance]
  )

  const code = useMemo(
    () =>
      !instance
        ? undefined
        : !showDependencies
        ? format(instance.code)
        : format([instance, ...dependencies].map((m) => m.code).join("\n")),
    [instance, dependencies, format, showDependencies]
  )

  const copyToClipboard = useCallback(() => {
    navigator.clipboard.writeText(code ?? "").then(() => setCopied(true))
  }, [code])

  return !instance ? (
    <Spinner />
  ) : (
    <Code
      key={instance.id}
      display="block"
      whiteSpace="pre"
      textAlign="left"
      w="full"
      p="1"
      position="relative"
      overflowX="auto"
      maxW={`${prettier.options.printWidth ?? 80}em`}
    >
      <ButtonGroup
        size="sm"
        variant="outline"
        spacing="2"
        top="0.5em"
        {...(widerThan50em ? { position: "absolute", right: "0.5em" } : {})}
      >
        {dependencies.length > 0 && (
          <Button
            colorScheme="blue"
            onClick={() => setShowDependencies(!showDependencies)}
          >
            {showDependencies ? "Hide dependencies" : "Show dependencies"}
          </Button>
        )}
        <Button colorScheme="blue" onClick={copyToClipboard} disabled={copied}>
          {copied ? "Copied" : "Copy"}
        </Button>
      </ButtonGroup>
      {!widerThan50em && <br />}
      {code && padLines(code)}
    </Code>
  )
}
