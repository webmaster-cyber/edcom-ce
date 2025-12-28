import React, { Component } from "react";
import { sendGA4Event } from "../utils/tracking";
import { Row, Col } from "react-bootstrap";
import axios from "axios";
import getvalue from "../utils/getvalue";
import LoaderPanel from "../components/LoaderPanel";
import LoaderButton from "../components/LoaderButton";
import withLoadSave from "../components/LoadSave";
import { SelectLabel, FormControlLabel } from "../components/FormControls";
import SaveNavbar from "../components/SaveNavbar";
import _ from "underscore";
import { EDFormSection, EDFormBox } from "../components/EDDOM";
import parse from "../utils/parse";

class Warmup extends Component {
  constructor(props) {
    super(props);

    this._overrideset = false;
  }

  validateForm() {
    var d = this.props.data;
    return d.name && d.sink && d.ips.length && d.domains.length &&
      d.dailylimit !== '' && d.rampfactor !== '' && d.threshold !== '' && d.thresholddays !== '' &&
      !_.isString(_.find(_.values(d.dayoverrides), v => v === ''));
  }

  componentDidUpdate() {
    if (this.props.override && !this._overrideset) {
      this._overrideset = true;
      var p = parse(this);
      this.props.update({
        name: {$set: `${this.props.override.name} (${p.ip}/${p.domain})`},
        sink: {$set: this.props.override.sink},
        ips: {$set: p.ip},
        ipsset: {$set: true},
        domains: {$set: p.domain},
        priority: {$set: 'high'},
        dailylimit: {$set: parseInt(p.limit, 10)},
        rampfactor: {$set: this.props.override.rampfactor},
        threshold: {$set: this.props.override.threshold},
        thresholddays: {$set: this.props.override.thresholddays},
      });
    } else if (this.props.data.sink) {
      if (!this.props.data.ipsset) {
        this.props.update({ips: {$set: _.find(this.props.sinks, sink => sink.id === this.props.data.sink).ips},
                           ipsset: {$set: true},
                           sinkname: {$set: _.find(this.props.sinks, sink => sink.id === this.props.data.sink).name}});
      }
    }
  }

  handleChange = event => {
    var p = {[event.target.id]: {$set: getvalue(event)}};
    if (event.target.id === 'sink') {
      if (this.props.data.sink && this.props.sinks) {
        p.ips = {$set: _.find(this.props.sinks, sink => sink.id === event.target.value).ips};
        p.sinkname = {$set: _.find(this.props.sinks, sink => sink.id === event.target.value).name};
      }
    }
    this.props.update(p)
  }

  handleSubmit = async event => {
    event.preventDefault();

    await this.onSave();

    this.goBack();
  }

  onSave = async () => {
    await this.props.save();
  }

  goBack = () => {
    this.props.history.push('/warmups');
  }

  handleLimitChange = event => {
    var daynum = event.target.id.substring(3);

    this.props.update({dayoverrides: {[daynum]: { $set: getvalue(event) } } });
  }

  navbarButtons = () => {
    return (
      <LoaderButton
        id="warmup-buttons-dropdown"
        text="Save and Close"
        loadingText="Saving..."
        className="green"
        disabled={!this.validateForm() || this.props.isSaving}
        onClick={(e) => {
          sendGA4Event('IP Warmups', 'Saved IP Warmup', 'Saved IP Warmup');
          return this.handleSubmit(e);
        }}
        splitItems={[
          {
            text: 'Save',
            onClick: () => {
              sendGA4Event('IP Warmups', 'Saved IP Warmup', 'Saved IP Warmup');
              return this.onSave();
            }
          },
          { text: 'Cancel', onClick: this.goBack }
        ]}
      />
    )
  }

