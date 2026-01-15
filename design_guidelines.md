# Barista Design Guidelines

## Design Approach
**Reference-Based**: Drawing inspiration from Monday Trade's trading platform (app.monday.trade), Linear's clean chat interface, and ChatGPT's message hierarchy. This is a utility-focused chat assistant requiring clarity and efficiency while matching the Monday Trade dark purple theme.

## Core Design Principles
1. **Coffee Shop Warmth**: Friendly, approachable AI assistant with personality
2. **Trading Precision**: Clear information hierarchy for market data and citations
3. **Purple Power**: Bold use of brand purple (#9945FF) for primary actions and accents
4. **Dark Foundation**: Professional dark theme matching app.monday.trade for reduced eye strain during trading
5. **System Theme**: Respects OS dark/light preference by default

## Brand Colors (Monday Trade)
### Light Mode
- Primary Purple: `#9945FF` (hsl 273 100% 63%)
- Background: Light gray-purple (hsl 250 15% 95%)
- Card: White (#FFFFFF)
- Text: Dark purple-gray (hsl 250 30% 12%)

### Dark Mode (matches app.monday.trade)
- Primary Purple: `#9945FF` (hsl 273 100% 63%)
- Background Dark: Deep blue-black (hsl 250 30% 6%)
- Card Dark: Dark blue-gray (hsl 250 30% 9%)
- Text: White (#FAFAFA)
- Success Green: `#14F195` (hsl 155 100% 52%)
- Error Red: (hsl 0 84% 50%)

## Typography
**Font Stack**: Inter (system fallback)
- **Primary**: Inter (weights: 400, 500, 600, 700)
- **Headers**: 600-700 weight for emphasis
- **Body**: 400-500 weight for readability

**Sizes**:
- Hero headline: `text-4xl` to `text-6xl` (responsive)
- Section titles: `text-2xl`
- Message text: `text-sm` (14px)
- Suggestion pills: `text-xs` (12px)
- Timestamps: `text-xs` (10px)

## Layout System
**Spacing Primitives**: Consistent use of `p-2`, `p-3`, `p-4`, `gap-2`, `gap-3`, `gap-4`

**Chat Widget Dimensions**:
- Floating bubble: `56px x 56px` (w-14 h-14)
- Chat window: `384px x 600px` on desktop (w-96 h-[600px])
- Message container: `max-w-[85%]` for bubbles

**Landing Page Layout**:
- Two-column grid on desktop (hero text + chat preview)
- Max width: `max-w-7xl` container
- Responsive padding: `px-4 sm:px-6 lg:px-8`

## Component Library

### 1. Floating Chat Bubble
- Circular button with solid purple background (#9945FF)
- Coffee cup icon with sparkle accent
- Animated purple glow pulse (2s infinite)
- Subtle floating animation
- Scale effect on hover (1.08)
- Fixed position: `bottom-6 right-6`

### 2. Chat Window (Animated)
- Opens with spring animation (scale + fade + slide)
- Purple glow shadow effect
- White/card background
- Rounded corners: `rounded-2xl`
- Header: Barista avatar + title + close button (with sparkle rotation animation)
- Body: Scrollable message area with animated message entry
- Footer: Input area with suggestion pills

### 3. BaristaAvatar Component
- Animated SVG coffee cup (48px x 48px)
- Steam particles rising (CSS keyframe animation)
- Friendly face on cup (eyes + smile)
- Purple gradient fill for coffee liquid (#9945FF to #7B2FE0)
- Spring animation on load

### 4. Message Bubbles (Animated)
**User Messages**:
- Background: Primary purple (`bg-primary`)
- Text: White (`text-primary-foreground`)
- Alignment: Right-aligned
- Border radius: `rounded-2xl rounded-br-sm`
- Entry animation: slide up + fade in

**Assistant Messages**:
- Background: Muted/Card background
- Text: Foreground color
- Alignment: Left-aligned
- Border radius: `rounded-2xl rounded-bl-sm`
- Avatar on left
- Entry animation: slide up + fade in

### 5. Suggestion Pills
- Background: Light with subtle border
- Hover: Elevated effect via `hover-elevate` utility
- Padding: `px-3 py-2`
- Border radius: `rounded-full`
- Font: `text-xs font-medium`

### 6. Chat Preview Card (Landing Page)
- White/card background with shadow
- Header section with avatar and title
- Sample conversation showing user/assistant messages
- Professional styling matching production chat

### 7. Theme Toggle
- Cycles through: System -> Light -> Dark -> System
- Shows Monitor icon for system, Sun for light, Moon for dark
- System mode automatically follows OS preference

## Animations

### Chat Box Animations
1. **Open**: Spring animation with scale (0.9 -> 1), opacity, and translateY
2. **Close**: Reverse with faster timing (0.2s)
3. **Header slide**: Subtle slide down on open
4. **Footer slide**: Subtle slide up on open

### Message Animations
1. **Entry**: Slide up (15px) + fade in + scale (0.98 -> 1)
2. **Spring timing**: stiffness 400, damping 25 for snappy feel

### Other Animations
1. **Floating bubble pulse**: 2s infinite purple glow
2. **Floating bubble float**: 3s infinite subtle vertical movement
3. **Sparkle rotation**: Periodic wiggle animation
4. **Steam particles**: Rising animation on BaristaAvatar (3s loop)
5. **Typing dots bounce**: Staggered vertical bounce

**No Custom Hover States for Buttons**: Use built-in Button/Badge hover behavior

## Images
**BaristaAvatar**: Custom SVG illustration
- Coffee cup character with friendly face
- Purple gradient liquid fill
- Steam particles as animated paths

**No hero images** - Clean text-based landing page with chat preview card

## Accessibility
- ARIA labels on all interactive elements
- Keyboard navigation support
- Focus visible states with primary color outline
- Color contrast: WCAG AA compliant
- data-testid attributes on all interactive elements

## Icon Usage
Use Lucide React icons throughout:
- `Coffee` - Barista branding
- `Sparkles` - AI/magic indicator
- `MessageCircle` - Chat functionality
- `ExternalLink` - External links
- `Search` - Web search indicator
- `ThumbsUp`/`ThumbsDown` - Feedback
- `Monitor` - System theme indicator
- `Sun`/`Moon` - Light/Dark theme indicators

## Quality Standards
- Consistent spacing using Tailwind primitives
- Smooth 60fps animations via framer-motion
- Spring-based animations for natural feel
- Responsive design: Mobile-first approach
- Loading states for all async operations
- Error states with retry actions
- Empty states with helpful prompts
