import React, { Component } from "react";
import { Button, Panel, FormControl, Glyphicon, DropdownButton, MenuItem } from "react-bootstrap";
import moment from "moment";
import { SortableContainer, SortableElement, SortableHandle } from "react-sortable-hoc";
import getvalue from "../utils/getvalue";
import { FormControlLabel, SelectLabel, CheckboxLabel } from "../components/FormControls";
import Datetime from "react-datetime";
import ConfirmButton from "../components/ConfirmButton";
import _ from "underscore";
import update from "immutability-helper";
import shortid from "shortid";
import Select2 from "react-select2-wrapper";
import fixTag from "../utils/fixtag";

import "react-select2-wrapper/css/select2.css";

import "../../node_modules/react-datetime/css/react-datetime.css";

import "./SegmentEditor.css";

var menuparts = [
  'Info',
  'Lists',
  'Responses',
  'Group',
];

var partprops = {
  Group: {
    icon: <i className="fa fa-object-group" />,
    color: 'danger',
    desc: 'Rule Group',
    menu: 'Rule Group',
  },
  Info: {
    icon: <i className="fa fa-users" />,
    color: 'info',
    desc: 'Contact Info Rule',
    menu: 'Contact Info',
  },
  Lists: {
    icon: <Glyphicon glyph="list"/>,
    color: 'success',
    desc: 'List Membership Rule',
    menu: 'List Membership',
  },
  Responses: {
    icon: <Glyphicon glyph="share"/>,
    color: 'warning',
    desc: 'Message Engagement Rule',
    menu: 'Message Engagement',
  }
};

function newRow(type, lists, segments, campaigns) {
  if (type === 'Info') {
    return {
      type: type,
      test: '',
      tag: '',
      prop: '',
      operator: 'contains',
      value: '',
      addedtype: 'inpast',
      addednum: 30,
      addedstart: moment().subtract(30, 'days').hours(0).minutes(0).seconds(0).format(),
      addedend: moment().hours(0).minutes(0).seconds(0).format(),
    };
  } else if (type === 'Lists') {
    return {
      type: type,
      operator: 'in',
      list: lists.length > 0 ? lists[0].id : '',
      segment: segments.length > 0 ? segments[0].id : '',
    };
  } else {
    return {
      type: type,
      action: 'opened',
      timetype: 'anytime',
      timenum: 30,
      timestart: moment().subtract(30, 'days').hours(0).minutes(0).seconds(0).format(),
      timeend: moment().hours(0).minutes(0).seconds(0).format(),
      broadcast: '',
      defaultbroadcast: campaigns.length > 0 ? campaigns[0].id : '',
      cntoperator: 'more',
      cntvalue: 1,
      fromtype: 'device',
      fromdevice: '1',
      fromos: '1',
      frombrowser: '1',
      fromcountry: 'United States',
      fromregion: '',
      fromzip: '',
      linkindex: -1,
      updatedts: null,
    };
  }
}

function newPart(type, level, lists, segments, campaigns) {
  if (type === 'Group') {
    return {
      operator: 'or',
      parts: [],
      level: level,
    };
  } else if (type === 'Info') {
    return {
      ...newRow(type, lists, segments, campaigns),
      addl: [],
    };
  } else if (type === 'Lists') {
    return {
      ...newRow(type, lists, segments, campaigns),
      addl: [],
    };
  } else {
    return {
      ...newRow(type, lists, segments, campaigns),
      addl: [],
    };
  }
}

const DragHandle = SortableHandle(() => {
  return <Button style={{
    cursor: 'pointer',
    marginRight: '3px',
  }}
  bsSize="xs"
  className="nopad"
  >
    <Glyphicon glyph="resize-vertical"/>
  </Button>
});

class GroupPartDisplay extends Component {
  onSortEnd = ({oldIndex, newIndex}) => {
    var tomove = this.props.part.parts[oldIndex];

    this.props.onChange({
      target: {
        id: 'parts',
        value: update(this.props.part.parts, { $splice: [[oldIndex, 1], [newIndex, 0, tomove]] })
      }
    });
  }

  removePart = index => {
    this.props.onChange({
      target: {
        id: 'parts',
        value: update(this.props.part.parts, { $splice: [[index, 1]] })
      }
    });
  }

  newRuleClick = type => {
    var newpart = {
      id: shortid.generate(),
      type: type,
      ...newPart(type, this.props.part.level + 1, this.props.lists, this.props.segments, this.props.campaigns),
    };
    this.props.onChange({
      target: {
        id: 'parts',
        value: update(this.props.part.parts, {$splice: [[this.props.part.parts.length, 0, newpart]]})
      }
    });
  }

  onPartChange = (index, event, cb) => {
    var val = getvalue(event);
    var newpart = update(this.props.part.parts[index], { [event.target.id]: { $set: val } });
    this.props.onChange({
      target: {
        id: 'parts',
        value: update(this.props.part.parts, {
          $splice: [[index, 1, newpart]]
        })
      }
    }, cb);
  }

  removeRow = (index, rowindex, event) => {
    event.preventDefault();

    var newpart = update(this.props.part.parts[index], { addl: { $splice: [[rowindex, 1]] } });
    this.props.onChange({
      target: {
        id: 'parts',
        value: update(this.props.part.parts, {
          $splice: [[index, 1, newpart]]
        })
      }
    });
  }

  addRow = (index, event, cb) => {
    event.preventDefault();

    var newrow;
    if (this.props.part.parts[index].addl && this.props.part.parts[index].addl.length) {
      newrow = _.clone(this.props.part.parts[index].addl[this.props.part.parts[index].addl.length-1]);
    } else {
      newrow = _.omit(_.clone(this.props.part.parts[index]), 'id', 'addl');
    }

    var newaddl = update(this.props.part.parts[index].addl || [], {$push: [newrow]});
    var newpart = update(this.props.part.parts[index], { addl: { $set: newaddl } });
    this.props.onChange({
      target: {
        id: 'parts',
        value: update(this.props.part.parts, {
          $splice: [[index, 1, newpart]]
        })
      }
    }, cb);
  }

