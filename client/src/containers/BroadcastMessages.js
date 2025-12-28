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

class BroadcastMessages extends Component {
  goBack = () => {
    var p = parse(this);
    var funnel = p.funnel;
    delete(p.type);
    delete(p.domain);
    delete(p.funnel);

    if (funnel) {
      p.domains = true;
      this.props.history.push('/funnels/message/stats?' + qs.stringify(p));
    } else {
      this.props.history.push('/broadcasts/domains?' + qs.stringify(p));
    }
  }

  render() {
    var p = parse(this);

    let title = p.type.charAt().toUpperCase() + p.type.substring(1) + ' Bounces for ' + (this.props.data.name?this.props.data.name:this.props.data.subject);

    return (
      <div>
        <LoaderPanel isLoading={this.props.isLoading}>
          <SaveNavbar title={title} onBack={this.goBack} hideSave={true} user={this.props.user}>
            <TitlePage title={p.domain}/>
            <EDTableSection>
            {
              this.props.msgs &&
                (this.props.msgs.length ?
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
                            _.map(this.props.msgs, (m,index) => <EDTableRow key={m.msg} index={index}>
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
  extend: BroadcastMessages,
  get: async ({id, funnel}) => {
    if (funnel) {
      return (await axios.get('/api/messages/' + id)).data;
    } else {
      return (await axios.get('/api/broadcasts/' + id)).data;
    }
  },
  extra: {
    msgs: async ({id, type, domain, funnel}) => {
      if (funnel) {
        return _.sortBy((await axios.get('/api/messages/' + id + '/msgs?type=' + type + '&domain=' + domain)).data, 'count').reverse();
      } else {
        return _.sortBy((await axios.get('/api/broadcasts/' + id + '/msgs?type=' + type + '&domain=' + domain)).data, 'count').reverse();
      }
    }
  }
});
