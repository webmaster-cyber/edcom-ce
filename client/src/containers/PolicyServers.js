import React, { Component } from "react";
import { Button, Glyphicon, Col } from "react-bootstrap";
import { Link } from "react-router-dom";
import axios from "axios";
import getvalue from "../utils/getvalue";
import LoaderPanel from "../components/LoaderPanel";
import LoaderButton from "../components/LoaderButton";
import withLoadSave from "../components/LoadSave";
import WizardNavbar from "../components/WizardNavbar";
import PolicyProgress from "../components/PolicyProgress";
import _ from "underscore";
import Datetime from "react-datetime";
import { EDFormSection, EDFormGroup, EDFormBox } from "../components/EDDOM";
import { FormControlLabel, SelectLabel } from "../components/FormControls";
import moment from "moment";
import ScrollToTop from "../components/ScrollToTop";

import "./PolicyServers.css";

const TableRow = ({s, handleChange, handleTimeChange, sinks, settings, removeClicked, editIPs, len, ind}) => {
  let numips = undefined;
  const sink = sinks.find(sink => sink.id === s.sink);
  if (sink && !_.isUndefined(sink.ipdata) && !_.isNull(sink.ipdata)) {
    numips = _.size(sink.ipdata)
  }
  return (
  <EDFormBox space className="server-box">
    <table className="table table-responsive form-inline">
      <thead>
        <tr>
          <th>Server</th>
          <th></th>
          <th></th>
          <th></th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style={{paddingLeft:'10px'}}>
            <SelectLabel
              id="sink"
              obj={s}
              onChange={handleChange.bind(null, ind)}
              options={sinks}
            />
          </td>
          <td style={{paddingLeft:'10px'}}>
            {
              _.isUndefined(numips) ?
                ''
              : (
                numips === 1 ?
                '1 IP Address'
                :
                `${numips} IP Addresses`
              )
            }
          </td>
          <td style={{paddingLeft:'10px'}}>
            <SelectLabel
              id="allips"
              obj={s}
              inline
              onChange={handleChange.bind(null, ind)}>
              <option value="true">Set Send Limits for All IPs</option>
              <option value="false">Set Per-IP Send Limits</option>
            </SelectLabel>
            { !s.allips &&
              <Button style={{marginLeft: '4px'}} onClick={editIPs.bind(null, ind)}>
                <span className="fa fa-pencil"/>
              </Button>
            }
          </td>
          <td style={{paddingLeft:'10px'}}>
            <Button
              style={{marginLeft:'6px', marginTop:'-3px', opacity: len <= 1 && ind === 0 ? 0 : undefined}}
              onClick={removeClicked.bind(null, ind)}
              disabled={len <= 1 && ind === 0}>
              <Glyphicon glyph="remove"/>
            </Button>
          </td>
        </tr>
      </tbody>
    </table>
    {
      s.allips &&
      <hr/>
    }
    {
      s.allips &&
      <div className="row" style={{paddingLeft:'15px'}}>
        <Col sm={6}>
          <FormControlLabel
            id="sendcap"
            label="Daily Send Limit"
            obj={s}
            onChange={handleChange.bind(null, ind)}
            style={{width:'120px'}}
            disabled={!s.allips}
            type="number"
            min="0"
            placeholder="None"
          />
        </Col>
        <Col sm={6}>
          <FormControlLabel
            id="sendrate"
            label="Hourly Send Limit"
            obj={s}
            onChange={handleChange.bind(null, ind)}
            style={{width:'100px'}}
            disabled={!s.allips}
            type="number"
            min="0"
            placeholder="None"
          />
        </Col>
      </div>
    }
    <hr/>
    <div className="row" style={{paddingLeft:'15px'}}>
      <Col sm={6}>
        <EDFormGroup>
          <label>New Day Start Time</label>
          <Datetime
            value={moment(s.captime)}
            onChange={handleTimeChange.bind(null, ind)}
            dateFormat={null}
            inputProps={{style: {width:'100px'}}}
          />
        </EDFormGroup>
      </Col>
    </div>
  </EDFormBox>
  );
}

const SortableTable = ({datasinks, handleChange, handleTimeChange, sinks, settings, removeClicked, editIPs}) => {
  return (
    <div>
        {
          _.map(datasinks, (s, index) =>
          <TableRow
            s={s}
            handleChange={handleChange}
            handleTimeChange={handleTimeChange}
            sinks={sinks}
            settings={settings}
            removeClicked={removeClicked}
            editIPs={editIPs}
            len={datasinks.length}
            index={index}
            ind={index}
            key={'row-' + index}
          />
        )
      }
    </div>
  );
}

class PolicyServers extends Component {
  validateForm() {
    const d = this.props.data;
    if (!d.sinks)
      return;
    var used = {}
    for (var i = 0; i < d.sinks.length; i++) {
      var s = d.sinks[i];
      if (used[s.sink]) {
        return false;
      }
      used[s.sink] = true;

      if (s.pct === '')
        return false;
    }
    return d.sinks.length;
  }

