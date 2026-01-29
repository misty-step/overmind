package tui

import (
	"context"
	"fmt"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/NimbleMarkets/ntcharts/sparkline"
	"github.com/charmbracelet/bubbles/spinner"
	"github.com/charmbracelet/bubbles/viewport"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"

	"github.com/phaedrus/overmind/internal/domain"
	"github.com/phaedrus/overmind/internal/providers"
)

type Model struct {
	products []domain.Product
	metrics  map[string]*domain.Metrics // keyed by product name
	fetcher  *providers.MetricsFetcher

	loading  bool
	spinner  spinner.Model
	err      error
	width    int
	height   int
	selected int // currently selected product index

	viewport     viewport.Model
	columnWidths columnWidths
	tableWidth   int
	rowCount     int
	sortKey      sortKey
	sortDesc     bool
}

type sortKey int

const (
	sortByMRR sortKey = iota
	sortByVisits
	sortByName
	sortByHealth
)

const columnGap = 2

type columnWidths struct {
	name    int
	domain  int
	visits  int
	trend   int
	mrr     int
	subs    int
	health  int
	latency int
}

func (c columnWidths) totalWidth() int {
	sum := c.name + c.domain + c.visits + c.trend + c.mrr + c.subs + c.health + c.latency
	if sum == 0 {
		return 0
	}
	return sum + columnGap*7
}

// Messages
type metricsLoadedMsg struct {
	metrics map[string]*domain.Metrics
}
type metricsErrorMsg struct{ err error }

func New(products []domain.Product, f *providers.MetricsFetcher) *Model {
	sp := spinner.New()
	sp.Spinner = spinner.Dot
	sp.Style = lipgloss.NewStyle().Foreground(ColorTraction)

	return &Model{
		products: products,
		metrics:  make(map[string]*domain.Metrics),
		fetcher:  f,
		spinner:  sp,
		loading:  true,
		sortKey:  sortByMRR,
		sortDesc: true,
	}
}

func (m *Model) Init() tea.Cmd {
	return tea.Batch(
		m.spinner.Tick,
		m.fetchMetrics(),
	)
}

func (m *Model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.KeyMsg:
		switch msg.String() {
		case "q", "ctrl+c":
			return m, tea.Quit
		case "r":
			m.loading = true
			m.err = nil
			return m, m.fetchMetrics()
		case "s":
			m.cycleSort()
			m.sortProducts()
			m.updateViewportContent()
			m.syncViewport()
			return m, nil
		case "up", "k":
			m.moveSelection(-1)
			return m, nil
		case "down", "j":
			m.moveSelection(1)
			return m, nil
		default:
			var cmd tea.Cmd
			m.viewport, cmd = m.viewport.Update(msg)
			return m, cmd
		}
	case tea.WindowSizeMsg:
		m.width = msg.Width
		m.height = msg.Height
		m.updateLayout()
		m.updateViewportContent()
		m.syncViewport()
		return m, nil
	case spinner.TickMsg:
		var cmd tea.Cmd
		m.spinner, cmd = m.spinner.Update(msg)
		return m, cmd
	case metricsLoadedMsg:
		m.loading = false
		m.metrics = msg.metrics
		m.sortProducts()
		m.updateViewportContent()
		m.syncViewport()
		return m, nil
	case metricsErrorMsg:
		m.loading = false
		m.err = msg.err
		m.updateLayout()
		m.updateViewportContent()
		m.syncViewport()
		return m, nil
	}
	var cmd tea.Cmd
	m.viewport, cmd = m.viewport.Update(msg)
	return m, cmd
}

func (m *Model) View() string {
	if m.loading {
		return m.loadingView()
	}

	var b strings.Builder
	b.WriteString(TitleStyle.Render("PRODUCTS"))

	if m.err != nil {
		b.WriteString("\n")
		b.WriteString(ErrorStyle.Render("Error: " + m.err.Error()))
	}

	b.WriteString("\n")
	b.WriteString(m.tableView())
	b.WriteString("\n")
	b.WriteString(m.statusView())
	b.WriteString("\n")
	b.WriteString(HelpStyle.Render("r refresh • s sort • q quit • j/k navigate"))

	return b.String()
}

func (m *Model) loadingView() string {
	line := fmt.Sprintf("%s Loading metrics...", m.spinner.View())
	if m.width > 0 && m.height > 0 {
		return lipgloss.Place(m.width, m.height, lipgloss.Center, lipgloss.Center, line)
	}
	return line
}

func (m *Model) tableView() string {
	if len(m.products) == 0 {
		return SubtitleStyle.Render("No products configured.")
	}

	header := m.headerView()
	tableWidth := m.tableWidth
	if tableWidth == 0 {
		tableWidth = m.calcColumnWidths().totalWidth()
	}
	divider := TableDividerStyle.Render(strings.Repeat("─", max(0, tableWidth)))
	body := m.viewport.View()

	return strings.Join([]string{header, divider, body}, "\n")
}

