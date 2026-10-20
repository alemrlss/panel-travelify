export type GhlOpportunityStatus = 'open' | 'won' | 'lost' | 'abandoned'

export interface GhlPipelineStage {
  id: string
  name: string
  position: number
  color?: string
}

export interface GhlPipeline {
  id: string
  name: string
  stages: GhlPipelineStage[]
}

export interface GhlOpportunity {
  id: string
  name: string
  pipelineId: string
  pipelineStageId: string
  status: GhlOpportunityStatus
  contactId: string
  monetaryValue?: number
  createdAt: string
  updatedAt?: string
  contact?: GhlContact
}

export interface GhlContact {
  id: string
  firstName?: string
  lastName?: string
  name?: string
  contactName?: string
  companyName?: string
  email?: string
  phone?: string
  website?: string
}

export interface GhlSearchMeta {
  total: number
  nextPage?: number | string | null
}
