'use client'

import { useRouter } from 'next/navigation'
import { collection, addDoc } from 'firebase/firestore'
import { TemplateForm, TemplateFormData } from '@/components/template-form'
import { useFirestore, useUser } from '@/firebase/provider' // Importando o useUser
import { useToast } from '@/hooks/use-toast'

export default function NewTemplatePage() {
  const router = useRouter()
  const { toast } = useToast()
  const firestore = useFirestore()
  const { user } = useUser() // Obtendo o usuário autenticado

  const handleSave = async (data: TemplateFormData) => {
    // Garante que temos o usuário e o firestore antes de prosseguir
    if (!firestore || !user) return;

    try {
      // Caminho correto da coleção, dentro do documento do usuário
      const templatesCollection = collection(firestore, `users/${user.uid}/messageTemplates`);
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
    <TemplateForm onSave={handleSave} onCancel={handleCancel} />
  )
}
