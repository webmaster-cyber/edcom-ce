import React, { Component } from "react";
import { sendGA4Event } from "../utils/tracking";
import axios from "axios";
import LoaderPanel from "../components/LoaderPanel";
import LoaderButton from "../components/LoaderButton";
import withLoadSave from "../components/LoadSave";
import { SelectLabel, FormControlLabel } from "../components/FormControls";
import SaveNavbar from "../components/SaveNavbar";
import { EDFormSection, EDFormBox } from "../components/EDDOM";
import getvalue from "../utils/getvalue";
import _ from "underscore";

class DomainThrottle extends Component {
  handleChange = event => {
    this.props.update({[event.target.id]: {$set: getvalue(event)}})
  }

  handleSubmit = async event => {
    var isclose = this.props.formClose(event);

    await this.props.save();

    if (isclose) {
      this.goBack();
    }
  }

  handleSave = async () => {
    await this.props.save();
  }

  goBack = () => {
    this.props.history.push("/domainthrottles");
  }

  navbarButtons = () => {
    return (
      <LoaderButton
        id="domain-group-buttons-dropdown"
        text="Save and Close"
        loadingText="Saving..."
        className="green"
        disabled={this.props.isSaving}
        onClick={(e) => {
          sendGA4Event('Domain Throttles', 'Saved Domain Throttle', 'Save a Domain Throttle');
          return this.props.formSubmit(true, e);
        }}
        splitItems={[
          { text: 'Save', onClick: () => { sendGA4Event('Domain Throttles', 'Saved Domain Throttle', 'Save a Domain Throttle'); return this.props.formSubmit(); } },
          { text: 'Cancel', onClick: this.goBack }
        ]}
      />
    )
  }

  render() {
    return (
      <LoaderPanel isLoading={this.props.isLoading}>
        <SaveNavbar isAdmin={true} title={this.props.id === 'new'?'Create Domain Throttle':'Edit Domain Throttle'}
          isSaving={this.props.isSaving} onBack={this.goBack} buttons={this.navbarButtons()} id={this.props.id}>
          <EDFormSection onSubmit={this.handleSubmit} formRef={this.props.formRef}>
            <div style={{ textAlign: 'center', padding: '10px', fontWeight: '500'}}>
                <span role="img" aria-label="warning">⚠️</span> Throttles reset at 7am the following day in your Linux server's configured timezone. Check to make sure it's not UTC.
            </div>
            <br/>
            <EDFormBox>
              { !this.props.routes
              ?
                null
              :
              <SelectLabel
                id="route"
                label="Route:"
                obj={this.props.data}
                onChange={this.handleChange}
                options={this.props.routes}
                space
              />
              }
              <FormControlLabel
                id="domains"
                label="Receiving Domains"
                obj={this.props.data}
                componentClass="textarea"
                rows="4"
                onChange={this.handleChange}
                help="Wildcards accepted. Example: yahoo.* (do not use @)"
                required={true}
                space
              />
              <FormControlLabel
                id="minlimit"
                label="Limit per Minute"
                obj={this.props.data}
                type="number"
                min="0"
                onChange={this.handleChange}
                space
                style={{width:'100px'}}
                required={true}
                help={this.props.data.minlimit === 0 ? 'Warning: a value of 0 in this field will stop all mail sending to the above domain(s)' : undefined}
              />
              <FormControlLabel
                id="hourlimit"
                label="Limit per Hour"
                obj={this.props.data}
                type="number"
                min="0"
                onChange={this.handleChange}
                space
                style={{width:'100px'}}
                required={true}
                help={this.props.data.hourlimit === 0 ? 'Warning: a value of 0 in this field will stop all mail sending to the above domain(s)' : undefined}
              />
              <FormControlLabel
                id="daylimit"
                label="Limit per Day"
                obj={this.props.data}
                type="number"
                min="0"
                onChange={this.handleChange}
                space
                style={{width:'100px'}}
                required={true}
                help={this.props.data.daylimit === 0 ? 'Warning: a value of 0 in this field will stop all mail sending to the above domain(s)' : undefined}
              />
            </EDFormBox>
          </EDFormSection>
        </SaveNavbar>
      </LoaderPanel>
    );
  }
}

export default withLoadSave({
  extend: DomainThrottle,
  initial: { route: '', domains: '*', minlimit: null, hourlimit: null, daylimit: null, active: true },
  get: async ({id}) => (await axios.get('/api/domainthrottles/' + id)).data,
  post: ({data}) => axios.post('/api/domainthrottles', data),
  patch: ({id, data}) => axios.patch('/api/domainthrottles/' + id, data),
  extra: {
    routes: async () => _.sortBy((await axios.get('/api/userroutes')).data, l => l.name.toLowerCase()),
  },
  extramerge: {
    route: 'routes',
  }
});
