/** Error shape `ApiError` serializes to via `toBody()`. */
export interface ApiErrorBody {
  message: string;
  code: string;
  /** Field-level messages, keyed by field name. Present on validation failures. */
  fields?: Record<string, string[]>;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}
