// Command testbackend is a tiny local HTTP server used by the E2E script.
package main

import (
	"fmt"
	"net/http"
	"os"
)

func main() {
	port := os.Getenv("LOCAL_PORT")
	if port == "" {
		port = "3999"
	}
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "local-ok path=%s", r.URL.Path)
	})
	_ = http.ListenAndServe("127.0.0.1:"+port, nil)
}
