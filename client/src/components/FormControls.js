import React, { Component } from "react";
import { FormControl, HelpBlock, Checkbox } from "react-bootstrap";
import { EDFormGroup } from "./EDDOM";
import _ from "underscore";
import "./FormControls.css";

export function TimespanLabel({ id, obj, label, onChange, inline, space, groupStyle, labelStyle, help, ...props}) {
  return (
    <EDFormGroup space={space} style={groupStyle} inline={inline}>
      {label && <label style={labelStyle}>{label}</label>}
      {' '}
      <FormControl id={id} onChange={onChange} style={{width:'100px', display: 'inline'}} {...props} value={obj[id]} />
      {' '}
      <FormControl id={id + 'type'} style={{marginTop: '1px', display: 'inline', width: 'auto'}} componentClass="select" value={obj[id + 'type']} onChange={onChange}>
        <option value="secs">Seconds</option>
        <option value="mins">Minutes</option>
        <option value="hours">Hours</option>
      </FormControl>
      {help && <HelpBlock>{help}</HelpBlock>}
    </EDFormGroup>
  );
}

export function FormControlLabel({ id, inline, obj, label, help, width, style, groupStyle, labelStyle, space, roph, suffix, ...props }) {
  style = style || {};
  if (width)
    style.width = width + 'px';
  if (suffix)
    style.display = 'inline-block';
  groupStyle = groupStyle || {};
  if (roph) {
    return (
      <div>
        <label style={labelStyle}>{label}</label>
        <p className="read-only-ph" style={{display:suffix?'inline-block':undefined}}>{obj[id]}</p>
        { suffix && ' '}
        {
          suffix && <label>{suffix}</label>
        }
      </div>
    );
  }
  return (
    <EDFormGroup style={groupStyle} space={space} inline={inline}>
      {label && <label style={labelStyle}>{label}</label>}
      {' '}
      <FormControl id={id} style={style} {...props} value={obj[id]} />
      { suffix && ' '}
      {
        suffix && <label style={{display:'inline-block'}}>{suffix}</label>
      }
      {help && <HelpBlock>{help}</HelpBlock>}
    </EDFormGroup>
  );
}

export function CheckboxLabel({ id, obj, label, space, inline, className, help, ...props }) {
  return (
    <EDFormGroup space={space} inline={inline} className={className}>
      <Checkbox id={id} {...props} defaultChecked={obj[id]} value={obj[id]}> {label}</Checkbox>
      {help && <HelpBlock>{help}</HelpBlock>}
    </EDFormGroup>
  );
}

export class SelectLabel extends Component {
  constructor(props) {
    super(props);

    this.state = {
      filter: '',
    };
  }

  changeFilter = event => {
    this.setState({filter: event.target.value});
  }

  render() {
    var { id, obj, label, help, filter, options, groupStyle, labelStyle, emptyVal, space, inline, ...props } = this.props;

    if (emptyVal) {
      options = _.clone(options);
      options.unshift({id: '', name: emptyVal});
    }
    if (!groupStyle) {
      groupStyle = {};
    }
    const filterLower = this.state.filter.toLowerCase();
    return (
      <EDFormGroup style={groupStyle} space={space} inline={inline}>
        {label && <label style={labelStyle} className="control-label">{label}</label>}
        {' '}
        {(props.multiple && options) ?
          <div>
            {
             filter &&
               <FormControl type="text" placeholder="Filter" value={this.state.filter} onChange={this.changeFilter} />
            }
            <FormControl id={id} {...props} componentClass="select">
                 {
                   _.map(
                    _.filter(
                      options,
                      o => !filter || o.name.toLowerCase().indexOf(filterLower) !== -1
                    ),
                    o => <option key={o.id} value={o.id} selected={_.find(obj[id], v => v === o.id)}>{o.name}</option>)
                 }
            </FormControl>
          </div>
         :
          <FormControl id={id} {...props} componentClass="select" value={obj[id]}>
            {options ?
               _.map(options, o => <option key={o.id} value={o.id}>{o.name}</option>)
             : props.children}
          </FormControl>}
        {help && <HelpBlock>{help}</HelpBlock>}
      </EDFormGroup>
    );
  }
}
