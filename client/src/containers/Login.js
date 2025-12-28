import React, { Component } from "react";
import { Link } from "react-router-dom";
import { FormGroup, FormControl, ControlLabel } from "react-bootstrap";
import axios from "axios";
import parse from "../utils/parse";
import LoaderButton from "../components/LoaderButton";
import MenuNavbar from "../components/MenuNavbar";
import LoaderPanel from "../components/LoaderPanel";

import "./Login.css";

export default class Login extends Component {
  constructor(props) {
    super(props);

    var p = parse(this);
    var email = "";
    if (p.username) {
      email = p.username;
    }

    this.state = {
      email: email,
      password: "",
      isLoading: false,
      loadingFrontend: true,
      frontend: null,
    };
  }

  componentDidMount() {
    this.props.logout();

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

    if (this.state.isLoading)
      return;

    this.setState({isLoading: true});

    try {
      var data = (await axios.post('/api/login', {
        username: this.state.email,
        password: this.state.password,
      })).data;

      this.props.login(data.uid, data.cookie, true);
    } finally {
      this.setState({isLoading: false});
    }

    if (window.localStorage !== null) {
      localStorage['uid'] = data.uid;
      localStorage['cookieid'] = data.cookie;
    }

    if (data.changepass) {
      this.props.history.push("/welcome");
    } else {
      var p = parse(this);
      if (p.redirect && p.redirect !== '/') {
        this.props.history.push(p.redirect);
      } else {
        this.props.history.push("/");
      }
    }
  }

  render() {
    let image = null;
    if (this.state.frontend) {
      image = this.state.frontend.image;
    }
    return (
      <LoaderPanel isLoading={this.state.loadingFrontend}>
        <MenuNavbar {...this.props} noLogin={true} image={image}>
          <div className="Login">
            <form onSubmit={this.handleSubmit}>
              <FormGroup controlId="email" bsSize="large">
                <ControlLabel>Email Address</ControlLabel>
                <FormControl
                  autoFocus={!this.state.email}
                  type="email"
                  value={this.state.email}
                  onChange={this.handleChange}
                  required={true}
                />
              </FormGroup>
              <FormGroup controlId="password" bsSize="large">
                <ControlLabel>Password</ControlLabel>
                <FormControl
                  autoFocus={this.state.email}
                  type="password"
                  value={this.state.password}
                  onChange={this.handleChange}
                  required={true}
                />
              </FormGroup>
              <LoaderButton
                block
                bsSize="large"
                bsStyle="primary"
                type="submit"
                text="Login"
                isLoading={this.state.isLoading}
                loadingText="Logging in..."
              />
              <div className="space50"/>
              <Link to="/reset" className="pull-right">Forgot password?</Link>
            </form>
          </div>
        </MenuNavbar>
      </LoaderPanel>
    );
  }
}
