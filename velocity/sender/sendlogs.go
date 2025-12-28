package sender

import (
	"bufio"
	"bytes"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"net/url"
	"os"
	"path"
	"strings"
	"time"
)

func initSendLogs() {
	go sendLogs()
}

type SendLog struct {
	CampID string
	Email  string
}

type UploadResponse struct {
	Key string `json:"key"`
	URL string `json:"url"`
}

type ImportMsg struct {
	Key       string `json:"key"`
	AccessKey string `json:"accesskey"`
	CampID    string `json:"campid"`
}

type FD struct {
	w  *bufio.Writer
	fp *os.File
}

var logChan chan SendLog = make(chan SendLog, 1024*10)

func uploadFile(campid, filename string) {
	defer handlePanic()

	for {
		r, err := os.Open(filename)
		if err != nil {
			trace.Printf("%s:TRACE:::Error opening log file for reading: %s", campid, err)
			return
		}

		res, err := http.Post(fmt.Sprintf("%s/api/uploadlogfile?sinkid=%s&accesskey=%s", config.UpstreamURL, mainSender.GetSinkID(), url.QueryEscape(config.AccessKey)), "text/plain", r)
		r.Close()
		if err != nil {
			trace.Printf("%s:TRACE:::Error uploading log file: %s", campid, err)
			time.Sleep(time.Minute)
			continue
		}
		if res.StatusCode < 200 || res.StatusCode > 299 {
			trace.Printf("%s:TRACE:::Error uploading log file: %s", campid, res.Status)
			res.Body.Close()
			time.Sleep(time.Minute)
			continue
		}

		var upload UploadResponse
		err = json.NewDecoder(res.Body).Decode(&upload)
		if err != nil {
			trace.Printf("%s:TRACE:::Error parsing upload response: %s", campid, err)
			res.Body.Close()
			time.Sleep(time.Minute)
			continue
		}

		res.Body.Close()

		msg := ImportMsg{
			Key:       upload.Key,
			AccessKey: config.AccessKey,
			CampID:    campid,
		}
		var b bytes.Buffer
		json.NewEncoder(&b).Encode(&msg)

		res, err = http.Post(fmt.Sprintf("%s/api/sendlogs/%s", config.UpstreamURL, mainSender.GetSinkID()), "application/json", &b)
		if err != nil {
			trace.Printf("%s:TRACE:::Error importing log file: %s", campid, err)
			time.Sleep(time.Minute)
			continue
		}
		if res.StatusCode < 200 || res.StatusCode > 299 {
			trace.Printf("%s:TRACE:::Error importing log file: %s", campid, res.Status)
			res.Body.Close()
			time.Sleep(time.Minute)
			continue
		}
		res.Body.Close()

		trace.Printf("%s:TRACE:::Uploaded send log file %s", campid, filename)

		err = os.Remove(filename)
		if err != nil {
			trace.Printf("%s:TRACE:::Error removing log file: %s", campid, err)
		}
		break
	}
}

func sendLogs() {
	defer handlePanic()

	ticker := time.NewTicker(194 * time.Second)

	writeticker := time.NewTicker(10 * time.Second)

	files := make(map[string]*FD)

	for {
		select {
		case l := <-logChan:
			fp, ok := files[l.CampID]
			if !ok {
				f, err := os.OpenFile(fmt.Sprintf("/logs/send-%s.log", l.CampID), os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
				if err != nil {
					trace.Printf(":TRACE:::Error opening send log file: %s", err)
					files[l.CampID] = nil
				} else {
					fp = &FD{w: bufio.NewWriter(f), fp: f}
					files[l.CampID] = fp
				}
			}
			if fp != nil {
				fp.w.WriteString(l.Email)
				fp.w.WriteRune('\n')
			}
		case <-writeticker.C:
			for _, fp := range files {
				if fp != nil {
					fp.w.Flush()
				}
			}
		case <-ticker.C:
			for key, fp := range files {
				if fp != nil {
					fp.w.Flush()
					fp.fp.Close()
				}
				delete(files, key)
			}

			filenames, err := ioutil.ReadDir("/logs")
			if err != nil {
				trace.Printf(":TRACE:::Error listing log files: %s", err)
				break
			}
			for _, fileinfo := range filenames {
				filename := fileinfo.Name()

				if !strings.HasPrefix(filename, "send-") || !strings.HasSuffix(filename, ".log") {
					continue
				}

				campid := filename[5 : len(filename)-4]

				newfilename := path.Join("/logs", fmt.Sprintf("%s-%d-sending", filename, time.Now().Unix()))

				err = os.Rename(path.Join("/logs", filename), newfilename)
				if err != nil {
					trace.Printf(":TRACE:::Error renaming log file: %s", err)
					continue
				}

				go uploadFile(campid, newfilename)
			}
		}
	}
}
