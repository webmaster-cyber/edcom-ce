import React, { Component } from "react";
import axios from "axios";
import LoaderPanel from "../components/LoaderPanel";
import withLoadSave from "../components/LoadSave";
import SaveNavbar from "../components/SaveNavbar";
import parse from "../utils/parse";
import _ from "underscore";
import { EDTableSection, EDTable, EDTableRow } from "../components/EDDOM";

const special = ['ses', 'mailgun', 'sparkpost', 'easylink', 'smtprelay'];

class StatMsgs extends Component {
  constructor(props) {
    super(props);

    this.state = {
      data: null,
      reloading: false,
    };
  }

  componentWillMount() {
    this.reload();
  }

  refresh = async () => {
    this.setState({reloading: true});
    try {
      await this.reload();
    } finally {
      this.setState({reloading: false});
    }
  }

  async reload() {
    var p = parse(this);
    if (p.bcid) {
      this.setState({data: (await axios.get('/api/ipmsgs?start=' + encodeURIComponent(p.start) + '&end=' + encodeURIComponent(p.end) +
        '&bcid=' + p.bcid + '&type=' + p.type)).data});
    } else if (p.cid) {
      this.setState({data: (await axios.get('/api/ipmsgs?start=' + encodeURIComponent(p.start) + '&end=' + encodeURIComponent(p.end) +
        '&cid=' + p.cid + '&type=' + p.type)).data});
    } else {
      this.setState({data: (await axios.get('/api/ipmsgs?start=' + encodeURIComponent(p.start) + '&end=' + encodeURIComponent(p.end) +
        '&domaingroupid=' + p.domaingroupid + '&ip=' + p.ip + '&settingsid=' + p.settingsid +
        '&sinkid=' + p.sinkid + '&type=' + p.type)).data});
    }
  }

  goBack = () => {
    var p = parse(this);

    this.props.history.push(p.returnto);
  }

  typeDesc() {
    var p = parse(this);
    if (p.type === 'err') {
      return 'Error'
    } else if (p.type === 'defer') {
      return 'Deferral'
    } else if (p.type === 'hard') {
      return 'Hard Bounce'
    } else if (p.type === 'soft') {
      return 'Soft Bounce'
    } 
    return '';
  }

  render() {
    var p = parse(this);

    var sinknames = {};
    _.each(this.props.sinks, s => {
      sinknames[s.id] = s.name;
    });

    return (
      <SaveNavbar isAdmin={true} title={'View ' + this.typeDesc() + ' Messages'} onBack={this.goBack} hideSave={true}>
        <LoaderPanel isLoading={this.props.isLoading}>
          <EDTableSection>
          <div className="space20"/>
          {
            !this.props.isLoading &&
              p.cid ?
                <div className="text-center">
                  <table className="table text-left" style={{backgroundColor: '#fff', fontSize:'16px', border: '1px solid #ddd', display: 'inline-block', width: 'auto'}}>
                    <tbody>
                      <tr>
                        <td style={{border:'none', padding: '5px'}}><b>Customer</b></td><td style={{padding: '5px', border:'none'}} className="text-right">{this.props.customer}</td>
                      </tr>
                      {
                        p.bcid && 
                        <tr>
                          <td style={{border:'none', padding: '5px'}}><b>Broadcast</b></td><td style={{padding: '5px', border:'none'}} className="text-right">{this.props.campaign}</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              :
                <div className="text-center">
                  <table className="table text-left" style={{backgroundColor: '#fff', fontSize:'16px', border: '1px solid #ddd', display: 'inline-block', width: 'auto'}}>
                    <tbody>
                      <tr>
                        <td style={{padding: '5px', border:'none'}}><b>IP</b></td><td style={{padding: '5px', border:'none'}} className="text-right">{p.ip}</td>
                      </tr>
                      <tr>
                        <td style={{padding: '5px', border:'none'}}><b>Domain</b></td><td style={{padding: '5px', border:'none'}} className="text-right">{this.props.domaingroup}</td>
                      </tr>
                      <tr>
                        <td style={{padding: '5px', border:'none'}}><b>Delivery Policy</b></td><td style={{padding: '5px', border:'none'}} className="text-right">{this.props.setting}</td>
                      </tr>
                      <tr>
                        <td style={{padding: '5px', border:'none'}}><b>Server</b></td><td style={{padding: '5px', border:'none'}} className="text-right">{this.props.sink}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
          }
          {
            this.state.data !== null &&
              (this.state.data.length ?
                <EDTable nospace>
                  <thead>
                    <tr>
                      <th>Message</th>
                      <th>Server</th>
                      <th>IP</th>
                      <th>Times Seen</th>
                    </tr>
                  </thead>
                    {
                      _.map(this.state.data, (m,index) => <EDTableRow key={m.msg} index={index}>
                        <td><h4 className="name-padded">{m.msg}</h4></td>
                        <td>{sinknames[m.sinkid]}</td>
                        <td>{m.ip}</td>
                        <td>{m.count.toLocaleString()}</td>
                        </EDTableRow>)
                    }
                </EDTable>
                :
                <div className="text-center space-top-sm">
                  <h4>No messages found!</h4>
                </div>)
          }
          </EDTableSection>
        </LoaderPanel>
      </SaveNavbar>
    );
  }
}

export default withLoadSave({
  extend: StatMsgs,
  initial: [],
  get: async () => [],
  extra: {
    sinks: async () => (await axios.get('/api/sinks')).data,
    domaingroup: ({...p}) => {
      return p.domaingroupid;
    },
    setting: async ({...p}) => {
      if (!p.settingsid || special.find(s => s === p.sinkid))
        return null;
      try {
        return (await axios.get('/api/policies/' + p.settingsid + '?disablenotify=true')).data.name;
      } catch (e) {
        return null;
      }
    },
    sink: async ({...p}) => {
      if (!p.sinkid || special.find(s => s === p.sinkid))
        return null;
      try {
        return (await axios.get('/api/sinks/' + p.sinkid + '?disablenotify=true')).data.name;
      } catch (e) {
        return null;
      }
    },
    campaign: async({...p}) => {
      if (!p.bcid)
        return null;
      try {
        var data = (await axios.get('/api/companies/' + p.cid + '/broadcasts/' + p.bcid + '?disablenotify=true')).data;
        return data.name || data.subject;
      } catch (e) {
        return null;
      }
    },
    customer: async({...p}) => {
      if (!p.cid)
        return null;
      try {
        return (await axios.get('/api/companies/' + p.cid + '?disablenotify=true')).data.name;
      } catch (e) {
        return null;
      }
    }
  }
});
