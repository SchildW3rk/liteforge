/**
 * @liteforge/calendar - Type Definitions
 */

// ─── Calendar View Types ───────────────────────────────────

export type CalendarView = 'day' | 'week' | 'month' | 'agenda'

// ─── Date Range ────────────────────────────────────────────

export interface DateRange {
  start: Date
  end: Date
}

// ─── Recurring Rule ────────────────────────────────────────

export interface RecurringRule {
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly'
  interval?: number
  endDate?: Date
  count?: number
  daysOfWeek?: number[]
  exceptions?: Date[]
}

// ─── Calendar Event ────────────────────────────────────────

export interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  resourceId?: string
  color?: string
  status?: string
  allDay?: boolean
  editable?: boolean
  recurring?: RecurringRule
  [key: string]: unknown
}

// ─── Resource ──────────────────────────────────────────────

export interface WorkingHours {
  start: number
  end: number
}

export interface Resource {
  id: string
  name: string
  color?: string
  avatar?: string
  role?: string
  workingHours?: {
    [day: number]: WorkingHours | null
  }
}

// ─── Time Configuration ────────────────────────────────────

export interface TimeConfig {
  slotDuration?: number
  dayStart?: number
  dayEnd?: number
  weekStart?: 0 | 1
  hiddenDays?: number[]
  nowIndicator?: boolean
}

export interface ResolvedTimeConfig {
  slotDuration: number
  dayStart: number
  dayEnd: number
  weekStart: 0 | 1
  hiddenDays: number[]
  nowIndicator: boolean
}

// ─── Slot Selection ────────────────────────────────────────

export interface SlotSelection {
  start: Date
  end: Date
  resourceId: string | undefined
}

// ─── Calendar Options ──────────────────────────────────────

export interface CalendarOptions<T extends CalendarEvent> {
  /** Reactive event source */
  events: () => T[]

  /** Initial view (default: 'week') */
  view?: CalendarView
  /** Initial date (default: today) */
  defaultDate?: Date

  /** Time configuration */
  time?: TimeConfig

  /** Resources (therapists / rooms) */
  resources?: Resource[]

  /** Enable drag & drop + resize globally (default: false) */
  editable?: boolean
  /** Enable slot selection (default: false) */
  selectable?: boolean

  /** Event handlers */
  onEventClick?: (event: T) => void
  onEventDrop?: (event: T, newStart: Date, newEnd: Date, newResourceId?: string) => void
  onEventResize?: (event: T, newEnd: Date) => void
  onSlotClick?: (start: Date, end: Date, resourceId?: string) => void
  onSlotSelect?: (start: Date, end: Date, resourceId?: string) => void
  onViewChange?: (view: CalendarView, dateRange: DateRange) => void
  onDateChange?: (date: Date) => void

  /** Custom rendering */
  eventContent?: (event: T) => Node
  slotContent?: (date: Date, resourceId?: string) => Node | null
  dayHeaderContent?: (date: Date) => Node

  /** Styling */
  unstyled?: boolean
  classes?: Partial<CalendarClasses>
  locale?: string
}

// ─── Calendar Classes ──────────────────────────────────────

export interface CalendarClasses {
  root: string
  toolbar: string
  toolbarNav: string
  toolbarTitle: string
  toolbarViews: string
  header: string
  headerCell: string
  body: string
  timeColumn: string
  timeLabel: string
  grid: string
  dayColumn: string
  resourceColumn: string
  timeSlot: string
  event: string
  eventDragging: string
  eventResizing: string
  nowIndicator: string
  monthGrid: string
  monthCell: string
  monthEvent: string
  monthMore: string
  agendaDay: string
  agendaDayHeader: string
  agendaItem: string
}

// ─── Calendar Result ───────────────────────────────────────

export interface CalendarResult<T extends CalendarEvent> {
  /** The calendar grid component */
  Root: () => Node
  /** Optional toolbar component */
  Toolbar: () => Node

  /** Current date (signal) */
  currentDate: () => Date
  /** Current view (signal) */
  currentView: () => CalendarView
  /** Visible date range (signal) */
  dateRange: () => DateRange

  /** Navigation */
  today: () => void
  next: () => void
  prev: () => void
  goTo: (date: Date) => void
  setView: (view: CalendarView) => void

  /** Events in visible range */
  events: () => T[]
  getEvent: (id: string) => T | undefined
  addEvent: (event: T) => void
  updateEvent: (id: string, changes: Partial<T>) => void
  removeEvent: (id: string) => void

  /** Resources */
  resources: () => Resource[]
  visibleResources: () => string[]
  showResource: (id: string) => void
  hideResource: (id: string) => void
  toggleResource: (id: string) => void

  /** Selection */
  selectedEvent: () => T | null
  selectedSlot: () => SlotSelection | null
}

// ─── Internal Types ────────────────────────────────────────

export interface OverlapLayout<T extends CalendarEvent> {
  event: T
  column: number
  totalColumns: number
}

export interface RenderedEvent<T extends CalendarEvent> {
  event: T
  top: number
  height: number
  left: number
  width: number
}
