/* global document, window */
import React, {Component} from 'react';
import {render} from 'react-dom';
import {StaticMap} from 'react-map-gl';
import DeckGL, {MapView, MapController, ScreenGridLayer} from 'deck.gl';

const INITIAL_VIEW_STATE = {
  longitude: -119.3,
  latitude: 35.6,
  zoom: 6,
  maxZoom: 20,
  pitch: 0,
  bearing: 0
};

// Set your mapbox token here
const MAPBOX_TOKEN = process.env.MapboxAccessToken; // eslint-disable-line

// Source data CSV
const DATA_URL =
  'https://raw.githubusercontent.com/uber-common/deck.gl-data/master/examples/screen-grid/ca-transit-stops.json'; // eslint-disable-line

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      viewState: INITIAL_VIEW_STATE
    };
  }

  _onViewStateChange({viewState}) {
    this.setState({viewState});
  }

  _renderLayers() {
    const {data = DATA_URL, cellSize = 20} = this.props;

    return [
      new ScreenGridLayer({
        id: 'grid',
        data,
        minColor: [0, 0, 0, 0],
        getPosition: d => d,
        cellSizePixels: cellSize
      })
    ];
  }

  render() {
    const {
      onViewStateChange = this._onViewStateChange.bind(this),
      viewState = this.state.viewState
    } = this.props;

    return (
      <DeckGL
        layers={this._renderLayers()}
        views={new MapView({id: 'map'})}
        viewState={viewState}
        onViewStateChange={onViewStateChange}
        controller={MapController}
      >
        {!window.demoLauncherActive &&
          (viewProps => (
            <StaticMap
              {...viewProps}
              reuseMaps
              mapStyle="mapbox://styles/mapbox/dark-v9"
              preventStyleDiffing={true}
              mapboxApiAccessToken={MAPBOX_TOKEN}
            />
          ))}
      </DeckGL>
    );
  }
}

// NOTE: EXPORTS FOR DECK.GL WEBSITE DEMO LAUNCHER - CAN BE REMOVED IN APPS
export {App, INITIAL_VIEW_STATE};

if (!window.demoLauncherActive) {
  render(<App />, document.body.appendChild(document.createElement('div')));
}
