import React from "react"
import { Alert, AlertIcon, AlertDescription, Spinner } from "@chakra-ui/react"
import { useStore, selectors } from "src/stores/useStore"
import { TsEndpointList } from "src/components/TsEndpointList"
import { TsModelList } from "src/components/TsModelList"

export const TsDefinitions: React.FC = () => {
  const error = useStore(selectors.error)
  const loading = useStore(selectors.loading)
  const openApi = useStore(selectors.openApi)

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
