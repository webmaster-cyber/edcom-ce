import _ from "underscore";

const linkre = /(<\s*a\s+[^>]*href\s*=\s*")([^"]+)"[^>]*>/gi;

export const typedescs = {
  '': 'Normal',
  'notrack': 'External Unsubscribe',
  'unsublink': 'Unsubscribe',
  'unsub': 'Unsubscribe',
};

export function decode(url) {
  url = url.replace(/&lt;/ig, '<');
  url = url.replace(/&gt;/ig, '>');
  url = url.replace(/&quot;/ig, '"');
  url = url.replace(/&apos;/ig, "'");
  url = url.replace(/&amp;/ig, '&');
  return url;
}


export function getLinkType(url, addprefix) {
  var type = '';
  if (url === '{{!!unsublink}}') {
    type = 'unsub';
    url = '';
  } else {
    var m = /^\{\{!!unsublink\|([^}]+)\}\}$/.exec(url);
    if (m) {
      type = 'unsublink';
      url = m[1];
    } else {
      m = /^\{\{!!notrack\|([^}]+)\}\}$/.exec(url);
      if (m) {
        type = 'notrack';
        url = m[1];
      } else if (addprefix && url && !/^[a-zA-Z]+:/.test(url)) {
        url = 'http://' + url;
      }
    }
  }
  return {link: url, type: type};
}

export function getHTML(obj) {
  var html = '';
  if (!obj.type) {
    _.each(obj.parts, p => {
      if (p.type !== 'Invisible') {
        html += p.html + '\n';
      }
    });
  } else if (obj.type === 'beefree') {
    html = JSON.parse(obj.rawText).html;
  } else {
    html = obj.rawText;
  }
  return html;
}

function pct(c, total) {
  if (total === 0) {
    return '0';
  } else {
    return Math.round(((c * 1.0) / total) * 100);
  }
}

export function popupCSS() {
  return `
  <style>
  .fade {
    opacity: 0;
    -webkit-transition: opacity .15s linear;
         -o-transition: opacity .15s linear;
            transition: opacity .15s linear;
  }
  .fade.in {
    opacity: 1;
  }
  .popover {
    position: absolute;
    top: 0;
    left: 0;
    z-index: 1060;
    display: none;
    max-width: 276px;
    padding: 1px;
    font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
    font-size: 14px;
    font-style: normal;
    font-weight: normal;
    line-height: 1.42857143;
    text-align: left;
    text-align: start;
    text-decoration: none;
    text-shadow: none;
    text-transform: none;
    letter-spacing: normal;
    word-break: normal;
    word-spacing: normal;
    word-wrap: normal;
    white-space: normal;
    background-color: #fff;
    -webkit-background-clip: padding-box;
            background-clip: padding-box;
    border: 1px solid #ccc;
    border: 1px solid rgba(0, 0, 0, .2);
    border-radius: 6px;
    -webkit-box-shadow: 0 5px 10px rgba(0, 0, 0, .2);
            box-shadow: 0 5px 10px rgba(0, 0, 0, .2);
  
    line-break: auto;
  }
  .popover.top {
    margin-top: -10px;
  }
  .popover.right {
    margin-left: 10px;
  }
  .popover.bottom {
    margin-top: 10px;
  }
  .popover.left {
    margin-left: -10px;
  }
  .popover-title {
    padding: 8px 14px;
    margin: 0;
    font-size: 14px;
    background-color: #f7f7f7;
    border-bottom: 1px solid #ebebeb;
    border-radius: 5px 5px 0 0;
  }
  .popover-content {
    padding: 9px 14px;
  }
  .popover > .arrow,
  .popover > .arrow:after {
    position: absolute;
    display: block;
    width: 0;
    height: 0;
    border-color: transparent;
    border-style: solid;
  }
  .popover > .arrow {
    border-width: 11px;
  }
  .popover > .arrow:after {
    content: "";
    border-width: 10px;
  }
  .popover.top > .arrow {
    bottom: -11px;
    left: 50%;
    margin-left: -11px;
    border-top-color: #999;
    border-top-color: rgba(0, 0, 0, .25);
    border-bottom-width: 0;
  }
  .popover.top > .arrow:after {
    bottom: 1px;
    margin-left: -10px;
    content: " ";
    border-top-color: #fff;
    border-bottom-width: 0;
  }
  .popover.right > .arrow {
    top: 50%;
    left: -11px;
    margin-top: -11px;
    border-right-color: #999;
    border-right-color: rgba(0, 0, 0, .25);
    border-left-width: 0;
  }
  .popover.right > .arrow:after {
    bottom: -10px;
    left: 1px;
    content: " ";
    border-right-color: #fff;
    border-left-width: 0;
  }
  .popover.bottom > .arrow {
    top: -11px;
    left: 50%;
    margin-left: -11px;
    border-top-width: 0;
    border-bottom-color: #999;
    border-bottom-color: rgba(0, 0, 0, .25);
  }
  .popover.bottom > .arrow:after {
    top: 1px;
    margin-left: -10px;
    content: " ";
    border-top-width: 0;
    border-bottom-color: #fff;
  }
  .popover.left > .arrow {
    top: 50%;
    right: -11px;
    margin-top: -11px;
    border-right-width: 0;
    border-left-color: #999;
    border-left-color: rgba(0, 0, 0, .25);
  }
  .popover.left > .arrow:after {
    right: 1px;
    bottom: -10px;
    content: " ";
    border-right-width: 0;
    border-left-color: #fff;
  }
  .popover.black-popover {
    background-color: black;
    color: white;
    white-space: nowrap;
  }
  
  .popover.top.black-popover>.arrow:after {
    border-top-color: black;
  }
  </style>
  `;
}

