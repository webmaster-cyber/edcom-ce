import { sendGA4Event } from "../utils/tracking";
import React, { Component } from "react";
import { Modal, Button } from "react-bootstrap";
import axios from "axios";
import LoaderIcon from "../components/LoaderIcon";
import { FormControlLabel } from "../components/FormControls";
import getvalue from "../utils/getvalue";
import SaveNavbar from "../components/SaveNavbar";
import parse from "../utils/parse";
import { EDFormSection, EDFormBox } from "../components/EDDOM";
import LoaderButton from "../components/LoaderButton";

export default class ExclusionAdd extends Component {
  constructor(props) {
    super(props);

    this.state = {
      data: '',
      isUploading: false,
      showConfirm: false,
    }

    this._formRef = null;
  }

  handleChange = event => {
    this.setState({[event.target.id]: getvalue(event)})
  }

  handleSubmit = event => {
    event.preventDefault();

    this.setState({showConfirm: true});
  }

  confirmClicked = async yes => {
    this.setState({showConfirm: false});
    if (!yes) {
      return;
    }

    this.setState({isUploading: true});

    try {
      var p = parse(this);

      await axios.post('/api/exclusion/' + p.id + '/add', {
        data: this.state.data.split(/\n/),
      });
    } finally {
      this.setState({isUploading: false});
    }

    this.goBack();
  }

  goBack = id => {
    this.props.history.push("/exclusion");
  }

  formSubmit = () => {
    this._formRef.childNodes[0].click();
  }

  navbarButtons = () => {
    return (
      <LoaderButton
        id="supp-buttons-dropdown"
        text="Add"
        loadingText="Adding..."
        className="green"
        disabled={this.props.isSaving}
        onClick={() => {
          sendGA4Event('Exclusions', 'Added Exclusion Data', 'Added Exclusion Data');
          return this.formSubmit();
        }}
        splitItems={[
          { text: 'Cancel', onClick: this.goBack }
        ]}
      />
    )
  }

  render() {
    var p = parse(this);

    return (
      <SaveNavbar title={`Add ${p.type} to ${p.name}`} onBack={this.goBack} saveText="Add" user={this.props.user}
                  buttons={this.navbarButtons()} isSaving={this.state.isUploading}>
        <EDFormSection onSubmit={this.handleSubmit} formRef={r => this._formRef = r}>
          <Modal show={this.state.showConfirm}>
            <Modal.Header>
              <Modal.Title>Exclusion Confirmation</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              { p.type === 'emails' ?
                  <p>If you proceed, these contacts will be permanently removed from all your contact lists, including their response history. Are you sure?</p>
                :
                  <p>If you proceed, all contacts with these domains will be permanently removed from all your contact lists, including their response history. Are you sure?</p>
              }
            </Modal.Body>
            <Modal.Footer>
              <Button onClick={this.confirmClicked.bind(this, true)} bsStyle="primary">Yes</Button>
              <Button onClick={this.confirmClicked.bind(this, false)}>No</Button>
            </Modal.Footer>
          </Modal>
          <EDFormBox>
            {this.state.isUploading ?
              <div className="text-center">
                <h3>Uploading, please wait...</h3>
                <LoaderIcon />
              </div>
             :
              <div>
                <FormControlLabel
                  id="data"
                  space
                  label={`Enter ${p.type} to exclude from all lists, one per line`}
                  obj={this.state}
                  componentClass="textarea"
                  onChange={this.handleChange}
                  rows="8"
                  required={true}
                />
              </div>
          }
          </EDFormBox>
        </EDFormSection>
      </SaveNavbar>
    );
  }
}
