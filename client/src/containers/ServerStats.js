import React, { Component } from "react";
import { FormControl, Checkbox } from "react-bootstrap";
import { Link } from "react-router-dom";
import axios from "axios";
import moment from "moment";
import _ from "underscore";
import getvalue from "../utils/getvalue";
import InfoBox from "../components/InfoBox";
import LoaderPanel from "../components/LoaderPanel";
import LoaderIcon from "../components/LoaderIcon";
import withLoadSave from "../components/LoadSave";
import SaveNavbar from "../components/SaveNavbar";
import Datetime from "react-datetime";
import { Timeline, TimelineEvent } from "react-event-timeline";
import { ComposedChart, XAxis, YAxis, Tooltip, Bar, Line } from "recharts";
import parse from "../utils/parse";
import dateformat from "../utils/date-format";

import "../../node_modules/react-datetime/css/react-datetime.css";

class ServerStats extends Component {
  constructor(props) {
    super(props);

    var p = parse(this);

    this._initialLoad = false;

    this.state = {
      hours: null,
      stats: null,
      showOpens: false,
      showDeferrals: false,
      showErrors: false,
      ip: p.ip?p.ip:'',
      domaingroup: p.domaingroupid?p.domaingroupid:'',
      settings: p.settingsid?p.settingsid:'',
      endDate: moment().add(1, 'minutes'),
      limit: null,
      queue: null,
      warmup: null,
    }

    this._reloadDebounce = _.debounce(_.bind(() => {
      this.reloadIPData();
    }, this), 800);
  }

  goBack = () => {
    var p = parse(this);
    if (p.returnto === 'ipreputation') {
      this.props.history.push("/ipreputation?tablestate=" + encodeURIComponent((p.tablestate || '')));
    } else {
      this.props.history.push("/ipdelivery?tablestate=" + encodeURIComponent((p.tablestate || '')));
    }
  }

  handleEndChange = v => {
    this.setState({endDate: v}, this._reloadDebounce);
  }

  isEndValid = v => {
    return v.isSameOrBefore(moment());
  }

  async reloadIPData() {
    var ip = this.state.ip;
    var domaingroup = this.state.domaingroup;
    var settings = this.state.settings;

    if (!ip && this.props.data.ipdata.length) {
      ip = this.props.data.ipdata[0].ip;
    }
    if (!settings && this.props.settings.length) {
      settings = this.props.settings[0].id;
    }
    if (!domaingroup && this.props.domaingroups.length) {
      domaingroup = this.props.domaingroups[0].id;
    }

    this.setState({ip: ip, domaingroup: domaingroup, settings: settings});

    let data = (await axios.get('/api/sinks/' + this.props.id + '/stats?domaingroup=' + domaingroup + '&ip=' + ip + '&settings=' + settings + '&end=' + dateformat(this.state.endDate) + '&dayend=' + dateformat(moment(this.state.endDate).hour(23).minute(59).second(59)))).data;

    this.setState({stats: data.stats, hours: data.hours, days: data.days, limit: data.limit, queue: data.queue, warmup: data.warmup});
  }

  async reload() {
    this.setState({hours: null, stats: null});
    this.reloadIPData();
  }

  handleChange = event => {
    var id = event.target.id;
    this.setState({[id]: getvalue(event)}, () => {
      if (id === 'ip' || id === 'domaingroup' || id === 'settings') {
          this.setState({endDate: moment().add(1, 'minutes')}, () => this.reload());
        }
    });
  }

  componentDidUpdate() {
    if (this.props.data.id && !this._initialLoad) {
      this._initialLoad = true;
      this.reload();
    }
  }

