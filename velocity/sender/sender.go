package sender

import (
	"bytes"
	"crypto/md5"
	"encoding/binary"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/mailru/easyjson"
	"github.com/mr-tron/base58/base58"
)

type IPSetting struct {
	Selected bool   `json:"selected"`
	MinType  string `json:"mintype"`
	MinPct   int    `json:"minpct"`
	MinNum   int    `json:"minnum"`
	SendCap  *int   `json:"sendcap"`
	SendRate *int   `json:"sendrate"`
}

type IPDomains struct {
	Domain     string `json:"domain"`
	LinkDomain string `json:"linkdomain"`
}

func (i *IPDomains) GetLinkDomain() string {
	if i.LinkDomain != "" {
		return i.LinkDomain
	}
	return i.Domain
}

type IPSettings struct {
	AllIPs    bool                  `json:"allips"`
	IPList    map[string]*IPSetting `json:"iplist"`
	Algorithm string                `json:"algorithm"`
	CapTime   string                `json:"captime"`
	SendCap   *int                  `json:"sendcap"`
	SendRate  *int                  `json:"sendrate"`
}

type MTASettings struct {
	NumConns           int                   `json:"numconns"`
	CustomNumConns     map[string]int        `json:"customnumconns"`
	RetryFor           int                   `json:"retryfor"`
	SendsPerConn       int                   `json:"sendsperconn"`
	DeferWaitSecs      []int                 `json:"deferwaitsecs"`
	CustomWaitSecs     map[string][]int      `json:"customwaitsecs"`
	ConnErrWaitSecs    []int                 `json:"connerrwaitsecs"`
	IPSettings         *IPSettings           `json:"ipsettings"`
	IPDomains          map[string]*IPDomains `json:"ipdomains"`
	Transient          map[string]bool       `json:"transient"`
	RateDefer          bool                  `json:"ratedefer"`
	RateDeferCheckMins int                   `json:"ratedefercheckmins"`
	RateDeferTarget    int                   `json:"ratedefertarget"`
	RateDeferWaitSecs  []int                 `json:"ratedeferwaitsecs"`

	capTimeParsed time.Time
	allIPs        []string
	scratchIPs    []string
}

func (s *MTASettings) initIPs() {
	s.allIPs = make([]string, 0, len(s.IPDomains))
	s.scratchIPs = make([]string, 0, len(s.IPDomains))

	for ip := range s.IPDomains {
		s.allIPs = append(s.allIPs, ip)
	}
}

func (s *MTASettings) getMXSuffix(mx string) string {
	lastdot := strings.LastIndexByte(mx, '.')
	if lastdot == len(mx)-1 {
		mx = mx[:len(mx)-1]
		lastdot = strings.LastIndexByte(mx, '.')
	}
	for m := range s.CustomNumConns {
		if strings.HasSuffix(mx, m) {
			return m
		}
		ok, _ := filepath.Match(m, mx)
		if ok {
			return m
		}
	}

	if lastdot == -1 {
		return mx
	}

	seconddot := strings.LastIndexByte(mx[:lastdot], '.')

	if seconddot == -1 {
		return mx
	}

	return mx[seconddot+1:]
}

func (s *MTASettings) getNumConns(mxsuffix string) int {
	numconns, ok := s.CustomNumConns[mxsuffix]
	if ok {
		return numconns
	}
	return s.NumConns
}

func (s *MTASettings) getBoundary() (time.Time, time.Time) {
	var boundary time.Time

	now := time.Now()

	boundary = s.capTimeParsed.In(now.Location())

	boundary = time.Date(now.Year(), now.Month(), now.Day(),
		boundary.Hour(), boundary.Minute(), boundary.Second(), boundary.Nanosecond(),
		boundary.Location())

	return boundary, now
}

func (s *MTASettings) sendRate(mapkey string) int {
	if !s.IPSettings.AllIPs && len(s.IPSettings.IPList) > 0 {
		limit := -1
		ind := strings.IndexRune(mapkey, ':')
		ip := mapkey[ind+1:]
		setting := s.IPSettings.IPList[ip]
		if setting != nil && setting.Selected && setting.SendRate != nil {
			limit = *setting.SendRate
		}
		return limit
	} else {
		globallimit := -1
		if s.IPSettings.SendRate != nil {
			globallimit = *s.IPSettings.SendRate
		}
		return globallimit
	}
}

