import React, { Component } from "react";
import { Modal, Button } from "react-bootstrap";
import _ from "underscore";

import "./ClientPopup.css";

export default class ClientPopup extends Component {
  render() {
    return (
      <Modal bsSize="large" show={this.props.show} onHide={this.props.onClose}>
        <Modal.Header>
          <Modal.Title>
            {this.props.title}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <table className="table table-condensed clientstats">
            <thead>
              <tr>
                {
                  _.map(this.props.columns, c =>
                    <th key={c.prop} style={{textAlign: c.align||'left'}}>{c.name}</th>
                  )
                }
              </tr>
            </thead>
            <tbody>
              {
                _.map(this.props.stats, (s, i) => (
                  <tr key={i}>
                    {
                      _.map(this.props.columns, c => (
                        <td key={c.prop} style={{textAlign: c.align||'left'}}>
                          {s[c.prop]}
                        </td>
                      ))
                    }
                  </tr>
                ))
              }
            </tbody>
          </table>
        </Modal.Body>
        <Modal.Footer>
          <Button onClick={this.props.onClose} bsStyle="primary">Close</Button>
        </Modal.Footer>
      </Modal>
    );
  }
}
