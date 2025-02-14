import { errorService } from '../errors/service';
import type { SearchConfig, SearchIndex, SearchResult, SearchOptions } from './types';

class SearchService {
  private config: SearchConfig = {
    minQueryLength: 2,
    maxResults: 50,
    fuzzyThreshold: 0.2,
    debounceTime: 300,
    indexFields: ['title', 'content', 'description']
  };

  private indices: Map<string, SearchIndex[]> = new Map();
  private debounceTimers: Map<string, number> = new Map();

  configure(config: Partial<SearchConfig>) {
    this.config = { ...this.config, ...config };
  }

  addToIndex(type: string, items: any[], options: { fields?: string[] } = {}) {
    try {
      const indices = items.map(item => this.createIndex(item, type, options.fields));
      this.indices.set(type, [...(this.indices.get(type) || []), ...indices]);
    } catch (error) {
      errorService.handleError({
        name: 'SearchError',
        message: 'Failed to add items to search index',
        code: 'SEARCH_INDEX_ERROR',
        context: { type, error },
        timestamp: new Date().toISOString(),
        handled: true
      });
    }
  }

  private createIndex(item: any, type: string, fields?: string[]): SearchIndex {
    const indexFields = fields || this.config.indexFields;
    const content = indexFields
      .map(field => this.extractFieldValue(item, field))
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return {
      id: item.id || crypto.randomUUID(),
      type,
      content,
      metadata: item
    };
  }

  private extractFieldValue(obj: any, path: string): string {
    const value = path.split('.').reduce((acc, part) => acc?.[part], obj);
    if (Array.isArray(value)) {
      return value.map(v => String(v)).join(' ');
    }
    return value ? String(value) : '';
  }

  search<T>(type: string, query: string, options: SearchOptions = {}): SearchResult<T>[] {
    try {
      if (!query || query.length < this.config.minQueryLength) {
        return [];
      }

      const indices = this.indices.get(type) || [];
      const searchQuery = query.toLowerCase();
      
      // Apply filters
      let filteredIndices = indices;
      if (options.filter) {
        filteredIndices = indices.filter(index => options.filter!(index.metadata));
      }

      // Perform search
      const results = filteredIndices.map(index => {
        const score = this.calculateScore(index, searchQuery, options);
        const matches = this.findMatches(index, searchQuery);
        
        return {
          item: index.metadata as T,
          score,
          matches
        };
      });

      // Sort by score and limit results
      return results
        .filter(result => result.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, options.limit || this.config.maxResults);
    } catch (error) {
      errorService.handleError({
        name: 'SearchError',
        message: 'Search operation failed',
        code: 'SEARCH_OPERATION_ERROR',
        context: { type, query, error },
        timestamp: new Date().toISOString(),
        handled: true
      });
      return [];
    }
  }

  private calculateScore(index: SearchIndex, query: string, options: SearchOptions): number {
    let score = 0;
    const content = index.content;
    const fuzzyThreshold = options.fuzzy === true ? this.config.fuzzyThreshold :
                          typeof options.fuzzy === 'number' ? options.fuzzy :
                          0;

    // Exact match
    if (content.includes(query)) {
      score += 1;
    }

    // Word matches
    const words = query.split(/\s+/);
    words.forEach(word => {
      if (content.includes(word)) {
        score += 0.5;
      }
    });

    // Fuzzy matching
    if (fuzzyThreshold > 0) {
      words.forEach(word => {
        const fuzzyScore = this.calculateFuzzyScore(content, word, fuzzyThreshold);
        score += fuzzyScore * 0.3;
      });
    }

    // Apply field boost
    if (options.boost) {
      Object.entries(options.boost).forEach(([field, boost]) => {
        const fieldValue = this.extractFieldValue(index.metadata, field).toLowerCase();
        if (fieldValue.includes(query)) {
          score *= boost;
        }
      });
    }

    return score;
  }

  private calculateFuzzyScore(str: string, pattern: string, threshold: number): number {
    if (pattern.length === 0) return 0;
    if (str.length === 0) return 0;

    const row = Array(pattern.length + 1).fill(0);
    for (let i = 0; i <= pattern.length; i++) {
      row[i] = i;
    }

    let previousRow = row;
    let minDistance = pattern.length;

    for (let i = 0; i < str.length; i++) {
      const currentRow = [i + 1];
      
      for (let j = 0; j < pattern.length; j++) {
        const insertions = previousRow[j + 1] + 1;
        const deletions = currentRow[j] + 1;
        const substitutions = previousRow[j] + (str[i] !== pattern[j] ? 1 : 0);
        
        currentRow.push(Math.min(insertions, deletions, substitutions));
      }

      previousRow = currentRow;
      minDistance = Math.min(minDistance, currentRow[pattern.length]);
    }

    const maxDistance = Math.max(str.length, pattern.length);
    const score = 1 - (minDistance / maxDistance);
    return score >= threshold ? score : 0;
  }

  private findMatches(index: SearchIndex, query: string): Array<{
    field: string;
    value: string;
    indices: number[][];
  }> {
    const matches: Array<{ field: string; value: string; indices: number[][]; }> = [];
    const metadata = index.metadata;

    this.config.indexFields.forEach(field => {
      const value = this.extractFieldValue(metadata, field);
      if (!value) return;

      const indices: number[][] = [];
      let pos = value.toLowerCase().indexOf(query);
      while (pos !== -1) {
        indices.push([pos, pos + query.length]);
        pos = value.toLowerCase().indexOf(query, pos + 1);
      }

      if (indices.length > 0) {
        matches.push({ field, value, indices });
      }
    });

    return matches;
  }

  clearIndex(type?: string) {
    if (type) {
      this.indices.delete(type);
    } else {
      this.indices.clear();
    }
  }

  removeFromIndex(type: string, predicate: (item: any) => boolean) {
    const indices = this.indices.get(type);
    if (!indices) return;

    const filteredIndices = indices.filter(index => !predicate(index.metadata));
    this.indices.set(type, filteredIndices);
  }

  getIndexSize(type?: string): number {
    if (type) {
      return this.indices.get(type)?.length || 0;
    }
    return Array.from(this.indices.values()).reduce((sum, indices) => sum + indices.length, 0);
  }
}

export const searchService = new SearchService();