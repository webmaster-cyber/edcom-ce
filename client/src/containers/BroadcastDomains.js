import React, { Component } from "react";
import { Link } from "react-router-dom";
import { Nav, NavItem } from "react-bootstrap";
import withLoadSave from "../components/LoadSave";
import LoaderPanel from "../components/LoaderPanel";
import axios from "axios";
import SaveNavbar from "../components/SaveNavbar";
import { EDTabs, EDTableSection } from "../components/EDDOM";
import ReactTable from "react-table";
import TitlePage from "../components/TitlePage";
import _ from "underscore";
import parse from "../utils/parse";
import qs from "qs";

function pct(n, d) {
  if (!d || !n)
    return 0;
  return (n/d) * 100;
}

class BroadcastDomains extends Component {
  constructor(props) {
    super(props);

    var p = parse(this);

    var page = 0;
    var pageSize = 20;
    var sorted = [
      {id: 'count', desc: true},
    ];

    if (p.tablestate) {
      var ts = JSON.parse(p.tablestate);
      page = ts.page;
      pageSize = ts.pageSize;
      sorted = ts.sorted;
    }

    this.state = {
      page: page,
      pageSize: pageSize,
      sorted: sorted,
    };
  }

  parentParams = () => {
    var p = parse(this);
    delete(p.id);
    delete(p.tablestate);
    return qs.stringify(p);
  }

  returnTo = () => {
    return encodeURIComponent('/broadcasts/domains?id=' + this.props.id + '&' + this.parentParams() + '&' + this.tableState());
  }

  switchView = url => {
    this.props.history.push(url + '&' + this.parentParams());
  }

  goBack = () => {
    var p = parse(this);
    delete(p.id);
    delete(p.tablestate);
    this.props.history.push('/broadcasts?' + this.parentParams());
  }

  ignore = event => {
    event.preventDefault();
  }

  num(n) {
    if (!n) n = 0;
    return n.toLocaleString();
  }

  pct(l, n, prop) {
    if (!prop)
      prop = 'count'
    if (!l[prop] || !_.isNumber(l[prop]) || !n)
      return '0.0%'
    var v = (n/l[prop])*100;
    var r = Math.round(v)
    if (r < 10) {
      return v.toFixed(1) + '%';
    } else {
      return r + '%';
    }
  }

