# Barista Design Guidelines

## Design Approach
**Reference-Based**: Drawing inspiration from Linear's clean chat interface, Intercom's widget patterns, and ChatGPT's message hierarchy. This is a utility-focused chat assistant requiring clarity and efficiency while maintaining Monday Trade's energetic brand personality.

## Core Design Principles
1. **Coffee Shop Warmth**: Friendly, approachable interface with playful animations
2. **Trading Precision**: Clear information hierarchy for market data and citations
3. **Purple Power**: Bold use of brand color for primary actions and accents
4. **Dark Foundation**: Professional dark theme for reduced eye strain during trading sessions

## Brand Colors (Monday Trade)
- Primary Purple: `#9945FF`
- Purple Light: `#B87AFF`
- Purple Dark: `#7B2FE0`
- Purple Glow: `rgba(153, 69, 255, 0.3)`
- Accent Teal: `#14F195`
- Background Dark: `#0E0E1A`
- Card Dark: `#1A1A2E`
- Text Gray: `#8892B0`
- White: `#FFFFFF`

## Typography
**Font Stack**: Use system fonts via Google Fonts CDN
- **Primary**: Inter (weights: 400, 500, 600, 700)
- **Headers**: Assistant messages use 500 weight for readability
- **User Messages**: 400 weight for natural conversation flow

**Sizes**:
- Message text: `text-sm` (14px)
- Suggestion pills: `text-xs` (12px)
- Timestamps: `text-xs` (10px)
- Tool indicators: `text-xs` (11px)
- Avatar labels: `text-xs` (12px)

## Layout System
**Spacing Primitives**: Consistent use of `p-2`, `p-3`, `p-4`, `gap-2`, `gap-3`, `gap-4`, `mt-2`, `mb-4`

**Chat Widget Dimensions**:
- Floating bubble: `64px × 64px` (w-16 h-16)
- Chat window: `384px × 600px` on desktop (w-96 h-[600px])
- Mobile: Full screen with safe area insets
- Message container: `max-w-[85%]` for bubbles

**Vertical Rhythm**:
- Message spacing: `gap-3` between messages
- Section padding: `p-4` for chat window borders
- Input area: `p-3` padding

## Component Library

### 1. Floating Chat Bubble
- Circular button with purple gradient background
- Coffee cup icon (☕) centered
- Pulsing purple glow animation (subtle, 2s duration)
- Sparkle effect on hover (scale 1.05 transition)
- Fixed position: `bottom-6 right-6`

### 2. Chat Window
- Dark card background (`#1A1A2E`)
- Rounded corners: `rounded-2xl`
- Shadow: `shadow-2xl` with purple glow
- Header: Barista title + close button (p-4)
- Body: Scrollable message area (flex-1 overflow-y-auto)
- Footer: Input area with suggestion pills

### 3. BaristaAvatar Component
- Animated SVG coffee cup (48px × 48px)
- Steam particles rising (CSS keyframe animation, 3 particles)
- Friendly face on cup (eyes + smile)
- Purple gradient fill for coffee liquid
- Subtle bounce on message send (framer-motion)

### 4. Message Bubbles
**User Messages**:
- Background: Purple gradient (`bg-gradient-to-r from-purple to-purpleLight`)
- Text: White (`text-white`)
- Alignment: `ml-auto` (right-aligned)
- Padding: `px-4 py-3`
- Border radius: `rounded-2xl rounded-br-md`

**Assistant Messages**:
- Background: Dark card (`#1A1A2E`)
- Text: White (`text-white`)
- Alignment: `mr-auto` (left-aligned)
- Padding: `px-4 py-3`
- Border radius: `rounded-2xl rounded-bl-md`
- Avatar on left (gap-2 between avatar and message)

### 5. Suggestion Pills
- Background: Dark with purple border (`border border-purple/30`)
- Hover: Purple background with scale effect
- Padding: `px-3 py-2`
- Border radius: `rounded-full`
- Font: `text-xs font-medium`
- Icon + text layout (gap-1.5)
- Horizontal scroll container: `flex gap-2 overflow-x-auto`

### 6. Tool Usage Indicators
- Small badge above message (`text-xs`)
- Background: Purple glow (`bg-purple/10`)
- Icon + text (🔍 for web_search, 🐦 for x_search)
- Padding: `px-2 py-1`
- Border radius: `rounded-md`

### 7. Typing Indicator
- "Brewing your answer ☕" text
- Three bouncing dots animation
- Staggered animation delay (0.2s, 0.4s, 0.6s)
- Purple dots (`bg-purple`)
- Container: Same as assistant message bubble

### 8. Source Citations
- Compact link list below message
- Background: Subtle dark (`bg-black/20`)
- Padding: `p-2 mt-2`
- Border radius: `rounded-lg`
- Links: Purple with underline on hover
- Icon: External link (Lucide React)

### 9. Feedback Buttons
- Horizontal pair (👍 👎) on assistant messages
- Padding: `p-1`
- Hover: Scale 1.1 + purple highlight
- Active state: Purple background
- Position: `mt-2` below message

### 10. Input Area
- Text input: Full width with purple border on focus
- Background: Dark (`#0E0E1A`)
- Padding: `px-4 py-3`
- Border radius: `rounded-xl`
- Send button: Purple circle with arrow icon
- Layout: Flex row with gap-2

## Animations
**Sparingly Used**:
1. **Floating bubble pulse**: 2s infinite glow effect
2. **Steam particles**: Rising animation on BaristaAvatar (3s loop)
3. **Message fade-in**: Slide up + opacity (0.3s ease-out)
4. **Typing dots bounce**: Staggered vertical bounce (1.4s loop)
5. **Suggestion pill hover**: Scale 1.02 (0.2s ease)

**No Hover States for Buttons**: All buttons handle their own hover/active states natively

## Images
**BaristaAvatar**: Custom SVG illustration (not a photo)
- Friendly coffee cup character with face
- Purple gradient liquid fill
- Steam particles as separate SVG paths
- Responsive scaling (48px default, 56px on desktop)

No hero images needed—this is a focused chat widget interface.

## Accessibility
- ARIA labels on all interactive elements
- Keyboard navigation for chat input and suggestions
- Focus visible states with purple outline
- Screen reader announcements for new messages
- Color contrast: WCAG AA compliant (white text on dark backgrounds)

## Quality Standards
- Pixel-perfect spacing using Tailwind primitives
- Smooth 60fps animations via framer-motion
- Responsive breakpoints: Mobile-first approach
- Loading states for all async operations (tool usage)
- Error states with retry buttons (purple)
- Empty states with suggestion prompts