import React, { Component } from "react";
import { Link } from "react-router-dom";
import { Button, MenuItem } from "react-bootstrap";
import axios from "axios";
import _ from "underscore";
import LoaderPanel from "../components/LoaderPanel";
import ConfirmDropdown from "../components/ConfirmDropdown";
import TitlePage from "../components/TitlePage";
import withLoadSave from "../components/LoadSave";
import MenuNavbar from "../components/MenuNavbar";
import { EDTableSection, EDTable, EDTableRow } from "../components/EDDOM";
import moment from "moment";

class Funnels extends Component {
  createClicked = async () => {
    this.props.history.push('/funnels/settings?id=new');
  }

  deleteConfirmClicked = async id => {
    await axios.delete('/api/funnels/' + id);
    await this.props.reload();
  }

  ignore = event => {
    event.preventDefault();
  }

  duplicateClicked = async id => {
    await axios.post('/api/funnels/' + id + '/duplicate');
    await this.props.reload();
  }

  activateClicked = async id => {
    await axios.patch('/api/funnels/' + id, {active: true});
    await this.props.reload();
  }

  deactivateClicked = async id => {
    await axios.patch('/api/funnels/' + id, {active: false});
    await this.props.reload();
  }

  edit = id => {
    this.props.history.push('/funnels/settings?id=' + id);
  }

  render() {
    let minWidth = '600px';
    let maxWidth = '1024px';

    return (
      <MenuNavbar {...this.props}>
        <TitlePage title="Email Funnels" button={
          <Button bsStyle="primary" onClick={this.createClicked}>Create New Funnel</Button>
        }/>
        <LoaderPanel isLoading={this.props.isLoading}>
          <EDTableSection className="contact drop-blue">
          {
            this.props.data.length ?
              <EDTable className="growing-margin-left" minWidth={minWidth} maxWidth={maxWidth}>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Contacts</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Modified</th>
                    <th></th>
                  </tr>
                </thead>
                {
                  _.map(this.props.data, (t, index) =>
                      <EDTableRow key={t.id} index={index}>
                        <td>
                          <ul className="list-inline first-tr">
                            <li>
                              <h4 style={{whiteSpace: 'nowrap'}}>
                                <Link to={'/funnels/message?id=' + t.id}>
                                  {t.name}
                                </Link>
                              </h4>
                            </li>
                          </ul>
                        </td>
                        <td>
                          <h4>
                            {t.count.toLocaleString()}
                          </h4>
                        </td>
                        <td>
                          <h4 className={t.type==='tags'?'color4c84ff':'color76c9fc'} style={{whiteSpace: 'nowrap'}}>
                            {
                              t.type === 'tags' ?
                                <img src="/img/tag.png" alt="tag" style={{verticalAlign: 'middle'}}/>
                              :
                                <img src="/img/envelope.png" alt="envelope" style={{verticalAlign: 'middle'}}/>
                            }
                            <span style={{verticalAlign: 'middle'}}>{t.type === 'tags'?' Tagged':' Broadcast'}</span>
                          </h4>
                        </td>
                        <td className={!t.active?'inactive':'active-funnel'}>
                          <a href="#s" onClick={this.ignore} style={{cursor: 'default'}}>
                            {
                              t.active ?
                                <img src="/img/active.png" alt="" />
                              :
                                <img src="/img/inactive.png" alt="" />
                            }
                            {' '}
                            {
                              t.active ?
                                "Active"
                              :
                                "Inactive"
                            }
                          </a>
                        </td>
                        <td>
                          <h4 style={{whiteSpace: 'nowrap'}}>
                            {moment(t.modified).format('lll')}
                          </h4>
                        </td>
                        <td style={{minWidth:'112px'}} className="last-cell">
                          <ConfirmDropdown
                            id={t.id + '-split'}
                            text="Actions"
                            menu="Delete"
                            extra={true}
                            title="Delete Funnel Confirmation"
                            prompt={`Are you sure you wish to delete '${t.name}'?`}
                            onConfirm={this.deleteConfirmClicked.bind(this, t.id)}
                          >
                            <MenuItem onClick={this.edit.bind(this, t.id)}>Edit</MenuItem>
                            { t.active &&
                                <MenuItem onClick={this.deactivateClicked.bind(this, t.id)}>Deactivate</MenuItem>
                            }
                            { !t.active &&
                                <MenuItem onClick={this.activateClicked.bind(this, t.id)}>Activate</MenuItem>
                            }
                            <MenuItem onClick={this.duplicateClicked.bind(this, t.id)}>Duplicate</MenuItem>
                          </ConfirmDropdown>
                        </td>
                      </EDTableRow>
                  )
                }
              </EDTable>
              :
              <div className="text-center space-top-sm">
                <h4>You don&apos;t have any funnels yet!</h4>
              </div>
          }
          </EDTableSection>
        </LoaderPanel>
      </MenuNavbar>
    );
  }
}

export default withLoadSave({
  extend: Funnels,
  initial: [],
  get: async () => _.sortBy((await axios.get('/api/funnels')).data, t => t.name.toLowerCase()),
});
