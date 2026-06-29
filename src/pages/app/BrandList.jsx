import { useEffect, useState } from 'react'
import { Box, CircularProgress } from '@mui/material'
import { useWorkspace } from '../../lib/WorkspaceContext'
import { supabase } from '../../lib/supabase'

// One brand per workspace: ao entrar em "Brand OS", redireciona pro brand book
// da marca do workspace; se não houver marca, manda pro onboarding.
export function BrandList() {
  const { workspace } = useWorkspace()
  const [resolving, setResolving] = useState(true)

  useEffect(() => {
    if (!workspace?.id) return
    let cancelled = false
    ;(async () => {
      const { data } = await supabase
        .from('brands')
        .select('id')
        .eq('workspace_id', workspace.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()
      if (cancelled) return
      if (data?.id) {
        window.location.hash = `#/app/brands/${data.id}`
      } else {
        window.location.hash = '#/app/brands/new'
      }
      setResolving(false)
    })()
    return () => { cancelled = true }
  }, [workspace?.id])

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
      <CircularProgress color="primary" size={28} />
    </Box>
  )
}
