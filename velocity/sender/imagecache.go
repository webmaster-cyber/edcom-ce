package sender

import (
	"fmt"
	"math/rand"
	"os"
)

func initImageCache() {
	// create /conf/images directory if it doesn't exist
	err := os.MkdirAll("/conf/images", 0755)
	if err != nil {
		panic(fmt.Sprintf("Cannot create /conf/images directory: %s", err))
	}
}

func imageCacheFind(name string) string {
	path := fmt.Sprintf("/conf/images/%s", name)
	_, err := os.Stat(path)
	if err == nil {
		return path
	}
	return ""
}

func imageCacheWrite(name string, data []byte) error {
	path := fmt.Sprintf("/conf/images/%s", name)
	tmppath := fmt.Sprintf("%s.tmp.%d.%d", path, rand.Int(), rand.Int())

	f, err := os.Create(tmppath)
	if err != nil {
		return err
	}
	defer f.Close()
	_, err = f.Write(data)
	if err != nil {
		return err
	}

	return os.Rename(tmppath, path)
}
