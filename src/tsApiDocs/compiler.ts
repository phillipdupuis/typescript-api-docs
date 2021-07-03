import {
  compile as compileJsonSchemaToTs,
  Options as JsonSchemaToTsOptions,
  JSONSchema,
} from "json-schema-to-typescript"
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

/**
 * Utility functions
 */

function asNamedSchema(
  s: SchemaObject | NamedSchemaObject,
  name: string
): NamedSchemaObject {
  return Object.assign(s, { title: name })
}

function getSchemaId(s: NamedSchemaObject): Lowercase<string> {
  return s.title.toLowerCase()
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

function isHttpMethod(v: any): v is OpenAPIV2.HttpMethods {
  return Object.values(OpenAPIV2.HttpMethods).includes(v)
}

function isBodyParameterObject(v: any): v is OpenAPIV2.InBodyParameterObject {
  return isDefined(v) && v.in === "body" && isDefined(v.schema)
}

/**
 * Returns a set of the schemas which were explicitly named by the openapi schema.
 */
function getNamedSchemas(apiDoc: OpenAPI.Document): Set<NamedSchemaObject> {
  if (isOpenAPIV3Document(apiDoc)) {
    const namedSchemas = new Set<NamedSchemaObject>()
    const alreadyNamed = (s: SchemaObject) =>
      namedSchemas.has(s as NamedSchemaObject)
    // First, add the plain-old component/schemas definitions.
    Object.entries(apiDoc.components?.schemas ?? {})
      .filter(entryIsDefined)
      .forEach(([name, s]) => {
        namedSchemas.add(asNamedSchema(s, name))
      })
    // Next, the named response schemas
    Object.entries(apiDoc.components?.responses ?? {})
      .filter(entryIsDefined)
      .forEach(([responseName, response]) => {
        const s = getContentSchema(response.content)
        if (isDefined(s) && !alreadyNamed(s)) {
          namedSchemas.add(asNamedSchema(s, responseName))
        }
      })
    // Finally, the named request body schemas
    Object.entries(apiDoc.components?.requestBodies ?? {})
      .filter(entryIsDefined)
      .forEach(([requestBodyName, requestBody]) => {
        const s = getContentSchema(requestBody.content)
        if (isDefined(s) && !alreadyNamed(s)) {
          namedSchemas.add(asNamedSchema(s, requestBodyName))
        }
      })
    return namedSchemas
  } else {
    return new Set(
      Object.entries(apiDoc.definitions ?? {})
        .filter(entryIsDefined)
        .map(([name, s]) => asNamedSchema(s, name))
    )
  }
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
 * Finds and returns schemas which aren't explicitly named in
 * "components" or "definitions" but which are used to define
 * request or response bodies.
 */
function getAnonymousSchemas(
  apiDoc: OpenAPI.Document,
  namedSchemas: Set<NamedSchemaObject>
): Set<NamedSchemaObject> {
  const anonymousSchemas = new Set<SchemaObject>()
  for (const [path, pathSchema] of Object.entries(apiDoc.paths).filter(
    entryIsDefined
  )) {
    for (const method of Object.keys(pathSchema).filter(isHttpMethod)) {
      const operation = pathSchema[method]!
      // Request schema
      const requestSchema = getRequestSchema(operation)
      if (
        requestSchema &&
        !namedSchemas.has(requestSchema as NamedSchemaObject)
      ) {
        if (!requestSchema.description) {
          requestSchema.description = `Request body for ${method.toUpperCase()} ${path}`
        }
        anonymousSchemas.add(requestSchema)
      }
      // Response schemas
      for (const [statusCode, responseSchema] of Object.entries(
        getResponseSchemas(operation)
      )) {
        if (
          responseSchema &&
          !namedSchemas.has(responseSchema as NamedSchemaObject)
        ) {
          if (!responseSchema.description) {
            responseSchema.description = `${statusCode} response body for ${method.toUpperCase()} ${path}`
          }
          anonymousSchemas.add(responseSchema)
        }
      }
    }
  }
  return new Set(
    Array.from(anonymousSchemas.values()).map((s, i) =>
      asNamedSchema(s, `anonymous_${i}`)
    )
  )
}

/**
 * Tweaks schema objects (if needed) so the generated typescript definitions come out nicely.
 * Cleaning requires mutation, since the compiler requires that references not change.
 * Currently we just remove the titles from the nested schemas, since keeping
 * them results in a distinct type for each prop (which can be a LOT of noise).
 */
function cleanSchemas(topLevelSchemas: Set<SchemaObject>): void {
  const nestedSchemas = new Set(
    Array.from(topLevelSchemas)
      .flatMap((s) => Array.from(getSchemaDependencies(s)))
      .filter((s) => !topLevelSchemas.has(s))
  )
  for (const s of Array.from(nestedSchemas)) {
    if ("title" in s) {
      delete s.title
    }
  }
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
 * Parses an OpenAPI schema and returns a record mapping component names
 * to the corresponding typescript interface definitions.
 */
async function getTsModels(
  namedSchemas: Set<NamedSchemaObject>,
  anonymousSchemas: Set<NamedSchemaObject>
): Promise<EntityMap<TsModel>> {
  const schemaMap = Object.fromEntries(
    [...Array.from(namedSchemas), ...Array.from(anonymousSchemas)].map((s) => [
      getSchemaId(s),
      s,
    ])
  )
  const topLevelTitle = "_toplevelobject_"
  const jsonSchema: JSONSchema = {
    title: topLevelTitle,
    type: "object",
    // @ts-ignore: For V2, properties typed as IJsonSchema should actually be SchemaObject: https://swagger.io/specification/v2/
    properties: { ...schemaMap },
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
  const ts = await compileJsonSchemaToTs(jsonSchema, "", options)
  return extractTsModels(
    ts,
    schemaMap,
    anonymousSchemas,
    new Set([topLevelTitle])
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
  const anonymousIds = new Set(Array.from(anonymousSchemas).map(getSchemaId))
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
          .map(getSchemaId),
      }
    }
    match = parser.next()
  }
  return models
}

/**
 * Parses an OpenAPI schema and returns a record mapping endpoints to the
 * typescript interfaces which represent the request and response payloads.
 */
function getTsEndpoints(apiDoc: OpenAPI.Document): EntityMap<TsEndpoint> {
  const endpoints: EntityMap<TsEndpoint> = {}
  for (const path in apiDoc.paths) {
    const pathSchema = apiDoc.paths[path]!
    for (const method of Object.keys(pathSchema).filter(isHttpMethod)) {
      const id = `${path}::${method}`.toLowerCase()
      const operation = pathSchema[method]!
      const requestSchema = getRequestSchema(operation)
      const responseSchemas = getResponseSchemas(operation)
      endpoints[id] = {
        id,
        title: path,
        path,
        method,
        requestModel: requestSchema?.title?.toLowerCase(),
        responseModels: Object.fromEntries(
          Object.entries(responseSchemas).map(([statusCode, schema]) => [
            statusCode,
            schema.title!.toLowerCase(),
          ])
        ),
      }
    }
  }
  return endpoints
}

/**
 * Given an OpenAPIV3 document or the URL at which one resides, this will parse
 * that document and produce typescript definitions for each endpoint.
 */
export async function parseOpenAPI(
  api: string | OpenAPIV3.Document | OpenAPIV2.Document
): Promise<TsApiDocs> {
  const apiDoc = await SwaggerParser.dereference(api)
  const namedSchemas = getNamedSchemas(apiDoc)
  const anonymousSchemas = getAnonymousSchemas(apiDoc, namedSchemas)
  cleanSchemas(
    new Set([...Array.from(namedSchemas), ...Array.from(anonymousSchemas)])
  )
  const models = await getTsModels(namedSchemas, anonymousSchemas)
  console.log("mlodels", models)
  const endpoints = getTsEndpoints(apiDoc)
  return { models, endpoints }
}
