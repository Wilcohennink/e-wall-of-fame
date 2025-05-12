import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://mlzoehhfkiblogzgfqdi.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sem9laGhma2libG9nemdmcWRpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjcwNDExNiwiZXhwIjoyMDYyMjgwMTE2fQ.waRhdCwyPoVu_eUZsX1rMX916Ovthca8qwdq-UWHo58'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)