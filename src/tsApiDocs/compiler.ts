import {
  compile as compileJsonSchemaToTs,
  Options as JsonSchemaToTsOptions,
  JSONSchema,
} from "json-schema-to-typescript"
import { deburr, upperFirst, trim } from "lodash"
import { OpenAPI, OpenAPIV2, OpenAPIV3 } from "openapi-types"
import SwaggerParser from "@apidevtools/swagger-parser"
import { TsModel, TsEndpoint, TsApiDocs, EntityMap } from "src/tsApiDocs/models"
import { TsFileParser } from "src/tsApiDocs/parser"

type SchemaObject = OpenAPIV3.SchemaObject | OpenAPIV2.SchemaObject
type ReferenceObject = OpenAPIV3.ReferenceObject | OpenAPIV2.ReferenceObject
type OperationObject = OpenAPIV3.OperationObject | OpenAPIV2.OperationObject

type NamedSchemaObject = SchemaObject & {
  title: NonNullable<SchemaObject["title"]>
}

function schemaId(s: NamedSchemaObject) {
  return s.title.toLowerCase()
}

class SchemaNormalizer {
  schemas: Set<NamedSchemaObject>
  endpoints: EntityMap<TsEndpoint>
  usedTitles: Set<string>

  constructor() {
    this.schemas = new Set<NamedSchemaObject>()
    this.endpoints = {}
    this.usedTitles = new Set<string>()
  }

  extractEndpointsAndSchemas(apiDoc: OpenAPI.Document): {
    schemas: Set<NamedSchemaObject>
    endpoints: EntityMap<TsEndpoint>
  } {
    this._processComponents(apiDoc)
    this._processDefinitions(apiDoc)
    this._processPaths(apiDoc)
    this._deleteNestedTitles()
    for (const s of Array.from(this.schemas)) {
      replaceNestedSchemasWithRefs(s, this.schemas)
    }
    return { schemas: this.schemas, endpoints: this.endpoints }
  }

  _processComponents(apiDoc: OpenAPI.Document) {
    if (!isOpenAPIV3Document(apiDoc) || !apiDoc.components) {
      return
    }
    for (const [name, s] of definedEntries(apiDoc.components.schemas)) {
      this._normalize(s, { title: name })
    }
    for (const [name, response] of definedEntries(
      apiDoc.components.responses
    )) {
      this._normalize(getContentSchema(response.content), { title: name })
    }
    for (const [name, requestBody] of definedEntries(
      apiDoc.components.requestBodies
    )) {
      this._normalize(getContentSchema(requestBody.content), { title: name })
    }
  }

  _processDefinitions(apiDoc: OpenAPI.Document) {
    if (isOpenAPIV3Document(apiDoc) || !apiDoc.definitions) {
      return
    }
    for (const [name, s] of definedEntries(apiDoc.definitions)) {
      this._normalize(s, { title: name })
    }
  }

  _processPaths(apiDoc: OpenAPI.Document) {
    for (const path in apiDoc.paths) {
      const pathSchema = apiDoc.paths[path]
      if (!isDefined(pathSchema)) {
        continue
      }
      for (const method of Object.keys(pathSchema).filter(isHttpMethod)) {
        const operation = pathSchema[method]
        if (!isDefined(operation)) {
          continue
        }
        const requestSchema = getRequestSchema(operation)
        const responseSchemas = getResponseSchemas(operation)
        this._normalize(requestSchema, { title: `${path}_RequestBody` })
        for (const [statusCode, s] of Object.entries(responseSchemas)) {
          this._normalize(s, { title: `$${path}_${statusCode}_ResponseBody` })
        }
        const endpointId = `${path}::${method}`.toLowerCase()
        this.endpoints[endpointId] = {
          id: endpointId,
          title: path,
          path,
          method,
          requestModel: isDefined(requestSchema)
            ? schemaId(requestSchema as NamedSchemaObject)
            : undefined,
          responseModels: Object.fromEntries(
            Object.entries(responseSchemas).map(([statusCode, s]) => [
              statusCode,
              schemaId(s as NamedSchemaObject),
            ])
          ),
        }
      }
    }
  }

  _normalize(
    schema: SchemaObject | ReferenceObject | undefined,
    overrides: { title: string; description?: string }
  ) {
    if (isDefined(schema) && !this._isNormalized(schema)) {
      const { title, description } = overrides
      schema.title = this._toSafeTitle(title)
      if (description !== undefined) {
        schema.description = description
      }
      this.schemas.add(schema as NamedSchemaObject)
    }
  }

  _isNormalized(schema: SchemaObject): boolean {
    return this.schemas.has(schema as NamedSchemaObject)
  }

  _toSafeTitle(value: string): string {
    let title = toSafeTsIdentifier(value)
    if (title.startsWith("$")) {
      title = title.slice(1)
    }
    if (!title) {
      title = "NoTitle"
    }
    if (this.usedTitles.has(title)) {
      let counter = 1
      while (this.usedTitles.has(`${title}${counter}`)) {
        counter++
      }
      title = `${title}${counter}`
    }
    this.usedTitles.add(title)
    return title
  }

