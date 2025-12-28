package sender

import (
	"bufio"
	"bytes"
	"context"
	"crypto/tls"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"io/ioutil"
	"log"
	"math"
	"math/rand"
	"net"
	"net/http"
	"syscall"

	"github.com/chrj/smtpd"
	dkim "github.com/fastingsamurai/go-dkim"
	lru "github.com/hashicorp/golang-lru/v2"
	"github.com/valyala/fasttemplate"
	"github.com/vmihailenco/msgpack"
	"golang.org/x/sys/unix"
	"gopkg.in/yaml.v3"

	//	"net/http/pprof"
	"net/url"
	"os"
	"path/filepath"
	"regexp"
	"runtime"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"time"
)

var nlre = regexp.MustCompile("\r?\n")

type IPDomainConfig struct {
	Domain       string `json:"domain"`
	NoWebServer  bool   `json:"nowebserver"`
	NoMailServer bool   `json:"nomailserver"`
}

type IPPause struct {
	SettingsID    string `json:"settingsid"`
	DomainGroupID string `json:"domaingroupid"`
	IP            string `json:"ip"`
	Discard       bool   `json:"discard"`
}

type Warmup struct {
	AllIPs         []string       `json:"allips"`
	Domains        string         `json:"domains"`
	ExcludeDomains string         `json:"excludedomains"`
	DailyLimit     int            `json:"dailylimit"`
	RampFactor     int            `json:"rampfactor"`
	Threshold      int            `json:"threshold"`
	ThresholdDays  int            `json:"thresholddays"`
	DayOverrides   map[string]int `json:"dayoverrides"`
	Priority       string         `json:"priority"`
	LimitCount     int            `json:"limitcount"`
	AfterLimit     string         `json:"afterlimit"`
	Disabled       bool           `json:"disabled"`

	Increments      map[string]string `json:"increments"`
	domainPatterns  []string
	excludePatterns []string
}

func (w *Warmup) addIncrement(mapkey string) {
	if w.Increments == nil {
		w.Increments = make(map[string]string)
	}

	e := w.Increments[mapkey]
	if e == "" {
		w.Increments[mapkey] = "1"
		trace.Printf(":TRACE:::New increment: %s", w.Increments[mapkey])
	} else {
		i, _ := strconv.Atoi(e)
		if i < (w.LimitCount + 1) {
			i++
			w.Increments[mapkey] = strconv.Itoa(i)
			trace.Printf(":TRACE:::New increment: %s", w.Increments[mapkey])
		}
	}

}

func (w *Warmup) currentLimit(mapkey string) int {
	increment := "0"
	if w.Increments != nil {
		increment = w.Increments[mapkey]
	}

	incrnum, _ := strconv.Atoi(increment)

	if incrnum > w.LimitCount {
		if w.AfterLimit == "policy" {
			return -1
		} else {
			incrnum = w.LimitCount
			increment = strconv.FormatInt(int64(incrnum), 10)
		}
	}

	var lim int64

	over, ok := w.DayOverrides[increment]
	if ok {
		lim = int64(over)
	} else {
		lim = int64(w.DailyLimit)

		for i := 0; i < incrnum; i++ {
			lim += int64(float64(lim) * (float64(w.RampFactor) * 0.01))
			factor := math.Pow(10, math.Floor(math.Log10(float64(lim))))
			lim = int64((math.Round((float64(lim)/factor)*100) / 100) * factor)
		}
	}

	if lim > math.MaxInt32 {
		lim = math.MaxInt32
	}
	return int(lim)
}

func (w *Warmup) hasIP(ip string) bool {
	for _, i := range w.AllIPs {
		if i == ip {
			return true
		}
	}
	return false
}

func (w *Warmup) hasDomain(domain string) bool {
	if w.domainPatterns == nil {
		w.domainPatterns = strings.Fields(w.Domains)
		w.excludePatterns = strings.Fields(w.ExcludeDomains)
	}

	found := false
	for _, pat := range w.domainPatterns {
		m, _ := filepath.Match(pat, domain)
		if m {
			found = true
			break
		}
	}
	if !found {
		return false
	}

	for _, pat := range w.excludePatterns {
		m, _ := filepath.Match(pat, domain)
		if m {
			found = false
			break
		}
	}
	return found
}

type Config struct {
	NoMail          string                     `json:"nomail"`
	IPDomains       map[string]*IPDomainConfig `json:"ipdomains"`
	MgmtIP          string                     `json:"mgmtip"`
	AccessKey       string                     `json:"accesskey"`
	UpstreamURL     string                     `json:"upstreamurl"`
	SMTPHosts       []string                   `json:"smtphosts"`
	EhloDomain      string                     `json:"ehlodomain"`
	UseReturnDomain bool                       `json:"usereturndomain"`
	UseFromDomain   bool                       `json:"usefromdomain"`
	MailUID         int                        `json:"mailuid"`
	MailGID         int                        `json:"mailgid"`
	NoTLS           bool                       `json:"notls"`
}

var config Config

type NewConfig struct {
	NoMail           string `yaml:"No Mail"`
	PlatformURL      string `yaml:"Platform URL"`
	ManagementIP     string `yaml:"Management IP"`
	TLSEnabled       bool   `yaml:"TLS Enabled"`
	MTAPassword      string `yaml:"MTA Password"`
	EhloDomain       string `yaml:"EHLO Domain"`
	UseReturnDomain  bool   `yaml:"Use Return Domain"`
	UseFromDomain    bool   `yaml:"Use From Domain"`
	MailDirectoryUID int    `yaml:"Mail Directory UID"`
	MailDirectoryGID int    `yaml:"Mail Directory GID"`
}

var trace *log.Logger

