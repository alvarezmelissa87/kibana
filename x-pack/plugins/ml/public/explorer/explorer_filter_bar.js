/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



/*
 * React component for rendering Explorer dashboard swimlanes.
 */

import PropTypes from 'prop-types';
import React, { Fragment, Component } from 'react';
import { injectI18n } from '@kbn/i18n/react';

import {
  EuiCallOut,
  EuiSpacer,
  EuiSearchBar
} from '@elastic/eui';

// We only accept multiselect 'or' queries from EuiSearch bar currently
// We could support and/true multiselect as well but then the syntax would be inconsistent
// queryText formats -> field:(value or otherValue) field:(value) -> optional '' around values
function querySyntaxValid(queryText) {
  const result = { valid: true };

  if (queryText === '') {
    return result;
  }

  // const acceptedQueryPattern = /^([\w.-]+:\(\'?.+\'?( or .+)*?\))/ig;
  // const slashPattern = /\//g;

  // if (slashPattern.test(queryText) === true) {
  //   result.valid = false;
  //   result.errorMessage = 'Ensure terms containing \/ are wrapped in single quotes. e.g. field:(\'/value/with/slashes\')';
  // }

  // if (acceptedQueryPattern.test(queryText) === false) {
  //   result.valid = false;
  //   result.errorMessage = 'Invalid query syntax. Accepted format - fieldName:(fieldValue) fieldName:(fieldValue or fieldValueTwo)';
  // }

  return result;
}

export const ExplorerFilterBar = injectI18n(
  class ExplorerFilterBar extends Component {
    static propTypes = {
      applyFilter: PropTypes.func.isRequired,
      influencers: PropTypes.object.isRequired,
    };

    state = {
      query: EuiSearchBar.Query.MATCH_ALL,
      error: null
    }

    influencerFields = [];

    // TODO: Validate query before calling applyFilter to ensure it's complete and fieldName/fieldValue are valid + wrap in try catch
    // TODO: wrap in SINGLE QUOTES anything with special characters in it - ensure useful error message - so if error AND validation fails
    // we set the slash message from the validator so the user knows what to change
    handleFilterChange = ({ query, queryText, error }) => {
      // Pass in queryText for validation check
      let errorMessage = null;

      if (error) {
        console.log('Error processing filter query', error);
        this.setState({
          error: { message: 'Invalid syntax. Accepted format - fieldName:(fieldValue) fieldName:(fieldValue or fieldValueTwo)' }
        });
      } else {
        const syntaxCheck = querySyntaxValid(queryText);

        if (syntaxCheck.valid === false) {
          this.setState({
            error: { message: syntaxCheck.errorMessage }
          });
          return;
        }

        const queryClauses = query.ast.clauses;

        queryClauses.forEach((clause) => {
          if (this.influencerFields.includes(clause.field) === false) {
            errorMessage = `Unknown influencer field ${clause.field ? clause.field : ''}
              (possible values: ${this.influencerFields.slice(0, 2).join(', ')})`;
          }
        });

        if (errorMessage !== null) {
          this.setState({
            error: { message: errorMessage }
          });
        } else {
          this.setState({
            error: errorMessage,
            query
          });

          this.props.applyFilter(queryClauses);
        }
      }
    }

    renderError() {
      const { error } = this.state;
      if (!error) {
        return;
      }
      return (
        <Fragment>
          <EuiSpacer size="s" />
          <EuiCallOut
            iconType="faceSad"
            color="danger"
            title={`Invalid search: ${error.message}`}
          />
          <EuiSpacer size="l" />
        </Fragment>
      );
    }

    render() {
      const { influencers } = this.props;
      const { initialQuery } = this.state;
      const filters = [];
      const urlExample = `url:('/example/url')`;
      let placeholder = `e.g. tag:(marketing or engineering) ${urlExample}`;

      if (influencers !== undefined) {
        Object.keys(influencers).forEach((influencerName, index) => {
          const options = influencers[influencerName].map((influencer) =>
            ({ value: influencer.influencerFieldValue, view: influencer.influencerFieldValue }));

          filters.push({
            type: 'field_value_selection',
            field: influencerName,
            name: influencerName,
            multiSelect: 'or',
            options
          });

          if (index === 0) {
            placeholder = `e.g. ${influencerName}:(${options[0].value} ${options[1] ? 'or ' + options[1].value : ''}) ${urlExample}`;
          }

          this.influencerFields.push(influencerName);
        });
      }

      return (
        <div className="mlAnomalyExploer__filterBar">
          <EuiSearchBar
            defaultQuery={initialQuery}
            box={{
              placeholder,
              incremental: false,
            }}
            filters={(filters)}
            onChange={this.handleFilterChange}
          />
          {this.renderError()}
        </div>
      );
    }
  }
);
