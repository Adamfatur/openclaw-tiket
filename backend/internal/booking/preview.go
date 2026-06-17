package booking

import (
	"encoding/json"
	"io"
	"net/http"
	"regexp"
	"strings"
	"time"
)

type EventPackage struct {
	Name      string `json:"name"`
	Price     string `json:"price"`
	Available bool   `json:"available"`
}

type EventPreview struct {
	Name     string         `json:"name"`
	Date     string         `json:"date"`
	Venue    string         `json:"venue"`
	Poster   string         `json:"poster_url"`
	Packages []EventPackage `json:"packages"`
}

type PreviewRequest struct {
	URL string `json:"url"`
}

func (s *Service) PreviewHandler(w http.ResponseWriter, r *http.Request) {
	var req PreviewRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.URL == "" {
		http.Error(w, `{"error":"url is required"}`, http.StatusBadRequest)
		return
	}

	// Validate it's a tiket.com URL
	if !strings.Contains(req.URL, "tiket.com") {
		http.Error(w, `{"error":"only tiket.com URLs are supported"}`, http.StatusBadRequest)
		return
	}

	// Fetch the page
	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.Get(req.URL)
	if err != nil {
		// Fallback: extract from URL
		preview := extractFromURL(req.URL)
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(preview)
		return
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		preview := extractFromURL(req.URL)
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(preview)
		return
	}

	html := string(body)
	preview := parseEventPage(html, req.URL)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(preview)
}

func parseEventPage(html string, url string) EventPreview {
	preview := extractFromURL(url)

	// Try to extract title from <title> or og:title
	titleRe := regexp.MustCompile(`<meta\s+property="og:title"\s+content="([^"]+)"`)
	if matches := titleRe.FindStringSubmatch(html); len(matches) > 1 {
		preview.Name = strings.TrimSpace(matches[1])
	} else {
		titleRe2 := regexp.MustCompile(`<title>([^<]+)</title>`)
		if matches := titleRe2.FindStringSubmatch(html); len(matches) > 1 {
			name := strings.TrimSpace(matches[1])
			// Remove " - tiket.com" suffix
			name = strings.Split(name, " - ")[0]
			name = strings.Split(name, " | ")[0]
			preview.Name = name
		}
	}

	// Try to extract image
	imgRe := regexp.MustCompile(`<meta\s+property="og:image"\s+content="([^"]+)"`)
	if matches := imgRe.FindStringSubmatch(html); len(matches) > 1 {
		preview.Poster = matches[1]
	}

	// Try to extract description for venue/date hints
	descRe := regexp.MustCompile(`<meta\s+property="og:description"\s+content="([^"]+)"`)
	if matches := descRe.FindStringSubmatch(html); len(matches) > 1 {
		desc := matches[1]
		// Look for date patterns
		dateRe := regexp.MustCompile(`(\d{1,2}\s+\w+\s+\d{4}|\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{4})`)
		if dateMatch := dateRe.FindString(desc); dateMatch != "" {
			preview.Date = dateMatch
		}
	}

	// Try to extract packages/variants from page
	// Look for JSON-LD or data attributes with pricing info
	jsonLdRe := regexp.MustCompile(`<script type="application/ld\+json">([\s\S]*?)</script>`)
	jsonLdMatches := jsonLdRe.FindAllStringSubmatch(html, -1)
	for _, m := range jsonLdMatches {
		if len(m) > 1 {
			var data map[string]interface{}
			if err := json.Unmarshal([]byte(m[1]), &data); err == nil {
				// Try to get offers
				if offers, ok := data["offers"]; ok {
					switch v := offers.(type) {
					case []interface{}:
						for _, offer := range v {
							if offerMap, ok := offer.(map[string]interface{}); ok {
								pkg := EventPackage{
									Name:      getString(offerMap, "name"),
									Price:     formatPrice(offerMap),
									Available: getString(offerMap, "availability") != "SoldOut",
								}
								if pkg.Name != "" {
									preview.Packages = append(preview.Packages, pkg)
								}
							}
						}
					case map[string]interface{}:
						pkg := EventPackage{
							Name:      getString(v, "name"),
							Price:     formatPrice(v),
							Available: getString(v, "availability") != "SoldOut",
						}
						if pkg.Name != "" {
							preview.Packages = append(preview.Packages, pkg)
						}
					}
				}
			}
		}
	}

	// Fallback: try to find package names from common tiket.com patterns
	if len(preview.Packages) == 0 {
		// Look for variant/package sections
		pkgRe := regexp.MustCompile(`"variantName"\s*:\s*"([^"]+)"`)
		pkgMatches := pkgRe.FindAllStringSubmatch(html, 20)
		seen := make(map[string]bool)
		for _, m := range pkgMatches {
			if len(m) > 1 && !seen[m[1]] {
				seen[m[1]] = true
				preview.Packages = append(preview.Packages, EventPackage{
					Name:      m[1],
					Price:     "",
					Available: true,
				})
			}
		}

		// Also try productName or categoryName
		if len(preview.Packages) == 0 {
			catRe := regexp.MustCompile(`"(?:categoryName|packageName|ticketName)"\s*:\s*"([^"]+)"`)
			catMatches := catRe.FindAllStringSubmatch(html, 20)
			for _, m := range catMatches {
				if len(m) > 1 && !seen[m[1]] {
					seen[m[1]] = true
					preview.Packages = append(preview.Packages, EventPackage{
						Name:      m[1],
						Price:     "",
						Available: true,
					})
				}
			}
		}
	}

	return preview
}

func extractFromURL(url string) EventPreview {
	re := regexp.MustCompile(`to-do/([^?/]+)`)
	matches := re.FindStringSubmatch(url)
	name := "Event"
	if len(matches) > 1 {
		name = strings.ReplaceAll(matches[1], "-", " ")
		// Capitalize words
		words := strings.Fields(name)
		for i, w := range words {
			if len(w) > 0 {
				words[i] = strings.ToUpper(w[:1]) + w[1:]
			}
		}
		name = strings.Join(words, " ")
	}

	return EventPreview{
		Name:     name,
		Packages: []EventPackage{},
	}
}

func getString(m map[string]interface{}, key string) string {
	if v, ok := m[key]; ok {
		if s, ok := v.(string); ok {
			return s
		}
	}
	return ""
}

func formatPrice(m map[string]interface{}) string {
	price := ""
	if p, ok := m["price"]; ok {
		switch v := p.(type) {
		case float64:
			price = formatIDR(int64(v))
		case string:
			price = v
		}
	}
	if price == "" {
		if p, ok := m["lowPrice"]; ok {
			if v, ok := p.(float64); ok {
				price = formatIDR(int64(v))
			}
		}
	}
	return price
}

func formatIDR(amount int64) string {
	if amount == 0 {
		return ""
	}
	// Simple IDR formatter
	s := ""
	negative := amount < 0
	if negative {
		amount = -amount
	}
	str := strings.Builder{}
	digits := []byte{}
	for amount > 0 {
		digits = append([]byte{byte('0' + amount%10)}, digits...)
		amount /= 10
	}
	for i, d := range digits {
		if i > 0 && (len(digits)-i)%3 == 0 {
			str.WriteByte('.')
		}
		str.WriteByte(d)
	}
	s = "Rp " + str.String()
	if negative {
		s = "-" + s
	}
	return s
}