type APICmd struct {
	ID              string `json:"id"`
	From            string `json:"from"`
	ReturnPath      string `json:"returnpath"`
	ReplyTo         string `json:"replyto"`
	Subject         string `json:"subject"`
	AccessKey       string `json:"accesskey"`
	Template        string `json:"template"`
	BodyDomain      string `json:"bodydomain"`
	Headers         string `json:"headers"`
	FromEncoding    string `json:"fromencoding"`
	SubjectEncoding string `json:"subjectencoding"`
	UseDKIM         bool   `json:"usedkim"`

	headerCompiled     *fasttemplate.Template
	templateCompiled   *fasttemplate.Template
	subjectCompiled    *fasttemplate.Template
	fromCompiled       *fasttemplate.Template
	replyToCompiled    *fasttemplate.Template
	returnPathCompiled *fasttemplate.Template
}

func (config *Config) initAllowedDomains() {
	for _, smtphost := range config.SMTPHosts {
		allowedMailDomains[smtphost] = true
	}
	for _, ipconfig := range config.IPDomains {
		allowedMailDomains[ipconfig.Domain] = true
	}
}

func compileCmd(cmd *APICmd) {
	if cmd.Headers == "" {
		cmd.headerCompiled = defaultHeaderTemplate
	} else {
		cmd.headerCompiled = fasttemplate.New(nlre.ReplaceAllLiteralString(cmd.Headers, "\r\n"), "{{", "}}")
	}
	cmd.templateCompiled = fasttemplate.New(nlre.ReplaceAllLiteralString(cmd.Template, "\r\n"), "{{", "}}")
	cmd.subjectCompiled = fasttemplate.New(cmd.Subject, "{{", "}}")
	cmd.fromCompiled = fasttemplate.New(cmd.From, "{{", "}}")
	cmd.replyToCompiled = fasttemplate.New(cmd.ReplyTo, "{{", "}}")
	cmd.returnPathCompiled = fasttemplate.New(cmd.ReturnPath, "{{", "}}")
}

type DKIMEntry struct {
	Private string `json:"private"`

	dkimsign *dkim.SigOptions
}

type DKIMSettings struct {
	Selector string                `json:"selector"`
	Entries  map[string]*DKIMEntry `json:"entries"`
}

func (d *DKIMSettings) compile() {
	selector := d.Selector
	if selector == "" {
		selector = "dkim"
	}
	for domain, entry := range d.Entries {
		if entry.Private != "" {
			entry.dkimsign = dkim.NewSigOptions()
			entry.dkimsign.PrivateKey = []byte(entry.Private)
			entry.dkimsign.Headers = []string{"from", "reply-to", "subject", "date", "message-id", "to", "mime-version", "content-type", "content-transfer-encoding", "list-unsubscribe"}
			entry.dkimsign.Domain = domain
			entry.dkimsign.Selector = selector
			entry.dkimsign.Canonicalization = "relaxed/relaxed"
			entry.dkimsign.AddSignatureTimestamp = false
			err := entry.dkimsign.Prepare()
			if err != nil {
				trace.Printf(":TRACE:::Error parsing DKIM Key: %s", err)
				entry.dkimsign = nil
			}
		}
	}
}

type SettingsCmd struct {
	APICmd
	MTASettings map[string]*MTASettings `json:"mtasettings"`
	SinkID      string                  `json:"sinkid"`
	IPPauses    []*IPPause              `json:"ippauses"`
	Warmups     map[string]*Warmup      `json:"warmups"`
	ForceStart  []*IPPause              `json:"forcestart"`
	AllIPs      []string                `json:"allips"`
	AllSinks    []string                `json:"allsinks"`
	IPDomains   map[string]*IPDomains   `json:"ipdomains"`
	DKIM        *DKIMSettings           `json:"dkim"`
}

type SendListsCmd struct {
	APICmd
	ListURLs     []string       `json:"listurls"`
	ListData     string         `json:"listdata"`
	SettingsID   string         `json:"settingsid"`
	DomainCounts map[string]int `json:"domaincounts"`
	SendID       string         `json:"sendid"`
}

type SendAddrCmd struct {
	APICmd
	To         string `json:"to"`
	Email      string `json:"email"`
	SettingsID string `json:"settingsid"`
	CID        string `json:"cid"`
}

type TestLogMsg struct {
	AccessKey string `json:"accesskey"`
	CID       string `json:"cid"`
	To        string `json:"to"`
	Msg       string `json:"msg"`
}

type UserData interface {
	GetField(string, string) string
	GetCmd() *APICmd
	IsTest() bool
	InitSend()
	Retry(settings *MTASettings) bool
}

type FieldsUserData struct {
	HeaderMap map[string]int
	Fields    map[int]string
	Cmd       *SendListsCmd
	FirstSent time.Time
}

func (u *FieldsUserData) GetField(h string, def string) string {
	i, ok := u.HeaderMap[h]
	if !ok {
		return def
	}
	r := u.Fields[i]
	if r == "" {
		return def
	}
	return r
}

func (u *FieldsUserData) GetCmd() *APICmd {
	return &u.Cmd.APICmd
}

func (u *FieldsUserData) IsTest() bool {
	return false
}

func (u *FieldsUserData) InitSend() {
	if u.FirstSent.IsZero() {
		u.FirstSent = time.Now()
	}
}

func (u *FieldsUserData) Retry(settings *MTASettings) bool {
	return time.Now().Sub(u.FirstSent) <= time.Duration(settings.RetryFor)*time.Hour
}

type TestUserData struct {
	Email   string
	To      string
	Cmd     *SendAddrCmd
	Retries int
}

func (u *TestUserData) GetField(h string, def string) string {
	switch h {
	case "Email":
		return u.Email
	case "!!to":
		return u.To
	case "Bounced", "Complained", "Unsubscribed":
		return ""
	}
	return def
}

func (u *TestUserData) GetCmd() *APICmd {
	return &u.Cmd.APICmd
}

func (u *TestUserData) IsTest() bool {
	return true
}

func (u *TestUserData) InitSend() {}

func (u *TestUserData) Retry(settings *MTASettings) bool { return false }

func filterBinary(s string) string {
	b := make([]byte, len(s))
	var bl int
	for i := 0; i < len(s); i++ {
		c := s[i]
		if c >= 32 && c <= 126 {
			b[bl] = c
			bl++
		}
	}
	return string(b[:bl])
}

