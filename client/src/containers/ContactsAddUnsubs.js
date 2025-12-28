import React, { Component } from "react";
import axios from "axios";
import { Button, ControlLabel } from "react-bootstrap";
import LoaderPanel from "../components/LoaderPanel";
import LoaderIcon from "../components/LoaderIcon";
import withLoadSave from "../components/LoadSave";
import { FormControlLabel } from "../components/FormControls";
import getvalue from "../utils/getvalue";
import notify from "../utils/notify";
import SaveNavbar from "../components/SaveNavbar";
import { EDFormSection, EDFormBox, EDFormGroup } from "../components/EDDOM";

class ContactsAddUnsubs extends Component {
  constructor(props) {
    super(props);

    this.state = {
      data: '',
      isUploading: false,
    }
  }

  handleChange = event => {
    this.setState({[event.target.id]: getvalue(event)})
  }

  handleSubmit = async event => {
    event.preventDefault();

    if (this.props.data.processing) {
      notify.show("List data is currently processing. Try again later.", "error");
      this.props.history.push("/contacts");
      return;
    }

    this.setState({isUploading: true});

    await axios.post('/api/lists/' + this.props.id + '/importunsubs', {
      data: this.state.data,
    });

    this.goBack();
  }

  goBack = () => {
    this.props.history.push("/contacts");
  }

  render() {
    var dataName = this.props.data && (this.props.data.name || '')

    return (
      <LoaderPanel isLoading={this.props.isLoading}>
        <SaveNavbar title={`Unsubscribe Contacts ${dataName ? 'from ' + dataName : ''}`} hideSave={true} onBack={this.goBack} user={this.props.user}>
          {this.state.isUploading ?
            <EDFormSection>
              <EDFormBox>
                <div className="text-center">
                  <h4>Uploading contacts, please wait...</h4>
                  <LoaderIcon />
                </div>
              </EDFormBox>
            </EDFormSection>
           :
            <EDFormSection onSubmit={this.handleSubmit}>
              <EDFormBox>
                <EDFormGroup controlId="type">
                  <ControlLabel>Contacts entered below will immediately be unsubscribed from your contact list and future messages will no longer be received by these contacts. Enter one email address per line.</ControlLabel>
                </EDFormGroup>
                <FormControlLabel
                  id="data"
                  obj={this.state}
                  componentClass="textarea"
                  onChange={this.handleChange}
                  rows="8"
                  required={true}
                />
                <EDFormGroup className="text-center">
                  <Button bsStyle="primary" bsSize="large" type="submit">Upload</Button>
                </EDFormGroup>
              </EDFormBox>
            </EDFormSection>
        }
        </SaveNavbar>
      </LoaderPanel>
    );
  }
}

export default withLoadSave({
  initial: {},
  extend: ContactsAddUnsubs,
  get: async ({id}) => (await axios.get('/api/lists/' + id)).data,
});
