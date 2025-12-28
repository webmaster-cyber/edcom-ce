import React, { Component } from "react";
import { Row, Col } from "react-bootstrap";
import withLoadSave from "../components/LoadSave";
import LoaderPanel from "../components/LoaderPanel";
import axios from "axios";
import SaveNavbar from "../components/SaveNavbar";
import { EDTableSection, EDTable, EDTableRow } from "../components/EDDOM";
import TitlePage from "../components/TitlePage";
import parse from "../utils/parse";
import _ from "underscore";
import qs from "qs";

class TransactionalMessages extends Component {
  goBack = () => {
    var p = parse(this);
    delete(p.type);
    delete(p.domain);
    this.props.history.push('/transactional/domains?' + qs.stringify(p));
  }

  render() {
    var p = parse(this);

    let title = p.type.charAt().toUpperCase() + p.type.substring(1) + ' Bounces for ' + this.props.id;

    return (
      <div>
        <LoaderPanel isLoading={this.props.isLoading}>
          <SaveNavbar title={title} onBack={this.goBack} hideSave={true} user={this.props.user}>
            <TitlePage title={p.domain}/>
            <EDTableSection>
            {
              this.props.data &&
                (this.props.data.length ?
                  <Row>
                    <Col md={10} mdOffset={1}>
                      <EDTable nospace>
                        <thead>
                          <tr>
                            <th>Message</th>
                            <th>Recipients</th>
                          </tr>
                        </thead>
                          {
                            _.map(this.props.data, (m,index) => <EDTableRow key={m.msg} index={index}>
                              <td><h4 className="name-padded">{m.msg}</h4></td>
                              <td>{m.count.toLocaleString()}</td>
                              </EDTableRow>)
                          }
                      </EDTable>
                    </Col>
                  </Row>
                  :
                  <div className="text-center space-top-sm">
                    <h4>No bounce messages found!</h4>
                  </div>)
            }
            </EDTableSection>
          </SaveNavbar>
        </LoaderPanel>
      </div>
    );
  }
}

export default withLoadSave({
  initial: [],
  extend: TransactionalMessages,
  get: async ({id, type, domain, start, end}) => _.sortBy((await axios.get('/api/transactional/tag/' + id + '/msgs?type=' + type + '&domain=' + domain + '&start=' + encodeURIComponent(start) + '&end=' + encodeURIComponent(end))).data, 'count').reverse(),
});