  render() {
    var lim = (this.props.data && this.props.data.dailylimit) || 0;

    var days = [];
    for (var i = 0; i <= this.props.data.limitcount; i++) {
      if (i > 0) {
        days.push({
          num: i,
          limit: lim,
        });
      }

      lim += Math.floor(lim * (this.props.data.rampfactor * 0.01));
      var factor = Math.pow(10, Math.floor(Math.log10(lim)));
      lim = Math.floor((lim/factor).toPrecision(3) * factor);
    }

    var dataName = this.props.data && (this.props.data.name || '');
    var title = this.props.id === 'new' ? "Create Warmup Schedule" : `Edit Warmup Schedule ${dataName ? `for "${dataName}"` : ''}`;

    return (
      <LoaderPanel isLoading={this.props.isLoading}>
        <SaveNavbar isAdmin={true} title={title} disabled={!this.validateForm()} onBack={this.goBack}
          buttons={this.navbarButtons()} isSaving={this.props.isSaving} id={this.props.id}>
          <EDFormSection onSubmit={this.handleSubmit}>
            <EDFormBox>
              <FormControlLabel
                id="name"
                label="Schedule Name"
                obj={this.props.data}
                onChange={this.handleChange}
              />
              <SelectLabel
                id="sink"
                label="Server"
                obj={this.props.data}
                onChange={this.handleChange}
                options={this.props.sinks}
                space
              />
              <Row>
                <Col sm={6}>
                  <FormControlLabel
                    id="ips"
                    label="IPs to Warm Up"
                    obj={this.props.data}
                    componentClass="textarea"
                    rows="5"
                    onChange={this.handleChange}
                    space
                  />
                </Col>
                <Col sm={6}>
                  <FormControlLabel
                    id="excludeips"
                    label="Exclude IPs"
                    obj={this.props.data}
                    componentClass="textarea"
                    rows="5"
                    onChange={this.handleChange}
                    space
                  />
                </Col>
              </Row>
              <Row>
                <Col sm={6}>
                  <FormControlLabel
                    id="domains"
                    label="Domains to Warm Up"
                    obj={this.props.data}
                    componentClass="textarea"
                    rows="6"
                    onChange={this.handleChange}
                    space
                  />
                </Col>
                <Col sm={6}>
                  <FormControlLabel
                    id="excludedomains"
                    label="Exclude Domains"
                    obj={this.props.data}
                    componentClass="textarea"
                    rows="6"
                    onChange={this.handleChange}
                    space
                  />
                </Col>
              </Row>
              <Row>
                <Col xs={12}>
                  <div className="help-block">Wildcards accepted, e.g.: yahoo.* specifies all yahoo TLDs such as yahoo.com, yahoo.co.uk, etc.</div>
                </Col>
              </Row>
              <SelectLabel
                id="priority"
                label="Warmup Priority"
                obj={this.props.data}
                onChange={this.handleChange}
                space
              >
                <option value="low">Default</option>
                <option value="med">Higher</option>
                <option value="high">Highest</option>
              </SelectLabel>
              <div>
                <FormControlLabel
                  id="dailylimit"
                  label="Initial Daily Limit"
                  obj={this.props.data}
                  onChange={this.handleChange}
                  groupStyle={{display: 'inline-block'}}
                  style={{width:'75px'}}
                  type="number"
                  min="1"
                  max="1000000"
                  space
                />
                <FormControlLabel
                  id="limitcount"
                  label="Number of Increases"
                  obj={this.props.data}
                  onChange={this.handleChange}
                  groupStyle={{display: 'inline-block', paddingLeft: '30px'}}
                  style={{width:'75px'}}
                  type="number"
                  min="1"
                  max="30"
                  space
                />
              </div>
              <div className="form-inline">
                <FormControlLabel
                  id="rampfactor"
                  type="number"
                  label="Increase limit by"
                  suffix="%"
                  obj={this.props.data}
                  onChange={this.handleChange}
                  style={{width:'75px', textAlign: 'right'}}
                  min="1"
                  max="1000"
                  space
                  inline
                />
                {' '}
                <FormControlLabel
                  id="threshold"
                  type="number"
                  label="after reaching a threshold of"
                  suffix="%"
                  obj={this.props.data}
                  onChange={this.handleChange}
                  style={{width:'75px', textAlign: 'right'}}
                  min="1"
                  max="100"
                  space
                  inline
                />
                {' '}
                <FormControlLabel
                  id="thresholddays"
                  type="number"
                  label="of the daily limit for"
                  suffix="days"
                  obj={this.props.data}
                  onChange={this.handleChange}
                  style={{width:'75px', textAlign: 'right'}}
                  min="1"
                  max="20"
                  space
                  inline
                />
              </div>
              <SelectLabel
                id="afterlimit"
                label="After final increase"
                obj={this.props.data}
                onChange={this.handleChange}
                space
              >
                <option value="warmup">Keep final sending limit</option>
                <option value="policy">End warmup and use policy limit</option>
              </SelectLabel>
            </EDFormBox>
            <EDFormBox space>
              <h5 className="text-center text-danger">Warmup limits always override delivery policy limits</h5>
              <h5 className="text-center space20">Initial Limit: {this.props.data.dailylimit}</h5>
              <Row>
                <Col xs={6} xsOffset={3}>
                  <table className="table table-striped">
                    <thead>
                      <tr>
                        <th className="text-center">Increase #</th>
                        <th className="text-right">Send Limit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {
                        _.map(days, d =>
                          <tr key={d.num}>
                            <td style={{textAlign: 'center'}}>
                              <b>{d.num.toLocaleString()}</b>
                            </td>
                            <td className="text-right" style={{paddingTop: '10px', paddingRight: '10px'}}>
                              <input id={`day${d.num}`} type="number" style={{width: '180px', textAlign: 'right'}} value={this.props.data.dayoverrides[d.num.toString()] === '' || _.isNumber(this.props.data.dayoverrides[d.num.toString()]) ? this.props.data.dayoverrides[d.num.toString()] : d.limit} onChange={this.handleLimitChange}/>
                            </td>
                          </tr>
                        )
                      }
                    </tbody>
                  </table>
                </Col>
              </Row>
            </EDFormBox>
          </EDFormSection>
        </SaveNavbar>
      </LoaderPanel>
    );
  }
}

export default withLoadSave({
  extend: Warmup,
  initial: {
    name: '',
    sink: null,
    ips: '',
    ipsset: false,
    excludeips: '',
    domains: '*',
    excludedomains: '',
    priority: 'med',
    dailylimit: 200,
    limitcount: 14,
    rampfactor: 100,
    threshold: 80,
    thresholddays: 1,
    dayoverrides: {},
    countlimit: 14,
    afterlimit: 'warmup',
  },
  extra: {
    sinks: async () => _.sortBy((await axios.get('/api/sinks')).data, s => s.name.toLowerCase()),
    override: async ({override}) => {
      if (override) {
        return (await axios.get('/api/warmups/' + override)).data;
      }
      return null;
    }
  },
  extramerge: {
    sink: 'sinks',
  },
  get: async ({id}) => (await axios.get('/api/warmups/' + id)).data,
  patch: ({id, data}) => axios.patch('/api/warmups/' + id, data),
  post: ({data}) => axios.post('/api/warmups', data),
});