  onRowChange = (index, rowindex, event, cb) => {
    var newpart = update(this.props.part.parts[index], {addl: { [rowindex]: { [event.target.id]: { $set: getvalue(event) } } } });
    this.props.onChange({
      target: {
        id: 'parts',
        value: update(this.props.part.parts, {
          $splice: [[index, 1, newpart]]
        })
      }
    }, cb);
  }

  render() {
    return (
      <div>
        <div className="form-inline">
          <label>Pass if</label>{' '}
          <FormControl componentClass="select" id="operator" value={this.props.part.operator} onChange={this.props.onChange}>
            <option value="and">all</option>
            <option value="or">any</option>
            <option value="nor">none</option>
          </FormControl>{' '}
          <label>of these rules pass:</label>
          <div style={{float: 'right'}}>
            <DropdownButton pullRight title="Add Rule" id="viewer-add" className="blue">
              {
                _.map(_.filter(_.filter(menuparts, p => p !== 'Lists' || !this.props.hideList), p => p !== 'Group' || this.props.part.level < 1), p => (
                  <MenuItem key={p} className={'text-' + partprops[p].color} onClick={this.newRuleClick.bind(null, p)}>
                    {partprops[p].icon}
                    {' '}
                    {partprops[p].menu}
                  </MenuItem>
                ))
              }
            </DropdownButton>
          </div>
        </div>
        <PartList onSortEnd={this.onSortEnd} useDragHandle={true}>
          <div style={{minHeight: '110px', marginTop: '6px', marginLeft:'60px'}} className="test-container">
            {
              !this.props.part.parts.length &&
                <div className="text-center" style={{marginTop: '20px'}}>
                  Use the "Add Rule" button to add rules to this group
                </div>
            }
            {
              _.map(this.props.part.parts, (p, index) => (
                <SortablePartDisplay key={p.id} index={index} part={p}
                                     lists={this.props.lists} segments={this.props.segments} campaigns={this.props.campaigns}
                                     fields={this.props.fields}
                                     {...partprops[p.type]}
                                     operator={this.props.part.operator}
                                     countries={this.props.countries}
                                     regions={this.props.regions}
                                     removePart={this.removePart.bind(null, index)}
                                     removeRow={this.removeRow.bind(null, index)}
                                     addRow={this.addRow.bind(null, index)}
                                     onRowChange={this.onRowChange.bind(null, index)}
                                     onChange={this.onPartChange.bind(null, index)} />
              ))
            }
          </div>
        </PartList>
      </div>
    );
  }
}

class InfoPartDisplay extends Component {
  timeChange = (p, v) => {
    this.props.onChange({
      target: {
        id: p,
        value: v.hours(0).minutes(0).seconds(0).format(),
      }
    });
  }

  timeRowChange = (p, i, v) => {
    this.props.onRowChange(i, {
      target: {
        id: p,
        value: v.hours(0).minutes(0).seconds(0).format(),
      }
    });
  }

  isStartValid = v => {
    return v.isBefore(moment(this.props.part.addedend)) || v.isSame(moment(this.props.part.addedend));
  }

  isEndValid = v => {
    return v.isAfter(moment(this.props.part.addedstart)) || v.isSame(moment(this.props.part.addedstart));
  }

  isRowStartValid = (i, v) => {
    return v.isBefore(moment(this.props.part.addl[i].addedend)) || v.isSame(moment(this.props.part.addl[i].addedend));
  }

  isRowEndValid = (i, v) => {
    return v.isAfter(moment(this.props.part.addl[i].addedstart)) || v.isSame(moment(this.props.part.addl[i].addedstart));
  }

