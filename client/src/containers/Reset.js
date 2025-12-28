import React, { Component } from "react";
import { FormGroup, FormControl, ControlLabel } from "react-bootstrap";
import axios from "axios";
import LoaderButton from "../components/LoaderButton";
import MenuNavbar from "../components/MenuNavbar";
import notify from "../utils/notify";
import LoaderPanel from "../components/LoaderPanel";

import "./Login.css";

export default class Reset extends Component {
  constructor(props) {
    super(props);

    this.state = {
      email: '',
      isLoading: false,
      loadingFrontend: true,
      frontend: null,
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

    if (this.state.isLoading)
      return;

    this.setState({isLoading: true});

    await axios.post('/api/reset/sendemail', {
      email: this.state.email,
    });
    
    notify.show("Password reset email sent", "success");

    this.props.history.push("/login");
  }

  render() {
    let image = null;
    if (this.state.frontend) {
      image = this.state.frontend.image;
    }
    return (
      <LoaderPanel isLoading={this.state.loadingFrontend}>
        <MenuNavbar {...this.props} image={image}>
          <section id="broadcast" className="title-page">
            <div style={{padding: '10px'}}>
              <h4>Reset Password</h4>
            </div>
          </section>
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
              <LoaderButton
                block
                bsSize="large"
                bsStyle="primary"
                type="submit"
                text="Reset"
                isLoading={this.state.isLoading}
                loadingText="Sending..."
              />
            </form>
          </div>
        </MenuNavbar>
      </LoaderPanel>
    );
  }
}
