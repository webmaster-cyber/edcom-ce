package sender

import (
	"context"
	"errors"
	"net"
	"sync"
	"time"
)

type DNSCacheEntry struct {
	Hosts     []string
	Error     error
	Permanent bool
	Expires   time.Time
	Fetching  *sync.Cond
}

type DNSCache map[string]DNSCacheEntry

var mxCache DNSCache = make(DNSCache)
var mxLock sync.Mutex
var aCache DNSCache = make(DNSCache)
var aLock sync.Mutex

func LookupHost(host string) ([]string, error) {
	if host == "" {
		return nil, &net.DNSError{Err: "no such host", Name: host, IsNotFound: true}
	}
	if ip := net.ParseIP(host); ip != nil {
		return []string{host}, nil
	}
	ips, err := net.DefaultResolver.LookupIP(context.Background(), "ip4", host)
	if err != nil {
		return nil, err
	}
	var hosts []string
	for _, addr := range ips {
		hosts = append(hosts, addr.String())
	}
	return hosts, nil
}

func LookupDNS(host string, lock *sync.Mutex, cache DNSCache, t string) ([]string, error, bool) {
	lock.Lock()
	res, exists := cache[host]
	for exists && res.Fetching != nil {
		res.Fetching.Wait()
		res, exists = cache[host]
	}
	if !exists || res.Expires.Before(time.Now()) {
		cond := sync.NewCond(lock)

		cache[host] = DNSCacheEntry{Fetching: cond}

		lock.Unlock()
		trace.Printf(":TRACE:::looking up %s for %s", t, host)

		permanent := false

		if t == "MX" {
			mxrecs, err := net.LookupMX(host)
			if err == nil && len(mxrecs) == 0 {
				err = errors.New("No MX records for domain")
				permanent = true
			} else if err != nil {
				if dnserr, ok := err.(*net.DNSError); ok {
					if dnserr.IsNotFound {
						err = errors.New("no MX records for domain")
					} else if !dnserr.IsTemporary && !dnserr.IsTimeout {
						permanent = true
					}
				}
			}
			res = DNSCacheEntry{Error: err, Expires: time.Now().Add(8 * time.Hour), Permanent: permanent}
			if err == nil {
				trace.Printf(":TRACE:::%s has %d MX servers", host, len(mxrecs))
				res.Hosts = make([]string, 0)
				for _, rec := range mxrecs {
					res.Hosts = append(res.Hosts, rec.Host)
				}
			}
		} else {
			ips, err := LookupHost(host)
			if err != nil {
				if dnserr, ok := err.(*net.DNSError); ok {
					if !dnserr.IsTemporary && !dnserr.IsTimeout {
						permanent = true
					}
				}
			}
			res = DNSCacheEntry{Error: err, Expires: time.Now().Add(8 * time.Hour), Permanent: permanent}
			if err == nil {
				trace.Printf(":TRACE:::IPs for %s: %#v", host, ips)
				res.Hosts = ips
			}
		}

		lock.Lock()

		cache[host] = res
		cond.Broadcast()
	}
	lock.Unlock()
	return res.Hosts, res.Error, res.Permanent
}

func LookupMX(host string) ([]string, error, bool) {
	return LookupDNS(host, &mxLock, mxCache, "MX")
}

func LookupA(host string) ([]string, error, bool) {
	return LookupDNS(host, &aLock, aCache, "A")
}
