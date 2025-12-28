import React, { Component } from "react";
import { Row, Col, Button, SplitButton, Glyphicon, MenuItem } from "react-bootstrap";
import axios from "axios";
import getvalue from "../utils/getvalue";
import LoaderPanel from "../components/LoaderPanel";
import LoaderButton from "../components/LoaderButton";
import withLoadSave from "../components/LoadSave";
import { TimespanLabel, FormControlLabel } from "../components/FormControls";
import WizardNavbar from "../components/WizardNavbar";
import PolicyProgress from "../components/PolicyProgress";
import _ from "underscore";
import { EDFormSection, EDFormBox } from "../components/EDDOM";
import ScrollToTop from "../components/ScrollToTop";

class PolicyDeferrals extends Component {
  validateForm() {
    if (!this.props.data.customwait)
      return false;

    var customok = true;
    for (var i = 0; i < this.props.data.customwait.length; i++) {
      if (this.props.data.customwait[i].val) {
        if (!this.checkVal(this.props.data.customwait[i].val)) {
          customok = false;
          break;
        }
      }
    }
    return customok;
  }

  checkVal(v) {
    if (v === null || _.isUndefined(v)) {
      return false;
    }
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

  addClicked = type => {
    if (type) {
      this.props.update({customwait: {$unshift: [{msg: '',
                                                  type: type}]}});
    } else {
      this.props.update({customwait: {$unshift: [{msg: '',
                                                  valtype: 'hours',
                                                  val: 1}]}});
    }
  }

  handleCustomChange = (index, event) => {
    var val = getvalue(event);

    var obj = this.props.data.customwait[index];
    obj[event.target.id] = val;

    this.props.update({customwait: {$splice: [[index, 1, obj]]}});
  }

  removeClicked = (index) => {
    this.props.update({customwait: {$splice: [[index, 1]]}})
  }

  handleChange = event => {
    this.props.update({[event.target.id]: {$set: getvalue(event)}})
  }

  onExit = async () => {
    this.props.history.push('/policies');
  }

  onSaveExit = async () => {
    await this.props.save();
    
    this.onExit();
  }

  onNext = async event => {
    event.preventDefault();

    await this.props.save();

    this.props.history.push('/policies/servers?id=' + this.props.id);
  }

  onBack = () => {
    this.props.history.push('/policies/settings?id=' + this.props.id);
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
          { text: 'Save', onClick: this.props.save },
          { text: 'Save and Exit', onClick: this.onSaveExit },
          { text: 'Exit Without Saving', onClick: this.onExit }
        ]}
      />
    )
  }

  render() {
    const len = this.props.data && this.props.data.customwait ? this.props.data.customwait.length : 0;
    return (
      <LoaderPanel isLoading={this.props.isLoading}>
        <ScrollToTop />
        <WizardNavbar isAdmin={true} isSaving={this.props.isSaving} user={this.props.user} brandText="Policy Editor"
          link="/policies"
          disabled={!this.validateForm()} buttons={this.wizardNavbarButtons()}/>
        <EDFormSection onSubmit={this.onNext}>
          <PolicyProgress active={3} id={this.props.id} disabled={this.props.id === 'new'} onClick={this.onLinkClick} />
          <h5 className="text-center">Use a comma-separated list to increase the wait time after consecutive deferrals, e.g. 5, 10, 15 minutes</h5>
          <EDFormBox space style={{paddingTop: '15px', paddingBottom: '15px'}}>
            <h5>Default Deferral Retry Time</h5>
            <TimespanLabel
              id="deferwait"
              label="After Deferral Wait"
              obj={this.props.data}
              onChange={this.handleChange}
              space
            />
          </EDFormBox>
          <div className="text-right space30" style={{maxWidth: '1100px', margin: '0 auto'}}>
            <SplitButton id="add"
              title={<span><Glyphicon glyph="plus"/> Custom Deferral Handling</span>}
              onClick={this.addClicked.bind(null, undefined)}
              disabled={!this.props.data.customwait || this.props.data.customwait.length >= 10}>
              <MenuItem onClick={this.addClicked.bind(null, 'transient')}><Glyphicon glyph="plus"/> Transient Deferral Message</MenuItem>
            </SplitButton>
          </div>
          {
            _.map(this.props.data.customwait, (s, ind) =>
            <EDFormBox space key={'m-' + ind} style={{paddingTop: '15px', paddingBottom: '15px'}}>
              <h5>
                {
                  s.type === 'transient' ?
                  'Transient Deferral Messages are Retried Immediately'
                  :
                  'Special Deferral Message Retry Time'
                }
                <Button className="pull-right" onClick={this.removeClicked.bind(null, ind)} disabled={len === 0}>
                  <Glyphicon glyph="remove"/>
                </Button>
              </h5>
              <Row>
                <Col md={!s.type?6:9} className="space30">
                  <FormControlLabel
                    id="msg"
                    label={!s.type?'If defer message matches:':'Treat deferral message as transient if it contains:'}
                    obj={s}
                    onChange={this.handleCustomChange.bind(null, ind)}
                  />
                </Col>
                {
                  !s.type &&
                  <Col md={6}>
                    <div className="hidden-xs hidden-sm" style={{height:'48px'}}>&nbsp;</div>
                    <TimespanLabel
                      id="val"
                      label="Wait"
                      obj={s}
                      onChange={this.handleCustomChange.bind(null, ind)}
                      groupStyle={{display: 'inline-block'}}
                    />
                  </Col>
                }
              </Row>
            </EDFormBox>
            )
          }
        </EDFormSection>
      </LoaderPanel>
    );
  }
}

export default withLoadSave({
  extend: PolicyDeferrals,
  initial: [],
  get: async ({id}) => (await axios.get('/api/policies/' + id)).data,
  patch: ({id, data}) => axios.patch('/api/policies/' + id, data),
});