func reloadCmds() {
	files, err := ioutil.ReadDir("/conf")
	if err != nil {
		trace.Printf(":ERROR:::%s", err)
		return
	}

	for _, file := range files {
		if file.IsDir() && strings.HasPrefix(file.Name(), "send-") {
			if strings.HasSuffix(file.Name(), "$tmp") {
				trace.Printf(":Trace:::Removing temporary send directory %s", file.Name())
				os.RemoveAll(file.Name())
				continue
			}

			var state SendListsState

			dir := "/conf/" + file.Name()
			conf := fmt.Sprintf("%s/state.json", dir)
			fp, err := os.Open(conf)
			if err != nil {
				trace.Printf(":ERROR:::%s", err)
				continue
			}
			decoder := json.NewDecoder(fp)
			err = decoder.Decode(&state)
			fp.Close()
			if err != nil {
				trace.Printf(":ERROR:::%s", err)
				continue
			}

			state.id = state.CmdData.ID
			state.sendid = state.CmdData.SendID
			state.dir = dir
			state.statefile = conf
			state.statefiletmp = conf + ".tmp"
			compileCmd(&state.CmdData.APICmd)

			go func() {
				defer handlePanic()

				state.Resume()
			}()
		}
	}
}

type SendListsState struct {
	CmdData       *SendListsCmd  `json:"cmd"`
	ListCount     int            `json:"listcount"`
	CurrentList   int            `json:"currentlist"`
	Offset        int            `json:"offset"`
	TotalOffset   int            `json:"totaloffset"`
	DomainOffsets map[string]int `json:"domainoffsets"`

	id           string
	sendid       string
	dir          string
	statefile    string
	statefiletmp string
	cancelFlag   int32
	cmdLock      sync.Mutex
}

var allStates map[string]map[string]*SendListsState = make(map[string]map[string]*SendListsState)
var allStatesLock sync.Mutex

func (s *SendListsState) Save() {
	fp, err := os.Create(s.statefiletmp)
	if err != nil {
		trace.Printf("%s:TRACE:::Error: %s", s.id, err)
		return
	}
	defer fp.Close()

	enc := json.NewEncoder(fp)
	enc.SetIndent("", "  ")
	s.cmdLock.Lock()
	err = enc.Encode(s)
	s.cmdLock.Unlock()
	if err != nil {
		trace.Printf("%s:TRACE:::Error: %s", s.id, err)
		return
	}

	os.Rename(s.statefiletmp, s.statefile)
}

func isTrue(s string) bool {
	var sl = strings.ToLower(strings.TrimSpace(s))
	switch sl {
	case "false", "f", "n", "no", "":
		return false
	default:
		return true
	}
	return false
}

func (s *SendListsState) Update(cmd *APICmd) {
	s.cmdLock.Lock()
	newcmd := *s.CmdData
	newcmd.APICmd = *cmd
	s.CmdData = &newcmd
	s.cmdLock.Unlock()

	s.Save()
}

func (s *SendListsState) Cancel() {
	atomic.StoreInt32(&s.cancelFlag, 1)
}

func (s *SendListsState) IsCancelled() bool {
	return atomic.LoadInt32(&s.cancelFlag) != 0
}

func (s *SendListsState) Register() {
	allStatesLock.Lock()
	statemap := allStates[s.id]
	if statemap == nil {
		statemap = make(map[string]*SendListsState)
		allStates[s.id] = statemap
	}
	statemap[s.sendid] = s
	allStatesLock.Unlock()
}

func (s *SendListsState) Unregister() {
	allStatesLock.Lock()
	statemap := allStates[s.id]
	delete(statemap, s.sendid)
	if len(statemap) == 0 {
		delete(allStates, s.id)
	}
	allStatesLock.Unlock()
}

func (s *SendListsState) GetCmd() *SendListsCmd {
	s.cmdLock.Lock()
	r := s.CmdData
	s.cmdLock.Unlock()
	return r
}

func (s *SendListsState) Resume() {
	s.Register()

	for domain, domaincount := range s.GetCmd().DomainCounts {
		setQueue(s.id, s.sendid, domain, domaincount-s.DomainOffsets[domain])
	}

	for ; s.CurrentList < s.ListCount; s.CurrentList++ {
		file := fmt.Sprintf("%s/list-%08d.blk", s.dir, s.CurrentList)
		trace.Printf("%s:TRACE:::Reading %s", s.id, file)

		buf, err := ioutil.ReadFile(file)
		if err != nil {
			trace.Printf("%s:TRACE:::Error: %s", s.id, err)
			return
		}

		r := msgpack.NewDecoder(bytes.NewBuffer(buf))
		var headers []string
		err = r.Decode(&headers)
		if err != nil {
			trace.Printf("%s:TRACE:::Error: %s", s.id, err)
			return
		}

		headermap := make(map[string]int)
		for i, h := range headers {
			headermap[h] = i
		}

		listcnt := 0

		for {
			var line map[int]string
			err = r.Decode(&line)
			if err == io.EOF {
				break
			}
			if err != nil {
				trace.Printf("%s:TRACE:::Error: %s", s.id, err)
				return
			}

			if listcnt < s.Offset {
				listcnt++
				continue
			}

			if s.IsCancelled() {
				trace.Printf("%s:TRACE:::Send lists command %s cancelled, list %d offset %d total offset %d", s.id, s.sendid, s.CurrentList, s.Offset, s.TotalOffset)
				goto exit
			}

			cmd := s.GetCmd()

			ud := &FieldsUserData{HeaderMap: headermap, Fields: line, Cmd: cmd}
			email := ud.GetField("Email", "")
			domain := email[strings.IndexRune(email, '@')+1:]

			if isTrue(ud.GetField("Bounced", "")) ||
				isTrue(ud.GetField("Complained", "")) ||
				isTrue(ud.GetField("Unsubscribed", "")) {
				trace.Printf("%s:SUPP:%s::user is suppressed", s.id, ud.GetField("Email", ""))
			} else {
				ud.InitSend()

				discard, err, mapkey, connkey, connid, conn, settings := mainSender.GetConn(cmd.SettingsID, ud, s.id, 0, s.IsCancelled)

				ud.Cmd = s.GetCmd()

				if discard {
					trace.Printf("%s:SUPP:%s::%s", s.id, ud.GetField("Email", ""), err.Error())
				} else {
					go s.sendMail(conn, mapkey, connkey, connid, ud, settings, mainSender.DKIM, cmd.SettingsID)
				}
			}

			s.Offset++
			s.TotalOffset++
			newdomainoffset := s.DomainOffsets[domain] + 1
			if s.DomainOffsets == nil {
				s.DomainOffsets = make(map[string]int)
			}
			s.DomainOffsets[domain] = newdomainoffset
			listcnt++

			setQueue(s.id, s.sendid, domain, cmd.DomainCounts[domain]-newdomainoffset)

			s.Save()
		}

		s.Offset = 0
	}

exit:
	for domain := range s.GetCmd().DomainCounts {
		setQueue(s.id, s.sendid, domain, 0)
	}

	s.Unregister()

	os.RemoveAll(s.dir)
}

