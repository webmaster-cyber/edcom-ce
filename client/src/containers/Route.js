import React, { Component } from "react";
import { sendGA4Event } from "../utils/tracking";
import { Row, Col, Modal, Button, Glyphicon, DropdownButton, MenuItem } from "react-bootstrap";
import axios from "axios";
import getvalue from "../utils/getvalue";
import LoaderPanel from "../components/LoaderPanel";
import LoaderButton from "../components/LoaderButton";
import withLoadSave from "../components/LoadSave";
import { CheckboxLabel, FormControlLabel, SelectLabel } from "../components/FormControls";
import SaveNavbar from "../components/SaveNavbar";
import _ from "underscore";
import shortid from "shortid";
import { EDFormSection, EDFormBox } from "../components/EDDOM";
import notify from "../utils/notify";

import "./Route.css";

class TableRow extends Component {
  constructor(props) {
    super(props);

    this.state = {
      showConfirm: false,
      newGroupName: '',
      newGroupDomains: '',
      saving: false,
    };
  }

  domainGroupClicked = id => {
    this.props.handleChange(this.props.ind, {
      target: {
        id: 'domaingroup',
        value: id,
      }
    });
  }

  domainGroupCreate = () => {
    this.setState({showConfirm: true});
  }

  modalChange = event => {
    this.setState({[event.target.id]: event.target.value});
  }

  createConfirmClicked = async ok => {
    if (!ok) {
      this.setState({showConfirm: false});
      return false;
    }

    this.setState({saving: true});

    var obj = (await axios.post('/api/domaingroups', {
      name: this.state.newGroupName,
      domains: this.state.newGroupDomains,
    })).data;

    await this.props.reloadExtra();

    this.props.handleChange(this.props.ind, {
      target: {
        id: 'domaingroup',
        value: obj.id,
      }
    });

    this.setState({showConfirm: false, saving: false});
  }

  render() {
    var {s, handleSplitChange, addSplit, removeSplit, domaingroups, policies, removeClicked, len, ind} = this.props;

    var dg = _.find(domaingroups, d => d.id === s.domaingroup);
    var dgname = 'Unknown';
    if (dg)
      dgname = dg.name;
    return (
    <Row>
      <Modal show={this.state.showConfirm}>
        <Modal.Header>
          <Modal.Title>Expert use only, see our documentation. Do not use if unsure.</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <FormControlLabel
            id="newGroupName"
            label="Name"
            obj={this.state}
            onChange={this.modalChange}
          />
          <FormControlLabel
            id="newGroupDomains"
            label="Send to only these contact list domains and BLOCK/DENY all others"
            componentClass="textarea"
            obj={this.state}
            onChange={this.modalChange}
            space
            help="Example: gmail.com, yahoo.com, etc."
            rows={5}
          />
        </Modal.Body>
        <Modal.Footer>
          <Button onClick={this.createConfirmClicked.bind(this, true)} bsStyle="primary"
            disabled={!this.state.newGroupName || !this.state.newGroupDomains || this.state.saving}>
            Create
          </Button>
          <Button onClick={this.createConfirmClicked.bind(this, false)}>Cancel</Button>
        </Modal.Footer>
      </Modal>
      <Col md={4}>
        <div style={{height:'30px'}}>&nbsp;</div>
        <div className="row">
          <div className="col-md-12 dropdown-white-container">
            <label className="control-label">
              Send to these domains:
            </label>
            { s.default ?
                <Button disabled className="dropdown-white">
                  All Domains in Contact List
                </Button>
              :
                <DropdownButton id={s.id + '-domaingroup'} title={dgname} className="dropdown-white">
                  {
                    _.map(_.filter(domaingroups, d => d.id !== s.domaingroup), d =>
                      <MenuItem key={d.id} onClick={this.domainGroupClicked.bind(null, d.id)}>{d.name}</MenuItem>
                    )
                  }
                  <div className="divider"></div>
                  <MenuItem onClick={() => { 
                      sendGA4Event('Postal Routes', 'Create Domain Group Dropdown', 'Create Domain Group'); 
                      return this.domainGroupCreate();
                    }}>
                    Add Contact List Domains
                  </MenuItem>
                </DropdownButton>
            }
          </div>
        </div>
      </Col>
      <Col md={6}>
        <div style={{height:'30px'}}>&nbsp;</div>
        {
          _.map(s.splits, (sp, split) => (
            <Row key={split}>
              <Col md={8}>
                <SelectLabel
                  id="policy"
                  label="Using Delivery Connection:"
                  obj={sp}
                  onChange={handleSplitChange.bind(null, ind, split)}
                  options={policies}
                  emptyVal="Drop All Mail"
                />
              </Col>
              <Col md={4}>
                <FormControlLabel
                  id="pct"
                  label="Split:"
                  obj={sp}
                  onChange={handleSplitChange.bind(null, ind, split)}
                  disabled={s.splits.length === 1}
                  style={{width: '75px'}}
                  groupStyle={{display: 'inline-block'}}
                  type="number"
                  min="0"
                  max="100"
                />
                { split === 0 &&
                  <a href="#addsplit" onClick={(e) => { sendGA4Event('Postal Route', 'Added Split', 'Added a Split Route'); addSplit(ind, e); }} style={{fontSize:'15px', marginLeft: '10px', position: 'absolute', top: '45px'}}>
                    +
                  </a>
                }
                { split !== 0 &&
                  <a href="#remsplit" onClick={removeSplit.bind(null, ind, split)} style={{fontSize:'15px', marginLeft: '10px', position: 'absolute', top: '45px'}}>
                    -
                  </a>
                }
              </Col>
            </Row>
          ))
        }
      </Col>
      <Col md={2} className="text-right">
        <div style={{height:'61px'}} className="hidden-xs hidden-sm">&nbsp;</div>
        <Button
          onClick={removeClicked.bind(null, ind)}
          style={{marginTop:'3px'}}
          disabled={(len <= 1 && ind === 0) || s.default}>
          <Glyphicon glyph="remove"/>
        </Button>
      </Col>
    </Row>
    );
  }
}

