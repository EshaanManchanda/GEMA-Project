export const cacheGroupService = {
  invalidateGroup: async (_group: string) => {},
  invalidateAll: async () => {},
  invalidateGroups: async (_groups: string[]) => {},
  setWithGroup: async (_key: string, _value: any, _group: string, _options?: { ttl?: number }) => {},
  getGroupStats: async (_group: string) => ({ group: _group, keys: 0, size: 0 }),
  get: async <T = any>(_key: string): Promise<T | null> => null,
  set: async (_key: string, _value: any, _ttl?: number) => {},
  del: async (_key: string) => {},
};
