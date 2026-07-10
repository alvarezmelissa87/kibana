/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage, KibanaUrl } from '@kbn/scout';
import { EuiComboBoxWrapper, KibanaCodeEditorWrapper } from '@kbn/scout';

/**
 * Page object for the Data Frame Analytics section of Stack Management ML.
 * Only the interactions needed by the current Scout spec files are exposed.
 * Assertions belong in the spec, not here.
 */
export class DataFrameAnalyticsPage {
  private readonly codeEditor: KibanaCodeEditorWrapper;

  constructor(private readonly page: ScoutPage, private readonly kbnUrl: KibanaUrl) {
    this.codeEditor = new KibanaCodeEditorWrapper(page);
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  async gotoJobList(): Promise<void> {
    await this.page.goto(this.kbnUrl.app('management/ml/analytics'));
    // DataFrameAnalyticsList renders null until its first ML API fetch completes
    // (isInitialized). 60 s covers cold-start and environments with many existing jobs.
    await this.page.testSubj
      .locator('mlAnalyticsJobList')
      .waitFor({ state: 'visible', timeout: 60_000 });
  }

  // ── Creation wizard ───────────────────────────────────────────────────────

  /**
   * Clicks the "Create job" button in the page header and waits for the source
   * selection page. The header button (mlAnalyticsButtonCreate) is always rendered
   * regardless of whether the job list is empty or not, making it safe to use in
   * non-clean CI environments that carry leftover DFA jobs from previous runs.
   */
  async startCreation(): Promise<void> {
    await this.page.testSubj.locator('mlAnalyticsButtonCreate').click();
    await this.page.testSubj.locator('mlDFAPageSourceSelection').waitFor({ state: 'visible' });
  }

  async selectSource(sourceName: string): Promise<void> {
    // SavedObjectFinder fires an async fetch on mount; mlDFAPageSourceSelection becoming
    // visible does not guarantee the item list is populated yet. Wait for the initial load
    // to settle before typing. EuiBasicTable sets aria-busy="true" on the inner <table>
    // while loading and removes the attribute when done (it is never set to "false").
    await this.page.testSubj
      .locator('savedObjectsFinderTable')
      .locator('table:not([aria-busy="true"])')
      .waitFor({ state: 'visible', timeout: 40_000 });
    await this.page.testSubj.locator('savedObjectFinderSearchInput').fill(sourceName);
    // fill() triggers a 300 ms debounced API search. Wait explicitly for the matching
    // source item rather than relying on the 10 s default action timeout — the search
    // can be slow in loaded CI environments or when the data view was just created.
    const resultItem = this.page.testSubj.locator(`savedObjectTitle${sourceName}`);
    await resultItem.waitFor({ state: 'visible', timeout: 40_000 });
    await resultItem.click();
    await this.page.testSubj.locator('mlAnalyticsCreationContainer').waitFor({ state: 'visible' });
  }

  async selectJobType(jobType: string): Promise<void> {
    await this.page.testSubj.locator(`mlAnalyticsCreation-${jobType}-option`).click();
    // Wait for the selected indicator to appear
    await this.page.testSubj
      .locator(`mlAnalyticsCreation-${jobType}-option selectedJobType`)
      .waitFor({ state: 'visible' });
  }

  // ── Configuration step ───────────────────────────────────────────────────

  async enableRuntimeMappings(): Promise<void> {
    await this.page.testSubj.locator('mlDataFrameAnalyticsRuntimeMappingsEditorSwitch').click();
    await this.page.testSubj
      .locator('mlDataFrameAnalyticsAdvancedRuntimeMappingsEditor')
      .waitFor({ state: 'visible' });
  }

  async setRuntimeMappings(content: string): Promise<void> {
    await this.codeEditor.waitCodeEditorReady('mlDataFrameAnalyticsAdvancedRuntimeMappingsEditor');
    await this.codeEditor.setCodeEditorValue(content);
  }

  async getRuntimeMappingsContent(): Promise<string> {
    return this.codeEditor.getCodeEditorValue();
  }

  async applyRuntimeMappings(): Promise<void> {
    await this.page.testSubj.locator('mlDataFrameAnalyticsRuntimeMappingsApplyButton').click();
  }

  async setScatterplotSampleSize(value: string): Promise<void> {
    await this.page.testSubj.locator('mlScatterplotMatrixSampleSizeSelect').selectOption(value);
  }

  // TODO: replace idempotent toggle with explicit click once suite state
  // is well-understood; see Scout page-object best practices.
  async setScatterplotRandomizeQuery(enable: boolean): Promise<void> {
    const switchEl = this.page.testSubj.locator('mlScatterplotMatrixRandomizeQuerySwitch');
    const isChecked = (await switchEl.getAttribute('aria-checked')) === 'true';
    if (isChecked !== enable) {
      await switchEl.click();
    }
  }

  async continueToAdditionalOptions(): Promise<void> {
    await this.page.testSubj
      .locator(
        'mlAnalyticsCreateJobWizardConfigurationStep active > mlAnalyticsCreateJobWizardContinueButton'
      )
      .click();
    await this.page.testSubj
      .locator('mlAnalyticsCreateJobWizardAdvancedStep active')
      .waitFor({ state: 'visible' });
  }

  // ── Additional options step ───────────────────────────────────────────────

  async continueToDetails(): Promise<void> {
    await this.page.testSubj
      .locator(
        'mlAnalyticsCreateJobWizardAdvancedStep active > mlAnalyticsCreateJobWizardContinueButton'
      )
      .click();
    await this.page.testSubj
      .locator('mlAnalyticsCreateJobWizardDetailsStep active')
      .waitFor({ state: 'visible' });
  }

  // ── Details step ─────────────────────────────────────────────────────────

  async setJobId(jobId: string): Promise<void> {
    await this.page.testSubj.locator('mlAnalyticsCreateJobFlyoutJobIdInput').fill(jobId);
  }

  async setJobDescription(desc: string): Promise<void> {
    await this.page.testSubj.locator('mlDFAnalyticsJobCreationJobDescription').fill(desc);
  }

  // TODO: replace idempotent toggle with explicit click once suite state
  // is well-understood; see Scout page-object best practices.
  async setDestIndexSameAsJobId(sameAsId: boolean): Promise<void> {
    const switchEl = this.page.testSubj.locator('mlCreationWizardUtilsJobIdAsDestIndexNameSwitch');
    const isChecked = (await switchEl.getAttribute('aria-checked')) === 'true';
    if (isChecked !== sameAsId) {
      await switchEl.click();
    }
  }

  async setDestinationIndex(index: string): Promise<void> {
    const input = this.page.testSubj.locator('mlCreationWizardUtilsDestinationIndexInput');
    await input.clear();
    await input.fill(index);
  }

  async continueToValidation(): Promise<void> {
    await this.page.testSubj
      .locator(
        'mlAnalyticsCreateJobWizardDetailsStep active > mlAnalyticsCreateJobWizardContinueButton'
      )
      .click();
    await this.page.testSubj
      .locator('mlAnalyticsCreateJobWizardValidationStepWrapper active')
      .waitFor({ state: 'visible' });
  }

  // ── Advanced editor (JSON) ────────────────────────────────────────────────

  async openAdvancedEditor(): Promise<void> {
    await this.page.testSubj.locator('mlAnalyticsCreateJobWizardAdvancedEditorSwitch').click();
    await this.page.testSubj
      .locator('mlAnalyticsCreateJobWizardAdvancedEditorCodeEditor')
      .waitFor({ state: 'visible' });
  }

  async getAdvancedEditorContent(): Promise<string> {
    return this.codeEditor.getCodeEditorValue();
  }

  async closeAdvancedEditor(): Promise<void> {
    await this.page.testSubj.locator('mlAnalyticsCreateJobWizardAdvancedEditorSwitch').click();
    await this.page.testSubj
      .locator('mlAnalyticsCreateJobWizardAdvancedEditorCodeEditor')
      .waitFor({ state: 'hidden' });
  }

  // ── Validation + create step ──────────────────────────────────────────────

  async continueToCreate(): Promise<void> {
    await this.page.testSubj
      .locator(
        'mlAnalyticsCreateJobWizardValidationStepWrapper active > mlAnalyticsCreateJobWizardContinueButton'
      )
      .click();
    await this.page.testSubj
      .locator('mlAnalyticsCreateJobWizardCreateStep active')
      .waitFor({ state: 'visible' });
  }

  /**
   * Creates and immediately starts the job (assumes the "start job" switch is on by default).
   * Navigates back to the job list after the creation card appears.
   */
  // TODO: replace idempotent toggle with explicit click once suite state
  // is well-understood; see Scout page-object best practices.
  async createAndStartJob(): Promise<void> {
    const startSwitch = this.page.testSubj.locator('mlAnalyticsCreateJobWizardStartJobSwitch');
    if ((await startSwitch.getAttribute('aria-checked')) !== 'true') {
      await startSwitch.click();
    }
    await this.page.testSubj.locator('mlAnalyticsCreateJobWizardCreateButton').click();
    // The ML backend may be busy; give the post-creation card 30 s to appear.
    await this.page.testSubj
      .locator('analyticsWizardCardManagement')
      .waitFor({ state: 'visible', timeout: 40_000 });
    await this.page.testSubj.locator('analyticsWizardCardManagement').click();
    // After navigation the list re-fetches all jobs; 60 s covers slow ML backends and
    // environments carrying many existing jobs.
    await this.page.testSubj
      .locator('mlAnalyticsJobList')
      .waitFor({ state: 'visible', timeout: 60_000 });
  }

  // ── Job table ─────────────────────────────────────────────────────────────

  async waitForTableLoaded(): Promise<void> {
    await this.page.testSubj
      .locator('~mlAnalyticsTable')
      .waitFor({ state: 'visible', timeout: 60_000 });
    // "loaded" suffix is set by the component once data rendering completes; 60 s covers
    // environments with many existing jobs slowing the EUI table render.
    await this.page.testSubj
      .locator('mlAnalyticsTable loaded')
      .waitFor({ state: 'visible', timeout: 60_000 });
  }

  async filterByJobId(jobId: string): Promise<void> {
    await this.waitForTableLoaded();
    const searchInput = this.page.testSubj.locator('mlAnalyticsSearchBox');
    await searchInput.fill('');
    await searchInput.fill(jobId);
    // 30 s covers search + table re-render latency under CI load.
    await this.page.testSubj
      .locator('~mlAnalyticsTable')
      .locator(`[data-test-subj~="row-${jobId}"]`)
      .waitFor({ state: 'visible', timeout: 30_000 });
  }

  /** Returns key visible column values from the matching table row. */
  async getRowData(jobId: string): Promise<Record<string, string>> {
    const row = this.page.testSubj
      .locator('~mlAnalyticsTable')
      .locator(`[data-test-subj~="row-${jobId}"]`);

    const getText = async (subj: string) =>
      // EuiBasicTable appends a hidden tabular-copy-marker <span> (tab char) to every cell for
      // clipboard support. That span is off-screen (not display:none), so Playwright's innerText()
      // includes it. Scope to the direct <div> child (EuiTableCellContent) to exclude the marker
      // without depending on the EUI internal CSS class name.
      (await row.locator(`[data-test-subj="${subj}"] > div`).innerText()).trim();

    return {
      id: await getText('mlAnalyticsTableColumnId'),
      description: await getText('mlAnalyticsTableColumnJobDescription'),
      memoryStatus: await getText('mlAnalyticsTableColumnJobMemoryStatus'),
      sourceIndex: await getText('mlAnalyticsTableColumnSourceIndex'),
      destinationIndex: await getText('mlAnalyticsTableColumnDestIndex'),
      type: await getText('mlAnalyticsTableColumnType'),
      status: await getText('mlAnalyticsTableColumnStatus'),
      // Progress is a visual EuiProgress bar; read the value attribute (not innerText)
      progress:
        (await row
          .locator('[data-test-subj="mlAnalyticsTableColumnProgress"]')
          .locator('[data-test-subj="mlAnalyticsTableProgress"]')
          .getAttribute('value')) ?? '',
    };
  }

  private async openActionsMenu(jobId: string): Promise<void> {
    // The analytics table auto-refreshes every 30 s (DEFAULT_REFRESH_INTERVAL_MS).
    // If a refresh fires between the click and the visibility check the
    // CollapsedItemActions component unmounts, its local `isOpen` state resets, and
    // the popover closes.  Mirror the FTR's ensureJobActionsMenuOpen retry strategy:
    // click → waitFor with short timeout → catch → retry.
    const actionsButton = this.page.testSubj
      .locator('~mlAnalyticsTable')
      .locator(`[data-test-subj~="row-${jobId}"]`)
      .locator('[data-test-subj="euiCollapsedItemActionsButton"]');
    const cloneButton = this.page.testSubj.locator('mlAnalyticsJobCloneButton');

    for (let attempt = 0; attempt < 6; attempt++) {
      await actionsButton.click();
      try {
        await cloneButton.waitFor({ state: 'visible', timeout: 5_000 });
        return;
      } catch {
        // Popover likely closed due to a table auto-refresh; retry.
      }
    }
    // Final attempt — if it still fails, the error is descriptive.
    await cloneButton.waitFor({ state: 'visible', timeout: 5_000 });
  }

  async openEditFlyout(jobId: string): Promise<void> {
    await this.openActionsMenu(jobId);
    await this.page.testSubj.locator('mlAnalyticsJobEditButton').click();
    await this.page.testSubj.locator('mlAnalyticsEditFlyout').waitFor({ state: 'visible' });
  }

  async openResultsView(jobId: string, analysisType: string): Promise<void> {
    // Navigate directly to the ML app exploration URL rather than clicking the
    // showOnHover table row button.  The button approach is fragile because:
    //   1. The button is CSS-hidden until the row is hovered (showOnHover: true).
    //   2. Clicking it triggers a cross-app navigation (management → ml app) via
    //      navigateToUrl, which Playwright's locator.waitFor doesn't reliably
    //      detect when the destination page takes >5 s to mount.
    // Direct navigation mirrors the URL that the view action constructs via
    // mlLocator.getUrl (see use_view_action.tsx / formatDataFrameAnalyticsExplorationUrl).
    // analysisType values: 'classification' | 'regression' | 'outlier_detection'
    const rison = `(ml:(analysisType:${analysisType},jobId:${jobId}))`;
    await this.page.goto(this.kbnUrl.app(`ml/data_frame_analytics/exploration?_g=${rison}`));
    await this.page.testSubj
      .locator('mlPageDataFrameAnalyticsExploration')
      .waitFor({ state: 'visible', timeout: 30_000 });
  }

  async openMapView(jobId: string): Promise<void> {
    // mapAction has isPrimary:true — same showOnHover pattern as the view button.
    const row = this.page.testSubj
      .locator('~mlAnalyticsTable')
      .locator(`[data-test-subj~="row-${jobId}"]`);
    await row.hover();
    await row.locator('[data-test-subj="mlAnalyticsJobMapButton"]').click();
    await this.page.testSubj
      .locator('mlPageDataFrameAnalyticsMap')
      .waitFor({ state: 'visible', timeout: 30_000 });
  }

  // ── Configuration step: dependent variable & training percent ─────────────

  async selectDependentVariable(variable: string): Promise<void> {
    // Wait for options to finish loading before opening the selector.
    await this.page.testSubj
      .locator('mlAnalyticsCreateJobWizardDependentVariableSelect loaded')
      .waitFor({ state: 'visible' });
    // The dependent variable selector is an OptionsListPopover (EuiSelectable), not a standard
    // EUI ComboBox.  Opening it by clicking comboBoxInput reveals an optionsListFilterInput
    // (the EuiSelectable built-in search) and individual options keyed by
    // data-test-subj="optionsListControlSelection-{field}".  Typing into optionsListFilterInput
    // filters the list; clicking the matching row commits the selection and closes the popover.
    await this.page.testSubj
      .locator('~mlAnalyticsCreateJobWizardDependentVariableSelect')
      .locator('[data-test-subj="comboBoxInput"]')
      .click();
    const filterInput = this.page.testSubj.locator('optionsListFilterInput');
    await filterInput.waitFor({ state: 'visible' });
    await filterInput.fill(variable);
    const option = this.page.testSubj.locator(`optionsListControlSelection-${variable}`);
    await option.waitFor({ state: 'visible' });
    await option.click();
  }

  async setTrainingPercent(percent: number): Promise<void> {
    const slider = this.page.testSubj.locator('mlAnalyticsCreateJobWizardTrainingPercentSlider');
    await slider.waitFor({ state: 'visible' });
    await slider.fill(String(percent));
    // Hard fail if EUI ignores the native fill (e.g. only responds to keyboard events).
    // The fix in that case is a deterministic Home + N×ArrowRight sequence, not the old loop.
    const actual = Number(await slider.getAttribute('value'));
    if (actual !== percent) {
      throw new Error(
        `setTrainingPercent: fill() did not take — expected ${percent}, got ${actual}. ` +
          `Check whether the EUI slider requires keyboard interaction instead.`
      );
    }
  }

  // ── Map view: job badge & details flyout (regression) ─────────────────────

  async openMapJobBadge(jobId: string): Promise<void> {
    await this.page.testSubj.locator(`mlAnalyticsIdSelectionBadge-${jobId}`).click();
    await this.page.testSubj
      .locator(`mlAnalyticsJobDetailsFlyoutButton-${jobId}`)
      .waitFor({ state: 'visible' });
  }

  async openMapJobDetailsFlyout(jobId: string): Promise<void> {
    await this.page.testSubj.locator(`mlAnalyticsJobDetailsFlyoutButton-${jobId}`).click();
    await this.page.testSubj.locator('analyticsDetailsFlyout').waitFor({ state: 'visible' });
    await this.page.testSubj
      .locator(`analyticsDetailsFlyout-${jobId}`)
      .waitFor({ state: 'visible' });
  }

  // ── Field-stats flyout ────────────────────────────────────────────────────

  /**
   * Opens the field-stats flyout for a field available in the dependent-variable
   * combo box drop-down. Waits for options to be loaded before clicking the
   * inspect button so the trigger is reliably present.
   */
  async openFieldStatsFlyoutFromDependentVariableInput(fieldName: string): Promise<void> {
    await this.page.testSubj
      .locator('mlAnalyticsCreateJobWizardDependentVariableSelect loaded')
      .waitFor({ state: 'visible' });
    await this.page.testSubj
      .locator('~mlAnalyticsCreateJobWizardDependentVariableSelect')
      .locator('[data-test-subj="comboBoxInput"]')
      .click();
    const inspectBtn = this.page.testSubj.locator(`mlInspectFieldStatsButton-${fieldName}`);
    await inspectBtn.waitFor({ state: 'visible' });
    await inspectBtn.click();
    await this.page.testSubj.locator('mlFieldStatsFlyout').waitFor({ state: 'visible' });
    // The combo box dropdown was opened to access the inspect button and is still open.
    // Press Escape to close it so subsequent selectDependentVariable() calls start from a
    // clean state. Escape dismisses the EUI ComboBox dropdown but does not close the push
    // flyout (which ignores Escape by design).
    await this.page.keyboard.press('Escape');
  }

  /**
   * Opens the field-stats flyout for a field in the include-fields table.
   * Mirrors the outlier spec's selector pattern.
   */
  async openFieldStatsFlyoutFromIncludeFields(fieldName: string): Promise<void> {
    await this.page.testSubj
      .locator('mlAnalyticsCreateJobWizardIncludesSelect')
      .scrollIntoViewIfNeeded();
    await this.page.testSubj
      .locator(
        `~mlAnalyticsCreateJobWizardIncludesSelect > ~mlInspectFieldStatsButton-${fieldName}`
      )
      .click();
    await this.page.testSubj.locator('mlFieldStatsFlyout').waitFor({ state: 'visible' });
  }

  /** Closes the field-stats flyout via its footer button and waits for it to be hidden. */
  async closeFieldStatsFlyout(): Promise<void> {
    await this.page.testSubj.locator('mlFieldStatsFlyoutCloseButton').click();
    await this.page.testSubj.locator('mlFieldStatsFlyout').waitFor({ state: 'hidden' });
  }

  // ── Edit flyout ───────────────────────────────────────────────────────────

  async editDescription(desc: string): Promise<void> {
    const input = this.page.testSubj.locator('mlAnalyticsEditFlyoutDescriptionInput');
    await input.clear();
    await input.fill(desc);
  }

  async editModelMemoryLimit(mml: string): Promise<void> {
    const input = this.page.testSubj.locator('mlAnalyticsEditFlyoutmodelMemoryLimitInput');
    await input.clear();
    await input.fill(mml);
  }

  async submitEdit(): Promise<void> {
    await this.page.testSubj.locator('mlAnalyticsEditFlyoutUpdateButton').click();
    await this.page.testSubj.locator('mlAnalyticsEditFlyout').waitFor({ state: 'hidden' });
  }

  // ── Clone flow ────────────────────────────────────────────────────────────

  /**
   * Opens the actions menu for the given job and clicks Clone, then waits for
   * the creation wizard to be visible. Hides the multi-step open-menu sequence
   * that would otherwise repeat across each clone test.
   */
  async cloneJob(jobId: string): Promise<void> {
    await this.openActionsMenu(jobId);
    await this.page.testSubj.locator('mlAnalyticsJobCloneButton').click();
    await this.page.testSubj.locator('mlAnalyticsCreationContainer').waitFor({ state: 'visible' });
  }

  // ── Results view ──────────────────────────────────────────────────────────

  /**
   * Opens the feature importance popover for the first feature-importance cell
   * in the exploration data grid. Uses hover to reveal the cell action button,
   * then clicks it and waits for the popover to appear.
   *
   * Identifies the cell by data-gridcell-column-id containing "feature_importance"
   * (a stable EUI DataGrid attribute) rather than a CSS class name.
   *
   * The exploration page layout places the Results data grid below the
   * EvaluatePanel and FeatureImportanceSummaryPanel sections. After
   * expandFeatureImportanceSection() scrolls the page to the summary section,
   * the Results grid (regression in particular) may be partially off-screen.
   * In headless Playwright, EUI DataGrid's VariableSizeGrid can render no cells
   * when its container reports a zero width. Scrolling the wrapper back into the
   * viewport first allows the ResizeObserver to recompute the width and render
   * the cells. We then wait directly for the feature importance cell to become
   * visible rather than using an intermediate sentinel, which avoids selector
   * fragility with EUI's internal data-gridcell-column-index attribute.
   */
  async openFeatureImportancePopover(): Promise<void> {
    const dataGrid = this.page.testSubj.locator('mlExplorationDataGrid loaded');

    // Bring the grid into the viewport. For regression, the evaluate panel is
    // shorter than for classification, so the results grid scrolls further off-
    // screen after expandFeatureImportanceSection(). Without this step the EUI
    // VariableSizeGrid sees finalWidth=0 and renders no cells.
    await dataGrid.scrollIntoViewIfNeeded();

    // data-gridcell-column-id is set by EUI DataGrid to the column's id string.
    // All feature-importance columns contain "feature_importance" in their id
    // (e.g. "ml.feature_importance", "ml_central_air.feature_importance").
    // Row index 0 targets the first data row (header cells carry row index -1).
    // We wait up to 20 s to accommodate the two-step EUI render cycle: first
    // VariableSizeGrid mounts (finalWidth > 0), then rows appear once the header
    // resize observer fires (headerRowHeight > 0).
    const featureImportanceCell = this.page.locator(
      '[data-gridcell-row-index="0"][data-gridcell-column-id*="feature_importance"]'
    );
    await featureImportanceCell.waitFor({ state: 'visible', timeout: 20_000 });
    await featureImportanceCell.scrollIntoViewIfNeeded();
    await featureImportanceCell.hover();
    // Hover reveals a single interaction button inside the cell.
    const button = featureImportanceCell.locator('button');
    await button.waitFor({ state: 'visible' });
    await button.click();
    await this.page.testSubj.locator('mlDFAFeatureImportancePopover').waitFor({ state: 'visible' });
  }

  /**
   * Expands the "Feature Importance Summary" section if it is collapsed, then
   * waits for the content to be visible. Extracted from specs to avoid
   * repeating the same conditional-toggle sequence across multiple tests.
   */
  async expandFeatureImportanceSection(): Promise<void> {
    await this.page.testSubj
      .locator('mlDFExpandableSection-FeatureImportanceSummary')
      .scrollIntoViewIfNeeded();
    const content = this.page.testSubj.locator(
      'mlDFExpandableSection-FeatureImportanceSummary-content'
    );
    if (!(await content.isVisible())) {
      await this.page.testSubj
        .locator('mlDFExpandableSection-FeatureImportanceSummary-toggle-button')
        .click();
    }
    await content.waitFor({ state: 'visible' });
  }

  /**
   * Clicks the pagination button for page {@link pageNum} (1-based) on the
   * exploration data grid and waits for the grid to reload.
   */
  async selectResultsTablePage(pageNum: number): Promise<void> {
    // EUI pagination uses a 0-based index in the data-test-subj.
    // Chain two locator calls: first scope to the grid, then find the button.
    await this.page.testSubj
      .locator('mlExplorationDataGrid loaded')
      .locator(`[data-test-subj="pagination-button-${pageNum - 1}"]`)
      .click();
    await this.page.testSubj.locator('mlExplorationDataGrid loaded').waitFor({ state: 'visible' });
  }

  /**
   * Toggles the histogram chart preview on or off. Reads the current
   * aria-pressed state to avoid a redundant click.
   */
  async toggleHistogramCharts(enable: boolean): Promise<void> {
    const button = this.page.testSubj.locator('mlExplorationDataGridHistogramButton');
    const isPressed = (await button.getAttribute('aria-pressed')) === 'true';
    if (isPressed !== enable) {
      await button.click();
    }
  }

  /**
   * Returns the observable state for the per-column histogram chart container
   * so the spec can assert chartContainerVisible, histogramVisible, id text,
   * and optional legend text without duplicating brittle selector sequences.
   */
  async getHistogramChartState(columnId: string): Promise<{
    chartContainerVisible: boolean;
    histogramVisible: boolean;
    idText: string;
    legendText: string;
  }> {
    const container = this.page.testSubj.locator(`mlDataGridChart-${columnId}`);
    const chartContainerVisible = await container.isVisible();

    if (!chartContainerVisible) {
      return { chartContainerVisible: false, histogramVisible: false, idText: '', legendText: '' };
    }

    const histogramVisible = await this.page.testSubj
      .locator(`mlDataGridChart-${columnId}-histogram`)
      .isVisible();
    const idText = (
      await this.page.testSubj.locator(`mlDataGridChart-${columnId}-id`).innerText()
    ).trim();

    let legendText = '';
    const legendLocator = this.page.testSubj.locator(`mlDataGridChart-${columnId}-legend`);
    if (await legendLocator.isVisible()) {
      legendText = (await legendLocator.innerText()).trim();
    }

    return { chartContainerVisible, histogramVisible, idText, legendText };
  }

  /**
   * Opens the EUI DataGrid column sort popover, adds {@link columnId} as a
   * sort key with the given direction, then closes the popover.
   */
  async setSortColumn(columnId: string, direction: 'asc' | 'desc'): Promise<void> {
    // Open the sort popover via the grid's toolbar button
    await this.page.testSubj
      .locator('mlExplorationDataGrid loaded')
      .locator('[data-test-subj="dataGridColumnSortingButton"]')
      .click();
    // "Pick fields to sort by" button opens the column selection list
    await this.page.testSubj
      .locator('dataGridColumnSortingSelectionButton')
      .waitFor({ state: 'visible' });
    await this.page.testSubj.locator('dataGridColumnSortingSelectionButton').click();
    // Select the column to sort by
    await this.page.testSubj
      .locator(`dataGridColumnSortingPopoverColumnSelection-${columnId}`)
      .click();
    // Click the desired direction
    await this.page.testSubj
      .locator(`euiDataGridColumnSorting-sortColumn-${columnId}-${direction}`)
      .click();
    // Close the popover
    await this.page.keyboard.press('Escape');
  }

  /**
   * Opens the EUI DataGrid column selector and clicks "Show all", then closes
   * the panel.
   */
  async showAllColumns(): Promise<void> {
    await this.page.testSubj
      .locator('mlExplorationDataGrid loaded')
      .locator('[data-test-subj="dataGridColumnSelectorButton"]')
      .click();
    await this.page.testSubj.locator('dataGridColumnSelectorShowAllButton').click();
    await this.page.keyboard.press('Escape');
  }

  /**
   * Opens the EUI DataGrid column selector and clicks "Hide all", then closes
   * the panel.
   */
  async hideAllColumns(): Promise<void> {
    await this.page.testSubj
      .locator('mlExplorationDataGrid loaded')
      .locator('[data-test-subj="dataGridColumnSelectorButton"]')
      .click();
    await this.page.testSubj.locator('dataGridColumnSelectorHideAllButton').click();
    await this.page.keyboard.press('Escape');
  }

  /**
   * Clicks the "Explore in custom visualization" link in the scatterplot matrix
   * section. The caller must assert that `visualizationLoader` is visible after
   * this call (navigation occurs; no return is needed).
   */
  async clickExploreInCustomVisualization(): Promise<void> {
    await this.page.testSubj.locator('mlSplomExploreInCustomVisualizationLink').click();
  }

  // ── Custom URLs tab ───────────────────────────────────────────────────────

  async openCustomUrlsTab(): Promise<void> {
    await this.page.testSubj.locator('mlEditAnalyticsJobFlyout-customUrls').click();
    await this.page.testSubj.locator('mlJobOpenCustomUrlFormButton').waitFor({ state: 'visible' });
  }

  private async openCustomUrlEditor(): Promise<void> {
    await this.page.testSubj.locator('mlJobOpenCustomUrlFormButton').click();
    await this.page.testSubj.locator('mlJobCustomUrlForm').waitFor({ state: 'visible' });
  }

  private async selectRadioOption(groupTestSubj: string, value: string): Promise<void> {
    await this.page.testSubj.locator(groupTestSubj).locator(`label[for="${value}"]`).click();
  }

  async addDiscoverCustomUrl(config: {
    label: string;
    indexName: string;
    queryEntityFieldNames: string[];
  }): Promise<void> {
    await this.openCustomUrlEditor();
    await this.page.testSubj.locator('mlJobCustomUrlLabelInput').fill(config.label);
    await this.selectRadioOption('mlJobCustomUrlLinkToTypeInput', 'KIBANA_DISCOVER');
    // EuiSelect — select by visible label text
    await this.page.testSubj
      .locator('mlJobCustomUrlDiscoverIndexPatternInput')
      .selectOption({ label: config.indexName });
    // Query entities combobox
    if (config.queryEntityFieldNames.length > 0) {
      const entitiesCombo = new EuiComboBoxWrapper(this.page, 'mlJobCustomUrlQueryEntitiesInput');
      await entitiesCombo.selectMultiOptions(config.queryEntityFieldNames);
    }
    await this.page.testSubj.locator('mlJobAddCustomUrl').click();
    // Wait for the form editor to close, indicating the URL was added to the list
    await this.page.testSubj.locator('mlJobCustomUrlForm').waitFor({ state: 'hidden' });
  }

  async addDashboardCustomUrl(config: {
    label: string;
    dashboardName: string;
    queryEntityFieldNames: string[];
  }): Promise<void> {
    await this.openCustomUrlEditor();
    await this.page.testSubj.locator('mlJobCustomUrlLabelInput').fill(config.label);
    await this.selectRadioOption('mlJobCustomUrlLinkToTypeInput', 'KIBANA_DASHBOARD');
    // Dashboard selector is an EuiSelect (native <select>), not a ComboBox
    await this.page.testSubj
      .locator('mlJobCustomUrlDashboardNameInput')
      .selectOption({ label: config.dashboardName });
    // Query entities combobox
    if (config.queryEntityFieldNames.length > 0) {
      const entitiesCombo = new EuiComboBoxWrapper(this.page, 'mlJobCustomUrlQueryEntitiesInput');
      await entitiesCombo.selectMultiOptions(config.queryEntityFieldNames);
    }
    await this.page.testSubj.locator('mlJobAddCustomUrl').click();
    // Wait for the form editor to close, indicating the URL was added to the list
    await this.page.testSubj.locator('mlJobCustomUrlForm').waitFor({ state: 'hidden' });
  }

  async addOtherTypeCustomUrl(config: { label: string; url: string }): Promise<void> {
    await this.openCustomUrlEditor();
    await this.page.testSubj.locator('mlJobCustomUrlLabelInput').fill(config.label);
    await this.selectRadioOption('mlJobCustomUrlLinkToTypeInput', 'OTHER');
    await this.page.testSubj.locator('mlJobCustomUrlOtherTypeUrlInput').fill(config.url);
    await this.page.testSubj.locator('mlJobAddCustomUrl').click();
    // Wait for the form editor to close, indicating the URL was added to the list
    await this.page.testSubj.locator('mlJobCustomUrlForm').waitFor({ state: 'hidden' });
  }
}
