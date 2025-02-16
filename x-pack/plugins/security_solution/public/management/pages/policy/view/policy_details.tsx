/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { useLocation } from 'react-router-dom';
import { usePolicyDetailsSelector } from './policy_hooks';
import { policyDetails, agentStatusSummary } from '../store/policy_details/selectors';
import { AgentsSummary } from './agents_summary';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { PolicyTabs } from './tabs';
import { AdministrationListPage } from '../../../components/administration_list_page';
import { PolicyFormLayout } from './policy_forms/components';
import {
  BackToExternalAppButton,
  BackToExternalAppButtonProps,
} from '../../../components/back_to_external_app_button/back_to_external_app_button';
import { PolicyDetailsRouteState } from '../../../../../common/endpoint/types';
import { getEndpointListPath } from '../../../common/routing';
import { useAppUrl } from '../../../../common/lib/kibana';
import { APP_ID } from '../../../../../common/constants';

export const PolicyDetails = React.memo(() => {
  // TODO: Remove this and related code when removing FF
  const isTrustedAppsByPolicyEnabled = useIsExperimentalFeatureEnabled(
    'trustedAppsByPolicyEnabled'
  );
  const { state: routeState = {} } = useLocation<PolicyDetailsRouteState>();
  const { getAppUrl } = useAppUrl();

  // Store values
  const policyItem = usePolicyDetailsSelector(policyDetails);
  const policyAgentStatusSummary = usePolicyDetailsSelector(agentStatusSummary);

  // Local state
  const policyName = policyItem?.name ?? '';
  const policyDescription = policyItem?.description ?? undefined;

  const backLinkOptions = useMemo<BackToExternalAppButtonProps>(() => {
    if (routeState?.backLink) {
      return {
        onBackButtonNavigateTo: routeState.backLink.navigateTo,
        backButtonLabel: routeState.backLink.label,
        backButtonUrl: routeState.backLink.href,
      };
    }

    const endpointListPath = getEndpointListPath({ name: 'endpointList' });

    return {
      backButtonLabel: i18n.translate(
        'xpack.securitySolution.endpoint.policy.details.backToListTitle',
        {
          defaultMessage: 'Back to endpoint hosts',
        }
      ),
      backButtonUrl: getAppUrl({ path: endpointListPath }),
      onBackButtonNavigateTo: [
        APP_ID,
        {
          path: endpointListPath,
        },
      ],
    };
  }, [getAppUrl, routeState?.backLink]);

  const headerRightContent = (
    <AgentsSummary
      total={policyAgentStatusSummary?.total ?? 0}
      online={policyAgentStatusSummary?.online ?? 0}
      offline={policyAgentStatusSummary?.offline ?? 0}
      error={policyAgentStatusSummary?.error ?? 0}
    />
  );

  const backToEndpointList = (
    <BackToExternalAppButton {...backLinkOptions} data-test-subj="policyDetailsBackLink" />
  );

  return (
    <AdministrationListPage
      data-test-subj="policyDetailsPage"
      title={policyName}
      subtitle={policyDescription}
      headerBackComponent={backToEndpointList}
      actions={headerRightContent}
      restrictWidth={true}
      hasBottomBorder={!isTrustedAppsByPolicyEnabled} // TODO: Remove this and related code when removing FF
    >
      {isTrustedAppsByPolicyEnabled ? (
        <PolicyTabs />
      ) : (
        // TODO: Remove this and related code when removing FF
        <PolicyFormLayout />
      )}
    </AdministrationListPage>
  );
});

PolicyDetails.displayName = 'PolicyDetails';
