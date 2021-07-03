type Definition = {
  title: string
  code: string
}

function getBracketIndices(text: string): { open: number; close: number } {
  let i = 0
  let x: string
  let open: number | undefined = undefined
  let close: number | undefined = undefined
  let numberOpen = 0
  while (close === undefined && i < text.length) {
    x = text[i]
    if (x === "/" && text[i + 1] === "/") {
      i = text.indexOf("\n", i)
    } else if (x === "/" && text[i + 1] === "*") {
      i = text.indexOf("*/", i)
    } else if (x === '"' || x === "'") {
      i = text.indexOf(x, i + 1)
    } else if (x === "{") {
      if (open === undefined) {
        open = i
      }
      numberOpen++
    } else if (x === "}") {
      numberOpen--
      if (numberOpen === 0) {
        close = i
      }
    }
    i++
  }
  if (open === undefined || close === undefined) {
    throw new Error("could not find open/close")
  }
  return { open, close }
}

function backtrackToStartOfDocstring(text: string, index: number) {
  if (index < 5 || text.substring(index - 3, index - 1) !== "*/") {
    return index
  }
  return text.lastIndexOf("/*", index)
}

export class TsFileParser implements Iterator<Definition> {
  private source: string

  constructor(source: string) {
    this.source = source
  }

  next() {
    const declarationRegExp =
      /^export\s+(?<keyword>(interface|type))\s+(?<title>\w+)/gm
    const declaration = declarationRegExp.exec(this.source)
    if (declaration === null) {
      return { done: true as true, value: undefined }
    }
    const { keyword, title } = declaration.groups!
    let endOfCode: number
    if (keyword === "type") {
      const nextDeclaration = declarationRegExp.exec(this.source)
      endOfCode = nextDeclaration
        ? backtrackToStartOfDocstring(this.source, nextDeclaration.index)
        : this.source.length
    } else {
      endOfCode = getBracketIndices(this.source).close + 1
    }
    const code = this.source
      .slice(
        backtrackToStartOfDocstring(this.source, declaration.index),
        endOfCode
      )
      .trim()
    this.source = this.source.slice(endOfCode)
    return { value: { title, code } }
  }
}