func (s *MTASettings) ipLimit(mapkey string) int {
	if !s.IPSettings.AllIPs && len(s.IPSettings.IPList) > 0 {
		limit := -1
		ind := strings.IndexRune(mapkey, ':')
		ip := mapkey[ind+1:]
		setting := s.IPSettings.IPList[ip]
		if setting != nil && setting.Selected && setting.SendCap != nil {
			limit = *setting.SendCap
		}
		return limit
	} else {
		globallimit := -1
		if s.IPSettings.SendCap != nil {
			globallimit = *s.IPSettings.SendCap
		}
		return globallimit
	}
}

func (s *MTASettings) parseTime() {
	dt, err := time.Parse(time.RFC3339, s.IPSettings.CapTime)
	if err == nil {
		s.capTimeParsed = dt
	}
}

func (s *Sender) warmupLimit(mapkey string) (int, string) {
	var warmup *Warmup
	var warmupid string

	ind := strings.IndexRune(mapkey, ':')
	domain := mapkey[:ind]
	ip := mapkey[ind+1:]

	for id, w := range s.Warmups {
		if w.Disabled || !w.hasIP(ip) || !w.hasDomain(domain) {
			continue
		}

		if warmup == nil || w.Priority == "high" ||
			(w.Priority == "med" && warmup.Priority == "low") {
			warmup = w
			warmupid = id
		}
	}

	if warmup == nil {
		return -1, ""
	}

	r := warmup.currentLimit(mapkey)
	if r < 0 {
		return -1, ""
	}

	return r, warmupid
}

const stateFile string = "/conf/globalState.json"
const stateFileTmp string = "/conf/globalState.json.tmp"

type SenderConnMap map[uint64]*SenderConn

type SenderConns struct {
	idle         SenderConnMap
	busy         SenderConnMap
	dynamicLimit int
}

type SendLimits struct {
	limitLogged          bool
	lastAttempt          time.Time
	LastCheck            time.Time `json:"lastcheck"`
	SendCount            int       `json:"sendcount"`
	SendCountHour        int       `json:"sendcounthour"`
	DeliveredCount       int       `json:"deliveredcount"`
	PrevDelivered        []int     `json:"prevdelivered"`
	DeliveredCountMinute int       `json:"deliveredcountminute"`
	PrevDeliveredMinutes []int     `json:"prevdeliveredminutes"`
	DeferUntil           time.Time `json:"deferuntil"`
	DeferError           bool      `json:"defererr"`
	DeferRate            bool      `json:"deferrate"`
	DeferMatch           string    `json:"defermatch"`
	DeferCount           int       `json:"defercount"`
}

func (s *Sender) addSent(delivered bool, limits *SendLimits) {
	limits.SendCount++
	limits.SendCountHour++
	if delivered {
		limits.DeliveredCount++
		limits.DeliveredCountMinute++
	}
}

