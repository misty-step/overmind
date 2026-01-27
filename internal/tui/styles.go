package tui

import "github.com/charmbracelet/lipgloss"

var (
	// Colors matching the web dashboard
	ColorBorder = lipgloss.Color("#3f3f46")
	ColorText   = lipgloss.Color("#fafafa")
	ColorMuted  = lipgloss.Color("#a1a1aa")

	// Status colors
	ColorHealthy  = lipgloss.Color("#22c55e")
	ColorWarning  = lipgloss.Color("#eab308")
	ColorError    = lipgloss.Color("#ef4444")
	ColorTraction = lipgloss.Color("#f59e0b") // amber

	// Styles
	TitleStyle = lipgloss.NewStyle().
			Bold(true).
			Foreground(ColorText)

	SubtitleStyle = lipgloss.NewStyle().
			Foreground(ColorMuted)

	TableHeaderStyle = lipgloss.NewStyle().
				Foreground(ColorText).
				Bold(true)

	TableDividerStyle = lipgloss.NewStyle().
				Foreground(ColorBorder)

	TableRowStyle = lipgloss.NewStyle().
			Foreground(ColorText)

	TableRowMutedStyle = lipgloss.NewStyle().
				Foreground(ColorMuted)

	TableRowSelectedStyle = lipgloss.NewStyle().
				Reverse(true).
				Bold(true)

	TableRowTractionStyle = lipgloss.NewStyle().
				Foreground(ColorTraction).
				Bold(true)

	HealthyStyle = lipgloss.NewStyle().
			Foreground(ColorHealthy).
			Bold(true)

	WarningStyle = lipgloss.NewStyle().
			Foreground(ColorWarning)

	ErrorStyle = lipgloss.NewStyle().
			Foreground(ColorError).
			Bold(true)

	HelpStyle = lipgloss.NewStyle().
			Foreground(ColorMuted)
)
