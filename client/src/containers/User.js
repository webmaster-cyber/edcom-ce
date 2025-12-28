import { sendGA4Event } from "../utils/tracking";
import React, { Component } from "react";
import axios from "axios";
import LoaderPanel from "../components/LoaderPanel";
import LoaderButton from "../components/LoaderButton";
import withLoadSave from "../components/LoadSave";
import { FormControlLabel, CheckboxLabel } from "../components/FormControls";
import parse from "../utils/parse";
import getvalue from "../utils/getvalue";
import SaveNavbar from "../components/SaveNavbar";
import { EDFormSection, EDFormBox } from "../components/EDDOM";
import notify from "../utils/notify";

class User extends Component {
  validateForm() {
    const { username, fullname, password1, password2 } = this.props.data;

    if (this.props.id === 'new') {
      return username && fullname && password1 && password2;
    } else {
      return username && fullname;
    }
  }

  handleChange = event => {
    this.props.update({[event.target.id]: {$set: getvalue(event)}})
  }

  handleSubmit = async event => {
    event.preventDefault();

    if (this.props.data.password1 && this.props.data.password1 !== this.props.data.password2) {
      notify.show('Passwords do not match', "error");
      return;
    }

    await this.onSave();

    this.goBack();
  }

  onSave = async () => {
    if (this.props.data.password1 && this.props.data.password1 !== this.props.data.password2) {
      notify.show('Passwords do not match', "error");
      return;
    }

    var p = parse(this);

    await this.props.save({cid: p.cid});
  }

  goBack = () => {
    var p = parse(this);
    this.props.history.push("/customers/edit-users?id=" + p.cid);
  }

  navbarButtons = () => {
    return (
      <LoaderButton
        id="customers-users-buttons-dropdown"
        text="Save and Close"
        loadingText="Saving..."
        className="green"
        disabled={!this.validateForm() || this.props.isSaving}
        onClick={(e) => {
          sendGA4Event('Customers Page', 'Saved User', 'Saved User Account');
          return this.handleSubmit(e);
        }}
        splitItems={[
          {
            text: 'Save',
            onClick: () => {
              sendGA4Event('Customers Page', 'Saved User', 'Saved User Account');
              return this.onSave();
            }
          },
          { text: 'Cancel', onClick: this.goBack }
        ]}
      />
    )
  }

  render() {
    return (
      <LoaderPanel isLoading={this.props.isLoading}>
        <SaveNavbar isAdmin={true} title={this.props.id === 'new'?'Create User':'Edit User'} id={this.props.id} onBack={this.goBack}
                    disabled={!this.validateForm()} isSaving={this.props.isSaving} buttons={this.navbarButtons()}>
          <EDFormSection onSubmit={this.handleSubmit}>
            <EDFormBox>
              <FormControlLabel
                id="username"
                label="Email Address"
                type="email"
                obj={this.props.data}
                onChange={this.handleChange}
              />
              <FormControlLabel
                id="fullname"
                label="Full Name"
                obj={this.props.data}
                onChange={this.handleChange}
                space
              />
              <FormControlLabel
                id="password1"
                label="Password"
                type="password"
                obj={this.props.data}
                onChange={this.handleChange}
                space
              />
              <FormControlLabel
                id="password2"
                label="Confirm Password"
                type="password"
                obj={this.props.data}
                onChange={this.handleChange}
                space
              />
              <CheckboxLabel
                id="nodataexport"
                label="No Data Export Allowed"
                obj={this.props.data}
                onChange={this.handleChange}
                space
              />
              <CheckboxLabel
                id="disabled"
                label="Disabled"
                obj={this.props.data}
                onChange={this.handleChange}
                space
              />
            </EDFormBox>
          </EDFormSection>
        </SaveNavbar>
      </LoaderPanel>
    );
  }
}

export default withLoadSave({
  extend: User,
  initial: { username: '', fullname: '', disabled: false, password1: '', password2: '', nodataexport: false },
  get: async ({id}) => (await axios.get('/api/users/' + id)).data,
  post: ({data}) => axios.post('/api/users', data),
  patch: ({id, data}) => axios.patch('/api/users/' + id, data)
});