func (s *Sender) overLimit(mapkey string, mta *MTA, limits *SendLimits, busycnt int) bool {
	boundary, now := mta.Settings.getBoundary()

	if limits.LastCheck.Before(boundary) && (now.After(boundary) || now.Equal(boundary)) {
		if limits.PrevDelivered == nil {
			limits.PrevDelivered = []int{limits.DeliveredCount}
		} else {
			limits.PrevDelivered = append(limits.PrevDelivered, 0)
			copy(limits.PrevDelivered[1:], limits.PrevDelivered[0:])
			limits.PrevDelivered[0] = limits.DeliveredCount

			if len(limits.PrevDelivered) > 30 {
				limits.PrevDelivered = limits.PrevDelivered[:30]
			}
		}

		limits.SendCount = 0
		limits.DeliveredCount = 0

		ind := strings.IndexRune(mapkey, ':')
		domain := mapkey[:ind]
		ip := mapkey[ind+1:]

		for wid, w := range s.Warmups {
			if w.Disabled || !w.hasIP(ip) || !w.hasDomain(domain) {
				continue
			}

			threshold := int(float64(w.currentLimit(mapkey)) * float64(w.Threshold) * 0.01)

			thresholdmet := 0
			for ; thresholdmet < w.ThresholdDays; thresholdmet++ {
				if thresholdmet >= len(limits.PrevDelivered) {
					break
				}
				if limits.PrevDelivered[thresholdmet] < threshold {
					break
				}
			}
			if thresholdmet >= w.ThresholdDays {
				trace.Printf(":TRACE:::Adding increment to warmup %s for key %s", wid, mapkey)
				w.addIncrement(mapkey)
			}
		}
	}

	nowhr := time.Date(now.Year(), now.Month(), now.Day(), now.Hour(), 0, 0, 0, now.Location())
	lastcheckhr := time.Date(limits.LastCheck.Year(), limits.LastCheck.Month(), limits.LastCheck.Day(),
		limits.LastCheck.Hour(), 0, 0, 0, limits.LastCheck.Location())
	if nowhr.After(lastcheckhr) {
		limits.SendCountHour = 0
	}

	limits.LastCheck = now

	sendrate := mta.Settings.sendRate(mapkey)
	if sendrate >= 0 {
		if (limits.SendCountHour + busycnt) >= sendrate {
			return true
		}
	}

	lim, _ := s.warmupLimit(mapkey)
	if lim < 0 {
		lim = mta.Settings.ipLimit(mapkey)
	}

	if lim >= 0 && (limits.SendCount+busycnt) >= lim {
		if !limits.limitLogged {
			if now.After(boundary) || now.Equal(boundary) {
				boundary = boundary.Add(24 * time.Hour)
			}
			trace.Printf(":TRACE:::Limit hit for %s, sleeping until %s", mapkey, boundary)
			limits.limitLogged = true
		}
		return true
	} else {
		limits.limitLogged = false
		return false
	}
}

type ConnKey struct {
	IP       string
	MXSuffix string
}

type MTA struct {
	IPLimits map[string]*SendLimits `json:"iplimits"`
	IPPauses map[string]bool        `json:"ippauses"`

	Settings        *MTASettings                 `json:"settings"`
	TrackingIDs     map[string]string            `json:"trackingids"`
	SinkTrackingIDs map[string]map[string]string `json:"sinktrackingids"`

	ipConns map[ConnKey]*SenderConns
}

func (m *MTA) shutdown() {
	for _, ipconns := range m.ipConns {
		for _, conn := range ipconns.idle {
			conn.finish()
		}
	}
}

type Sender struct {
	MTAs    map[string]*MTA    `json:"mtas"`
	SinkID  string             `json:"sinkid"`
	Warmups map[string]*Warmup `json:"warmups"`
	DKIM    *DKIMSettings      `json:"dkim"`

	lock          sync.Mutex
	lastSave      time.Time
	nextConnID    uint64
	connAvailable *sync.Cond
	trackingIDs   map[string][]string
}

var mainSender *Sender

func initSender() {
	mainSender = &Sender{MTAs: make(map[string]*MTA), Warmups: make(map[string]*Warmup), trackingIDs: make(map[string][]string)}
	mainSender.connAvailable = sync.NewCond(&mainSender.lock)

	mainSender.loadState()

	go mainSender.checkIdle()
}

func (s *Sender) getLimits(msg *LimitMsg) {
	s.lock.Lock()
	for mtaid, mta := range s.MTAs {
		for mapkey := range mta.IPLimits {
			ind := strings.IndexRune(mapkey, ':')
			domain := mapkey[:ind]
			ip := mapkey[ind+1:]

			lim, wid := s.warmupLimit(mapkey)

			if lim < 0 {
				lim = mta.Settings.ipLimit(mapkey)
				wid = ""
			}

			if lim >= 0 {
				msg.Limits = append(msg.Limits, LimitEntry{
					SettingsID: mtaid,
					Domain:     domain,
					IP:         ip,
					Limit:      lim,
					Warmup:     wid,
				})
			}
		}
	}
	s.lock.Unlock()
}

