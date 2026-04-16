import type { ApiRow } from '../../components/ApiTable.js';

export const getShowApi = (t: (key: string) => string): ApiRow[] => [
  { name: 'when', type: '() => T | T', description: t('controlflow.apiShowWhen') },
  { name: 'children', type: '(value: NonNullable<T>) => Node', description: t('controlflow.apiShowChildren') },
  { name: 'fallback', type: '() => Node', default: 'nothing', description: t('controlflow.apiShowFallback') },
  { name: 'keepAlive', type: 'boolean', default: 'false', description: t('controlflow.apiShowKeepAlive') },
];

export const getForApi = (t: (key: string) => string): ApiRow[] => [
  { name: 'each', type: 'Signal<T[]> | T[]', description: t('controlflow.apiForEach') },
  { name: 'key', type: 'keyof T | (item: T, index: number) => string | number', default: 'index', description: t('controlflow.apiForKey') },
  { name: 'children', type: '(item: T, index: number) => Node', description: t('controlflow.apiForChildren') },
  { name: 'fallback', type: '() => Node', default: 'nothing', description: t('controlflow.apiForFallback') },
];

export const getSwitchApi = (t: (key: string) => string): ApiRow[] => [
  { name: 'children', type: 'MatchCase[]', description: t('controlflow.apiSwitchChildren') },
  { name: 'fallback', type: '() => Node', default: 'nothing', description: t('controlflow.apiSwitchFallback') },
];

export const getMatchApi = (t: (key: string) => string): ApiRow[] => [
  { name: 'when', type: '() => boolean | boolean', description: t('controlflow.apiMatchWhen') },
  { name: 'children', type: '() => Node', description: t('controlflow.apiMatchChildren') },
];
