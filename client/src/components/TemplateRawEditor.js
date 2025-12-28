import React, { Component } from "react";
import { Controlled as CodeMirror } from "react-codemirror2";
import { Row, Col, ButtonToolbar, ButtonGroup, DropdownButton, MenuItem, FormControl, Button } from "react-bootstrap";
import axios from "axios";
import LoaderIcon from "./LoaderIcon";
import Split from "split.js";
import _ from "underscore";

import "codemirror/mode/javascript/javascript";
import "codemirror/mode/xml/xml";
import "codemirror/mode/css/css";
import "codemirror/mode/htmlmixed/htmlmixed";

import "codemirror/lib/codemirror.css";

const defaulttext = '<html>\n\t<body>\n\t\t<p>Edit code to see live changes.</p>\n\t</body>\n</html>';

export default class TemplateRawEditor extends Component {
  constructor(props) {
    super(props);

    this.iframeRef = null;
    this.editorRef = null;

    this.state = {
      isUploading: false,
      isFocused: false,
    };

    this.componentWillReceiveProps(props);
  }

  componentDidMount() {
    Split(['#left', '#right'], {
      sizes: [50, 50],
    });
  }

  writeIFrame(txt) {
    if (this.iframeRef !== null) {
      this.iframeRef.contentWindow.document.open();

      // remove existing scripts and turn off all form submissions
      txt = txt.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, `
        <script>
        {
          var preventDefault = function (e) { e.preventDefault(); }
          var stopSubmit = function () {
            for (let i = 0; i < document.forms.length; i++) {
              var form = document.forms[i];
              form.addEventListener("submit", preventDefault);
            }
          }
          document.addEventListener("DOMContentLoaded", stopSubmit);
          setTimeout(stopSubmit);
        }
        </script>
      `);

      this.iframeRef.contentWindow.document.write(txt);
    }
  }

  componentWillReceiveProps(props) {
    if (props.data && props.data.initialize) {
      let deftext = this.props.defText || defaulttext;
      this.props.update({initialize: {$set: false}, rawText: {$set: deftext}}, () => {
        if (this.props.initialized) {
          this.props.initialized();
        }
      });
      this.writeIFrame(deftext);
    }
  }

  onChange = val => {
    this.props.update({rawText: {$set: val}});
    this.writeIFrame(val);

    if (this.props.onChange) {
      this.props.onChange();
    }
  }

  onFocus = () => {
    if (!this.state.isFocused) {
      this.setState({isFocused: true});
    }
  }

  setRef = ref => {
    this.iframeRef = ref;
    setTimeout(() => {
      this.writeIFrame(this.props.data.rawText);
    });
  }

  setEditorRef = ref => {
    this.editorRef = ref;
  }

  insertText = txt => {
    if (this.editorRef) {
      this.editorRef.replaceSelection(txt);
    }
  }

  uploadClick = () => {
    document.getElementById('file').click();
  }

  handleImage = async event => {
    if (event.target.files.length === 0)
      return

    this.setState({isUploading: true});

    try {
      var file = event.target.files[0];

      var ext = file.name.split('.').pop();


      var upload = (await axios({
        method: 'post',
        url: '/api/uploadfile?type=img&ext=' + ext,
        headers: { "Content-Type": `application/octet-stream` },
        data: file
      })).data;

      var url = (await axios.post('/api/imageimport', {
        key: upload.key,
      })).data.url;

      this.editorRef.replaceSelection('<img src="' + url + '">');
      if (this.props.onChange) {
        this.props.onChange();
      }
    } finally {
      this.setState({isUploading: false});
    }
  }

  reset = () => {
    this.props.update({rawText: {$set: this.props.defText || defaulttext}});
    this.writeIFrame(this.props.defText || defaulttext);
    if (this.props.onChange) {
      this.props.onChange();
    }
  }

  render() {
    const {readOnly, transactional} = this.props;

    return (
      <div style={{textAlign: 'left', marginTop: this.props.noMargin ? undefined : '5px', marginLeft: this.props.noMargin ? undefined : '15px', marginRight: this.props.noMargin ? undefined : '15px'}}>
        <Row>
          <Col xs={12}>
            <ButtonToolbar style={{marginBottom: '5px'}}>
              <FormControl id="file" type="file" onChange={this.handleImage} accept="image/*" style={{display: 'none'}}/>
              <ButtonGroup>
                <Button onClick={this.uploadClick} disabled={!this.editorRef || !this.state.isFocused || this.state.isUploading}>
                  {
                    this.state.isUploading ?
                      <LoaderIcon />
                    :
                      <i className="fa fa-image"></i>
                  }
                </Button>
              </ButtonGroup>
              {
                !this.props.hidePersonalize &&
                <ButtonGroup>
                  {transactional ?
                    <DropdownButton title="Personalize" id="variables" disabled={!this.editorRef || !this.state.isFocused || this.state.isUploading}>
                      <MenuItem onClick={this.insertText.bind(null, ' {{variable}}')}>{'{{'}variable}}</MenuItem>
                      <MenuItem onClick={this.insertText.bind(null, '{% if value %} {% endif %}')}>{'{'}% if %}</MenuItem>
                      <MenuItem onClick={this.insertText.bind(null, '{% for value in collection %} {% endfor %}')}>{'{'}% for %}</MenuItem>
                    </DropdownButton>
                  :
                    <DropdownButton title="Personalize" id="variables" disabled={!this.editorRef || !this.state.isFocused || this.state.isUploading}>
                      {
                        _.map(this.props.fields, f => <MenuItem key={f} onClick={this.insertText.bind(null, ' {{' + f + ',default=}}')}>{f}</MenuItem>)
                      }
                      <MenuItem onClick={this.insertText.bind(null, '{{!!unsublink}}')}>Unsubscribe URL</MenuItem>
                      <MenuItem onClick={this.insertText.bind(null, '{{!!unsublink|url}}')}>Unsubscribe and Redirect</MenuItem>
                      <MenuItem onClick={this.insertText.bind(null, '{{!!notrack|url}}')}>Third Party Unsubscribe</MenuItem>
                    </DropdownButton>
                  }
                </ButtonGroup>
              }
              {
                this.props.showReset &&
                <ButtonGroup>
                  <Button onClick={this.reset} disabled={!this.editorRef || this.state.isUploading || (this.props.data.rawText === (this.props.defText || defaulttext))}>
                    Reset to Default
                  </Button>
                </ButtonGroup>
              }
            </ButtonToolbar>
          </Col>
        </Row>
        <div>
          <div style={{display:'inline-block'}} id="left">
            <div style={{border: '1px solid #ddd', borderRadius: '4px', opacity: readOnly || this.state.isUploading ? 0.5 : 1.0}}>
              <CodeMirror
                value={this.props.data.rawText}
                onBeforeChange={(editor, data, value) => {
                  this.onChange(value);
                }}
                options={{
                  mode: 'htmlmixed',
                  lineNumbers: true,
                  readOnly: readOnly || this.state.isUploading ? 'nocursor' : false,
                }}
                editorDidMount={this.setEditorRef}
                onFocus={this.onFocus}
              />
            </div>
          </div>
          <div style={{display: 'inline-block'}} id="right">
            <iframe ref={this.setRef} title="rawPreview" width="100%" height="500px"/>
          </div>
        </div>
      </div>
    );
  }
}
