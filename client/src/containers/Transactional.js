import React, { Component } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import _ from "underscore";
import moment from "moment";
import LoaderPanel from "../components/LoaderPanel";
import withLoadSave from "../components/LoadSave";
import MenuNavbar from "../components/MenuNavbar";
import TitlePage from "../components/TitlePage";
import { EDTableSection, EDTabs } from "../components/EDDOM";
import ReactTable from "react-table";
import { Button, Glyphicon, Nav, NavItem } from "react-bootstrap";
import Timeframe from "../components/Timeframe";
import parse from "../utils/parse";
import SearchControl from "../components/SearchControl";
import momentDurationFormatSetup from "moment-duration-format";
import { ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Line } from "recharts";
import dateformat from "../utils/date-format";

import "../../node_modules/react-table/react-table.css";

momentDurationFormatSetup(moment);

class Transactional extends Component {
  constructor(props) {
    super(props);

    var p = parse(this);

    var start = moment().add(1, 'hour').subtract(1, 'day').minutes(0).seconds(0);
    var end = moment().add(2, 'days').hour(0).minutes(0).seconds(0);
    var search = '';
    var page = 0;
    var pageSize = 20;
    var sorted = [
      {id: 'tag'},
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
      stats: null,
      reloading: false,
      search: search,
      start: start,
      end: end,
      page: page,
      pageSize: pageSize,
      sorted: sorted,
    };
  }