  /**
   * Removes the titles from the nested schemas, since keeping them results
   * in a distinct type definition for each prop (which can be a LOT of noise).
   */
  _deleteNestedTitles(): void {
    const topLevelSchemas = this.schemas
    const nestedSchemas = Array.from(topLevelSchemas)
      .flatMap((s) => Array.from(getSchemaDependencies(s)))
      .filter((s) => !topLevelSchemas.has(s as NamedSchemaObject))
    for (const s of nestedSchemas) {
      if ("title" in s) {
        delete s.title
      }
    }
  }
}

/**
 * Copied from json-schema-to-typescript src/utils, where it is named "toSafeString".
 * Converts a string that might contain spaces or special characters to one that
 * can safely be used as a TypeScript interface or enum name.
 */
function toSafeTsIdentifier(string: string) {
  // identifiers in javaScript/ts:
  // First character: a-zA-Z | _ | $
  // Rest: a-zA-Z | _ | $ | 0-9

  return upperFirst(
    // remove accents, umlauts, ... by their basic latin letters
    deburr(string)
      // replace chars which are not valid for typescript identifiers with whitespace
      .replace(/(^\s*[^a-zA-Z_$])|([^a-zA-Z_$\d])/g, " ")
      // uppercase leading underscores followed by lowercase
      .replace(/^_[a-z]/g, (match) => match.toUpperCase())
      // remove non-leading underscores followed by lowercase (convert snake_case)
      .replace(/_[a-z]/g, (match) =>
        match.substr(1, match.length).toUpperCase()
      )
      // uppercase letters after digits, dollars
      .replace(/([\d$]+[a-zA-Z])/g, (match) => match.toUpperCase())
      // uppercase first letter after whitespace
      .replace(/\s+([a-zA-Z])/g, (match) => trim(match.toUpperCase()))
      // remove remaining whitespace
      .replace(/\s/g, "")
  )
}

/**
 * Identity functions
 */

function isOpenAPIV3Document(v: any): v is OpenAPIV3.Document {
  return "openapi" in v
}

function isNamedSchema(
  s: SchemaObject | NamedSchemaObject
): s is NamedSchemaObject {
  return Boolean(s.title)
}

function isDefined<T extends object>(
  v: T | undefined | ReferenceObject
): v is T {
  return v !== undefined && !("$ref" in v)
}

type Entry<T> = [string, T]

function entryIsDefined<T extends object>(
  v: Entry<T | undefined | ReferenceObject>
): v is Entry<T> {
  return isDefined(v[1])
}

function definedEntries<T extends object>(
  v: Record<string, T | undefined | ReferenceObject> | undefined
): Entry<T>[] {
  if (!v) {
    return []
  }
  return Object.entries(v).filter(entryIsDefined)
}

function isHttpMethod(v: any): v is OpenAPIV2.HttpMethods {
  return Object.values(OpenAPIV2.HttpMethods).includes(v)
}

function isBodyParameterObject(v: any): v is OpenAPIV2.InBodyParameterObject {
  return isDefined(v) && v.in === "body" && isDefined(v.schema)
}

/**
 * Gets the schema object from a request or response content definition.
 * Usually this will be `content['application/json'].schema`, but this
 * the media type might not be 'application/json' if it's vendor-specific.
 * So instead, we will just return the first valid schema that we find.
 */
function getContentSchema(
  content: { [media: string]: OpenAPIV3.MediaTypeObject } | undefined
): SchemaObject | undefined {
  for (const mediaType of Object.values(content ?? {})) {
    if (isDefined(mediaType.schema)) {
      return mediaType.schema
    }
  }
}

/**
 * Gets the schema object associated with a request body.
 */
function getRequestSchema(
  operation: OperationObject
): SchemaObject | undefined {
  // V3 way
  if ("requestBody" in operation) {
    if (!isDefined(operation.requestBody)) {
      return undefined
    }
    const schema = getContentSchema(operation.requestBody?.content)
    return isDefined(schema) ? schema : undefined
  }
  // V2 way
  for (const parameter of operation.parameters ?? []) {
    if (isBodyParameterObject(parameter)) {
      return parameter.schema
    }
  }
}

/**
 * Gets the schema objects associated with http responses.
 * Returns them as a map of {[statusCode]: schema}
 */
function getResponseSchemas(
  operation: OperationObject
): Record<string, SchemaObject> {
  const responseSchemas: Record<string, SchemaObject> = {}
  for (const statusCode in operation.responses) {
    const response = operation.responses[statusCode]
    if (isDefined(response)) {
      const schema =
        "content" in response
          ? getContentSchema(response.content)
          : "schema" in response
          ? response.schema
          : undefined
      if (isDefined(schema)) {
        responseSchemas[statusCode] = schema
      }
    }
  }
  return responseSchemas
}

/**
 * Deeply get all schema objects (self, children, etc.) referenced by a schema.
 */
