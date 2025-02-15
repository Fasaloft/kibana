/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getNewRule } from '../../objects/rule';
import { ALERTS_COUNT, SELECTED_ALERTS, TAKE_ACTION_POPOVER_BTN } from '../../screens/alerts';

import {
  closeFirstAlert,
  closeAlerts,
  goToClosedAlerts,
  goToOpenedAlerts,
  openAlerts,
  selectNumberOfAlerts,
  waitForAlertsPanelToBeLoaded,
  waitForAlerts,
  waitForAlertsIndexToBeCreated,
} from '../../tasks/alerts';
import { createCustomRuleActivated, deleteCustomRule } from '../../tasks/api_calls/rules';
import { cleanKibana } from '../../tasks/common';
import { waitForAlertsToPopulate } from '../../tasks/create_new_rule';
import { loginAndWaitForPage } from '../../tasks/login';
import { refreshPage } from '../../tasks/security_header';

import { ALERTS_URL } from '../../urls/navigation';

describe('Closing alerts', () => {
  beforeEach(() => {
    cleanKibana();
    loginAndWaitForPage(ALERTS_URL);
    waitForAlertsPanelToBeLoaded();
    waitForAlertsIndexToBeCreated();
    createCustomRuleActivated(getNewRule(), '1', '100m', 100);
    refreshPage();
    waitForAlertsToPopulate(100);
    deleteCustomRule();
  });

  it('Closes and opens alerts', () => {
    const numberOfAlertsToBeClosed = 3;
    cy.get(ALERTS_COUNT)
      .invoke('text')
      .then((alertNumberString) => {
        const numberOfAlerts = alertNumberString.split(' ')[0];
        cy.get(ALERTS_COUNT).should('have.text', `${numberOfAlerts} alerts`);

        selectNumberOfAlerts(numberOfAlertsToBeClosed);

        cy.get(SELECTED_ALERTS).should('have.text', `Selected ${numberOfAlertsToBeClosed} alerts`);

        closeAlerts();
        waitForAlerts();

        const expectedNumberOfAlertsAfterClosing = +numberOfAlerts - numberOfAlertsToBeClosed;
        cy.get(ALERTS_COUNT).should('have.text', `${expectedNumberOfAlertsAfterClosing} alerts`);

        goToClosedAlerts();
        waitForAlerts();

        cy.get(ALERTS_COUNT).should('have.text', `${numberOfAlertsToBeClosed} alerts`);

        const numberOfAlertsToBeOpened = 1;
        selectNumberOfAlerts(numberOfAlertsToBeOpened);

        cy.get(SELECTED_ALERTS).should('have.text', `Selected ${numberOfAlertsToBeOpened} alert`);

        openAlerts();
        waitForAlerts();

        const expectedNumberOfClosedAlertsAfterOpened = 2;
        cy.get(ALERTS_COUNT).should(
          'have.text',
          `${expectedNumberOfClosedAlertsAfterOpened} alerts`
        );

        goToOpenedAlerts();
        waitForAlerts();

        const expectedNumberOfOpenedAlerts =
          +numberOfAlerts - expectedNumberOfClosedAlertsAfterOpened;

        cy.get(ALERTS_COUNT).should('have.text', `${expectedNumberOfOpenedAlerts} alerts`);
      });
  });

  it('Closes one alert when more than one opened alerts are selected', () => {
    cy.get(ALERTS_COUNT)
      .invoke('text')
      .then((alertNumberString) => {
        const numberOfAlerts = alertNumberString.split(' ')[0];
        const numberOfAlertsToBeClosed = 1;
        const numberOfAlertsToBeSelected = 3;

        cy.get(TAKE_ACTION_POPOVER_BTN).should('not.exist');
        selectNumberOfAlerts(numberOfAlertsToBeSelected);
        cy.get(TAKE_ACTION_POPOVER_BTN).should('exist');

        closeFirstAlert();
        waitForAlerts();

        const expectedNumberOfAlerts = +numberOfAlerts - numberOfAlertsToBeClosed;
        cy.get(ALERTS_COUNT).should('have.text', `${expectedNumberOfAlerts} alerts`);

        goToClosedAlerts();
        waitForAlerts();

        cy.get(ALERTS_COUNT).should('have.text', `${numberOfAlertsToBeClosed} alert`);
      });
  });
});
