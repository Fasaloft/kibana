/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _ from 'lodash';
import d3 from 'd3';
import $ from 'jquery';

import { Axis } from './axis';
import { VisConfig } from '../vis_config';
import { getMockUiState } from '../../../fixtures/mocks';

const YAxis = Axis;
let mockUiState;
let el;
let buildYAxis;
let yAxis;
let yAxisDiv;

const timeSeries = [
  1408734060000,
  1408734090000,
  1408734120000,
  1408734150000,
  1408734180000,
  1408734210000,
  1408734240000,
  1408734270000,
  1408734300000,
  1408734330000,
];

const defaultGraphData = [
  [8, 23, 30, 28, 36, 30, 26, 22, 29, 24],
  [2, 13, 20, 18, 26, 20, 16, 12, 19, 14],
];

function makeSeriesData(data) {
  return timeSeries.map(function (timestamp, i) {
    return {
      x: timestamp,
      y: data[i] || 0,
    };
  });
}

function createData(seriesData) {
  const data = {
    hits: 621,
    label: 'test',
    ordered: {
      date: true,
      interval: 30000,
      max: 1408734982458,
      min: 1408734082458,
    },
    series: seriesData.map(function (series) {
      return { values: makeSeriesData(series) };
    }),
    xAxisLabel: 'Date Histogram',
    yAxisLabel: 'Count',
  };

  const node = $('<div>')
    .css({
      height: 40,
      width: 40,
    })
    .appendTo('body')
    .addClass('y-axis-wrapper')
    .get(0);

  el = d3.select(node).datum(data);

  yAxisDiv = el.append('div').attr('class', 'y-axis-div');

  buildYAxis = function (params) {
    const visConfig = new VisConfig(
      {
        type: 'heatmap',
      },
      data,
      mockUiState,
      node,
      () => undefined
    );
    return new YAxis(
      visConfig,
      _.merge(
        {},
        {
          id: 'ValueAxis-1',
          type: 'value',
          scale: {
            defaultYMin: true,
            setYExtents: false,
          },
        },
        params
      )
    );
  };

  yAxis = buildYAxis();
}

