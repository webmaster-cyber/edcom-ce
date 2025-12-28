package main

import (
	"bytes"
	"encoding/base64"
	"errors"
	"io"
	"io/ioutil"
	"mime"
	"mime/multipart"
	"mime/quotedprintable"
	"strings"
	"unicode/utf8"

	"golang.org/x/net/html/charset"
)

func extractBody(body []byte, contentType, contentTransferEncoding string) (string, error) {
	mediaType := "text/html"
	var params map[string]string
	var err error

	if contentType != "" {
		mediaType, params, err = mime.ParseMediaType(contentType)
		if err != nil {
			return "", err
		}
	}

	mediaType = strings.ToLower(mediaType)
	contentTransferEncoding = strings.ToLower(contentTransferEncoding)

	if (mediaType == "multipart/alternative" || mediaType == "multipart/mixed") &&
		(contentTransferEncoding == "quoted-printable" || contentTransferEncoding == "base64") {
		return "", errors.New("Cannot use a content transfer encoding with a multipart body")
	}

	body, err = decodeContentTransfer(body, contentTransferEncoding)
	if err != nil {
		return "", err
	}

	charset, ok := params["charset"]
	if !ok {
		charset = "utf-8"
	}

	switch mediaType {
	case "text/plain", "text/html":
		return decodeCharset(body, charset)
	case "multipart/alternative", "multipart/mixed":
		return parseMultipartBody(body, params["boundary"])
	default:
		return "", errors.New("unsupported content type")
	}
}

func decodeContentTransfer(body []byte, contentTransferEncoding string) ([]byte, error) {
	switch contentTransferEncoding {
	case "base64":
		return base64.StdEncoding.DecodeString(string(body))
	case "quoted-printable":
		return ioutil.ReadAll(quotedprintable.NewReader(bytes.NewReader(body)))
	default:
		return body, nil
	}
}

func decodeCharset(body []byte, label string) (string, error) {
	switch strings.ToLower(label) {
	case "utf-8":
		if utf8.Valid(body) {
			s := string(body)
			return s, nil
		}
		return "", errors.New("invalid utf-8 encoded body")
	default:
		r, err := charset.NewReaderLabel(label, strings.NewReader(string(body)))
		if err != nil {
			return "", err
		}

		newBody, err := io.ReadAll(r)
		if err != nil {
			return "", err
		}

		s := string(newBody)
		return s, nil
	}
}

func parseMultipartBody(body []byte, boundary string) (string, error) {
	r := multipart.NewReader(bytes.NewReader(body), boundary)

	var textPart string
	var hasText bool
	for {
		p, err := r.NextPart()
		if err == io.EOF {
			break
		}
		if err != nil {
			return "", err
		}
		partBody, err := ioutil.ReadAll(p)
		if err != nil {
			return "", err
		}

		contentType := p.Header.Get("Content-Type")
		contentTransferEncoding := p.Header.Get("Content-Transfer-Encoding")

		mediaType := "text/plain"

		if contentType != "" {
			mediaType, _, err = mime.ParseMediaType(contentType)
			if err != nil {
				return "", err
			}
		}

		mediaType = strings.ToLower(mediaType)

		switch strings.ToLower(mediaType) {
		case "text/plain":
			decodedBody, err := extractBody(partBody, contentType, contentTransferEncoding)
			if err != nil {
				trace.Printf("Error decoding text: %s", err)
			} else if !hasText {
				textPart = decodedBody
				hasText = true
			}
		case "text/html":
			decodedBody, err := extractBody(partBody, contentType, contentTransferEncoding)
			if err != nil {
				trace.Printf("Error decoding HTML: %s", err)
			} else {
				return decodedBody, nil
			}
		case "multipart/alternative", "multipart/mixed":
			decodedBody, err := extractBody(partBody, contentType, contentTransferEncoding)
			if err == nil {
				return decodedBody, nil
			}
		}
	}

	if hasText {
		return textPart, nil
	}
	return "", errors.New("no valid HTML or plain text part found in multipart body")
}
