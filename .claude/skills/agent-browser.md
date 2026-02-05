# Agent Browser Skill

Use agent-browser CLI for browser automation. This is more efficient than Chrome MCP (93% less tokens).

## When to Use

- Testing web pages at localhost or any URL
- Taking screenshots for verification
- Navigating and interacting with web elements
- Filling forms and clicking buttons

## Installation (already done)

```bash
npm install -g agent-browser
agent-browser install  # Downloads Chromium
```

## Core Commands

### Navigation
```bash
agent-browser open <url>                    # Navigate to URL
agent-browser screenshot [path]             # Capture screenshot
agent-browser get url                       # Get current URL
```

### Interaction
```bash
agent-browser click <selector>              # Click element (CSS selector)
agent-browser fill <selector> <text>        # Type into input field
agent-browser press <key>                   # Press keyboard key (Enter, Tab, etc.)
```

### Reading Page Content
```bash
agent-browser snapshot                      # Get accessibility tree with refs (@e1, @e2)
agent-browser get text <selector>           # Get text content
```

### Waiting
```bash
agent-browser wait <selector>               # Wait for element to appear
```

### Authentication State
```bash
agent-browser cookies                       # View/manage cookies
agent-browser storage local                 # Access localStorage
```

## Example Workflow

```bash
# Open the app
agent-browser open http://localhost:3000

# Take a screenshot
agent-browser screenshot /tmp/test.png

# Get page structure
agent-browser snapshot

# Click a button using ref from snapshot
agent-browser click @e5

# Or use CSS selector
agent-browser click "button:has-text('Submit')"

# Fill a form
agent-browser fill "#email" "test@example.com"
agent-browser fill "#password" "secret"
agent-browser click "button[type=submit]"
```

## Tips

1. **Use snapshots** - Run `agent-browser snapshot` to see element refs before clicking
2. **Screenshots for verification** - Take screenshots after actions to verify state
3. **CSS selectors** - Can use standard CSS or text-based selectors like `:has-text()`
4. **Sessions persist** - Browser stays open between commands until you close it

## Comparison with Chrome MCP

| Feature | Chrome MCP | agent-browser |
|---------|-----------|---------------|
| Token usage | ~4000/call | ~95/command |
| Setup | MCP server | Just bash |
| Clicking | Often unreliable | Direct selectors |
| Speed | Slower | Sub-50ms CLI |