  render() {
    var props = this.props;

    var fields = _.filter(props.fields, f => !f.startsWith('!'));

    var emailidx = _.findIndex(fields, f => f === 'Email');
    if (emailidx >= 0) {
      fields.splice(emailidx + 1, 0, 'Domain');
    }

    return (
      <div className="form-inline">
        <div>
          <label>Pass if contact</label>
          {' '}
          <SelectLabel
            id="test"
            inline
            obj={this.props.part}
            onChange={this.props.onChange}
          >
            <option value="">property</option>
            <option value="tag">has tag</option>
            <option value="notag">doesn&apos;t have tag</option>
            <option value="added">was added</option>
          </SelectLabel>
          {' '}
          {
            props.part.test === 'added' &&
            <SelectLabel inline id="addedtype" obj={props.part} onChange={props.onChange}>
              <option value="inpast">in past</option>
              <option value="between">between</option>
            </SelectLabel>
          }
          {' '}
          {
            props.part.test === 'added' && props.part.addedtype === 'inpast' &&
              <span><FormControlLabel inline id="addednum" obj={props.part} onChange={props.onChange}
                type="number" min="1" style={{width:'70px'}}/> days</span>
          }
          {
            props.part.test === 'added' && props.part.addedtype === 'between' &&
              <div className="form-inline" style={{display: 'inline-block', marginLeft: '4px', marginTop: '3px'}}>
                <Datetime value={moment(props.part.addedstart)} onChange={this.timeChange.bind(null, 'addedstart')} isValidDate={this.isStartValid} timeFormat={null} />
                <span> and </span>
                <Datetime value={moment(props.part.addedend)} onChange={this.timeChange.bind(null, 'addedend')} isValidDate={this.isEndValid} timeFormat={null} />
              </div>
          }
          {' '}
          { (this.props.part.test === 'tag' ||
             this.props.part.test === 'notag') &&
              <Select2
                id="tag"
                value={this.props.part.tag}
                onChange={this.props.onChange}
                data={this.props.tags}
                style={{width: '200px'}}
                options={{
                  tags: true,
                  placeholder: '',
                  createTag: function (params) {
                    const fixed = fixTag(params.term);
                    if (!fixed) {
                      return null;
                    }
                    return {
                      id: fixTag(params.term),
                      text: fixTag(params.term)
                    }
                  }
                }}
              />
          }
          { !this.props.part.test &&
              <Select2
                id="prop"
                value={this.props.part.prop}
                onChange={this.props.onChange}
                data={fields}
                style={{width: '200px'}}
                options={{
                  tags: true,
                  placeholder: '',
                }}
              />
          }
          { !this.props.part.test &&
            ' '
          }
          { !this.props.part.test &&
            <div style={{display:'inline-block'}}>
              <SelectLabel
                id="operator"
                inline
                obj={this.props.part}
                onChange={this.props.onChange}
              >
                <option value="contains">contains</option>
                <option value="notcontains">does not contain</option>
                <option value="equals">equals</option>
                <option value="notequals">does not equal</option>
                <option value="startswith">starts with</option>
                <option value="endswith">ends with</option>
              </SelectLabel>
              {' '}
              <FormControlLabel
                id="value"
                obj={this.props.part}
                onChange={this.props.onChange}
                style={{width:'250px'}}
                inline
              />
            </div>
          }
          {' '}
          <a href="#a" onClick={this.props.addRow} style={{fontSize:'20px', verticalAlign: 'middle', marginLeft: '10px'}}>
          +
          </a>
        </div>
        {
          _.map(this.props.part.addl, (r, i) => (
            <div key={i} style={{marginTop:'6px'}}>
              <label style={{width:'103px'}}>
                {this.props.operator === 'and'?
                'and'
                :
                'or'}
              </label>
              {' '}
              <SelectLabel
                id="test"
                inline
                obj={r}
                onChange={this.props.onRowChange.bind(null, i)}
              >
                <option value="">property</option>
                <option value="tag">has tag</option>
                <option value="notag">doesn&apos;t have tag</option>
                <option value="added">was added</option>
              </SelectLabel>
              {' '}
              {
                r.test === 'added' &&
                <SelectLabel inline id="addedtype" obj={r} onChange={props.onRowChange.bind(null, i)}>
                  <option value="inpast">in past</option>
                  <option value="between">between</option>
                </SelectLabel>
              }
              {' '}
              {
                r.test === 'added' && r.addedtype === 'inpast' &&
                  <span><FormControlLabel inline id="addednum" obj={r} onChange={props.onRowChange.bind(null, i)}
                    type="number" min="1" style={{width:'70px'}}/> days</span>
              }
              {
                r.test === 'added' && r.addedtype === 'between' &&
                  <div className="form-inline" style={{display: 'inline-block', marginLeft: '4px', marginTop: '3px'}}>
                    <Datetime value={moment(r.addedstart)} onChange={this.timeRowChange.bind(null, 'addedstart', i)} isValidDate={this.isRowStartValid} timeFormat={null} />
                    <span> and </span>
                    <Datetime value={moment(r.addedend)} onChange={this.timeRowChange.bind(null, 'addedend', i)} isValidDate={this.isRowEndValid} timeFormat={null} />
                  </div>
              }
              {' '}
              { (r.test === 'tag' || r.test === 'notag') &&
                  <Select2
                    id="tag"
                    value={r.tag}
                    onChange={this.props.onRowChange.bind(null, i)}
                    data={this.props.tags}
                    style={{width: '200px'}}
                    options={{
                      tags: true,
                      placeholder: '',
                      createTag: function (params) {
                        const fixed = fixTag(params.term);
                        if (!fixed) {
                          return null;
                        }
                        return {
                          id: fixTag(params.term),
                          text: fixTag(params.term)
                        }
                      }
                    }}
                  />
              }
              { !r.test &&
                  <Select2
                    id="prop"
                    value={r.prop}
                    onChange={this.props.onRowChange.bind(null, i)}
                    data={fields}
                    style={{width: '200px'}}
                    options={{
                      tags: true,
                      placeholder: '',
                    }}
                  />
              }
              { !r.test &&
                ' '
              }
              { !r.test &&
                <div style={{display:'inline-block'}}>
                  <SelectLabel
                    id="operator"
                    inline
                    obj={r}
                    onChange={this.props.onRowChange.bind(null, i)}
                  >
                    <option value="contains">contains</option>
                    <option value="notcontains">does not contain</option>
                    <option value="equals">equals</option>
                    <option value="notequals">does not equal</option>
                    <option value="startswith">starts with</option>
                    <option value="endswith">ends with</option>
                  </SelectLabel>
                  {' '}
                  <FormControlLabel
                    id="value"
                    obj={r}
                    onChange={this.props.onRowChange.bind(null, i)}
                    style={{width:'250px'}}
                    inline
                  />
                </div>
              }
              {' '}
              <a href="#r" onClick={this.props.removeRow.bind(null, i)} style={{fontSize:'20px', verticalAlign: 'middle', marginLeft: '10px'}}>
              -
              </a>
            </div>
          ))
        }
      </div>
    );
  }
}

