import React, { Component } from "react";
import LoaderIcon from "../components/LoaderIcon";
import MenuNavbar from "../components/MenuNavbar";
import TitlePage from "../components/TitlePage";
import moment from "moment";
import axios from "axios";
import _ from "underscore";
import getvalue from "../utils/getvalue";
import { Line, ComposedChart, XAxis, YAxis, Tooltip, Bar } from "recharts";
import { EDTableSection } from "../components/EDDOM";
import { Checkbox, FormControl } from "react-bootstrap";
import dateformat from "../utils/date-format";

export default class EmailDelivery extends Component {
  constructor(props) {
    super(props);

    this.state = {
      alldata: null,
      alldatadays: null,
      alldatahours: null,
      data: null,
      sinks: [],
      hasmg: false,
      hasses: false,
      reloading: props.user?true:false,
      showOpens: false,
      showDeferrals: false,
      showErrors: false,
      viewType: 'server',
      stats: null,
      onboarding: null,
      contacts: 0,
      servers: '',
      domains: '',
    };

    this.componentWillReceiveProps(props);

    this.reloadDebounce = _.debounce(this.reload, 800);
  }

  componentWillReceiveProps(props) {
    if (props.user) {
      this.reload(props);
    }
  }

  handleChange = event => {
    var id = event.target.id;
    this.setState({[id]: getvalue(event)});
  }

  handleViewChange = event => {
    this.setState({viewType: getvalue(event)});

    this.reloadDebounce(this.props);
  }

  handleFilterChange = event => {
    var id = event.target.id;
    this.setState({[id]: getvalue(event)});

    this.reloadDebounce(this.props);
  }

  loadSinks = async () => {
    let servers = this.state.servers.split(/\s*,\s*/).map(s => s.toLowerCase());

    var sinks = _.sortBy((await axios.get('/api/sinks')).data, s => s.name.toLowerCase());

    if (this.state.servers) {
      sinks = sinks.filter(s => servers.find(s2 => s2 === s.name.toLowerCase()));
    }

    var hasmg = false;
    if (servers) {
      if (servers.find(s2 => s2 === 'mailgun')) {
        hasmg = (await axios.get('/api/mailgun')).data.length;
      }
    } else {
      hasmg = (await axios.get('/api/mailgun')).data.length;
    }
    var hasses = false;
    if (servers) {
      if (servers.find(s2 => s2 === 'ses')) {
        hasses = (await axios.get('/api/ses')).data.length;
      }
    } else {
      hasses = (await axios.get('/api/ses')).data.length;
    }
    return {sinks: sinks, hasmg: hasmg, hasses: hasses};
  }

