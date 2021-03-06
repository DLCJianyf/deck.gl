// Copyright (c) 2015 - 2017 Uber Technologies, Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

import {Layer} from '@deck.gl/core';
import GL from 'luma.gl/constants';
import {Model, Geometry, fp64} from 'luma.gl';
const {fp64LowPart} = fp64;

import vs from './scatterplot-layer-vertex.glsl';
import fs from './scatterplot-layer-fragment.glsl';

const DEFAULT_COLOR = [0, 0, 0, 255];
const DEFAULT_STROKE_COLOR = [255, 255, 255, 255];

const defaultProps = {
  radiusScale: 1,
  radiusMinPixels: 0, //  min point radius in pixels
  radiusMaxPixels: Number.MAX_SAFE_INTEGER, // max point radius in pixels
  strokeWidth: 1,
  outline: false,
  fp64: false,
  stroke: false,

  getPosition: x => x.position,
  getRadius: x => x.radius || 1,
  getColor: x => x.color || DEFAULT_COLOR,
  getStrokeColor: x => x.strokeColor || DEFAULT_STROKE_COLOR
};

export default class ScatterplotLayer extends Layer {
  getShaders(id) {
    const projectModule = this.use64bitProjection() ? 'project64' : 'project32';
    return {vs, fs, modules: [projectModule, 'picking']};
  }

  initializeState() {
    this.state.attributeManager.addInstanced({
      instancePositions: {
        size: 3,
        transition: true,
        accessor: 'getPosition'
      },
      instancePositions64xyLow: {
        size: 2,
        accessor: 'getPosition',
        update: this.calculateInstancePositions64xyLow
      },
      instanceRadius: {
        size: 1,
        transition: true,
        accessor: 'getRadius',
        defaultValue: 1
      },
      instanceColors: {
        size: 4,
        transition: true,
        type: GL.UNSIGNED_BYTE,
        accessor: 'getColor',
        defaultValue: [0, 0, 0, 255]
      },
      instanceStrokeColors: {
        size: 4,
        transition: true,
        type: GL.UNSIGNED_BYTE,
        accessor: 'getStrokeColor',
        defaultValue: [255, 255, 255, 255]
      }
    });
  }

  updateState({props, oldProps, changeFlags}) {
    super.updateState({props, oldProps, changeFlags});
    if (props.fp64 !== oldProps.fp64) {
      const {gl} = this.context;
      if (this.state.model) {
        this.state.model.delete();
      }
      this.setState({model: this._getModel(gl)});
      this.state.attributeManager.invalidateAll();
    }
  }

  draw({uniforms}) {
    const {radiusScale, radiusMinPixels, radiusMaxPixels, outline, strokeWidth, stroke} = this.props;

    if(!strokeWidth && stroke) {
      stroke = false;
      //fix when strokeWidth = 0, the graphic elements will disppear 
      if(outline) outline = false;
    }

    this.state.model.render(
      Object.assign({}, uniforms, {
        stroke: stroke ? 1 : 0,
        outline: outline || stroke ? 1 : 0,
        strokeWidth,
        radiusScale,
        radiusMinPixels,
        radiusMaxPixels
      })
    );
  }

  _getModel(gl) {
    // a square that minimally cover the unit circle
    const positions = [-1, -1, 0, -1, 1, 0, 1, 1, 0, 1, -1, 0];

    return new Model(
      gl,
      Object.assign(this.getShaders(), {
        id: this.props.id,
        geometry: new Geometry({
          drawMode: GL.TRIANGLE_FAN,
          attributes: {
            positions: new Float32Array(positions)
          }
        }),
        isInstanced: true,
        shaderCache: this.context.shaderCache
      })
    );
  }

  calculateInstancePositions64xyLow(attribute) {
    const isFP64 = this.use64bitPositions();
    attribute.constant = !isFP64;

    if (!isFP64) {
      attribute.value = new Float32Array(2);
      return;
    }

    const {data, getPosition} = this.props;
    const {value} = attribute;
    let i = 0;
    for (const point of data) {
      const position = getPosition(point);
      value[i++] = fp64LowPart(position[0]);
      value[i++] = fp64LowPart(position[1]);
    }
  }
}

ScatterplotLayer.layerName = 'ScatterplotLayer';
ScatterplotLayer.defaultProps = defaultProps;
