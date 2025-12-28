import React, { Component } from "react";
import axios from "axios";
import _ from "underscore";
import moment from "moment";
import LoaderPanel from "../components/LoaderPanel";
import TitlePage from "../components/TitlePage";
import withLoadSave from "../components/LoadSave";
import MenuNavbar from "../components/MenuNavbar";
import bytes from "../utils/bytes";
import { EDTableSection, EDTable, EDTableRow } from "../components/EDDOM";

class Exports extends Component {
  componentDidMount() {
    this._interval = setInterval(() => {
      if (_.find(this.props.data, e => !e.error && !e.complete)) {
        this.props.reload();
      }
    }, 10000);
  }

  componentWillUnmount() {
    clearInterval(this._interval);
  }

  render() {
    let minWidth = '600px';
    let maxWidth = '1024px';
    var data = _.sortBy(this.props.data, 'started_at').reverse();
    
    return (
     <MenuNavbar {...this.props}>
       <TitlePage title="Exports" />
        <LoaderPanel isLoading={this.props.isLoading}>
          <EDTableSection>
          {
            data.length ?
              <div>
                <div className="text-center space30">
                  <h4>Exported files will be removed after 24 hours</h4>
                </div>
                <EDTable className="growing-margin-left" minWidth={minWidth} maxWidth={maxWidth}>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Started</th>
                      <th>Entries</th>
                      <th>Size</th>
                      <th></th>
                    </tr>
                  </thead>
                  {
                    _.map(data, (e, index) =>
                        <EDTableRow key={e.id} index={index}>
                          <td>
                            <h4 className="name-padded">
                              {e.name}
                            </h4>
                          </td>
                          <td>
                            {moment(e.started_at).format("l LT")}
                          </td>
                          { e.complete ?
                            <td>
                              {e.count.toLocaleString()}
                            </td>
                            :
                            <td>Processing...</td>
                          }
                          { e.complete ?
                            <td>
                              {bytes(e.size)}
                            </td>
                            :
                            <td>&nbsp;</td>
                          }
                          <td>
                            { e.error ? 
                              <span className="text-danger">{e.error}</span>
                              :
                                e.complete ?
                                <a target="_blank" href={e.url}>Download</a>
                                :
                                <span>&nbsp;</span>
                            }
                          </td>
                        </EDTableRow>
                    )
                  }
                </EDTable>
              </div>
              :
              <div className="text-center space-top-sm">
                <h4>No Exported Files</h4>
              </div>
          }
          </EDTableSection>
        </LoaderPanel>
      </MenuNavbar>
    );
  }
}

export default withLoadSave({
  extend: Exports,
  initial: [],
  get: async () => (await axios.get('/api/exports')).data
});
