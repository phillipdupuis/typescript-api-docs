import { useContext } from "react"
import { PrettierContext } from "./context"

export const usePrettier = () => {
  const ctx = useContext(PrettierContext)
  if (ctx === undefined) {
    throw new Error("usePrettier must be used within PrettierContextProvider")
  }
  return ctx
}
