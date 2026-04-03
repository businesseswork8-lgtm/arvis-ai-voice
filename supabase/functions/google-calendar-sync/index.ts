import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'

async function getValidToken(supabase: any, syncKey: string): Promise<{ token: string } | { error: string }> {
  const { data: conn } = await supabase
    .from('google_calendar_connections')
    .select('*')
    .eq('sync_key', syncKey)
    .single()

  if (!conn) return { error: 'Not connected to Google Calendar' }

  // Check if token is expired
  if (new Date(conn.token_expires_at) <= new Date()) {
    const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID')!
    const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')!

    const refreshRes = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        refresh_token: conn.refresh_token,
        grant_type: 'refresh_token',
      }),
    })

    if (!refreshRes.ok) return { error: 'Failed to refresh token' }

    const tokens = await refreshRes.json()
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

    await supabase.from('google_calendar_connections').update({
      access_token: tokens.access_token,
      token_expires_at: expiresAt,
    }).eq('sync_key', syncKey)

    return { token: tokens.access_token }
  }

  return { token: conn.access_token }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const { action, sync_key, event } = await req.json()

    const tokenResult = await getValidToken(supabase, sync_key)
    if ('error' in tokenResult) {
      return new Response(JSON.stringify({ error: tokenResult.error }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const headers = {
      Authorization: `Bearer ${tokenResult.token}`,
      'Content-Type': 'application/json',
    }

    if (action === 'list_events') {
      const now = new Date()
      const timeMin = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
      const timeMax = new Date(now.getFullYear(), now.getMonth() + 3, 0).toISOString()

      const res = await fetch(
        `${GOOGLE_CALENDAR_API}/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime&maxResults=250`,
        { headers }
      )

      if (!res.ok) {
        const err = await res.text()
        return new Response(JSON.stringify({ error: `Failed to fetch events: ${err}` }), {
          status: res.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const data = await res.json()
      return new Response(JSON.stringify({ events: data.items || [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'create_event') {
      const gcalEvent = {
        summary: event.title,
        description: event.description || '',
        start: {
          dateTime: event.start_datetime,
          timeZone: event.timezone || 'UTC',
        },
        end: {
          dateTime: event.end_datetime || new Date(new Date(event.start_datetime).getTime() + 3600000).toISOString(),
          timeZone: event.timezone || 'UTC',
        },
      }

      const res = await fetch(`${GOOGLE_CALENDAR_API}/calendars/primary/events`, {
        method: 'POST',
        headers,
        body: JSON.stringify(gcalEvent),
      })

      if (!res.ok) {
        const err = await res.text()
        return new Response(JSON.stringify({ error: `Failed to create event: ${err}` }), {
          status: res.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const created = await res.json()
      return new Response(JSON.stringify({ google_event_id: created.id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'update_event') {
      const gcalEvent = {
        summary: event.title,
        description: event.description || '',
        start: {
          dateTime: event.start_datetime,
          timeZone: event.timezone || 'UTC',
        },
        end: {
          dateTime: event.end_datetime || new Date(new Date(event.start_datetime).getTime() + 3600000).toISOString(),
          timeZone: event.timezone || 'UTC',
        },
      }

      const res = await fetch(`${GOOGLE_CALENDAR_API}/calendars/primary/events/${event.google_event_id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(gcalEvent),
      })

      if (!res.ok) {
        const err = await res.text()
        return new Response(JSON.stringify({ error: `Failed to update event: ${err}` }), {
          status: res.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'delete_event') {
      const res = await fetch(`${GOOGLE_CALENDAR_API}/calendars/primary/events/${event.google_event_id}`, {
        method: 'DELETE',
        headers,
      })

      if (!res.ok && res.status !== 404) {
        const err = await res.text()
        return new Response(JSON.stringify({ error: `Failed to delete event: ${err}` }), {
          status: res.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
