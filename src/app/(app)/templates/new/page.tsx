'use client'

import { useRouter } from 'next/navigation'
import { collection, addDoc } from 'firebase/firestore'
import { TemplateForm, TemplateFormData } from '@/components/template-form'
import { useFirestore } from '@/firebase/provider'
import { useToast } from '@/hooks/use-toast'
import { PageHeader } from '@/components/page-header'

export default function NewTemplatePage() {
  const router = useRouter()
  const { toast } = useToast()
  const firestore = useFirestore()

  const handleSave = async (data: TemplateFormData) => {
    if (!firestore) return;

    try {
      // CORREÇÃO: Salva na coleção raiz 'templates', para manter consistência com a edição.
      const templatesCollection = collection(firestore, 'templates');
      await addDoc(templatesCollection, data);

      toast({ title: "Template criado!", description: "Seu novo template foi salvo com sucesso." });
      router.push('/templates');
    } catch (error) {
        console.error("Erro ao criar template: ", error)
        toast({ title: "Erro", description: "Ocorreu um erro ao salvar o template.", variant: "destructive" });
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <>
      <PageHeader title="Criar Novo Template" />
      <TemplateForm onSave={handleSave} onCancel={handleCancel} />
    </>
  )
}
