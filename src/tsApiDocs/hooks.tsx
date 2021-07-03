import { useContext } from "react"
import { TsApiDocsContext } from "src/tsApiDocs/context"

export const useTsApiDocs = () => {
  const ctx = useContext(TsApiDocsContext)
  if (ctx === undefined) {
    throw new Error("useTsApiDocs must be used within TsApiDocsContextProvider")
  }
  return ctx
}
