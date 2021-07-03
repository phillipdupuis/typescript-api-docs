import React, { createContext, useCallback, useState, useMemo } from "react"
import prettier from "prettier/standalone"
import parserBabel from "prettier/parser-babel"
import parserTypescript from "prettier/parser-typescript"

type FormatOptions = NonNullable<Parameters<typeof prettier.format>[1]>

export type PrettierOptions = Pick<
  FormatOptions,
  | "semi"
  | "singleQuote"
  | "bracketSpacing"
  | "useTabs"
  | "tabWidth"
  | "printWidth"
> & {
  removeComments: boolean
}

export interface PrettierContextType {
  format: (text: string) => string
  options: Partial<PrettierOptions>
  setOptions: React.Dispatch<React.SetStateAction<Partial<PrettierOptions>>>
}

export const PrettierContext = createContext<PrettierContextType | undefined>(
  undefined
)

const BLANK_LINE_REGEXP = /^\s*[\r\n]/gm

function findComment(code: string): { start: number; end: number } | null {
  let i = 0
  let x: string
  while (i < code.length) {
    x = code[i]
    if (x === "/" && code[i + 1] === "*") {
      return { start: i, end: code.indexOf("*/", i) + 1 }
    } else if (x === '"' || x === '"') {
      i = code.indexOf(x, i + 1)
    }
    i++
  }
  return null
}

function stripComments(code: string) {
  let comment: { start: number; end: number } | null = null
  while ((comment = findComment(code)) !== null) {
    code = code.substr(0, comment.start) + code.substr(comment.end + 1)
  }
  return code.replace(BLANK_LINE_REGEXP, "")
}

export const PrettierContextProvider: React.FC = ({ children }) => {
  const [options, setOptions] = useState<Partial<PrettierOptions>>({})

  const format = useCallback(
    (text: string) => {
      try {
        const { removeComments, ...standardOptions } = options
        const formattedText = prettier.format(text, {
          ...standardOptions,
          parser: "typescript",
          plugins: [parserBabel, parserTypescript],
        })
        return removeComments ? stripComments(formattedText) : formattedText
      } catch (e) {
        console.error(e)
        return text
      }
    },
    [options]
  )

  const ctx = useMemo(
    () => ({ options, setOptions, format }),
    [options, setOptions, format]
  )

  return (
    <PrettierContext.Provider value={ctx}>{children}</PrettierContext.Provider>
  )
}
