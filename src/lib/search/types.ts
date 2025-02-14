export interface SearchConfig {
  minQueryLength: number;
  maxResults: number;
  fuzzyThreshold: number;
  debounceTime: number;
  indexFields: string[];
}

export interface SearchIndex {
  id: string;
  type: string;
  content: string;
  metadata?: Record<string, any>;
  score?: number;
}

export interface SearchResult<T = any> {
  item: T;
  score: number;
  matches: Array<{
    field: string;
    value: string;
    indices: number[][];
  }>;
}

export interface SearchOptions {
  fields?: string[];
  boost?: Record<string, number>;
  fuzzy?: boolean | number;
  limit?: number;
  filter?: (item: any) => boolean;
}