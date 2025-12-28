import React, { Component } from "react";
import axios from "axios";
import _ from "underscore";
import LoaderPanel from "../components/LoaderPanel";
import withLoadSave from "../components/LoadSave";
import { FormControlLabel, SelectLabel } from "../components/FormControls";
import SaveNavbar from "../components/SaveNavbar";
import { EDFormSection, EDFormBox } from "../components/EDDOM";
import LoaderButton from "../components/LoaderButton";
import { eventTypes, eventHelp, eventExamples, hasProps } from "../utils/webhook-events";
import { Modal, Button } from "react-bootstrap";
import getvalue from "../utils/getvalue";

const options = _.map(eventTypes, (value, key) => ({id: key, name: value}));

class WebHookEdit extends Component {
  constructor(props) {
    super(props);

    this.state = {
      showTestModal: false,
      response: {
        response_text: '',
        error: false,
      },
      source: 'broadcast',
      props: 'Custom Name\n',
    };
  }

  handleChange = event => {
    this.props.update({[event.target.id]: {$set: getvalue(event)}});
  }

  handleModalChange = event => {
    this.setState({[event.target.id]: getvalue(event)});
  }

  handleSubmit = async event => {
    var isclose = this.props.formClose(event);

    await this.props.save();

    if (isclose) {
      this.goBack();
    }
  }

  goBack = () => {
    this.props.history.push("/webhooks");
  }

  toggleTestModal = () => {
    this.setState({showTestModal: !this.state.showTestModal, response: {response_text: '', error: false}});
  }

  navbarButtons = () => {
    return (
      <span>
        <div className="btn-group" id="navbar-test-button">
          <LoaderButton
            text="Test Webhook"
            onClick={this.toggleTestModal}
          />
        </div>
        <LoaderButton
          id="supp-buttons-dropdown"
          text="Save and Close"
          loadingText="Saving..."
          className="green"
          disabled={this.props.isSaving}
          onClick={this.props.formSubmit.bind(null, true)}
          splitItems={[
            { text: 'Save', onClick: this.props.formSubmit },
            { text: 'Cancel', onClick: this.goBack }
          ]}
        />
      </span>
    )
  }

  fixExample(example) {
    example = JSON.parse(JSON.stringify(example));
    if (hasProps[this.props.data.event]) {
      example.data = {};
      _.each(this.state.props.split('\n').map(line => line.trim()).filter(line => !!line.trim()), line => {
        example.data[line] = 'Custom Value';
      });
    }

    return example;
  }

  render() {
    return (
      <SaveNavbar onBack={this.goBack} buttons={this.navbarButtons()}
                  title={this.props.id === 'new'?'Create Webhook':'Edit Webhook'} user={this.props.user}
                  isSaving={this.props.isSaving}>
        <Modal show={this.state.showTestModal} onHide={this.toggleTestModal} bsSize="lg">
          <Modal.Header closeButton>
            <Modal.Title>Test Webhook</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div style={{display: 'flex', gap: '10px'}}>
              <div style={{flex: 1}}>
                <FormControlLabel
                  componentClass="textarea"
                  id="payload"
                  label="Test/Example Payload"
                  obj={{payload: JSON.stringify(this.fixExample(eventExamples[this.props.data.event]), null, 2)}}
                  readOnly={true}
                  rows={8}
                  style={{fontFamily: 'Courier New, sans serif', flex: 1}}
                />
              </div>
              {
                hasProps[this.props.data.event] &&
                <div style={{flex: 1}}>
                  <FormControlLabel
                    id="props"
                    componentClass="textarea"
                    label="Data Fields"
                    obj={this.state}
                    onChange={this.handleModalChange}
                    rows={8}
                    help="Enter a list of form fields, one per line."
                    autoFocus={true}
                  />
                </div>
              }
            </div>
            <FormControlLabel
              componentClass="textarea"
              id="response_text"
              label="Response"
              obj={this.state.response}
              readOnly={true}
              rows={5}
              style={{fontFamily: 'Courier New, sans serif', color: this.state.response.error ? 'red' : 'green'}}
              space={!hasProps[this.props.data.event]}
            />
          </Modal.Body>
          <Modal.Footer>
            <LoaderButton
              text="Send Test"
              bsStyle="primary"
              onClick={async () => {
                await axios.post('/api/resthooks/test', {
                  webhook: this.props.data,
                  payload: this.fixExample(eventExamples[this.props.data.event])
                }).then(response => {
                  this.setState({response: response.data});
                });
              }}
            />
            <Button onClick={this.toggleTestModal}>Close</Button>
          </Modal.Footer>
        </Modal>
        <LoaderPanel isLoading={this.props.isLoading}>
          <EDFormSection onSubmit={this.handleSubmit} formRef={this.props.formRef}>
            <EDFormBox>
              <FormControlLabel
                id="name"
                label="Name"
                obj={this.props.data}
                onChange={this.handleChange}
                placeholder="Unnamed"
              />
              <FormControlLabel
                id="target_url"
                label="Target URL"
                obj={this.props.data}
                onChange={this.handleChange}
                type="url"
                help="Enter the URL to send the webhook to. Example: https://connect.pabbly.com/workflow/sendwebhookdata/xxxxxxx"
                required={true}
                space
              />
              <SelectLabel
                id="event"
                label="Event Type"
                obj={this.props.data}
                onChange={this.handleChange}
                options={options}
                help={eventHelp[this.props.data.event]}
                space
              />
            </EDFormBox>
          </EDFormSection>
        </LoaderPanel>
      </SaveNavbar>
    );
  }
}

export default withLoadSave({
  extend: WebHookEdit,
  initial: { name: '', target_url: '', event: 'open_click' },
  get: async ({id}) => (await axios.get('/api/resthooks/' + id)).data,
  post: async ({data}) => (await axios.post('/api/resthooks', data)).data,
  patch: ({id, data}) => axios.patch('/api/resthooks/' + id, data),
});
