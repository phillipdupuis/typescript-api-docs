import React from "react"
import { Select } from "@chakra-ui/react"
import { useStore, selectors } from "src/stores/useStore"

export const TsOpenApiSelect: React.FC = () => {
  const openApi = useStore(selectors.openApi)
  const openApiOptions = useStore(selectors.openApiOptions)
  return (
    <Select
      flex="1"
      value={openApi}
      onChange={(event) => {
        window.location.hash = ""
        useStore.setState({ openApi: event.target.value || undefined })
      }}
      placeholder="Select an OpenAPI Document"
    >
      {openApiOptions.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </Select>
  )
}
