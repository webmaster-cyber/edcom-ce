import React, { Component } from "react";

const tinymce = window.tinymce;

const deftext = '<html>\n<body>\n<h1 style="text-align: center;">This is the WYSIWYG editor.</h1><p style="text-align: center;">Click here and start typing to edit your template!</p>\n</body>\n</html>';

export default class TemplateWYSIWYGEditor extends Component {
  constructor(props) {
    super(props);

    this.state = {};

    this._created = false;
  }

  componentWillReceiveProps(props) {
    this.create(props);
  }

  componentDidMount() {
    this.create(this.props);
  }

  componentWillUnmount() {
    tinymce.remove('#wysiwyg');
  }

  create(props) {
    if (this._created || !(props.transactional || props.fields) || !props.data) {
      return;
    }
    let personalizeItems = 'variable';
    if (!this.props.transactional) {
      const items = [];
      for (let i = 0; i < this.props.fields.length; i++) {
        items.push(i.toString());
      }
      personalizeItems = items.join(' ');
    }
    tinymce.init({
      selector: '#wysiwyg',
      readonly: this.props.readOnly,
      resize: false,
      promotion: false,
      relative_urls: true,
      remove_script_host: false,
      convert_urls: true,
      plugins: 'autoresize image code table lists link',
      width: '100%',
      height: 500,
      min_height: 500,
      invalid_elements: 'script',
      menubar: 'file edit insert personalize format lists table tools',
      menu: {
        personalize: { title: 'Personalize', items: personalizeItems }
      },
      toolbar: 'undo redo | styleselect | bold italic underline | image link unlink | alignleft aligncenter alignright alignjustify | numlist bullist | outdent indent',
      font_family_formats: "Arial Black=arial black; Courier=courier; Courier New=courier new; Garamond=garamond; Georgia=georgia; Helvetica=helvetica; Impact=impact; Open Sans=open sans; Palatino=palatino; Times=times; Trebuchet MS=trebuchet ms; Verdana=verdana",
      automatic_uploads: true,
      file_picker_types: 'image',
      link_title: false,
      link_list: [
        {
          title: 'Unsubscribe URL',
          value: '{{!!unsublink}}',
        },
        {
          title: 'Unsubscribe and Redirect',
          value: '{{!!unsublink|url}}',
        },
        {
          title: 'Third Party Unsubscribe',
          value: '{{!!notrack|url}}',
        }
      ],
      link_target_list: false,
      urlconverter_callback: (url, node, on_save, name) => {
        return url;
      },
      images_upload_handler: (blobInfo, progress) => new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/imageupload');

        xhr.setRequestHeader('X-Auth-UID', this.props.loggedInUID);
        xhr.setRequestHeader('X-Auth-Cookie', this.props.loggedInCookie);
        if (this.props.loggedInImpersonate !== undefined) {
          xhr.setRequestHeader('X-Auth-Impersonate', this.props.loggedInImpersonate);
        }

        xhr.upload.onprogress = (e) => {
          progress(e.loaded / e.total * 100);
        };

        xhr.onload = () => {
          if (xhr.status === 403) {
            reject({ message: 'HTTP Error: ' + xhr.status, remove: true });
            return;
          }

          if (xhr.status < 200 || xhr.status >= 300) {
            reject('HTTP Error: ' + xhr.status);
            return;
          }

          const json = JSON.parse(xhr.responseText);

          if (!json || typeof json.link !== 'string') {
            reject('Invalid JSON: ' + xhr.responseText);
            return;
          }

          resolve(json.link);
        };

        xhr.onerror = () => {
          reject('Image upload failed due to a XHR Transport error. Code: ' + xhr.status);
        };

        const formData = new FormData();
        formData.append('file', blobInfo.blob(), blobInfo.filename());

        xhr.send(formData);
      }),
      setup: (editor) => {
        if (this.props.transactional) {
          editor.ui.registry.addMenuItem('variable', {
            text: '{{variable}}',
            onAction: () => editor.insertContent(' {{variable}}')
          });
        } else {
          for (let i = 0; i < this.props.fields.length; i++) {
            const field = this.props.fields[i];
            editor.ui.registry.addMenuItem(i.toString(), {
              text: field,
              onAction: () => {
                if (field === 'Email') {
                  editor.insertContent(' {{Email}}');
                } else {
                  editor.insertContent(` {{${field},default=}}`);
                }
              }
            });
          }
        }
      },    
      init_instance_callback: (function (editor) {
        if (props.data.initialize) {
          editor.setContent(deftext);
          this.props.update({initialize: {$set: false}, rawText: {$set: deftext}});
        } else {
          editor.setContent(props.data.rawText || '');
        }
        editor.on('Change', (function () {
          this.props.update({rawText: {$set: editor.getContent()}});
        }).bind(this));
      }).bind(this)
    });

    this._created = true;
  }

  render() {
    const {nospace} = this.props;

    return (
      <div>
        {!nospace &&
        <div className="space40"></div>
        }
        <div id="wysiwyg"></div>
      </div>
    );
  }
}
