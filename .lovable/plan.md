## Phase 1: Data Model & UI Restructuring
1. **Bottom Nav** — Change to 4 tabs: Home | Calendar | Tasks | Reminders (remove Folders tab)
2. **Data Model** — Remove folder field from Tasks, Reminders, Calendar Events. Only Notes have folders. Calendar Events get start/end datetime + color
3. **Home Screen** — Remove folder management button, show only note folders in the grid, remove Calendar/Tasks/Reminders as folder cards
4. **Folder Management** — Move add/edit/delete folder UI into Settings screen

## Phase 2: Manual Creation
5. **Tasks page** — Add floating '+' button with form: Title, Description, Due Date, Due Time (optional)
6. **Reminders page** — Add floating '+' button with form: Title, Date, Time
7. **Calendar page** — Add floating '+' button with form: Title, Description, Start Date, Start Time, End Time, Color picker. Also support tapping empty time slots

## Phase 3: Google Calendar Sync
8. **Google Calendar OAuth** — Add "Connect Google Calendar" button in Settings using Lovable Cloud's managed Google OAuth
9. **2-way sync** — Fetch Google Calendar events, push confirmed events/tasks/reminders to Google Calendar, sync edits and deletes
10. **UI indicators** — Show 'GCal' badge on synced events, show soft banner when not connected

## Phase 4: AI Extraction Updates
11. **Update system prompt** — Remove folder from Tasks/Reminders/Calendar Events output. Add folder confidence for Notes with picker UI
12. **Context injection** — Pass last 10 confirmed notes per folder as examples
13. **Date resolution** — Pass today's date so AI resolves relative dates to ISO

## Database Migration
- Add `end_datetime` and `event_color` columns to items table for Calendar Events
- No other schema changes needed (folder field stays nullable, already works for notes-only)
