'use client'

import { useParams, useRouter } from 'next/navigation'
import { doc, updateDoc } from 'firebase/firestore'
import { useDoc } from '@/firebase/firestore/use-doc'
import { Template, WithId } from '@/lib/types'
import { TemplateForm, TemplateFormData } from '@/components/template-form'
import { useFirebase, useMemoFirebase } from '@/firebase/provider' // CORREÇÃO: Usar useFirebase
import { useToast } from '@/hooks/use-toast'
import { PageHeader } from '@/components/page-header'
import { Loader2 } from 'lucide-react'

export default function EditTemplatePage() {
  const params = useParams()
  const id = params.id as string;
  const router = useRouter()
  const { toast } = useToast()
  const { firestore, user } = useFirebase() // CORREÇÃO: Obter firestore e user

  // CORREÇÃO: O caminho para o doc do template agora é dinâmico e seguro
  const docRef = useMemoFirebase(() => {
    // CORREÇÃO: Espera por firestore, id E user antes de criar a referência
    if (!firestore || !id || !user) return null;
    return doc(firestore, `users/${user.uid}/messageTemplates/${id}`);
  }, [firestore, id, user]); // CORREÇÃO: Adicionar user como dependência

  const { data: template, isLoading, error } = useDoc<Template>(docRef)

  const handleSave = async (data: TemplateFormData) => {
    if (!docRef) return; // docRef já está correto e seguro
    
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

  // O erro de permissão será capturado aqui também
  if (error) {
    return <div className="text-center text-destructive">Erro ao carregar o template: {error.message}</div>
  }

  if (!template && !isLoading) { // Evita mostrar "não encontrado" durante o carregamento inicial
    return <div className="text-center">Template não encontrado.</div>
  }

  return (
    <>
        {template && <PageHeader title={`Editar Template: ${template.title}`} />}
        {template && <TemplateForm 
          template={template as WithId<Template>} 
          onSave={handleSave} 
          onCancel={handleCancel} 
        />}
    </>
  )
}
