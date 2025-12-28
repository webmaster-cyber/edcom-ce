export default function(id, initialize, campType, htmltext, parts, bodyStyle) {
  return {
    funnel: id,
    initialize: initialize,
    type: campType,
    rawText: htmltext,
    preheader: '',
    parts: parts,
    bodyStyle: bodyStyle,
    subject: 'Click Here to Edit',
    supplists: [],
    supptags: [],
    suppsegs: [],
    openaddtags: [],
    openremtags: [],
    clickaddtags: [],
    clickremtags: [],
    sendaddtags: [],
    sendremtags: [],
    days: [true, true, true, true, true, true, true],
    dayoffset: -(new Date()).getTimezoneOffset(),
    who: 'all',
  };
}
