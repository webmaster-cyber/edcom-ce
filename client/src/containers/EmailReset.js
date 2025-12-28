import React, { Component } from "react";
import { FormGroup, FormControl, ControlLabel } from "react-bootstrap";
import axios from "axios";
import LoaderButton from "../components/LoaderButton";
import MenuNavbar from "../components/MenuNavbar";
import notify from "../utils/notify";
import parse from "../utils/parse";

import "./Login.css";

export default class EmailReset extends Component {
  constructor(props) {
    super(props);

    this.state = {
      password1: "",
      password2: "",
      isResetting: false,
    };
  }

  componentDidMount() {
    this.getFrontend();
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

  handleChange = event => {
    this.setState({
      [event.target.id]: event.target.value
    });
  }

  handleSubmit = async event => {
    event.preventDefault();

    if (this.state.password1 !== this.state.password2) {
      notify.show("Passwords do not match", "error");
      return;
    }

    var p = parse(this);

    await axios.post('/api/reset/passemail', {
      pass: this.state.password1,
      key: p.key,
    });

    notify.show("Password reset successfully, please log in", "success");

    this.props.history.push("/login");
  }

  render() {
    return (
      <MenuNavbar {...this.props}>
        <section id="broadcast" className="title-page">
          <div style={{padding: '10px'}}>
            <h4>Reset Password</h4>
          </div>
        </section>
        <div className="Login">
          <form onSubmit={this.handleSubmit}>
            <FormGroup controlId="password1" bsSize="large">
              <ControlLabel>New Password</ControlLabel>
              <FormControl
                autoFocus
                type="password"
                value={this.state.password1}
                onChange={this.handleChange}
                required={true}
              />
            </FormGroup>
            <FormGroup controlId="password2" bsSize="large">
              <ControlLabel>Confirm Password</ControlLabel>
              <FormControl
                type="password"
                value={this.state.password2}
                onChange={this.handleChange}
                required={true}
              />
            </FormGroup>
            <LoaderButton
              block
              bsStyle="primary"
              bsSize="large"
              type="submit"
              text="Reset"
              isLoading={this.state.isLoading}
              loadingText="Sending..."
            />
          </form>
        </div>
      </MenuNavbar>
    );
  }
}
