import React, { useState, createContext, useEffect } from "react"
import { useLocalStorageState } from "src/common/hooks/useLocalStorageState"
import { useUrlState } from "src/common/hooks/useUrlState"
import { DEFAULT_OPEN_API_OPTIONS } from "src/environment"
import { parseOpenAPI } from "src/tsApiDocs/compiler"
import { TsModel, TsEndpoint, Collection } from "src/tsApiDocs/models"

type SetState<T> = React.Dispatch<React.SetStateAction<T>>

export interface TsApiDocsContextType {
  loading: boolean
  error?: Error
  models?: Collection<TsModel>
  endpoints?: Collection<TsEndpoint>
  openApi?: string
  openApiOptions: string[]
  setError: SetState<Error | undefined>
  setModels: SetState<Collection<TsModel> | undefined>
  setEndpoints: SetState<Collection<TsEndpoint> | undefined>
  setOpenApi: SetState<string | undefined>
  setOpenApiOptions: SetState<string[]>
}

export const TsApiDocsContext = createContext<TsApiDocsContextType | undefined>(
  undefined
)

export const TsApiDocsContextProvider: React.FC = ({ children }) => {
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<Error>()
  const [openApi, setOpenApi] = useUrlState<string | undefined>(
    "api",
    undefined
  )
  const [openApiOptions, setOpenApiOptions] = useLocalStorageState<string[]>(
    "openApiOptions",
    DEFAULT_OPEN_API_OPTIONS
  )
  const [models, setModels] = useState<Collection<TsModel>>()
  const [endpoints, setEndpoints] = useState<Collection<TsEndpoint>>()

  useEffect(() => {
    setError(undefined)
    setLoading(true)
    if (openApi === undefined) {
      setModels(undefined)
      setEndpoints(undefined)
      setLoading(false)
    } else {
      if (!openApiOptions.includes(openApi)) {
        setOpenApiOptions([...openApiOptions, openApi])
      }
      parseOpenAPI(openApi)
        .then(({ models, endpoints }) => {
          setModels({
            ids: Object.keys(models),
            entities: models,
          })
          setEndpoints({
            ids: Object.keys(endpoints),
            entities: endpoints,
          })
        })
        .catch((e) => {
          console.error(e)
          setError(e instanceof Error ? e : new Error("An error occurred"))
        })
        .finally(() => setLoading(false))
    }
  }, [openApi])

  const ctx = {
    loading,
    error,
    models,
    endpoints,
    openApi,
    openApiOptions,
    setError,
    setModels,
    setEndpoints,
    setOpenApi,
    setOpenApiOptions,
  }

  return (
    <TsApiDocsContext.Provider value={ctx}>
      {children}
    </TsApiDocsContext.Provider>
  )
}