func (s *Sender) checkIdle() {
	defer handlePanic()

	lastWake := time.Now()

	for {
		s.lock.Lock()
		now := time.Now()
		fm := now.Add(-4 * time.Second)

		ismin := now.Sub(lastWake) >= time.Minute
		if ismin {
			lastWake = now
		}

		var founddefer bool
		for settingsid, mta := range s.MTAs {
			for mapkey, limits := range mta.IPLimits {
				if !limits.DeferUntil.IsZero() && limits.DeferUntil.Before(now) {
					limits.DeferUntil = time.Time{}
					founddefer = true
					// if false = disable rate deferral for now
				} else if false && mta.Settings.RateDefer && ismin && (limits.DeferUntil.IsZero() || !limits.DeferRate) && !s.overLimit(mapkey, mta, limits, 0) {
					if limits.PrevDeliveredMinutes == nil {
						limits.PrevDeliveredMinutes = []int{limits.DeliveredCountMinute}
					} else {
						limits.PrevDeliveredMinutes = append(limits.PrevDeliveredMinutes, 0)
						copy(limits.PrevDeliveredMinutes[1:], limits.PrevDeliveredMinutes[0:])
						limits.PrevDeliveredMinutes[0] = limits.DeliveredCountMinute

						if len(limits.PrevDeliveredMinutes) > mta.Settings.RateDeferCheckMins {
							limits.PrevDeliveredMinutes = limits.PrevDeliveredMinutes[:mta.Settings.RateDeferCheckMins]
						}
					}

					limits.DeliveredCountMinute = 0

					if len(limits.PrevDeliveredMinutes) == mta.Settings.RateDeferCheckMins {
						total := 0
						for _, m := range limits.PrevDeliveredMinutes {
							total += m
						}
						if total < mta.Settings.RateDeferTarget &&
							time.Since(limits.lastAttempt) < time.Duration(mta.Settings.RateDeferCheckMins)*time.Minute {
							limits.PrevDeliveredMinutes = limits.PrevDeliveredMinutes[:0]

							if !limits.DeferRate {
								limits.DeferCount = 0
								limits.DeferError = false
								limits.DeferMatch = ""
								limits.DeferRate = true
							} else {
								limits.DeferCount++
							}

							waitsecs := mta.Settings.RateDeferWaitSecs
							cnt := limits.DeferCount
							if cnt >= len(waitsecs) {
								cnt = len(waitsecs) - 1
							}
							deferlen := waitsecs[cnt]

							if deferlen > 0 {
								defertime := now.Add(time.Duration(deferlen) * time.Second)

								if defertime.After(limits.DeferUntil) {
									setDefer(settingsid, mapkey, fmt.Sprintf("Rate deferral: failed to deliver %d messages in %d minutes", mta.Settings.RateDeferTarget, mta.Settings.RateDeferCheckMins), deferlen)

									ind := strings.IndexRune(mapkey, ':')
									domain := mapkey[:ind]
									ip := mapkey[ind+1:]
									trace.Printf(":TRACE::%s:Deferred %s for %d seconds (send rate too low)", ip, domain, deferlen)
									limits.DeferUntil = defertime

									s.saveState()
								}
							}
						}
					}
				}
			}
			for connkey, ipconns := range mta.ipConns {
				diff := mta.Settings.getNumConns(connkey.MXSuffix) - (len(ipconns.busy) + len(ipconns.idle))
				for ; diff > 0 && len(ipconns.idle) > 0; diff-- {
					for cid, conn := range ipconns.idle {
						conn.finish()
						delete(ipconns.idle, cid)
						break
					}
				}

				for ip, conn := range ipconns.idle {
					if conn.lastUsed.Before(fm) {
						conn.finish()
						delete(ipconns.idle, ip)
					}
				}
			}
		}
		if founddefer || ismin {
			s.connAvailable.Broadcast()
		}
		s.lock.Unlock()
		time.Sleep(time.Second)
	}
}

func (s *Sender) loadState() {
	if _, err := os.Stat(stateFile); err == nil {
		fp, err := os.Open(stateFile)
		if err != nil {
			trace.Printf(":ERROR:::%s", err)
			return
		}
		defer fp.Close()

		err = easyjson.UnmarshalFromReader(fp, s)
		if err != nil {
			trace.Printf(":ERROR:::%s", err)
		}
		for settingsid, mta := range s.MTAs {
			mta.Settings.parseTime()
			mta.Settings.initIPs()
			for ip, trackingid := range mta.TrackingIDs {
				s.trackingIDs[trackingid] = []string{"", settingsid, ip}
			}
			for sinkid, sinkmap := range mta.SinkTrackingIDs {
				for ip, trackingid := range sinkmap {
					s.trackingIDs[trackingid] = []string{sinkid, settingsid, ip}
				}
			}
		}
		if s.DKIM != nil {
			s.DKIM.compile()
		}
	}
}