func (m *Model) headerView() string {
	widths := m.columnWidths
	if widths.totalWidth() == 0 {
		widths = m.calcColumnWidths()
	}

	header := columnStyles(widths, TableHeaderStyle)
	name := "NAME"
	domain := "DOMAIN"
	visits := "VISITS"
	trend := "TREND"
	mrr := "MRR"
	subs := "SUBS"
	health := "HEALTH"
	latency := "LATENCY"

	switch m.sortKey {
	case sortByMRR:
		mrr = fmt.Sprintf("MRR %s", sortIndicator(m.sortDesc))
	case sortByVisits:
		visits = fmt.Sprintf("VISITS %s", sortIndicator(m.sortDesc))
	case sortByName:
		name = fmt.Sprintf("NAME %s", sortIndicator(m.sortDesc))
	case sortByHealth:
		health = fmt.Sprintf("HEALTH %s", sortIndicator(m.sortDesc))
	}

	return joinColumns(
		header.name.Render(truncate(name, widths.name)),
		header.domain.Render(truncate(domain, widths.domain)),
		header.visits.Render(truncate(visits, widths.visits)),
		header.trend.Render(truncate(trend, widths.trend)),
		header.mrr.Render(truncate(mrr, widths.mrr)),
		header.subs.Render(truncate(subs, widths.subs)),
		header.health.Render(truncate(health, widths.health)),
		header.latency.Render(truncate(latency, widths.latency)),
	)
}

func (m *Model) statusView() string {
	totalMRR := int64(0)
	totalVisits := int64(0)
	for _, p := range m.products {
		metrics := m.metrics[p.Name]
		if metrics == nil {
			continue
		}
		totalMRR += metrics.MRR
		totalVisits += metrics.Visits
	}

	status := fmt.Sprintf("Total: %s MRR • %s visits • %d products",
		formatCurrency(totalMRR),
		formatNumber(totalVisits),
		len(m.products),
	)

	if m.rowCount > m.viewport.Height && m.viewport.Height > 0 {
		start := m.viewport.YOffset + 1
		end := min(m.viewport.YOffset+m.viewport.Height, m.rowCount)
		status = fmt.Sprintf("%s • scroll %d-%d/%d", status, start, end, m.rowCount)
	}

	return HelpStyle.Render(status)
}

type columnStyleSet struct {
	name    lipgloss.Style
	domain  lipgloss.Style
	visits  lipgloss.Style
	trend   lipgloss.Style
	mrr     lipgloss.Style
	subs    lipgloss.Style
	health  lipgloss.Style
	latency lipgloss.Style
}

func columnStyles(widths columnWidths, base lipgloss.Style) columnStyleSet {
	return columnStyleSet{
		name:    base.Width(max(0, widths.name)),
		domain:  base.Width(max(0, widths.domain)),
		visits:  base.Width(max(0, widths.visits)).Align(lipgloss.Right),
		trend:   base.Width(max(0, widths.trend)).Align(lipgloss.Center),
		mrr:     base.Width(max(0, widths.mrr)).Align(lipgloss.Right),
		subs:    base.Width(max(0, widths.subs)).Align(lipgloss.Right),
		health:  base.Width(max(0, widths.health)).Align(lipgloss.Center),
		latency: base.Width(max(0, widths.latency)).Align(lipgloss.Right),
	}
}

func joinColumns(cols ...string) string {
	if len(cols) == 0 {
		return ""
	}
	gap := strings.Repeat(" ", columnGap)
	row := cols[0]
	for i := 1; i < len(cols); i++ {
		row = lipgloss.JoinHorizontal(lipgloss.Top, row, gap, cols[i])
	}
	return row
}

