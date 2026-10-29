export interface PrismaQueryOptions {
  where: Record<string, any>;
  orderBy?: any;
  take: number;
  skip: number;
  include?: Record<string, any>;
  select?: Record<string, any>;
}

function buildNestedOrderBy(orderKey: string, orderRule: 'asc' | 'desc') {
  if (!orderKey.includes('.')) {
    return { [orderKey]: orderRule };
  }
  const parts = orderKey.split('.');
  const lastPart = parts.pop()!;
  let current: any = { [lastPart]: orderRule };
  for (let i = parts.length - 1; i >= 0; i--) {
    const part = parts[i]!;
    current = { [part]: current };
  }
  return current;
}

function buildNestedWhere(key: string, value: any): Record<string, any> {
  if (!key.includes('.')) {
    return { [key]: value };
  }
  const parts = key.split('.');
  const lastPart = parts.pop()!;
  let current: any = { [lastPart]: value };
  for (let i = parts.length - 1; i >= 0; i--) {
    const part = parts[i]!;
    current = { [part]: current };
  }
  return current;
}

function buildWhereQuery(filters: Record<string, any>): any[] {
  const whereConditions: any[] = [];
  for (const [key, value] of Object.entries(filters)) {
    if (value === null || value === undefined) continue;
    if (key.includes('.')) {
      if (Array.isArray(value)) {
        const orQueryArray = value.map((val) => buildNestedWhere(key, val));
        whereConditions.push({ OR: orQueryArray });
      } else {
        whereConditions.push(buildNestedWhere(key, value));
      }
      continue;
    }
    if (Array.isArray(value)) {
      const orQueryArray = value.map((val) => ({ [key]: val }));
      whereConditions.push({ OR: orQueryArray });
    } else {
      whereConditions.push({ [key]: value });
    }
  }
  return whereConditions;
}

function buildNestedSearch(
  key: string,
  value: any,
  searchMode = 'insensitive',
): any {
  if (!key.includes('.')) {
    if (Array.isArray(value)) {
      const orQueryArray = value.map((keyword) => ({
        [key]: { contains: keyword, mode: searchMode },
      }));
      return { OR: orQueryArray };
    }
    return { [key]: { contains: value, mode: searchMode } };
  }
  const parts = key.split('.');
  const lastPart = parts.pop()!;
  if (Array.isArray(value)) {
    const orQueryArray = value.map((keyword) => {
      let current: any = {
        [lastPart]: { contains: keyword, mode: searchMode },
      };
      for (let i = parts.length - 1; i >= 0; i--) {
        const part = parts[i]!;
        current = { [part]: current };
      }
      return current;
    });
    return { OR: orQueryArray };
  }
  let current: any = { [lastPart]: { contains: value, mode: searchMode } };
  for (let i = parts.length - 1; i >= 0; i--) {
    const part = parts[i]!;
    current = { [part]: current };
  }
  return current;
}

function buildSearchQuery(searchFilters: Record<string, any>): any[] {
  const whereConditions: any[] = [];
  const orQuerySearchArray: any[] = [];
  const isMultiKey = Object.values(searchFilters).length > 1;

  for (const [key, value] of Object.entries(searchFilters)) {
    if (value === null || value === undefined) continue;
    let searchQuery: any = {};
    const searchMode = 'insensitive';
    if (key.includes('.')) {
      searchQuery = buildNestedSearch(key, value, searchMode);
    } else {
      if (Array.isArray(value)) {
        const orQueryArray = value.map((keyword) => ({
          [key]: { contains: keyword, mode: searchMode },
        }));
        searchQuery = { OR: orQueryArray };
      } else {
        searchQuery = { [key]: { contains: value, mode: searchMode } };
      }
    }
    if (isMultiKey) {
      orQuerySearchArray.push(searchQuery);
    } else {
      whereConditions.push(searchQuery);
    }
  }

  if (isMultiKey && orQuerySearchArray.length > 0) {
    whereConditions.push({ OR: orQuerySearchArray });
  }

  return whereConditions;
}

function buildNestedRange(range: { key: string; start?: any; end?: any }): any {
  const parts = range.key.split('.');
  const lastPart = parts.pop()!;
  let current: any = { [lastPart]: { gte: range.start, lte: range.end } };
  for (let i = parts.length - 1; i >= 0; i--) {
    const part = parts[i]!;
    current = { [part]: current };
  }
  return current;
}

