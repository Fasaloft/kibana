/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CONTAINS_SPACES_KEY, ILLEGAL_CHARACTERS_KEY, ILLEGAL_CHARACTERS_VISIBLE } from './types';

import { validateDataView } from './validate_index_pattern';

describe('Index Pattern Utils', () => {
  describe('Validation', () => {
    it('should not allow space in the pattern', () => {
      const errors = validateDataView('my pattern');
      expect(errors[CONTAINS_SPACES_KEY]).toBe(true);
    });

    it('should not allow illegal characters', () => {
      ILLEGAL_CHARACTERS_VISIBLE.forEach((char) => {
        const errors = validateDataView(`pattern${char}`);
        expect(errors[ILLEGAL_CHARACTERS_KEY]).toEqual([char]);
      });
    });

    it('should return empty object when there are no errors', () => {
      expect(validateDataView('my-pattern-*')).toEqual({});
    });
  });
});
