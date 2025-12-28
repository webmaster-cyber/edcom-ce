import React, { Component } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import _ from "underscore";
import LoaderPanel from "../components/LoaderPanel";
import withLoadSave from "../components/LoadSave";
import MenuNavbar from "../components/MenuNavbar";
import TitlePage from "../components/TitlePage";
import { EDTabs, EDTableSection } from "../components/EDDOM";
import ReactTable from "react-table";
import { Button, Glyphicon, Nav, NavItem } from "react-bootstrap";
import Timeframe from "../components/Timeframe";
import SearchControl from "../components/SearchControl";
import dateformat from "../utils/date-format";
import parse from "../utils/parse";
import moment from "moment";

import "../../node_modules/react-table/react-table.css";

function pct(n) {
  return (n * 100).toFixed(2) + '%';
}

class CustBCs extends Component {
  constructor(props) {
    super(props);

    var p = parse(this);

    var start = moment().subtract(1, 'days').minutes(0).seconds(0);
    var end = moment().add(2, 'days').hour(0).minutes(0).seconds(0);
    var search = '';
    var page = 0;
    var pageSize = 20;
    var sorted = [
      {id: 'complaint_max', desc: true},
    ];

    if (p.tablestate) {
      var ts = JSON.parse(p.tablestate);
      start = moment(ts.start);
      end = moment(ts.end);
      search = ts.search;
      page = ts.page;
      pageSize = ts.pageSize;
      sorted = ts.sorted;
    } else if (p.start) {
      start = moment(p.start);
      end = moment(p.end);
    }

    this.state = {
      data: null,
      reloading: false,
      search: search,
      start: start,
      end: end,
      page: page,
      pageSize: pageSize,
      sorted: sorted,
    };
  }

  tableState = () => {
    return encodeURIComponent(JSON.stringify(_.pick(this.state, 'search', 'start', 'end', 'page', 'pageSize', 'sorted')));
  }

  onPageChange = index => {
    this.setState({page: index});
  }
  onPageSizeChange = (size, index) => {
    this.setState({pageSize: size, page: index});
  }
  onSortedChange = sort => {
    this.setState({sorted: sort});
  }

  componentWillMount() {
    this.reload();
  }

  switchView = () => {
    this.props.history.push('/custbcsbybc?start=' + dateformat(this.state.start) + '&end=' + dateformat(this.state.end));
  }

  refresh = async () => {
    this.setState({reloading: true});
    try {
      await this.reload();
    } finally {
      this.setState({reloading: false});
    }
  }

  searchChanged = s => {
    this.setState({search: s});
  }

  async reload() {
    var {start, end} = this.state;

    this.setState({data: (await axios.get('/api/companybroadcaststats?start=' + dateformat(start) + '&end=' + dateformat(end))).data});
  }

  setDates = (start, end) => {
    return this.setState({start: start, end: end}, () => this.refresh());
  }

  render() {
    let columns = [{
      Header: 'Name',
      headerClassName: 'text-left',
      accessor: 'name',
    }, {
      Header: 'Opens',
      headerClassName: 'text-right',
      Cell: ({...props}) => pct(props.value),
      accessor: 'open',
      className: 'text-right',
    }, {
      Header: 'Complaints',
      headerClassName: 'text-right',
      Cell: ({...props}) => pct(props.value),
      accessor: 'complaint',
      className: 'text-right',
    }, {
      Header: 'Highest Complaints',
      headerClassName: 'text-right',
      Cell: ({...props}) => pct(props.value),
      accessor: 'complaint_max',
      className: 'text-right',
    }, {
      Header: 'Highest H. Bounces',
      headerClassName: 'text-right',
      Cell: ({...props}) => {
        if (!props.value) {
          return pct(props.value);
        } else {
          var {start, end} = this.state;
          return <Link to={'/statmsgs?type=hard' +
                           '&returnto=' + encodeURIComponent('/custbcs?tablestate=' + this.tableState()) +
                           '&start=' + dateformat(start) +
                           '&end=' + dateformat(end) +
                           '&cid=' + props.original.cid
                           }>{pct(props.value)}</Link>
        }
      },
      accessor: 'hard_max',
      className: 'text-right',
    }, {
      Header: 'Highest S. Bounces',
      headerClassName: 'text-right',
      Cell: ({...props}) => {
        if (!props.value) {
          return pct(props.value);
        } else {
          var {start, end} = this.state;
          return <Link to={'/statmsgs?type=soft' +
                           '&returnto=' + encodeURIComponent('/custbcs?tablestate=' + this.tableState()) +
                           '&start=' + dateformat(start) +
                           '&end=' + dateformat(end) +
                           '&cid=' + props.original.cid
                           }>{pct(props.value)}</Link>
        }
      },
      accessor: 'soft_max',
      className: 'text-right',
    }]

    let data = _.filter(_.map(this.state.data, s => {
      var customer = _.find(this.props.customers, customer => customer.id === s.cid);
      return {
        name: customer ? customer.name : '',
        cid: s.cid,
        open: s.open,
        complaint: s.complaint,
        complaint_max: s.complaint_max,
        hard_max: s.hard_max,
        soft_max: s.soft_max,
      };
    }), s => {
      var search = this.state.search.toLowerCase().trim();
      if (!search)
        return true;
      return s.name.toLowerCase().includes(search);
    });

    return (
      <MenuNavbar {...this.props} isAdmin={true}>
        <TitlePage title="Customer Broadcasts Report" tabs={
          <EDTabs>
            <Nav className="nav-tabs space15" activeKey="1">
              <NavItem eventKey="1" disabled>By Customer</NavItem>
              <NavItem eventKey="2" onClick={this.switchView}>By Broadcast</NavItem>
            </Nav>
          </EDTabs>
        } button={<Timeframe onChange={this.setDates} initialStart={this.state.start} initialEnd={this.state.end} />} />
        <LoaderPanel isLoading={this.props.isLoading}>
          <EDTableSection>
            {
              this.state.data !== null &&
                <div className="text-right space20">
                  <SearchControl onChange={this.searchChanged} value={this.state.search} />
                  <Button style={{marginLeft: '10px'}} disabled={this.state.reloading} onClick={this.refresh}><Glyphicon className={this.state.reloading?'spinning':''} glyph="refresh"/></Button>
                </div>
            }
            {
              this.state.data !== null &&
                (this.state.data.length ?
                  <ReactTable
                    className="space-top-sm"
                    data={data}
                    columns={columns}
                    minRows={0}
                    sorted={this.state.sorted}
                    page={this.state.page}
                    pageSize={this.state.pageSize}
                    onPageChange={this.onPageChange}
                    onPageSizeChange={this.onPageSizeChange}
                    onSortedChange={this.onSortedChange}
                  />
                  :
                  <div className="text-center space-top-sm">
                    <h4>No customer broadcast data found!</h4>
                  </div>)
            }
            <div className="space30"/>
          </EDTableSection>
        </LoaderPanel>
      </MenuNavbar>
    );
  }
}

export default withLoadSave({
  extend: CustBCs,
  initial: [],
  get: async () => [],
  extra: {
    customers: async () => (await axios.get('/api/companies')).data,
  }
});