func (s *Sender) ProcessResult(settingsid string, mapkey string, connkey ConnKey, connid uint64, result ConnResult, ud UserData) {
	s.lock.Lock()

	mta := s.getMTA(settingsid)
	if mta == nil {
		// someone deleted the MTA...not a big deal
		s.lock.Unlock()
		return
	}

	connmap := mta.ipConns[connkey]

	if connmap != nil {
		conn := connmap.busy[connid]

		delete(connmap.busy, connid)

		if conn.conn != nil {
			connmap.idle[connid] = conn
		}
	}

	now := time.Now()

	ind := strings.IndexRune(mapkey, ':')
	domain := mapkey[:ind]
	ip := mapkey[ind+1:]

	limits := mta.IPLimits[mapkey]
	if result.deferflag {
		if !result.transient {
			settings := mta.Settings

			var waitsecs []int
			if result.defererror {
				waitsecs = settings.ConnErrWaitSecs
			} else if result.defermatch == "" {
				waitsecs = settings.DeferWaitSecs
			} else {
				waitsecs = settings.DeferWaitSecs
				for k, v := range settings.CustomWaitSecs {
					if result.defermatch == k {
						waitsecs = v
						break
					}
				}
			}

			var cnt int
			if limits.DeferRate || limits.DeferError != result.defererror || limits.DeferMatch != result.defermatch {
				cnt = 0
			} else {
				cnt = limits.DeferCount
			}
			if cnt >= len(waitsecs) {
				cnt = len(waitsecs) - 1
			}
			deferlen := waitsecs[cnt]

			if deferlen > 0 {
				defertime := now.Add(time.Duration(deferlen) * time.Second)

				if defertime.After(limits.DeferUntil) {
					if !result.nolog {
						setDefer(settingsid, mapkey, result.defermsg, deferlen)
					}
					if limits.DeferUntil.Before(now) {
						trace.Printf(":TRACE::%s:Deferred %s for %d seconds", ip, domain, deferlen)

						if limits.DeferRate || limits.DeferError != result.defererror || limits.DeferMatch != result.defermatch {
							limits.DeferCount = 0
							limits.DeferError = result.defererror
							limits.DeferMatch = result.defermatch
							limits.DeferRate = false
						}
						limits.DeferCount++
					}
					limits.DeferUntil = defertime
				}
			}
		}
	}

	isdeferred := false
	if limits.DeferUntil.After(now) {
		isdeferred = true

		if connmap != nil {
			for cid, conn := range connmap.idle {
				conn.finish()
				delete(connmap.idle, cid)
			}
		}
	}

	if result.stattype != NoneStat && !ud.IsTest() {
		addStat(result.stattype, settingsid, mapkey, isdeferred)
	}

	if !result.retry {
		delivered := result.defermsg == ""
		s.addSent(delivered, limits)

		if delivered {
			limits.DeferCount = 0

			if connmap != nil {
				if !isdeferred &&
					connmap.dynamicLimit < mta.Settings.getNumConns(connkey.MXSuffix) {
					trace.Printf(":TRACE::%s:Increased limit for %s to %d", ip, domain, connmap.dynamicLimit)
					connmap.dynamicLimit++
				}
			}
		}
	} else if connmap != nil && connmap.dynamicLimit > 1 {
		connmap.dynamicLimit = 1
		trace.Printf(":TRACE::%s:Reset limit for %s to 1", ip, domain)
	}

	if s.lastSave.IsZero() || now.Sub(s.lastSave) > (200*time.Millisecond) {
		s.saveState()
	}

	s.connAvailable.Broadcast()

	s.lock.Unlock()
}

func (s *Sender) Wakeup() {
	s.connAvailable.Broadcast()
}

func (s *Sender) GetSettings(settingsid string) *MTASettings {
	s.lock.Lock()
	r := s.getMTA(settingsid).Settings
	s.lock.Unlock()
	return r
}