func (s *SendListsState) sendMail(c *SenderConn, mk string, ck ConnKey, cid uint64, data *FieldsUserData, mta *MTASettings, dkim *DKIMSettings, settingsid string) {
	defer handlePanic()

	mxindex := 0

	for {
		if c != nil {
			result := c.send(data, settingsid, mk, mta, dkim)

			mainSender.ProcessResult(settingsid, mk, ck, cid, result, data)

			if s.IsCancelled() || !result.retry {
				break
			}

			if result.nextmx {
				mxindex++
			}
		}

		var discard bool
		var err error
		discard, err, mk, ck, cid, c, mta = mainSender.GetConn(settingsid, data, s.id, mxindex, s.IsCancelled)
		if discard {
			trace.Printf("%s:SUPP:%s::%s", s.id, data.GetField("Email", ""), err.Error())
			break
		}
		if err != nil {
			result := ConnResult{
				defererror: true,
				deferflag:  true,
				defermsg:   err.Error(),
				retry:      data.Retry(mta),
				nolog:      true,
				stattype:   ErrStat,
			}
			mainSender.ProcessResult(settingsid, mk, ck, cid, result, data)
			if s.IsCancelled() || !result.retry {
				break
			}
		}

		data.Cmd = s.GetCmd()
	}
}

func sendLists(cmd *SendListsCmd) {
	defer handlePanic()

	dir := fmt.Sprintf("/conf/send-%s-%s", cmd.ID, cmd.SendID)

	dirtmp := fmt.Sprintf("%s$tmp", dir)

	err := os.Mkdir(dirtmp, 0777)
	if err != nil {
		trace.Printf("%s:TRACE:::Error: %s", cmd.ID, err)
		return
	}

	listcount := 1

	if cmd.ListData != "" {
		trace.Printf("%s:TRACE:::Reading list data", cmd.ID)
		data, err := base64.StdEncoding.DecodeString(cmd.ListData)
		if err != nil {
			trace.Printf("%s:TRACE:::Error: %s", cmd.ID, err)
			return
		}

		fp, err := os.Create(fmt.Sprintf("%s/list-%08d.blk", dirtmp, 0))
		if err != nil {
			trace.Printf("%s:TRACE:::Error: %s", cmd.ID, err)
			return
		}

		_, err = fp.Write(data)
		fp.Close()
		if err != nil {
			trace.Printf("%s:TRACE:::Error: %s", cmd.ID, err)
			return
		}
	} else {
		listcount = len(cmd.ListURLs)

		for urlindex, url := range cmd.ListURLs {
			trace.Printf("%s:TRACE:::Reading %s", cmd.ID, url)
			res, err := http.Get(url)
			if err != nil {
				trace.Printf("%s:TRACE:::Error: %s", cmd.ID, err)
				return
			}
			if res.StatusCode < 200 || res.StatusCode > 299 {
				trace.Printf("%s:TRACE:::Error: %s", cmd.ID, res.Status)
				res.Body.Close()
				return
			}

			fp, err := os.Create(fmt.Sprintf("%s/list-%08d.blk", dirtmp, urlindex))
			if err != nil {
				trace.Printf("%s:TRACE:::Error: %s", cmd.ID, err)
				res.Body.Close()
				return
			}

			_, err = io.Copy(fp, res.Body)
			fp.Close()
			res.Body.Close()
			if err != nil {
				trace.Printf("%s:TRACE:::Error: %s", cmd.ID, err)
				return
			}
		}
	}

	err = os.Rename(dirtmp, dir)
	if err != nil {
		trace.Printf("%s:TRACE:::Error: %s", cmd.ID, err)
		return
	}

	state := &SendListsState{ListCount: listcount, DomainOffsets: make(map[string]int), CmdData: cmd, id: cmd.ID, sendid: cmd.SendID, dir: dir, statefile: fmt.Sprintf("%s/state.json", dir),
		statefiletmp: fmt.Sprintf("%s/state.json.tmp", dir)}

	state.Save()

	state.Resume()
}

const MAX_TEST_ERRORS = 3