class ListsPartDisplay extends Component {
  render() {
    return (
      <div>
        <div className="form-inline">
          <SelectLabel inline id="operator" obj={this.props.part} label="Pass if contact is" onChange={this.props.onChange}>
            <option value="in">in list</option>
            <option value="notin">not in list</option>
            <option value="insegment">in segment</option>
            <option value="notinsegment">not in segment</option>
          </SelectLabel>
          {' '}
          {
            (this.props.part.operator === 'in' || this.props.part.operator === 'notin') &&
              <Select2
                id="list"
                value={this.props.part.list}
                onChange={this.props.onChange}
                data={this.props.lists}
                style={{width: '200px'}}
              />
          }
          {
            (this.props.part.operator !== 'in' && this.props.part.operator !== 'notin') &&
              <Select2
                id="segment"
                value={this.props.part.segment}
                onChange={this.props.onChange}
                data={this.props.segments}
                style={{width: '200px'}}
              />
          }
          <a href="#a" onClick={this.props.addRow} style={{fontSize:'20px', verticalAlign: 'middle', marginLeft: '10px'}}>
          +
          </a>
        </div>
        {
          _.map(this.props.part.addl, (r, i) => (
            <div key={i} className="form-inline" style={{marginTop: '4px'}}>
              <SelectLabel inline id="operator" obj={r} label={
                  this.props.operator === 'and'?
                  'and'
                  :
                  'or'}
                onChange={this.props.onRowChange.bind(null, i)}>
                <option value="in">in list</option>
                <option value="notin">not in list</option>
                <option value="insegment">in segment</option>
                <option value="notinsegment">not in segment</option>
              </SelectLabel>
              {' '}
              {
                (r.operator === 'in' || r.operator === 'notin') &&
                  <Select2
                    id="list"
                    value={r.list}
                    onChange={this.props.onRowChange.bind(null, i)}
                    data={this.props.lists}
                    style={{width: '200px'}}
                  />
              }
              {
                (r.operator !== 'in' && r.operator !== 'notin') &&
                  <Select2
                    id="segment"
                    value={r.segment}
                    onChange={this.props.onRowChange.bind(null, i)}
                    data={this.props.segments}
                    style={{width: '200px'}}
                  />
              }
              <a href="#r" onClick={this.props.removeRow.bind(null, i)} style={{fontSize:'20px', verticalAlign: 'middle', marginLeft: '10px'}}>
              -
              </a>
            </div>
          ))
        }
      </div>
    );
  }
}

class ResponsesPartDisplay extends Component {
  timeChange = (p, v) => {
    this.props.onChange({
      target: {
        id: p,
        value: v.hours(0).minutes(0).seconds(0).format(),
      }
    });
  }

  timeRowChange = (p, i, v) => {
    this.props.onRowChange(i, {
      target: {
        id: p,
        value: v.hours(0).minutes(0).seconds(0).format(),
      }
    });
  }

  isStartValid = v => {
    return v.isBefore(moment(this.props.part.timeend)) || v.isSame(moment(this.props.part.timeend));
  }

  isEndValid = v => {
    return v.isAfter(moment(this.props.part.timestart)) || v.isSame(moment(this.props.part.timestart));
  }

  isRowStartValid = (i, v) => {
    return v.isBefore(moment(this.props.part.addl[i].timeend)) || v.isSame(moment(this.props.part.addl[i].timeend));
  }

  isRowEndValid = (i, v) => {
    return v.isAfter(moment(this.props.part.addl[i].timestart)) || v.isSame(moment(this.props.part.addl[i].timestart));
  }

  withDefaultCampaign() {
    if ((this.props.part.action === 'sent' || this.props.part.action === 'notsent') && !this.props.part.broadcast) {
      var r = _.clone(this.props.part);
      r.broadcast = r.defaultbroadcast;
      return r;
    } else {
      return this.props.part;
    }
  }

  linkValue = () => {
    if (!this.props.part || _.isUndefined(this.props.part.linkindex)) {
      return {link: '-1'};
    }
    if (this.props.part.linkindex !== -1) {
      var c = _.find(this.props.campaigns, c => c.id === this.props.part.broadcast);
      if (c && this.updated(c) !== this.props.part.updatedts) {
        return {link: '-2'};
      }
    }
    return {link: this.props.part.linkindex.toString()};
  }

  updated = c => {
    if (c.is_bc) {
      return c.updated_at;
    } else {
      return c.modified;
    }
  }

  linkChanged = e => {
    var updatedts = null;
    var c = _.find(this.props.campaigns, c => c.id === this.props.part.broadcast);
    if (c) {
      updatedts = this.updated(c);
    }
    this.props.onChange({
      target: {
        id: 'linkindex',
        value: parseInt(e.target.value, 10),
      }
    }, () => {
      this.props.onChange({
        target: {
          id: 'updatedts',
          value: updatedts,
        }
      });
    });
  }

  linkData = () => {
    var any = [{id: '-1', name: 'Any Link'}];
    var c = _.find(this.props.campaigns, c => c.id === this.props.part.broadcast);
    if (!c) {
      return any;
    }
    if (this.props.part.linkindex !== -1) {
      if (this.updated(c) !== this.props.part.updatedts) {
        any = [{id: '-2', name: '<outdated link>'}];
      }
    }
    return any.concat(_.map(c.linkurls, (url, index) => (
      {id: index.toString(), name: url}
    )));
  }

  linkValueRow = i => {
    if (!this.props.part.addl[i] || _.isUndefined(this.props.part.addl[i].linkindex)) {
      return {link: '-1'};
    }
    if (this.props.part.addl[i].linkindex !== -1) {
      var c = _.find(this.props.campaigns, c => c.id === this.props.part.addl[i].broadcast);
      if (c && this.updated(c) !== this.props.part.addl[i].updatedts) {
        return {link: '-2'};
      }
    }
    return {link: this.props.part.addl[i].linkindex.toString()};
  }

  linkChangedRow = (i, e) => {
    var updatedts = null;
    var c = _.find(this.props.campaigns, c => c.id === this.props.part.addl[i].broadcast);
    if (c) {
      updatedts = this.updated(c);
    }
    this.props.onRowChange(i, {
      target: {
        id: 'linkindex',
        value: parseInt(e.target.value, 10),
      }
    }, () => {
      this.props.onRowChange(i, {
        target: {
          id: 'updatedts',
          value: updatedts,
        }
      });
    });
  }

