import React, { Component } from "react";
import moment from "moment";
import DateRangePicker from "react-bootstrap-daterangepicker";

import "bootstrap-daterangepicker/daterangepicker.css";

export default class Timeframe extends Component {
  constructor(props) {
    super(props);

    this.state = {
      start: this.props.initialStart,
      end: this.props.initialEnd,
    };
  }

  onApply = (event, picker) => {
    this.setState({start: moment(picker.startDate).minutes(0).seconds(0), end: moment(picker.endDate).minutes(0).seconds(0)}, () => this.fireOnChange());
  }

  fireOnChange = () => {
    this.props.onChange(this.state.start, this.state.end);
  }

  ignore = () => {}

  fix(h) {
    if (h.startsWith("a "))
      return h.substring(2);
    else if (h.startsWith("an "))
      return h.substring(3);
    else
      return h;
  }

  render() {
    var end = moment().add(2, 'days').hour(0).minutes(0).seconds(0);
    return (
      <div>
          <DateRangePicker startDate={this.state.start} endDate={this.state.end} timePicker={true} onApply={this.onApply}
                           timePickerIncrement={60} timePickerSeconds={false}
                           maxDate={moment().add(2, 'days').hours(0).minutes(0).seconds(0)}
                           ranges={{
                             'Last Day': [moment().add(1, 'hour').subtract(1, 'days').minutes(0).seconds(0), end],
                             'Since Midnight': [moment().hours(0).minutes(0).seconds(0), end],
                             'Last Hour': [moment().subtract(1, 'hour').minutes(0).seconds(0), end],
                             'Last 7 Days': [moment().add(1, 'hour').subtract(7, 'days').minutes(0).seconds(0), end],
                           }}
                           locale={{format: 'l LT'}}>
            <div className="input-group">
              <input className="form-control" type="text" style={{width:'400px'}} onChange={this.ignore}
                     value={this.state.start.format("lll") + ' - ' + this.state.end.format("lll")}
              />
              <div className="input-group-addon">
                <i className="fa fa-calendar"/>
              </div>
            </div>
          </DateRangePicker>
      </div>
    );
  }
}
