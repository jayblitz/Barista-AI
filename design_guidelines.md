# Barista Design Guidelines

## Design Approach
**Reference-Based**: Drawing inspiration from Linear's clean chat interface, Intercom's widget patterns, and ChatGPT's message hierarchy. This is a utility-focused chat assistant requiring clarity and efficiency while maintaining Monday Trade's warm, approachable brand personality.

## Core Design Principles
1. **Coffee Shop Warmth**: Friendly, approachable interface with warm brown tones and subtle animations
2. **Trading Precision**: Clear information hierarchy for market data and citations
3. **Coffee Brown Identity**: Rich coffee brown as the primary brand color, creating a warm, inviting experience
4. **Light Foundation**: Clean cream/beige backgrounds with white cards for a professional, readable interface

## Brand Colors (Monday Trade - Coffee Theme)
- Primary Brown: `#8B5A3B` (hsl 25 55% 35%)
- Primary Light: `#A67B5B`
- Primary Dark: `#6B4423`
- Background Cream: `#F8F5F2` (hsl 35 30% 96%)
- Card White: `#FFFFFF`
- Accent Tan: `#E8DCD0` (hsl 30 35% 88%)
- Text Dark: `#3D2B1F` (hsl 25 40% 15%)
- Muted Text: `#6B5B52` (hsl 25 15% 45%)
- Border Subtle: `#E5DDD5`

### Dark Mode Colors
- Background: `hsl(25 30% 8%)`
- Card: `hsl(25 25% 10%)`
- Primary: `hsl(25 55% 50%)`
- Text: `#FAFAFA`

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
- Circular button with solid coffee brown background
- Coffee cup icon (Lucide `Coffee`) with sparkle accent
- Pulsing brown glow animation (subtle, 2s duration)
- Scale effect on hover (1.05)
- Fixed position: `bottom-6 right-6`

### 2. Chat Window
- White/cream background in light mode
- Rounded corners: `rounded-2xl`
- Shadow: `shadow-2xl` with warm brown tint
- Header: Barista avatar + title + close button
- Body: Scrollable message area
- Footer: Input area with suggestion pills

### 3. BaristaAvatar Component
- Animated SVG coffee cup (48px x 48px)
- Steam particles rising (CSS keyframe animation)
- Friendly face on cup (eyes + smile)
- Brown gradient fill for coffee liquid (#8B5A3B to #6B4423)
- Subtle animation on interaction

### 4. Message Bubbles
**User Messages**:
- Background: Coffee brown (`bg-primary`)
- Text: White (`text-primary-foreground`)
- Alignment: Right-aligned
- Border radius: `rounded-2xl rounded-br-sm`

**Assistant Messages**:
- Background: Muted/Card background
- Text: Foreground color
- Alignment: Left-aligned
- Border radius: `rounded-2xl rounded-bl-sm`
- Avatar on left

### 5. Suggestion Pills
- Background: Light with subtle border
- Hover: Elevated effect via `hover-elevate` utility
- Padding: `px-3 py-2`
- Border radius: `rounded-full`
- Font: `text-xs font-medium`

### 6. Chat Preview Card (Landing Page)
- White background with shadow
- Header section with avatar and title
- Sample conversation showing user/assistant messages
- Professional styling matching production chat

### 7. Tool Usage Indicators
- Small badge above message
- Background: Primary with low opacity (`bg-primary/10`)
- Uses Lucide icons for search types
- Padding: `px-2 py-1`

### 8. Typing Indicator
- "Brewing your answer" text with Coffee icon
- Three bouncing dots animation
- Brown dots (`bg-primary`)

### 9. Source Citations
- Compact link list below message
- Subtle background styling
- Links: Primary color with underline on hover

### 10. Feedback Buttons
- Thumbs up/down icons (Lucide)
- Subtle styling until hovered
- Active state with primary color highlight

### 11. Input Area
- Text input: Full width with primary border on focus
- Cream/white background
- Rounded corners: `rounded-xl`
- Send button: Brown circle with send icon

## Animations
**Sparingly Used**:
1. **Floating bubble pulse**: 2s infinite brown glow
2. **Steam particles**: Rising animation on BaristaAvatar (3s loop)
3. **Message fade-in**: Slide up + opacity (0.3s ease-out)
4. **Typing dots bounce**: Staggered vertical bounce

**No Custom Hover States for Buttons**: Use built-in Button/Badge hover behavior

## Images
**BaristaAvatar**: Custom SVG illustration
- Coffee cup character with friendly face
- Brown gradient liquid fill
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

## Quality Standards
- Consistent spacing using Tailwind primitives
- Smooth 60fps animations via framer-motion
- Responsive design: Mobile-first approach
- Loading states for all async operations
- Error states with retry actions
- Empty states with helpful prompts