  linkDataRow = i => {
    var any = [{id: '-1', name: 'Any Link'}];
    var c = _.find(this.props.campaigns, c => c.id === this.props.part.addl[i].broadcast);
    if (!c) {
      return any;
    }
    if (this.props.part.addl[i].linkindex !== -1) {
      if (this.updated(c) !== this.props.part.addl[i].updatedts) {
        any = [{id: '-2', name: '<outdated link>'}];
      }
    }
    var r = any.concat(_.map(c.linkurls, (url, index) => (
      {id: index.toString(), name: url}
    )));
    return r;
  }

  bcChange = e => {
    this.props.onChange(e, () => {
      this.props.onChange({
        target: {
          id: 'linkindex',
          value: -1,
        }
      }, () => {
        this.props.onChange({
          target: {
            id: 'updatedts',
            value: null,
          }
        })
      });
    });
  }

  bcRowChange = (i, e) => {
    this.props.onRowChange(i, e, () => {
      this.props.onRowChange(i, {
        target: {
          id: 'linkindex',
          value: -1,
        }
      }, () => {
        this.props.onRowChange(i, {
          target: {
            id: 'updatedts',
            value: null,
          }
        })
      });
    });
  }

  render() {
    var props = this.props;

    var campaignswithany = _.map(this.props.campaigns, c => ({id: c.id, text: c.text}));
    campaignswithany.splice(0, 0, {id: '', text: 'any broadcast/funnel'});

    return (
      <div>
        <div>
          <div className="form-inline" style={{display: 'inline-block', marginTop: '3px'}}>
            <SelectLabel inline id="action" obj={props.part} label="Pass if contact" onChange={this.props.onChange}>
              <option value="opened">Opened</option>
              <option value="clicked">Clicked</option>
              <option value="openclicked">Opened or Clicked</option>
              <option value="notopened">Did Not Open</option>
              <option value="notclicked">Did Not Click</option>
              <option value="notopenclicked">Did Not Open or Click</option>
              <option value="opencnt">Open Count</option>
              <option value="clickcnt">Click Count</option>
              <option value="openclickcnt">Open/Click Count</option>
              <option value="sent">Received a Message</option>
              <option value="notsent">Did Not Receive a Message</option>
              <option value="from">Location or Device</option>
            </SelectLabel>
            {' '}
            {
              (props.part.action === 'opencnt' || props.part.action === 'clickcnt' || props.part.action === 'openclickcnt') &&
              <span>
                <SelectLabel inline id="cntoperator" obj={props.part} onChange={this.props.onChange}>
                  <option value="more">is more than</option>
                  <option value="equal">equals</option>
                  <option value="less">is less than</option>
                </SelectLabel>
                <span> </span>
                <FormControlLabel inline id="cntvalue" obj={props.part} onChange={props.onChange}
                  type="number" min="0" style={{width:'70px'}}/>
              </span>
            }
            {' '}
            {
              (props.part.action !== 'sent' && props.part.action !== 'notsent' && props.part.action !== 'from') &&
              <SelectLabel inline id="timetype" obj={props.part} onChange={props.onChange}>
                <option value="anytime">anytime</option>
                <option value="inpast">in past</option>
                <option value="between">between</option>
              </SelectLabel>
            }
            {' '}
            {
              (props.part.action !== 'sent' && props.part.action !== 'notsent' && props.part.action !== 'from') &&
              props.part.timetype === 'inpast' &&
                <span><FormControlLabel inline id="timenum" obj={props.part} onChange={props.onChange}
                  type="number" min="1" style={{width:'70px'}}/> days</span>
            }
            {' '}
            {
              props.part.action === 'from' &&
              'is'
            }
            {' '}
            {
              props.part.action === 'from' &&
                <SelectLabel inline id="fromtype" obj={props.part} onChange={props.onChange}>
                  <option value="device">Device Type</option>
                  <option value="os">OS</option>
                  <option value="browser">Browser</option>
                  <option value="country">Country</option>
                  <option value="region">State/Region</option>
                  <option value="zip">Zip Code</option>
                </SelectLabel>
            }
            {' '}
            {
              props.part.action === 'from' &&
              props.part.fromtype === 'device' &&
                <SelectLabel inline id="fromdevice" obj={props.part} onChange={props.onChange}>
                  <option value="1">Phone</option>
                  <option value="2">Tablet</option>
                  <option value="3">PC</option>
                </SelectLabel>
            }
            {' '}
            {
              props.part.action === 'from' &&
              props.part.fromtype === 'os' &&
                <SelectLabel inline id="fromos" obj={props.part} onChange={props.onChange}>
                  <option value="1">Windows</option>
                  <option value="2">iOS</option>
                  <option value="3">Android</option>
                  <option value="4">Mac</option>
                  <option value="5">Linux</option>
                </SelectLabel>
            }
            {' '}
            {
              props.part.action === 'from' &&
              props.part.fromtype === 'browser' &&
                <SelectLabel inline id="frombrowser" obj={props.part} onChange={props.onChange}>
                  <option value="1">Firefox</option>
                  <option value="2">Chromium</option>
                  <option value="3">Chrome</option>
                  <option value="4">Safari</option>
                  <option value="5">Opera</option>
                  <option value="6">MSIE</option>
                  <option value="7">Robot</option>
                  <option value="8">Outlook</option>
                  <option value="9">Thunderbird</option>
                </SelectLabel>
            }
            {' '}
            {
              props.part.action === 'from' &&
              (props.part.fromtype === 'country' || props.part.fromtype === 'region') &&
                <Select2
                  id="fromcountry"
                  value={props.part.fromcountry}
                  onChange={props.onChange}
                  data={props.countries}
                  style={{width: '200px'}}
                />
            }
            {' '}
            {
              props.part.action === 'from' &&
              props.part.fromtype === 'region' &&
                <Select2
                  id="fromregion"
                  value={props.part.fromregion}
                  onChange={props.onChange}
                  data={props.regions[props.part.fromcountry]}
                  style={{width: '200px'}}
                />
            }
            {' '}
            {
              props.part.action === 'from' &&
              props.part.fromtype === 'zip' &&
                <FormControlLabel
                  inline
                  id="fromzip"
                  obj={props.part}
                  onChange={props.onChange}
                  style={{width:'90px'}}
                /> 
            }
          </div>
          {
            (props.part.action !== 'sent' && props.part.action !== 'notsent' && props.part.action !== 'from') &&
            props.part.timetype === 'between' &&
              <div className="form-inline" style={{display: 'inline-block', marginLeft: '4px', marginTop: '3px'}}>
                <Datetime value={moment(props.part.timestart)} onChange={this.timeChange.bind(null, 'timestart')} isValidDate={this.isStartValid} timeFormat={null} />
                <span> and </span>
                <Datetime value={moment(props.part.timeend)} onChange={this.timeChange.bind(null, 'timeend')} isValidDate={this.isEndValid} timeFormat={null} />
              </div>
          }
          {
            (props.part.action !== 'opencnt' && props.part.action !== 'clickcnt' && props.part.action !== 'openclickcnt' && props.part.action !== 'from') &&
              <div className="form-inline" style={{display: 'inline-block', marginLeft: '4px', marginTop: '3px'}}>
                <label>from</label>
                {' '}
                <Select2
                  id="broadcast"
                  value={
                    props.part.action === 'sent' || props.part.action === 'notsent' ?
                      this.props.part.broadcast || this.props.part.defaultbroadcast
                    :
                      this.props.part.broadcast
                  }
                  onChange={this.bcChange}
                  data={
                    props.part.action === 'sent' || props.part.action === 'notsent' ?
                      _.map(this.props.campaigns, c => ({id: c.id, text: c.text}))
                    :
                      campaignswithany
                  }
                  style={{
                    maxWidth: '500px',
                    minWidth: '200px',
                  }}
                  options={{
                    dropdownAutoWidth: true,
                  }}
                />
              </div>
          }
          {
            (props.part.action === 'clicked' || props.part.action === 'openclicked') && props.part.broadcast &&
              <div className="form-inline" style={{display: 'inline-block', marginLeft: '4px', marginTop: '3px'}}>
                <label>on</label>
                {' '}
                <SelectLabel
                  inline
                  id="link"
                  obj={this.linkValue()}
                  onChange={this.linkChanged}
                  options={this.linkData()}
                  style={{maxWidth: '200px'}}
                />
              </div>
          }
          <a href="#a" onClick={this.props.addRow} style={{fontSize:'20px', verticalAlign: 'middle', marginLeft: '10px'}}>
          +
          </a>
        </div>
        {
          _.map(this.props.part.addl, (r, i) => (
            <div key={i}>
              <div className="form-inline" style={{display: 'inline-block', marginTop: '3px'}}>
                <SelectLabel inline id="action" obj={r} label={
                  this.props.operator === 'and'?
                  'and'
                  :
                  'or'}
                   onChange={this.props.onRowChange.bind(null, i)}>
                  <option value="opened">Opened</option>
                  <option value="clicked">Clicked</option>
                  <option value="openclicked">Opened or Clicked</option>
                  <option value="notopened">Did Not Open</option>
                  <option value="notclicked">Did Not Click</option>
                  <option value="notopenclicked">Did Not Open or Click</option>
                  <option value="opencnt">Open Count</option>
                  <option value="clickcnt">Click Count</option>
                  <option value="openclickcnt">Open/Click Count</option>
                  <option value="sent">Received a Message</option>
                  <option value="notsent">Did Not Receive a Message</option>
                  <option value="from">Location or Device</option>
                </SelectLabel>
                {' '}
                {
                  (r.action === 'opencnt' || r.action === 'clickcnt' || r.action === 'openclickcnt') &&
                  <span>
                    <SelectLabel inline id="cntoperator" obj={r} onChange={this.props.onRowChange.bind(null, i)}>
                      <option value="more">is more than</option>
                      <option value="equal">equals</option>
                      <option value="less">is less than</option>
                    </SelectLabel>
                    <span> </span>
                    <FormControlLabel inline id="cntvalue" obj={r} onChange={props.onRowChange.bind(null, i)}
                      type="number" min="0" style={{width:'70px'}}/>
                  </span>
                }
                {' '}
                {
                  (r.action !== 'sent' && r.action !== 'notsent' && r.action !== 'from') &&
                  <SelectLabel inline id="timetype" obj={r} onChange={props.onRowChange.bind(null, i)}>
                    <option value="anytime">anytime</option>
                    <option value="inpast">in past</option>
                    <option value="between">between</option>
                  </SelectLabel>
                }
                {' '}
                {
                  (r.action !== 'sent' && r.action !== 'notsent' && r.action !== 'from') &&
                  r.timetype === 'inpast' &&
                    <span><FormControlLabel inline id="timenum" obj={r} onChange={props.onRowChange.bind(null, i)}
                      type="number" min="1" style={{width:'70px'}}/> days</span>
                }
                {' '}
                {
                  r.action === 'from' &&
                  'is'
                }
                {' '}
                {
                  r.action === 'from' &&
                    <SelectLabel inline id="fromtype" obj={r} onChange={props.onRowChange.bind(null, i)}>
                      <option value="device">Device Type</option>
                      <option value="os">OS</option>
                      <option value="browser">Browser</option>
                      <option value="country">Country</option>
                      <option value="region">State/Region</option>
                      <option value="zip">Zip Code</option>
                    </SelectLabel>
                }
                {' '}
                {
                  r.action === 'from' &&
                  r.fromtype === 'device' &&
                    <SelectLabel inline id="fromdevice" obj={r} onChange={props.onRowChange.bind(null, i)}>
                      <option value="1">Phone</option>
                      <option value="2">Tablet</option>
                      <option value="3">PC</option>
                    </SelectLabel>
                }
                {' '}
                {
                  r.action === 'from' &&
                  r.fromtype === 'os' &&
                    <SelectLabel inline id="fromos" obj={r} onChange={props.onRowChange.bind(null, i)}>
                      <option value="1">Windows</option>
                      <option value="2">iOS</option>
                      <option value="3">Android</option>
                      <option value="4">Mac</option>
                      <option value="5">Linux</option>
                    </SelectLabel>
                }
                {' '}
                {
                  r.action === 'from' &&
                  r.fromtype === 'browser' &&
                    <SelectLabel inline id="frombrowser" obj={r} onChange={props.onRowChange.bind(null, i)}>
                      <option value="1">Firefox</option>
                      <option value="2">Chromium</option>
                      <option value="3">Chrome</option>
                      <option value="4">Safari</option>
                      <option value="5">Opera</option>
                      <option value="6">MSIE</option>
                      <option value="7">Robot</option>
                      <option value="8">Outlook</option>
                      <option value="9">Thunderbird</option>
                    </SelectLabel>
                }
                {' '}
                {
                  r.action === 'from' &&
                  (r.fromtype === 'country' || r.fromtype === 'region') &&
                    <Select2
                      id="fromcountry"
                      value={r.fromcountry}
                      onChange={props.onRowChange.bind(null, i)}
                      data={props.countries}
                      style={{width: '200px'}}
                    />
                }
                {' '}
                {
                  r.action === 'from' &&
                  r.fromtype === 'region' &&
                    <Select2
                      id="fromregion"
                      value={r.fromregion}
                      onChange={props.onRowChange.bind(null, i)}
                      data={props.regions[r.fromcountry]}
                      style={{width: '200px'}}
                    />
                }
                {' '}
                {
                  r.action === 'from' &&
                  r.fromtype === 'zip' &&
                    <FormControlLabel
                      inline
                      id="fromzip"
                      obj={r}
                      onChange={props.onRowChange.bind(null, i)}
                      style={{width:'90px'}}
                    /> 
                }
              </div>
              {
                (r.action !== 'sent' && r.action !== 'notsent' && r.action !== 'from') &&
                r.timetype === 'between' &&
                  <div className="form-inline" style={{display: 'inline-block', marginLeft: '4px', marginTop: '3px'}}>
                    <Datetime value={moment(r.timestart)} onChange={this.timeRowChange.bind(null, 'timestart', i)} isValidDate={this.isRowStartValid.bind(null, i)} timeFormat={null} />
                    <span> and </span>
                    <Datetime value={moment(r.timeend)} onChange={this.timeRowChange.bind(null, 'timeend', i)} isValidDate={this.isRowEndValid.bind(null, i)} timeFormat={null} />
                  </div>
              }
              {
                (r.action !== 'opencnt' && r.action !== 'clickcnt' && r.action !== 'openclickcnt' && r.action !== 'from') &&
                  <div className="form-inline" style={{display: 'inline-block', marginLeft: '4px', marginTop: '3px'}}>
                    <label>from</label>
                    {' '}
                    <Select2
                      id="broadcast"
                      value={
                        r.action === 'sent' || r.action === 'notsent' ?
                          r.broadcast || r.defaultbroadcast
                        :
                          r.broadcast
                      }
                      onChange={this.bcRowChange.bind(null, i)}
                      data={
                        r.action === 'sent' || r.action === 'notsent' ?
                          this.props.campaigns
                        :
                          campaignswithany
                      }
                      style={{
                        maxWidth: '500px',
                        minWidth: '200px',
                      }}
                      options={{
                        dropdownAutoWidth: true,
                      }}
                    />
                  </div>
              }
              {
                (r.action === 'clicked' || r.action === 'openclicked') && r.broadcast &&
                  <div className="form-inline" style={{display: 'inline-block', marginLeft: '4px', marginTop: '3px'}}>
                    <label>on</label>
                    {' '}
                    <SelectLabel
                      inline
                      id="link"
                      obj={this.linkValueRow(i)}
                      onChange={this.linkChangedRow.bind(null, i)}
                      options={this.linkDataRow(i)}
                      style={{maxWidth: '200px'}}
                    />
                  </div>
              }
              <a href="#r" onClick={this.props.removeRow.bind(null, i)} style={{fontSize:'20px', verticalAlign: 'middle', marginLeft: '10px'}}>
              -
              </a>
            </div>

          ))
        }
      </div>
    );
  }
}

