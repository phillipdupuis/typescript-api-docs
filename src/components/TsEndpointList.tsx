import React, { useMemo } from "react"
import { Box, HStack, VStack, Tag, TagProps } from "@chakra-ui/react"
import { EntityList } from "src/components/EntityList"
import { TsModelDetail } from "src/components/TsModelDetail"
import { HttpMethod, TsEndpoint } from "src/tsApiDocs/models"
import { useStore, selectors } from "src/stores/useStore"

const httpMethodsSortOrder = [
  "get",
  "head",
  "post",
  "put",
  "delete",
  "options",
  "trace",
  "patch",
] as const

const httpMethodColors: Record<HttpMethod, TagProps["colorScheme"]> = {
  get: "green",
  head: "pink",
  post: "blue",
  put: "yellow",
  delete: "red",
  options: "purple",
  trace: "teal",
  patch: "orange",
}

const HttpMethodTag = React.memo(({ method }: { method: HttpMethod }) => {
  const color = httpMethodColors[method] ?? "gray"
  return (
    <Tag w="7em" colorScheme={color}>
      <Box d="inline-block" w="100%" textAlign="center">
        {method.toUpperCase()}
      </Box>
    </Tag>
  )
})

const EndpointLabel = React.memo(
  ({ path, method }: { path: string; method: HttpMethod }) => (
    <HStack>
      <HttpMethodTag method={method} />
      <Box>{path}</Box>
    </HStack>
  )
)

const EndpointPanel: React.FC<{ value: TsEndpoint }> = ({ value }) => (
  <VStack w="100%" alignItems="start">
    {value.requestModel && (
      <React.Fragment key="request">
        <p>Request body</p>
        <TsModelDetail modelId={value.requestModel} />
      </React.Fragment>
    )}
    {Object.entries(value.responseModels).map(([statusCode, id], i) => (
      <React.Fragment key={`response_${i}`}>
        <p>{`${statusCode} response body`}</p>
        <TsModelDetail modelId={id} />
      </React.Fragment>
    ))}
  </VStack>
)

const renderLabel = (v: TsEndpoint) => (
  <EndpointLabel path={v.path} method={v.method} />
)

const renderPanel = (v: TsEndpoint) => <EndpointPanel value={v} />

const endpointHasNoModels = (v: TsEndpoint) =>
  !v.requestModel && Object.keys(v.responseModels).length === 0

const sortComparator = (a: TsEndpoint, b: TsEndpoint): number => {
  if (a.path !== b.path) {
    return a.path.localeCompare(b.path)
  }
  const ax = httpMethodsSortOrder.indexOf(a.method)
  const bx = httpMethodsSortOrder.indexOf(b.method)
  return ax < bx ? -1 : ax > bx ? 1 : 0
}

export const TsEndpointList: React.FC = () => {
  const endpoints = useStore(selectors.endpoints)
  const items = useMemo(
    () =>
      endpoints === undefined
        ? undefined
        : endpoints.ids
            .map((id) => endpoints.entities[id]!)
            .sort(sortComparator),
    [endpoints]
  )
  return (
    <EntityList
      title="Endpoints"
      items={items}
      itemIsDisabled={endpointHasNoModels}
      renderLabel={renderLabel}
      renderPanel={renderPanel}
    />
  )
}
