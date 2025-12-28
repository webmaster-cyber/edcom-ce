import React, { Component } from "react";
import axios from "axios";
import LoaderPanel from "../components/LoaderPanel";
import withLoadSave from "../components/LoadSave";
import MenuNavbar from "../components/MenuNavbar";
import TitlePage from "../components/TitlePage";
import { Timeline, TimelineEvent } from "react-event-timeline";
import _ from "underscore";
import moment from "moment";
import { EDTableSection } from "../components/EDDOM";

import "../../node_modules/react-table/react-table.css";

class AdminLog extends Component {
  linkClick = async (log, event) => {
    event.preventDefault();

    if (log.link_type === 'frontends') {
      this.props.history.push('/frontends/edit?id=' + log.link_id);
    } else if (log.link_type === 'routes') {
      this.props.history.push('/routes/edit?id=' + log.link_id);
    } else if (log.link_type === 'policies') {
      this.props.history.push('/policies/settings?id=' + log.link_id);
    } else if (log.link_type === 'domaingroups') {
      this.props.history.push('/domaingroups/edit?id=' + log.link_id);
    } else if (log.link_type === 'sinks') {
      this.props.history.push('/servers/edit?id=' + log.link_id);
    } else if (log.link_type === 'backends') {
      this.props.history.push('/backends/edit?id=' + log.link_id);
    } else if (log.link_type === 'companies') {
      this.props.history.push('/customers/edit?id=' + log.link_id);
    } else if (log.link_type === 'users') {
      var data = (await axios.get('/api/user/' + log.link_id)).data;
      this.props.history.push('/user?id=' + log.link_id + '&cid=' + data.cid);
    } else if (log.link_type === 'gallerytemplates') {
      this.props.history.push('/gallerytemplates/edit?id=' + log.link_id);
    }
  }

  render() {
    return (
      <MenuNavbar {...this.props} isAdmin={true}>
        <TitlePage title="Postmaster Activity Report" />
        <LoaderPanel isLoading={this.props.isLoading}>
          <EDTableSection>
            <Timeline>
            {
              _.map(_.sortBy(this.props.data, 'ts').reverse(), (l) => {
                  return (
                    <TimelineEvent
                      key={l.id}
                      createdAt={moment(l.ts).format('l LTS')}
                      title={l.user_name}
                      icon={<i className={'fa fa-' + l.icon}/>}
                    >
                      {l.pre_msg}
                      {
                        l.link_msg && 
                          <a href="#link" onClick={this.linkClick.bind(null, l)}>
                            {l.link_msg}
                          </a>
                      }
                      {l.post_msg}
                    </TimelineEvent>
                  );
                }
              )
            }
            </Timeline>
          </EDTableSection>
        </LoaderPanel>
      </MenuNavbar>
    );
  }
}

export default withLoadSave({
  extend: AdminLog,
  initial: [],
  get: async () => (await axios.get('/api/userlogs')).data,
});
