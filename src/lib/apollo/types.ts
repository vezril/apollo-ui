/** Shared shapes for the Apollo BFF and the browser client (mirror Apollo's REST JSON). */

export interface HealthStatus {
  status: string; // "UP" | "DOWN"
  service: string;
  version: string;
}

export interface BucketList {
  buckets: string[];
  nextPageToken: string;
}

/** One object row from the read model (GET /v1/buckets/{bucket}/objects). */
export interface ObjectEntry {
  object: string;
  generation: number;
  size: number;
  contentType: string;
  crc32c: string;
  md5: string;
}

export interface ObjectList {
  objects: ObjectEntry[];
  nextPageToken: string;
}

/** Object metadata from the X-Apollo-* headers of a GET/HEAD. */
export interface ObjectMeta {
  generation: number;
  size: number;
  crc32c: string;
  md5: string;
  contentType: string;
}

export interface ApiError {
  error: string;
  apolloStatus?: number;
}