  switchView = url => {
    this.props.history.push(url);
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

  refresh = async () => {
    this.setState({reloading: true});
    try {
      await this.reload();
    } finally {
      this.setState({reloading: false});
    }
  }

  searchChanged = s => {
    this.setState({search: s}, () => this.refresh());
  }

  async reload() {
    var {start, end, search} = this.state;
    var p = [
      axios.get('/api/transactional/tags?start=' + dateformat(start) + '&end=' + dateformat(end) + '&search=' + encodeURIComponent(search)),
      axios.get('/api/transactional/stats?start=' + dateformat(start) + '&end=' + dateformat(end) + '&search=' + encodeURIComponent(search)),
    ];
    var res = await Promise.all(p);
    this.setState({data: res[0].data, stats: res[1].data});
  }

  setDates = (start, end) => {
    this.setState({start: start, end: end}, () => this.refresh());
  }

  render() {
    let columns = [{
      Header: 'Tag',
      headerClassName: 'text-left',
      accessor: 'tag',
      Cell: ({...props}) => {
      var {start, end} = this.state;
        return <Link to={'/transactional/tag?id=' + props.original.id + '&start=' + dateformat(start) + '&end=' + dateformat(end) + '&tablestate=' + this.tableState()}>{props.value}</Link>
      },
    }, {
      Header: 'Delivered',
      headerClassName: 'text-right',
      accessor: 'send',
      Cell: ({...props}) => {
          return props.value.toLocaleString();
      },
      className: 'text-right',
    }, {
      Header: 'Opens',
      headerClassName: 'text-right',
      accessor: 'open',
      Cell: ({...props}) => {
          return props.value.toLocaleString();
      },
      className: 'text-right',
    }, {
      Header: 'Clicks',
      headerClassName: 'text-right',
      accessor: 'click',
      Cell: ({...props}) => {
          return props.value.toLocaleString();
      },
      className: 'text-right',
    }, {
      Header: 'Unsubs',
      headerClassName: 'text-right',
      accessor: 'unsub',
      Cell: ({...props}) => {
          return props.value.toLocaleString();
      },
      className: 'text-right',
    }, {
      Header: 'Complaints',
      headerClassName: 'text-right',
      accessor: 'complaint',
      Cell: ({...props}) => {
          return props.value.toLocaleString();
      },
      className: 'text-right',
    }];

    let data = _.map(this.state.data, s => {
      return {
        id: s.tag,
        tag: s.tag,
        send: s.send,
        hard: s.hard,
        soft: s.soft,
        open: s.open,
        click: s.click,
        unsub: s.unsub,
        complaint: s.complaint,
      };
    });

    var [hasopens, hashard, hassoft] = [0,0,0];
    var stats = [];
    if (this.state.stats) {
      var len = moment(this.state.stats[0].ts).diff(this.state.stats[this.state.stats.length-1].ts);
      var df = 'ha';
      if (len > 48 * 60 * 60 * 1000) {
        df = 'M/D';
      }

      stats = _.map(this.state.stats, s => {
        let ts = moment(s.ts).local();

        if (s.open)
          hasopens = true;
        if (s.hard)
          hashard = true;
        if (s.soft)
          hassoft = true;
        return {
          dt: ts.format(df),
          Delivered: s.send,
          'Opens': s.open,
          'Hard Bounces': s.hard,
          'Soft Bounces': s.soft,
          ts: ts,
        };
      }).reverse();
    }

    return (
      <MenuNavbar {...this.props}>
        <TitlePage title="Transactional Dashboard" 
          tabs={
            <EDTabs>
              <Nav className="nav-tabs space15" activeKey="1">
                <NavItem eventKey="1" disabled>Dashboard</NavItem>
                <NavItem eventKey="2" onClick={this.switchView.bind(null, '/transactional/templates')}>Templates</NavItem>
                <NavItem eventKey="3" onClick={this.switchView.bind(null, '/transactional/log')}>Log</NavItem>
                <NavItem eventKey="4" onClick={this.switchView.bind(null, '/transactional/settings')}>Settings</NavItem>
              </Nav>
            </EDTabs>
          }
          button={<Timeframe initialStart={this.state.start} initialEnd={this.state.end} onChange={this.setDates} />} />
        <LoaderPanel isLoading={this.state.data === null}>
          <EDTableSection>
            {
              this.state.data !== null &&
                <div className="space20">
                  <div className="text-right">
                    <SearchControl onChange={this.searchChanged} value={this.state.search} />
                    <Button style={{marginLeft:'10px'}} disabled={this.state.reloading} onClick={this.refresh}><Glyphicon className={this.state.reloading?'spinning':''} glyph="refresh"/></Button>
                  </div>
                </div>
            }
            {
              this.state.stats !== null &&
                <div style={{background: '#fff', paddingTop: '30px', marginLeft: '-44px', paddingLeft: '44px', marginRight: '-44px', paddingRight: '44px'}}>
                  <ResponsiveContainer width="100%" minHeight={300}>
                    <LineChart height={300} data={stats}>
                      <XAxis dataKey="dt"/>
                      <YAxis yAxisId="left" allowDecimals={false} />
                      <YAxis yAxisId="right" orientation="right" hide={true} />
                      <Tooltip/>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <Line isAnimationActive={false} type="monotone" yAxisId="left" dataKey="Delivered" stroke="#71b82e"/>
                      { hashard &&
                          <Line isAnimationActive={false} type="monotone" yAxisId="left" dataKey="Hard Bounces" stroke="#845e5e"/>
                      }
                      { hassoft &&
                          <Line isAnimationActive={false} type="monotone" yAxisId="left" dataKey="Soft Bounces" stroke="#b8a52e"/>
                      }
                      { hasopens &&
                          <Line isAnimationActive={false} type="monotone" yAxisId="right" dataKey="Opens" stroke="#77cafd"/>
                      }
                    </LineChart>
                  </ResponsiveContainer>
                </div>
            }
            <div className="space30" />
            {
              this.state.data !== null &&
                (this.state.data.length ?
                  <ReactTable
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
                    <h4>No transactional messages found for the selected dates!</h4>
                  </div>)
            }
            {
              this.state.data !== null &&
                <div className="space30 text-center">
                  <h5>Learn how to send transactional messages via <Link to="/connect">SMTP Relay or API</Link>.</h5>
                </div>
            }
            <div className="space30" />
          </EDTableSection>
        </LoaderPanel>
      </MenuNavbar>
    );
  }
}

export default withLoadSave({
  extend: Transactional,
  initial: [],
  get: async () => [],
});
