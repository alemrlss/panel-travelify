'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth'
import { updateOpportunityStage } from '@/lib/ghl/client'

export async function moveOpportunityStage(opportunityId: string, pipelineStageId: string) {
  await requireUser()
  await updateOpportunityStage(opportunityId, pipelineStageId)
  // Layout completo: el Dashboard también lee el pipeline (tasa de cierre).
  revalidatePath('/', 'layout')
}
