import React, { Component } from "react";
import { sendGA4Event } from "../utils/tracking";
import { Modal, Button, Nav, NavItem } from "react-bootstrap";
import axios from "axios";
import _ from "underscore";
import LoaderPanel from "../components/LoaderPanel";
import TitlePage from "../components/TitlePage";
import withLoadSave from "../components/LoadSave";
import MenuNavbar from "../components/MenuNavbar";
import { FormControlLabel } from "../components/FormControls";
import { EDTableSection, EDTable, EDTableRow, EDTabs } from "../components/EDDOM";
import delay from "timeout-as-promise";
import copyText from "../utils/clipboard";
import notify from "../utils/notify";
import fileDownload from "js-file-download";

class DKIM extends Component {
  constructor(props) {
    super(props);

    this.state = {
      showConfirm: false,
      domains: '',
      selector: '',
      isSaving: false,
    };
  }

  onExport = () => {
    var csv = 'domain,record,value\r\n';

    _.each(_.sortBy(_.pairs(this.props.data.entries), e => e[0]), e => {
      var [domain, s] = e;

      csv += `${domain},${this.props.data.selector || 'dkim'}._domainkey.${domain},${s.txtvalue}\r\n`;
    });

    fileDownload(csv, 'dkim.csv');
  }

  modalChange = event => {
    this.setState({[event.target.id]: event.target.value});
  }

  switchView = () => {
    this.props.history.push("/servers");
  }

  configureClicked = () => {
    sendGA4Event('DKIM', 'Configure Domains', 'Configure Domains');

    var domains = _.keys(this.props.data.entries);
    domains.sort();
    var txt = domains.join('\n');
    if (txt) {
      txt += '\n';
    }
    this.setState({showConfirm: true, domains: txt, selector: this.props.data.selector || 'dkim'});
  }

  confirmClicked = async ok => {
    this.setState({showConfirm: false});

    if (!ok) {
      return;
    }

    this.setState({isSaving: true});

    var entries = this.props.data.entries || {};

    var changed = false;

    var domainstrings = this.state.domains.split('\n');

    domainstrings.forEach(d => {
      d = d.toLowerCase().trim();
      if (!d) {
        return;
      }

      if (/[^a-z0-9.-]/.test(d)) {
        return;
      }

      if (!entries[d]) {
        entries[d] = {};
        changed = true;
      }
    });

    _.each(_.keys(entries), d => {
      if (!_.find(domainstrings, o => o === d)) {
        delete entries[d];
        changed = true;
      }
    });

    if (changed || this.state.selector !== this.props.data.selector) {
      await axios.patch('/api/dkimentries', {
        entries: entries,
        selector: this.state.selector,
      });

      await this.props.reload();

      this.setState({isSaving: false});

      while (true) {
        var found = false;
        for (var prop in (this.props.data.entries || {})) {
          if (!this.props.data.entries[prop].txtvalue) {
            found = true;
            break;
          }
        }
        if (!found) {
          break;
        }

        await delay(3000);

        await this.props.reload();
      }
    } else {
      this.setState({isSaving: false});
    }
  }

  copy = text => {
    if (copyText(text)) {
      notify.show("Text copied to clipboard", "success");
    } else {
      notify.show("Error accessing clipboard", "error");
    }
  }

  render() {
    let maxWidth = '1024px';

    return (
      <MenuNavbar {...this.props} isAdmin={true}>
        <TitlePage title="DKIM" button={
          <Button
            bsStyle="primary"
            onClick={this.configureClicked}>
            Configure Domains
          </Button>
        }
         tabs={
          <EDTabs>
            <Nav className="nav-tabs space15" activeKey="2">
              <NavItem eventKey="1" onClick={this.switchView}>Servers</NavItem>
              <NavItem eventKey="2" disabled>DKIM</NavItem>
            </Nav>
          </EDTabs>
        } />
        <LoaderPanel isLoading={this.props.isLoading || this.state.isSaving}>
          <Modal show={this.state.showConfirm}>
            <Modal.Header>
              <Modal.Title>Configure Domains</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <FormControlLabel
                id="selector"
                label="Selector"
                obj={this.state}
                onChange={this.modalChange}
              />
              <FormControlLabel
                id="domains"
                label="Domains"
                componentClass="textarea"
                obj={this.state}
                onChange={this.modalChange}
                help="Enter domains to configure DKIM for, one per line"
                rows={7}
                space
              />
            </Modal.Body>
            <Modal.Footer>
              <Button onClick={() => { sendGA4Event('DKIM', 'Saved DKIM', 'Saved DKIM Configuration'); return this.confirmClicked(true); }} bsStyle="primary">OK</Button>
              <Button onClick={this.confirmClicked.bind(this, false)}>Cancel</Button>
            </Modal.Footer>
          </Modal>
          <EDTableSection>
          {
            this.props.data.entries && _.size(this.props.data.entries) > 0 &&
            <div className="space20">
              <Button className="blue" onClick={this.onExport}>Export as CSV</Button>
            </div>
          }
          {
            this.props.data.entries && _.size(this.props.data.entries) ?
              <EDTable nospace className="space15 growing-margin-left" minWidth={maxWidth} maxWidth={maxWidth}>
                <thead>
                  <tr>
                    <th>Domain</th>
                    <th>TXT Record Name</th>
                    <th>TXT Record Value</th>
                  </tr>
                </thead>
                {
                  _.map(_.sortBy(_.pairs(this.props.data.entries), e => e[0]), (e, index) => {
                    let [domain, s] = e;
                    return (
                      <EDTableRow key={domain} index={index}>
                        <td>
                          <ul className="list-inline">
                            <li>
                              <h4 className="name-padded">
                                {domain}
                              </h4>
                            </li>
                          </ul>
                        </td>
                        <td style={{whiteSpace: 'nowrap'}}>
                          <i className="fa fa-clipboard" onClick={this.copy.bind(null, `${this.props.data.selector || 'dkim'}._domainkey.${domain}`)} style={{fontSize:'20px', color: 'rgb(170, 224, 255)', cursor: 'pointer', marginRight: '8px'}}/>
                          {`${this.props.data.selector || 'dkim'}._domainkey.${domain}`}
                        </td>
                        <td style={{whiteSpace: 'nowrap'}}>
                          {!s.txtvalue ? 'Generating...' :
                            <span>
                              <i className="fa fa-clipboard" onClick={this.copy.bind(null, s.txtvalue)} style={{fontSize:'20px', color: 'rgb(170, 224, 255)', cursor: 'pointer', marginRight: '8px'}}/>
                              {s.txtvalue.substring(0, 25) + '...'}
                            </span>
                          }
                        </td>
                      </EDTableRow>
                      );
                    }
                  )
                }
              </EDTable>
              :
              <div className="text-center space-top-sm">
                <h4>No DKIM domains configured.</h4>
              </div>
          }
          </EDTableSection>
        </LoaderPanel>
      </MenuNavbar>
    );
  }
}

export default withLoadSave({
  extend: DKIM,
  initial: [],
  get: async () => (await axios.get('/api/dkimentries')).data,
});
