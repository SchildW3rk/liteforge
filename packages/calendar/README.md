# @liteforge/calendar

Signals-based scheduling calendar with multiple views, resources, and drag & drop for LiteForge.

## Installation

```bash
npm install @liteforge/calendar @liteforge/core @liteforge/runtime
```

Peer dependencies: `@liteforge/core >= 0.1.0`, `@liteforge/runtime >= 0.1.0`

## Overview

`@liteforge/calendar` provides a full-featured scheduling calendar with day, week, month, and agenda views. Supports resources (rooms, people), recurring events, and drag & drop.

## Basic Usage

```tsx
import { createCalendar } from '@liteforge/calendar'

const calendar = createCalendar({
  events: () => appointments,
  view: 'week',
  onEventClick: (event) => openEventModal(event),
  onSlotSelect: ({ start, end }) => createEvent(start, end)
})

// In JSX
<calendar.Root />
```

## API

### createCalendar

Creates a reactive calendar instance.

```ts
import { createCalendar } from '@liteforge/calendar'

const calendar = createCalendar<MyEvent>({
  // Event data (signal or getter)
  events: () => eventsQuery.data() ?? [],
  
  // Initial view
  view: 'week',  // 'day' | 'week' | 'month' | 'agenda'
  
  // Initial date
  date: new Date(),
  
  // Time configuration
  time: {
    dayStart: 8,           // Start hour (0-23)
    dayEnd: 20,            // End hour (1-24)
    slotDuration: 30,      // Minutes per slot
    weekStartsOn: 1        // 0 = Sunday, 1 = Monday
  },
  
  // Resources (rooms, people, etc.)
  resources: [
    { id: 'room-a', name: 'Room A', color: '#3b82f6' },
    { id: 'room-b', name: 'Room B', color: '#10b981' }
  ],
  
  // Event field mapping (if different from defaults)
  eventFields: {
    id: 'id',
    title: 'title',
    start: 'startDate',      // Map to your field names
    end: 'endDate',
    allDay: 'isAllDay',
    resourceId: 'roomId',
    color: 'eventColor'
  },
  
  // Callbacks
  onEventClick: (event, e) => { ... },
  onEventDoubleClick: (event, e) => { ... },
  onSlotSelect: ({ start, end, resourceId }) => { ... },
  onEventDrop: (event, { start, end, resourceId }) => { ... },
  onEventResize: (event, { start, end }) => { ... },
  onNavigate: (date, view) => { ... },
  
  // Rendering
  eventContent: (event) => (
    <div class="custom-event">
      <strong>{event.title}</strong>
      <span>{event.location}</span>
    </div>
  ),
  
  // Styling
  classes: {
    root: 'my-calendar',
    header: 'calendar-header'
  }
})
```

### Event Structure

Default event structure:

```ts
interface CalendarEvent {
  id: string | number
  title: string
  start: Date | string
  end: Date | string
  allDay?: boolean
  resourceId?: string       // For resource view
  color?: string            // Event color
  recurring?: RecurringRule // For recurring events
}
```

### Calendar State

All state properties are signals:

```ts
// View control
calendar.view()              // Current view
calendar.setView('month')
calendar.date()              // Current date
calendar.setDate(new Date())
calendar.today()             // Go to today

// Navigation
calendar.next()              // Next day/week/month
calendar.prev()              // Previous day/week/month
calendar.goTo(date)          // Navigate to specific date

// Date range
calendar.dateRange()         // { start: Date, end: Date }

// Resources
calendar.resources()         // All resources
calendar.selectedResources() // Currently filtered resources
calendar.selectResource(id)
calendar.deselectResource(id)
calendar.toggleResource(id)

// Events
calendar.events()            // All events in current range
calendar.selectedEvent()     // Currently selected event
calendar.selectEvent(event)
calendar.clearSelection()
```

### Views

**Day View:**
Single day with hourly slots.

**Week View:**
7-day view with hourly slots per day.

**Month View:**
Full month grid with day cells.

**Agenda View:**
List of upcoming events.

```ts
// Change view
calendar.setView('day')
calendar.setView('week')
calendar.setView('month')
calendar.setView('agenda')

// Custom view label
const viewLabels = {
  day: 'Tag',
  week: 'Woche',
  month: 'Monat',
  agenda: 'Liste'
}
```

### Resources

Group events by resource (rooms, people, equipment):

