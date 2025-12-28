import React, { Component } from "react";

import "./Preheader.css";

export default class Preheader extends Component {
  constructor(props) {
    super(props);

    this.state = {
      show: false,
      oldval: '',
    };
  }

  onShow = () => {
    this.setState({show: true, oldval: this.props.obj.preheader});
  }

  onSave = () => {
    this.setState({show: false});
  }

  onCancel = () => {
    this.setState({show: false}, () => {
      this.props.onChange({target: {id: 'preheader', value: this.state.oldval}});
    });
  }

  onKeyDown = ev => {
    if (ev.keyCode === 27) {
      this.onCancel();
    } else if (ev.keyCode === 13) {
      this.onSave();
    }
  }

  render() {
    var {onChange, obj, black} = this.props;
    var {show} = this.state;

    return (
      <div id="preheader-toolbar" className={black?'black':''}>
        { show &&
          <input id="preheader" className="form-control" onChange={onChange} onKeyDown={this.onKeyDown} value={obj.preheader} placeholder="Enter your preheader message..." />
        }
        { show &&
          <button type="button" className="btn btn-clear btn-small" onClick={this.onSave}><i className="fa fa-check"/></button>
        }
        { show &&
          <button type="button" className="btn btn-clear btn-small" onClick={this.onCancel}><i className="fa fa-remove"/></button>
        }
        { !show &&
          <button type="button" className="btn btn-clear" onClick={this.onShow}>Set Preheader</button>
        }
        {
          !show && obj.preheader && <i className="fa fa-check-circle"/>
        }
      </div>
    );
  }
}
