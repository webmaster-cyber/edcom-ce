import React, { Component } from "react";
import { FormGroup, FormControl, ControlLabel } from "react-bootstrap";
import axios from "axios";
import LoaderButton from "../components/LoaderButton";
import TitlePage from "../components/TitlePage";
import MenuNavbar from "../components/MenuNavbar";
import notify from "../utils/notify";

export default class ChangePass extends Component {
  constructor(props) {
    super(props);

    this.state = {
      password1: "",
      password2: "",
    };
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

    await axios.post('/api/reset/password', {
      pass: this.state.password1,
    });

    notify.show("Your password has been changed", "success");

    this.props.history.push("/");
  }

  render() {
    return (
      <MenuNavbar {...this.props} isAdmin={this.props.user && this.props.user.admin && !this.props.loggedInImpersonate}>
        <TitlePage title="Change Password" />
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
      </MenuNavbar>
    );
  }
}
