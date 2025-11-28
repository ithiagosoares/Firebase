'use client'

import { useParams, useRouter } from 'next/navigation'
import { doc, updateDoc } from 'firebase/firestore'
import { useDoc } from '@/firebase/firestore/use-doc'
import { Template, WithId } from '@/lib/types'
import { TemplateForm, TemplateFormData } from '@/components/template-form' // CORREÇÃO: Importa o formulário e o tipo de dados
import { useFirestore } from '@/firebase/provider' // CORREÇÃO: Usa o hook para o Firestore
import { useToast } from '@/hooks/use-toast'
import { useMemo } from 'react'
import { PageHeader } from '@/components/page-header'
import { Loader2 } from 'lucide-react'

export default function EditTemplatePage() {
  const params = useParams()
  const id = params.id as string;
  const router = useRouter()
  const { toast } = useToast()
  const firestore = useFirestore() 

  // CORREÇÃO: O caminho para o doc do template deve ser consistente (ex: sem user.uid se for geral)
  const docRef = useMemo(() => {
    if (!firestore || !id) return null;
    // Assumindo que os templates são uma coleção de nível raiz. Ajuste se for diferente (ex: users/${user.uid}/templates/${id})
    return doc(firestore, `templates/${id}`);
  }, [firestore, id]);

  // O useDoc agora tem o tipo genérico <Template> para tipagem correta
  const { data: template, isLoading, error } = useDoc<Template>(docRef)

  // CORREÇÃO: O manipulador de save agora recebe 'data' do formulário com o tipo correto
  const handleSave = async (data: TemplateFormData) => {
    if (!docRef) return;
    
    // O objeto 'data' já vem pronto do TemplateForm
    await updateDoc(docRef, data);

    toast({ title: "Template salvo!", description: "Suas alterações foram salvas com sucesso." });
    router.push('/templates');
  };

  const handleCancel = () => {
    router.back();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return <div className="text-center text-destructive">Erro ao carregar o template: {error.message}</div>
  }

  if (!template) {
    return <div className="text-center">Template não encontrado.</div>
  }

  return (
    <>
        <PageHeader title={`Editar Template: ${template.title}`} />
        <TemplateForm 
          template={template as WithId<Template>} 
          onSave={handleSave} 
          onCancel={handleCancel} 
        />
    </>
  )
}
