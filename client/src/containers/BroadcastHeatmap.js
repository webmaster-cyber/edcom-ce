import React, { Component } from "react";
import { Nav, NavItem, FormGroup } from "react-bootstrap";
import withLoadSave from "../components/LoadSave";
import LoaderPanel from "../components/LoaderPanel";
import axios from "axios";
import _ from "underscore";
import { ReadOnlyTemplateEditor } from "../components/TemplateEditor";
import { EDTabs, EDTableSection, EDTable, EDTableRow } from "../components/EDDOM";
import SaveNavbar from "../components/SaveNavbar";
import TitlePage from "../components/TitlePage";
import { getLinks, decode, typedescs } from "../utils/template-utils";
import parse from "../utils/parse";
import qs from "qs";

import "react-select2-wrapper/css/select2.css";

class BroadcastHeatmap extends Component {
  switchView = url => {
    var p = parse(this);
    delete(p.id);
    this.props.history.push(url + '&' + qs.stringify(p));
  }

  goBack = () => {
    var p = parse(this);
    delete(p.id);
    this.props.history.push('/broadcasts?' + qs.stringify(p));
  }

  ignore = event => {
    event.preventDefault();
  }

  render() {
    var links = [];
    var types = [];
    var islinks = [];

    if (this.props.data.parts || this.props.data.rawText) {
      getLinks(this.props.data).forEach(d => {
        links.push(d.type === 'unsub' ? 'Built-in Unsubscribe' : decode(d.link));
        islinks.push(d.type !== 'unsub');
        types.push(typedescs[d.type]);
      });
    }

    let minWidth = '600px';
    let maxWidth = '1024px';
    let dataName = this.props.data && (this.props.data.name || '')

    return (
      <div>
        <SaveNavbar title={`Broadcast Heatmap ${dataName ? `for "${dataName}"` : ''}`} onBack={this.goBack} hideSave={true} user={this.props.user}>
          <LoaderPanel isLoading={this.props.isLoading}>
            <TitlePage tabs={
              <EDTabs>
                <Nav className="nav-tabs" activeKey="2">
                  <NavItem eventKey="1" onClick={this.switchView.bind(null, '/broadcasts/summary?id=' + this.props.id)}>Summary</NavItem>
                  <NavItem eventKey="2" disabled>Heatmap</NavItem>
                  <NavItem eventKey="3" onClick={this.switchView.bind(null, '/broadcasts/domains?id=' + this.props.id)}>Domains</NavItem>
                  <NavItem eventKey="4" onClick={this.switchView.bind(null, '/broadcasts/summarysettings?id=' + this.props.id)}>Settings</NavItem>
                </Nav>
              </EDTabs>
            }/>
            <EDTableSection>
              <section className="campaign">
                {
                this.props.data.linkclicks && this.props.data.linkclicks.length > 0 &&
                  <EDTable className="growing-margin-left" nospace minWidth={minWidth} maxWidth={maxWidth}>
                    <thead>
                      <tr>
                        <th>Link</th>
                        <th>Clicks</th>
                        <th>Type</th>
                      </tr>
                    </thead>
                    {
                      _.map(this.props.data.linkclicks, (cnt, index) =>
                          <EDTableRow key={index} index={index} nospace>
                            <td style={{maxWidth:'500px'}}>
                              <h4 className="name-padded" style={{whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
                                { islinks[index] ?
                                  <a href={links[index]}>{links[index]}</a>
                                 :
                                  links[index]
                                }
                              </h4>
                            </td>
                            <td>
                              {cnt.toLocaleString()}
                            </td>
                            <td>
                              {types[index]}
                            </td>
                          </EDTableRow>
                      )
                    }
                  </EDTable>
                }
                <FormGroup style={{position: 'relative'}}>
                  <ReadOnlyTemplateEditor data={this.props.data} />
                </FormGroup>
              </section>
            </EDTableSection>
          </LoaderPanel>
        </SaveNavbar>
      </div>
    );
  }
}

export default withLoadSave({
  initial: [],
  extend: BroadcastHeatmap,
  get: async ({id}) => (await axios.get('/api/broadcasts/' + id)).data,
});
