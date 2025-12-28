import React, { Component } from "react";
import axios from "axios";
import _ from "underscore";
import LoaderPanel from "../components/LoaderPanel";
import TitlePage from "../components/TitlePage";
import withLoadSave from "../components/LoadSave";
import MenuNavbar from "../components/MenuNavbar";
import ConfirmDropdown from "../components/ConfirmDropdown";
import LoaderIcon from "../components/LoaderIcon";
import { EDTableSection, EDTable, EDTableRow } from "../components/EDDOM";
import { Button, MenuItem } from "react-bootstrap";
import update from "immutability-helper";

class DomainThrottles extends Component {
  constructor(props) {
    super(props);

    this.state = {
      saving: {},
    };
  }

  createClicked = () => {
    this.props.history.push("/domainthrottles/edit?id=new");
  }

  getRoute(e) {
    let r = _.find(this.props.routes, r => r.id === e.route);
    if (!r) {
      return "None";
    }
    return r.name;
  }

  getDomains(e) {
    let domains = e.domains.split(/\s+/);
    if (!domains.length) {
      return "None";
    }
    if (domains.length === 1) {
      return domains[0];
    }
    return <span>{domains[0]}<span className="small" style={{whiteSpace:'nowrap'}}> + {domains.length - 1} more</span></span>;
  }

  deleteConfirmClicked = async id => {
    let saving = this.state.saving;
    this.setState({saving: update(saving, {[id]: {$set: true}})});
    try {
      await axios.delete('/api/domainthrottles/' + id);
      await this.props.reload();
    } finally {
      this.setState({saving: update(saving, {[id]: {$set: false}})});
    }
  }

  activate = async id => {
    let saving = this.state.saving;
    this.setState({saving: update(saving, {[id]: {$set: true}})});
    try {
      await axios.patch('/api/domainthrottles/' + id, {active: true});
      await this.props.reload();
    } finally {
      this.setState({saving: update(saving, {[id]: {$set: false}})});
    }
  }

  deactivate = async id => {
    let saving = this.state.saving;
    this.setState({saving: update(saving, {[id]: {$set: true}})});
    try {
      await axios.patch('/api/domainthrottles/' + id, {active: false});
      await this.props.reload();
    } finally {
      this.setState({saving: update(saving, {[id]: {$set: false}})});
    }
  }

  render() {
    let data = this.props.data;

    let minWidth = '600px';
    let maxWidth = '1024px';
    
    return (
     <MenuNavbar {...this.props}>
       <TitlePage title="Domain Throttles" button={
            <Button bsStyle="primary" onClick={this.createClicked}>Add Throttle</Button>
       } />
        <LoaderPanel isLoading={this.props.isLoading}>
          <EDTableSection>
          {
            data.length ?
              <div>
                <EDTable className="growing-margin-left" minWidth={minWidth} maxWidth={maxWidth}>
                  <thead>
                    <tr>
                      {
                        this.props.routes && this.props.routes.length >= 2 &&
                        <th>Route</th>
                      }
                      <th>Domains</th>
                      <th>Hourly Limit</th>
                      <th>Daily Limit</th>
                      <th>Active</th>
                      <th></th>
                    </tr>
                  </thead>
                  {
                    _.map(data, (e, index) =>
                        <EDTableRow key={e.id} index={index}>
                          {
                            this.props.routes && this.props.routes.length >= 2 &&
                            <td>
                              {this.getRoute(e)}
                            </td>
                          }
                          <td>
                            {this.getDomains(e)}
                          </td>
                          <td>
                            {e.hourlimit}
                          </td>
                          <td>
                            {e.daylimit}
                          </td>
                          <td>
                            {
                              e.active ?
                                <img src="/img/like.png" alt="" />
                              :
                                <img src="/img/error.png" alt="" />
                            }
                          </td>
                          <td className="last-cell">
                            <ConfirmDropdown
                              id={e.id + '-split'}
                              menu="Delete"
                              title="Delete Confirmation"
                              prompt={"Are you sure you wish to delete this throttle?"}
                              onConfirm={this.deleteConfirmClicked.bind(this, e.id)}
                              disabled={this.state.saving[e.id]}
                              text={this.state.saving[e.id]?<LoaderIcon />:'Actions'}>
                              <MenuItem disabled={this.state.saving[e.id]} onClick={() => this.props.history.push('/domainthrottles/edit?id=' + e.id)}>Edit</MenuItem>
                              { e.active &&
                                  <MenuItem disabled={this.state.saving[e.id]} onClick={this.deactivate.bind(this, e.id)}>Deactivate</MenuItem>
                              }
                              { !e.active &&
                                  <MenuItem disabled={this.state.saving[e.id]} onClick={this.activate.bind(this, e.id)}>Activate</MenuItem>
                              }
                            </ConfirmDropdown>
                          </td>
                        </EDTableRow>
                    )
                  }
                </EDTable>
              </div>
              :
              <div className="text-center space-top-sm">
                <h4>No domain throttles yet. Use the button above to add one.</h4>
              </div>
          }
          </EDTableSection>
        </LoaderPanel>
      </MenuNavbar>
    );
  }
}

export default withLoadSave({
  extend: DomainThrottles,
  initial: [],
  get: async () => (await axios.get('/api/domainthrottles')).data,
  extra: {
    routes: async () => _.sortBy((await axios.get('/api/userroutes')).data, l => l.name.toLowerCase()),
  },
});