const SortableTable = ({policies, domaingroups, reloadExtra, rules, handleChange, handleSplitChange, addSplit, removeSplit, removeClicked, validateForm}) => {
  return (
    <div>
      {
        _.map(rules, (s, index) =>
          <TableRow
            s={s}
            policies={policies}
            domaingroups={domaingroups}
            reloadExtra={reloadExtra}
            handleChange={handleChange}
            handleSplitChange={handleSplitChange}
            addSplit={addSplit}
            removeSplit={removeSplit}
            removeClicked={removeClicked}
            validateForm={validateForm}
            len={rules.length}
            index={index}
            ind={index}
            key={'row-' + index}
            disabled={index === rules.length - 1}
          />
        )
      }
    </div>
  );
}

class RouteEdit extends Component {
  constructor(props) {
    super(props);

    this.state = {
      showConfirm: false,
      newGroupName: '',
      newGroupDomains: '',
      saving: false,
    };
  }

  validateForm = () => {
    const d = this.props.data;
    var used = {}
    for (var i = 0; i < d.rules.length; i++) {
      var r = d.rules[i];
      if (used[r.domaingroup]) {
        return false;
      }
      used[r.domaingroup] = true;

      for (var s = 0; s < r.splits.length; s++) {
        if (r.splits[s].pct === '')
          return false;
      }
    }
    return this.props.data.name;
  }

  handleChange = event => {
    this.props.update({[event.target.id]: {$set: getvalue(event)}})
  }

  handleSubmit = async event => {
    event.preventDefault();

    await this.onSave();

    this.goBack();
  }

  onSave = async () => {
    var show = this.props.id === 'new';

    await this.props.save();

    if (show) {
      notify.show("Reminder: To use this route, you must publish it, then edit a customer and select it", "success");
    }
  }

  goBack = () => {
    this.props.history.push('/routes');
  }

  removeClicked = (index) => {
    this.props.update({rules: {$splice: [[index, 1]]}})
  }

  handleRuleChange = (index, event) => {
    var val = getvalue(event);

    var obj = this.props.data.rules[index];
    obj[event.target.id] = val;

    this.props.update({rules: {$splice: [[index, 1, obj]]}});
  }

  handleSplitChange = (index, split, event) => {
    var val = getvalue(event);

    var obj = this.props.data.rules[index].splits[split];
    obj[event.target.id] = val;

    this.props.update({rules: {[index]: { splits: {$splice: [[split, 1, obj]]}}}});
  }

  removeSplit = (index, split, event) => {
    event.preventDefault();

    this.props.update({rules: {[index]: { splits: {$splice: [[split, 1]]}}}});
  }

  addSplit = (index, event) => {
    event.preventDefault();

    var policy = '';
    if (this.props.policies && this.props.policies.length)
      policy = this.props.policies[0].id;

    this.props.update({rules: {[index]: {
      splits: {
        $push: [{
           policy: policy,
           pct: 0,
        }]
      }
    }}});
  }

  componentWillReceiveProps(p) {
    var data = p.data;

    if (!data || !data.rules || !data.rules.length)
      return;

    var i, j;
    if (p.domaingroups) {
      // remove any items that refer to deleted domain groups
      const pred = s => s.id === data.rules[i].domaingroup;
      for (i = data.rules.length - 1; i >= 0; i--) {
        if (!data.rules[i].default && !_.find(p.domaingroups, pred)) {
          p.update({rules: {$splice: [[i, 1]]}});
        }
      }
    }
    if (p.policies) {
      // remove any items that refer to deleted policies
      const pred = s => s.id === data.rules[i].splits[j].policy;
      for (i = data.rules.length - 1; i >= 0; i--) {
        for (j = data.rules[i].splits.length - 1; j >= 0; j--) {
          if (data.rules[i].splits[j].policy && !_.find(p.policies, pred)) {
            p.update({rules: {[i]: {splits: {[j]: {policy: {$set: ''}}}}}});
          }
        }
      }
    }
  }

  modalChange = event => {
    this.setState({[event.target.id]: event.target.value});
  }

