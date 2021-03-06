/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getAngularModule, getServices, getUrlTracker } from '../../kibana_services';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
getAngularModule().config(($routeProvider: any) => {
  $routeProvider.otherwise({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolveRedirectTo: ($rootScope: any) => {
      const path = window.location.hash.substr(1);
      getUrlTracker().restorePreviousUrl();
      $rootScope.$applyAsync(() => {
        const { urlForwarding } = getServices();
        const { navigated } = urlForwarding.navigateToLegacyKibanaUrl(path);
        if (!navigated) {
          urlForwarding.navigateToDefaultApp();
        }
      });
      // prevent angular from completing the navigation
      return new Promise(() => {});
    },
  });
});
