import React, { Component } from "react";
import { sendGA4Event } from "../utils/tracking";
import axios from "axios";
import getvalue from "../utils/getvalue";
import LoaderPanel from "../components/LoaderPanel";
import LoaderButton from "../components/LoaderButton";
import withLoadSave from "../components/LoadSave";
import { TimespanLabel, FormControlLabel } from "../components/FormControls";
import WizardNavbar from "../components/WizardNavbar";
import PolicyProgress from "../components/PolicyProgress";
import { EDFormSection, EDFormBox } from "../components/EDDOM";
import _ from "underscore";
import ScrollToTop from "../components/ScrollToTop";

import "../../node_modules/react-datetime/css/react-datetime.css";

class PolicySettings extends Component {
  validateForm() {
    var d = this.props.data;
    if (!(d.numconns !== '' && d.retryfor !== '' && d.sendsperconn !== '')) {
      return false;
    }
    if (d.customnumconns) {
      for (var i = 0; i < d.customnumconns.length; i++) {
        if (d.customnumconns[i].val === '') {
          return false;
        }
      }
    }
    return this.checkVal(d.connerrwait);
  }

  checkVal(v) {
    if (_.isUndefined(v) || v === '')
      return false;
    var c = v.toString().split(',');
    if (!c.length)
      return false;
    for (var i = 0; i < c.length; i++) {
      if (!/^\s*\d+\s*$/.test(c[i])) {
        return false;
      }
    }
    return true;
  }

  handleChange = event => {
    this.props.update({[event.target.id]: {$set: getvalue(event)}})
  }

  onSaveExit = async () => {
    await this.props.save();

    this.onExit();
  }

  onExit = async () => {
    this.props.history.push('/policies');
  }

  onNext = async event => {
    event.preventDefault();

    await this.props.save();

    this.props.history.push('/policies/deferrals?id=' + this.props.id);
  }

  onBack = () => {
    this.props.history.push('/policies/domains?id=' + this.props.id);
  }

  addClicked = () => {
    this.props.update({customnumconns: {$unshift: [{mx: '',
                                                    val: 1}]}});
  }

  handleCustomChange = (index, event) => {
    var val = getvalue(event);

    var obj = this.props.data.customnumconns[index];
    obj[event.target.id] = val;

    this.props.update({customnumconns: {$splice: [[index, 1, obj]]}});
  }

  removeClicked = (index) => {
    this.props.update({customnumconns: {$splice: [[index, 1]]}})
  }

  onLinkClick = async url => {
    await this.props.save();

    this.props.history.push(url);
  }

  wizardNavbarButtons = () => {
    return (
      <LoaderButton
        id="policy-wizard-buttons-dropdown"
        text="Save and Continue"
        loadingText="Saving..."
        className="green"
        disabled={!this.validateForm() || this.props.isSaving}
        onClick={this.onNext}
        splitItems={[
          {
            text: 'Save',
            onClick: () => {
              sendGA4Event('MTA', 'Saved Policy', 'Saved Policy Configuration');
              return this.props.save();
            }
          },
          {
            text: 'Save and Exit',
            onClick: () => {
              sendGA4Event('MTA', 'Saved Policy', 'Saved Policy Configuration');
              return this.onSaveExit();
            }
          },
          { text: 'Exit Without Saving', onClick: this.onExit }
        ]}
      />
    )
  }

  render() {
    return (
      <LoaderPanel isLoading={this.props.isLoading}>
        <ScrollToTop />
        <WizardNavbar isAdmin={true} isSaving={this.props.isSaving} user={this.props.user} brandText="Policy Editor"
          link="/policies"
          disabled={!this.validateForm()} buttons={this.wizardNavbarButtons()}/>
        <EDFormSection onSubmit={this.onNext}>
          <PolicyProgress active={2} id={this.props.id} disabled={this.props.id === 'new'} onClick={this.onLinkClick} />
          <EDFormBox className="form-inline">
            <TimespanLabel
              id="connerrwait"
              label="After Connection Error Wait"
              obj={this.props.data}
              onChange={this.handleChange}
            />
            <FormControlLabel
              id="retryfor"
              label="Hours to Retry Messages For:"
              obj={this.props.data}
              onChange={this.handleChange}
              style={{width:'75px'}}
              type="number"
              min="1"
              space
              inline
            />
            <FormControlLabel
              id="sendsperconn"
              label="Messages per Connection:"
              obj={this.props.data}
              onChange={this.handleChange}
              style={{width:'75px'}}
              type="number"
              min="-1"
              space
            />
            <FormControlLabel
              id="numconns"
              label="Simultaneous Connections:"
              obj={this.props.data}
              onChange={this.handleChange}
              style={{width:'100px'}}
              type="number"
              min="1"
              space
            />
          </EDFormBox>
        </EDFormSection>
      </LoaderPanel>
    );
  }
}

export default withLoadSave({
  extend: PolicySettings,
  initial: [],
  get: async ({id}) => (await axios.get('/api/policies/' + id)).data,
  patch: ({id, data}) => axios.patch('/api/policies/' + id, data),
});
