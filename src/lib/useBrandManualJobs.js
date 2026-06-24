import { useEffect, useState, useRef } from 'react'
import { supabase } from './supabase'

// Retorna jobs de extração de brand manual (processing/done/error)
// dentro do workspace, fazendo polling de 5s enquanto houver job processing.
// Done/error continuam visíveis por 30min pra dar feedback ao usuário.
const RECENT_WINDOW_MIN = 30

export function useBrandManualJobs(workspaceId) {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(false)
  const pollRef = useRef(null)

  async function fetchJobs() {
    if (!workspaceId) return
    setLoading(true)
    // jobs pra brand do workspace, processing OU recentes (30min)
    const cutoff = new Date(Date.now() - RECENT_WINDOW_MIN * 60_000).toISOString()
    const { data: brands } = await supabase
      .from('brands').select('id, nome').eq('workspace_id', workspaceId)
    const brandIds = (brands || []).map(b => b.id)
    if (brandIds.length === 0) { setJobs([]); setLoading(false); return }
    const brandMap = Object.fromEntries((brands || []).map(b => [b.id, b.nome]))

    // Duas queries: jobs recentes (qualquer status) + jobs processing antigos (stuck).
    // Evita .or() com timestamp que estava gerando 400.
    const [{ data: recent }, { data: stuck }] = await Promise.all([
      supabase.from('brand_manual_jobs')
        .select('id, brand_id, status, error, created_at, file_path')
        .in('brand_id', brandIds)
        .gte('created_at', cutoff)
        .order('created_at', { ascending: false })
        .limit(20),
      supabase.from('brand_manual_jobs')
        .select('id, brand_id, status, error, created_at, file_path')
        .in('brand_id', brandIds)
        .eq('status', 'processing')
        .lt('created_at', cutoff)
        .order('created_at', { ascending: false })
        .limit(10),
    ])
    const merged = [...(recent || []), ...(stuck || [])]
    setJobs(merged.map(j => ({ ...j, brand_nome: brandMap[j.brand_id] })))
    setLoading(false)
  }

  useEffect(() => {
    if (!workspaceId) return
    fetchJobs()
    // poll enquanto houver job processing
    pollRef.current = setInterval(() => {
      setJobs(prev => {
        const stillProcessing = prev.some(j => j.status === 'processing')
        if (stillProcessing) fetchJobs()
        return prev
      })
    }, 5000)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [workspaceId])

  const processing = jobs.filter(j => j.status === 'processing').length

  return { jobs, loading, processing, refetch: fetchJobs }
}
