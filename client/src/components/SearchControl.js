import React, { Component } from "react";
import _ from "underscore";
import { FormControl } from "react-bootstrap";

import "./SearchControl.css";

export default class SearchControl extends Component {
  constructor(props) {
    super(props);

    this.state = {
      value: props.value,
    };

    this._fireChanged = _.debounce(this.fireChanged, 500);
  }

  fireChanged = () => {
    this.props.onChange(this.state.value);
  }

  onChange = event => {
    this.setState({value: event.target.value}, this._fireChanged);
  }

  clear = () => {
    this.setState({value: ''}, this._fireChanged);
  }

  render() {
    return (
      <div style={{position: 'relative', display: 'inline-block'}}>
        <FormControl id="search" value={this.state.value} placeholder="Search" onChange={this.onChange}>
        </FormControl>
        { this.state.value !== '' && 
          <i className="fa fa-remove" onClick={this.clear} style={{position: 'absolute', right: '8px', top: '10px', cursor: 'pointer'}} />
        }
      </div>
    );
  }
}

