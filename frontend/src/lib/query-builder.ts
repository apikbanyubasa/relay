import type { FilterGroupInput, RangedFilterEntry } from "../types";

export type TaskFilterKey =
  | "id"
  | "project_id"
  | "title"
  | "description"
  | "status"
  | "department"
  | "assignee_id"
  | "client_visible"
  | "due_date"
  | "created_at"
  | "isBlocked";

export interface ListQueryState<K extends string = string> {
  filters: Partial<Record<K, unknown>>;
  searchFilters: Partial<Record<K, unknown>>;
  rangedFilters: RangedFilterEntry[];
  advancedFilters?: FilterGroupInput;
  page: number;
  rows: number;
  orderKey?: K;
  orderRule?: "asc" | "desc";
  includeDeleted?: boolean;
}

/**
 * URLSearchParams performs percentage encoding on each parameter when .toString() is called,
 * guaranteeing safe URI transmission without breaking special JSON characters.
 */
export function serializeListQuery<K extends string = string>(
  state: Partial<ListQueryState<K>>,
): URLSearchParams {
  const params = new URLSearchParams();

  if (state.filters && Object.keys(state.filters).length > 0) {
    params.set("filters", JSON.stringify(state.filters));
  }
  if (state.searchFilters && Object.keys(state.searchFilters).length > 0) {
    params.set("searchFilters", JSON.stringify(state.searchFilters));
  }
  if (state.rangedFilters && state.rangedFilters.length > 0) {
    params.set("rangedFilters", JSON.stringify(state.rangedFilters));
  }
  if (state.advancedFilters) {
    params.set("advancedFilters", JSON.stringify(state.advancedFilters));
  }
  if (state.page) params.set("page", String(state.page));
  if (state.rows) params.set("rows", String(state.rows));
  if (state.orderKey) params.set("orderKey", state.orderKey);
  if (state.orderRule) params.set("orderRule", state.orderRule);
  if (state.includeDeleted) params.set("includeDeleted", "true");

  return params;
}

/**
 * Deterministic query key serializer for TanStack Query caching
 */
export function toStableQueryKey<K extends string = string>(
  state: Partial<ListQueryState<K>>,
): string {
  return serializeListQuery(state).toString();
}

/**
 * Fluent Typed Query Builder conforming to Contract v2 (GAP-19)
 */
export class TaskQueryBuilder {
  private state: ListQueryState<TaskFilterKey> = {
    filters: {},
    searchFilters: {},
    rangedFilters: [],
    page: 1,
    rows: 10,
    orderKey: "created_at",
    orderRule: "desc",
  };

  whereEquals(key: TaskFilterKey, value: unknown): this {
    this.state.filters[key] = value;
    return this;
  }

  whereContains(key: TaskFilterKey, term: string): this {
    if (term.trim()) {
      this.state.searchFilters[key] = term.trim();
    }
    return this;
  }

  whereBetween(
    key: TaskFilterKey,
    start?: string | number,
    end?: string | number,
    exclusiveEnd = false,
  ): this {
    if (start !== undefined || end !== undefined) {
      this.state.rangedFilters.push({
        key,
        start,
        end,
        exclusive: { end: exclusiveEnd },
      });
    }
    return this;
  }

  whereAdvanced(group: FilterGroupInput): this {
    this.state.advancedFilters = group;
    return this;
  }

  orderBy(key: TaskFilterKey, rule: "asc" | "desc" = "asc"): this {
    this.state.orderKey = key;
    this.state.orderRule = rule;
    return this;
  }

  paginate(page: number, rows = 10): this {
    this.state.page = page;
    this.state.rows = Math.min(rows, 100);
    return this;
  }

  includeDeleted(include = true): this {
    this.state.includeDeleted = include;
    return this;
  }

  build(): ListQueryState<TaskFilterKey> {
    return structuredClone(this.state);
  }
}