class PartDisplay extends Component {
  render() {
    const props = this.props;

    var partdisplay = {
      Group: <GroupPartDisplay {...props}/>,
      Info: <InfoPartDisplay {...props}/>,
      Lists: <ListsPartDisplay {...props}/>,
      Responses: <ResponsesPartDisplay {...props}/>,
    }[props.part.type];

    return (
      <Panel bsStyle={props.color} style={{marginBottom: '10px'}} className="test-panel">
        <Panel.Heading>
          <Panel.Title>
            {props.desc}
            <div className="pull-right">
              <DragHandle />
              <ConfirmButton
                bsSize="xs"
                className="nopad"
                title="Delete Confirmation"
                prompt="Are you sure you wish to delete this rule?"
                text={<Glyphicon glyph="trash" style={{marginRight:'0px'}}/>}
                onConfirm={this.props.removePart} />
            </div>
          </Panel.Title>
        </Panel.Heading>
        <Panel.Body>
          {partdisplay}
        </Panel.Body>
      </Panel>
    );
  }
}

const SortablePartDisplay = SortableElement(({...p}) => (
  <PartDisplay {...p}/>
));

const PartList = SortableContainer(({...p}) => {
  return p.children;
});

export default class SegmentEditor extends Component {
  onChange = event => {
    this.props.update({[event.target.id]: {$set: getvalue(event)}});
  }

