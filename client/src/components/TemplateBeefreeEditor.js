import React, { Component } from "react";
import axios from "axios";
import { stringToColor } from "../utils/color";
import LoaderIcon from "./LoaderIcon";
import { Modal, Button } from "react-bootstrap";
import { FormControlLabel } from "./FormControls";
import LoaderButton from "../components/LoaderButton";

import "./TemplateBeefreeEditor.css";

export default class TemplateBeefreeEditor extends Component {
  constructor(props) {
    super(props);

    this.state = {
      loading: true,
      showMetadataModal: false,
      metadata: {name: ''},
      metadataModalCallback: null,
      metadataModalCancel: null,
      singleRowSave: false,
      showSingleRow: false,
      singleRowTemplate: null,
      token: null
    };

    this._bee = null;
    this._savePromiseResolve = null;
    this._isSavingRow = false;
    this._saveRowComplete = null;
  }

  componentWillReceiveProps(props) {
    this.create(props);
  }

  componentDidMount() {
    this.create(this.props);
  }

  componentWillUnmount() {
    this._bee = null;
  }

  getConfig(props, editSingleRow) {
    return {
      uid: props.loggedInImpersonate ? props.loggedInImpersonate : props.user.id,
      container: 'bee-plugin-container',
      workspace: { editSingleRow },
      disableLinkSanitize: true,
      userColor: stringToColor(props.user.id),
      username: props.user.fullname,
      userHandle: props.user.id,
      editorFonts: {
        showDefaultFonts: true,
        customFonts: [{
            name: "Poppins",
            fontFamily: "'Poppins', sans-serif",
            url: "https://fonts.googleapis.com/css?family=Poppins"
        }]
      },
      specialLinks: [
        {
          type: 'Unsubscribe',
          label: 'Unsubscribe URL',
          link: '{{!!unsublink}}',
        },
        {
          type: 'Unsubscribe',
          label: 'Unsubscribe and Redirect',
          link: '{{!!unsublink|url}}',
        },
        {
          type: 'Unsubscribe',
          label: 'Third Party Unsubscribe',
          link: '{{!!notrack|url}}',
        }
      ],
      mergeTags: this.props.transactional ?
        [{
          name: 'variable',
          value: '{{variable}}'
        }]
        :
        this.props.fields.map(field => {
          return {
            name: field.toString(),
            value: field === 'Email' ? `{{${field}}}` : `{{${field},default=}}`
          };
        }),
      onChange: () => {
        this.props.onChange();
      },
      onSave: (jsonFile, htmlFile) => {
        if (this.state.singleRowSave) {
          axios.get('/api/savedrows').then(({data}) => {
            const footer = data.find(row => row.rowJson.metadata.type === 'sticky-footer');
            if (footer) {
              this.setState({singleRowSave: false, showSingleRow: true, singleRowTemplate: JSON.parse(jsonFile)}, () => {
                window.BeePlugin.create(this.state.token, this.getConfig(this.props, true), (instance) => {
                  this._bee = instance;

                  const template = JSON.parse(jsonFile);
                  template.page.rows = [footer.rowJson];
                  this._bee.start(template);
                });
              });
            }
          });
        } else if (this.state.showSingleRow) {
          const pageJson = JSON.parse(jsonFile);
          const rowJson = pageJson.page.rows[0];
          // merge jsonFile into template
          axios.post('/api/beefreemerge', {
            source: this.state.singleRowTemplate,
            replace: [{
                "path": "$..rows[?(@.metadata.type=='sticky-footer')]",
                "value": rowJson
            }]
          }).then(({data}) => {
            if (data.json) {
              // save jsonFile/htmlFile to sticky-footer on server
              axios.post('/api/savedrows', {
                rowHtml: htmlFile,
                rowJson,
                pageJson
              }).then(() => {
                // reload template
                window.BeePlugin.create(this.state.token, this.getConfig(this.props), (instance) => {
                  this._bee = instance;

                  this._bee.start(data.json);

                  this.setState({showSingleRow: false, singleRowTemplate: null});
                });
              });
            } else {
              window.BeePlugin.create(this.state.token, this.getConfig(this.props), (instance) => {
                this._bee = instance;

                this._bee.start(this.state.singleRowTemplate);

                this.setState({showSingleRow: false, singleRowTemplate: null});
              });
            }
          });
        } else {
          this.props.update({rawText: {$set: JSON.stringify({
            html: htmlFile,
            json: JSON.parse(jsonFile)
          })}}, this._savePromiseResolve());
        }
      },
      onSaveRow: async (jsonFile, htmlFile, pageJSON) => {
        this._isSavingRow = true;

        try {
          await axios.post('/api/savedrows', {
            rowHtml: htmlFile,
            rowJson: JSON.parse(jsonFile),
            pageJson: JSON.parse(pageJSON)
          });

          if (this._saveRowComplete) {
            this._saveRowComplete();
            this._saveRowComplete = null;
          }
        } finally {
          this._isSavingRow = false;
        }
      },
      saveRows: !editSingleRow && !this.props.disableSavedRows,
      contentDialog: editSingleRow ? undefined : {
        saveRow: {
          handler: (function (resolve, reject, args) {
              this.setState({showMetadataModal: true, metadata: {name: ''}, metadataModalCallback: () => {
                this.setState({showMetadataModal: false}, () => resolve(this.state.metadata));
              }, metadataModalCancel: () => {
                  this.setState({showMetadataModal: false}, () => reject());
              }});
          }).bind(this)
        },
        onDeleteRow: {
          handler: function (resolve, reject, args) {
            axios.delete(`/api/savedrows/${args.row.metadata.rowId}`).then(() => {
              resolve(true);
            }).catch(e => {
              reject();
              throw e;
            });
          }
        },
        onEditRow: {
          handler: (function (resolve, reject, args) {
            this.setState({showMetadataModal: true, metadata: args.row.metadata, metadataModalCallback: () => {
              args.row.metadata.name = this.state.metadata.name;

              axios.patch(`/api/savedrows/${args.row.metadata.rowId}`, {
                rowJson: args.row
              }).then(() => {
                this.setState({showMetadataModal: false}, () => resolve(true));
              }).catch(e => {
                this.setState({showMetadataModal: false}, () => { reject(); throw e; });
              });
            }, metadataModalCancel: () => {
                this.setState({showMetadataModal: false}, () => reject());
            }});
          }).bind(this)
        },
        editSyncedRow: {
          label: 'Edit Sticky Footer',
          description: 'You can edit the sticky footer here. New templates will automatically receive the updated footer.',
          handler: (function (resolve, reject, args) {
            resolve(true);
            this.setState({singleRowSave: true}, () => {
              this._bee.save();
            });
          }).bind(this)
        }
      },
      rowsConfiguration: editSingleRow ? undefined : {
        emptyRows: true,
        defaultRows: true,
        externalContentURLs: this.props.disableSavedRows ? undefined : [{
          name: 'Saved Rows',
          value: 'saved-rows',
          handle: 'saved-rows',
          isLocal: true,
          behaviors: {
            canEdit: true,
            canDelete: true,
          },
        }, {
          name: 'Sticky Footer',
          value: 'sticky-footer',
          handle: 'sticky-footer',
          isLocal: true,
          behaviors: {
            canEditSyncedRows: false,
            canDeleteSyncedRows: false,
          },
        }]
      },
      hooks: editSingleRow ? undefined : {
        getRows: {
          handler: (resolve, reject, args) => {
            const loader = async () => {
              try {
                const data = (await axios.get('/api/savedrows')).data;

                resolve(data.filter(row => {
                  return ((args.handle === 'saved-rows') !== (row.rowJson.metadata.type === 'sticky-footer'));
                }).map(row => row.rowJson));
              } catch (e) {
                reject();
                throw e;
              }
            };

            if (this._isSavingRow) {
              this._saveRowComplete = loader;
            } else {
              return loader();
            }
          }
        }
      }
    };
  }

