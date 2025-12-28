import React, { Component } from "react";
import { Checkbox } from "react-bootstrap";
import axios from "axios";
import getvalue from "../utils/getvalue";
import LoaderPanel from "../components/LoaderPanel";
import LoaderButton from "../components/LoaderButton";
import withLoadSave from "../components/LoadSave";
import SaveNavbar from "../components/SaveNavbar";
import _ from "underscore";
import { EDFormSection, EDFormBox } from "../components/EDDOM";
import { FormControlLabel, SelectLabel } from "../components/FormControls";
import parse from "../utils/parse";

class PolicyServerEdit extends Component {
  constructor(props) {
    super(props);

    this.state = {
      filter: '',
    };
  }

  index() {
    var p = parse(this);
    return parseInt(p.index, 10);
  }

  validateForm() {
    const d = this.props.data;
    if (!d.sinks)
      return;

    var sink = this.props.data.sinks[this.index()];
    var iplist = sink.iplist;
    var selectcount = 0;
    for (var i in iplist) {
      var obj = iplist[i];
      if (obj.selected)
        selectcount++;
      if (sink.algorithm === "custom") {
        if (obj.mintype === 'pct' && obj.minpct === '')
          return false;
        if (obj.mintype === 'num' && obj.minnum === '')
          return false;
      }
    }

    return selectcount > 0;
  }

  handleStateChange = event => {
    var val = getvalue(event);
    this.setState({[event.target.id]: val});
  }

  handleSinkChange = event => {
    var val = getvalue(event);

    this.props.update({sinks: {[this.index()]: {[event.target.id]: {$set: val}}}});
  }

  handleChange = (ip, event) => {
    var val = getvalue(event);

    this.props.update({sinks: {[this.index()]: {iplist: {[ip]: {[event.target.id]: {$set: val}}}}}});
  }

  goBack = () => {
    this.props.history.push('/policies/servers?id=' + this.props.id);
  }

  onSubmit = async event => {
    event.preventDefault();

    await this.onSave();

    this.goBack();
  }

  onSave = async () => {
    await this.props.save();
  }

  getSink() {
    if (!this.props.data.sinks)
      return {iplist: {}};
    return this.props.data.sinks[this.index()];
  }

  getIP(ip) {
    if (!this.props.data.sinks)
      return {};
    var r = this.props.data.sinks[this.index()].iplist[ip];
    if (!r)
      return {}
    return r;
  }

  isSelected(ip) {
    if (!this.props.data.sinks)
      return false;
    return this.props.data.sinks[this.index()].iplist[ip] && this.props.data.sinks[this.index()].iplist[ip].selected;
  }

  componentDidUpdate() {
    var upd = {};
    if (this.props.data.sinks && this.props.sink) {
      var iplist = this.props.data.sinks[this.index()].iplist;
      var empty = !_.size(iplist);

      _.pluck(this.props.sink.ipdata, 'ip').forEach(ip => {
        if (!iplist[ip]) {
          upd[ip] = {$set: {
            selected: empty,
            mintype: 'pct',
            minpct: 0,
            minnum: 0,
            sendcap: '',
            sendrate: '',
          }};
        }
      });

      _.each(this.props.data.sinks[this.index()].iplist, (obj, ip) => {
        if (!_.find(_.pluck(this.props.sink.ipdata, 'ip'), i => i === ip)) {
          if (!upd.$unset)
            upd.$unset = [];
          upd.$unset.push(ip);
        }
      });

      if (_.size(upd)) {
        this.props.update({sinks: {[this.index()]: { iplist: upd } } });
      }
    }
  }

  selectAllChecked() {
    if (!this.props.data.sinks || !this.props.sink)
      return false;
    var selectcount = 0;
    _.each(this.props.data.sinks[this.index()].iplist, obj => {
      if (obj.selected)
        selectcount++;
    });
    return selectcount === this.props.sink.ipdata.length;
  }

  selectAll = event => {
    var ind = this.index();
    var upd = {};
    _.each(this.props.data.sinks[ind].iplist, (obj, ip) => {
      upd[ip] = { selected: { $set: event.target.checked } };
    });
    this.props.update({sinks: {[ind]: { iplist: upd } } });
  }

  select = event => {
    this.props.update({sinks: {[this.index()]: { iplist: { [event.target.id]: { selected: { $set: event.target.checked } } } } } });
  }

  navbarButtons = () => {
    return (
      <LoaderButton
        id="policy-server-buttons-dropdown"
        text="Save and Close"
        loadingText="Saving..."
        className="green"
        disabled={!this.validateForm() || this.props.isSaving}
        onClick={this.onSubmit}
        splitItems={[
          { text: 'Save', onClick: this.onSave },
          { text: 'Cancel', onClick: this.goBack }
        ]}
      />
    )
  }

