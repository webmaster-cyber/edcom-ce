import React, { Component } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import _ from "underscore";
import LoaderPanel from "../components/LoaderPanel";
import TitlePage from "../components/TitlePage";
import withLoadSave from "../components/LoadSave";
import MenuNavbar from "../components/MenuNavbar";
import { EDTableSection, EDTable, EDTableRow } from "../components/EDDOM";
import moment from "moment";
import LoaderButton from "../components/LoaderButton";
import { MenuItem } from "react-bootstrap";
import ConfirmDropdown from "../components/ConfirmDropdown";

class Policies extends Component {
  constructor(props) {
    super(props);

    this.state = {
      isSaving: false,
    };
  }
  createClicked = async () => {
    var sink = '';
    if (this.props.sinks && this.props.sinks.length)
      sink = _.sortBy(this.props.sinks, 'name')[0].id;
    var id = (await axios.post('/api/policies', {
      name: 'New Policy',
      domains: '*',
      domaincount: 0,
      deferwait: 5,
      deferwaittype: 'mins',
      ratedefer: false,
      ratedefercheckmins: 10,
      ratedefertarget: 400,
      ratedeferwait: 1,
      ratedeferwaittype: 'hours',
      connerrwait: 15,
      connerrwaittype: 'mins',
      customwait: [{msg: '', val: 1, valtype: 'hours'}],
      numconns: 1,
      customnumconns: [{mx: '', val: 1}],
      retryfor: 72,
      sendsperconn: 20,
      sinks: [{
        sink: sink,
        allips: true,
        pct: 100,
        iplist: {},
        algorithm: '',
        sendcap: '',
        captime: moment().hours(9).minutes(0).seconds(0).format(),
        sendrate: '',
      }],
    })).data.id;
    this.props.history.push("/policies/domains?id=" + id); 
  }

  deleteConfirmClicked = async id => {
    this.setState({isSaving: true});

    try {
      await axios.delete('/api/policies/' + id);
      this.props.reload();
    } finally {
      this.setState({isSaving: false});
    }
  }

  duplicate = async id => {
    this.setState({isSaving: true});

    try {
      await axios.post('/api/policies/' + id + '/duplicate');
      this.props.reload();
    } finally {
      this.setState({isSaving: false});
    }
  }

  revert = async id => {
    this.setState({isSaving: true});

    try {
      await axios.post('/api/policies/' + id + '/revert');

      this.props.reload();
    } finally {
      this.setState({isSaving: false});
    }
  }

  publish = async id => {
    this.setState({isSaving: true});

    try {
      await axios.post('/api/policies/' + id + '/publish');

      this.props.reload();
    } finally {
      this.setState({isSaving: false});
    }
  }

  render() {
    let minWidth = '600px';
    let maxWidth = '1024px';

    return (
      <MenuNavbar {...this.props} isAdmin={true}>
        <TitlePage title="Delivery Policies" button={
          <LoaderButton
            bsStyle="primary"
            text="Create Delivery Policy"
            loadingText="Saving..."
            isLoading={this.state.isSaving}
            onClick={this.createClicked}
          />
        }/>
        <LoaderPanel isLoading={this.props.isLoading}>
          <EDTableSection>
          {
            this.props.data.length ?
              <EDTable className="growing-margin-left" minWidth={minWidth} maxWidth={maxWidth}>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Domains</th>
                    <th>Modified</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                {
                  _.map(this.props.data, (s, index) =>
                      <EDTableRow key={s.id} index={index}>
                        <td>
                          <ul className="list-inline">
                            <li>
                              <h4 className="name-padded">
                                <Link to={'/policies/domains?id=' + s.id}>
                                  {s.name}
                                </Link>
                              </h4>
                            </li>
                          </ul>
                        </td>
                        <td>
                          {s.domaincount.toLocaleString()}
                        </td>
                        <td>
                          {moment(s.modified).format("lll")}
                        </td>
                        <td>
                          {
                            s.dirty ?
                              <span style={{whiteSpace:'nowrap'}}><img src="/img/error.png" alt="" /> Unpublished Changes</span>
                            :
                              <span style={{whiteSpace:'nowrap'}}><img src="/img/like.png" alt="" /> Published</span>
                          }
                        </td>
                        <td className="last-cell">
                          <ConfirmDropdown
                            id={s.id + '-split'}
                            text="Actions"
                            menu="Delete"
                            extra={true}
                            title="Delete Policy Confirmation"
                            prompt={`Are you sure you wish to delete '${s.name}'?`}
                            onConfirm={this.deleteConfirmClicked.bind(this, s.id)}
                          >
                            { s.dirty &&
                                <MenuItem onClick={this.publish.bind(this, s.id)}>Publish</MenuItem>
                            }
                            { s.dirty && s.published &&
                                <MenuItem onClick={this.revert.bind(this, s.id)}>Revert</MenuItem>
                            }
                            <MenuItem onClick={this.duplicate.bind(this, s.id)}>Duplicate</MenuItem>
                          </ConfirmDropdown>
                        </td>
                      </EDTableRow>
                  )
                }
              </EDTable>
              :
              <div className="text-center space-top-sm">
                <h4>No delivery policies configured!</h4>
              </div>
          }
          </EDTableSection>
        </LoaderPanel>
      </MenuNavbar>
    );
  }
}

export default withLoadSave({
  extend: Policies,
  initial: [],
  get: async () => _.sortBy((await axios.get('/api/policies')).data, s => s.name.toLowerCase()),
  extra: {
    sinks: async () => (await axios.get('/api/sinks')).data, 
  }
});