export function insertPopups(obj) {
  var html = getHTML(obj);

  var linkclicks = obj.linkclicks;
  if (!linkclicks) {
    linkclicks = [];
  }

  getLinks(obj).forEach((v, i) => {
    if (linkclicks.length <= i) {
      linkclicks.push(0);
    }
  });

  var index = 0;

  var total = 0;
  _.each(obj.linkclicks, cnt => { total += cnt });

  html = html.replace(/<p /ig, '<div ');
  html = html.replace(/<p>/ig, '<div>');
  html = html.replace(/<\/p>/ig, '</div>');

  return html.replace(linkre, m => {
    var randpct = (Math.random() * 100).toFixed();
    var r = m + `
      <div style="position:relative">
        <div class="popover black-popover fade top in" id="popover-${index}" style="display: block; top: -44px; left: calc(${randpct}% - 28px)">
          <div class="arrow" style="left: 50%"></div>
          <div class="popover-content">
            ${pct(linkclicks[index], total)}% (${linkclicks[index].toLocaleString()})
          </div>
        </div>
      </div>
`
    index++;
    return r;
  });
}

export function getLinks(obj) {
  var html = getHTML(obj);

  var ret = [];

  var m = linkre.exec(html);
  while (m) {
    var link = m[2];

    ret.push(getLinkType(link, true));

    m = linkre.exec(html);
  }

  return ret;
}

export function routesHelp(routes) {
  if (routes && routes.length === 1 && routes[0].name.toLowerCase().trim() === 'drop all mail') {
    return 'Add additional postal routes to enable sending mail';
  }
  return undefined;
}