  render() {
    var {hours, days, stats} = this.state;

    var p = parse(this);

    var isLoading = false;

    if (hours === null) {
      isLoading = true;
    } else {
      hours = _.map(hours, h => {
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

      for (let i = 0; i < hours.length - 1; i++) {
        if (moment(hours[i+1].ts).diff(moment(hours[i].ts)) > 1000 * 60 * 60) {
          var t = moment(hours[i].ts).add(1, 'hour');
          hours.splice(i + 1, 0, {
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

      days = _.map(days, s => {
        let ts = moment(s.ts).local();
        return {
          displayName: (ts.month() + 1) + "/" + ts.date(),
          Delivered: s.send,
          'Hard Bounced': s.hard,
          'Soft Bounced': s.soft,
          'Errors': s.err || 0,
          'Opens': s.open || 0,
          'Deferrals': s.defercnt || 0,
          ts: ts,
        };
      }).reverse();
    }

    let dataName = this.props.data && (this.props.data.name || '')

    return (
      <LoaderPanel isLoading={this.props.isLoading}>
        <SaveNavbar isAdmin={true} title={`View Server Stats ${dataName ? `for "${dataName}"` : ''}`} onBack={this.goBack} hideSave={true}>
          <div className="space20">
            <div className="form-inline" style={{textAlign:'center'}}>
              <FormControl id="ip" componentClass="select" value={this.state.ip} onChange={this.handleChange}>
                {
                  _.map(_.pluck(this.props.data.ipdata, 'ip'), i => <option key={i} value={i}>{i}</option>)
                }
              </FormControl>
              <FormControl style={{marginLeft:'20px'}} id="domaingroup" componentClass="select" value={this.state.domaingroup} onChange={this.handleChange}>
                {
                  _.map(this.props.domaingroups, i => <option key={i.id} value={i.id}>{i.name}</option>)
                }
              </FormControl>
              <FormControl style={{marginLeft:'20px'}} id="settings" componentClass="select" value={this.state.settings} onChange={this.handleChange}>
                {
                  _.map(this.props.settings, i => <option key={i.id} value={i.id}>{i.name}</option>)
                }
              </FormControl>
            </div>
            {
              !isLoading && this.state.limit !== null &&
              <div className="text-center space20">
                Current Daily Limit: {this.state.limit.toLocaleString()}
                {
                  this.state.warmup &&
                  <Link to={'/warmups/edit?id=new&override=' + this.state.warmup + '&ip=' + this.state.ip + '&domain=' + this.state.domaingroup + '&limit=' + this.state.limit}>
                    <img alt="" src="/img/pencil.png" style={{marginBottom:'4px', marginLeft:'6px'}}/>
                  </Link>
                }
              </div>
            }
            {
              !isLoading && this.state.queue !== null &&
              <div className="text-center space20">
                Domain Queue Length: {this.state.queue.toLocaleString()}
              </div>
            }
            {
              !isLoading &&
              <div className="form-inline space20 text-center">
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
            }
            {
              isLoading &&
                <div className="space10" style={{textAlign:'center', marginTop:'15px'}}>
                  <LoaderIcon/>
                </div>
            }
            { !isLoading &&
              <div className="space10" style={{textAlign: 'center'}}>
                <div style={{display:'inline-block'}}>
                  <div className="row">
                    <div className="col-lg-6" style={{paddingRight: '40px'}}>
                      <h5>Daily Performance</h5>
                      <ComposedChart width={75 + days.length*20} height={200} data={days} barCategoryGap={2} barWidth={18}
                        style={{display:'inline-block'}}>
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
                      <ComposedChart width={75 + hours.length*20} height={200} data={hours} barCategoryGap={2} barWidth={18}
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
                </div>
                <div style={{textAlign:'left'}}>
                  { this.state.domaingroup &&
                  <label style={{marginTop:'6px'}}>Show Logs for 24 Hours Ending On:</label>
                  }
                  { this.state.domaingroup &&
                  <Datetime value={this.state.endDate} onChange={this.handleEndChange} isValidDate={this.isEndValid}/>
                  }
                  { this.state.domaingroup &&
                  <Timeline>
                  {
                  _.map(stats, (s, i) => {
                    if (_.isUndefined(s.count))
                      s.count = 1;
                    if (s.defermsg) {
                      return (
                        <TimelineEvent
                          key={s.id}
                          createdAt={moment(s.ts).format('l LTS')}
                          title={"Backed off " + (s.count > 1 ? s.count + " times " : "") + "for " + Math.round(s.deferlen/60) + " minutes, until " + moment(s.ts).add(s.deferlen, "seconds").format('l LTS') }
                          icon={<i className="fa fa-ban"/>}
                          iconColor="#ce4a46"
                        >
                          {s.defermsg}
                        </TimelineEvent>
                      );
                    } else {
                      var start;
                      if (s.lastts) {
                        start = moment(s.lastts);
                      } else if (i < stats.length - 1) {
                        start = moment(stats[i+1].ts);
                      } else {
                        start = moment(s.ts).subtract(1, 'minutes');
                      }
                      var end = moment(s.ts);

                      var starthr = moment(start).hours(0).minutes(0).seconds(0);
                      var endhr = moment(end).hours(23).minutes(59).seconds(59);

                      var diff = (end.valueOf() - start.valueOf())/(1000 * 60 * 60);
                      return (
                        <TimelineEvent
                          key={s.id}
                          createdAt={moment(s.ts).format('l LTS')}
                          title={(i === 0?"Mailing":"Mailed") +" for " + (Math.round(diff*600)/10).toLocaleString() + " minutes"}
                          icon={<i className="fa fa-envelope"/>}
                          iconColor="rgb(113, 184, 46)"
                        >
                          <InfoBox
                            title="Delivered"
                            info={s.send.toLocaleString()}
                          />
                          <InfoBox
                            title="Soft Bounced"
                            info={
                              !s.soft
                              ?
                                s.soft.toLocaleString()
                              :
                                <Link to={'/statmsgs?type=soft&returnto=' +
                                 encodeURIComponent('/servers/stats?id=' + this.props.id +
                                                          '&domaingroupid=' + this.state.domaingroup +
                                                          '&settingsid=' + this.state.settings +
                                                          '&ip=' + this.state.ip +
                                                          '&returnto=' + p.returnto +
                                                          '&tablestate=' + encodeURIComponent(p.tablestate || '')) +
                                 '&start=' + dateformat(starthr) +
                                 '&end=' + dateformat(endhr) +
                                 '&domaingroupid=' + this.state.domaingroup +
                                 '&ip=' + this.state.ip +
                                 '&settingsid=' + this.state.settings +
                                 '&sinkid=' + this.props.id
                                 }>{s.soft.toLocaleString()}</Link>
                            }
                          />
                          <InfoBox
                            title="Hard Bounced"
                            info={
                              !s.hard
                              ?
                                s.hard.toLocaleString()
                              :
                                <Link to={'/statmsgs?type=hard&returnto=' +
                                 encodeURIComponent('/servers/stats?id=' + this.props.id +
                                                          '&domaingroupid=' + this.state.domaingroup +
                                                          '&settingsid=' + this.state.settings +
                                                          '&ip=' + this.state.ip +
                                                          '&returnto=' + p.returnto +
                                                          '&tablestate=' + encodeURIComponent(p.tablestate || '')) +
                                 '&start=' + dateformat(starthr) +
                                 '&end=' + dateformat(endhr) +
                                 '&domaingroupid=' + this.state.domaingroup +
                                 '&ip=' + this.state.ip +
                                 '&settingsid=' + this.state.settings +
                                 '&sinkid=' + this.props.id
                                 }>{s.hard.toLocaleString()}</Link>
                            }
                          />
                          <InfoBox
                            title="Errors"
                            info={
                              !s.err
                              ?
                                (s.err || 0).toLocaleString()
                              :
                                <Link to={'/statmsgs?type=err&returnto=' +
                                 encodeURIComponent('/servers/stats?id=' + this.props.id +
                                                          '&domaingroupid=' + this.state.domaingroup +
                                                          '&settingsid=' + this.state.settings +
                                                          '&ip=' + this.state.ip +
                                                          '&returnto=' + p.returnto +
                                                          '&tablestate=' + encodeURIComponent(p.tablestate || '')) +
                                 '&start=' + dateformat(starthr) +
                                 '&end=' + dateformat(endhr) +
                                 '&domaingroupid=' + this.state.domaingroup +
                                 '&ip=' + this.state.ip +
                                 '&settingsid=' + this.state.settings +
                                 '&sinkid=' + this.props.id
                                 }>{(s.err || 0).toLocaleString()}</Link>
                            }
                          />
                          <InfoBox
                            title="Attempts/Hr"
                            info={(Math.round(((s.send+s.soft+s.hard)/diff)*100)/100).toLocaleString()}
                          />
                          <InfoBox
                            title="Delivered/Hr"
                            info={(Math.round(((s.send)/diff)*100)/100).toLocaleString()}
                          />
                        </TimelineEvent>
                      );
                    }
                  })
                }
                </Timeline>}
                </div>
              </div>
            }
          </div>
        </SaveNavbar>
      </LoaderPanel>
    );
  }
}

export default withLoadSave({
  extend: ServerStats,
  initial: { name: '', type: '' },
  get: async ({id}) => (await axios.get('/api/sinks/' + id)).data,
  extra: {
    domaingroups: async ({id}) => (await axios.get('/api/sinks/' + id + '/domainoptions')).data,
    settings: async () => (await axios.get('/api/policies')).data,
  }
});