  reload = async (props) => {
    console.log("reloading");
    this.setState({reloading: true});

    var sinks, hasmg, hasses;

    var p = [];
    p.push((async () => (await axios.get('/api/allstats?end=' + dateformat(moment().hour(23).minute(59).second(59)) + '&servers=' + encodeURIComponent(this.state.servers) + '&domains=' + encodeURIComponent(this.state.domains))).data)());
    if (this.state.viewType === 'server') {
      ({sinks, hasmg, hasses} = await this.loadSinks());
      sinks.forEach(sink => {
        p.push((async () => (await axios.get('/api/sinks/' + sink.id + '/sumstats?end=' + dateformat(moment().hour(23).minute(59).second(59)) + '&domains=' + encodeURIComponent(this.state.domains))).data)());
      });
      if (hasmg) {
        p.push((async () => (await axios.get('/api/sinks/mailgun/sumstats?end=' + dateformat(moment().hour(23).minute(59).second(59)) + '&domains=' + encodeURIComponent(this.state.domains))).data)());
      }
      if (hasses) {
        p.push((async () => (await axios.get('/api/sinks/ses/sumstats?end=' + dateformat(moment().hour(23).minute(59).second(59)) + '&domains=' + encodeURIComponent(this.state.domains))).data)());
      }
    } else {
      sinks = (await axios.get('/api/allsettings')).data;
      hasmg = false;
      hasses = false;

      sinks.forEach(sink => {
        p.push((async () => (await axios.get('/api/settingsstats/' + sink.id + '?end=' + dateformat(moment().hour(23).minute(59).second(59)) + '&domains=' + encodeURIComponent(this.state.domains))).data)());
      });
    }

    var results = await Promise.all(p);

    var data = {}

    var i;
    for (i = 0; i < sinks.length; i++) {
      data[sinks[i].id] = results[i+1];
    }
    if (hasmg) {
      data['mailgun'] = results[i+1];
    }
    if (hasses) {
      data['ses'] = results[i+2];
    }

    let alldata = results[0];
    let alldatadays  = this.fixData(alldata, 'day');
    let alldatahours = this.fixData(alldata, 'hour');

    var d = {};
    sinks.forEach(s => {
      d[s.id] = {};
      d[s.id].days = this.fixData(data[s.id], 'day');
      d[s.id].hours = this.fixData(data[s.id], 'hour');
    });
    data = d; 

    this.setState({version: results[0].version, alldata: alldata, alldatahours: alldatahours, alldatadays: alldatadays, data: data, reloading: false, sinks: sinks, hasmg: hasmg, hasses: hasses});
  }

  fixData(alldata, type) {
    if (type === 'day') {
      alldata = _.map(alldata.summary, s => {
        let ts = moment(s.ts).local();
        return {
          displayName: (ts.month() + 1) + "/" + ts.date(),
          Delivered: s.send,
          'Hard Bounced': s.hard,
          'Soft Bounced': s.soft,
          'Errors': s.err || 0,
          'Opens':        s.open || 0,
          'Deferrals':    s.defercnt || 0,
          ts: ts,
        };
      }).reverse();
    } else {
      alldata = _.map(alldata.hours, h => {
        let ts = moment(h.ts).local().format('ha');
        return {
          ts:             h.ts,
          displayName:    ts,
          Delivered:      h.send,
          'Hard Bounced': h.hard,
          'Soft Bounced': h.soft,
          'Errors':       h.err || 0,
          'Opens':        h.open || 0,
          'Deferrals':    h.defercnt || 0,
        }
      }).reverse();

      for (let i = 0; i < alldata.length - 1; i++) {
        if (moment(alldata[i+1].ts).diff(moment(alldata[i].ts)) > 1000 * 60 * 60) {
          var t = moment(alldata[i].ts).add(1, 'hour');
          alldata.splice(i + 1, 0, {
            ts: t,
            displayName: t.local().format('ha'),
            Delivered: 0,
            'Hard Bounced': 0,
            'Soft Bounced': 0,
            'Errors': 0,
            'Opens': 0,
            'Deferrals': 0,
          });
        }
      }
    }
    return alldata;
  }

