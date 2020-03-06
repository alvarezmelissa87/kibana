/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// import { difference } from 'lodash';
import Boom from 'boom';
import { IScopedClusterClient } from 'src/core/server';

export class AnalyticsManager {
  private _client: IScopedClusterClient['callAsCurrentUser'];

  constructor(client: any) {
    this._client = client;
  }

  private isDuplicateElement(analyticsId: string, elements: any[]) {
    let isDuplicate = false;
    elements.forEach((elem: any) => {
      if (elem.data.label === analyticsId && elem.data.type === 'analytics') {
        isDuplicate = true;
      }
    });
    return isDuplicate;
  }

  private async getNextLink(index: string) {
    if (index === undefined) {
      throw Boom.notFound(`Index with the id "${index}" not found`);
    }

    try {
      const sourceResp = await this._client('indices.get', {
        index,
      });

      if (index.includes('*')) {
        return { isIndexPattern: true, indexData: sourceResp };
      } else if (!index.includes('*')) {
        const meta = sourceResp[index].mappings._meta;

        if (meta === undefined) {
          return { isIndexPattern: true, indexData: sourceResp };
        }

        if (meta.created_by === 'data-frame-analytics') {
          // fetch job associated with this index
          const resp = await this._client('ml.getDataFrameAnalytics', {
            analyticsId: meta.analytics,
          });
          const jobData = resp?.data_frame_analytics[0];

          return { jobData, isJob: true };
        } else if (meta.created_by === 'transform') {
          // fetch transform so we can get original index pattern
          const transformId = meta._transform?.transform;
          const transform = await this._client('transport.request', {
            path: `/_transform/${transformId}`,
            method: 'GET',
          });
          const transformData = transform?.transforms[0];

          return { transformData, isTransform: true };
        }
      }
    } catch (error) {
      throw Boom.badData(error.message ? error.message : error);
    }
  }

  /**
   * Works backward from jobId to return related jobs from source indices
   * @param jobId
   * @returns {Promise<*>}
   */
  async getAnalyticsMap(analyticsId: string) {
    const result: any = { elements: [], details: {}, error: null };

    try {
      const resp = await this._client('ml.getDataFrameAnalytics', {
        analyticsId,
      });
      let data = resp?.data_frame_analytics[0];
      let sourceIndex = data?.source?.index[0];
      let complete = false;
      let link: any = {};
      let count = 0;
      let rootTransform;
      let rootIndexPattern;

      result.elements.push({
        data: { id: data.id, label: data.id, type: 'analytics' },
      });
      result.details[data.id] = data;
      // Add a safeguard against infinite loops.
      while (complete === false) {
        count++;
        if (count >= 50) {
          break;
        }

        link = await this.getNextLink(sourceIndex);

        if (link.isIndexPattern === true) {
          const indexPatternType = 'index-pattern';
          const nodeId = `${sourceIndex}-${indexPatternType}`;
          result.elements.unshift({
            data: { id: nodeId, label: sourceIndex, type: indexPatternType },
          });
          result.details[nodeId] = data;
          rootIndexPattern = sourceIndex;
          complete = true;
        } else if (link.isJob === true) {
          data = link.jobData;

          const analyticsType = 'analytics';
          const nodeId = `${data.id}-${analyticsType}`;

          result.elements.unshift({
            data: { id: nodeId, label: data.id, type: analyticsType },
          });
          result.details[nodeId] = data;
          sourceIndex = data?.source?.index[0];
        } else if (link.isTransform === true) {
          data = link.transformData;

          const transformType = 'transform';
          const nodeId = `${data.id}-${transformType}`;
          rootTransform = data.id;

          result.elements.unshift({
            data: { id: nodeId, label: data.id, type: transformType },
          });
          result.details[nodeId] = data;
          sourceIndex = data?.source?.index[0];
        }
      } // end while

      // create edge elements
      const elemLength = result.elements.length - 1;
      for (let i = 0; i < elemLength; i++) {
        const currentElem = result.elements[i];
        const nextElem = result.elements[i + 1];
        result.elements.push({
          data: { source: currentElem.data.id, target: nextElem.data.id },
        });
      }

      // fetch all jobs associated with root transform if defined, otherwise check root index
      if (rootTransform !== undefined || rootIndexPattern !== undefined) {
        const transformJobs = await this._client('ml.getDataFrameAnalytics');
        const jobs = transformJobs?.data_frame_analytics || [];
        const comparator = rootTransform !== undefined ? rootTransform : rootIndexPattern;

        for (let i = 0; i < jobs.length; i++) {
          // match source and destination in case id same as index id
          if (
            jobs[i]?.source?.index[0] === comparator &&
            this.isDuplicateElement(jobs[i].id, result.elements) === false
          ) {
            result.elements.push({
              data: { id: jobs[i].id, label: jobs[i].id, type: 'analytics' },
            });
            result.details[jobs[i].id] = data;
            result.elements.push({
              data: {
                source: `${comparator}-${rootTransform ? 'transform' : 'index-pattern'}`,
                target: jobs[i].id,
              },
            });
          }
        }
      }

      return result;
    } catch (error) {
      result.error = error.message || 'Something went wrong';
      return result;
    }
  }
}