func sendAddr(cmd *SendAddrCmd) {
	defer handlePanic()

	data := &TestUserData{Email: cmd.Email, To: cmd.To, Cmd: cmd}

	data.InitSend()

	msg := ""
	mxindex := 0
	tries := 0
	for {
		discard, err, mk, ck, cid, c, mta := mainSender.GetConn(cmd.SettingsID, data, cmd.ID, mxindex, nil)
		if err != nil {
			msg = err.Error()
			result := ConnResult{
				defererror: true,
				deferflag:  true,
				defermsg:   msg,
				retry:      true,
				nolog:      true,
				stattype:   ErrStat,
			}
			mainSender.ProcessResult(cmd.SettingsID, mk, ck, cid, result, data)
		}
		if discard {
			break
		}

		if c != nil {
			result := c.send(data, cmd.SettingsID, mk, mta, mainSender.DKIM)

			if result.defermsg != "" {
				msg = result.defermsg
			} else if result.transientmsg != "" {
				msg = result.transientmsg
			} else {
				msg = "Delivery successful"
			}

			mainSender.ProcessResult(cmd.SettingsID, mk, ck, cid, result, data)

			if !result.retry {
				break
			}
			if result.nextmx {
				mxindex++
			}
		}

		tries++

		if tries >= MAX_TEST_ERRORS {
			break
		}
	}

	testlog := TestLogMsg{
		AccessKey: config.AccessKey,
		CID:       cmd.CID,
		To:        cmd.To,
		Msg:       msg,
	}
	jsonval, err := json.Marshal(&testlog)
	if err != nil {
		trace.Printf(":TRACE:::Error encoding test log: %s", err)
		return
	}
	res, err := http.Post(fmt.Sprintf("%s/api/testlogs/%s", config.UpstreamURL, mainSender.GetSinkID()), "application/json", bytes.NewBuffer(jsonval))
	if err != nil {
		trace.Printf(":TRACE:::Error sending test log: %s", err)
	} else {
		if res.StatusCode < 200 || res.StatusCode > 299 {
			trace.Printf(":TRACE:::Error sending test log: %s", res.Status)
		}
		res.Body.Close()
	}
}

type eventHandler struct {
	linkCache *lru.ARCCache[string, string]
}

var GIF []byte = []byte("\x47\x49\x46\x38\x39\x61\x01\x00\x01\x00\x80\x01\x00\x00\x00\x00\xFF\xFF\xFF\x21\xF9\x04\x01\x00\x00\x01\x00\x2C\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02\x4C\x01\x00\x3B")
var UNSUB []byte = []byte(`<html><head><title>Unsubscribe Successful</title><link href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-BVYiiSIFeK1dGmJRAkycuHAHRg32OmUcww7on3RYdg4Va+PmSTsz/K68vbdEjh4u" crossorigin="anonymous"></head><body><div class="container"><div class="row" style="margin-top:25px"><div class="col-xs-4 col-xs-offset-4 text-center"><div class="panel panel-default"><div class="panel-body">You have been unsubscribed from this mailing list. Sorry to see you go!</div></div></div></div></div></body></html>`)
var BADMETHOD []byte = []byte("Unknown method")
var BADPARAM []byte = []byte("Missing parameter")
var BADCMD []byte = []byte("Unknown command")
var BADERR []byte = []byte("Error processing command")
var NOTFOUND []byte = []byte("File not found")

func getClientIP(r *http.Request) string {
	fwd := r.Header.Get("X-Forwarded-For")

	if fwd != "" {
		ips := strings.Split(fwd, ", ")
		for _, ip := range ips {
			if net.ParseIP(ip) != nil {
				return ip
			}
			break
		}
	}

	ip, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return ""
	}

	if net.ParseIP(ip) != nil {
		return ip
	}

	return ""
}

var paramre = regexp.MustCompile(`\{\{[^\}]+\}\}`)

var clickletters = map[byte]bool{'a': true, 'c': true, 'f': true, 'g': true, 'm': true, 'p': true, 'q': true, 's': true, 'w': true}
var openletters = map[byte]bool{'b': true, 'k': true, 'j': true, 'l': true, 'o': true, 't': true, 'y': true, 'n': true}
var unsubletters = map[byte]bool{'d': true, 'e': true, 'h': true, 'i': true, 'r': true, 'u': true, 'v': true}