function buildRangedFilter(
  rangedFilters: Array<{ key: string; start?: any; end?: any }>,
): any[] {
  const whereConditions: any[] = [];
  for (const range of rangedFilters) {
    if (range.key.includes('.')) {
      whereConditions.push(buildNestedRange(range));
    } else {
      whereConditions.push({
        [range.key]: {
          gte: range.start,
          lte: range.end,
        },
      });
    }
  }
  return whereConditions;
}

export function buildFilterQuery(filter: {
  filters?: Record<string, any>;
  searchFilters?: Record<string, any>;
  rangedFilters?: Array<{ key: string; start?: any; end?: any }>;
  orderKey?: string;
  orderRule?: 'asc' | 'desc';
  page?: number;
  rows?: number;
}): PrismaQueryOptions {
  const query: PrismaQueryOptions = {
    where: {
      AND: [],
    },
    orderBy: {},
    take: 10,
    skip: 0,
  };

  if (filter.filters) {
    const whereConditions = buildWhereQuery(filter.filters);
    query.where.AND = [...query.where.AND, ...whereConditions];
  }

  if (filter.searchFilters) {
    const searchConditions = buildSearchQuery(filter.searchFilters);
    query.where.AND = [...query.where.AND, ...searchConditions];
  }

  if (filter.rangedFilters) {
    const rangeConditions = buildRangedFilter(filter.rangedFilters);
    query.where.AND = [...query.where.AND, ...rangeConditions];
  }

  if (filter.orderKey) {
    const orderRule = filter.orderRule ?? 'asc';
    query.orderBy = buildNestedOrderBy(filter.orderKey, orderRule);
  }

  let take = 10;
  let skip = 0;
  if (filter.page) {
    if (filter.rows) {
      skip = (filter.page - 1) * filter.rows;
      take = filter.rows;
    } else {
      skip = 10 * (filter.page - 1);
    }
  }
  query.take = take;
  query.skip = skip;

  return query;
}

export const MAX_ROWS = 100;
export const DEFAULT_ROWS = 10;
export const DEFAULT_PAGE = 1;
export const MAX_ADVANCED_GROUP_DEPTH = 4;
export const MAX_ADVANCED_CONDITIONS = 50;

export class QueryContractError extends Error {
  statusCode: number;
  code: string;
  details?: any[];

