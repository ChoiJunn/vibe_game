import 'server-only';

import { RAW_EVENT_RETENTION_SECONDS } from '@/server/cosmos/models';

export const RAW_EVENT_RETENTION_POLICY = {
  mode: 'cosmos-ttl',
  seconds: RAW_EVENT_RETENTION_SECONDS,
  finalResultsExpire: false,
} as const;
