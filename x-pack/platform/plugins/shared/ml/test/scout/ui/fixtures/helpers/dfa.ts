/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient, ApiServicesFixture, EsClient } from '@kbn/scout';
import { ML_TEST_DASHBOARD_ATTRIBUTES } from '../constants';

// ── DFA job config type (minimal surface needed by helpers) ──────────────────

interface DfaJobConfig {
  id: string;
  [key: string]: unknown;
}

interface CleanupDfaTestArgs {
  apiServices: ApiServicesFixture;
  kbnClient: KbnClient;
  esClient: EsClient;
  dataViewId: string | undefined;
  dashboardId: string | undefined;
  destinationIndex: string;
}

/**
 * Creates the shared 'ML Test' dashboard saved object used in every DFA spec's beforeAll.
 * Returns the saved-object id so the caller can pass it to cleanupDfaTest.
 */
export const createMLTestDashboard = async (kbnClient: KbnClient): Promise<string> => {
  const dashboard = await kbnClient.savedObjects.create({
    type: 'dashboard',
    overwrite: false,
    attributes: ML_TEST_DASHBOARD_ATTRIBUTES,
  });
  return dashboard.id;
};

// ── New targeted helpers (used by dfa_cloning and dfa_results_view_content) ──

/**
 * Creates a single DFA job via the Kibana internal API so it is registered as a
 * saved object and appears in the analytics job list. Using the bare ES API
 * (`esClient.ml.putDataFrameAnalytics`) skips this registration step and the
 * job will not be visible in the Kibana table.
 */
export const createDfaJob = async ({
  kbnClient,
  jobConfig,
}: {
  kbnClient: KbnClient;
  jobConfig: DfaJobConfig;
}): Promise<void> => {
  const { id, ...config } = jobConfig;
  await kbnClient.request({
    method: 'PUT',
    path: `/internal/ml/data_frame/analytics/${id}`,
    body: config,
    headers: {
      'elastic-api-version': '1',
      'kbn-xsrf': 'true',
    },
  });
};

/**
 * Creates a DFA job, starts it, polls until `state === 'stopped'`, and syncs
 * Kibana saved objects so the job state is correctly reflected in the UI.
 *
 * Mirrors the FTR's `ml.api.createAndRunDFAJob` without the global cleanup
 * side-effects.
 */
export const createAndRunDfaJob = async ({
  kbnClient,
  esClient,
  jobConfig,
}: {
  kbnClient: KbnClient;
  esClient: EsClient;
  jobConfig: DfaJobConfig;
}): Promise<void> => {
  await createDfaJob({ kbnClient, jobConfig });

  await esClient.ml.startDataFrameAnalytics({ id: jobConfig.id });

  // Poll until the job finishes (up to 15 minutes)
  const pollTimeoutMs = 15 * 60 * 1000;
  const pollIntervalMs = 5_000;
  const deadline = Date.now() + pollTimeoutMs;

  while (true) {
    const { data_frame_analytics: statsList } = await esClient.ml.getDataFrameAnalyticsStats({
      id: jobConfig.id,
      allow_no_match: true,
    });
    if (statsList[0]?.state === 'stopped') {
      break;
    }
    if (Date.now() >= deadline) {
      throw new Error(
        `DFA job '${jobConfig.id}' did not reach 'stopped' state within ${pollTimeoutMs}ms`
      );
    }
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  // Sync saved objects so the job appears correctly in the Kibana UI
  await kbnClient.request({
    method: 'GET',
    path: '/api/ml/saved_objects/sync',
    headers: { 'elastic-api-version': '2023-10-31' },
  });
};

/**
 * Targeted cleanup for a DFA cloning test. Removes only the specific jobs and
 * indices created by a single test to avoid interfering with other tests.
 * Errors are silently swallowed so that a missing resource (e.g. clone job
 * was never created) does not block the rest of cleanup.
 */
export const cleanupDfaCloningTest = async ({
  apiServices,
  esClient,
  originalJobId,
  cloneJobId,
  sourceDataViewId,
  originalDestIndex,
  cloneDestIndex,
}: {
  apiServices: ApiServicesFixture;
  esClient: EsClient;
  originalJobId: string;
  cloneJobId: string;
  sourceDataViewId: string | undefined;
  originalDestIndex: string;
  cloneDestIndex: string;
}): Promise<void> => {
  for (const jobId of [originalJobId, cloneJobId]) {
    await esClient.ml.deleteDataFrameAnalytics({ id: jobId, force: true }).catch(() => undefined);
  }

  if (sourceDataViewId) {
    await apiServices.dataViews.delete(sourceDataViewId).catch(() => undefined);
  }

  await esClient.indices
    .delete({ index: originalDestIndex, ignore_unavailable: true })
    .catch(() => undefined);
  await esClient.indices
    .delete({ index: cloneDestIndex, ignore_unavailable: true })
    .catch(() => undefined);

  // Delete any Kibana data views that were auto-created for the dest indices.
  // Fetch the full list once, then search for both titles to avoid two round-trips.
  const allViews = await apiServices.dataViews
    .getAll()
    .catch(() => ({ data: [] as Array<{ id: string; title: string }> }));
  for (const indexTitle of [originalDestIndex, cloneDestIndex]) {
    const view = allViews.data.find((dv) => dv.title === indexTitle);
    if (view) {
      await apiServices.dataViews.delete(view.id).catch(() => undefined);
    }
  }
};

/**
 * Targeted cleanup for a DFA results view test.
 */
export const cleanupDfaResultsTest = async ({
  apiServices,
  esClient,
  jobId,
  sourceDataViewId,
  destDataViewId,
  destIndex,
}: {
  apiServices: ApiServicesFixture;
  esClient: EsClient;
  jobId: string;
  sourceDataViewId: string | undefined;
  destDataViewId: string | undefined;
  destIndex: string;
}): Promise<void> => {
  await esClient.ml.deleteDataFrameAnalytics({ id: jobId, force: true }).catch(() => undefined);

  if (sourceDataViewId) {
    await apiServices.dataViews.delete(sourceDataViewId).catch(() => undefined);
  }
  if (destDataViewId) {
    await apiServices.dataViews.delete(destDataViewId).catch(() => undefined);
  }

  await esClient.indices
    .delete({ index: destIndex, ignore_unavailable: true })
    .catch(() => undefined);
};

// ── Original global helper (kept for existing specs) ─────────────────────────

/**
 * Tears down all state mutated by a DFA spec suite:
 * - all DFA indices (via the ML cleanup API)
 * - the per-spec source data view
 * - the shared ML Test dashboard
 * - the destination index created when the job ran
 * - the destination data view auto-created alongside the destination index
 */
export const cleanupDfaTest = async ({
  apiServices,
  kbnClient,
  esClient,
  dataViewId,
  dashboardId,
  destinationIndex,
}: CleanupDfaTestArgs): Promise<void> => {
  await apiServices.ml.indices.cleanDataFrameAnalytics();
  if (dataViewId) {
    await apiServices.dataViews.delete(dataViewId);
  }
  if (dashboardId) {
    await kbnClient.savedObjects.delete({ type: 'dashboard', id: dashboardId });
  }
  await esClient.indices.delete({ index: destinationIndex, ignore_unavailable: true });
  const destViews = await apiServices.dataViews.getAll();
  const destView = destViews.data.find((dv: { title: string }) => dv.title === destinationIndex);
  if (destView) {
    await apiServices.dataViews.delete(destView.id);
  }
};
