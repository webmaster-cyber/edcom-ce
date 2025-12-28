function checkPart(p) {
  if (p.type === 'Responses') {
    if (p.action !== 'sent' && p.action !== 'notsent' && p.timetype === 'inpast' && p.timenum === '')
      return false;
    if ((p.action === 'opencnt' || p.action === 'clickcnt') && p.cntvalue === '')
      return false;
  } else if (p.type === 'Group') {
    for (var i = 0; i < p.parts.length; i++) {
      if (!checkPart(p.parts[i]))
        return false;
    }
  }
  return true;
}

export default function checkSegment(s) {
  if (s.parts.length === 0)
    return false;

  if (s.subsettype === 'percent' && s.subsetpct === '')
    return false;
  if (s.subsettype === 'count' && s.subsetnum === '')
    return false;

  for (var i = 0; i < s.parts.length; i++) {
    if (!checkPart(s.parts[i]))
      return false;
  }

  return true;
}
