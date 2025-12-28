import React, { Component } from "react";
import axios from "axios";
import LoaderPanel from "../components/LoaderPanel";
import LoaderButton from "../components/LoaderButton";
import withLoadSave from "../components/LoadSave";
import { FormControlLabel } from "../components/FormControls";
import SaveNavbar from "../components/SaveNavbar";
import { EDFormSection, EDFormBox } from "../components/EDDOM";
import getvalue from "../utils/getvalue";
import { getHost } from "../utils/webroot";

class EasylinkEdit extends Component {
  handleChange = event => {
    this.props.update({[event.target.id]: {$set: getvalue(event)}})
  }

  handleSubmit = async event => {
    var isclose = this.props.formClose(event);

    var id = (await this.props.save()).data.id;

    if (isclose) {
      this.goBack();
    } else {
      this.props.history.replace("/easylink/edit?id=" + id);
    }
  }

  goBack = () => {
    this.props.history.push("/easylink");
  }

  navbarButtons = () => {
    return (
      <LoaderButton
        id="server-buttons-dropdown"
        text="Save and Close"
        loadingText="Saving..."
        className="green"
        disabled={this.props.isSaving}
        onClick={this.props.formSubmit.bind(null, true)}
        splitItems={[
          { text: 'Save', onClick: this.props.formSubmit },
          { text: 'Cancel', onClick: this.goBack }
        ]}
      />
    )
  }

  render() {
    var dataName = this.props.data && (this.props.data.name || '');
    var title = `${this.props.id === 'new'?'Add Easylink Account':`Edit Easylink Account ${dataName ? `for "${dataName}"` : ''}`}`;

    const host = getHost(this.props);

    return (
      <LoaderPanel isLoading={this.props.isLoading}>
        <SaveNavbar isAdmin={true} title={title} onBack={this.goBack} buttons={this.navbarButtons()} id={this.props.id}>
          <EDFormSection onSubmit={this.handleSubmit} formRef={this.props.formRef}>
            <EDFormBox>
              <FormControlLabel
                id="name"
                label="Name"
                obj={this.props.data}
                onChange={this.handleChange}
                required={true}
              />
              <FormControlLabel
                id="username"
                label="Username"
                obj={this.props.data}
                onChange={this.handleChange}
                required={true}
                space
              />
              <FormControlLabel
                id="password"
                label="Password"
                obj={this.props.data}
                onChange={this.handleChange}
                type="password"
                required={true}
                space
              />
              <FormControlLabel
                id="linkdomain"
                label="White Label Your Tracking Links"
                help='This domain must be created in your DNS provider as an A record pointing to your platform IP. Example: links.domain.com'
                placeholder={host}
                obj={this.props.data}
                onChange={this.handleChange}
                space
              />
              <div className="text-center space15">
                View our <a style={{fontSize: 'inherit'}} href="https://docs.emaildelivery.com/docs/introduction/understanding-the-white-label-tracking-link" target="_blank" rel="noopener noreferrer">documentation</a> on white-labeled tracking
              </div>
            </EDFormBox>
          </EDFormSection>
        </SaveNavbar>
      </LoaderPanel>
    );
  }
}

export default withLoadSave({
  extend: EasylinkEdit,
  initial: { name: '', username: '', password: '', linkdomain: '' },
  get: async ({id}) => (await axios.get('/api/easylink/' + id)).data,
  post: ({data}) => axios.post('/api/easylink', data),
  patch: ({id, data}) => axios.patch('/api/easylink/' + id, data),
});
