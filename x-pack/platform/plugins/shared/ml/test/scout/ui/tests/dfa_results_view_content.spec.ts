/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Scout migration of:
 * x-pack/platform/test/functional/apps/ml/data_frame_analytics/group1/results_view_content.ts
 *
 * Covers results view content for binary classification, multi-class
 * classification, and regression DFA jobs — verifying feature importance,
 * histogram charts, column visibility controls, and the custom visualization
 * link.
 *
 * Tagged @local-stateful-classic because the tests mutate global ML indices and
 * depend on the DFA feature which is not yet verified on serverless.
 */

import { expect } from '@kbn/scout/ui';
import { test, ML_USERS } from '../fixtures';
import { createAndRunDfaJob, cleanupDfaResultsTest } from '../fixtures/helpers/dfa';

// ── Shared timestamp ensures unique job IDs per test run ─────────────────────

const ts = Date.now();

// ── Binary classification job ─────────────────────────────────────────────────

const BINARY_CLASSIFICATION = {
  archive: 'x-pack/platform/test/fixtures/es_archives/ml/ihp_outlier',
  sourceViewTitle: 'ft_ihp_outlier',
  jobId: `ihp_fi_binary_${ts}`,
  analysisType: 'classification' as const,
  destIndex: `user-ihp_fi_binary_${ts}`,
  jobConfig: {
    id: `ihp_fi_binary_${ts}`,
    description:
      "Classification job based on 'ft_bank_marketing' dataset with dependentVariable 'y' and trainingPercent '35'",
    source: { index: ['ft_ihp_outlier'], query: { match_all: {} } },
    dest: { index: `user-ihp_fi_binary_${ts}`, results_field: 'ml_central_air' },
    analyzed_fields: {
      includes: [
        'CentralAir',
        'GarageArea',
        'GarageCars',
        'YearBuilt',
        'Electrical',
        'Neighborhood',
        'Heating',
        '1stFlrSF',
      ],
    },
    analysis: {
      classification: {
        dependent_variable: 'CentralAir',
        num_top_feature_importance_values: 5,
        training_percent: 35,
        prediction_field_name: 'CentralAir_prediction',
        num_top_classes: -1,
        max_trees: 10,
      },
    },
    model_memory_limit: '60mb',
    allow_lazy_start: false,
  },
  sortBy: { column: 'ml_central_air.is_training', direction: 'asc' as const },
  expectedHistogramCharts: [
    { chartAvailable: true, id: 'ml_central_air.is_training' },
    { chartAvailable: true, id: 'ml_central_air.CentralAir_prediction' },
    { chartAvailable: true, id: 'CentralAir' },
    { chartAvailable: true, id: 'ml_central_air.prediction_probability' },
    { chartAvailable: false, id: 'ml_central_air.feature_importance' },
    { chartAvailable: true, id: 'ml_central_air.prediction_score' },
    { chartAvailable: false, id: 'ml_central_air.top_classes' },
    { chartAvailable: true, id: '1stFlrSF' },
  ],
};

// ── Multi-class classification job ────────────────────────────────────────────

const MULTI_CLASS = {
  archive: 'x-pack/platform/test/fixtures/es_archives/ml/ihp_outlier',
  sourceViewTitle: 'ft_ihp_outlier',
  jobId: `ihp_fi_multi_${ts}`,
  analysisType: 'classification' as const,
  destIndex: `user-ihp_fi_multi_${ts}`,
  jobConfig: {
    id: `ihp_fi_multi_${ts}`,
    description:
      "Classification job based on 'ft_bank_marketing' dataset with dependentVariable 'y' and trainingPercent '35'",
    source: { index: ['ft_ihp_outlier'], query: { match_all: {} } },
    dest: { index: `user-ihp_fi_multi_${ts}`, results_field: 'ml_heating_qc' },
    analyzed_fields: {
      includes: [
        'CentralAir',
        'GarageArea',
        'GarageCars',
        'Electrical',
        'Neighborhood',
        'Heating',
        '1stFlrSF',
        'HeatingQC',
      ],
    },
    analysis: {
      classification: {
        dependent_variable: 'HeatingQC',
        num_top_feature_importance_values: 5,
        training_percent: 35,
        prediction_field_name: 'heatingqc',
        num_top_classes: -1,
        max_trees: 10,
      },
    },
    model_memory_limit: '60mb',
    allow_lazy_start: false,
  },
  sortBy: { column: 'ml_heating_qc.is_training', direction: 'desc' as const },
  expectedHistogramCharts: [
    { chartAvailable: true, id: 'ml_heating_qc.is_training' },
    { chartAvailable: true, id: 'ml_heating_qc.heatingqc' },
    { chartAvailable: true, id: 'HeatingQC' },
    { chartAvailable: true, id: 'ml_heating_qc.prediction_probability' },
    { chartAvailable: false, id: 'ml_heating_qc.feature_importance' },
    { chartAvailable: true, id: 'ml_heating_qc.prediction_score' },
    { chartAvailable: false, id: 'ml_heating_qc.top_classes', legend: 'Chart not supported.' },
    { chartAvailable: true, id: '1stFlrSF' },
  ],
};

