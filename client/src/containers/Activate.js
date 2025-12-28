import React, { Component } from "react";
import { FormGroup, FormControl, ControlLabel } from "react-bootstrap";
import axios from "axios";
import parse from "../utils/parse";
import LoaderButton from "../components/LoaderButton";
import MenuNavbar from "../components/MenuNavbar";
import _ from "underscore";
import notify from "../utils/notify";

import "./Login.css";

export default class Activate extends Component {
  constructor(props) {
    super(props);

    var p = parse(this);
    var email = "";
    if (p.username) {
      email = p.username;
    }

    this.state = {
      email: email,
      code: "",
      isLoading: false,
      skip: p.confirm === 'false',
    };

    this.props.logout();

    this._resend = _.throttle(async () => {
      await axios.post('/api/resendcode', {
        username: this.state.email,
      });
      notify.show('Activation code email sent', "success");
    }, 10000);
  }

  componentDidMount() {
    if (this.state.skip) {
      this.handleSubmit();
    } else {
      this.getFrontend();
    }
  }

  async getFrontend() {
    try {
      const res = await axios.get('/api/loginfrontend');
      this.props.setFaviconAndCSS(res.data.favicon || '/favicon-ed.ico', res.data.customcss);
      this.setState({loadingFrontend: false, frontend: res.data});
    } catch (e) {
      this.setState({loadingFrontend: false});
    }
  }

  resend = () => {
    this._resend();
  }

  validateForm() {
    return this.state.email.length > 0;
  }

  handleChange = event => {
    this.setState({
      [event.target.id]: event.target.value
    });
  }

  handleSubmit = async event => {
    if (event) {
      event.preventDefault();
    }

    if (this.state.isLoading)
      return;

    this.setState({isLoading: true});

    try {
      var data = (await axios.post('/api/register', {
        username: this.state.email,
        code: this.state.code,
        offset:   -(new Date()).getTimezoneOffset(),
      })).data;

      this.props.login(data.uid, data.cookie, true);
    } finally {
      this.setState({isLoading: false});
    }

    if (window.localStorage !== null) {
      localStorage['uid'] = data.uid;
      localStorage['cookieid'] = data.cookie;
    }

    this.props.history.push("/welcome");
  }

  render() {
    if (this.state.skip) {
      return null;
    }
    return (
      <MenuNavbar {...this.props}>
        <section id="broadcast" className="title-page">
          {
          /*
          <div className="text-center" style={{padding: '10px'}}>
            <img src="/img/logo-text.png" alt="logo text" style={{height:'80px'}}/>
          </div>*/
          }
        </section>
        <div className="space50">
          <center>
            <h4 style={{maxWidth: '450px'}}>Thanks for signing up! Please enter the activation code we sent to your email address (check your SPAM folder).</h4>
            <h6 style={{maxWidth: '450px'}}>(Didn't get a code? Click <a href="#send" onClick={this.resend}>here</a> to resend it)</h6>
          </center>
        </div>
        <div className="Login">
          <form onSubmit={this.handleSubmit}>
            <FormGroup controlId="email" bsSize="large">
              <ControlLabel>Email Address</ControlLabel>
              <FormControl
                type="email"
                value={this.state.email}
                onChange={this.handleChange}
                readOnly={true}
              />
            </FormGroup>
            <FormGroup controlId="code" bsSize="large">
              <ControlLabel>Activation Code</ControlLabel>
              <FormControl
                autoFocus={true}
                value={this.state.code}
                onChange={this.handleChange}
                required={true}
              />
            </FormGroup>
            <LoaderButton
              block
              bsSize="large"
              bsStyle="primary"
              disabled={!this.validateForm()}
              type="submit"
              text="Activate Account"
              isLoading={this.state.isLoading}
              loadingText="Logging in..."
            />
          </form>
        </div>
      </MenuNavbar>
    );
  }
}