  removePart = index => {
    this.props.update({
      parts: {
        $splice: [[index, 1]]
      }
    });
  }

  onPartChange = (index, event, cb) => {
    var val = getvalue(event);
    var newpart = update(this.props.data.parts[index], { [event.target.id]: { $set: val } });
    this.props.update({
      parts: {
        $splice: [[index, 1, newpart]]
      }
    }, cb);
  }

  newRuleClick = type => {
    this.props.update({parts: {$splice: [[this.props.data.parts.length, 0, {
      id: shortid.generate(),
      type: type,
      ...newPart(type, 0, this.props.lists, this.props.segments, this.props.campaigns),
    }]]}});
  }

  removeRow = (index, rowindex, event) => {
    event.preventDefault();

    this.props.update({
      parts: {
        [index]: {
          addl: {
            $splice: [[rowindex, 1]]
          }
        }
      }
    });
  }

  addRow = (index, event, cb) => {
    event.preventDefault();

    var newrow;
    if (this.props.data.parts[index].addl && this.props.data.parts[index].addl.length) {
      newrow = _.clone(this.props.data.parts[index].addl[this.props.data.parts[index].addl.length-1]);
    } else {
      newrow = _.omit(_.clone(this.props.data.parts[index]), 'id', 'addl');
    }

    var newaddl = update(this.props.data.parts[index].addl || [], {$push: [newrow]});
    this.props.update({
      parts: {
        [index]: {
          addl: {
            $set: newaddl
          }
        }
      }
    }, cb);
  }