func (s *Sender) getMTA(settingsid string) *MTA {
	var mta *MTA
	if settingsid == "" {
		for _, m := range s.MTAs {
			mta = m
			break
		}
	} else {
		mta = s.MTAs[settingsid]
	}
	return mta
}

func (s *Sender) GetConn(settingsid string, ud UserData, campid string, mxindex int, cancelcb func() bool) (bool, error, string, ConnKey, uint64, *SenderConn, *MTASettings) {
	s.lock.Lock()
	defer s.lock.Unlock()

	emptyconnkey := ConnKey{}

	mta := s.getMTA(settingsid)
	if mta == nil {
		trace.Printf(":ERROR:::Cannot find MTA with id '%s'", settingsid)
		return true, errors.New("cannot find MTA"), "", emptyconnkey, 0, nil, nil
	}

	ipsettings := mta.Settings.IPSettings

	email := ud.GetField("Email", "")
	domain := email[strings.IndexRune(email, '@')+1:]

	for {
		// what IPs are available...
		availIPs := mta.Settings.allIPs
		if !ipsettings.AllIPs && len(ipsettings.IPList) > 0 {
			mta.Settings.scratchIPs = mta.Settings.scratchIPs[:0]
			if ipsettings.Algorithm == "" {
				for ip, setting := range ipsettings.IPList {
					_, found := mta.Settings.IPDomains[ip]
					if found && setting.Selected {
						mta.Settings.scratchIPs = append(mta.Settings.scratchIPs, ip)
					}
				}
				availIPs = mta.Settings.scratchIPs
			} else {
				// otherwise need a list of IPs which haven't met their minimum target.
				// if this list is empty, check all
				totalsent := 0
				for mapkey, limits := range mta.IPLimits {
					ind := strings.IndexRune(mapkey, ':')
					if mapkey[:ind] == domain {
						totalsent += limits.SendCount
					}
				}

				foundselected := false
				for ip, setting := range ipsettings.IPList {
					_, found := mta.Settings.IPDomains[ip]
					if found && setting.Selected {
						foundselected = true

						mapkey := fmt.Sprintf("%s:%s", domain, ip)
						limits, exists := mta.IPLimits[mapkey]
						sent := 0
						if exists {
							sent = limits.SendCount
						}
						var sendtarget float64
						if setting.MinType == "pct" {
							sendtarget = float64(totalsent) * (float64(setting.MinPct) / 100.0)
						} else {
							sendtarget = float64(setting.MinNum)
						}

						if float64(sent) < sendtarget {
							mta.Settings.scratchIPs = append(mta.Settings.scratchIPs, ip)
						}
					}
				}

				if !foundselected || len(mta.Settings.scratchIPs) > 0 {
					availIPs = mta.Settings.scratchIPs
				}
			}
		}

		for _, ip := range availIPs {
			mapkey := fmt.Sprintf("%s:%s", domain, ip)

			discard, ok := mta.IPPauses[mapkey]
			if ok {
				if !discard {
					continue
				} else {
					return true, errors.New("message discarded"), "", emptyconnkey, 0, nil, nil
				}
			}

			limits, exists := mta.IPLimits[mapkey]

			if !exists {
				limits = &SendLimits{}
				if mta.IPLimits == nil {
					mta.IPLimits = make(map[string]*SendLimits)
				}
				mta.IPLimits[mapkey] = limits
			}

			if limits.DeferUntil.Before(time.Now()) {
				var err error
				var mxhosts []string
				var permanent bool

				mxhosts, err, permanent = LookupMX(domain)
				if err != nil || mxindex >= len(mxhosts) {
					if mxindex >= len(mxhosts) {
						err = errors.New("failed to connect to any servers listed in MX record")
						permanent = true
					}

					errtype := "soft"
					errtypeupper := "SOFT"
					stattype := SoftStat
					eventEmail := email

					if !permanent {
						errtype = "err"
						errtypeupper = "ERR"
						stattype = ErrStat
						eventEmail = ""
					}
					trace.Printf("%s:%s:%s:%s:DNS Error: %s", campid, errtypeupper, email, ip, err)
					if !ud.IsTest() {
						addStat(stattype, settingsid, mapkey, false)
						eventChan <- Event{
							Type:       errtype,
							Email:      eventEmail,
							CampID:     campid,
							SettingsID: settingsid,
							IP:         ip,
							Domain:     domain,
							Msg:        filterMsg(err.Error(), email, ip, ""),
						}
						if permanent {
							s.addSent(false, limits)
						}

					}
					return permanent, err, mapkey, emptyconnkey, 0, nil, mta.Settings
				}

				mxdomain := mxhosts[mxindex]

				key := ConnKey{IP: ip, MXSuffix: mta.Settings.getMXSuffix(mxdomain)}

				conns, exists := mta.ipConns[key]

				if !exists {
					conns = &SenderConns{idle: make(SenderConnMap), busy: make(SenderConnMap), dynamicLimit: 1}
					if mta.ipConns == nil {
						mta.ipConns = make(map[ConnKey]*SenderConns)
					}
					mta.ipConns[key] = conns
				}

				if !s.overLimit(mapkey, mta, limits, len(conns.busy)) {
					for connid, conn := range conns.idle {
						if conn.mxdomain == mxdomain {
							conns.busy[connid] = conn
							delete(conns.idle, connid)
							conn.lastUsed = time.Now()
							limits.lastAttempt = conn.lastUsed
							return false, nil, mapkey, key, connid, conn, mta.Settings
						}
					}
					if (len(conns.idle) + len(conns.busy)) < conns.dynamicLimit {
						s.nextConnID++
						conn := newSenderConn(ip, mxdomain)
						conns.busy[s.nextConnID] = conn
						conn.lastUsed = time.Now()
						limits.lastAttempt = conn.lastUsed
						return false, nil, mapkey, key, s.nextConnID, conn, mta.Settings
					}
				}
			}
		}
		s.connAvailable.Wait()

		if cancelcb != nil && cancelcb() {
			return true, errors.New("canceled"), "", emptyconnkey, 0, nil, nil
		}
	}
}

