import _ from "underscore";

export default (event) => {
  if (event.target.type === 'checkbox') {
    return event.target.checked;
  } else if (event.target.type === 'number') {
    var v;
    if (event.target.step && parseInt(event.target.step, 10) === 0)
      v = parseFloat(event.target.value);
    else
      v = parseInt(event.target.value, 10);
    if (_.isNaN(v))
      v = '';
    return v;
  } else if (event.target.type === 'select-multiple') {
    return _.pluck(_.filter(event.target.options, o => o.selected), 'value');
  } else if (event.target.type === 'file') {
    if (event.target.files.length === 0)
      return null;
    return event.target.files[0];
  } else {
    return event.target.value;
  }
}
