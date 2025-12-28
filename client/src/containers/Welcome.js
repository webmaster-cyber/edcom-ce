import React, { Component } from "react";
import { FormGroup, FormControl, ControlLabel } from "react-bootstrap";
import axios from "axios";
import LoaderButton from "../components/LoaderButton";
import TitlePage from "../components/TitlePage";
import notify from "../utils/notify";

export default class Welcome extends Component {
  constructor(props) {
    super(props);

    this.state = {
      password1: "",
      password2: "",
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
      notify.show('Passwords do not match', "error");
      return;
    }

    await axios.post('/api/reset/password', {
      pass: this.state.password1,
    })

    this.props.history.push("/");
  }

  render() {
    return (
      <div>
        <TitlePage title={"Set a Password"} />
        <div className="space50">
          <center>
            <h4 style={{maxWidth: '450px'}}>You're almost ready! Just one more thing: please create a password for your account.</h4>
          </center>
        </div>
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
              bsSize="large"
              bsStyle="primary"
              type="submit"
              text="Save"
              loadingText="Saving..."
            />
          </form>
        </div>
      </div>
    );
  }
}
