import React, { Component } from "react";
import SaveNavbar from "../components/SaveNavbar";
import axios from "axios";
import NewTemplate from "../components/NewTemplate";
import parse from "../utils/parse";

export default class TransactionalTemplateNew extends Component {
  constructor(props) {
    super(props);

    this.state = {
      isSaving: false,
      isDisabled: false,
    };

    this._submitcb = null;
  }

  setIsSaving = v => {
    this.setState({isSaving: v});
  }

  setSubmitCB = cb => {
    this._submitcb = cb;
  }

  goBack = () => {
    this.props.history.push("/transactional/templates");
  }

  componentDidMount() {
    const p = parse(this);

    this._submitcb(null, p.legacy === 'true' || !this.props.user.hasbeefree);
  }

  finishSubmit = async (initialize, campType, htmltext, parts, bodyStyle) => {
    this.setState({isSaving: true});
    var id;
    try {
      id = (await axios.post('/api/transactional/templates', {
        name: 'Untitled',
        parts: parts,
        bodyStyle: bodyStyle,
        preheader: '',
        initialize: initialize,
        type: campType,
        rawText: htmltext,
        fromname: '',
        returnpath: '',
        fromemail: '',
        subject: '',
        replyto: '',
        tag: '',
      })).data.id;
    } finally {
      this.setState({isSaving: false});
    }
    this.props.history.push("/transactional/templates/edit?id=" + id);
  }

  render() {
    return (
      <SaveNavbar title="Create Transactional Template" isSaving={this.state.isSaving}
                  disabled={this.state.isDisabled} user={this.props.user} buttons={null}>
        <NewTemplate setIsSaving={this.setIsSaving} onCancel={this.goBack}
                     isSaving={this.state.isSaving || this.props.isSaving}
                     user={this.props.user}
                     setSubmitCB={this.setSubmitCB} finishSubmit={this.finishSubmit} />
      </SaveNavbar>
    );
  }
}
