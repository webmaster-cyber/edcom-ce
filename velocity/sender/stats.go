package sender

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
	"time"
)

type IPStats struct {
	send     int
	soft     int
	hard     int
	err      int
	defermsg string
	deferlen int
	dsend    int
	dsoft    int
	dhard    int
	derr     int
}

type MTAStats map[string]*IPStats

type Stats struct {
	mtastats map[string]MTAStats
	m        *sync.Mutex
}

type StatType int

const (
	SendStat StatType = 0
	SoftStat StatType = 1
	HardStat StatType = 2
	ErrStat  StatType = 3
	NoneStat StatType = 4
)

type IPStatsMsg struct {
	SettingsID   string `json:"settingsid"`
	Key          string `json:"key"`
	Send         int    `json:"send"`
	Soft         int    `json:"soft"`
	Hard         int    `json:"hard"`
	Err          int    `json:"err"`
	DeferMsg     string `json:"defermsg"`
	DeferLen     int    `json:"deferlen"`
	DeferredSend int    `json:"dsend"`
	DeferredSoft int    `json:"dsoft"`
	DeferredHard int    `json:"dhard"`
	DeferredErr  int    `json:"derr"`
}

type StatsMsg struct {
	AccessKey string       `json:"accesskey"`
	IPStats   []IPStatsMsg `json:"ipstats"`
}

var stats Stats = Stats{m: &sync.Mutex{}, mtastats: make(map[string]MTAStats)}

func getStats(settingsid, mapkey string) *IPStats {
	mtastats, exists := stats.mtastats[settingsid]
	if !exists {
		mtastats = make(MTAStats)
		stats.mtastats[settingsid] = mtastats
	}
	ipstats, exists := mtastats[mapkey]
	if !exists {
		ipstats = &IPStats{}
		mtastats[mapkey] = ipstats
	}
	return ipstats
}

func addStat(stattype StatType, settingsid, mapkey string, deferred bool) {
	stats.m.Lock()
	s := getStats(settingsid, mapkey)
	if deferred {
		switch stattype {
		case SoftStat:
			s.dsoft++
		case HardStat:
			s.dhard++
		case ErrStat:
			s.derr++
		case SendStat:
			s.dsend++
		}
	} else {
		switch stattype {
		case SoftStat:
			s.soft++
		case HardStat:
			s.hard++
		case ErrStat:
			s.err++
		case SendStat:
			s.send++
		}
	}
	stats.m.Unlock()
}

func setDefer(settingsid, mapkey, msg string, l int) {
	stats.m.Lock()
	s := getStats(settingsid, mapkey)
	s.defermsg = msg
	s.deferlen = l
	stats.m.Unlock()
}

func runStats() {
	defer handlePanic()

	for {
		time.Sleep(1 * time.Minute)

		statsmsg := StatsMsg{}
		stats.m.Lock()
		statsmsg.IPStats = make([]IPStatsMsg, 0)
		for settingsid, mtastats := range stats.mtastats {
			for mapkey, ipstats := range mtastats {
				if ipstats.defermsg != "" || ipstats.send > 0 || ipstats.soft > 0 ||
					ipstats.hard > 0 || ipstats.err > 0 || ipstats.dsend > 0 || ipstats.dsoft > 0 ||
					ipstats.dhard > 0 || ipstats.derr > 0 {
					statsmsg.IPStats = append(statsmsg.IPStats, IPStatsMsg{
						SettingsID:   settingsid,
						Key:          mapkey,
						DeferMsg:     ipstats.defermsg,
						DeferLen:     ipstats.deferlen,
						Send:         ipstats.send,
						Soft:         ipstats.soft,
						Hard:         ipstats.hard,
						Err:          ipstats.err,
						DeferredSend: ipstats.dsend,
						DeferredSoft: ipstats.dsoft,
						DeferredHard: ipstats.dhard,
						DeferredErr:  ipstats.derr,
					})
					ipstats.defermsg = ""
					ipstats.deferlen = 0
					ipstats.send = 0
					ipstats.soft = 0
					ipstats.hard = 0
					ipstats.err = 0
					ipstats.dsend = 0
					ipstats.dsoft = 0
					ipstats.dhard = 0
					ipstats.derr = 0
				}
			}
		}
		stats.m.Unlock()

		if len(statsmsg.IPStats) > 0 {
			statsmsg.AccessKey = config.AccessKey

			jsonval, err := json.Marshal(&statsmsg)
			if err != nil {
				trace.Printf(":TRACE:::Error encoding stats: %s", err)
				continue
			}
			trace.Printf(":TRACE:::Logging %d stats", len(statsmsg.IPStats))
			res, err := http.Post(fmt.Sprintf("%s/api/stats/%s", config.UpstreamURL, mainSender.GetSinkID()), "application/json", bytes.NewBuffer(jsonval))
			if err != nil {
				trace.Printf(":TRACE:::Error logging stats: %s", err)
			} else {
				if res.StatusCode < 200 || res.StatusCode > 299 {
					trace.Printf(":TRACE:::Error logging stats: %s", res.Status)
				}
				res.Body.Close()
			}
		}
	}
}
