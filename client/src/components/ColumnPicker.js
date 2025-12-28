import React, { Component } from "react";
import { Button, Checkbox } from "react-bootstrap";
import _ from "underscore";
import getvalue from "../utils/getvalue";

export default class ColumnPicker extends Component {
  constructor(props) {
    super(props);

    this.state = {
      extended: false,
    };
  }

  toggle = () => {
    this.setState({extended: !this.state.extended});
  }

  onChange = event => {
    this.props.setShow(event.target.id, getvalue(event));
  }

  render() {
    return (
      <span style={{position: 'relative'}}>
        <Button onClick={this.toggle} style={this.props.style} className={this.state.extended?'active':''}>
          <i className="fa fa-cogs"/>
        </Button>
        { this.state.extended &&
        <div style={{position: 'absolute', right: '10px', minWidth: '150px',
                     background: '#fff', borderRadius: '3px', border: '1px solid #d9dde5',
                     zIndex: 9999, textAlign: 'left', paddingLeft: '10px', paddingRight: '10px'}}>
          {
            _.map(_.filter(this.props.columns, c => !c.mandatory), c => (
              <Checkbox id={c.accessor} key={c.accessor} checked={c.show} onChange={this.onChange}>{c.Header}</Checkbox>
            ))
          }
        </div>
        }
      </span>
    );
  }
}
