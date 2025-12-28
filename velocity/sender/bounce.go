package sender

import (
	"net/url"
	"regexp"
	"strings"
)

var softbouncestrs = []string{
	"quota",
	"overquota",
	"storage",
	"disk space",
	"mailbox size",
	"is full",
	"mailbox currently unavailable",
	"queue file write error",
	"insufficient disk space",
	"can't create data file",
	"mailbox full",
	"account is full",
	"out of disk space",
	"frozen mailbox",
	"user inbox over mail",
	"boite du destinataire pleine",
	"caixa postal cheia",
	"mailbox limit exeeded",
	"inbox full",
	"not enough space",
	"message store failed",
	"message size exceeds",
	"message too large",
	"server selected unsupported protocol version",
}

func isSoftBounce(msg string) bool {
	msg = strings.ToLower(msg)
	for _, str := range softbouncestrs {
		if strings.Contains(msg, str) {
			return true
		}
	}
	return false
}

var bouncere = []*regexp.Regexp{
	regexp.MustCompile(`\broute\b`),
	regexp.MustCompile(`\bunroutable\b`),
	regexp.MustCompile(`\bunrouteable\b`),
	regexp.MustCompile(`\brelay(ing)?`),
	regexp.MustCompile(`bad sequence`),
	regexp.MustCompile(`unable to resolve domain`),
	regexp.MustCompile(`syntax error`),
	regexp.MustCompile(`^[45]\.1\.2`),
	regexp.MustCompile(`^[45]\.3\.5`),
	regexp.MustCompile(`^[45]\.4\.4`),
	regexp.MustCompile(`^[45]\.4\.6`),
	regexp.MustCompile(`(user|mailbox|recipient|rcpt|local part|address|account|mail drop|ad(d?)ressee) (has|has been|is)? *(currently|temporarily +)?(disabled|expired|inactive|not activated)`),
	regexp.MustCompile(`(no such|bad|invalid|unknown|illegal|unavailable) (local+)?(user|mailbox|recipient|rcpt|local part|address|account|mail drop|ad(d?)ressee)`),
	regexp.MustCompile(`(user|mailbox|recipient|rcpt|local part|address|account|mail drop|ad(d?)ressee) +(\S+@\S+ +)?(not a +)?(valid|not known|not here|not found|does not exist|bad|invalid|unknown|illegal|unavailable)`),
	regexp.MustCompile(`\S+@\S+ +(is +)?(not a +)?(valid|not known|not here|not found|does not exist|bad|invalid|unknown|illegal|unavailable)`),
	regexp.MustCompile(`no mailbox here by that name`),
	regexp.MustCompile(`my badrcptto list`),
	regexp.MustCompile(`invalid e-mail address`),
	regexp.MustCompile(`not our customer`),
	regexp.MustCompile(`no longer (valid|available)`),
	regexp.MustCompile(`have a \S+ account`),
	regexp.MustCompile(`^[45]\.1\.1`),
}

var feedbackre *regexp.Regexp = regexp.MustCompile(`(?i)content-type:\s+message/feedback-report`)
var linkre *regexp.Regexp = regexp.MustCompile(`<([^>]+(?:/api/track|/public/click|/web/follow|/blog/update)\?[^>]*t=[dehiruv][^>]+)>`)
var link2re *regexp.Regexp = regexp.MustCompile(`(?i)list-unsubscribe:\s*<(https?://[^/]+/[^>]+)>`)

func checkComplaint(msgtxt []byte) {
	if feedbackre.Match(msgtxt) {
		trace.Printf(":MAIL:::Message is feedback report")

		var link string
		l := linkre.FindSubmatch(msgtxt)
		if l == nil {
			l2 := link2re.FindSubmatch(msgtxt)
			if l2 == nil {
				trace.Printf(":MAIL:::No link found")
				return
			} else {
				link = string(l2[1])
			}
		} else {
			link = string(l[1])
		}

		urlobj, err := url.Parse(link)
		if err != nil {
			trace.Printf(":MAIL:::Error parsing link '%s': %s", link, err)
			return
		}

		var q url.Values
		if urlobj.Path == "/" || urlobj.Path == "/api/track" || urlobj.Path == "/public/click" || urlobj.Path == "/web/follow" || urlobj.Path == "/blog/update" {
			q = urlobj.Query()
		} else {
			q = decryptParams(urlobj.Path)
			if q == nil {
				trace.Printf(":MAIL:::Invalid link")
				return
			}
		}

		c := q["c"]
		r := q["r"]
		u := q["u"]
		if c != nil && c[0] != "test" && u != nil {
			var sinkid, settingsid, ip string
			var ts int32
			if r != nil {
				sinkid, settingsid, ip, ts = mainSender.FindTrackingID(r[0])
				if settingsid == "" {
					trace.Printf(":MAIL:::Can't find values for tracking ID '%s'", r[0])
				} else if sinkid == mainSender.GetSinkID() {
					sinkid = ""
				}
			}
			eventChan <- Event{
				Type:       "complaint",
				UID:        string(u[0]),
				CampID:     string(c[0]),
				SettingsID: settingsid,
				SinkID:     sinkid,
				IP:         ip,
				Timestamp:  ts,
			}
		} else {
			trace.Printf(":MAIL:::Link '%s' is for a test mail or no UID found", link)
		}
	}
}

func isHardBounce(id, email, ip, msg, msglower string) bool {
	for _, r := range bouncere {
		if r.FindString(msglower) != "" {
			trace.Printf("%s:TRACE:%s:%s:Message '%s' matched '%s'", id, email, ip, msg, r)
			return true
		}
	}

	return false
}
