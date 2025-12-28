package sender

import (
	"bytes"
	"crypto/rc4"
	"crypto/tls"
	"encoding/base64"
	"encoding/binary"
	"fmt"
	"hash/fnv"
	"html"
	"io"
	"math/rand"
	"mime/quotedprintable"
	"net"
	"net/mail"
	"net/smtp"
	"net/textproto"
	"net/url"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/mr-tron/base58/base58"
	"github.com/valyala/fasttemplate"
)

var defaultHeaders string = `From: {{!!from}}
Reply-To: {{!!replyto}}
To: {{!!to}}
Subject: {{!!subject}}
Date: {{!!date}}
MIME-Version: 1.0
Content-Type: text/html; charset="utf-8"
Content-Transfer-Encoding: quoted-printable
Message-ID: <{{!!msgid}}>
List-Unsubscribe: <{{!!webroot}}/l?t=unsub&r={{!!trackingid}}&c={{!!campid}}&u={{!!uid}}>
List-Unsubscribe-Post: List-Unsubscribe=One-Click

`

var CRNL = []byte("\r\n")

const randchars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890abcdefghijklmnopqrstuvwxyz"
const rand2chars = "abcdefghijklmnopqrstuvwxyz"
const keychars = "abcdefghijklmnopqrstuvwxyz0123456789"

var defaultHeaderTemplate *fasttemplate.Template = fasttemplate.New(nlre.ReplaceAllLiteralString(defaultHeaders, "\r\n"), "{{", "}}")

var encodingre = regexp.MustCompile(`(?mi)^\s*content-transfer-encoding\s*:\s*([^\s]+)`)

var gmailre = regexp.MustCompile(` [a-z0-9\-]+\.[0-9]+ - gsmtp$`)

type SenderConn struct {
	conn     *smtp.Client
	ip       string
	mxdomain string
	attempts int
	seed     byte
	tmpbuf   []byte
	lastUsed time.Time
}

type ConnResult struct {
	deferflag    bool
	defermatch   string
	defererror   bool
	transient    bool
	transientmsg string
	defermsg     string
	nolog        bool
	retry        bool
	nextmx       bool
	stattype     StatType
}

func (s *SenderConn) writeString(w io.Writer, str string) (int, error) {
	b, ok := w.(*bytes.Buffer)
	if ok {
		return b.WriteString(str)
	} else {
		l := len(str)
		if len(s.tmpbuf) < l {
			s.tmpbuf = make([]byte, l)
		}
		copy(s.tmpbuf[:l], str)
		return w.Write(s.tmpbuf[:l])
	}
}
func (s *SenderConn) writeRune(w io.Writer, r rune) (int, error) {
	b, ok := w.(*bytes.Buffer)
	if ok {
		return b.WriteRune(r)
	} else {
		s.tmpbuf[0] = byte(r)
		return w.Write(s.tmpbuf[:1])
	}
}

func newSenderConn(ip, mxdomain string) *SenderConn {
	return &SenderConn{
		seed:     byte(rand.Intn(253)),
		tmpbuf:   make([]byte, 1024),
		ip:       ip,
		mxdomain: mxdomain,
	}
}

func (s *SenderConn) encryptUser(email string, b64 bool) []byte {
	s.seed++
	if s.seed > 253 {
		s.seed = 1
	}
	return encryptUser(email, s.seed, b64)
}

func decryptParams(val string) url.Values {
	val = strings.Trim(val, "/")

	if len(val) < 3 {
		return nil
	}

	b58 := true

	if val[0] == '-' {
		val = val[1:]
		b58 = false
		if len(val) < 3 {
			return nil
		}
	}

	key := val[:2]

	cipher, err := rc4.NewCipher([]byte(key))
	if err != nil {
		return nil
	}

	var decoded []byte
	if b58 {
		decoded, err = base58.Decode(val[2:])
	} else {
		decoded, err = Base32Decode(val[2:])
	}
	if err != nil {
		return nil
	}

	cipher.XORKeyStream(decoded, decoded)

	ret, err := url.ParseQuery(string(unpack7Bit(decoded)))
	if err != nil {
		return nil
	}
	if ret["c"] == nil || ret["u"] == nil {
		return nil
	}
	return ret
}

