## Declutter App — 5 Changes Plan

### 1. GCal event color fix ✅ (Simple)
- Change `#4285f4` → `#93c5fd` in `syncGCalToLocal()` in `src/lib/gcal.ts`

### 2. Calendar Day view button overlap fix ✅ (Simple)
- Add right padding to calendar header to prevent overlap with Settings icon

### 3. AI-powered Home + Notes as 5th tab (Complex)
- **Home tab**: Remove current box layout. On load, call Gemini API (via edge function using Lovable AI) with today's events/tasks/reminders to generate a natural language daily brief. Show AI summary as hero, then structured sections below.
- **Notes tab**: Create new `NotesTab.tsx` with folder grid + note browsing
- **BottomNav**: Add 5th "Notes" tab with notebook icon
- **Index.tsx**: Wire up the new tab

### 4. Sub-tasks for Tasks (Medium)
- **Migration**: Add `parent_id UUID REFERENCES public.items(id) ON DELETE CASCADE` to items table
- **TasksTab.tsx**: Show only parent tasks (parent_id IS NULL), add expandable sub-task section with chevron, inline "+ Add sub-task" input
- **Sub-tasks**: Stored as type "Task" with parent_id set

### 5. Web Push Notifications (Complex)
- **New table**: `push_subscriptions` (id, sync_key, subscription jsonb, created_at)
- **Service worker**: `/public/sw.js` for push events
- **Client**: Request permission on load, save subscription to Supabase
- **Edge function**: `send-notifications` — checks items due soon, sends web push
- **VAPID keys**: Generate and store as secrets
- **Scheduling**: Use pg_cron to call the edge function every 15 minutes

### Order of execution:
1. Migration (parent_id + push_subscriptions table)
2. Simple fixes (color + calendar overlap)
3. Notes tab + BottomNav update
4. AI-powered home (edge function + HomeTab rewrite)
5. Sub-tasks UI
6. Web push notifications (service worker + edge function + client registration)
