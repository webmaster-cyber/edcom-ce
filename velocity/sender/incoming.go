package sender

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"github.com/chrj/smtpd"
	"os"
	"strings"
	"sync"
)

var allowedMailDomains map[string]bool = make(map[string]bool)

var allowedLock sync.Mutex

func mailHandler(peer smtpd.Peer, env smtpd.Envelope) error {
	defer handlePanic()

	trace.Printf(":MAIL:::Incoming from %s to %v via %s (%v)", env.Sender, env.Recipients, peer.HeloName, peer.Addr)

	allowedLock.Lock()

	for _, rcpt := range env.Recipients {
		trimmed := strings.TrimSpace(rcpt)
		ind := strings.IndexRune(trimmed, '@')
		if ind < 0 || !allowedMailDomains[trimmed[ind+1:]] {
			trace.Println(":MAIL:::Mail rejected, invalid recipient domain")
			allowedLock.Unlock()
			return &smtpd.Error{Code: 551, Message: "Invalid recipient domain"}
		}
	}

	allowedLock.Unlock()

	checkComplaint(env.Data)

	var idbytes []byte = make([]byte, 16)
	_, err := rand.Read(idbytes)
	if err != nil {
		trace.Printf(":MAIL:::Error creating incoming mail ID: %s", err)
		return &smtpd.Error{Code: 451, Message: "Local error in processing"}
	}

	id := hex.EncodeToString(idbytes)

	tmpname := fmt.Sprintf("/mail/tmp/%s", id)

	f, err := os.Create(tmpname)
	if err != nil {
		trace.Printf(":TRACE:::Error creating incoming mail file: %s", err)
		return &smtpd.Error{Code: 451, Message: "Local error in processing"}
	}

	f.WriteString(fmt.Sprintf("X-Peer-HeloName: %s\r\n", peer.HeloName))
	f.WriteString(fmt.Sprintf("X-Peer-Addr: %v\r\n", peer.Addr))
	f.WriteString(fmt.Sprintf("X-From: %s\r\n", env.Sender))
	for _, r := range env.Recipients {
		f.WriteString(fmt.Sprintf("X-Rcpt: %s\r\n", r))
	}
	f.Write(env.Data)
	f.Close()

	err = os.Chown(tmpname, config.MailUID, config.MailGID)
	if err != nil {
		trace.Printf(":TRACE:::Error calling chown() on %s: %s", tmpname, err)
	}

	err = os.Rename(tmpname, fmt.Sprintf("/mail/new/%s", id))
	if err != nil {
		trace.Printf(":TRACE:::Error renaming incoming mail file: %s", err)
		return &smtpd.Error{Code: 451, Message: "Local error in processing"}
	}
	return nil
}