func (e *eventHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	defer handlePanic()

	urlobj := r.URL
	strurl := urlobj.String()
	var encvals url.Values

	trace.Printf(":WEB:::%s %s %s %s", r.RemoteAddr, r.Method, filterBinary(strurl), r.Header.Get("User-Agent"))
	if strings.HasPrefix(urlobj.Path, "/.well-known/acme-challenge/") {
		http.ServeFile(w, r, "/conf/letsencrypt-challenge"+urlobj.Path)
		return
	}
	if strings.HasPrefix(urlobj.Path, "/i/") {
		parts := strings.Split(urlobj.Path, "/")
		if len(parts) != 3 {
			trace.Println(":WEB:::Invalid image request")
			w.WriteHeader(http.StatusNotFound)
			w.Write(NOTFOUND)
			return
		}
		filename := parts[len(parts)-1]
		if filename == "" {
			trace.Println(":WEB:::No image filename found")
			w.WriteHeader(http.StatusNotFound)
			w.Write(NOTFOUND)
			return
		}

		cachePath := imageCacheFind(filename)
		if cachePath != "" {
			http.ServeFile(w, r, cachePath)
			return
		}

		trace.Printf(":WEB:::Image %s not found in cache, fetching from platform", filename)
		url := fmt.Sprintf("%s/i/%s", config.UpstreamURL, filename)
		res, err := http.Get(url)
		if err != nil {
			trace.Printf(":WEB:::Error getting image: %s", err)
			w.WriteHeader(http.StatusInternalServerError)
			w.Write(BADERR)
		} else {
			b, err := ioutil.ReadAll(res.Body)
			if err != nil {
				trace.Printf(":WEB:::Error reading image: %s", err)
				w.WriteHeader(http.StatusInternalServerError)
				w.Write(BADERR)
				return
			}
			res.Body.Close()
			if res.StatusCode >= 200 && res.StatusCode < 300 && strings.HasPrefix(res.Header.Get("Content-Type"), "image") {
				trace.Printf(":WEB:::Saving image %s to cache", filename)
				err = imageCacheWrite(filename, b)
				if err != nil {
					trace.Printf(":WEB:::Error saving image to cache: %s", err)
				}
			} else if res.StatusCode < 200 || res.StatusCode >= 300 {
				trace.Printf(":WEB:::Platform returned status code %d for image %s", res.StatusCode, filename)
			} else {
				trace.Printf(":WEB:::Image %s not found at platform, returned content type = %s", filename, res.Header.Get("Content-Type"))
				res.StatusCode = http.StatusNotFound
				b = NOTFOUND
			}

			w.Header().Set("Content-Type", res.Header.Get("Content-Type"))
			w.WriteHeader(res.StatusCode)
			w.Write(b)
		}
		return
	}

	if urlobj.Path != "" && urlobj.Path != "/" && urlobj.Path != "/api/track" && urlobj.Path != "/l" {
		encvals = decryptParams(urlobj.Path)
		if encvals == nil {
			// for reasons unexplained some clients encode the entire URL before making the request
			var err error

			strurl, err = url.PathUnescape(strurl)
			if err != nil {
				trace.Println(":WEB:::Invalid web request")
				w.WriteHeader(http.StatusBadRequest)
				w.Write(BADMETHOD)
				return
			}
			urlobj, err = url.Parse(strurl)
			if err != nil {
				trace.Println(":WEB:::Invalid web request")
				w.WriteHeader(http.StatusBadRequest)
				w.Write(BADMETHOD)
				return
			}
		} else {
			trace.Printf(":WEB:::Encoded values: %s", encvals.Encode())
		}
	}

	if encvals == nil {
		// for some reason some clients add one or more trailing slashes when requesting images...weird
		slashcnt := 0
		for i := len(strurl) - 1; i >= 0; i-- {
			if strurl[i] == '/' {
				slashcnt++
			} else {
				break
			}
		}

		if slashcnt > 0 {
			var err error
			urlobj, err = url.Parse(strurl[:len(strurl)-slashcnt])
			if err != nil {
				trace.Printf(":WEB:::Error parsing URL after removing trailing slashes: %s", err)
				w.WriteHeader(http.StatusBadRequest)
				w.Write(BADMETHOD)
				return
			}
		}
	}

	var q url.Values
	if encvals != nil {
		q = encvals
	} else {
		q = urlobj.Query()
	}

	t := q["t"]
	c := q["c"]
	u := q["u"]
	l := q["l"]
	tr := q["r"]
	p := q["p"]

	if t == nil || c == nil || u == nil {
		w.WriteHeader(http.StatusBadRequest)
		w.Write(BADPARAM)
		return
	}

	if t[0] == "" {
		w.WriteHeader(http.StatusBadRequest)
		w.Write(BADCMD)
		return
	}

	firstt := t[0][0]

	if openletters[firstt] {
		t[0] = "open"
	} else if clickletters[firstt] {
		t[0] = "click"
	} else if unsubletters[firstt] {
		t[0] = "unsub"
	} else {
		w.WriteHeader(http.StatusBadRequest)
		w.Write(BADCMD)
		return
	}

	linkid := ""
	if l != nil {
		linkid = l[0]
	}

	if c[0] != "test" {
		var sinkid, settingsid, ip string
		var ts int32
		if tr != nil {
			sinkid, settingsid, ip, ts = mainSender.FindTrackingID(tr[0])

			if settingsid == "" {
				trace.Printf(":WEB:::Cannot find values for tracking ID '%s'", tr[0])
			} else if sinkid == mainSender.GetSinkID() {
				sinkid = ""
			}
		}
		eventChan <- Event{
			Type:       t[0],
			UID:        u[0],
			CampID:     c[0],
			LinkID:     linkid,
			SettingsID: settingsid,
			SinkID:     sinkid,
			IP:         ip,
			ClientIP:   getClientIP(r),
			UserAgent:  r.Header.Get("User-Agent"),
			Timestamp:  ts,
		}
	}

	switch t[0] {
	case "open":
		w.Header().Set("Content-Type", "image/gif")
		w.Write(GIF)
	case "click", "unsub":
		if linkid == "" {
			if t[0] == "unsub" {
				w.Header().Set("Content-Type", "text/html")
				w.Write(UNSUB)
			} else {
				w.WriteHeader(http.StatusBadRequest)
				w.Write(BADPARAM)
			}
			return
		}
		var link string
		linkval, cachefound := e.linkCache.Get(linkid)
		if !cachefound {
			url := fmt.Sprintf("%s/api/links/%s", config.UpstreamURL, linkid)
			res, err := http.Get(url)
			if err != nil {
				trace.Printf(":WEB:::Error getting link: %s", err)
			} else {
				if res.StatusCode < 200 || res.StatusCode > 299 {
					trace.Printf(":WEB:::Error getting link: %s", res.Status)
				} else {
					b, err := ioutil.ReadAll(res.Body)
					if err != nil {
						trace.Printf(":WEB:::Error reading link: %s", err)
					}
					link = string(b)

					e.linkCache.Add(linkid, link)
				}
				res.Body.Close()
			}
		} else {
			link = linkval
		}

		for _, val := range p {
			loc := paramre.FindStringIndex(link)
			if loc != nil {
				link = link[:loc[0]] + val + link[loc[1]:]
			}
		}

		if link != "" {
			w.Header().Set("Location", link)
			w.WriteHeader(http.StatusMovedPermanently)
		} else if t[0] == "unsub" {
			w.Header().Set("Content-Type", "text/html")
			w.Write(UNSUB)
		} else {
			w.WriteHeader(http.StatusInternalServerError)
			w.Write(BADERR)
		}
	}
}

type handler struct {}

var lastSettings string
var lastSettingsLock sync.Mutex

