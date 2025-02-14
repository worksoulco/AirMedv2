import { useState, useEffect, useMemo } from 'react';
import { storeManager } from './manager';
import type { Store, Selector } from './types';

export function useStore<T>(name: string): Store<T> {
  const store = storeManager.getStore(name);
  if (!store) {
    throw new Error(`Store "${name}" not found`);
  }
  return store;
}

export function useSelector<T, R>(name: string, selector: Selector<T, R>): R {
  const store = useStore<T>(name);
  const [value, setValue] = useState(() => store.select(selector));

  useEffect(() => {
    return store.subscribe(() => {
      const nextValue = store.select(selector);
      setValue(nextValue);
    });
  }, [store, selector]);

  return value;
}

export function useDispatch(name: string) {
  const store = useStore(name);
  return useMemo(() => store.dispatch.bind(store), [store]);
}