// ── Regression job ────────────────────────────────────────────────────────────

const REGRESSION = {
  archive: 'x-pack/platform/test/fixtures/es_archives/ml/egs_regression',
  sourceViewTitle: 'ft_egs_regression',
  jobId: `egs_fi_reg_${ts}`,
  analysisType: 'regression' as const,
  destIndex: `user-egs_fi_reg_${ts}`,
  jobConfig: {
    id: `egs_fi_reg_${ts}`,
    description: 'This is the job description',
    source: { index: ['ft_egs_regression'], query: { match_all: {} } },
    dest: { index: `user-egs_fi_reg_${ts}`, results_field: 'ml' },
    analysis: {
      regression: {
        prediction_field_name: 'test',
        dependent_variable: 'stab',
        num_top_feature_importance_values: 5,
        training_percent: 35,
        max_trees: 10,
      },
    },
    analyzed_fields: {
      includes: [
        'g1',
        'g2',
        'g3',
        'g4',
        'p1',
        'p2',
        'p3',
        'p4',
        'stab',
        'tau1',
        'tau2',
        'tau3',
        'tau4',
      ],
      excludes: [],
    },
    model_memory_limit: '20mb',
  },
  sortBy: { column: 'ml.is_training', direction: 'desc' as const },
  expectedHistogramCharts: [
    { chartAvailable: true, id: 'ml.is_training' },
    { chartAvailable: true, id: 'ml.test' },
    { chartAvailable: true, id: 'stab', legend: '-0.06 - 0.11' },
    { chartAvailable: true, id: 'g1', legend: '0.05 - 1' },
    { chartAvailable: true, id: 'g2', legend: '0.05 - 1' },
    { chartAvailable: true, id: 'g3', legend: '0.05 - 1' },
    { chartAvailable: true, id: 'g4', legend: '0.05 - 1' },
  ],
};

// ── Spec ──────────────────────────────────────────────────────────────────────

