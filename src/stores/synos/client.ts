/**
 * Synos Client Store
 * Exports a singleton instance of the API client for use across the app
 */

import { SynosAPIClient } from '../modules/synos/api-client';
import { SYNOS_CONFIG } from '../modules/synos/config';

export const synosClient = new SynosAPIClient(SYNOS_CONFIG);
