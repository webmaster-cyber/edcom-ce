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

class TransactionalDomains extends Component {
  switchView = url => {
    var p = parse(this);
    delete(p.id);
    this.props.history.push(url + '&' + qs.stringify(p));
  }

  goBack = () => {
    var p = parse(this);
    delete(p.id);
    this.props.history.push('/transactional?' + qs.stringify(p));
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

  render() {
    var p = parse(this);
    var {start, end} = p;

    let columns = [{
      Header: 'Domain',
      accessor: 'domain',
      Cell: ({...props}) => <span className={props.original.txtcls}>{props.value}</span>,
    }, {
      Header: 'Delivered',
      accessor: 'send',
      Cell: ({...props}) => <span className={props.original.txtcls}>{props.value.toFixed(2) + '%'}</span>,
      className: 'text-right',
    }, {
      Header: 'Opens',
      accessor: 'open',
      Cell: ({...props}) => <span className={props.original.txtcls}>{props.value.toFixed(2) + '%'}</span>,
      className: 'text-right',
    }, {
      Header: 'CTR',
      accessor: 'ctr',
      Cell: ({...props}) => <span className={props.original.txtcls}>{props.value.toFixed(2) + '%'}</span>,
      className: 'text-right',
    }, {
      Header: 'Unsubs',
      accessor: 'unsub',
      Cell: ({...props}) => <span className={props.original.txtcls}>{props.value.toFixed(2) + '%'}</span>,
      className: 'text-right',
    }, {
      Header: 'Complaints',
      accessor: 'complaint',
      Cell: ({...props}) => <span className={props.original.txtcls}>{props.value.toFixed(2) + '%'}</span>,
      className: 'text-right',
    }, {
      Header: 'Soft Bounces',
      accessor: 'soft',
      Cell: ({...props}) => {
        if (!props.value) {
          return <span className={props.original.txtcls}>{props.value.toFixed(2) + '%'}</span>;
        } else {
          return <Link to={'/transactional/messages?type=soft&domain=' + props.original.domain + '&id=' + this.props.id + '&start=' + encodeURIComponent(start) + '&end=' + encodeURIComponent(end)}>{props.value.toFixed(2) + '%'}</Link>
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
          return <Link to={'/transactional/messages?type=hard&domain=' + props.original.domain + '&id=' + this.props.id + '&start=' + encodeURIComponent(start) + '&end=' + encodeURIComponent(end)}>{props.value.toFixed(2) + '%'}</Link>
        }
      },
      className: 'text-right',
    }];

    let data = _.map(this.props.data, s => {
      return {
        domain: s.domain,
        send: pct(s.send, s.count),
        ctr: pct(s.click, s.open),
        complaint: pct(s.complaint, s.send),
        unsub: pct(s.unsub, s.send),
        open: pct(s.open, s.send),
        soft: pct(s.soft, s.send+s.hard+s.soft),
        hard: pct(s.hard, s.send+s.hard+s.soft),
      };
    });
    
    return (
      <div>
        <SaveNavbar title={`Transactional Domain Delivery for ${this.props.id}`} onBack={this.goBack} hideSave={true} user={this.props.user}>
          <LoaderPanel isLoading={this.props.isLoading}>
            <TitlePage tabs={
              <EDTabs>
                <Nav className="nav-tabs" activeKey="3">
                  <NavItem eventKey="1" onClick={this.switchView.bind(null, '/transactional/tag?id=' + this.props.id)}>Summary</NavItem>
                  <NavItem eventKey="3" disabled>Domains</NavItem>
                </Nav>
              </EDTabs>
            }/>
            <EDTableSection>
            {
              this.props.data &&
                (this.props.data.length ?
                  <ReactTable
                    className="space30"
                    data={data}
                    columns={columns}
                    minRows={0}
                    defaultSorted={[
                      {id: 'domain'},
                    ]}
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
  extend: TransactionalDomains,
  get: async ({id, start, end}) => (await axios.get('/api/transactional/tag/' + id + '/domainstats?start=' + encodeURIComponent(start) + '&end=' + encodeURIComponent(end))).data,
});