func (m *Model) renderRow(product domain.Product, metrics *domain.Metrics, selected bool) string {
	widths := m.columnWidths
	if widths.totalWidth() == 0 {
		widths = m.calcColumnWidths()
	}

	rowStyle := TableRowStyle
	nameStyle := TableRowStyle
	if metrics != nil {
		switch metrics.ComputeSignal() {
		case domain.SignalDead:
			rowStyle = TableRowMutedStyle
			nameStyle = TableRowMutedStyle
		case domain.SignalTraction:
			nameStyle = TableRowTractionStyle
		}
	}

	styles := columnStyles(widths, rowStyle)
	nameCell := nameStyle.Width(max(0, widths.name)).Render(truncate(product.Name, widths.name))
	domainCell := styles.domain.Render(truncate(product.Domain, widths.domain))

	visits := "0"
	trend := ""
	mrr := "$0.00"
	subs := "0"
	health := SubtitleStyle.Render("●")
	latency := "n/a"

	if metrics != nil {
		visits = formatNumber(metrics.Visits)
		trend = renderSparkline(metrics.VisitsHistory, widths.trend, rowStyle)
		mrr = formatCurrency(metrics.MRR)
		subs = formatNumber(metrics.Subscribers)
		health = healthDot(metrics.HealthStatus)
		if metrics.ResponseTime > 0 {
			latency = fmt.Sprintf("%dms", metrics.ResponseTime)
		}
	}

	row := joinColumns(
		nameCell,
		domainCell,
		styles.visits.Render(visits),
		styles.trend.Render(trend),
		styles.mrr.Render(mrr),
		styles.subs.Render(subs),
		styles.health.Render(health),
		styles.latency.Render(latency),
	)

	if selected {
		return TableRowSelectedStyle.Render(row)
	}
	return row
}

func (m *Model) updateLayout() {
	if m.width <= 0 || m.height <= 0 {
		return
	}

	m.columnWidths = m.calcColumnWidths()
	m.tableWidth = m.columnWidths.totalWidth()

	titleLines := 1
	headerLines := 2
	statusLines := 2
	errorLines := 0
	if m.err != nil {
		errorLines = 1
	}

	availableHeight := m.height - titleLines - headerLines - statusLines - errorLines
	if availableHeight < 1 {
		availableHeight = 1
	}

	if m.viewport.Width == 0 && m.viewport.Height == 0 {
		m.viewport = viewport.New(m.tableWidth, availableHeight)
		return
	}

	m.viewport.Width = m.tableWidth
	m.viewport.Height = availableHeight
}

func (m *Model) updateViewportContent() {
	if len(m.products) == 0 {
		m.rowCount = 0
		m.viewport.SetContent("")
		return
	}

	if m.viewport.Width == 0 && m.width > 0 && m.height > 0 {
		m.updateLayout()
	}

	rows := make([]string, 0, len(m.products))
	for i, product := range m.products {
		rows = append(rows, m.renderRow(product, m.metrics[product.Name], i == m.selected))
	}

	offset := m.viewport.YOffset
	m.viewport.SetContent(strings.Join(rows, "\n"))
	m.viewport.SetYOffset(offset)
	m.rowCount = len(rows)
}

func (m *Model) moveSelection(delta int) {
	if len(m.products) == 0 {
		return
	}

	next := m.selected + delta
	if next < 0 {
		next = 0
	}
	if next > len(m.products)-1 {
		next = len(m.products) - 1
	}

	if next == m.selected {
		return
	}

	m.selected = next
	m.updateViewportContent()
	m.syncViewport()
}

func (m *Model) syncViewport() {
	if m.viewport.Height <= 0 {
		return
	}

	if m.selected < m.viewport.YOffset {
		m.viewport.SetYOffset(m.selected)
		return
	}

	if m.selected >= m.viewport.YOffset+m.viewport.Height {
		m.viewport.SetYOffset(m.selected - m.viewport.Height + 1)
	}
}

func (m *Model) cycleSort() {
	switch m.sortKey {
	case sortByMRR:
		m.sortKey = sortByVisits
		m.sortDesc = true
	case sortByVisits:
		m.sortKey = sortByName
		m.sortDesc = false
	case sortByName:
		m.sortKey = sortByHealth
		m.sortDesc = false
	case sortByHealth:
		m.sortKey = sortByMRR
		m.sortDesc = true
	}
}

func (m *Model) sortProducts() {
	if len(m.products) == 0 {
		return
	}

	selectedName := ""
	if m.selected >= 0 && m.selected < len(m.products) {
		selectedName = m.products[m.selected].Name
	}

	sort.SliceStable(m.products, func(i, j int) bool {
		a := m.products[i]
		b := m.products[j]
		ma := m.metrics[a.Name]
		mb := m.metrics[b.Name]

		switch m.sortKey {
		case sortByVisits:
			av := metricVisits(ma)
			bv := metricVisits(mb)
			if av == bv {
				return strings.ToLower(a.Name) < strings.ToLower(b.Name)
			}
			if m.sortDesc {
				return av > bv
			}
			return av < bv
		case sortByName:
			an := strings.ToLower(a.Name)
			bn := strings.ToLower(b.Name)
			if an == bn {
				return a.Domain < b.Domain
			}
			if m.sortDesc {
				return an > bn
			}
			return an < bn
		case sortByHealth:
			ah := healthRank(metricHealth(ma))
			bh := healthRank(metricHealth(mb))
			if ah == bh {
				return strings.ToLower(a.Name) < strings.ToLower(b.Name)
			}
			if m.sortDesc {
				return ah > bh
			}
			return ah < bh
		default:
			am := metricMRR(ma)
			bm := metricMRR(mb)
			if am == bm {
				return strings.ToLower(a.Name) < strings.ToLower(b.Name)
			}
			if m.sortDesc {
				return am > bm
			}
			return am < bm
		}
	})

	if selectedName == "" {
		m.selected = min(m.selected, len(m.products)-1)
		return
	}

	for i, product := range m.products {
		if product.Name == selectedName {
			m.selected = i
			return
		}
	}

	m.selected = min(m.selected, len(m.products)-1)
}

