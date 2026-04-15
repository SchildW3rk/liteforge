import type { ApiRow } from '../../components/ApiTable.js';

export const getPluginApi = (t: (key: string) => string): ApiRow[] => [
  { name: 'position', type: 'ToastPosition', default: "'bottom-right'", description: t('toast.apiPosition') },
  { name: 'maxToasts', type: 'number', default: '5', description: t('toast.apiMaxToasts') },
  { name: 'duration', type: 'number', default: '4000', description: t('toast.apiDuration') },
  { name: 'unstyled', type: 'boolean', default: 'false', description: t('toast.apiUnstyled') },
];

export const getToastApi = (t: (key: string) => string): ApiRow[] => [
  { name: 'toast.success(message, opts?)', type: 'string', description: t('toast.apiSuccess') },
  { name: 'toast.error(message, opts?)', type: 'string', description: t('toast.apiError') },
  { name: 'toast.warning(message, opts?)', type: 'string', description: t('toast.apiWarning') },
  { name: 'toast.info(message, opts?)', type: 'string', description: t('toast.apiInfo') },
  { name: 'toast.promise(p, labels)', type: 'Promise<T>', description: t('toast.apiPromise') },
  { name: 'toast.dismiss(id?)', type: 'void', description: t('toast.apiDismiss') },
];

export const getOptsApi = (t: (key: string) => string): ApiRow[] => [
  { name: 'duration', type: 'number', description: t('toast.apiOptDuration') },
  { name: 'closable', type: 'boolean', description: t('toast.apiClosable') },
  { name: 'id', type: 'string', description: t('toast.apiId') },
  { name: 'class', type: 'string', description: t('toast.apiOptClass') },
  { name: 'styles', type: "Pick<ToastStyles, 'toast' | 'icon' | 'close'>", description: t('toast.apiOptStyles') },
];

export const getProviderStylesApi = (t: (key: string) => string): ApiRow[] => [
  { name: 'container', type: 'string', description: t('toast.apiStylesContainer') },
  { name: 'toast', type: 'string', description: t('toast.apiStylesToast') },
  { name: 'icon', type: 'string', description: t('toast.apiStylesIcon') },
  { name: 'close', type: 'string', description: t('toast.apiStylesClose') },
];

export const getProviderClassesApi = (t: (key: string) => string): ApiRow[] => [
  { name: 'container', type: 'string', description: t('toast.apiClassesContainer') },
  { name: 'toast', type: 'string', description: t('toast.apiClassesToast') },
  { name: 'success', type: 'string', description: t('toast.apiClassesSuccess') },
  { name: 'error', type: 'string', description: t('toast.apiClassesError') },
  { name: 'warning', type: 'string', description: t('toast.apiClassesWarning') },
  { name: 'info', type: 'string', description: t('toast.apiClassesInfo') },
  { name: 'icon', type: 'string', description: t('toast.apiClassesIcon') },
  { name: 'close', type: 'string', description: t('toast.apiClassesClose') },
];
