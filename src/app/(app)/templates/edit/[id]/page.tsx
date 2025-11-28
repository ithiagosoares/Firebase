'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useDoc } from '@/firebase/firestore/use-doc'
import { Template } from '@/lib/types'
import { WithId } from '@/firebase/firestore/use-collection'
import TemplateForm from '@/components/template-form'

export default function EditTemplatePage() {
  const { id } = useParams()
  const { data: template, loading } = useDoc<Template>(`templates/${id}`)

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('') // State for content

  useEffect(() => {
    if (template) {
      setTitle(template.title)
      // CORREÇÃO: Usar 'body' em vez de 'content' para corresponder ao tipo Template
      setContent(template.body) 
    }
  }, [template])

  if (loading) {
    return <div>Loading...</div>
  }

  return <TemplateForm template={template as WithId<Template>} />
}
