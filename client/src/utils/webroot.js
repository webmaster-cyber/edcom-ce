export function getHost(props) {
  let hostname = window.location.hostname;
  if (props.user && props.user.webroot) {
    try {
      hostname = new URL(props.user.webroot).hostname;
    } catch (e) {
      console.log(e);
    }
  }
  return hostname;
}

export function getWebroot(props) {
  let url = window.location.origin;
  if (props.user && props.user.webroot) {
    try {
      const webroot = new URL(props.user.webroot);
      url = webroot.origin;
    } catch (e) {
      console.log(e);
    }
  }

  return url;
}