func (s *SenderConn) encryptParams(match []byte) []byte {
	sub := tracklinkre2.FindSubmatch(match)

	key := []byte{
		randchars[rand.Intn(len(randchars))],
		randchars[rand.Intn(len(randchars))],
	}

	cipher, err := rc4.NewCipher(key)
	if err != nil {
		trace.Printf(":TRACE::%s:RC4 error: %s", s.ip, err)
		return match
	}

	packed := pack7Bit(sub[2])

	cipher.XORKeyStream(packed, packed)
	b58 := base58.Encode(packed)

	ret := make([]byte, len(sub[1])+2+len(b58))

	copy(ret, sub[1])
	copy(ret[len(sub[1]):], key)
	copy(ret[len(sub[1])+2:], b58)

	return ret
}

func (s *SenderConn) encryptParams2(match []byte) []byte {
	sub := tracklinkre2.FindSubmatch(match)

	key := []byte{
		keychars[rand.Intn(len(keychars))],
		keychars[rand.Intn(len(keychars))],
	}

	cipher, err := rc4.NewCipher(key)
	if err != nil {
		trace.Printf(":TRACE::%s:RC4 error: %s", s.ip, err)
		return match
	}

	packed := pack7Bit(sub[2])

	cipher.XORKeyStream(packed, packed)
	b32 := Base32Encode(packed)

	ret := make([]byte, len(sub[1])+1+2+len(b32))

	copy(ret, sub[1])
	ret[len(sub[1])] = '-'
	copy(ret[len(sub[1])+1:], key)
	copy(ret[len(sub[1])+1+2:], b32)

	return ret
}

var userReplacer *strings.Replacer = strings.NewReplacer(
	"@aol.com", "!",
	"@aim.com", "#",
	"@gmail.com", "^",
	"@googlemail.com", ":",
	"@yahoo.com", "&",
	"@yahoo.co.uk", "*",
	"@rocketmail.com", "?",
	"@hotmail.com", "(",
	"@hotmail.co.uk", ")",
	"@live.com", "~",
	"@comcast.net", "{",
	"@att.net", "}",
	"@sbcglobal.net", "[",
	"@verizon.net", "]",
	"@charter.net", ",",
	"@cox.net", "|",
	"@earthlink.net", "<",
	"@bellsouth.net", ">",
)

func encryptUser(email string, seed byte, b64 bool) []byte {
	r := seed
	s := userReplacer.Replace(email)

	random := make([]byte, 0)
	random = append(random, r)
	for i := range s {
		random = append(random, s[i]^r)
	}

	if b64 {
		enclen := base64.RawURLEncoding.EncodedLen(len(random))
		b64 := make([]byte, enclen)
		base64.RawURLEncoding.Encode(b64, random)
		return b64
	} else {
		userid := make([]byte, 0, len(random)*2)
		for _, b := range random {
			userid = strconv.AppendInt(userid, int64(b), 16)
		}
		return userid
	}
}

func (s *SenderConn) reset() {
	if s.conn != nil && config.NoMail == "" {
		s.conn.Close()
		s.conn = nil
		s.attempts = 0
	}
}

func (s *SenderConn) finish() {
	if s.conn != nil && config.NoMail == "" {
		s.conn.Quit()
		s.reset()
	}
}

func isDigit(b byte) bool {
	return b >= '0' && b <= '9'
}

func filterMsg(msg, email, ip, mxhost string) string {
	if strings.HasPrefix(msg, "short response: ") {
		msg = msg[len("short response: "):]
	}

	if msg == "[EOF]" || msg == "EOF" {
		return "Connection closed by server"
	}

	msg = gmailre.ReplaceAllString(msg, " <gmailid> - gsmtp")

	msg = strings.Replace(msg, email, "<to email>", -1)
	msg = strings.Replace(msg, ip, "<ip>", -1)
	if mxhost != "" {
		msg = strings.Replace(msg, mxhost, "<mx host>", -1)
	}
	ind := strings.IndexRune(email, '@')
	return strings.Replace(msg, email[:ind], "<username>", -1)
}

type LineRemover struct {
	Buf io.Writer
}