func (h *handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	defer handlePanic()

	trace.Printf(":API:::%s %s %s", r.RemoteAddr, r.Method, filterBinary(r.URL.String()))

	/*
		if r.Method == "GET" {
			pprof.Index(w, r)
			return
		}*/

	if r.Method != "POST" {
		trace.Printf(":API:::Invalid method")
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte("Unknown method"))
		return
	}

	var sendaddr SendAddrCmd
	var sendlists SendListsCmd
	var settings SettingsCmd
	var settingsBytes []byte
	var cancel APICmd
	var update APICmd
	var err error
	var cmd *APICmd
	switch r.URL.Path {
	case "/settings":
		settingsBytes, err = ioutil.ReadAll(r.Body)
		defer r.Body.Close()

		if err == nil {
			err = json.Unmarshal(settingsBytes, &settings)
			cmd = &settings.APICmd
		}
	case "/send-addr":
		decoder := json.NewDecoder(r.Body)
		defer r.Body.Close()

		err = decoder.Decode(&sendaddr)
		cmd = &sendaddr.APICmd
	case "/send-lists":
		decoder := json.NewDecoder(r.Body)
		defer r.Body.Close()

		err = decoder.Decode(&sendlists)
		cmd = &sendlists.APICmd
	case "/cancel":
		decoder := json.NewDecoder(r.Body)
		defer r.Body.Close()

		err = decoder.Decode(&cancel)
		cmd = &cancel
	case "/update":
		decoder := json.NewDecoder(r.Body)
		defer r.Body.Close()

		err = decoder.Decode(&update)
		cmd = &update
	default:
		trace.Printf(":API:::Unknown command")
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte("Unknown command"))
		return
	}

	if err != nil {
		trace.Printf(":API:::Error decoding JSON: %s", err)
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte("Error decoding JSON"))
		return
	}

	if cmd.AccessKey != config.AccessKey {
		trace.Printf(":API:::Invalid access key")
		w.WriteHeader(http.StatusUnauthorized)
		w.Write([]byte("Invalid access key"))
		return
	}

	switch r.URL.Path {
	case "/send-addr":
		compileCmd(cmd)
		go sendAddr(&sendaddr)
	case "/send-lists":
		compileCmd(cmd)
		go sendLists(&sendlists)
	case "/settings":
		s := string(settingsBytes)
		lastSettingsLock.Lock()
		if s == lastSettings {
			trace.Printf(":API:::Settings are unchanged, not writing")
			lastSettingsLock.Unlock()
			return
		}
		lastSettings = s
		lastSettingsLock.Unlock()
		mainSender.SetSettings(settings.SinkID, settings.MTASettings,
			settings.IPPauses, settings.Warmups, settings.ForceStart,
			settings.IPDomains, settings.AllIPs, settings.AllSinks, settings.DKIM)
		restartSMTP(settings.IPDomains)
		trace.Printf(":API:::Finished writing settings")
	case "/update":
		compileCmd(cmd)
		allStatesLock.Lock()
		sendmap := allStates[cmd.ID]
		if sendmap != nil {
			for sendid, s := range sendmap {
				trace.Printf(":API:::Sending update to %s:%s", cmd.ID, sendid)
				s.Update(&update)
			}
		} else {
			trace.Printf(":API:::Update command received for %s, but no states found", cmd.ID)
		}
		allStatesLock.Unlock()
	case "/cancel":
		go func() {
			time.Sleep(15 * time.Second)

			allStatesLock.Lock()
			sendmap := allStates[cmd.ID]
			if sendmap != nil {
				for sendid, s := range sendmap {
					trace.Printf(":API:::Sending cancel to %s:%s", cmd.ID, sendid)
					s.Cancel()
				}
			} else {
				trace.Printf(":API:::Cancel command received for %s, but no states found", cmd.ID)
			}
			allStatesLock.Unlock()

			// wake up any sleeping goroutines so they can see if they're cancelled
			mainSender.Wakeup()
		}()
	}
}

func handlePanic() {
	if r := recover(); r != nil {
		buf := make([]byte, 4096)
		l := runtime.Stack(buf, false)

		trace.Printf(":PANIC:::%s\n%s", r, buf[:l])
		os.Exit(1)
	}
}

func removeHashAndFollowing(input string) string {
	hashIndex := strings.Index(input, "#")

	if hashIndex != -1 {
		return input[:hashIndex]
	}

	return input
}

var smtpServers []*smtpd.Server
var smtpServersLock sync.Mutex

func reusePort(network, address string, conn syscall.RawConn) error {
	return conn.Control(func(descriptor uintptr) {
		syscall.SetsockoptInt(int(descriptor), syscall.SOL_SOCKET, unix.SO_REUSEPORT, 1)
	})
}

func restartSMTP(ipdomains map[string]*IPDomains) {
	smtpServersLock.Lock()
	log.Printf("Shutting down SMTP servers")
	for _, s := range smtpServers {
		s.Shutdown(false)
	}
	smtpServers = []*smtpd.Server{}
	for ip, conf := range config.IPDomains {
		if !conf.NoMailServer {
			domain := ""
			ipdomainconfig := ipdomains[ip]
			if ipdomainconfig != nil {
				domain = ipdomainconfig.Domain
			}
			if domain == "" {
				domain = conf.Domain
			}
			if domain == "" {
				domain = "localhost.localdomain"
			}
			smtp := &smtpd.Server{
				Hostname:       domain,
				ReadTimeout:    60 * time.Second,
				WriteTimeout:   60 * time.Second,
				DataTimeout:    60 * time.Second,
				MaxConnections: 500,
				Handler:        mailHandler,
				MaxMessageSize: 10240000,
				MaxRecipients:  100,
				WelcomeMessage: fmt.Sprintf("%s ESMTP ready.", domain),
			}

			smtpServers = append(smtpServers, smtp)

			go func(s *smtpd.Server, i string) {
				defer handlePanic()

				log.Printf("Starting SMTP server for %s (%s)", i, s.Hostname)

				config := &net.ListenConfig{Control: reusePort}

				ln, err := config.Listen(context.Background(), "tcp", fmt.Sprintf("%s:25", i))
				if err != nil {
					panic(err)
				}

				err = s.Serve(ln)
				if err != smtpd.ErrServerClosed {
					panic(err)
				}
			}(smtp, ip)
		}
	}
	smtpServersLock.Unlock()
}

var sslDomains = map[string]bool{}

func loadCertificates() (*tls.Config, error) {
	certFiles, err := filepath.Glob("/conf/linkcerts/*.certificate_chain.crt")
	if err != nil {
		return nil, err
	}

	if len(certFiles) == 0 {
		return nil, nil
	}

	var certs []tls.Certificate
	for _, certFile := range certFiles {
		fileBase := strings.TrimSuffix(certFile, ".certificate_chain.crt")
		domain := filepath.Base(fileBase)
		sslDomains[domain] = true
		keyFile := fileBase + ".private.key"
		trace.Printf(":SSL:::Loading certificate for %s", domain)
		cert, err := tls.LoadX509KeyPair(certFile, keyFile)
		if err != nil {
			return nil, err
		}
		certs = append(certs, cert)
	}

	tlsConfig := &tls.Config{
		Certificates: certs,
	}

	return tlsConfig, nil
}

