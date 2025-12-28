package sender

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
	"time"
)

type QueueStatus struct {
	m         *sync.Mutex
	queueById map[string]map[string]map[string]int
}

type QueueMsg struct {
	AccessKey         string         `json:"accesskey"`
	Queue             int            `json:"queue"`
	DomainQueues      map[string]int `json:"domainqueues"`
	CompleteCampaigns []string       `json:"completecampaigns"`
}

var queuestatus QueueStatus = QueueStatus{m: &sync.Mutex{}, queueById: make(map[string]map[string]map[string]int)}

func setQueue(id, sendid, domain string, l int) {
	if l < 0 {
		l = 0
	}
	queuestatus.m.Lock()
	sendmap := queuestatus.queueById[id]
	if sendmap == nil {
		sendmap = make(map[string]map[string]int)
		queuestatus.queueById[id] = sendmap
	}
	domainmap := sendmap[sendid]
	if domainmap == nil {
		domainmap = make(map[string]int)
		sendmap[sendid] = domainmap
	}
	domainmap[domain] = l
	queuestatus.m.Unlock()
}

func runQueueUpdate() {
	defer handlePanic()

	for {
		time.Sleep(91 * time.Second)

		sinkid := mainSender.GetSinkID()
		if sinkid == "" {
			continue
		}

		msg := QueueMsg{DomainQueues: make(map[string]int)}
		queuestatus.m.Lock()
		for campid, sendmap := range queuestatus.queueById {
			campcnt := 0
			for _, domainmap := range sendmap {
				for domain, cnt := range domainmap {
					msg.Queue += cnt
					msg.DomainQueues[domain] = msg.DomainQueues[domain] + cnt
					campcnt += cnt
				}
			}
			if campcnt == 0 {
				msg.CompleteCampaigns = append(msg.CompleteCampaigns, campid)
			}
		}
		queuestatus.m.Unlock()

		msg.AccessKey = config.AccessKey

		jsonval, err := json.Marshal(&msg)
		if err != nil {
			trace.Printf(":TRACE:::Error encoding queue status: %s", err)
			continue
		}
		trace.Printf(":TRACE:::Logging queue status, queue = %d, %d complete campaigns", msg.Queue, len(msg.CompleteCampaigns))
		res, err := http.Post(fmt.Sprintf("%s/api/queue/%s", config.UpstreamURL, sinkid), "application/json", bytes.NewBuffer(jsonval))
		if err != nil {
			trace.Printf(":TRACE:::Error logging queue status: %s", err)
		} else if res.StatusCode < 200 || res.StatusCode > 299 {
			trace.Printf(":TRACE:::Error logging queue status: %s", res.Status)
		} else {
			if len(msg.CompleteCampaigns) > 0 {
				queuestatus.m.Lock()
				for _, campid := range msg.CompleteCampaigns {
					delete(queuestatus.queueById, campid)
				}
				queuestatus.m.Unlock()
			}
		}
		if err == nil {
			res.Body.Close()
		}
	}
}