export function defaultBeefreeTemplate() {
  return {
    "html": "<!DOCTYPE html><html xmlns:v=\"urn:schemas-microsoft-com:vml\" xmlns:o=\"urn:schemas-microsoft-com:office:office\" lang=\"en\"><head><title></title><meta http-equiv=\"Content-Type\" content=\"text/html; charset=utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch><o:AllowPNG/></o:OfficeDocumentSettings></xml><![endif]--><style>\n*{box-sizing:border-box}body{margin:0;padding:0}a[x-apple-data-detectors]{color:inherit!important;text-decoration:inherit!important}#MessageViewBody a{color:inherit;text-decoration:none}p{line-height:inherit}.desktop_hide,.desktop_hide table{mso-hide:all;display:none;max-height:0;overflow:hidden}.image_block img+div{display:none} @media (max-width:520px){.mobile_hide{display:none}.row-content{width:100%!important}.stack .column{width:100%;display:block}.mobile_hide{min-height:0;max-height:0;max-width:0;overflow:hidden;font-size:0}.desktop_hide,.desktop_hide table{display:table!important;max-height:none!important}}\n</style></head><body style=\"background-color:#fff;margin:0;padding:0;-webkit-text-size-adjust:none;text-size-adjust:none\"><table class=\"nl-container\" width=\"100%\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\" role=\"presentation\" style=\"mso-table-lspace:0;mso-table-rspace:0;background-color:#fff\"><tbody><tr><td><table class=\"row row-1\" align=\"center\" width=\"100%\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\" role=\"presentation\" style=\"mso-table-lspace:0;mso-table-rspace:0\"><tbody><tr><td><table \nclass=\"row-content stack\" align=\"center\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\" role=\"presentation\" style=\"mso-table-lspace:0;mso-table-rspace:0;color:#000;width:500px;margin:0 auto\" width=\"500\"><tbody><tr><td class=\"column column-1\" width=\"100%\" \nstyle=\"mso-table-lspace:0;mso-table-rspace:0;font-weight:400;text-align:left;border-bottom:0 solid transparent;border-left:0 solid transparent;border-right:0 solid transparent;border-top:0 solid transparent;padding-bottom:5px;padding-top:5px;vertical-align:top\"><table class=\"empty_block block-1\" width=\"100%\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\" role=\"presentation\" style=\"mso-table-lspace:0;mso-table-rspace:0\"><tr><td class=\"pad\"><div></div></td></tr></table></td></tr></tbody></table></td>\n</tr></tbody></table><table class=\"row row-2\" align=\"center\" width=\"100%\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\" role=\"presentation\" style=\"mso-table-lspace:0;mso-table-rspace:0\"><tbody><tr><td><table class=\"row-content stack\" align=\"center\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\" role=\"presentation\" style=\"mso-table-lspace:0;mso-table-rspace:0;border-radius:0;color:#000;width:500px;margin:0 auto\" width=\"500\"><tbody><tr><td class=\"column column-1\" width=\"100%\" \nstyle=\"mso-table-lspace:0;mso-table-rspace:0;font-weight:400;text-align:left;padding-bottom:5px;padding-top:5px;vertical-align:top;border-top:0;border-right:0;border-bottom:0;border-left:0\"><table class=\"paragraph_block block-1\" width=\"100%\" border=\"0\" cellpadding=\"10\" cellspacing=\"0\" role=\"presentation\" style=\"mso-table-lspace:0;mso-table-rspace:0;word-break:break-word\"><tr><td class=\"pad\"><div \nstyle=\"color:#000;direction:ltr;font-family:Arial,Helvetica Neue,Helvetica,sans-serif;font-size:11px;font-weight:400;letter-spacing:0;line-height:120%;text-align:center;mso-line-height-alt:13.2px\"><p style=\"margin:0;margin-bottom:0\">Copyright 2024 Example, Inc.</p><p style=\"margin:0;margin-bottom:0\">123 Example St.</p><p style=\"margin:0;margin-bottom:0\">Example, EX, USA 12345</p><p style=\"margin:0;margin-bottom:0\">&nbsp;</p><p style=\"margin:0\">\nIf you no longer wish to receive these messages, you can <a href=\"{{!!unsublink}}\" target=\"_blank\" rel=\"noopener\" style=\"color: #0068a5;\">unsubscribe</a>.</p></div></td></tr></table></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table><!-- End --></body></html>",
    "json": {
      "page": {
        "body": {
          "content": {
            "style": {
              "color": "#000000",
              "font-family": "Arial, Helvetica Neue, Helvetica, sans-serif"
            },
            "computedStyle": {
              "linkColor": "#0068A5",
              "messageWidth": "500px",
              "messageBackgroundColor": "transparent"
            }
          },
          "webFonts": [],
          "container": {
            "style": {
              "background-color": "#FFFFFF"
            }
          }
        },
        "rows": [
          {
            "type": "one-column-empty",
            "uuid": "ad7259f4-d904-49f6-8af2-ee080aefd498",
            "empty": false,
            "locked": false,
            "synced": false,
            "columns": [
              {
                "uuid": "008816a2-cccd-4133-97c7-6dbec072faea",
                "style": {
                  "border-top": "0 solid transparent",
                  "border-left": "0 solid transparent",
                  "padding-top": "5px",
                  "border-right": "0 solid transparent",
                  "padding-left": "0px",
                  "border-bottom": "0 solid transparent",
                  "padding-right": "0px",
                  "padding-bottom": "5px",
                  "background-color": "transparent"
                },
                "modules": [],
                "grid-columns": 12
              }
            ],
            "content": {
              "style": {
                "color": "#000000",
                "width": "500px",
                "background-color": "transparent",
                "background-image": "none",
                "background-repeat": "no-repeat",
                "background-position": "top left"
              },
              "computedStyle": {
                "verticalAlign": "top",
                "hideContentOnMobile": false,
                "rowColStackOnMobile": true,
                "hideContentOnDesktop": false,
                "rowReverseColStackOnMobile": false
              }
            },
            "container": {
              "style": {
                "background-color": "transparent",
                "background-image": "none",
                "background-repeat": "no-repeat",
                "background-position": "top left"
              }
            }
          },
          {
            "name": "Sticky Footer",
            "type": "one-column-empty",
            "uuid": "47f9973c-d5f8-4a20-842f-a52f32152835",
            "empty": false,
            "locked": false,
            "synced": true,
            "columns": [
              {
                "uuid": "8d1bc639-e785-4653-bf58-2d8b23bf9b18",
                "style": {
                  "border-top": "0px solid transparent",
                  "border-left": "0px solid transparent",
                  "padding-top": "5px",
                  "border-right": "0px solid transparent",
                  "padding-left": "0px",
                  "border-bottom": "0px solid transparent",
                  "padding-right": "0px",
                  "padding-bottom": "5px",
                  "background-color": "transparent"
                },
                "modules": [
                  {
                    "type": "mailup-bee-newsletter-modules-paragraph",
                    "uuid": "ce3a16ae-a0c7-4803-86f2-546fbc9c4c61",
                    "align": "left",
                    "locked": false,
                    "descriptor": {
                      "style": {
                        "padding-top": "10px",
                        "padding-left": "10px",
                        "padding-right": "10px",
                        "padding-bottom": "10px"
                      },
                      "paragraph": {
                        "html": "<p>Copyright 2024 Example, Inc.</p>\n<p>123 Example St.</p>\n<p>Example, EX, USA 12345</p>\n<p>&nbsp;</p>\n<p>If you no longer wish to receive these messages, you can <code data-bee-type=\"speciallink\" data-bee-code=\"\"><a href=\"{{!!unsublink}}\" target=\"_blank\" rel=\"noopener\">unsubscribe</a></code>.</p>",
                        "style": {
                          "color": "#000000",
                          "direction": "ltr",
                          "font-size": "11px",
                          "text-align": "center",
                          "font-family": "inherit",
                          "font-weight": "400",
                          "line-height": "120%",
                          "letter-spacing": "0px"
                        },
                        "computedStyle": {
                          "linkColor": "#0068a5",
                          "paragraphSpacing": "0px"
                        }
                      },
                      "computedStyle": {
                        "hideContentOnAmp": false,
                        "hideContentOnHtml": false,
                        "hideContentOnMobile": false,
                        "hideContentOnDesktop": false
                      }
                    }
                  }
                ],
                "grid-columns": 12
              }
            ],
            "content": {
              "style": {
                "color": "#000000",
                "width": "500px",
                "border-top": "0px solid transparent",
                "border-left": "0px solid transparent",
                "border-right": "0px solid transparent",
                "border-bottom": "0px solid transparent",
                "border-radius": "0px",
                "background-color": "transparent",
                "background-image": "none",
                "background-repeat": "no-repeat",
                "background-position": "top left"
              },
              "computedStyle": {
                "verticalAlign": "top",
                "hideContentOnMobile": false,
                "rowColStackOnMobile": true,
                "hideContentOnDesktop": false,
                "rowReverseColStackOnMobile": false
              }
            },
            "metadata": {
              "name": "Sticky Footer",
              "type": "sticky-footer",
            },
            "container": {
              "style": {
                "background-color": "transparent",
                "background-image": "none",
                "background-repeat": "no-repeat",
                "background-position": "top left"
              }
            },
            "showInWidgetBar": true
          }
        ],
        "title": "",
        "template": {
          "version": "2.0.0"
        },
        "description": ""
      },
      "comments": {}
    }
  };
}