  render() {
    var sinkName = this.props.sink && (this.props.sink.name || '');
    var title = `Edit IP Split ${sinkName ? `for "${sinkName}"` : ''}`;

    return (
      <LoaderPanel isLoading={this.props.isLoading}>
        <SaveNavbar isAdmin={true} title={title} onBack={this.goBack} disabled={!this.validateForm()} isSaving={this.props.isSaving}
          buttons={this.navbarButtons()} id={this.props.id}>
          <EDFormSection onSubmit={this.onSubmit}>
            <EDFormBox className="form-inline">
              <h5>
                Uncheck IP addresses to disable them for this MTA Policy.
              </h5>
              <div className="text-right space20">
                <SelectLabel
                  id="algorithm"
                  label=""
                  inline
                  obj={this.getSink()}
                  onChange={this.handleSinkChange}
                  style={{width: 'auto', display: 'inline-block'}}
                  help={
                    !this.getSink().algorithm ?
                      'MTA rotates IP addresses based on delivery capacity availability'
                      :
                      'Throttle sending speed and optimize load balancing'
                  }
                >
                  <option value="">Automated Delivery</option>
                  <option value="custom">Customize Delivery</option>
                </SelectLabel>
              </div>
              <table className="table ip2-table table-responsive">
                <thead>
                  <tr>
                    <th style={{width: '30px', paddingTop: '32px'}}>
                      <Checkbox
                        id="selectall"
                        checked={this.selectAllChecked()}
                        onChange={this.selectAll}
                      />
                    </th>
                    <th>
                      <FormControlLabel
                        id="filter"
                        obj={this.state}
                        placeholder="Filter"
                        style={{width: '180px'}}
                        onChange={this.handleStateChange}
                      />
                    </th>
                    <th style={{textAlign:'right'}}>Load Balancing</th>
                    <th style={{textAlign:'right'}}>Daily Send Limit</th>
                    <th style={{textAlign:'right'}}>Hourly Limit</th>
                  </tr>
                </thead>
                <tbody>
                  {
                    _.map(_.filter(_.pluck(this.props.sink && this.props.sink.ipdata, 'ip'), ip => ip.includes(this.state.filter)), ip => (
                      <tr key={ip}>
                        <td style={{paddingTop: '12px'}}>
                          <Checkbox
                            id={ip}
                            checked={this.isSelected(ip)}
                            onChange={this.select}
                          />
                        </td>
                        <td>
                          {ip}
                        </td>
                        <td style={{textAlign:'right'}}>
                          <SelectLabel
                            id="mintype"
                            inline
                            obj={this.getIP(ip)}
                            disabled={!this.getSink().algorithm || !this.isSelected(ip)}
                            onChange={this.handleChange.bind(null, ip)}
                            style={{marginRight:'6px'}}
                          >
                            <option value="pct">Percent</option>
                            <option value="num">Number</option>
                          </SelectLabel>
                          {
                            this.getIP(ip).mintype === 'pct' &&
                            <FormControlLabel
                              id="minpct"
                              inline
                              obj={this.getIP(ip)}
                              style={{width: '80px'}}
                              onChange={this.handleChange.bind(null, ip)}
                              disabled={!this.getSink().algorithm || !this.isSelected(ip)}
                              type="number"
                              min="0"
                              max="100"
                            />
                          }
                          {
                            this.getIP(ip).mintype === 'num' &&
                            <FormControlLabel
                              id="minnum"
                              inline
                              obj={this.getIP(ip)}
                              style={{width: '130px'}}
                              onChange={this.handleChange.bind(null, ip)}
                              disabled={!this.getSink().algorithm || !this.isSelected(ip)}
                              type="number"
                              min="0"
                            />
                          }
                        </td>
                        <td style={{textAlign:'right'}}>
                          <FormControlLabel
                            id="sendcap"
                            inline
                            obj={this.getIP(ip)}
                            style={{width: '130px'}}
                            onChange={this.handleChange.bind(null, ip)}
                            disabled={!this.isSelected(ip)}
                            type="number"
                            min="0"
                            placeholder="None"
                          />
                        </td>
                        <td style={{textAlign:'right'}}>
                          <FormControlLabel
                            id="sendrate"
                            inline
                            obj={this.getIP(ip)}
                            style={{width: '100px'}}
                            onChange={this.handleChange.bind(null, ip)}
                            disabled={!this.isSelected(ip)}
                            type="number"
                            min="0"
                            placeholder="None"
                          />
                        </td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </EDFormBox>
          </EDFormSection>
        </SaveNavbar>
      </LoaderPanel>
    );
  }
}

export default withLoadSave({
  extend: PolicyServerEdit,
  initial: [],
  get: async ({id}) => (await axios.get('/api/policies/' + id)).data,
  patch: ({id, data}) => axios.patch('/api/policies/' + id, data),
  extra: {
    sink: async ({sinkid}) => (await axios.get('/api/sinks/' + sinkid)).data,
  }
});
