import React, { Component } from "react";
import { MenuItem, Button } from "react-bootstrap";
import { Link } from "react-router-dom";
import axios from "axios";
import _ from "underscore";
import moment from "moment";
import LoaderPanel from "../components/LoaderPanel";
import ConfirmDropdown from "../components/ConfirmDropdown";
import TitlePage from "../components/TitlePage";
import withLoadSave from "../components/LoadSave";
import MenuNavbar from "../components/MenuNavbar";
import { EDTableSection, EDTable, EDTableRow } from "../components/EDDOM";
import { eventTypes } from "../utils/webhook-events";

function clamp(s) {
  if (s.length > 53) {
    return s.substring(0, 50) + '...';
  }
  return s;
}

class WebHooks extends Component {
  switchView = url => {
    this.props.history.push(url);
  }

  createClicked = async () => {
    this.props.history.push('/webhooks/edit?id=new');
  }

  deleteConfirmClicked = async id => {
    await axios.delete('/api/resthooks/' + id);
    await this.props.reload();
  }

  edit = id => {
    this.props.history.push('/webhooks/edit?id=' + id);
  }

  render() {
    let minWidth = '600px';
    let maxWidth = '1024px';

    return (
      <MenuNavbar {...this.props}>
        <TitlePage title="Webhooks"
          button={
            <Button bsStyle="primary" onClick={this.createClicked}>Create New Webhook</Button>
          }
        />
        <LoaderPanel isLoading={this.props.isLoading}>
        <EDTableSection className="contact drop-blue">
          {
            this.props.data.length ?
              <EDTable className="growing-margin-left" minWidth={minWidth} maxWidth={maxWidth}>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Target</th>
                    <th>Event Type</th>
                    <th>Created At</th>
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
                                <Link to={'/webhooks/edit?id=' + t.id}>
                                  {t.name || 'Unnamed'}
                                </Link>
                              </h4>
                            </li>
                          </ul>
                        </td>
                        <td>
                          <h4 style={{whiteSpace: 'nowrap'}}>
                            {clamp(t.target_url)}
                          </h4>
                        </td>
                        <td>
                          <h4>
                            {eventTypes[t.event] || t.event}
                          </h4>
                        </td>
                        <td>
                          <h4>
                            {moment(t.created).format('l LT')}
                          </h4>
                        </td>
                        <td style={{minWidth:'112px'}} className="last-cell">
                          <ConfirmDropdown
                            id={t.id + '-split'}
                            text="Actions"
                            menu="Delete"
                            extra={true}
                            title="Delete Webhook Confirmation"
                            prompt={`Are you sure you wish to delete '${t.name ? t.name : 'this webhook'}'?`}
                            onConfirm={this.deleteConfirmClicked.bind(this, t.id)}
                          >
                            <MenuItem onClick={this.edit.bind(this, t.id)}>Edit / Test</MenuItem>
                          </ConfirmDropdown>
                        </td>
                      </EDTableRow>
                  )
                }
              </EDTable>
              :
              <div className="text-center space-top-sm">
                <h4>You don&apos;t have any webhooks yet!</h4>
              </div>
          }
          </EDTableSection>
        </LoaderPanel>
      </MenuNavbar>
    );
  }
}

export default withLoadSave({
  extend: WebHooks,
  initial: [],
  get: async () => _.sortBy((await axios.get('/api/resthooks')).data, t => t.created).reverse(),
});