var qpnl = *regexp.MustCompile(`=\r?\n`)

func (l *LineRemover) Write(b []byte) (int, error) {
	if !qpnl.Match(b) {
		return l.Buf.Write(b)
	}
	written := 0
	for len(b) > 0 {
		loc := qpnl.FindIndex(b)
		if loc == nil {
			w, err := l.Buf.Write(b)
			written += w
			if err != nil {
				return written, err
			}
			break
		} else if loc[0] > 0 {
			w, err := l.Buf.Write(b[:loc[0]])
			written += w
			if err != nil {
				return written, err
			}
		}
		b = b[loc[1]:]
	}
	return written, nil
}

type LineSplitter struct {
	Buf   io.Writer
	Count int
}

func (l *LineSplitter) Write(b []byte) (int, error) {
	written := 0
	for true {
		linecnt := 76 - l.Count
		if linecnt > len(b) {
			linecnt = len(b)
		}
		n, err := l.Buf.Write(b[:linecnt])
		l.Count += n
		written += n
		if err != nil {
			return written, err
		}

		b = b[linecnt:]

		if len(b) == 0 {
			return written, nil
		}

		l.Buf.Write(CRNL)
		l.Count = 0
	}

	return 0, nil
}

func encodeFrom(from []byte, encoding string) []byte {
	if encoding != "b64" && encoding != "qp" && !hasNonASCII(from) {
		return from
	}

	addr, err := mail.ParseAddress(string(from))
	if err != nil {
		return from
	}

	var buf bytes.Buffer

	writeEncodedWord(&buf, []byte(addr.Name), encoding)

	buf.WriteString(" <")
	buf.WriteString(addr.Address)
	buf.WriteString(">")

	return buf.Bytes()
}

func hasNonASCII(word []byte) bool {
	for _, b := range word {
		if b < 32 || b > 126 {
			return true
		}
	}

	return false
}

func writeEncodedWord(buf *bytes.Buffer, word []byte, encoding string) {
	b64 := encoding == "b64"
	var w io.WriteCloser

	buf.WriteString("=?UTF-8?")
	if b64 {
		buf.WriteString("B?")
		w = base64.NewEncoder(base64.StdEncoding, buf)
	} else {
		buf.WriteString("Q?")
		w = quotedprintable.NewWriter(&LineRemover{Buf: buf})
	}
	w.Write(word)
	w.Close()
	buf.WriteString("?=")
}

func encodeWord(word []byte, encoding string) []byte {
	if encoding != "b64" && encoding != "qp" && !hasNonASCII(word) {
		return word
	}
	var buf bytes.Buffer

	writeEncodedWord(&buf, word, encoding)

	return buf.Bytes()
}

var nlchars = *regexp.MustCompile(`[\r\n]+`)

func getDomain(address string) string {
	addr, err := mail.ParseAddress(address)
	if err == nil {
		address = addr.Address
	}

	atind := strings.IndexRune(address, '@')
	if atind < 0 {
		return ""
	}

	return strings.ToLower(strings.TrimSpace(address[atind+1:]))
}

func rand2(campid string) *rand.Rand {
	ts := time.Now().Unix() / 600

	hash := fnv.New64()
	hash.Write([]byte(campid))
	binary.Write(hash, binary.BigEndian, ts)

	return rand.New(rand.NewSource(int64(hash.Sum64())))
}

func genReturnPath(campid string) string {
	ts := time.Now().Unix() / 600

	hash := fnv.New64()
	hash.Write([]byte(campid))
	binary.Write(hash, binary.BigEndian, ts)

	gen := rand.New(rand.NewSource(int64(hash.Sum64())))

	length := 7 + gen.Intn(6)
	ret := make([]byte, length)
	for i := 0; i < length; i++ {
		r := gen.Intn(len(rand2chars))
		ret[i] = rand2chars[r]
	}

	return string(ret)
}

var tracklinkre *regexp.Regexp = regexp.MustCompile(`https?://[^/]+(?:/api/track|/public/click|/web/follow|/blog/update)\?[^ '">]+`)
var tracklinkre2 *regexp.Regexp = regexp.MustCompile(`(https?://[^/]+/)(?:api/track|public/click|web/follow|blog/update)\?([^ '">]+)`)
var defflagre *regexp.Regexp = regexp.MustCompile(`\s*default\s*=(.+)`)

