import { OpenAPIV3 } from "openapi-types"

export type ComponentSchemas = Record<string, OpenAPIV3.SchemaObject>

export type HttpMethod = OpenAPIV3.HttpMethods

export interface Entity {
  id: Lowercase<string>
  title: string
}

export interface EntityMap<T extends Entity> {
  [id: string]: T | undefined
}

export interface Collection<T extends Entity> {
  ids: string[]
  entities: EntityMap<T>
}

export interface TsModel extends Entity {
  code: string
  autoGenerated: boolean
  dependencies: string[]
}

export interface TsEndpoint extends Entity {
  path: string
  method: HttpMethod
  requestModel: TsModel["id"] | undefined
  responseModels: Record<string, TsModel["id"]>
}

export interface TsApiDocs {
  models: EntityMap<TsModel>
  endpoints: EntityMap<TsEndpoint>
}

export interface TsDocs {
  models: Collection<TsModel>
  endpoints: Collection<TsEndpoint>
}