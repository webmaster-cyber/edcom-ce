import React, { Component } from "react";
import { Nav, NavItem } from "react-bootstrap";
import axios from "axios";
import ConfirmButton from "../components/ConfirmButton";
import TitlePage from "../components/TitlePage";
import MenuNavbar from "../components/MenuNavbar";
import getvalue from "../utils/getvalue";
import notify from "../utils/notify";
import { EDFormSection, EDFormBox, EDTabs } from "../components/EDDOM";
import { FormControlLabel, CheckboxLabel } from "../components/FormControls";
import withLoadSave from "../components/LoadSave";
import LoaderPanel from "../components/LoaderPanel";

class ContactsRetrieval extends Component {
  constructor(props) {
    super(props);

    this.state = {
      email: '',
      erase: false,
      isExporting: false,
    };
  }

  exportClicked = async id => {
    this.setState({isExporting: true});

    try {
      await axios.post('/api/contactexport', {
        email: this.state.email,
        erase: this.state.erase,
      });
    } finally {
      this.setState({isExporting: false});
    }

    notify.show('Download your export file from the Data Exports page', "success");
  }

  switchView = url => {
    this.props.history.push(url);
  }

  onChange = event => {
    this.setState({[event.target.id]: getvalue(event)});
  }

  render() {
    return (
      <div className="contacts">
        <MenuNavbar {...this.props}>
          <TitlePage title="Contact Lists" tabs={
            <EDTabs>
              <Nav className="nav-tabs space15" activeKey="3">
                <NavItem eventKey="1" onClick={this.switchView.bind(null, '/contacts')}>Contact Lists</NavItem>
                <NavItem eventKey="2" onClick={this.switchView.bind(null, '/contacts/alltags')}>Tags</NavItem>
                <NavItem eventKey="3" disabled>GDPR Retrieval &amp; Erasure</NavItem>
              </Nav>
            </EDTabs>
          }/>
          <LoaderPanel isLoading={this.props.isLoading}>
            <EDFormSection>
              <h4>This form enables exporting the complete data record for a contact, and optionally erasing it from the system for GDPR compliance.</h4>
              <EDFormBox space>
                <FormControlLabel
                  id="email"
                  obj={this.state}
                  label="Contact Email Address"
                  onChange={this.onChange}
                  type="email"
                  style={{width: '350px'}}
                />
                <CheckboxLabel
                  id="erase"
                  obj={this.state}
                  label="Erase All Contact Data After Export"
                  onChange={this.onChange}
                />
                <ConfirmButton
                  disabled={this.state.isExporting || !this.state.email}
                  bsSize="large"
                  className="green"
                  text="Export All Contact Data"
                  title="Export Confirm"
                  prompt={'Are you sure you wish to export ' + (this.state.erase?'and erase ':'') + 'the data for ' + this.state.email + '?'}
                  onConfirm={this.exportClicked}
                />
                <h5 className="space30">Note: if you would like to retrieve your own mailing user records or delete your own account data, please email a request to <a href={'mailto:' + this.props.data.email} style={{fontSize:'14px'}}>{this.props.data.email}</a> and we will assist you quickly.</h5>
              </EDFormBox>
            </EDFormSection>
          </LoaderPanel>
        </MenuNavbar>
      </div>
    );
  }
}

export default withLoadSave({
  extend: ContactsRetrieval,
  initial: [],
  get: async () => (await axios.get('/api/supportcontact')).data,
});
