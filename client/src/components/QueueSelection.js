import React, { Component } from "react";
import { Modal, Button, DropdownButton, MenuItem } from "react-bootstrap";
import update from "immutability-helper";
import getvalue from "../utils/getvalue";
import _ from "underscore";
import axios from "axios";
import notify from "../utils/notify";

export class QueueMenu extends Component {
  constructor(props) {
    super(props);

    this.state = {
      showModal: false,
    };
  }

  discardClick = () => {
    this.setState({showModal: true});
  }

  confirmClicked = yes => {
    this.setState({showModal: false});

    if (!yes) return;

    this.props.pauseAndDiscard(this.props.data);
  }

  render() {
    return (
      <div className="queue-dropdown">
        <DropdownButton title="Manage Queues" id="manage" disabled={this.props.menuDisabled() || this.props.isSaving} className="green">
          <MenuItem onClick={this.discardClick}
                    className="text-danger"
                    disabled={this.props.pauseAndDiscardDisabled(this.props.data)}>Pause and Discard Mail</MenuItem>
          <MenuItem onClick={this.props.pauseAndQueue.bind(null, this.props.data)}
                    className="text-warning"
                    disabled={this.props.pauseAndQueueDisabled(this.props.data)}>Pause and Queue Mail</MenuItem>
          <MenuItem onClick={this.props.resume.bind(null, this.props.data)}
                    disabled={this.props.resumeDisabled(this.props.data)}>Resume</MenuItem>
          <MenuItem onClick={this.props.forceStart.bind(null, this.props.data)}
                    disabled={this.props.forceStartDisabled(this.props.data)}>Bypass Deferral and Force Start</MenuItem>
        </DropdownButton>
        {
          this.state.showModal &&
            <Modal show={true}>
              <Modal.Header>
                <Modal.Title>Discard Confirmation</Modal.Title>
              </Modal.Header>
              <Modal.Body>
                <p>Are you sure you wish to discard all queued mail for this domain?</p>
              </Modal.Body>
              <Modal.Footer>
                <Button onClick={this.confirmClicked.bind(this, true)} bsStyle="primary">Yes</Button>
                <Button onClick={this.confirmClicked.bind(this, false)}>No</Button>
              </Modal.Footer>
            </Modal>
        }
      </div>
    );
  }
}

export default (ExtendedComponent) => {
  return class extends Component {
    constructor(props) {
      super(props);

      this.state = {
        selectAll: false,
        selected: {},
        isSaving: false,
      };
    }

    onHeaderCheckClick = e => {
      e.stopPropagation();
    }

    onHeaderCheckChange = (data, e) => {
      var val = getvalue(e);
      var p = {selectAll: val, selected: {}};
      if (val) {
        _.each(data, s => {
          p.selected[s.domaingroupid + ':' + s.ip + ':' + s.settingsid + ':' + s.sinkid] = true;
        });
      }
      this.setState(p);
    }

    onCheckChange = e => {
      var val = getvalue(e);
      var p = {};
      if (this.state.selectAll) {
        p.selectAll = false;
        val = false;
      }
      p.selected = update(this.state.selected, {[e.target.id]: {$set: val}});
      this.setState(p);
    }

    menuDisabled = () => {
      return !_.find(_.values(this.state.selected), s => s);
    }

    isSelected = s => {
      return this.state.selected[s.domaingroupid + ':' + s.ip + ':' + s.settingsid + ':' + s.sinkid] || false;
    }

    pause = async (data, discard) => {
      this.setState({isSaving: true});
      try {
        await axios.post('/api/ippauses', _.map(_.filter(data, this.isSelected), s => {
          return {
            discard: discard,
            domaingroupid: s.domaingroupid,
            ip: s.ip,
            settingsid: s.settingsid,
            sinkid: s.sinkid,
          };
        }));
      } finally {
        this.setState({isSaving: false});
      }

      var cnt = 0;
      this._setData(_.map(data, s => {
        if (!this.isSelected(s))
          return s;
        cnt++;
        return update(s, {ispaused: {$set: true}, discard: {$set: discard}});
      }));

      if (cnt === 1)
        notify.show("Mail queue paused", "success");
      else
        notify.show("Mail queues paused", "success");
    }

    pauseAndDiscard = data => {
      this.pause(data, true);
    }

    pauseAndDiscardDisabled = data => {
      return !_.find(data, s => {
        if (!this.isSelected(s))
          return false;
        return !s.ispaused || !s.discard;
      });
    }

    pauseAndQueue = data => {
      this.pause(data, false);
    }

    pauseAndQueueDisabled = data => {
      return !_.find(data, s => {
        if (!this.isSelected(s))
          return false;
        return !s.ispaused || s.discard;
      });
    }

    resume = async data => {
      this.setState({isSaving: true});
      try {
        await axios.post('/api/ippauses', _.map(_.filter(data, this.isSelected), s => {
          return {
            $delete: true,
            domaingroupid: s.domaingroupid,
            ip: s.ip,
            settingsid: s.settingsid,
            sinkid: s.sinkid,
          };
        }));
      } finally {
        this.setState({isSaving: false});
      }

      var cnt = 0;
      this._setData(_.map(data, s => {
        if (!this.isSelected(s))
          return s;
        cnt++;
        return update(s, {ispaused: {$set: false}, discard: {$set: null}});
      }));

      if (cnt === 1)
        notify.show("Mail queue resumed", "success");
      else
        notify.show("Mail queues resumed", "success");
    }

    resumeDisabled = data => {
      return !_.find(data, s => {
        if (!this.isSelected(s))
          return false;
        return s.ispaused;
      });
    }

    forceStart = async data => {
      this.setState({isSaving: true});
      try {
        await axios.post('/api/ippauses', _.map(_.filter(data, this.isSelected), s => {
          return {
            $forceStart: true,
            domaingroupid: s.domaingroupid,
            ip: s.ip,
            settingsid: s.settingsid,
            sinkid: s.sinkid,
          };
        }));
      } finally {
        this.setState({isSaving: false});
      }

      var cnt = 0;
      this._setData(_.map(data, s => {
        if (!this.isSelected(s))
          return s;
        cnt++;
        return update(s, {ispaused: {$set: false}, discard: {$set: null}});
      }));

      if (cnt === 1)
        notify.show("Mail queue started", "success");
      else
        notify.show("Mail queues started", "success");
    }

    forceStartDisabled = data => {
      return !_.find(data, s => {
        return this.isSelected(s);
      });
    }

    setDataCB = cb => {
      this._setData = cb;
    }

    render() {
      return <ExtendedComponent onHeaderCheckClick={this.onHeaderCheckClick} onHeaderCheckChange={this.onHeaderCheckChange}
              onCheckChange={this.onCheckChange} menuDisabled={this.menuDisabled} isSelected={this.isSelected}
              pauseAndDiscard={this.pauseAndDiscard} pauseAndDiscardDisabled={this.pauseAndDiscardDisabled}
              pauseAndQueue={this.pauseAndQueue} pauseAndQueueDisabled={this.pauseAndQueueDisabled}
              resume={this.resume} resumeDisabled={this.resumeDisabled}
              forceStart={this.forceStart} forceStartDisabled={this.forceStartDisabled}
              setDataCB={this.setDataCB}
              selectAll={this.state.selectAll} {...this.props} isSaving={this.state.isSaving}/>
    }
  }
}
