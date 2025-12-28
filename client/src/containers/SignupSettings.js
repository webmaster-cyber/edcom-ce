import React, { Component } from "react";
import { Button } from "react-bootstrap";
import axios from "axios";
import LoaderPanel from "../components/LoaderPanel";
import TitlePage from "../components/TitlePage";
import withLoadSave from "../components/LoadSave";
import MenuNavbar from "../components/MenuNavbar";
import { EDFormSection, EDFormBox } from "../components/EDDOM";
import { CheckboxLabel, FormControlLabel, SelectLabel } from "../components/FormControls";
import notify from "../utils/notify";
import Beforeunload from "react-beforeunload"
import getvalue from "../utils/getvalue";
import { Prompt } from "react-router-dom";
import TemplateRawEditor from "../components/TemplateRawEditor";

const deftext = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="Sign Up Form">
  <title>Sign Up</title>

  <!-- This is the script that will handle the form submission, do not modify this line -->
  <script src="/api/signupaction/{{ID}}"></script>
</head>
<body>
  <form id="signupform">
    <h2>Sign Up</h2>
    <!-- These fields are mandatory -->
    <label for="email">Email Address:</label>
    <input type="email" id="email" name="email" required>
    <br>
    <label for="firstname">First Name:</label>
    <input id="firstname" name="firstname" required>
    <br>
    <label for="lastname">Last Name:</label>
    <input id="lastname" name="lastname" required>
    <br>
    <label for="companyname">Company Name:</label>
    <input id="companyname" name="companyname" required>
    <br>
    <!-- Custom field example -->
    <label for="contacts">Number of Contacts:</label>
    <input type="number" id="contacts" name="contacts" required>
    <br>
    <div class="button-container">
      <button type="submit">Submit</button>
    </div>
  </form>
  <div id="signuperror"></div>

  <style>
    body {
      font-family: Verdana, sans-serif;
      font-size: 14px;
      background-color: #f5f5f5;
      color: #444;
    }
    #signupform {
      width: 400px;
      margin: 20px auto;
      border: 2px solid #ccc;
      border-radius: 8px;
      padding: 20px;
      background-color: #fafafa;
      box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
    }
    #signupform h2 {
      text-align: center; 
    }
    #signupform label {
      width: 150px; 
      display: inline-block;
    }
    #signupform input {
      margin-bottom: 16px; 
      width: 220px;
      border: 1px solid #888;
      font-family: Verdana, sans-serif;
      padding: 5px 10px;
    }
    #signupform input#contacts {
      width: 80px;
      text-align: right;
    }
    #signupform button {
      padding: 10px 20px;
      font-size: 16px;
      background-color: #3498db;
      color: #fff;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      transition: background-color 0.3s ease;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    }
    #signupform button:hover {
        background-color: #2980b9;
    }
    #signupform .button-container {
      text-align: center; 
    }
    #signuperror {
      margin: 0 auto;
      width: 400px;
      padding: 0 20px;
      text-align: center;
    }
  </style>
</body>
</html>`;

class SignupTemplate extends Component {
  constructor(props) {
    super(props);

    this.state = {
      changed: false,
    };
  }

  saveClicked = async () => {
    await axios.patch('/api/signupsettings', this.props.data);

    this.setState({changed: false}, () => {
      notify.show("Settings saved", "success");
    });
  }

  handleChange = event => {
    var id = event.target.id;
    var val = getvalue(event);
    this.setState({changed: true});
    this.props.update({[id]: {$set: val}});
  }

  render() {
    return (
      <MenuNavbar {...this.props}>
        <TitlePage title="Sign-up Page" button={
            <Button bsStyle="primary" onClick={this.saveClicked}>Save Settings</Button>
          }
        />
        <LoaderPanel isLoading={this.props.isLoading}>
          {this.state.changed &&
            <Beforeunload onBeforeunload={() => "Are you sure you want to exit without saving?"} />
          }
          <Prompt when={this.state.changed} message="Are you sure you want to exit without saving?" />
          <EDFormSection>
            {this.props.user &&
              <FormControlLabel
                id="url"
                label="Sign-up Page URL:"
                obj={{
                  url: this.props.user.webroot + '/signup/' + this.props.data.id
                }}
                readOnly={true}
                inline={true}
                style={{width: '500px', display: 'inline-block'}}
                suffix={<Button onClick={() => window.open(this.props.user.webroot + '/signup/' + this.props.data.id, '_blank')}>Open</Button>}
              />
            }
            <EDFormBox>
              <SelectLabel
                id="frontend"
                label="Frontend for New Customers"
                obj={this.props.data}
                onChange={this.handleChange}
                options={this.props.frontends}
              />
              <CheckboxLabel
                id="requireconfirm"
                label="Require Valid Email Confirmation"
                obj={this.props.data}
                onChange={this.handleChange}
                space
              />
              <FormControlLabel
                id="subject"
                label="Confirmation Email Subject"
                obj={this.props.data}
                onChange={this.handleChange}
                disabled={!this.props.data.requireconfirm}
                space
              />
              <div className="space30"/>
              <label className="control-label">HTML</label>
              <TemplateRawEditor
                data={this.props.data}
                update={this.props.update}
                hidePersonalize={true}
                showReset={true}
                noMargin={true}
                defText={deftext}
                initialized={this.props.save}
                onChange={() => this.setState({changed: true})}
              />
            </EDFormBox>
          </EDFormSection>
        </LoaderPanel>
      </MenuNavbar>
    );
  }
}

export default withLoadSave({
  extend: SignupTemplate,
  initial: {
    subject: 'Confirm Sign-up',
    requireconfirm: false,
    frontend: '',
    rawText: '',
  },
  get: async () => (await axios.get('/api/signupsettings')).data,
  patch: ({id, data}) => axios.patch('/api/signupsettings', data),
  extra: {
    frontends: async () => (await axios.get('/api/frontends')).data,
  },
  extramerge: {
    frontend: 'frontends',
  }
});