func (m *Model) calcColumnWidths() columnWidths {
	width := max(0, m.width)
	if width == 0 {
		return columnWidths{}
	}

	fixed := columnWidths{
		visits:  7,
		trend:   7,
		mrr:     8,
		subs:    5,
		health:  6,
		latency: 7,
	}

	minName := 12
	minDomain := 18
	minNameFloor := 6
	minDomainFloor := 8

	available := width - fixed.visits - fixed.trend - fixed.mrr - fixed.subs - fixed.health - fixed.latency - columnGap*7
	if available <= 0 {
		return fixed
	}

	var name, domain int
	switch {
	case available < minNameFloor+minDomainFloor:
		name = max(0, available/2)
		domain = max(0, available-name)
	case available < minName+minDomain:
		name = max(minNameFloor, (available*minName)/(minName+minDomain))
		domain = max(minDomainFloor, available-name)
		if name+domain > available {
			domain = max(0, available-name)
		}
	default:
		extra := available - (minName + minDomain)
		name = minName + extra/3
		domain = minDomain + extra - extra/3
	}

	return columnWidths{
		name:    name,
		domain:  domain,
		visits:  fixed.visits,
		trend:   fixed.trend,
		mrr:     fixed.mrr,
		subs:    fixed.subs,
		health:  fixed.health,
		latency: fixed.latency,
	}
}

func metricMRR(m *domain.Metrics) int64 {
	if m == nil {
		return 0
	}
	return m.MRR
}

func metricVisits(m *domain.Metrics) int64 {
	if m == nil {
		return 0
	}
	return m.Visits
}

func metricHealth(m *domain.Metrics) string {
	if m == nil {
		return ""
	}
	return m.HealthStatus
}

func healthRank(status string) int {
	switch status {
	case "down":
		return 0
	case "degraded":
		return 1
	case "healthy":
		return 2
	default:
		return 3
	}
}

func sortIndicator(desc bool) string {
	if desc {
		return "▼"
	}
	return "▲"
}

func healthDot(status string) string {
	switch status {
	case "healthy":
		return HealthyStyle.Render("●")
	case "degraded":
		return WarningStyle.Render("●")
	case "down":
		return ErrorStyle.Render("●")
	default:
		return SubtitleStyle.Render("●")
	}
}

func truncate(value string, width int) string {
	if width <= 0 {
		return ""
	}
	if lipgloss.Width(value) <= width {
		return value
	}
	if width <= 3 {
		return strings.Repeat(".", width)
	}
	runes := []rune(value)
	if len(runes) <= width {
		return value
	}
	return string(runes[:width-3]) + "..."
}

func formatCurrency(cents int64) string {
	return fmt.Sprintf("$%.2f", float64(cents)/100)
}

func formatNumber(value int64) string {
	if value == 0 {
		return "0"
	}

	neg := value < 0
	if neg {
		value = -value
	}

	s := strconv.FormatInt(value, 10)
	if len(s) <= 3 {
		if neg {
			return "-" + s
		}
		return s
	}

	var b strings.Builder
	if neg {
		b.WriteByte('-')
	}

	lead := len(s) % 3
	if lead == 0 {
		lead = 3
	}
	b.WriteString(s[:lead])
	for i := lead; i < len(s); i += 3 {
		b.WriteByte(',')
		b.WriteString(s[i : i+3])
	}
	return b.String()
}

func renderSparkline(values []int64, width int, style lipgloss.Style) string {
	if width <= 0 {
		return ""
	}
	if len(values) == 0 {
		return strings.Repeat(" ", width)
	}

	data := make([]float64, 0, len(values))
	for _, v := range values {
		if v < 0 {
			v = 0
		}
		data = append(data, float64(v))
	}

	line := sparkline.New(width, 1, sparkline.WithStyle(style), sparkline.WithData(data))
	line.DrawBraille()
	return line.View()
}

// fetchMetrics returns a command that fetches all metrics concurrently.
func (m *Model) fetchMetrics() tea.Cmd {
	return func() tea.Msg {
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()

		metrics := m.fetcher.FetchAll(ctx, m.products)
		return metricsLoadedMsg{metrics: metrics}
	}
}