  render() {
    const { user } = this.props;

    var {alldata, alldatahours, alldatadays, data} = this.state;

    var sinks = [...this.state.sinks];
    
    if (this.state.hasmg) {
      sinks.push({id: 'mailgun', name: 'Mailgun'});
    }
    if (this.state.hasses) {
      sinks.push({id: 'ses', name: 'Amazon SES'});
    }

    return (
      this.props.loggedInUID && !this.props.user ?
        <div className="text-center space20">
          <LoaderIcon/>
        </div>
      :
      <MenuNavbar {...this.props} isAdmin={this.props.user && this.props.user.admin && !this.props.loggedInImpersonate}>
        <div>
        {
          this.props.loggedInUID && user && !user.frontend && alldata &&
            <TitlePage title="Delivery Dashboard" />
        }
          <EDTableSection>
            <div className="text-center">
              {
                  !user ?
                      <div className="text-center">
                        <LoaderIcon/>
                      </div>
                    :
                <div className="text-center">
                  { !alldata &&
                    <LoaderIcon/>
                  }
                  {
                    alldata &&
                    <div style={{display:'inline-block'}}>
                      <div className="form-inline space20">
                        <FormControl componentClass="select" value={this.state.viewType} onChange={this.handleViewChange}>
                          <option value="server">View By Server</option>
                          <option value="settings">View By Policy/Account</option>
                        </FormControl>
                      </div>
                      <div className="form-inline space20">
                        <Checkbox id="showOpens" inline value={this.state.showOpens} onChange={this.handleChange}>
                          Show Opens
                        </Checkbox>
                        <Checkbox id="showDeferrals" inline value={this.state.showDeferrals} onChange={this.handleChange}>
                          Show Deferrals
                        </Checkbox>
                        <Checkbox id="showErrors" inline value={this.state.showErrors} onChange={this.handleChange}>
                          Show Errors
                        </Checkbox>
                      </div>
                      <div className="form-inline space20">
                        <FormControl id="domains" type="text" value={this.state.domains} placeholder="Domain Filter" onChange={this.handleFilterChange} />{' '}
                        <FormControl id="servers" type="text" value={this.state.servers} placeholder="Server Filter" onChange={this.handleFilterChange} />
                      </div>
                      <h4 className="space20">{this.state.viewType === 'server'?'All Servers':'All Policies'}</h4>
                      <div className="row">
                        <div className="col-lg-6">
                          <h5>Daily Performance</h5>
                          <ComposedChart width={95 + alldatadays.length*20} height={200} data={alldatadays} barCategoryGap={2} barWidth={18}>
                            <XAxis dataKey="displayName"/>
                            <YAxis yAxisId="left" />
                            <YAxis yAxisId="right" orientation="right" hide={true} />
                            <Tooltip/>
                            <Bar isAnimationActive={false} yAxisId="left" dataKey="Delivered" stackId="a" fill="#71b82e"/>
                            <Bar isAnimationActive={false} yAxisId="left" dataKey="Soft Bounced" stackId="a" fill="#b8a52e"/>
                            <Bar isAnimationActive={false} yAxisId="left" dataKey="Hard Bounced" stackId="a" fill="#845e5e"/>
                            {
                              this.state.showOpens &&
                              <Line isAnimationActive={false} yAxisId="right" type="linear" dataKey="Opens" stroke="#77cafd"/>
                            }
                            {
                              this.state.showDeferrals &&
                              <Line isAnimationActive={false} yAxisId="right" type="linear" dataKey="Deferrals" stroke="#ca65ff"/>
                            }
                            {
                              this.state.showErrors &&
                              <Line isAnimationActive={false} yAxisId="right" type="linear" dataKey="Errors" stroke="#914143"/>
                            }
                          </ComposedChart>
                        </div>
                        <div className="col-lg-6">
                          <h5>Hourly Performance</h5>
                          <ComposedChart width={75 + alldatahours.length*20} height={200} data={alldatahours} barCategoryGap={2} barWidth={18}
                            style={{display:'inline-block', paddingRight:'40px'}}>
                            <XAxis dataKey="displayName"/>
                            <YAxis yAxisId="left" />
                            <YAxis yAxisId="right" orientation="right" hide={true} />
                            <Tooltip/>
                            <Bar isAnimationActive={false} yAxisId="left" dataKey="Delivered" stackId="a" fill="#71b82e"/>
                            <Bar isAnimationActive={false} yAxisId="left" dataKey="Soft Bounced" stackId="a" fill="#b8a52e"/>
                            <Bar isAnimationActive={false} yAxisId="left" dataKey="Hard Bounced" stackId="a" fill="#845e5e"/>
                            {
                              this.state.showOpens &&
                              <Line isAnimationActive={false} yAxisId="right" type="linear" dataKey="Opens" stroke="#77cafd"/>
                            }
                            {
                              this.state.showDeferrals &&
                              <Line isAnimationActive={false} yAxisId="right" type="linear" dataKey="Deferrals" stroke="#ca65ff"/>
                            }
                            {
                              this.state.showErrors &&
                              <Line isAnimationActive={false} yAxisId="right" type="linear" dataKey="Errors" stroke="#914143"/>
                            }
                          </ComposedChart>
                        </div>
                      </div>
                      {
                        _.map(sinks, s => (
                          <div className="space30" key={s.id}>
                            <h4 style={{position:'relative'}}>{s.name} {this.state.viewType === 'server' && <small style={{top: '4px', paddingLeft:'150px', position:'absolute'}}>Queue: {!s.queue?0:s.queue.toLocaleString()}</small>}</h4>
                            <div className="row">
                              <div className="col-lg-6">
                                <h5>Daily Performance</h5>
                                <ComposedChart width={75 + data[s.id].days.length*20} height={200} data={data[s.id].days} barCategoryGap={2} barWidth={18}>
                                  <XAxis dataKey="displayName"/>
                                  <YAxis yAxisId="left" />
                                  <YAxis yAxisId="right" orientation="right" hide={true} />
                                  <Tooltip/>
                                  <Bar isAnimationActive={false} yAxisId="left" dataKey="Delivered" stackId="a" fill="#71b82e"/>
                                  <Bar isAnimationActive={false} yAxisId="left" dataKey="Soft Bounced" stackId="a" fill="#b8a52e"/>
                                  <Bar isAnimationActive={false} yAxisId="left" dataKey="Hard Bounced" stackId="a" fill="#845e5e"/>
                                  {
                                    this.state.showOpens &&
                                    <Line isAnimationActive={false} yAxisId="right" type="linear" dataKey="Opens" stroke="#77cafd"/>
                                  }
                                  {
                                    this.state.showDeferrals &&
                                    <Line isAnimationActive={false} yAxisId="right" type="linear" dataKey="Deferrals" stroke="#ca65ff"/>
                                  }
                                  {
                                    this.state.showErrors &&
                                    <Line isAnimationActive={false} yAxisId="right" type="linear" dataKey="Errors" stroke="#914143"/>
                                  }
                                </ComposedChart>
                              </div>
                              <div className="col-lg-6">
                                <h5>Hourly Performance</h5>
                                <ComposedChart width={75 + data[s.id].hours.length*20} height={200} data={data[s.id].hours} barCategoryGap={2} barWidth={18}>
                                  <XAxis dataKey="displayName"/>
                                  <YAxis yAxisId="left" />
                                  <YAxis yAxisId="right" orientation="right" hide={true} />
                                  <Tooltip/>
                                  <Bar isAnimationActive={false} yAxisId="left" dataKey="Delivered" stackId="a" fill="#71b82e"/>
                                  <Bar isAnimationActive={false} yAxisId="left" dataKey="Soft Bounced" stackId="a" fill="#b8a52e"/>
                                  <Bar isAnimationActive={false} yAxisId="left" dataKey="Hard Bounced" stackId="a" fill="#845e5e"/>
                                  {
                                    this.state.showOpens &&
                                    <Line isAnimationActive={false} type="linear" yAxisId="right" dataKey="Opens" stroke="#77cafd"/>
                                  }
                                  {
                                    this.state.showDeferrals &&
                                    <Line isAnimationActive={false} type="linear" yAxisId="right" dataKey="Deferrals" stroke="#ca65ff"/>
                                  }
                                  {
                                    this.state.showErrors &&
                                    <Line isAnimationActive={false} yAxisId="right" type="linear" dataKey="Errors" stroke="#914143"/>
                                  }
                                </ComposedChart>
                              </div>
                            </div>
                          </div>
                        ))
                      }
                    </div>
                  }
                </div>
              }
            </div>
          </EDTableSection>
        </div>
      </MenuNavbar>
    );
  }
}
