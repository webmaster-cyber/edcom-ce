import React, { Component } from "react";
import { MenuItem, Button } from "react-bootstrap";
import { Link } from "react-router-dom";
import axios from "axios";
import _ from "underscore";
import LoaderPanel from "../components/LoaderPanel";
import TitlePage from "../components/TitlePage";
import withLoadSave from "../components/LoadSave";
import MenuNavbar from "../components/MenuNavbar";
import { EDTableSection, EDTable, EDTableRow } from "../components/EDDOM";
import ConfirmDropdown from "../components/ConfirmDropdown";

class Warmups extends Component {
  createClicked = () => {
    this.props.history.push("/warmups/edit?id=new"); 
  }

  deleteConfirmClicked = async id => {
    await axios.delete('/api/warmups/' + id);
    await this.props.reload();
  }

  enable = async id => {
    this.setState({isSaving: true});

    try {
      await axios.post('/api/warmups/' + id + '/enable');
      this.props.reload();
    } finally {
      this.setState({isSaving: false});
    }
  }

  disable = async id => {
    this.setState({isSaving: true});

    try {
      await axios.post('/api/warmups/' + id + '/disable');
      this.props.reload();
    } finally {
      this.setState({isSaving: false});
    }
  }

  duplicate = async id => {
    this.setState({isSaving: true});

    try {
      await axios.post('/api/warmups/' + id + '/duplicate');
      this.props.reload();
    } finally {
      this.setState({isSaving: false});
    }
  }

  revert = async id => {
    this.setState({isSaving: true});

    try {
      await axios.post('/api/warmups/' + id + '/revert');

      this.props.reload();
    } finally {
      this.setState({isSaving: false});
    }
  }

  publish = async id => {
    this.setState({isSaving: true});

    try {
      await axios.post('/api/warmups/' + id + '/publish');

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
         <TitlePage title="Warmup Schedules" button={
           <Button bsStyle="primary" onClick={this.createClicked}>Create Warmup Schedule</Button>
         }/>
         <LoaderPanel isLoading={this.props.isLoading}>
           <EDTableSection>
            {
              this.props.data.length ?
                <EDTable className="growing-margin-left" minWidth={minWidth} maxWidth={maxWidth}>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Server</th>
                      <th>IPs</th>
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
                                  <Link to={'/warmups/edit?id=' + s.id}>
                                    {s.name}
                                  </Link>
                                </h4>
                              </li>
                            </ul>
                          </td>
                          <td>
                            <div style={{width: '160px'}}>
                              {s.sinkname}
                            </div>
                          </td>
                          <td>
                            {s.allips.length.toLocaleString()}
                          </td>
                          <td>
                            {
                              s.disabled ?
                                'Disabled'
                              :
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
                              title="Delete Warmup Confirmation"
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
                              {
                                s.disabled &&
                              <MenuItem onClick={this.enable.bind(this, s.id)}>Enable</MenuItem>
                              }
                              {
                                !s.disabled &&
                              <MenuItem onClick={this.disable.bind(this, s.id)}>Disable</MenuItem>

                              }
                            </ConfirmDropdown>
                          </td>
                        </EDTableRow>
                    )
                  }
                </EDTable>
                :
                <div className="text-center space-top-sm">
                  <h4>No warmup schedules configured!</h4>
                  <h5>Warmups let you gradually increase the volume of mail sent over one or more IPs.</h5>
                </div>
            }
          </EDTableSection>
        </LoaderPanel>
      </MenuNavbar>
    );
  }
}

export default withLoadSave({
  extend: Warmups,
  initial: [],
  get: async () => (await axios.get('/api/warmups')).data
});