```ts
const calendar = createCalendar({
  events: () => appointments,
  resources: [
    { 
      id: 'dr-smith', 
      name: 'Dr. Smith', 
      color: '#3b82f6',
      workingHours: {
        monday: { start: '09:00', end: '17:00' },
        tuesday: { start: '09:00', end: '17:00' }
        // etc.
      }
    },
    { 
      id: 'dr-jones', 
      name: 'Dr. Jones', 
      color: '#10b981' 
    }
  ],
  view: 'week'  // Resources shown as columns in week view
})
```

### Recurring Events

```ts
const recurringEvent = {
  id: 'meeting-1',
  title: 'Team Meeting',
  start: '2024-01-15T10:00:00',
  end: '2024-01-15T11:00:00',
  recurring: {
    frequency: 'weekly',    // 'daily' | 'weekly' | 'monthly' | 'yearly'
    interval: 1,            // Every 1 week
    byDay: ['MO', 'WE'],    // Monday and Wednesday
    until: '2024-12-31',    // End date (optional)
    count: 10               // Or number of occurrences
  }
}

// Expand recurring events in a date range
import { expandRecurring } from '@liteforge/calendar'

const instances = expandRecurring(recurringEvent, {
  start: new Date('2024-01-01'),
  end: new Date('2024-03-31')
})
```

### Drag and Drop

Enable event dragging and resizing:

```ts
const calendar = createCalendar({
  events: () => appointments,
  
  // Called when event is dropped to new time/resource
  onEventDrop: async (event, { start, end, resourceId }) => {
    await api.updateEvent(event.id, { start, end, resourceId })
    refetchEvents()
  },
  
  // Called when event is resized
  onEventResize: async (event, { start, end }) => {
    await api.updateEvent(event.id, { start, end })
    refetchEvents()
  }
})
```

### Styling

**CSS Variables:**
```css
:root {
  --lf-calendar-border-color: #e5e7eb;
  --lf-calendar-header-bg: #f9fafb;
  --lf-calendar-today-bg: #eff6ff;
  --lf-calendar-slot-height: 48px;
  --lf-calendar-event-radius: 4px;
}
```

**Custom classes:**
```ts
const calendar = createCalendar({
  events: () => appointments,
  classes: {
    root: 'rounded-lg shadow-lg',
    header: 'bg-white border-b',
    event: 'cursor-pointer hover:shadow-md'
  }
})
```

**Unstyled mode:**
```ts
const calendar = createCalendar({
  events: () => appointments,
  unstyled: true  // No default styles
})
```

## Date Utilities

The package exports date utilities for advanced usage:

```ts
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addDays,
  addWeeks,
  addMonths,
  isSameDay,
  isToday,
  formatTime,
  formatDate
} from '@liteforge/calendar'
```

## Usage in Components

```tsx
import { createComponent } from '@liteforge/runtime'
import { createQuery, createMutation } from '@liteforge/query'
import { createCalendar } from '@liteforge/calendar'

const AppointmentCalendar = createComponent({
  component: () => {
    const appointments = createQuery({
      key: 'appointments',
      fn: () => fetch('/api/appointments').then(r => r.json())
    })
    
    const updateAppointment = createMutation({
      fn: (data) => fetch(`/api/appointments/${data.id}`, {
        method: 'PATCH',
        body: JSON.stringify(data)
      }),
      invalidate: ['appointments']
    })
    
    const calendar = createCalendar({
      events: () => appointments.data() ?? [],
      view: 'week',
      resources: [
        { id: 'room-1', name: 'Treatment Room 1' },
        { id: 'room-2', name: 'Treatment Room 2' }
      ],
      onEventClick: (event) => {
        openEditModal(event)
      },
      onSlotSelect: ({ start, end, resourceId }) => {
        openCreateModal({ start, end, resourceId })
      },
      onEventDrop: (event, newTimes) => {
        updateAppointment.mutate({ id: event.id, ...newTimes })
      }
    })
    
    return (
      <div>
        <div class="toolbar">
          <button onclick={() => calendar.prev()}>Previous</button>
          <button onclick={() => calendar.today()}>Today</button>
          <button onclick={() => calendar.next()}>Next</button>
          
          <select onchange={(e) => calendar.setView(e.target.value)}>
            <option value="day">Day</option>
            <option value="week" selected>Week</option>
            <option value="month">Month</option>
            <option value="agenda">Agenda</option>
          </select>
        </div>
        
        <calendar.Root />
      </div>
    )
  }
})
```

## Types

```ts
import type {
  CalendarOptions,
  CalendarResult,
  CalendarEvent,
  CalendarView,
  CalendarClasses,
  Resource,
  WorkingHours,
  TimeConfig,
  RecurringRule,
  DateRange,
  SlotSelection
} from '@liteforge/calendar'
```

## License

MIT