  createConfirmClicked = async ok => {
    if (!ok) {
      this.setState({showConfirm: false});
      return false;
    }

    this.setState({saving: true});

    await axios.post('/api/domaingroups', {
      name: this.state.newGroupName,
      domains: this.state.newGroupDomains,
    });

    await this.props.reloadExtra();

    this.setState({showConfirm: false, saving: false}, this.addClicked);
  }

  addClicked = () => {
    var domaingroup = '';
    if (this.props.domaingroups && this.props.domaingroups.length) {
      domaingroup = this.props.domaingroups[0].id;
    } else if (this.props.domaingroups && !this.props.domaingroups.length) {
      this.setState({showConfirm: true});
      return;
    }

    var policy = '';
    if (this.props.policies && this.props.policies.length)
      policy = this.props.policies[0].id;

    this.props.update({rules: {$unshift: [{id: shortid.generate(),
                                           default: false,
                                           domaingroup: domaingroup,
                                           splits: [{
                                             policy: policy,
                                             pct: 100,
                                           }]
                                           }]}});
  }

  navbarButtons = () => {
    return (
      <LoaderButton
        id="policy-route-buttons-dropdown"
        text="Save and Close"
        loadingText="Saving..."
        className="green"
        disabled={!this.validateForm() || this.props.isSaving}
        onClick={(e) => {
          sendGA4Event('Postal Routes', 'Saved Postal Route', 'Saved a Postal Route');
          return this.handleSubmit(e);
        }}
        splitItems={[
          { text: 'Save', onClick: () => { sendGA4Event('Postal Routes', 'Saved Postal Route', 'Saved a Postal Route'); return this.onSave(); } },
          { text: 'Cancel', onClick: this.goBack }
        ]}
      />
    )
  }

  render() {
    return (
      <LoaderPanel isLoading={this.props.isLoading}>
        <SaveNavbar isAdmin={true} title={this.props.id === 'new'?'Create Postal Route':'Edit Postal Route'}
                    disabled={!this.validateForm()} isSaving={this.props.isSaving} onBack={this.goBack}
                    buttons={this.navbarButtons()} id={this.props.id}>
          <EDFormSection onSubmit={this.handleSubmit}>
            <EDFormBox>
              <FormControlLabel
                id="name"
                label="Name"
                obj={this.props.data}
                onChange={this.handleChange}
              />
              <CheckboxLabel
                id="usedefault"
                label="Assign To New Customers By Default"
                obj={this.props.data}
                onChange={this.handleChange}
              />
            </EDFormBox>
            <EDFormBox space>
              <div style={{ height: '40px' }}>
                <Button onClick={() => {
                  sendGA4Event('Postal Routes', 'Added Domain Route', 'Added a Domain Route');
                  return this.addClicked();
                }} className="blue" style={{ float: 'right' }}>
                  <Glyphicon glyph="plus" /> Advanced Routing Rules
                </Button>
              </div>
              <Modal show={this.state.showConfirm}>
                <Modal.Header>
                  <Modal.Title>Expert use only, see our documentation. Do not use if unsure.</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                  <FormControlLabel
                    id="newGroupName"
                    label="Name"
                    obj={this.state}
                    onChange={this.modalChange}
                  />
                  <FormControlLabel
                    id="newGroupDomains"
                    label="Send only to these contact list domains and BLOCK/DENY all others"
                    componentClass="textarea"
                    obj={this.state}
                    onChange={this.modalChange}
                    space
                    help="Example: gmail.com, yahoo.com, etc."
                    rows={5}
                  />
                </Modal.Body>
                <Modal.Footer>
                  <Button onClick={this.createConfirmClicked.bind(this, true)} bsStyle="primary"
                    disabled={!this.state.newGroupName || !this.state.newGroupDomains || this.state.saving}>
                    Create
                  </Button>
                  <Button onClick={this.createConfirmClicked.bind(this, false)}>Cancel</Button>
                </Modal.Footer>
              </Modal>
              <SortableTable
                rules={this.props.data.rules}
                policies={this.props.policies}
                domaingroups={this.props.domaingroups}
                handleChange={this.handleRuleChange}
                reloadExtra={this.props.reloadExtra}
                addSplit={this.addSplit}
                removeSplit={this.removeSplit}
                handleSplitChange={this.handleSplitChange}
                removeClicked={this.removeClicked}
                validateForm={this.validateForm}
              />
            </EDFormBox>
          </EDFormSection>
        </SaveNavbar>
      </LoaderPanel>
    );
  }
}

export default withLoadSave({
  extend: RouteEdit,
  initial: {
    name: '',
    usedefault: false,
    rules: [{
      default: true,
      domaingroup: '',
      splits: [{
        policy: '',
        pct: 100,
      }],
    }],
  },
  get: async ({id}) => (await axios.get('/api/routes/' + id)).data,
  post: ({data}) => axios.post('/api/routes/', data),
  patch: ({id, data}) => axios.patch('/api/routes/' + id, data),
  extra: {
    domaingroups: async () => _.sortBy((await axios.get('/api/domaingroups')).data, d => d.name.toLowerCase()),
    policies: async () => _.sortBy((await axios.get('/api/routepolicies')).data, p => p.name.toLowerCase()),
  },
});
