import create, { GetState, SetState, StoreApi } from "zustand"
import { subscribeWithSelector } from "zustand/middleware"
import { DEFAULT_OPEN_API_OPTIONS } from "src/environment"
import { Collection, TsModel, TsEndpoint } from "src/tsApiDocs/models"
import { persistentStorage, urlParamStorage } from "src/stores/extensions"

const STORAGE_KEYS = {
  openApi: "api",
  openApiOptions: "openApiOptions",
}

export interface State {
  loading: boolean
  error?: Error
  models?: Collection<TsModel>
  endpoints?: Collection<TsEndpoint>
  openApiOptions: string[]
  openApi?: string
}

export const useStore = create(
  subscribeWithSelector<
    State,
    SetState<State>,
    GetState<State>,
    StoreApi<State>
  >(() => ({
    loading: false,
    error: undefined,
    models: undefined,
    endpoints: undefined,
    openApiOptions: persistentStorage.getItem(
      STORAGE_KEYS.openApiOptions,
      DEFAULT_OPEN_API_OPTIONS
    ),
    openApi: urlParamStorage.getItem(STORAGE_KEYS.openApi, undefined),
  }))
)

export const selectors = {
  loading: (state: State) => state.loading,
  error: (state: State) => state.error,
  models: (state: State) => state.models,
  endpoints: (state: State) => state.endpoints,
  openApiOptions: (state: State) => state.openApiOptions,
  openApi: (state: State) => state.openApi,
}

function onChangeOpenApiOptions(openApiOptions: string[]): void {
  persistentStorage.setItem(STORAGE_KEYS.openApiOptions, openApiOptions)
}

useStore.subscribe(selectors.openApiOptions, onChangeOpenApiOptions, {
  fireImmediately: false,
})

async function onChangeOpenApi(openApi?: string | undefined): Promise<void> {
  urlParamStorage.setItem(STORAGE_KEYS.openApi, openApi)
  useStore.setState({
    error: undefined,
    models: undefined,
    endpoints: undefined,
  })
  if (openApi) {
    if (!useStore.getState().openApiOptions.includes(openApi)) {
      useStore.setState(({ openApiOptions }) => ({
        openApiOptions: [...openApiOptions, openApi],
      }))
    }
    useStore.setState({ loading: true })
    try {
      const { parseOpenAPI } = await import("src/tsApiDocs/compiler")
      const { models, endpoints } = await parseOpenAPI(openApi)
      useStore.setState({
        models: { ids: Object.keys(models), entities: models },
        endpoints: { ids: Object.keys(endpoints), entities: endpoints },
      })
    } catch (e) {
      console.error(e)
      useStore.setState({
        error: e instanceof Error ? e : new Error("An error occurred"),
      })
    }
    useStore.setState({ loading: false })
  }
}

useStore.subscribe(selectors.openApi, onChangeOpenApi, {
  fireImmediately: true,
})