func (s *SenderConn) send(ud UserData, settingsid, mapkey string, settings *MTASettings, dkim *DKIMSettings) ConnResult {
	tmstart := time.Now()

	email := ud.GetField("Email", "")
	domain := email[strings.IndexRune(email, '@')+1:]
	cmd := ud.GetCmd()

	ipdomains := settings.IPDomains[s.ip]
	if ipdomains == nil {
		ipdomains = &IPDomains{}
	}

	fromdomain := getDomain(cmd.From)
	replytodomain := getDomain(cmd.ReplyTo)
	returndomain := getDomain(cmd.ReturnPath)

	ehlodomain := ipdomains.Domain
	if config.UseFromDomain && fromdomain != "" && fromdomain != "{{!!domain}}" {
		ehlodomain = fromdomain
	} else if config.UseReturnDomain && returndomain != "" && returndomain != "{{!!domain}}" {
		ehlodomain = returndomain
	} else if config.EhloDomain != "" {
		ehlodomain = config.EhloDomain
	}

	buf := &bytes.Buffer{}

	var subjreplace = func(esc bool, w io.Writer, tag string) (int, error) {
		pipe := strings.IndexRune(tag, ',')
		defval := ""
		if pipe > -1 {
			flag := tag[pipe+1:]
			tag = tag[:pipe]

			sm := defflagre.FindStringSubmatch(flag)
			if sm != nil {
				defval = sm[1]
			}
		}

		if tag == "!!rand" {
			const length = 9
			for i := 0; i < length; i++ {
				r := rand.Intn(len(randchars))
				s.writeRune(w, rune(randchars[r]))
			}
			return length, nil
		} else if tag == "!!rand2" {
			gen := rand2(cmd.ID)
			length := 7 + gen.Intn(6)
			for i := 0; i < length; i++ {
				r := gen.Intn(len(rand2chars))
				s.writeRune(w, rune(rand2chars[r]))
			}
			return length, nil
		} else if tag == "!!domain" {
			return s.writeString(w, ehlodomain)
		} else if tag == "!!date" {
			return s.writeString(w, time.Now().Format(time.RFC1123Z))
		} else if tag == "!!date2" {
			return s.writeString(w, time.Now().Format("1/2/2006"))
		} else if esc {
			return s.writeString(w, html.EscapeString(ud.GetField(tag, defval)))
		} else {
			return s.writeString(w, ud.GetField(tag, defval))
		}
	}

	var replace = func(esc bool, w io.Writer, tag string) (int, error) {
		comma := strings.IndexRune(tag, ',')
		defval := ""
		if comma > -1 {
			flag := tag[comma+1:]
			tag = tag[:comma]

			sm := defflagre.FindStringSubmatch(flag)
			if sm != nil {
				defval = sm[1]
			}
		}

		var tmpbuf bytes.Buffer
		switch tag {
		case "!!trackingid":
			return s.writeString(w, mainSender.GetTrackingID(mainSender.GetSinkID(), settingsid, s.ip))
		case "!!uid":
			return w.Write(s.encryptUser(email, true))
		case "!!campid":
			return s.writeString(w, cmd.ID)
		case "!!domain":
			return s.writeString(w, ehlodomain)
		case "!!from":
			_, err := cmd.fromCompiled.ExecuteFunc(&tmpbuf, func(w2 io.Writer, tag string) (int, error) { return subjreplace(esc, w2, tag) })
			if err != nil {
				return 0, err
			}
			return w.Write(encodeFrom(tmpbuf.Bytes(), cmd.FromEncoding))
		case "!!replyto":
			i, err := cmd.replyToCompiled.ExecuteFunc(w, func(w2 io.Writer, tag string) (int, error) { return subjreplace(esc, w2, tag) })
			return int(i), err
		case "!!subject":
			_, err := cmd.subjectCompiled.ExecuteFunc(&tmpbuf, func(w2 io.Writer, tag string) (int, error) { return subjreplace(esc, w2, tag) })
			if err != nil {
				return 0, err
			}
			return w.Write(encodeWord(tmpbuf.Bytes(), cmd.SubjectEncoding))
		case "!!webroot":
			var domain string
			var l int
			if cmd.BodyDomain != "" {
				domain = cmd.BodyDomain
			} else {
				domain = ipdomains.GetLinkDomain()
			}

			if sslDomains[strings.ToLower(domain)] {
				s.writeString(w, "https://")
				l = 8
			} else {
				s.writeString(w, "http://")
				l = 8
			}
			s.writeString(w, domain)
			return l + len(domain), nil
		case "!!to":
			var to = ud.GetField("!!to", "")
			// calling Address.String() will handle unicode names
			if to != "" {
				addr, err := mail.ParseAddress(to)
				if err != nil {
					return s.writeString(w, to)
				} else {
					return s.writeString(w, addr.String())
				}
			} else {
				var name = nlchars.ReplaceAllLiteralString(strings.TrimSpace(fmt.Sprintf("%s %s", ud.GetField("First Name", ""), ud.GetField("Last Name", ""))), "")
				if name != "" {
					addr := mail.Address{Name: name, Address: email}
					return s.writeString(w, addr.String())
				} else {
					return s.writeString(w, email)
				}
			}
		case "!!msgid":
			id := s.encryptUser(email, true)
			l := len(id)
			if len(id) < 8 {
				w.Write(id)
			} else {
				w.Write(id[:4])
				s.writeRune(w, '-')
				w.Write(id[4:6])
				s.writeRune(w, '-')
				w.Write(id[6:8])
				s.writeRune(w, '-')
				l += 3
				if len(id) < 11 {
					w.Write(id[8:])
				} else {
					w.Write(id[8:10])
					s.writeRune(w, '-')
					l++
					w.Write(id[10:])
				}
			}

			s.writeRune(w, '@')
			s.writeString(w, ehlodomain)

			return l + 1 + len(ehlodomain), nil
		case "!!date":
			return s.writeString(w, time.Now().Format(time.RFC1123Z))
		case "!!date2":
			return s.writeString(w, time.Now().Format("1/2/2006"))
		case "!!rand":
			const length = 9
			for i := 0; i < length; i++ {
				r := rand.Intn(len(randchars))
				s.writeRune(w, rune(randchars[r]))
			}
			return length, nil
		case "!!rand2":
			gen := rand2(cmd.ID)
			length := 7 + gen.Intn(6)
			for i := 0; i < length; i++ {
				r := gen.Intn(len(rand2chars))
				s.writeRune(w, rune(rand2chars[r]))
			}
			return length, nil
		default:
			if esc {
				return s.writeString(w, html.EscapeString(ud.GetField(tag, defval)))
			} else {
				return s.writeString(w, ud.GetField(tag, defval))
			}
		}
		return 0, nil
	}

	cmd.headerCompiled.ExecuteFunc(buf, func(w io.Writer, tag string) (int, error) { return replace(false, w, tag) })

	encoding := ""
	encodingmatch := encodingre.FindSubmatch(buf.Bytes())
	if encodingmatch != nil {
		encoding = strings.ToLower(string(encodingmatch[1]))
	}

	var bodywriter io.Writer
	if encoding == "base64" {
		bodywriter = base64.NewEncoder(base64.StdEncoding, &LineSplitter{Buf: buf})
	} else if encoding == "quoted-printable" {
		bodywriter = quotedprintable.NewWriter(buf)
	} else {
		bodywriter = buf
	}
	cmd.templateCompiled.ExecuteFunc(bodywriter, func(w io.Writer, tag string) (int, error) { return replace(true, w, tag) })
	closer, ok := bodywriter.(io.Closer)
	if ok {
		closer.Close()
	}

	body := buf.Bytes()

	// this won't work at the moment due to removing the path part of tracking links
	/*if encoding != "base64" && encoding != "quoted-printable" {
		body = tracklinkre.ReplaceAllFunc(body, s.encryptParams2)
	}*/

	var err error
	var dkimheaders []string

	if cmd.UseDKIM {
		dkimdomains := []string{ehlodomain}
		if fromdomain != "" && fromdomain != ehlodomain && fromdomain != "{{!!domain}}" {
			dkimdomains = append(dkimdomains, fromdomain)
		}
		if replytodomain != "" && replytodomain != ehlodomain && replytodomain != fromdomain && replytodomain != "{{!!domain}}" {
			dkimdomains = append(dkimdomains, replytodomain)
		}
		if returndomain != "" && returndomain != ehlodomain && returndomain != fromdomain && returndomain != replytodomain && returndomain != "{{!!domain}}" {
			dkimdomains = append(dkimdomains, returndomain)
		}

		for _, dkimdomain := range dkimdomains {
			var entry *DKIMEntry
			if dkim != nil {
				entry = dkim.Entries[dkimdomain]
			}

			if entry != nil && entry.dkimsign != nil {
				header, err := entry.dkimsign.GetSigHeader(body)

				if err != nil {
					dkimerr := fmt.Sprintf("DKIM error: %s", err)
					trace.Printf("%s:SOFT:%s:%s:%s:%s in %s", cmd.ID, email, s.ip, ehlodomain, dkimerr, time.Since(tmstart))
					if !ud.IsTest() {
						eventChan <- Event{
							Type:       "soft",
							Email:      email,
							CampID:     cmd.ID,
							SettingsID: settingsid,
							IP:         s.ip,
							Domain:     domain,
							Msg:        filterMsg(dkimerr, email, s.ip, s.mxdomain),
						}
					}
					return ConnResult{defermsg: dkimerr, stattype: SoftStat}
				}

				dkimheaders = append(dkimheaders, header)
			}
		}
	}

	for _, dkimheader := range dkimheaders {
		body = append([]byte(dkimheader), body...)
	}

	returnpath := cmd.returnPathCompiled.ExecuteFuncString(func(w2 io.Writer, tag string) (int, error) { return subjreplace(false, w2, tag) })
	if returnpath == "" {
		returnpath = fmt.Sprintf("%s@%s", genReturnPath(cmd.ID), ehlodomain)
	}

	var handleError = func(err error, isconn bool, f string) ConnResult {
		if s.conn != nil {
			s.reset()
		}

		var msg string
		var code int
		e, ok := err.(*textproto.Error)
		if !ok {
			errstr := err.Error()
			if strings.HasPrefix(errstr, "short response: ") {
				errstr = errstr[len("short response: "):]
				if len(errstr) >= 5 && isDigit(errstr[0]) && errstr[0] != '0' && isDigit(errstr[1]) && isDigit(errstr[2]) && errstr[3] == ' ' {
					code, _ = strconv.Atoi(errstr[:3])
					msg = errstr[4:]
					ind := strings.IndexRune(msg, '\n')
					if ind >= 0 {
						msg = msg[:ind]
					}
					msg = strings.TrimSpace(msg)
				} else if len(errstr) >= 7 && isDigit(errstr[0]) && errstr[0] != '0' &&
					errstr[1] == '.' && isDigit(errstr[2]) && errstr[3] == '.' &&
					isDigit(errstr[4]) && errstr[5] == ' ' {
					code, _ = strconv.Atoi(strings.Replace(errstr[:5], ".", "", -1))
					msg = errstr
					ind := strings.IndexRune(msg, '\n')
					if ind >= 0 {
						msg = msg[:ind]
					}
					msg = strings.TrimSpace(msg)
				}
			}
			if code == 0 {
				trace.Printf("%s:ERR:%s:%s:%s:%s (%s) in %s", cmd.ID, email, s.ip, ehlodomain, err, f, time.Since(tmstart))
				if !ud.IsTest() {
					eventChan <- Event{
						Type:       "err",
						CampID:     cmd.ID,
						SettingsID: settingsid,
						IP:         s.ip,
						Domain:     domain,
						Msg:        filterMsg(err.Error(), email, s.ip, s.mxdomain),
					}
				}
				return ConnResult{
					deferflag:  true,
					defererror: true,
					defermsg:   errstr,
					nolog:      true,
					retry:      true,
					stattype:   ErrStat,
				}
			}
		} else {
			msg, code = e.Msg, e.Code
		}

		var retry bool
		var stattype StatType = NoneStat
		if isconn || (code >= 400 && code < 500 && !isSoftBounce(msg)) {
			retry = true
		}

		ml := strings.ToLower(msg)

		for k := range settings.Transient {
			if strings.Contains(ml, k) {
				trace.Printf("%s:ERRT:%s:%s:%s:%s (%s) in %s", cmd.ID, email, s.ip, ehlodomain, msg, f, time.Since(tmstart))
				if !ud.IsTest() {
					eventChan <- Event{
						Type:       "err",
						CampID:     cmd.ID,
						SettingsID: settingsid,
						IP:         s.ip,
						Domain:     domain,
						Msg:        filterMsg(msg, email, s.ip, s.mxdomain),
					}
				}
				return ConnResult{
					deferflag:    true,
					transient:    true,
					transientmsg: msg,
					retry:        true,
					stattype:     ErrStat,
				}
			}
		}

		deferflag := false
		defermatch := ""

		if retry {
			deferflag = true
		}
		for k := range settings.CustomWaitSecs {
			if strings.Contains(ml, k) {
				deferflag = true
				defermatch = k
				retry = true
				break
			}
		}

		if retry {
			if !ud.IsTest() {
				eventChan <- Event{
					Type:       "defer",
					CampID:     cmd.ID,
					SettingsID: settingsid,
					IP:         s.ip,
					Domain:     domain,
					Msg:        filterMsg(msg, email, s.ip, s.mxdomain),
				}
			}
			trace.Printf("%s:DEFER:%s:%s:%s:%d %s (%s) in %s", cmd.ID, email, s.ip, ehlodomain, code, msg, f, time.Since(tmstart))
		} else {
			t := "SOFT"
			stattype = SoftStat

			if isHardBounce(cmd.ID, email, s.ip, msg, ml) {
				t = "HARD"
				stattype = HardStat
				if !ud.IsTest() {
					eventChan <- Event{
						Type:       "hard",
						Email:      email,
						CampID:     cmd.ID,
						SettingsID: settingsid,
						IP:         s.ip,
						Msg:        filterMsg(msg, email, s.ip, s.mxdomain),
					}
				}
			} else {
				if !ud.IsTest() {
					eventChan <- Event{
						Type:       "soft",
						Email:      email,
						CampID:     cmd.ID,
						SettingsID: settingsid,
						IP:         s.ip,
						Domain:     domain,
						Msg:        filterMsg(msg, email, s.ip, s.mxdomain),
					}
				}
			}

			trace.Printf("%s:%s:%s:%s:%s:%d %s (%s) in %s", cmd.ID, t, email, s.ip, ehlodomain, code, msg, f, time.Since(tmstart))
		}

		if retry {
			if !ud.Retry(settings) {
				stattype = SoftStat
				trace.Printf("%s:SOFT:%s:%s:%s:Retry time expired", cmd.ID, email, s.ip, ehlodomain)
				if !ud.IsTest() {
					eventChan <- Event{
						Type:       "soft",
						Email:      email,
						CampID:     cmd.ID,
						SettingsID: settingsid,
						IP:         s.ip,
						Domain:     domain,
						Msg:        "Retry time expired",
					}
				}
				retry = false
			}
		}

		return ConnResult{
			defererror: false,
			defermatch: defermatch,
			deferflag:  deferflag,
			defermsg:   msg,
			retry:      retry,
			stattype:   stattype,
		}
	}

	if s.conn != nil {
		if settings.SendsPerConn > 0 && s.attempts >= settings.SendsPerConn {
			trace.Printf("%s:TRACE:%s:%s:%s:Maximum sends reached (%d), closing connection", cmd.ID, email, s.ip, ehlodomain, s.attempts)
			s.finish()
		}
	}
	if s.conn == nil {
		var err error
		var ips []string

		ips, err, _ = LookupA(s.mxdomain)

		if err != nil {
			msg := fmt.Sprintf("DNS Error for %s: %s", s.mxdomain, err)
			trace.Printf("%s:ERR:%s:%s:%s:%s in %s", cmd.ID, email, s.ip, ehlodomain, msg, time.Since(tmstart))
			if !ud.IsTest() {
				eventChan <- Event{
					Type:       "err",
					CampID:     cmd.ID,
					SettingsID: settingsid,
					IP:         s.ip,
					Domain:     domain,
					Msg:        msg,
				}
			}
			return ConnResult{
				defererror: true,
				deferflag:  true,
				defermsg:   err.Error(),
				retry:      true,
				nolog:      true,
				nextmx:     true,
				stattype:   ErrStat,
			}
		}

		var netconn net.Conn

		if config.NoMail == "" {
			for _, ip := range ips {
				trace.Printf("%s:TRACE:%s:%s:%s:Connecting to %s -> %s (%s)", cmd.ID, email, s.ip, ehlodomain, domain, s.mxdomain, ip)
				dialer := net.Dialer{LocalAddr: &net.TCPAddr{IP: net.ParseIP(s.ip)},
					Timeout: (15 * time.Second)}
				netconn, err = dialer.Dial("tcp", fmt.Sprintf("%s:25", ip))
				if err == nil {
					break
				}
				trace.Printf("%s:TRACE:%s:%s:%s:Error connecting to %s: %s", cmd.ID, email, s.ip, ehlodomain, ip, err)
			}

			if netconn == nil {
				trace.Printf("%s:ERR:%s:%s:%s:Unable to connect to server in %s", cmd.ID, email, s.ip, ehlodomain, time.Since(tmstart))
				if !ud.IsTest() {
					eventChan <- Event{
						Type:       "err",
						CampID:     cmd.ID,
						SettingsID: settingsid,
						IP:         s.ip,
						Domain:     domain,
						Msg:        "Unable to connect to server",
					}
				}
				return ConnResult{
					defererror: true,
					deferflag:  true,
					defermsg:   err.Error(),
					retry:      true,
					nolog:      true,
					nextmx:     true,
					stattype:   ErrStat,
				}
			}

			s.conn, err = smtp.NewClient(netconn, s.mxdomain)
			if err != nil {
				return handleError(err, true, "NewClient")
			}

			err = s.conn.Hello(ehlodomain)
			if err != nil {
				return handleError(err, true, "Hello")
			}

			if !config.NoTLS {
				hastls, _ := s.conn.Extension("STARTTLS")
				if hastls {
					tlsconf := &tls.Config{InsecureSkipVerify: true}
					err = s.conn.StartTLS(tlsconf)
					if err != nil {
						return handleError(err, true, "StartTLS")
					}
				}
			}
		}
	}

	s.attempts++

	if config.NoMail == "" {
		err = s.conn.Mail(returnpath)
		if err != nil {
			return handleError(err, false, "Mail")
		}

		err = s.conn.Rcpt(email)
		if err != nil {
			return handleError(err, false, "Rcpt")
		}

		bodywrite, err := s.conn.Data()
		if err != nil {
			return handleError(err, false, "Data")
		}

		_, err = bodywrite.Write(body)
		if err != nil {
			return handleError(err, false, "Body")
		}

		err = bodywrite.Close()
		if err != nil {
			return handleError(err, false, "Close")
		}
	} else if rand.Intn(500) == 0 {
		time.Sleep(100 * time.Millisecond)
		s := strings.SplitN(config.NoMail, " ", 2)
		i, _ := strconv.ParseInt(s[0], 10, 32)
		err = &textproto.Error{Code: int(i), Msg: s[1]}
		return handleError(err, false, "Fake")
	} else if rand.Intn(50) == 0 {
		time.Sleep(50 * time.Millisecond)
		return handleError(fmt.Errorf("Test socket error"), false, "Fake")
	} else {
		time.Sleep(25 * time.Millisecond)
	}

	trace.Printf("%s:SEND:%s:%s:%s:Message delivered in %s", cmd.ID, email, s.ip, ehlodomain, time.Since(tmstart))
	if !ud.IsTest() {
		eventChan <- Event{
			Type:       "send",
			CampID:     cmd.ID,
			SettingsID: settingsid,
			IP:         s.ip,
			Domain:     domain,
		}
		logChan <- SendLog{
			CampID: cmd.ID,
			Email:  email,
		}
	}
	return ConnResult{}
}
