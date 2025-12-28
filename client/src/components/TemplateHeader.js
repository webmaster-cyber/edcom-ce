import React, { Component } from "react";
import { Row, Col, DropdownButton, MenuItem } from "react-bootstrap";
import { FormControlLabel } from "./FormControls";
import _ from "underscore";

export default class TemplateHeader extends Component {
  constructor(props) {
    super(props);

    this._fromSet = false;

    this.state = {
      showReplyTo: false,
      showFromEmail: false,
    };

    this.componentWillReceiveProps(props);
  }

  componentWillReceiveProps(newProps) {
    if (newProps.user && !this.props.data.fromname && !this.props.data.returnpath && !this._fromSet) {
      this.props.update({fromname:   {$set: newProps.user.fullname},
                         returnpath: {$set: newProps.user.username}});
    }
  }

  onChange = event => {
    if (event.target.id === 'fromname' || event.target.id === 'returnpath') {
      this._fromSet = true;
    }
    this.props.update({[event.target.id]: {$set: event.target.value}});
  }

  insertText = t => {
    this.props.update({subject: {$set: this.props.data.subject + t}});
  }

  showReplyTo = event => {
    event.preventDefault();
    this.setState({showReplyTo: true});
  }

  showFromEmail = event => {
    event.preventDefault();
    this.setState({showFromEmail: true});
  }

  replyToVisible() {
    return ((!this.props.readOnly && this.state.showReplyTo) || this.props.data.replyto);
  }

  fromEmailVisible() {
    return ((!this.props.readOnly && this.state.showFromEmail) || this.props.data.fromemail);
  }

  render() {
    var ro = this.props.readOnly;

    return (
      <div>
        <Row>
          <Col md={6}>
            <FormControlLabel
              id="fromname"
              roph={ro}
              label="From Name"
              obj={this.props.data}
              onChange={this.onChange}
              required={true}
            />
          </Col>
          <Col md={6}>
            <FormControlLabel
              id="returnpath"
              roph={ro}
              label="Sender Email Address"
              obj={this.props.data}
              onChange={this.onChange}
              required={true}
            />
            { !this.replyToVisible() && !ro &&
              <div>
                <a href="#replyto" onClick={this.showReplyTo}>Add alternate Reply-To address</a>
              </div>
            }
            { !this.fromEmailVisible() && !ro &&
              <div>
                <a href="#mailfrom" onClick={this.showFromEmail}>Add alternate From Email address</a>
              </div>
            }
          </Col>
        </Row>
        <Row>
          <Col md={6}>
            { this.fromEmailVisible() &&
                <FormControlLabel
                  id="fromemail"
                  label="From Email"
                  roph={ro}
                  obj={this.props.data}
                  onChange={this.onChange}
                />
            }
          </Col>
          <Col md={6}>
            { this.replyToVisible() &&
                <FormControlLabel
                  id="replyto"
                  label="Reply-To Email"
                  roph={ro}
                  obj={this.props.data}
                  onChange={this.onChange}
                />
            }
          </Col>
        </Row>
        { !this.props.noSubject &&
        <Row>
          <Col md={10}>
            <div className="space20 visible-sm visible-xs"></div>
            <FormControlLabel
              id="subject"
              label="Subject"
              roph={ro}
              obj={this.props.data}
              onChange={this.onChange}
              required={true}
            />
          </Col>
          <Col md={2}>
            <label className="opa0 hidden-xs hidden-sm">Subject</label>
            { !this.props.readOnly &&
              (this.props.transactional ?
                <DropdownButton title="Personalize" id="variables">
                  <MenuItem onClick={this.insertText.bind(null, ' {{variable}}')}>{'{{'}variable{'}}'}</MenuItem>
                </DropdownButton>
              :
                <DropdownButton title="Personalize" id="variables">
                  {
                    _.map(this.props.fields, f => <MenuItem key={f} onClick={this.insertText.bind(null, ' {{' + f + ',default=}}')}>{f}</MenuItem>)
                  }
                </DropdownButton>
              )
            }
          </Col>
        </Row>
        }
      </div>
    );
  }
}