  async create(props) {
    if (props.readOnly) {
      this.setState({loading: false});
      return;
    }
    if (this._bee || !(props.transactional || props.fields) || !props.data || !props.user) {
      return;
    }

    const auth = await axios.get('/api/beefreeauth');
    const token = auth.data;

    const config = this.getConfig(props);

    window.BeePlugin.create(token, config, (instance) => {
        this._bee = instance;

        this._bee.start(JSON.parse(props.data.rawText).json);

        props.setSaveCB(() => {
          return new Promise((resolve, reject) => {
            this._savePromiseResolve = resolve;

            this._bee.save();
          });
        });
    });

    this.setState({loading: false, token});
  }

  saveRowClicked = () => {
    this._bee.save();
  }

  cancelSaveRowClicked = () => {
    window.BeePlugin.create(this.state.token, this.getConfig(this.props), (instance) => {
      this._bee = instance;

      this._bee.start(this.state.singleRowTemplate);

      this.setState({showSingleRow: false, singleRowTemplate: null});
    });
  }

  render() {
    const {nospace, readOnly, data, fullScreen} = this.props;

    let style = {
      height: 'calc(100vh - 52px)'
    };
    if (!fullScreen) {
      style = {height: 'calc(100vh - 8px)', minHeight: '500px'};
    }

    if (this.state.showSingleRow) {
      style = {
        position: 'fixed',
        top: '52px',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 200,
      };
    }

    return (
      <div>
        {
          this.state.showSingleRow &&
            <div className="single-row-toolbar" style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              height: '52px',
              zIndex: 250,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '12px',
              paddingRight: '12px',
            }}>
              <LoaderButton
                text="Cancel"
                loadingText="Canceling..."
                onClick={this.cancelSaveRowClicked}
              />
              <LoaderButton
                bsStyle="primary"
                text="Save Footer"
                loadingText="Saving..."
                onClick={this.saveRowClicked}
              />
            </div>
        }
        <Modal bsSize="large" show={this.state.showMetadataModal} onHide={this.state.metadataModalCancel}>
          <Modal.Header>
            <Modal.Title>
              Save Row
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <FormControlLabel
              id="name"
              label="Name"
              obj={this.state.metadata}
              onChange={e => this.setState({metadata: {name: e.target.value}})}
            />
          </Modal.Body>
          <Modal.Footer>
            <Button onClick={this.state.metadataModalCallback} bsStyle="primary" disabled={!this.state.metadata.name}>Save</Button>
            <Button onClick={this.state.metadataModalCancel}>Cancel</Button>
          </Modal.Footer>
        </Modal>
        { !nospace &&
          <div className="space40"></div>
        }
        {
          this.state.loading &&
          <div className="text-center">
            { nospace &&
              <div className="space40"></div>
            }
            <LoaderIcon />
          </div>
        }
        <div id="bee-plugin-container" style={style}>
          { readOnly &&
            <iframe title="template" srcDoc={JSON.parse(data.rawText).html} style={{width: '100%', height: '100%', border: 'none'}} />
          }
        </div>
      </div>
    );
  }
}
