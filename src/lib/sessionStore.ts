import { writable } from 'svelte/store'
import { supabase } from './supabase_client'

export const session = writable(null)

supabase.auth.onAuthStateChange((_, _session) => {
    session.set(_session as null)
})