import React, { Component } from "react";
import { FormGroup, FormControl, ControlLabel } from "react-bootstrap";
import axios from "axios";
import LoaderButton from "../components/LoaderButton";
import SaveNavbar from "../components/SaveNavbar";
import parse from "../utils/parse";
import notify from "../utils/notify";

import "./OpenTicket.css";

export default class OpenTicket extends Component {
  constructor(props) {
    super(props);

    var p = parse(this);

    this.state = {
      subject: p.type === 'ratelimit' ? 'Rate Limit Increase' : '',
      message: "",
      rateLimit: p.type === 'ratelimit',
      isSaving: false,
    };

    this._formRef = null;
  }

  handleChange = event => {
    this.setState({
      [event.target.id]: event.target.value
    });
  }

  clickSubmit = () => {
    this._formRef.childNodes[0].click();
  }

  handleSubmit = async event => {
    event.preventDefault();

    this.setState({isSaving: true});

    try {
      await axios.post('/api/openticket', {
        subject: this.state.subject,
        message: this.state.message,
      });
    } finally {
      this.setState({isSaving: false});
    }

    notify.show('Your ticket has been opened', "success");

    this.goBack();
  }

  goBack = () => {
    this.props.history.push("/");
  }

  render() {
    return (
      <SaveNavbar title="Open Support Ticket" onBack={this.goBack}
        buttons={
          <LoaderButton
            id="support-buttons-dropdown"
            text="Open Ticket"
            loadingText="Sending..."
            className="green"
            disabled={this.state.isSaving}
            onClick={this.clickSubmit}
            splitItems={[
              { text: 'Cancel', onClick: this.goBack }
            ]}
          />
        }>
        <div className="Support">
          {
            this.state.rateLimit ?
              <h5>Please enter your desired daily send limit and any other information you believe will be helpful, then click the "Open Ticket" button.</h5>
            :
              <h5>Have a question or found a bug? Please fill out the form below, then click the "Open Ticket" button.</h5>
          }
          <form onSubmit={this.handleSubmit} ref={r => this._formRef = r}>
            <button type="submit" style={{display:'none'}} />
            <FormGroup controlId="subject" bsSize="large">
              <ControlLabel>Subject</ControlLabel>
              <FormControl
                autoFocus={!this.state.rateLimit}
                value={this.state.subject}
                onChange={this.handleChange}
                disabled={this.state.rateLimit}
                required={true}
              />
            </FormGroup>
            <FormGroup controlId="message" bsSize="large">
              <ControlLabel>Message</ControlLabel>
              <FormControl
                componentClass="textarea"
                autoFocus={this.state.rateLimit}
                value={this.state.message}
                onChange={this.handleChange}
                rows="8"
                required={true}
              />
            </FormGroup>
          </form>
        </div>
      </SaveNavbar>
    );
  }
}