describe('Vislib yAxis Class Test Suite', function () {
  beforeEach(() => {
    mockUiState = getMockUiState();
    expect($('.y-axis-wrapper')).toHaveLength(0);
  });

  afterEach(function () {
    if (el) {
      el.remove();
      yAxisDiv.remove();
    }
  });

  describe('render Method', function () {
    beforeEach(function () {
      createData(defaultGraphData);
      yAxis.render();
    });

    it('should append an svg to div', function () {
      expect(el.selectAll('svg').length).toBe(1);
    });

    it('should append a g element to the svg', function () {
      expect(el.selectAll('svg').select('g').length).toBe(1);
    });

    it('should append ticks with text', function () {
      expect(!!el.selectAll('svg').selectAll('.tick text')).toBe(true);
    });
  });

  describe('getYScale Method', function () {
    let yScale;
    let graphData;
    let domain;
    const height = 50;

    function checkDomain(min, max) {
      const domain = yScale.domain();
      expect(domain[0]).toBeLessThan(min + 1);
      expect(domain[1]).toBeGreaterThan(max - 1);
      return domain;
    }

    function checkRange() {
      expect(yScale.range()[0]).toBe(height);
      expect(yScale.range()[1]).toBe(0);
    }

    describe('API', function () {
      beforeEach(function () {
        createData(defaultGraphData);
        yAxis.getAxis(height);
        yScale = yAxis.getScale();
      });

      it('should return a function', function () {
        expect(_.isFunction(yScale)).toBe(true);
      });
    });

    describe('positive values', function () {
      beforeEach(function () {
        graphData = defaultGraphData;
        createData(graphData);
        yAxis.getAxis(height);
        yScale = yAxis.getScale();
      });

      it('should have domain between 0 and max value', function () {
        const min = 0;
        const max = _.max(_.flattenDeep(graphData));
        const domain = checkDomain(min, max);
        expect(domain[1]).toBeGreaterThan(0);
        checkRange();
      });
    });

    describe('negative values', function () {
      beforeEach(function () {
        graphData = [
          [-8, -23, -30, -28, -36, -30, -26, -22, -29, -24],
          [-22, -8, -30, -4, 0, 0, -3, -22, -14, -24],
        ];
        createData(graphData);
        yAxis.getAxis(height);
        yScale = yAxis.getScale();
      });

      it('should have domain between min value and 0', function () {
        const min = _.min(_.flattenDeep(graphData));
        const max = 0;
        const domain = checkDomain(min, max);
        expect(domain[0]).toBeLessThan(0);
        checkRange();
      });
    });

    describe('positive and negative values', function () {
      beforeEach(function () {
        graphData = [
          [8, 23, 30, 28, 36, 30, 26, 22, 29, 24],
          [22, 8, -30, -4, 0, 0, 3, -22, 14, 24],
        ];
        createData(graphData);
        yAxis.getAxis(height);
        yScale = yAxis.getScale();
      });

      it('should have domain between min and max values', function () {
        const min = _.min(_.flattenDeep(graphData));
        const max = _.max(_.flattenDeep(graphData));
        const domain = checkDomain(min, max);
        expect(domain[0]).toBeLessThan(0);
        expect(domain[1]).toBeGreaterThan(0);
        checkRange();
      });
    });

    describe('validate user defined values', function () {
      beforeEach(function () {
        createData(defaultGraphData);
        yAxis.axisConfig.set('scale.stacked', true);
        yAxis.axisConfig.set('scale.setYExtents', false);
        yAxis.getAxis(height);
        yScale = yAxis.getScale();
      });

      it('should throw a NaN error', function () {
        const min = 'Not a number';
        const max = 12;

        expect(function () {
          yAxis.axisScale.validateUserExtents(min, max);
        }).toThrow();
      });

      it('should return a decimal value', function () {
        yAxis.axisConfig.set('scale.mode', 'percentage');
        yAxis.axisConfig.set('scale.setYExtents', true);
        yAxis.getAxis(height);
        domain = [];
        domain[0] = 20;
        domain[1] = 80;
        const newDomain = yAxis.axisScale.validateUserExtents(domain);

        expect(newDomain[0]).toBe(domain[0] / 100);
        expect(newDomain[1]).toBe(domain[1] / 100);
      });

      it('should return the user defined value', function () {
        domain = [20, 50];
        const newDomain = yAxis.axisScale.validateUserExtents(domain);

        expect(newDomain[0]).toBe(domain[0]);
        expect(newDomain[1]).toBe(domain[1]);
      });
    });

    describe('should throw an error when', function () {
      it('min === max', function () {
        const min = 12;
        const max = 12;

        expect(function () {
          yAxis.axisScale.validateAxisExtents(min, max);
        }).toThrow();
      });

      it('min > max', function () {
        const min = 30;
        const max = 10;

        expect(function () {
          yAxis.axisScale.validateAxisExtents(min, max);
        }).toThrow();
      });
    });
  });

  describe('getScaleType method', function () {
    const fnNames = ['linear', 'log', 'square root'];

    it('should return a function', function () {
      fnNames.forEach(function (fnName) {
        expect(yAxis.axisScale.getD3Scale(fnName)).toEqual(expect.any(Function));
      });

      // if no value is provided to the function, scale should default to a linear scale
      expect(yAxis.axisScale.getD3Scale()).toEqual(expect.any(Function));
    });

    it('should throw an error if function name is undefined', function () {
      expect(function () {
        yAxis.axisScale.getD3Scale('square');
      }).toThrow();
    });
  });

  describe('_logDomain method', function () {
    it('should throw an error', function () {
      expect(function () {
        yAxis.axisScale.logDomain(-10, -5);
      }).toThrow();
      expect(function () {
        yAxis.axisScale.logDomain(-10, 5);
      }).toThrow();
      expect(function () {
        yAxis.axisScale.logDomain(0, -5);
      }).toThrow();
    });

    it('should return a yMin value of 1', function () {
      const yMin = yAxis.axisScale.logDomain(0, 200)[0];
      expect(yMin).toBe(1);
    });
  });

  describe('getYAxis method', function () {
    let yMax;
    beforeEach(function () {
      createData(defaultGraphData);
      yMax = yAxis.yMax;
    });

    afterEach(function () {
      yAxis.yMax = yMax;
      yAxis = buildYAxis();
    });

    it('should use decimal format for small values', function () {
      yAxis.yMax = 1;
      const tickFormat = yAxis.getAxis().tickFormat();
      expect(tickFormat(0.8)).toBe('0.8');
    });
  });

  describe('draw Method', function () {
    beforeEach(function () {
      createData(defaultGraphData);
    });

    it('should be a function', function () {
      expect(_.isFunction(yAxis.draw())).toBe(true);
    });
  });

  describe('tickScale Method', function () {
    beforeEach(function () {
      createData(defaultGraphData);
    });

    it('should return the correct number of ticks', function () {
      expect(yAxis.tickScale(1000)).toBe(11);
      expect(yAxis.tickScale(40)).toBe(3);
      expect(yAxis.tickScale(20)).toBe(0);
    });
  });
});
