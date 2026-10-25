import { KVNamespace } from '@cloudflare/workers-types';
import { Merchant, BridgeDevice } from '@paisabridge/shared';

export interface Env {
  PROXY_BASE_URL: string;
  PROXY_MASTER_KEY: string;
  PROXY_PROJECT_NAME?: string;
  ENCRYPTION_SECRET: string;
  INTERNAL_SHARED_SECRET: string;
  PUBLIC_CHECKOUT_URL?: string;
  LOW_USAGE_MODE?: string;
  SETTINGS_KV?: KVNamespace;
  PROXY_SERVICE?: Fetcher;
}

export type AppContextVariables = {
  merchant?: Merchant;
  device?: BridgeDevice;
};