func (s *Sender) GetSinkID() string {
	s.lock.Lock()
	sinkid := s.SinkID
	s.lock.Unlock()
	return sinkid
}

func (s *Sender) saveState() {
	fp, err := os.Create(stateFileTmp)
	if err != nil {
		trace.Printf(":TRACE:::Error: %s", err)
		return
	}
	defer fp.Close()

	_, err = easyjson.MarshalToWriter(s, fp)
	if err != nil {
		trace.Printf(":TRACE:::Error: %s", err)
		return
	}

	os.Rename(stateFileTmp, stateFile)

	s.lastSave = time.Now()
}

func (s *Sender) SetSettings(sinkid string, mtaSettings map[string]*MTASettings,
	ippauses []*IPPause, warmups map[string]*Warmup, forcestart []*IPPause,
	ipdomains map[string]*IPDomains, allips []string, allsinks []string, dkim *DKIMSettings) {

	allowedLock.Lock()
	allowedMailDomains = make(map[string]bool)
	config.initAllowedDomains()
	for _, d := range ipdomains {
		allowedMailDomains[d.Domain] = true
	}
	allowedLock.Unlock()

	s.lock.Lock()
	s.SinkID = sinkid
	s.DKIM = dkim
	if s.DKIM != nil {
		s.DKIM.compile()
	}

	for id, settings := range mtaSettings {
		settings.IPDomains = ipdomains

		settings.parseTime()
		settings.initIPs()

		mta := s.MTAs[id]
		if mta == nil {
			mta = &MTA{Settings: settings, ipConns: make(map[ConnKey]*SenderConns), TrackingIDs: make(map[string]string), SinkTrackingIDs: make(map[string]map[string]string)}
			s.MTAs[id] = mta
		} else {
			mta.Settings = settings
		}

		mta.IPPauses = make(map[string]bool)
		for _, pause := range ippauses {
			if pause.SettingsID == id {
				mta.IPPauses[fmt.Sprintf("%s:%s", pause.DomainGroupID, pause.IP)] = pause.Discard
			}
		}
		for _, force := range forcestart {
			if force.SettingsID == id {
				mapkey := fmt.Sprintf("%s:%s", force.DomainGroupID, force.IP)
				limits := mta.IPLimits[mapkey]
				if limits != nil {
					limits.DeferUntil = time.Time{}
				}
			}
		}
	}
	for id, mta := range s.MTAs {
		_, ok := mtaSettings[id]
		if !ok {
			mta.shutdown()
			delete(s.MTAs, id)
		}
	}
	if s.Warmups == nil {
		s.Warmups = make(map[string]*Warmup)
	}
	for id, warmup := range warmups {
		e := s.Warmups[id]
		if e != nil {
			warmup.Increments = e.Increments
		}
		s.Warmups[id] = warmup
	}
	for id := range s.Warmups {
		_, ok := warmups[id]
		if !ok {
			delete(s.Warmups, id)
		}
	}

	s.generateTrackingIDs(allips, allsinks)
	s.saveState()

	s.connAvailable.Broadcast()

	s.lock.Unlock()
}

