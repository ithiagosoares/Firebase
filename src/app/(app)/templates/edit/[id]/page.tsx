'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useDoc } from '@/firebase/firestore/use-doc'
import { Template } from '@/lib/types'
import { WithId } from '@/firebase/firestore/use-collection'
// CORREÇÃO: Usar importação nomeada com chaves {}
import { TemplateForm } from '@/components/template-form'

export default function EditTemplatePage() {
  const { id } = useParams()
  const { data: template, loading } = useDoc<Template>(`templates/${id}`)

  // O estado local foi removido, pois o próprio TemplateForm gerencia isso.
  // A lógica de setar o estado foi passada para dentro do TemplateForm.

  if (loading) {
    return <div>Loading...</div>
  }

  // Passa o template diretamente para o formulário.
  return <TemplateForm template={template as WithId<Template>} />
}