  constructor(
    code: string,
    message: string,
    statusCode = 400,
    details?: any[],
  ) {
    super(message);
    this.name = 'QueryContractError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export type ComparisonOperator =
  | 'eq'
  | 'ne'
  | 'in'
  | 'notIn'
  | 'contains'
  | 'startsWith'
  | 'endsWith'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'isNull'
  | 'isNotNull';

export interface FilterConditionInput {
  field: string;
  op: ComparisonOperator;
  value?: any;
}

export interface FilterGroupInput {
  operator: 'AND' | 'OR';
  conditions: Array<FilterConditionInput | FilterGroupInput>;
}

export interface RangedFilterEntry {
  key: string;
  start?: any;
  end?: any;
  exclusive?: { start?: boolean; end?: boolean };
}

export interface ParsedQueryParams {
  filters?: Record<string, any>;
  searchFilters?: Record<string, any>;
  rangedFilters?: RangedFilterEntry[];
  advancedFilters?: FilterGroupInput;
  page?: number;
  rows?: number;
  orderKey?: string;
  orderRule?: 'asc' | 'desc';
  includeDeleted?: boolean;
}

/**
 * Whitelist of textual fields allowed for substring/contains search (prevents PostgreSQL type crashes on Enum/Int/Date)
 */
export const ALLOWED_SEARCH_FIELDS = new Set([
  'title',
  'description',
  'name',
  'email',
  'changed_column',
  'old_value',
  'new_value',
  'assignee.name',
  'project.name',
  'user.name',
]);

/**
 * Whitelist of columns permitted for ORDER BY sorting (prevents identifier injection)
 */
export const ALLOWED_ORDER_FIELDS = new Set([
  'id',
  'title',
  'status',
  'department',
  'version',
  'created_at',
  'updated_at',
  'due_date',
  'name',
  'email',
  'role',
  'occurred_at',
]);

/**
 * Depth assertion for advancedFilters AST tree (GAP-20)
 */
export function assertMaxDepth(
  group: FilterGroupInput,
  maxDepth = MAX_ADVANCED_GROUP_DEPTH,
  currentDepth = 1,
): void {
  if (currentDepth > maxDepth) {
    throw new QueryContractError(
      'ADVANCED_FILTER_TOO_DEEP',
      `advancedFilters nesting exceeds the maximum allowed depth of ${maxDepth}.`,
      400,
    );
  }
  for (const c of group.conditions || []) {
    if ('operator' in c && Array.isArray((c as any).conditions)) {
      assertMaxDepth(c as FilterGroupInput, maxDepth, currentDepth + 1);
    }
  }
}

function applyScalarOp(
  op: ComparisonOperator,
  value: any,
): Record<string, any> {
  switch (op) {
    case 'eq':
      return { equals: value };
    case 'ne':
      return { not: value };
    case 'in':
      return { in: Array.isArray(value) ? value : [value] };
    case 'notIn':
      return { notIn: Array.isArray(value) ? value : [value] };
    case 'gt':
      return { gt: value };
    case 'gte':
      return { gte: value };
    case 'lt':
      return { lt: value };
    case 'lte':
      return { lte: value };
    case 'contains':
      return { contains: value, mode: 'insensitive' };
    case 'startsWith':
      return { startsWith: value, mode: 'insensitive' };
    case 'endsWith':
      return { endsWith: value, mode: 'insensitive' };
    case 'isNull':
      return { equals: null };
    case 'isNotNull':
      return { not: null };
    default:
      return { equals: value };
  }
}

/**
 * Evaluates an advancedFilters group into Prisma Where Input recursively
 */
export function evaluateFilterGroup(group: FilterGroupInput): any {
  if (
    !group ||
    !Array.isArray(group.conditions) ||
    group.conditions.length === 0
  ) {
    return {};
  }
  assertMaxDepth(group);

  const parts = group.conditions.map((c) => {
    if ('operator' in c && Array.isArray((c as any).conditions)) {
      return evaluateFilterGroup(c as FilterGroupInput);
    }
    const cond = c as FilterConditionInput;
    return { [cond.field]: applyScalarOp(cond.op, cond.value) };
  });

  return group.operator === 'OR' ? { OR: parts } : { AND: parts };
}

/**
 * Safely parse query string parameters into FilteringQuery object according to v2 Contract
 */
export function parseQueryContract(
  rawQuery: Record<string, string | undefined>,
): ParsedQueryParams {
  const query: ParsedQueryParams = {};

  // 1. filters parsing
  if (rawQuery.filters) {
    try {
      const parsed =
        typeof rawQuery.filters === 'string'
          ? JSON.parse(rawQuery.filters)
          : rawQuery.filters;
      if (
        typeof parsed === 'object' &&
        parsed !== null &&
        !Array.isArray(parsed)
      ) {
        query.filters = parsed;
      }
    } catch {
      throw new QueryContractError(
        'MALFORMED_QUERY_JSON',
        'Query parameter "filters" is not valid JSON.',
        400,
      );
    }
  }

  // 2. searchFilters parsing
  if (rawQuery.searchFilters) {
    try {
      const parsed =
        typeof rawQuery.searchFilters === 'string'
          ? JSON.parse(rawQuery.searchFilters)
          : rawQuery.searchFilters;
      if (
        typeof parsed === 'object' &&
        parsed !== null &&
        !Array.isArray(parsed)
      ) {
        const sanitized: Record<string, any> = {};
        for (const [key, val] of Object.entries(parsed)) {
          if (
            ALLOWED_SEARCH_FIELDS.has(key) &&
            typeof val === 'string' &&
            val.trim().length > 0
          ) {
            sanitized[key] = val.trim();
          }
        }
        if (Object.keys(sanitized).length > 0) {
          query.searchFilters = sanitized;
        }
      }
    } catch {
      throw new QueryContractError(
        'MALFORMED_QUERY_JSON',
        'Query parameter "searchFilters" is not valid JSON.',
        400,
      );
    }
  }

  // 3. rangedFilters parsing & validation (supports open-ended, boundary check start <= end, exclusive)
  if (rawQuery.rangedFilters) {
    try {
      const parsed =
        typeof rawQuery.rangedFilters === 'string'
          ? JSON.parse(rawQuery.rangedFilters)
          : rawQuery.rangedFilters;
      if (Array.isArray(parsed)) {
        const validEntries: RangedFilterEntry[] = [];
        for (const r of parsed) {
          if (
            r &&
            typeof r.key === 'string' &&
            (r.start !== undefined || r.end !== undefined)
          ) {
            // Validate boundary order if both start and end exist
            if (r.start !== undefined && r.end !== undefined) {
              const startNum =
                typeof r.start === 'string' &&
                !Number.isNaN(Date.parse(r.start))
                  ? new Date(r.start).getTime()
                  : Number(r.start);
              const endNum =
                typeof r.end === 'string' && !Number.isNaN(Date.parse(r.end))
                  ? new Date(r.end).getTime()
                  : Number(r.end);
              if (
                !Number.isNaN(startNum) &&
                !Number.isNaN(endNum) &&
                startNum > endNum
              ) {
                throw new QueryContractError(
                  'INVALID_RANGE_ORDER',
                  `rangedFilters.start (${r.start}) must not be greater than rangedFilters.end (${r.end}) for field "${r.key}".`,
                  400,
                );
              }
            }
            validEntries.push({
              key: r.key,
              start: r.start,
              end: r.end,
              exclusive: r.exclusive,
            });
          }
        }
        query.rangedFilters = validEntries;
      }
    } catch (err: any) {
      if (err instanceof QueryContractError) throw err;
      throw new QueryContractError(
        'MALFORMED_QUERY_JSON',
        'Query parameter "rangedFilters" is not valid JSON.',
        400,
      );
    }
  }

  // 4. advancedFilters parsing (AST Tree)
  if (rawQuery.advancedFilters) {
    try {
      const parsed =
        typeof rawQuery.advancedFilters === 'string'
          ? JSON.parse(rawQuery.advancedFilters)
          : rawQuery.advancedFilters;
      if (
        typeof parsed === 'object' &&
        parsed !== null &&
        Array.isArray((parsed as any).conditions)
      ) {
        assertMaxDepth(parsed as FilterGroupInput);
        query.advancedFilters = parsed as FilterGroupInput;
      }
    } catch (err: any) {
      if (err instanceof QueryContractError) throw err;
      throw new QueryContractError(
        'MALFORMED_QUERY_JSON',
        'Query parameter "advancedFilters" is not valid JSON.',
        400,
      );
    }
  }

  // 5. Pagination & Clamping (MAX_ROWS = 100)
  if (rawQuery.page) {
    const pageNum = parseInt(rawQuery.page, 10);
    query.page = !Number.isNaN(pageNum) && pageNum > 0 ? pageNum : DEFAULT_PAGE;
  } else {
    query.page = DEFAULT_PAGE;
  }

  if (rawQuery.rows) {
    const rowsNum = parseInt(rawQuery.rows, 10);
    query.rows =
      !Number.isNaN(rowsNum) && rowsNum > 0
        ? Math.min(rowsNum, MAX_ROWS)
        : DEFAULT_ROWS;
  } else {
    query.rows = DEFAULT_ROWS;
  }

  // 6. orderKey whitelist check (GAP-05)
  if (rawQuery.orderKey) {
    if (!ALLOWED_ORDER_FIELDS.has(rawQuery.orderKey)) {
      throw new QueryContractError(
        'FORBIDDEN_FIELD',
        `The field "${rawQuery.orderKey}" cannot be used for sorting.`,
        403,
      );
    }
    query.orderKey = rawQuery.orderKey;
  }

  if (
    rawQuery.orderRule &&
    (rawQuery.orderRule === 'asc' || rawQuery.orderRule === 'desc')
  ) {
    query.orderRule = rawQuery.orderRule;
  }

  // 7. includeDeleted
  if (rawQuery.includeDeleted !== undefined) {
    query.includeDeleted =
      rawQuery.includeDeleted === 'true' || rawQuery.includeDeleted === '1';
  }

  return query;
}

export interface BuildPrismaQueryOptions {
  userRole?: string;
  includeDeleted?: boolean;
}

/**
 * Build Prisma query options combining ezfilter with additional conditions,
 * virtual fields (isBlocked), rangedFilters with exclusive boundaries, and advancedFilters.
 */
export function buildPrismaQuery(
  rawQuery: Record<string, string | undefined>,
  additionalWhere: Record<string, any> = {},
  options?: BuildPrismaQueryOptions,
): PrismaQueryOptions {
  const parsed = parseQueryContract(rawQuery);

  // Extract virtual filters (like isBlocked) before passing to ezfilter engine
  let virtualIsBlocked: boolean | undefined;
  const legacyFilters = parsed.filters ? { ...parsed.filters } : undefined;

  if (legacyFilters && legacyFilters.isBlocked !== undefined) {
    virtualIsBlocked =
      legacyFilters.isBlocked === true || legacyFilters.isBlocked === 'true';
    delete legacyFilters.isBlocked;
  }

  // Build standard ezfilter query
  const built = buildFilterQuery({
    filters: legacyFilters,
    searchFilters: parsed.searchFilters,
    // We handle custom/open-ended rangedFilters directly below for exact operator matching
    page: parsed.page,
    rows: parsed.rows,
    orderKey: parsed.orderKey,
    orderRule: parsed.orderRule,
  });

  const whereConditions: any[] = [];

  // Soft delete filter: enforce deleted_at null unless requester is PM and requested includeDeleted
  const allowDeleted =
    options?.includeDeleted === true && options?.userRole === 'PRODUCT_MANAGER';
  if (!allowDeleted) {
    whereConditions.push({ deleted_at: null });
  }

  // Base built where clauses
  if (built.where?.AND) {
    whereConditions.push(
      ...(Array.isArray(built.where.AND) ? built.where.AND : [built.where.AND]),
    );
  } else if (built.where && Object.keys(built.where).length > 0) {
    whereConditions.push(built.where);
  }

  // Virtual isBlocked filter (GAP-10)
  if (virtualIsBlocked !== undefined) {
    whereConditions.push(
      virtualIsBlocked
        ? {
            dependencies: {
              some: {
                prerequisite: { status: { not: 'DONE' } },
                deleted_at: null,
              },
            },
          }
        : {
            dependencies: {
              none: {
                prerequisite: { status: { not: 'DONE' } },
                deleted_at: null,
              },
            },
          },
    );
  }

  // Custom rangedFilters with open-ended and exclusive bounds (GAP-09)
  if (parsed.rangedFilters && parsed.rangedFilters.length > 0) {
    for (const r of parsed.rangedFilters) {
      const fieldClause: Record<string, any> = {};
      if (r.start !== undefined) {
        const startVal =
          typeof r.start === 'string' && !Number.isNaN(Date.parse(r.start))
            ? new Date(r.start)
            : r.start;
        fieldClause[r.exclusive?.start ? 'gt' : 'gte'] = startVal;
      }
      if (r.end !== undefined) {
        const endVal =
          typeof r.end === 'string' && !Number.isNaN(Date.parse(r.end))
            ? new Date(r.end)
            : r.end;
        fieldClause[r.exclusive?.end ? 'lt' : 'lte'] = endVal;
      }
      whereConditions.push({ [r.key]: fieldClause });
    }
  }

  // Advanced AST filters (GAP-07)
  if (parsed.advancedFilters) {
    const advancedWhere = evaluateFilterGroup(parsed.advancedFilters);
    if (Object.keys(advancedWhere).length > 0) {
      whereConditions.push(advancedWhere);
    }
  }

  // Role-enforced base scope / additionalWhere (GAP-16)
  if (Object.keys(additionalWhere).length > 0) {
    whereConditions.push(additionalWhere);
  }

  const effectiveRows = Math.min(parsed.rows || DEFAULT_ROWS, MAX_ROWS);
  const effectivePage = parsed.page || DEFAULT_PAGE;

  return {
    ...built,
    where: {
      AND: whereConditions,
    },
    take: effectiveRows,
    skip: (effectivePage - 1) * effectiveRows,
    orderBy: built.orderBy || { created_at: 'desc' },
  };
}
