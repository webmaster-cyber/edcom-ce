import React, { Component } from "react";
import _ from "underscore";
import update from 'immutability-helper';
import { EDFormGroup } from "./EDDOM";
import { HelpBlock } from "react-bootstrap";

import ReactDataSheet from './DataSheet/lib';

import "./DataSheet/lib/react-datasheet.css";

export default class EDDataSheet extends Component {
  constructor(props) {
    super(props);

    this.state = {
      grid: this.createGrid(props),
    };
  }

  componentWillReceiveProps(props) {
    this.setState({grid: this.createGrid(props)});
  }

  columns(props) {
    return props.columns || [{display:'', name:''}];
  }

  blankRow(props) {
    return _.map(this.columns(props), c => ({value: ''}));
  }

  blankObj(props) {
    var r = {};
    _.map(this.columns(props), c => {
      r[c.name] = '';
    });
    return r;
  }

  columnRow(props) {
    return _.map(this.columns(props), (c, i) => ({readOnly: true, value: c.display, width: props.widths[i]}));
  }

  createGrid(props) {
    var g = [this.columnRow(props), ..._.map(props.obj && props.obj[props.id]?props.obj[props.id]:[this.blankObj(props)],
                                      r => _.map(this.columns(props), c => ({value: r[c.name]})))];
    this.fixLength(g, props);
    return g;
  }

  fixLength(g, props) {
    while (g.length < 7) {
      g.push(this.blankRow(props));
    }
    if (g[g.length-1][0].value) {
      g.push(this.blankRow(props));
    }
  }

  onChange = (changes, addn) => {
    var grid = this.state.grid;

    _.each(changes, ({cell, row, col, value}) => {
      grid = update(grid, {[row]: {[col]: {value: {$set: value}}}});
    });

    _.each(addn, ({row, col, value}) => {
      if (col >= (this.props.columns ? this.props.columns.length : 0)) {
        return;
      }
      var newrow;
      if (row >= grid.length) {
        newrow = this.blankRow(this.props);
        grid.push(newrow);
      } else {
        newrow = grid[row];
      }
      newrow[col].value = value;
    });

    this.fixLength(grid, this.props);

    this.setState({grid: grid});

    if (this.props.onChange) {
      var val = []; 
      _.map(grid, r => {
        var o = {};
        _.map(this.columns(this.props), (c, index) => o[c.name] = r[index].value);
        val.push(o);
      });

      val.splice(0, 1);

      var cut;
      for (cut = val.length - 1; cut >= 0; cut--) {
        var found = false;
        for (var prop in val[cut]) {
          if (val[cut][prop]) {
            found = true;
            break;
          }
        }
        if (found) {
          break;
        }
      }

      val.splice(cut+1, val.length-cut);

      this.props.onChange({
        target: {
          id: this.props.id,
          value: val,
        }
      });
    }
  }

  valueRenderer = (cell, i, j) => {
    if (!cell.value && this.props.placeholders) {
      i--;

      if (i >= 0 && i < this.props.placeholders.length && j < this.props.placeholders[i].length) {
        return this.props.placeholders[i][j];
      }
    }
    return cell.value;
  }

  render() {
    var {groupStyle, space, inline, label, help} = this.props;

    return (
      <EDFormGroup style={groupStyle} space={space} inline={inline}>
        {label && <label>{label}</label>}
        <ReactDataSheet
          data={this.state.grid}
          valueRenderer={this.valueRenderer}
          dataRenderer={cell => cell.value}
          onCellsChanged={this.onChange}
        />
        {help && <HelpBlock>{help}</HelpBlock>}
      </EDFormGroup>
    );
  }
}
