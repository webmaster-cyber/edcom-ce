import React, { Component } from "react";
import axios from "axios";
import LoaderPanel from "../components/LoaderPanel";
import SaveNavbar from "../components/SaveNavbar";
import parse from "../utils/parse";
import _ from "underscore";
import moment from "moment";
import { Table, Button, FormControl } from "react-bootstrap";
import { EDTableSection } from "../components/EDDOM";

const eventNames = {
    'open': 'Opens',
    'click': 'Clicks',
    'bounce': 'Bounces',
    'unsub': 'Unsubscribes',
    'complaint': 'Complaints',
    'soft': 'Soft Bounces',
};

export default class BroadcastDetails extends Component {
  constructor(props) {
    super(props);

    this.state = {
      data: null,
      reloading: false,
      page: 1,
    };
  }

  componentWillMount() {
    this.reload();
  }

  refresh = async () => {
    this.setState({reloading: true});
    try {
      await this.reload();
    } finally {
      this.setState({reloading: false});
    }
  }

  async reload() {
    var p = parse(this);
    this.setState({data: (await axios.get('/api/broadcasts/' + p.id + '/details?cmd=' + p.cmd + (p.domain ? '&domain=' + p.domain : '') + '&page=' + this.state.page)).data});
  }

  updatePage = e => {
    const num = parseInt(e.target.value, 10);
    if (isNaN(num)) return;
    if (num < 1) return;
    if (num > this.maxPage()) return;
    this.setState({page: num}, () => this.reload());
  }

  maxPage = () => {
    return Math.ceil(this.state.data.total / this.state.data.page_size);
  }

  previous = () => {
    if (this.state.page <= 1) return;
    this.setState({page: this.state.page - 1}, () => this.reload());
  }

  next = () => {
    if (this.state.page >= this.maxPage()) return;
    this.setState({page: this.state.page + 1}, () => this.reload());
  }


  goBack = () => {
    var p = parse(this);

    this.props.history.push(p.returnto);
  }

  render() {
    var p = parse(this);

    return (
      <SaveNavbar isAdmin={true} title={`View ${p.isbc === 'true' ? 'Broadcast' : 'Message'} ${eventNames[p.cmd]} ${p.domain ? ' for ' + p.domain : ''}`} onBack={this.goBack} hideSave={true}>
        <LoaderPanel isLoading={this.props.isLoading}>
          <EDTableSection>
          {
            this.state.data !== null &&
              ((this.state.data.records && this.state.data.records.length) ?
                <div>
                  <Table className="space15 log-table" responsive>
                    <thead>
                      <tr>
                        <th>Email</th>
                        <th>Date/Time</th>
                        {
                          (p.cmd === 'bounce' || p.cmd === 'soft') && <th>Message</th>
                        }
                      </tr>
                    </thead>
                    <tbody>
                      {
                        _.map(this.state.data.records, m => <tr key={m.email}>
                          <td>{m.email}</td>
                          <td>{moment(m.ts).format('l LTS')}</td>
                          {
                            (p.cmd === 'bounce' || p.cmd === 'soft') && <td>{m.code}</td>
                          }
                          </tr>)
                      }
                    </tbody>
                  </Table>
                  {
                    this.maxPage() > 1 &&
                    <div className="form-inline space-bottom" style={{display: 'flex', gap: '16px', alignItems: 'center'}}>
                      <Button style={{width: '120px'}} onClick={this.previous} disabled={this.state.page <= 1}>Previous</Button>
                      <span>
                        Page{' '}
                        <FormControl
                          className="table-page-input"
                          type="number"
                          min={1}
                          max={this.maxPage()}
                          step="1"
                          value={this.state.page}
                          onChange={this.updatePage}
                          style={{width: '75px', textAlign: 'right'}}
                        />
                        {' '}of {this.maxPage()}
                      </span>
                      <Button style={{width: '120px'}} onClick={this.next} disabled={this.state.page >= this.maxPage()}>Next</Button>
                    </div>
                  }
                </div>
                :
                <div className="text-center space-top-sm">
                  <h4>No events found!</h4>
                </div>)
          }
          </EDTableSection>
        </LoaderPanel>
      </SaveNavbar>
    );
  }
};