func RunMain() {
	rand.Seed(time.Now().UnixNano())

	newconfigfile, err := os.Open("/conf/mta.conf")
	if err == nil {
		data, err := io.ReadAll(newconfigfile)
		if err != nil {
			panic(fmt.Sprintf("Error reading mta.conf: %s", err))
		}
		var newconfig NewConfig
		err = yaml.Unmarshal([]byte(data), &newconfig)
		if err != nil {
			panic(fmt.Sprintf("Error parsing mta.conf: %s", err))
		}

		config.NoMail = newconfig.NoMail
		config.UpstreamURL = newconfig.PlatformURL
		config.MgmtIP = newconfig.ManagementIP
		config.NoTLS = !newconfig.TLSEnabled
		config.AccessKey = newconfig.MTAPassword
		config.EhloDomain = newconfig.EhloDomain
		config.UseReturnDomain = newconfig.UseReturnDomain
		config.UseFromDomain = newconfig.UseFromDomain
		config.MailGID = newconfig.MailDirectoryGID
		config.MailUID = newconfig.MailDirectoryUID

		newconfigfile.Close()

		config.IPDomains = map[string]*IPDomainConfig{}

		ipfile, err := os.Open("/conf/ipaddresses")
		if err != nil {
			panic(fmt.Sprintf("Error opening /conf/ipaddresses: %s", err))
		}
		scanner := bufio.NewScanner(ipfile)
		for scanner.Scan() {
			ip := strings.TrimSpace(removeHashAndFollowing(scanner.Text()))
			if ip != "" {
				config.IPDomains[ip] = &IPDomainConfig{}
			}
		}
		ipfile.Close()

		config.SMTPHosts = []string{}

		receivefile, err := os.Open("/conf/receiving_domains")
		if err != nil {
			panic(fmt.Sprintf("Error opening /conf/receiving_domains: %s", err))
		}
		scanner = bufio.NewScanner(receivefile)
		for scanner.Scan() {
			domain := strings.TrimSpace(removeHashAndFollowing(scanner.Text()))
			if domain != "" {
				config.SMTPHosts = append(config.SMTPHosts, domain)
			}
		}
		receivefile.Close()
	} else {
		configfile, err := os.Open("/conf/config.json")
		if err != nil {
			panic("Cannot open /conf/mta.conf or /conf/config.json for reading")
		}
		decoder := json.NewDecoder(configfile)
		err = decoder.Decode(&config)
		if err != nil {
			panic(fmt.Sprintf("Error parsing configuration file: %s", err))
		}
		configfile.Close()
	}

	if strings.HasSuffix(config.UpstreamURL, "/") {
		config.UpstreamURL = config.UpstreamURL[:len(config.UpstreamURL)-1]
	}

	config.initAllowedDomains()

	logfile := fmt.Sprintf("/logs/velocity.log")
	f, err := os.OpenFile(logfile, os.O_RDWR|os.O_CREATE|os.O_APPEND, 0666)
	if err != nil {
		panic(fmt.Sprintf("Cannot open %s for writing", logfile))
	}

	trace = log.New(io.MultiWriter(f, os.Stderr), "", log.Ldate|log.Lmicroseconds|log.Lshortfile)
	defer handlePanic()

	initImageCache()

	initTracking()

	initSendLogs()

	go runStats()

	go runQueueUpdate()

	go runLimitUpdate()

	os.Mkdir("/mail/tmp", 0644)
	os.Mkdir("/mail/cur", 0644)
	os.Mkdir("/mail/new", 0644)

	initSender()

	smtpServers = []*smtpd.Server{}

	tlsConfig, err := loadCertificates()
	if err != nil {
		panic(fmt.Sprintf("Failed to load certificates: %v", err))
	}

	for ip, conf := range config.IPDomains {
		if !conf.NoMailServer {
			domain := conf.Domain
			if domain == "" {
				domain = "localhost.localdomain"
			}
			smtp := &smtpd.Server{
				Hostname:       domain,
				ReadTimeout:    60 * time.Second,
				WriteTimeout:   60 * time.Second,
				DataTimeout:    60 * time.Second,
				MaxConnections: 500,
				Handler:        mailHandler,
				MaxMessageSize: 10240000,
				MaxRecipients:  100,
				WelcomeMessage: fmt.Sprintf("%s ESMTP ready.", domain),
			}

			smtpServers = append(smtpServers, smtp)

			go func(s *smtpd.Server, i string) {
				defer handlePanic()

				config := &net.ListenConfig{Control: reusePort}

				ln, err := config.Listen(context.Background(), "tcp", fmt.Sprintf("%s:25", i))
				if err != nil {
					panic(err)
				}

				err = s.Serve(ln)
				if err != smtpd.ErrServerClosed {
					panic(err)
				}
			}(smtp, ip)
		}
		if !conf.NoWebServer {
			cache, err := lru.NewARC[string, string](2048)
			if err != nil {
				panic(err)
			}
			eventserver := &http.Server{Addr: fmt.Sprintf("%s:80", ip), Handler: &eventHandler{linkCache: cache}}
			go func(s *http.Server) {
				defer handlePanic()
				panic(s.ListenAndServe())
			}(eventserver)

			if tlsConfig != nil {
				tlsserver := &http.Server{
					Addr:      fmt.Sprintf("%s:443", ip),
					Handler:   &eventHandler{linkCache: cache},
					TLSConfig: tlsConfig,
				}
				go func(s *http.Server) {
					defer handlePanic()
					panic(s.ListenAndServeTLS("", ""))
				}(tlsserver)
			}
		}
	}

	reloadCmds()

	cmdserver := &http.Server{Addr: fmt.Sprintf("%s:81", config.MgmtIP), Handler: &handler{}}

	trace.Println(":TRACE:::Starting")
	panic(cmdserver.ListenAndServe())
}