func (s *Sender) generateTrackingID(sinkid, settingsid, ip string) string {
	l := len(settingsid) + 1 + len(ip)
	if len(sinkid) > 0 {
		l += len(sinkid) + 1
	}
	buf := make([]byte, l)

	index := 0
	if len(sinkid) > 0 {
		copy(buf, sinkid)
		index += len(sinkid)
		buf[index] = ':'
		index++
	}

	copy(buf[index:], settingsid)
	index += len(settingsid)
	buf[index] = ':'
	index++
	copy(buf[index:], ip)

	hash := md5.New()
	hash.Write(buf)

	return base58.Encode(hash.Sum(nil)[:12])
}

func (s *Sender) generateTrackingIDs(allips, allsinks []string) {
	for settingsid, mta := range s.MTAs {
		if mta.TrackingIDs == nil {
			mta.TrackingIDs = make(map[string]string)
		}
		if mta.SinkTrackingIDs == nil {
			mta.SinkTrackingIDs = make(map[string]map[string]string)
		}
		for _, ip := range allips {
			_, ok := mta.TrackingIDs[ip]
			if !ok {
				id := s.generateTrackingID("", settingsid, ip)
				mta.TrackingIDs[ip] = id
				s.trackingIDs[id] = []string{"", settingsid, ip}
			}
			for _, sinkid := range allsinks {
				sinkmap, ok := mta.SinkTrackingIDs[sinkid]
				if !ok {
					sinkmap = make(map[string]string)
					mta.SinkTrackingIDs[sinkid] = sinkmap
				}
				_, ok = sinkmap[ip]
				if !ok {
					id := s.generateTrackingID(sinkid, settingsid, ip)
					sinkmap[ip] = id
					s.trackingIDs[id] = []string{sinkid, settingsid, ip}
				}
			}
		}
	}
}

var MailTimeEpoch time.Time = time.Date(2018, time.July, 30, 0, 0, 0, 0, time.UTC)

func (s *Sender) GetTrackingID(sinkid, settingsid, ip string) string {
	s.lock.Lock()
	defer s.lock.Unlock()
	sinkmap := s.MTAs[settingsid].SinkTrackingIDs
	if sinkmap == nil {
		return ""
	}
	trackingids := sinkmap[sinkid]
	if trackingids == nil {
		return ""
	}

	t := int32(time.Since(MailTimeEpoch).Hours())
	buf := bytes.NewBuffer(make([]byte, 0, 4))
	binary.Write(buf, binary.BigEndian, t)

	r := fmt.Sprintf("%s-%s", trackingids[ip], base58.Encode(buf.Bytes()))
	return r
}

func (s *Sender) FindTrackingID(trackingid string) (string, string, string, int32) {
	s.lock.Lock()

	var ts int32

	dashindex := strings.IndexRune(trackingid, '-')
	if dashindex > -1 {
		tsencoded := trackingid[dashindex+1:]
		trackingid = trackingid[:dashindex]

		tsbytes, err := base58.Decode(tsencoded)
		if err == nil {
			err = binary.Read(bytes.NewBuffer(tsbytes), binary.BigEndian, &ts)
			if err != nil {
				trace.Printf(":TRACE:::Error reading ts bytes: %s", err)
			}
		} else {
			trace.Printf(":TRACE:::Error decoding ts: %s", err)
		}
	}

	r := s.trackingIDs[trackingid]
	if r == nil {
		s.lock.Unlock()
		return "", "", "", ts
	}
	s.lock.Unlock()
	return r[0], r[1], r[2], ts
}