  tableState = () => {
    return 'tablestate=' + encodeURIComponent(JSON.stringify(_.pick(this.state, 'page', 'pageSize', 'sorted')));
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

  render() {
    let columns = [{
      Header: 'Domain',
      accessor: 'domain',
      Cell: ({...props}) => <span className={props.original.txtcls}>{props.value}</span>,
    }, {
      Header: 'Contacts',
      accessor: 'count',
      Cell: ({...props}) => <span className={props.original.txtcls}>{props.value.toLocaleString()}</span>,
      className: 'text-right',
    }, {
      Header: 'Delivered',
      accessor: 'send',
      Cell: ({...props}) => <span className={props.original.txtcls}>{props.value.toFixed(2) + '%'}</span>,
      className: 'text-right',
    }, {
      Header: 'Opens',
      accessor: 'open',
      Cell: ({...props}) => {
        if (!props.value) {
          return <span className={props.original.txtcls}>{props.value.toFixed(2) + '%'}</span>;
        } else {
          return <Link to={'/broadcasts/details?cmd=open&isbc=true&domain=' + props.original.domain + '&id=' + this.props.id + '&returnto=' + this.returnTo()}>{props.value.toFixed(2) + '%'}</Link>
        }
      },
      className: 'text-right',
    }, {
      Header: 'CTR',
      accessor: 'ctr',
      Cell: ({...props}) => {
        if (!props.value) {
          return <span className={props.original.txtcls}>{props.value.toFixed(2) + '%'}</span>;
        } else {
          return <Link to={'/broadcasts/details?cmd=click&isbc=true&domain=' + props.original.domain + '&id=' + this.props.id + '&returnto=' + this.returnTo()}>{props.value.toFixed(2) + '%'}</Link>
        }
      },
      className: 'text-right',
    }, {
      Header: 'Unsubs',
      accessor: 'unsub',
      Cell: ({...props}) => {
        if (!props.value) {
          return <span className={props.original.txtcls}>{props.value.toFixed(2) + '%'}</span>;
        } else {
          return <Link to={'/broadcasts/details?cmd=unsub&isbc=true&domain=' + props.original.domain + '&id=' + this.props.id + '&returnto=' + this.returnTo()}>{props.value.toFixed(2) + '%'}</Link>
        }
      },
      className: 'text-right',
    }, {
      Header: 'Complaints',
      accessor: 'complaint',
      Cell: ({...props}) => {
        if (!props.value) {
          return <span className={props.original.txtcls}>{props.value.toFixed(2) + '%'}</span>;
        } else {
          return <Link to={'/broadcasts/details?cmd=complaint&isbc=true&domain=' + props.original.domain + '&id=' + this.props.id + '&returnto=' + this.returnTo()}>{props.value.toFixed(2) + '%'}</Link>
        }
      },
      className: 'text-right',
    }, {
      Header: 'Soft Bounces',
      accessor: 'soft',
      Cell: ({...props}) => {
        if (!props.value) {
          return <span className={props.original.txtcls}>{props.value.toFixed(2) + '%'}</span>;
        } else {
          return <Link to={'/broadcasts/messages?type=soft&domain=' + props.original.domain + '&id=' + this.props.id + '&' + this.tableState() + '&' + this.parentParams()}>{props.value.toFixed(2) + '%'}</Link>
        }
      },
      className: 'text-right',
    }, {
      Header: 'Hard Bounces',
      accessor: 'hard',
      Cell: ({...props}) => {
        if (!props.value) {
          return <span className={props.original.txtcls}>{props.value.toFixed(2) + '%'}</span>;
        } else {
          return <Link to={'/broadcasts/messages?type=hard&domain=' + props.original.domain + '&id=' + this.props.id + '&' + this.tableState() + '&' + this.parentParams()}>{props.value.toFixed(2) + '%'}</Link>
        }
      },
      className: 'text-right',
    }];

    let data = _.map(this.props.stats, s => {
      return {
        domain: s.domain,
        count: s.count,
        send: pct(s.send, s.count),
        ctr: pct(s.click, s.open),
        complaint: pct(s.complaint, s.send),
        unsub: pct(s.unsub, s.send),
        open: pct(s.open, s.send),
        soft: pct(s.soft, s.send+s.hard+s.soft),
        hard: pct(s.hard, s.send+s.hard+s.soft),
        txtcls: s.overdomainbounce?'text-danger':s.overdomaincomplaint?'text-info':'',
      };
    });
    
    let dataName = this.props.data && (this.props.data.name || '')
    
    return (
      <div>
        <SaveNavbar title={`Broadcast Domain Delivery ${dataName ? `for "${dataName}"` : ''}`} onBack={this.goBack} hideSave={true} user={this.props.user}>
          <LoaderPanel isLoading={this.props.isLoading}>
            <TitlePage tabs={
              <EDTabs>
                <Nav className="nav-tabs" activeKey="3">
                  <NavItem eventKey="1" onClick={this.switchView.bind(null, '/broadcasts/summary?id=' + this.props.id)}>Summary</NavItem>
                  <NavItem eventKey="2" onClick={this.switchView.bind(null, '/broadcasts/heatmap?id=' + this.props.id)}>Heatmap</NavItem>
                  <NavItem eventKey="3" disabled>Domains</NavItem>
                  <NavItem eventKey="4" onClick={this.switchView.bind(null, '/broadcasts/summarysettings?id=' + this.props.id)}>Settings</NavItem>
                </Nav>
              </EDTabs>
            }/>
            <EDTableSection>
            {
              this.props.stats &&
                (this.props.stats.length ?
                  <ReactTable
                    className="space30"
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
                    <h4>No domain delivery data found!</h4>
                  </div>)
            }
            </EDTableSection>
          </LoaderPanel>
        </SaveNavbar>
      </div>
    );
  }
}

export default withLoadSave({
  initial: [],
  extend: BroadcastDomains,
  get: async ({id}) => (await axios.get('/api/broadcasts/' + id)).data,
  extra: {
    stats: async ({id}) => (await axios.get('/api/broadcasts/' + id + '/domainstats')).data,
  }
});
