/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NewPackagePolicyInput } from '@kbn/fleet-plugin/common';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiText } from '@elastic/eui';
import type { AzureCredentialsType } from './types';
import { CAI_AZURE_INPUT_FIELDS_TEST_SUBJECTS } from '../test_subjects';
import { AZURE_CREDENTIALS_TYPE } from './constants';

export type AzureCredentialsFields = Record<
  string,
  { label: string; type?: 'password' | 'text'; testSubj?: string; isSecret?: boolean }
>;

export interface AzureOptionValue {
  label: string;
  info?: React.ReactNode;
  fields: AzureCredentialsFields;
}

export type AzureOptions = Record<AzureCredentialsType, AzureOptionValue>;

export const getAzureCredentialsFormManualOptions = (): Array<{
  value: AzureCredentialsType;
  text: string;
}> => {
  return Object.entries(getAzureCredentialsFormOptions())
    .map(([key, value]) => ({
      value: key as AzureCredentialsType,
      text: value.label,
    }))
    .filter(
      ({ value }) =>
        value !== AZURE_CREDENTIALS_TYPE.ARM_TEMPLATE && // we remove this in order to hide it from the selectable options in the manual drop down
        value !== AZURE_CREDENTIALS_TYPE.MANUAL && // TODO: remove 'manual' for stack version 8.13
        value !== AZURE_CREDENTIALS_TYPE.SERVICE_PRINCIPAL_WITH_CLIENT_USERNAME_AND_PASSWORD // this option is temporarily hidden
    );
};

export const getInputVarsFields = (input: NewPackagePolicyInput, fields: AzureCredentialsFields) =>
  Object.entries(input.streams[0].vars || {})
    .filter(([id]) => id in fields)
    .map(([id, inputVar]) => {
      const field = fields[id];
      return {
        id,
        label: field.label,
        type: field.type || 'text',
        testSubj: field.testSubj,
        value: inputVar.value,
        isSecret: field?.isSecret,
      } as const;
    });

const I18N_TENANT_ID = i18n.translate(
  'xpack.securitySolution.assetInventory.fleetIntegration.azureIntegration.tenantIdLabel',
  {
    defaultMessage: 'Tenant ID',
  }
);

const I18N_CLIENT_ID = i18n.translate(
  'xpack.securitySolution.assetInventory.fleetIntegration.azureIntegration.clientIdLabel',
  {
    defaultMessage: 'Client ID',
  }
);