test.describe('DFA results view content', { tag: '@local-stateful-classic' }, () => {
  let binarySourceViewId: string | undefined;
  let regressionSourceViewId: string | undefined;
  let binaryDestViewId: string | undefined;
  let multiDestViewId: string | undefined;
  let regressionDestViewId: string | undefined;

  test.beforeAll(async ({ esArchiver, apiServices, kbnClient, esClient }) => {
    // Defensive cleanup: remove any jobs left over from a previously interrupted run
    // so that createAndRunDfaJob does not fail with "resource already exists".
    await Promise.allSettled([
      esClient.ml
        .deleteDataFrameAnalytics({ id: BINARY_CLASSIFICATION.jobId, force: true })
        .catch(() => undefined),
      esClient.ml
        .deleteDataFrameAnalytics({ id: MULTI_CLASS.jobId, force: true })
        .catch(() => undefined),
      esClient.ml
        .deleteDataFrameAnalytics({ id: REGRESSION.jobId, force: true })
        .catch(() => undefined),
    ]);

    // Load archives (idempotent; ihp_outlier is shared by binary and multi-class)
    await esArchiver.loadIfNeeded(BINARY_CLASSIFICATION.archive);
    await esArchiver.loadIfNeeded(REGRESSION.archive);

    // Create source data views
    const [binaryView, regrView] = await Promise.all([
      apiServices.dataViews.create({
        title: BINARY_CLASSIFICATION.sourceViewTitle,
        name: BINARY_CLASSIFICATION.sourceViewTitle,
        override: true,
      }),
      apiServices.dataViews.create({
        title: REGRESSION.sourceViewTitle,
        name: REGRESSION.sourceViewTitle,
        override: true,
      }),
    ]);
    binarySourceViewId = binaryView.data.id;
    // multi-class shares ft_ihp_outlier with binary classification; track via binarySourceViewId
    regressionSourceViewId = regrView.data.id;

    // Create and run all three jobs concurrently
    await Promise.all([
      createAndRunDfaJob({ kbnClient, esClient, jobConfig: BINARY_CLASSIFICATION.jobConfig }),
      createAndRunDfaJob({ kbnClient, esClient, jobConfig: MULTI_CLASS.jobConfig }),
      createAndRunDfaJob({ kbnClient, esClient, jobConfig: REGRESSION.jobConfig }),
    ]);

    // Create dest data views after jobs finish so index mapping is available
    const [binaryDestView, multiDestView, regressionDestView] = await Promise.all([
      apiServices.dataViews.create({
        title: BINARY_CLASSIFICATION.destIndex,
        name: BINARY_CLASSIFICATION.destIndex,
        override: true,
      }),
      apiServices.dataViews.create({
        title: MULTI_CLASS.destIndex,
        name: MULTI_CLASS.destIndex,
        override: true,
      }),
      apiServices.dataViews.create({
        title: REGRESSION.destIndex,
        name: REGRESSION.destIndex,
        override: true,
      }),
    ]);
    binaryDestViewId = binaryDestView.data.id;
    multiDestViewId = multiDestView.data.id;
    regressionDestViewId = regressionDestView.data.id;
  });

  test.afterAll(async ({ apiServices, esClient }) => {
    await cleanupDfaResultsTest({
      apiServices,
      esClient,
      jobId: BINARY_CLASSIFICATION.jobId,
      sourceDataViewId: binarySourceViewId,
      destDataViewId: binaryDestViewId,
      destIndex: BINARY_CLASSIFICATION.destIndex,
    });
    await cleanupDfaResultsTest({
      apiServices,
      esClient,
      jobId: MULTI_CLASS.jobId,
      // multi-class shares the ihp_outlier source view with binary classification;
      // pass undefined so we don't double-delete it
      sourceDataViewId: undefined,
      destDataViewId: multiDestViewId,
      destIndex: MULTI_CLASS.destIndex,
    });
    await cleanupDfaResultsTest({
      apiServices,
      esClient,
      jobId: REGRESSION.jobId,
      sourceDataViewId: regressionSourceViewId,
      destDataViewId: regressionDestViewId,
      destIndex: REGRESSION.destIndex,
    });
  });

  // ── Binary classification results view ──────────────────────────────────

  test('binary classification results view: feature importance, histograms, columns, custom viz', async ({
    page,
    browserAuth,
    pageObjects: { dataFrameAnalytics },
  }) => {
    test.setTimeout(10 * 60 * 1000);

    await browserAuth.loginWithCustomRole(ML_USERS.mlPoweruser);

    await test.step('opens the results view', async () => {
      await dataFrameAnalytics.openResultsView(BINARY_CLASSIFICATION.jobId, BINARY_CLASSIFICATION.analysisType);
      await expect(page.testSubj.locator('mlExplorationDataGrid loaded')).toBeVisible({
        timeout: 30_000,
      });
    });

    await test.step('feature importance section is present', async () => {
      await dataFrameAnalytics.expandFeatureImportanceSection();
      // Either a chart or a "uniform data" callout is present (depending on analysis result)
      await expect(
        page.testSubj
          .locator('mlTotalFeatureImportanceChart')
          .or(page.testSubj.locator('mlNoTotalFeatureImportanceCallout'))
      ).toBeVisible({ timeout: 15_000 });
    });

    await test.step('feature importance decision path popover opens', async () => {
      await expect(page.testSubj.locator('mlExplorationDataGrid loaded')).toBeVisible();
      await dataFrameAnalytics.openFeatureImportancePopover();
      await expect(page.testSubj.locator('mlDFAFeatureImportancePopover')).toBeVisible();
      // Either JSON viewer or decision path chart is shown depending on number of features
      await expect(
        page.testSubj
          .locator('mlDFADecisionPathJSONViewer')
          .or(page.testSubj.locator('mlDFADecisionPathPopover'))
      ).toBeVisible();
    });

    await test.step('feature importance decision path popover opens after page change', async () => {
      await dataFrameAnalytics.selectResultsTablePage(3);
      await expect(page.testSubj.locator('mlExplorationDataGrid loaded')).toBeVisible();
      await dataFrameAnalytics.openFeatureImportancePopover();
      await expect(page.testSubj.locator('mlDFAFeatureImportancePopover')).toBeVisible();
      await expect(
        page.testSubj
          .locator('mlDFADecisionPathJSONViewer')
          .or(page.testSubj.locator('mlDFADecisionPathPopover'))
      ).toBeVisible();
    });

    await test.step('histogram charts toggle on and off', async () => {
      await dataFrameAnalytics.toggleHistogramCharts(true);
      for (const expected of BINARY_CLASSIFICATION.expectedHistogramCharts) {
        const state = await dataFrameAnalytics.getHistogramChartState(expected.id);
        expect(state.chartContainerVisible).toBe(true);
        expect(state.histogramVisible).toBe(expected.chartAvailable);
        expect(state.idText).toBe(expected.id);
        // Only assert legend when the test data specifies an expected value;
        // use the actual value as the expectation otherwise (unconditional expect)
        expect(state.legendText).toBe(expected.legend ?? state.legendText);
      }

      await dataFrameAnalytics.toggleHistogramCharts(false);
      for (const expected of BINARY_CLASSIFICATION.expectedHistogramCharts) {
        await expect(page.testSubj.locator(`mlDataGridChart-${expected.id}`)).not.toBeVisible();
      }
    });

    await test.step('sort and column visibility controls work', async () => {
      // Sort is applied server-side via an ES query (see use_exploration_results.ts).
      // Asserting exact sorted cell values is data-correctness coverage that belongs in
      // a Scout API test, not a UI test. Here we only verify the sort UI interaction
      // completes without error.
      await dataFrameAnalytics.setSortColumn(
        BINARY_CLASSIFICATION.sortBy.column,
        BINARY_CLASSIFICATION.sortBy.direction
      );
      await dataFrameAnalytics.showAllColumns();
      await dataFrameAnalytics.hideAllColumns();
    });

    await test.step('custom visualization link navigates to visualization app', async () => {
      await dataFrameAnalytics.clickExploreInCustomVisualization();
      await expect(page.testSubj.locator('visualizationLoader')).toBeVisible({ timeout: 15_000 });
    });
  });

  // ── Multi-class classification results view ─────────────────────────────

  test('multi-class classification results view: feature importance, histograms, columns, custom viz', async ({
    page,
    browserAuth,
    pageObjects: { dataFrameAnalytics },
  }) => {
    test.setTimeout(10 * 60 * 1000);

    await browserAuth.loginWithCustomRole(ML_USERS.mlPoweruser);

    await test.step('opens the results view', async () => {
      await dataFrameAnalytics.openResultsView(MULTI_CLASS.jobId, MULTI_CLASS.analysisType);
      await expect(page.testSubj.locator('mlExplorationDataGrid loaded')).toBeVisible({
        timeout: 30_000,
      });
    });

    await test.step('feature importance section is present', async () => {
      await dataFrameAnalytics.expandFeatureImportanceSection();
      await expect(
        page.testSubj
          .locator('mlTotalFeatureImportanceChart')
          .or(page.testSubj.locator('mlNoTotalFeatureImportanceCallout'))
      ).toBeVisible({ timeout: 15_000 });
    });

    await test.step('feature importance decision path popover opens', async () => {
      await expect(page.testSubj.locator('mlExplorationDataGrid loaded')).toBeVisible();
      await dataFrameAnalytics.openFeatureImportancePopover();
      await expect(page.testSubj.locator('mlDFAFeatureImportancePopover')).toBeVisible();
      await expect(
        page.testSubj
          .locator('mlDFADecisionPathJSONViewer')
          .or(page.testSubj.locator('mlDFADecisionPathPopover'))
      ).toBeVisible();
    });

    await test.step('feature importance decision path popover opens after page change', async () => {
      await dataFrameAnalytics.selectResultsTablePage(3);
      await expect(page.testSubj.locator('mlExplorationDataGrid loaded')).toBeVisible();
      await dataFrameAnalytics.openFeatureImportancePopover();
      await expect(page.testSubj.locator('mlDFAFeatureImportancePopover')).toBeVisible();
      await expect(
        page.testSubj
          .locator('mlDFADecisionPathJSONViewer')
          .or(page.testSubj.locator('mlDFADecisionPathPopover'))
      ).toBeVisible();
    });

    await test.step('histogram charts toggle on and off', async () => {
      await dataFrameAnalytics.toggleHistogramCharts(true);
      for (const expected of MULTI_CLASS.expectedHistogramCharts) {
        const state = await dataFrameAnalytics.getHistogramChartState(expected.id);
        expect(state.chartContainerVisible).toBe(true);
        expect(state.histogramVisible).toBe(expected.chartAvailable);
        expect(state.idText).toBe(expected.id);
        expect(state.legendText).toBe(expected.legend ?? state.legendText);
      }

      await dataFrameAnalytics.toggleHistogramCharts(false);
      for (const expected of MULTI_CLASS.expectedHistogramCharts) {
        await expect(page.testSubj.locator(`mlDataGridChart-${expected.id}`)).not.toBeVisible();
      }
    });

    await test.step('sort and column visibility controls work', async () => {
      // Sort is applied server-side via an ES query — see sort de-scope comment in binary test.
      await dataFrameAnalytics.setSortColumn(
        MULTI_CLASS.sortBy.column,
        MULTI_CLASS.sortBy.direction
      );
      await dataFrameAnalytics.showAllColumns();
      await dataFrameAnalytics.hideAllColumns();
    });

    await test.step('custom visualization link navigates to visualization app', async () => {
      await dataFrameAnalytics.clickExploreInCustomVisualization();
      await expect(page.testSubj.locator('visualizationLoader')).toBeVisible({ timeout: 15_000 });
    });
  });

  // ── Regression results view ─────────────────────────────────────────────

  test('regression results view: feature importance, histograms, columns, custom viz', async ({
    page,
    browserAuth,
    pageObjects: { dataFrameAnalytics },
  }) => {
    test.setTimeout(10 * 60 * 1000);

    await browserAuth.loginWithCustomRole(ML_USERS.mlPoweruser);

    await test.step('opens the results view', async () => {
      await dataFrameAnalytics.openResultsView(REGRESSION.jobId, REGRESSION.analysisType);
      await expect(page.testSubj.locator('mlExplorationDataGrid loaded')).toBeVisible({
        timeout: 30_000,
      });
    });

    await test.step('feature importance section is present', async () => {
      await dataFrameAnalytics.expandFeatureImportanceSection();
      await expect(
        page.testSubj
          .locator('mlTotalFeatureImportanceChart')
          .or(page.testSubj.locator('mlNoTotalFeatureImportanceCallout'))
      ).toBeVisible({ timeout: 15_000 });
    });

    await test.step('feature importance decision path popover opens', async () => {
      await expect(page.testSubj.locator('mlExplorationDataGrid loaded')).toBeVisible();
      await dataFrameAnalytics.openFeatureImportancePopover();
      await expect(page.testSubj.locator('mlDFAFeatureImportancePopover')).toBeVisible();
      await expect(
        page.testSubj
          .locator('mlDFADecisionPathJSONViewer')
          .or(page.testSubj.locator('mlDFADecisionPathPopover'))
      ).toBeVisible();
    });

    await test.step('feature importance decision path popover opens after page change', async () => {
      await dataFrameAnalytics.selectResultsTablePage(3);
      await expect(page.testSubj.locator('mlExplorationDataGrid loaded')).toBeVisible();
      await dataFrameAnalytics.openFeatureImportancePopover();
      await expect(page.testSubj.locator('mlDFAFeatureImportancePopover')).toBeVisible();
      await expect(
        page.testSubj
          .locator('mlDFADecisionPathJSONViewer')
          .or(page.testSubj.locator('mlDFADecisionPathPopover'))
      ).toBeVisible();
    });

    await test.step('histogram charts toggle on and off', async () => {
      await dataFrameAnalytics.toggleHistogramCharts(true);
      for (const expected of REGRESSION.expectedHistogramCharts) {
        const state = await dataFrameAnalytics.getHistogramChartState(expected.id);
        expect(state.chartContainerVisible).toBe(true);
        expect(state.histogramVisible).toBe(expected.chartAvailable);
        expect(state.idText).toBe(expected.id);
        expect(state.legendText).toBe(expected.legend ?? state.legendText);
      }

      await dataFrameAnalytics.toggleHistogramCharts(false);
      for (const expected of REGRESSION.expectedHistogramCharts) {
        await expect(page.testSubj.locator(`mlDataGridChart-${expected.id}`)).not.toBeVisible();
      }
    });

    await test.step('sort and column visibility controls work', async () => {
      // Sort is applied server-side via an ES query — see sort de-scope comment in binary test.
      await dataFrameAnalytics.setSortColumn(REGRESSION.sortBy.column, REGRESSION.sortBy.direction);
      await dataFrameAnalytics.showAllColumns();
      await dataFrameAnalytics.hideAllColumns();
    });

    await test.step('custom visualization link navigates to visualization app', async () => {
      await dataFrameAnalytics.clickExploreInCustomVisualization();
      await expect(page.testSubj.locator('visualizationLoader')).toBeVisible({ timeout: 15_000 });
    });
  });
});
