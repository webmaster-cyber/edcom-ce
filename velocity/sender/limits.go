package sender

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

type LimitEntry struct {
	SettingsID string `json:"s"`
	Domain     string `json:"d"`
	IP         string `json:"i"`
	Limit      int    `json:"l"`
	Warmup     string `json:"w,omitempty"`
}

type LimitMsg struct {
	AccessKey string       `json:"accesskey"`
	Limits    []LimitEntry `json:"limits"`
}

func runLimitUpdate() {
	defer handlePanic()

	for {
		time.Sleep(259 * time.Second)

		sinkid := mainSender.GetSinkID()
		if sinkid == "" {
			continue
		}

		msg := LimitMsg{}
		mainSender.getLimits(&msg)

		msg.AccessKey = config.AccessKey

		jsonval, err := json.Marshal(&msg)
		if err != nil {
			trace.Printf(":TRACE:::Error encoding ip limits: %s", err)
			continue
		}
		trace.Printf(":TRACE:::Logging %d ip limits", len(msg.Limits))
		res, err := http.Post(fmt.Sprintf("%s/api/limits/%s", config.UpstreamURL, sinkid), "application/json", bytes.NewBuffer(jsonval))
		if err != nil {
			trace.Printf(":TRACE:::Error logging ip limits: %s", err)
		} else if res.StatusCode < 200 || res.StatusCode > 299 {
			trace.Printf(":TRACE:::Error logging ip limits: %s", res.Status)
		}
		if err == nil {
			res.Body.Close()
		}
	}
}
