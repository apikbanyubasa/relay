import type { Response } from 'express';

export interface ApiResponseMeta {
  page?: number;
  rows?: number;
  total?: number;
  totalRows?: number;
  totalRecords?: number;
  totalPages?: number;
  hasNext?: boolean;
  hasPrev?: boolean;
  [key: string]: any;
}

export function buildPaginationMeta(
  page: number,
  rows: number,
  total: number,
): ApiResponseMeta {
  const totalPages = Math.max(1, Math.ceil(total / rows));
  return {
    page,
    rows,
    total,
    totalRows: total,
    totalRecords: total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

export type ValidStatusCode =
  | 200
  | 201
  | 400
  | 401
  | 403
  | 404
  | 409
  | 422
  | 500;

export function sendSuccess<T>(
  res: Response,
  data: T,
  meta?: ApiResponseMeta,
  status: ValidStatusCode = 200,
) {
  return res.status(status).json({
    success: true,
    data,
    ...(meta ? { meta } : {}),
  });
}

export function sendError(
  res: Response,
  code: string,
  message: string,
  details: any[] = [],
  status: ValidStatusCode = 400,
) {
  return res.status(status).json({
    success: false,
    error: {
      code,
      message,
      details,
    },
  });
}