export const getAzureCredentialsFormOptions = (): AzureOptions => ({
  [AZURE_CREDENTIALS_TYPE.MANAGED_IDENTITY]: {
    label: i18n.translate(
      'xpack.securitySolution.assetInventory.fleetIntegration.azureIntegration.credentialType.managedIdentityLabel',
      {
        defaultMessage: 'Managed Identity',
      }
    ),
    info: (
      <EuiText color="subdued" size="s">
        <FormattedMessage
          id="xpack.securitySolution.assetInventory.fleetIntegration.azureIntegration.credentialType.managedIdentityInfo"
          defaultMessage="Ensure the agent is deployed on a resource that supports managed identities (e.g., Azure Virtual Machines). No explicit credentials need to be provided; Azure handles the authentication."
        />
      </EuiText>
    ),
    fields: {},
  },
  [AZURE_CREDENTIALS_TYPE.ARM_TEMPLATE]: {
    label: 'ARM Template',
    info: [],
    fields: {},
  },
  // TODO: remove for stack version 8.13
  [AZURE_CREDENTIALS_TYPE.MANUAL]: {
    label: 'Manual',
    info: [],
    fields: {},
  },
  [AZURE_CREDENTIALS_TYPE.SERVICE_PRINCIPAL_WITH_CLIENT_SECRET]: {
    label: i18n.translate(
      'xpack.securitySolution.assetInventory.fleetIntegration.azureIntegration.servicePrincipalWithClientSecretLabel',
      {
        defaultMessage: 'Service principal with Client Secret',
      }
    ),
    fields: {
      'azure.credentials.tenant_id': {
        label: I18N_TENANT_ID,
        testSubj: CAI_AZURE_INPUT_FIELDS_TEST_SUBJECTS.TENANT_ID,
      },
      'azure.credentials.client_id': {
        label: I18N_CLIENT_ID,
        testSubj: CAI_AZURE_INPUT_FIELDS_TEST_SUBJECTS.CLIENT_ID,
      },
      'azure.credentials.client_secret': {
        type: 'password',
        isSecret: true,
        label: i18n.translate(
          'xpack.securitySolution.assetInventory.fleetIntegration.azureIntegration.clientSecretLabel',
          {
            defaultMessage: 'Client Secret',
          }
        ),
        testSubj: CAI_AZURE_INPUT_FIELDS_TEST_SUBJECTS.CLIENT_SECRET,
      },
    },
  },
  [AZURE_CREDENTIALS_TYPE.SERVICE_PRINCIPAL_WITH_CLIENT_CERTIFICATE]: {
    label: i18n.translate(
      'xpack.securitySolution.assetInventory.fleetIntegration.azureIntegration.servicePrincipalWithClientCertificateLabel',
      {
        defaultMessage: 'Service principal with Client Certificate',
      }
    ),
    fields: {
      'azure.credentials.tenant_id': {
        label: I18N_TENANT_ID,
        testSubj: CAI_AZURE_INPUT_FIELDS_TEST_SUBJECTS.TENANT_ID,
      },
      'azure.credentials.client_id': {
        label: I18N_CLIENT_ID,
        testSubj: CAI_AZURE_INPUT_FIELDS_TEST_SUBJECTS.CLIENT_ID,
      },
      'azure.credentials.client_certificate_path': {
        label: i18n.translate(
          'xpack.securitySolution.assetInventory.fleetIntegration.azureIntegration.clientCertificatePathLabel',
          {
            defaultMessage: 'Client Certificate Path',
          }
        ),
        testSubj: CAI_AZURE_INPUT_FIELDS_TEST_SUBJECTS.CLIENT_CERTIFICATE_PATH,
      },
      'azure.credentials.client_certificate_password': {
        type: 'password',
        isSecret: true,
        label: i18n.translate(
          'xpack.securitySolution.assetInventory.fleetIntegration.azureIntegration.clientCertificatePasswordLabel',
          {
            defaultMessage: 'Client Certificate Password',
          }
        ),
        testSubj: CAI_AZURE_INPUT_FIELDS_TEST_SUBJECTS.CLIENT_CERTIFICATE_PASSWORD,
      },
    },
  },
  [AZURE_CREDENTIALS_TYPE.SERVICE_PRINCIPAL_WITH_CLIENT_USERNAME_AND_PASSWORD]: {
    label: i18n.translate(
      'xpack.securitySolution.assetInventory.fleetIntegration.azureIntegration.servicePrincipalWithClientUsernameAndPasswordLabel',
      { defaultMessage: 'Service principal with Client Username and Password' }
    ),
    fields: {
      'azure.credentials.tenant_id': {
        label: I18N_TENANT_ID,
        testSubj: CAI_AZURE_INPUT_FIELDS_TEST_SUBJECTS.TENANT_ID,
      },
      'azure.credentials.client_id': {
        label: I18N_CLIENT_ID,
        testSubj: CAI_AZURE_INPUT_FIELDS_TEST_SUBJECTS.CLIENT_ID,
      },
      'azure.credentials.client_username': {
        label: i18n.translate(
          'xpack.securitySolution.assetInventory.fleetIntegration.azureIntegration.clientUsernameLabel',
          {
            defaultMessage: 'Client Username',
          }
        ),
        testSubj: CAI_AZURE_INPUT_FIELDS_TEST_SUBJECTS.CLIENT_USERNAME,
      },
      'azure.credentials.client_password': {
        type: 'password',
        isSecret: true,
        label: i18n.translate(
          'xpack.securitySolution.assetInventory.fleetIntegration.azureIntegration.clientPasswordLabel',
          {
            defaultMessage: 'Client Password',
          }
        ),
        testSubj: CAI_AZURE_INPUT_FIELDS_TEST_SUBJECTS.CLIENT_PASSWORD,
      },
    },
  },
});