  handleTimeChange = (index, m) => {
    if (_.isUndefined(m) || m === null || _.isString(m))
      return;

    var obj = _.clone(this.props.data.sinks[index]);
    obj.captime = m.format();

    this.props.update({sinks: {$splice: [[index, 1, obj]]}});
  }

  handleChange = (index, event) => {
    var val = getvalue(event);

    if (event.target.id === 'allips') {
      val = val === 'true'
    }

    var obj = _.clone(this.props.data.sinks[index]);
    obj[event.target.id] = val;

    this.props.update({sinks: {$splice: [[index, 1, obj]]}});
  }

  addClicked = () => {
    var remain = 100;

    const d = this.props.data;
    var used = {}
    for (var i = 0; i < d.sinks.length; i++) {
      remain -= d.sinks[i].pct;
      used[d.sinks[i].sink] = true;
    }

    var s = _.find(this.props.sinks, s => !used[s.id]);
    if (!s) {
      s = this.props.sinks[0];
    }
    this.props.update({sinks: {$push: [{
      sink: s.id,
      sendcap: '',
      captime: moment().hours(9).minutes(0).seconds(0).format(),
      sendrate: '',
      pct: Math.max(0, remain),
      settings: '',
      algorithm: '',
      allips: true,
      iplist: {}
    }]}})
  }

  removeClicked = index => {
    this.props.update({sinks: {$splice: [[index, 1]]}})
  }

  editIPs = async index => {
    await this.props.save();

    this.props.history.push('/policies/servers/edit?id=' + this.props.id + '&index=' + index + '&sinkid=' + this.props.data.sinks[index].sink);
  }

  componentWillReceiveProps(p) {
    const data = p.data;

    if (!p.sinks || !data) {
      return;
    }

    let newsinks = data.sinks;
    let changed = false;

    // remove any items that refer to deleted sinks
    for (let i = data.sinks.length - 1; i >= 0; i--) {
      const sinkid = data.sinks[i].sink;
      let found = false;
      for (let j = 0; j < p.sinks.length; j++) {
        if (p.sinks[j].id === sinkid) {
          found = true;
          break;
        }
      }
      if (!found) {
        newsinks.splice(i, 1);
        changed = true;
      }
    }

    if (!newsinks.length && p.sinks.length) {
      const sink = _.sortBy(p.sinks, 'name')[0].id;
      newsinks = [{
        sink: sink,
        allips: true,
        pct: 100,
        iplist: {},
        algorithm: '',
        sendcap: '',
        captime: moment().hours(9).minutes(0).seconds(0).format(),
        sendrate: '',
      }];
      changed = true;
    }

    if (changed) {
      this.props.update({sinks: {$set: newsinks}});
    }
  }

  onBack = () => {
    this.props.history.push('/policies/deferrals?id=' + this.props.id);
  }

  onNext = async event => {
    event.preventDefault();

    await this.props.save();

    this.onExit();
  }

  onExit = async () => {
    this.props.history.push('/policies');
  }

  onLinkClick = async url => {
    await this.props.save();

    this.props.history.push(url);
  }

  wizardNavbarButtons = () => {
    return (
      <LoaderButton
        id="policy-wizard-buttons-dropdown"
        text="Save and Close"
        loadingText="Saving..."
        className="green"
        disabled={!this.validateForm() || this.props.isSaving}
        onClick={this.onNext}
        splitItems={[
          { text: 'Save', onClick: this.props.save },
          { text: 'Exit Without Saving', onClick: this.onExit }
        ]}
      />
    )
  }

  render() {
    return (
      <div className="policy-servers">
        <ScrollToTop />
        <LoaderPanel isLoading={this.props.isLoading}>
          <WizardNavbar isAdmin={true} isSaving={this.props.isSaving} user={this.props.user} brandText="Policy Editor"
            link="/policies"
            disabled={!this.validateForm()} buttons={this.wizardNavbarButtons()}/>
          <EDFormSection onSubmit={this.onNext}>
            <PolicyProgress active={4} id={this.props.id} disabled={this.props.id === 'new'} onClick={this.onLinkClick} />
            <EDFormBox>
              {
                (this.props.data.sinks && this.props.data.sinks.length) ?
                  <div>
                    <h5 className="text-center text-danger">Warmup limits always override delivery policy limits</h5>
                    <div className="text-right">
                    </div>
                    <SortableTable
                      datasinks={this.props.data.sinks}
                      handleChange={this.handleChange}
                      handleTimeChange={this.handleTimeChange}
                      sinks={this.props.sinks}
                      settings={this.props.settings}
                      removeClicked={this.removeClicked}
                      editIPs={this.editIPs}
                    />
                  </div>
                :
                  <h5 className="text-center text-danger">No servers found in the system. Please <Link style={{fontSize: '14px'}} to="/servers/edit?id=new">add a server</Link> before continuing.</h5>
              }
            </EDFormBox>
          </EDFormSection>
        </LoaderPanel>
      </div>
    );
  }
}

export default withLoadSave({
  extend: PolicyServers,
  initial: [],
  get: async ({id}) => (await axios.get('/api/policies/' + id)).data,
  patch: ({id, data}) => axios.patch('/api/policies/' + id, data),
  extra: {
    sinks: async () => (await axios.get('/api/sinks')).data,
  },
});