  onRowChange = (index, rowindex, event, cb) => {
    this.props.update({
      parts: {
        [index]: {
          addl: {
            [rowindex]: {
              [event.target.id]: {
                $set: getvalue(event)
              }
            }
          }
        }
      }
    }, cb);
  }

  onSortEnd = ({oldIndex, newIndex}) => {
    var tomove = this.props.data.parts[oldIndex];

    this.props.update({parts: {$splice: [[oldIndex, 1], [newIndex, 0, tomove]]}});
  }

  render() {
    return (
      <div>
        <div className="form-inline">
          <label>{this.props.verb?this.props.verb:'Include contacts if'}</label>{' '}
          <FormControl componentClass="select" id="operator" value={this.props.data.operator} onChange={this.onChange}>
            <option value="and">all</option>
            <option value="or">any</option>
            <option value="nor">none</option>
          </FormControl>{' '}
          <label>of these rules pass:</label>
          <div style={{float: 'right'}}>
            <DropdownButton pullRight title="Add Rule" id="viewer-add" className={`${this.props.addRuleButtonClass || 'blue'}`}>
              {
                _.map(_.filter(menuparts, p => p !== 'Lists' || !this.props.hideList), (p) => (
                  <MenuItem key={p} className={'text-' + partprops[p].color} onClick={this.newRuleClick.bind(null, p)}>
                    {partprops[p].icon}
                    {' '}
                    {partprops[p].menu}
                  </MenuItem>
                ))
              }
            </DropdownButton>
          </div>
        </div>
        <div style={{marginTop: '6px', marginBottom: '30px'}}>
          <PartList onSortEnd={this.onSortEnd} useDragHandle={true}>
            <div style={{minHeight: '30px'}} className="test-container">
              {
                !this.props.data.parts.length &&
                  <div className="text-center" style={{marginTop: '20px'}}>
                    <h4>No rules yet!</h4>
                    To create a new rule, click "Add Rule" on the upper right.
                  </div>
              }
              {
                _.map(this.props.data.parts, (p, index) => (
                  <SortablePartDisplay key={p.id} index={index} part={p} {...partprops[p.type]}
                                       fields={this.props.fields}
                                       removePart={this.removePart.bind(null, index)}
                                       lists={this.props.lists} segments={this.props.segments}
                                       campaigns={this.props.campaigns} tags={this.props.tags}
                                       countries={this.props.countries}
                                       regions={this.props.regions}
                                       hideList={this.props.hideList}
                                       operator={this.props.data.operator}
                                       removeRow={this.removeRow.bind(null, index)}
                                       addRow={this.addRow.bind(null, index)}
                                       onRowChange={this.onRowChange.bind(null, index)}
                                       onChange={this.onPartChange.bind(null, index)} />
                ))
              }
            </div>
          </PartList>
        </div>
        { !this.props.hideList &&
        <div className="form-inline">
          <CheckboxLabel inline id="subset" obj={this.props.data} onChange={this.onChange} label=" Subset only:" />
          {' '}
          <SelectLabel inline id="subsettype" obj={this.props.data} onChange={this.onChange} disabled={!this.props.data.subset}>
            <option value="percent">percent</option>
            <option value="count">count</option>
          </SelectLabel>
          {' '}
          {
            this.props.data.subsettype === 'percent' &&
            <FormControlLabel
              id="subsetpct"
              inline
              obj={this.props.data}
              onChange={this.onChange}
              type="number"
              min="1"
              max="100"
              style={{width:"80px"}}
              disabled={!this.props.data.subset}
            />
          }
          {' '}
          {
            this.props.data.subsettype === 'count' &&
            <FormControlLabel
              id="subsetnum"
              inline
              obj={this.props.data}
              onChange={this.onChange}
              type="number"
              min="1"
              style={{width:"120px"}}
              disabled={!this.props.data.subset}
            />
          }
          {' '}
          <SelectLabel inline id="subsetsort" obj={this.props.data} onChange={this.onChange} disabled={!this.props.data.subset}>
            <option value="">randomize</option>
            <option value="newest">sort by newest</option>
            <option value="oldest">sort by oldest</option>
          </SelectLabel>
        </div>
        }
      </div>
    );
  }
}
