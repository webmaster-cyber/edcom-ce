import React, { Component } from "react";
import { Modal, Button } from "react-bootstrap";
import axios from "axios";
import _ from "underscore";
import LoaderIcon from "./LoaderIcon";
import moment from "moment";

import "./TestLog.css";

export default class TestLog extends Component {
  constructor(props) {
    super(props);

    this.state = {
      logs: [],
      loading: false,
    };
  }

  componentWillReceiveProps(props, oldprops) {
    if (props.show && !oldprops.show) {
      this.reload();
    }
  }

  async reload() {
    this.setState({loading: true});

    this.setState({logs: _.sortBy((await axios.get('/api/testlogs')).data, l => l.ts).reverse(), loading: false});
  }
  
  render() {
    return (
      <Modal bsSize="large" show={this.props.show} onHide={this.props.onClose}>
        <Modal.Header>
          <Modal.Title>
            Test Log
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {
            this.state.loading ?
              <div className="text-center">
                <LoaderIcon />
              </div>
            :
              <table className="table table-condensed testlogs">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>To</th>
                    <th>Message</th>
                  </tr>
                </thead>
                <tbody>
                  {
                    _.map(this.state.logs, (l, i) => (
                      <tr key={i}>
                        <td>
                          { moment(l.ts).format("lll") }
                        </td>
                        <td>
                          { l.to }
                        </td>
                        <td>
                          { l.msg }
                        </td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
          }
        </Modal.Body>
        <Modal.Footer>
          <Button onClick={this.props.onClose} bsStyle="primary">Close</Button>
        </Modal.Footer>
      </Modal>
    );
  }
}
