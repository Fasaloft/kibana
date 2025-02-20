/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { EuiContextMenuItem, EuiPortal } from '@elastic/eui';
import type { EuiStepProps } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

import type { AgentPolicy, InMemoryPackagePolicy } from '../types';

import { useAgentPolicyRefresh, useCapabilities, useLink } from '../hooks';

import { AgentEnrollmentFlyout } from './agent_enrollment_flyout';
import { ContextMenuActions } from './context_menu_actions';
import { DangerEuiContextMenuItem } from './danger_eui_context_menu_item';
import { PackagePolicyDeleteProvider } from './package_policy_delete_provider';

export const PackagePolicyActionsMenu: React.FunctionComponent<{
  agentPolicy: AgentPolicy;
  packagePolicy: InMemoryPackagePolicy;
  viewDataStep?: EuiStepProps;
  showAddAgent?: boolean;
  upgradePackagePolicyHref: string;
}> = ({ agentPolicy, packagePolicy, viewDataStep, showAddAgent, upgradePackagePolicyHref }) => {
  const [isEnrollmentFlyoutOpen, setIsEnrollmentFlyoutOpen] = useState(false);
  const { getHref } = useLink();
  const hasWriteCapabilities = useCapabilities().write;
  const refreshAgentPolicy = useAgentPolicyRefresh();
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);

  const onEnrollmentFlyoutClose = useMemo(() => {
    return () => setIsEnrollmentFlyoutOpen(false);
  }, []);

  const menuItems = [
    // FIXME: implement View package policy action
    // <EuiContextMenuItem
    //   disabled
    //   icon="inspect"
    //   onClick={() => {}}
    //   key="packagePolicyView"
    // >
    //   <FormattedMessage
    //     id="xpack.fleet.policyDetails.packagePoliciesTable.viewActionTitle"
    //     defaultMessage="View integration"
    //   />
    // </EuiContextMenuItem>,
    ...(showAddAgent
      ? [
          <EuiContextMenuItem
            icon="plusInCircle"
            onClick={() => {
              setIsActionsMenuOpen(false);
              setIsEnrollmentFlyoutOpen(true);
            }}
            key="addAgent"
          >
            <FormattedMessage
              id="xpack.fleet.epm.packageDetails.integrationList.addAgent"
              defaultMessage="Add Agent"
            />
          </EuiContextMenuItem>,
        ]
      : []),
    <EuiContextMenuItem
      disabled={!hasWriteCapabilities}
      icon="pencil"
      href={getHref('edit_integration', {
        policyId: agentPolicy.id,
        packagePolicyId: packagePolicy.id,
      })}
      key="packagePolicyEdit"
    >
      <FormattedMessage
        id="xpack.fleet.policyDetails.packagePoliciesTable.editActionTitle"
        defaultMessage="Edit integration"
      />
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      disabled={!packagePolicy.hasUpgrade}
      icon="refresh"
      href={upgradePackagePolicyHref}
    >
      <FormattedMessage
        id="xpack.fleet.policyDetails.packagePoliciesTable.upgradeActionTitle"
        defaultMessage="Upgrade integration policy"
      />
    </EuiContextMenuItem>,
    // FIXME: implement Copy package policy action
    // <EuiContextMenuItem disabled icon="copy" onClick={() => {}} key="packagePolicyCopy">
    //   <FormattedMessage
    //     id="xpack.fleet.policyDetails.packagePoliciesTable.copyActionTitle"
    //     defaultMessage="Copy integration"
    //   />
    // </EuiContextMenuItem>,
  ];

  if (!agentPolicy.is_managed) {
    menuItems.push(
      <PackagePolicyDeleteProvider agentPolicy={agentPolicy} key="packagePolicyDelete">
        {(deletePackagePoliciesPrompt) => {
          return (
            <DangerEuiContextMenuItem
              disabled={!hasWriteCapabilities}
              icon="trash"
              onClick={() => {
                deletePackagePoliciesPrompt([packagePolicy.id], refreshAgentPolicy);
              }}
            >
              <FormattedMessage
                id="xpack.fleet.policyDetails.packagePoliciesTable.deleteActionTitle"
                defaultMessage="Delete integration"
              />
            </DangerEuiContextMenuItem>
          );
        }}
      </PackagePolicyDeleteProvider>
    );
  }
  return (
    <>
      {isEnrollmentFlyoutOpen && (
        <EuiPortal>
          <AgentEnrollmentFlyout
            agentPolicy={agentPolicy}
            viewDataStep={viewDataStep}
            onClose={onEnrollmentFlyoutClose}
          />
        </EuiPortal>
      )}
      <ContextMenuActions
        isOpen={isActionsMenuOpen}
        items={menuItems}
        onChange={(isOpen) => setIsActionsMenuOpen(isOpen)}
      />
    </>
  );
};