function getSchemaDependencies(schema: SchemaObject): Set<SchemaObject> {
  const dependencies = new Set<SchemaObject>()
  const toCheck = [schema]
  while (toCheck.length > 0) {
    const s = toCheck.pop()
    if (!s || dependencies.has(s)) {
      continue
    }
    dependencies.add(s)
    if (s.properties) {
      toCheck.push(...Object.values(s.properties).filter(isDefined))
    }
    if (s.type === "array" && isDefined(s.items)) {
      toCheck.push(s.items)
    }
    if (
      typeof s.additionalProperties === "object" &&
      isDefined(s.additionalProperties)
    ) {
      // @ts-ignore: For V2, properties typed as IJsonSchema should actually be SchemaObject: https://swagger.io/specification/v2/
      toCheck.push(s.additionalProperties)
    }
    for (const p of ["allOf", "anyOf", "oneOf"] as const) {
      if (Array.isArray(s[p])) {
        // @ts-ignore: For V2, properties typed as IJsonSchema should actually be SchemaObject: https://swagger.io/specification/v2/
        toCheck.push(...s[p])
      }
    }
  }
  return dependencies
}

/**
 * Mutates schemas in-place, converting the nested schema objects to $refs.
 * This is necessary before generating typescript definitions because the
 * circular references will only work if they're in the $ref form.
 */
function replaceNestedSchemasWithRefs<T>(
  obj: T,
  schemas: Set<NamedSchemaObject>
): void {
  if (typeof obj === "object" && obj !== null) {
    for (const [k, v] of Object.entries(obj)) {
      if (schemas.has(v)) {
        Object.assign(obj, {
          [k]: { $ref: `#/definitions/${v.title.toLowerCase()}` },
        })
      } else {
        replaceNestedSchemasWithRefs(v, schemas)
      }
    }
  }
}

/**
 * Parses an OpenAPI schema and returns a record mapping component names
 * to the corresponding typescript interface definitions.
 */
async function getTsModels(
  schemas: Set<NamedSchemaObject>
): Promise<EntityMap<TsModel>> {
  const definitions = Object.fromEntries(
    Array.from(schemas).map((s) => [schemaId(s), s])
  )
  const masterSchema: JSONSchema = {
    title: "_toplevelobject_",
    type: "object",
    // @ts-ignore: For V2, properties typed as IJsonSchema should actually be SchemaObject: https://swagger.io/specification/v2/
    definitions,
    // @ts-ignore: For V2, properties typed as IJsonSchema should actually be SchemaObject: https://swagger.io/specification/v2/
    properties: definitions,
    additionalProperties: false,
  }
  const options: Partial<JsonSchemaToTsOptions> = {
    declareExternallyReferenced: true,
    enableConstEnums: true,
    unreachableDefinitions: false,
    strictIndexSignatures: false,
    format: false,
    ignoreMinAndMaxItems: true, // because of https://github.com/bcherny/json-schema-to-typescript/issues/372
  }
  const ts = await compileJsonSchemaToTs(masterSchema, "", options)
  return extractTsModels(
    ts,
    definitions,
    new Set<NamedSchemaObject>(),
    new Set([masterSchema.title!])
  )
}

/**
 * Parses the results of json-schema-to-typescript into a <name, definition> map.
 */
function extractTsModels(
  source: string,
  schemaMap: Record<string, NamedSchemaObject>,
  anonymousSchemas: Set<NamedSchemaObject>,
  excludedIds: Set<Lowercase<string>>
): EntityMap<TsModel> {
  const models: EntityMap<TsModel> = {}
  const parser = new TsFileParser(source)
  const anonymousIds = new Set(Array.from(anonymousSchemas).map((s) => s.title))
  const titleRegExp =
    /^(?<prefix>\s*export\s+(interface|type)\s+)(?<title>\w+)(?<suffix>\s+)/m
  let match = parser.next()
  while (!match.done) {
    let { code, title } = match.value!
    const id = title.toLowerCase()
    if (!excludedIds.has(id)) {
      const autoGenerated = anonymousIds.has(id)
      if (autoGenerated) {
        code = code.replace(titleRegExp, "$<prefix>_$<suffix>")
      }
      if (!code.endsWith("\n")) {
        code += "\n"
      }
      models[id] = {
        id,
        title,
        code,
        autoGenerated,
        dependencies: Array.from(getSchemaDependencies(schemaMap[id]!))
          .filter(isNamedSchema)
          .map(schemaId),
      }
    }
    match = parser.next()
  }
  return models
}

/**
 * Given an OpenAPIV3 document or the URL at which one resides, this will parse
 * that document and produce typescript definitions for each endpoint.
 */
export async function parseOpenAPI(
  api: string | OpenAPIV3.Document | OpenAPIV2.Document
): Promise<TsApiDocs> {
  const apiDoc = await SwaggerParser.dereference(api)
  const normalizer = new SchemaNormalizer()
  const { schemas, endpoints } = normalizer.extractEndpointsAndSchemas(apiDoc)
  const models = await getTsModels(schemas)
  return { models, endpoints }
}
