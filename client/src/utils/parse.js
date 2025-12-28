import qs from "qs";

export default function parse(obj) {
  return qs.parse(obj.props.history.location.search, { ignoreQueryPrefix: true });
}
