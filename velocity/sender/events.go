package sender

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"time"
)

type Event struct {
	Type       string `json:"t,omitempty"`
	UID        string `json:"u,omitempty"`
	Email      string `json:"e,omitempty"`
	CampID     string `json:"c,omitempty"`
	SettingsID string `json:"s,omitempty"`
	SinkID     string `json:"k,omitempty"`
	LinkID     string `json:"l,omitempty"`
	IP         string `json:"i,omitempty"`
	Timestamp  int32  `json:"ts,omitempty"`
	Domain     string `json:"d,omitempty"`
	Msg        string `json:"m,omitempty"`
	ClientIP   string `json:"p,omitempty"`
	UserAgent  string `json:"a,omitempty"`
	Count      int    `json:"n,omitempty"`
}

type EventMsg struct {
	AccessKey  string  `json:"accesskey"`
	Events     []Event `json:"events"`
	StatEvents []Event `json:"statevents"`
}

const eventFile string = "/conf/savedEvents.json"
const eventFileTmp string = "/conf/savedEvents.json.tmp"

var eventChan chan Event = make(chan Event, 1024*10)

func initTracking() {
	go sendEvents()
}

func sendEvents() {
	defer handlePanic()

	var events []Event
	var statevents []Event

	var buffer bytes.Buffer

	encoder := json.NewEncoder(&buffer)

	loadEvents(&events)

	ticker := time.NewTicker(123 * time.Second)

	for {
		to := false
		select {
		case ev := <-eventChan:
			switch ev.Type {
			case "send", "err", "defer":
				found := false
				l := len(statevents)
				for i := 0; i < l; i++ {
					exist := &statevents[l-1-i]
					ev.Count = exist.Count
					if *exist == ev {
						exist.Count++
						found = true
						break
					}
				}
				if !found {
					ev.Count = 1
					statevents = append(statevents, ev)
				}
			default:
				ev.Count = 1
				events = append(events, ev)
			}
		case <-ticker.C:
			to = true
			break
		}

		if (len(events)+len(statevents)) >= 1024 || ((len(events)+len(statevents)) > 0 && to) {
			msg := EventMsg{AccessKey: config.AccessKey, Events: events, StatEvents: statevents}
			encoder.Encode(&msg)

			st := time.Now()

			res, err := http.Post(fmt.Sprintf("%s/api/events/%s", config.UpstreamURL, mainSender.GetSinkID()), "application/json", &buffer)

			if err != nil {
				trace.Printf(":TRACE:::Error logging events: %s", err)
			} else if res.StatusCode < 200 || res.StatusCode > 299 {
				trace.Printf(":TRACE:::Error logging events: %s", res.Status)
			} else {
				trace.Printf(":TRACE:::Logged %d events, %d statevents in %s", len(events), len(statevents), time.Since(st))
			}

			if err == nil {
				res.Body.Close()
			}

			events = events[:0]
			statevents = statevents[:0]
			buffer.Reset()

			os.Remove(eventFile)
		} else if len(events) > 0 {
			saveEvents(events)
		}
	}
}

func loadEvents(events *[]Event) {
	if _, err := os.Stat(eventFile); err == nil {
		fp, err := os.Open(eventFile)
		if err != nil {
			trace.Printf(":ERROR:::%s", err)
			return
		}
		defer fp.Close()

		decoder := json.NewDecoder(fp)
		err = decoder.Decode(events)
		if err != nil {
			trace.Printf(":ERROR:::%s", err)
		}

		os.Remove(eventFile)
	}
}

func saveEvents(events []Event) {
	fp, err := os.Create(eventFileTmp)
	if err != nil {
		trace.Printf(":TRACE:::Error: %s", err)
		return
	}
	defer fp.Close()

	enc := json.NewEncoder(fp)
	enc.SetIndent("", "  ")
	err = enc.Encode(events)
	if err != nil {
		trace.Printf(":TRACE:::Error: %s", err)
		return
	}

	os.Rename(eventFileTmp, eventFile)
}
