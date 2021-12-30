import create, { SetState, GetState, StoreApi } from "zustand"
import { subscribeWithSelector } from "zustand/middleware"
import { persistentStorage } from "src/stores/extensions"

export type FormatOptions = {
  semi: boolean
  singleQuote: boolean
  bracketSpacing: boolean
  useTabs: boolean
  tabWidth: number
  printWidth: number
  /**
   * Whether comments should be stripped from the ts definitions.
   * This is not one of the standard prettier format options.
   */
  removeComments: boolean
}

const DEFAULT_OPTIONS: FormatOptions = {
  semi: true,
  singleQuote: false,
  bracketSpacing: false,
  useTabs: false,
  tabWidth: 2,
  printWidth: 80,
  removeComments: false,
}

const STORAGE_KEYS = {
  options: "prettierOptions",
}

export interface PrettierState {
  format: (text: string) => string
  options: FormatOptions
}

export const usePrettierStore = create(
  subscribeWithSelector<
    PrettierState,
    SetState<PrettierState>,
    GetState<PrettierState>,
    StoreApi<PrettierState>
  >(() => ({
    format: (text: string) => text,
    options: persistentStorage.getItem(STORAGE_KEYS.options, DEFAULT_OPTIONS),
  }))
)

export const prettierSelectors = {
  format: (state: PrettierState) => state.format,
  options: (state: PrettierState) => state.options,
}

async function onChangeOptions(options: FormatOptions): Promise<void> {
  persistentStorage.setItem(STORAGE_KEYS.options, options)
  try {
    const prettier = await import("prettier/standalone")
    const parserBabel = await import("prettier/parser-babel")
    const parserTypescript = await import("prettier/parser-typescript")
    const { removeComments, ...standardOptions } = options
    const format = (text: string): string => {
      try {
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
    }
    usePrettierStore.setState({ format })
  } catch (e) {
    console.error(e)
  }
}

usePrettierStore.subscribe(prettierSelectors.options, onChangeOptions, {
  fireImmediately: true,
})

const BLANK_LINE_REGEXP = /^\s*[\r\n]/gm

function stripComments(code: string) {
  let comment: { start: number; end: number } | null = null
  while ((comment = findComment(code)) !== null) {
    code = code.substr(0, comment.start) + code.substr(comment.end + 1)
  }
  return code.replace(BLANK_LINE_REGEXP, "")
}

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
