import React from "react"
import { Select } from "@chakra-ui/react"
import { useTsApiDocs } from "src/tsApiDocs"

export const TsOpenApiSelect: React.FC = () => {
  const { openApi, setOpenApi, openApiOptions } = useTsApiDocs()
  return (
    <Select
      flex="1"
      value={openApi}
      onChange={(event) => {
        window.location.hash = ""
        setOpenApi(event.target.value || undefined)
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
