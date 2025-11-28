
"use client"

import { useState } from "react"
import { PlusCircle, Loader2, FileText, Pencil, Copy, Send, Trash2, MoreVertical, Star, Workflow } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { PageHeader } from "@/components/page-header"
import { type Template } from "@/lib/types"
import { collection, doc, writeBatch, query, where, getDocs, deleteDoc, addDoc } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

import { useFirestore, useMemoFirebase } from "@/firebase/provider"
import { useCollection } from "@/firebase/firestore/use-collection"

export default function TemplatesPage() {
  const firestore = useFirestore()
  const { toast } = useToast()

  // CORREÇÃO: Busca da coleção raiz 'templates'
  const templatesCollection = useMemoFirebase(() => {
    if (!firestore) return null
    return collection(firestore, `templates`)
  }, [firestore]);

  const { data: templates, isLoading } = useCollection<Template>(templatesCollection);

  const handleDeleteTemplate = async (templateId: string) => {
    if (!firestore) return;
    try {
      const templateDocRef = doc(firestore, `templates/${templateId}`);
      await deleteDoc(templateDocRef);
      toast({
        title: "Template excluído",
        description: "O modelo de mensagem foi removido.",
      })
    } catch (error) {
      console.error(error)
      toast({ title: "Erro", description: "Não foi possível excluir o template.", variant: "destructive" })
    }
  };
  
  const handleDuplicateTemplate = async (template: Template) => {
    if (!firestore || !templatesCollection) return;
    const newTemplate = {
      ...template,
      title: `${template.title} (Cópia)`,
      isDefault: false,
    };
    delete (newTemplate as any).id
    
    try {
      await addDoc(templatesCollection, newTemplate);
      toast({
        title: "Template duplicado!",
        description: `O template "${template.title}" foi copiado com sucesso.`,
      })
    } catch(error) {
      console.error(error)
      toast({ title: "Erro", description: "Não foi possível duplicar o template.", variant: "destructive" })
    }
  }
  
  const handleSendTest = (template: Template) => {
    toast({
      title: "Funcionalidade não implementada",
      description: `O envio de teste para "${template.title}" ainda não está ativo.`,
    })
  }

  const handleSetDefault = async (templateToSet: Template) => {
    if (!firestore || !templatesCollection) return;

    const batch = writeBatch(firestore);
    
    const q = query(templatesCollection, where("isDefault", "==", true));
    const querySnapshot = await getDocs(q);

    querySnapshot.forEach((document) => {
        const oldDefaultRef = doc(firestore, `templates`, document.id);
        batch.update(oldDefaultRef, { isDefault: false });
    });
    
    const newDefaultRef = doc(firestore, `templates`, templateToSet.id);
    batch.update(newDefaultRef, { isDefault: true });

    try {
        await batch.commit();
        toast({
            title: "Template Padrão Atualizado",
            description: `"${templateToSet.title}" é agora o template padrão.`
        });
    } catch (error) {
        console.error("Error setting default template: ", error);
        toast({
            variant: "destructive",
            title: "Erro",
            description: "Não foi possível definir o template padrão."
        });
    }
  };

  const renderEmptyState = () => (
    <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm mt-8">
      <div className="flex flex-col items-center gap-2 text-center">
        <FileText className="h-12 w-12 text-muted-foreground" />
        <h3 className="text-2xl font-bold tracking-tight">
          Nenhum template encontrado
        </h3>
        <p className="text-sm text-muted-foreground">
          Comece criando seu primeiro modelo de mensagem.
        </p>
         <Button className="mt-4" asChild>
          <Link href="/templates/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            Criar Template
          </Link>
        </Button>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <>
      <PageHeader title="Templates de Mensagens">
        <Button asChild>
          <Link href="/templates/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            Criar Template
          </Link>
        </Button>
      </PageHeader>

      {templates && templates.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Card key={template.id} className="flex flex-col">
              <CardHeader className="flex flex-row items-start justify-between">
                  <CardTitle className="pr-4">{template.title}</CardTitle>
                  {template.isDefault !== undefined && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="shrink-0 text-muted-foreground hover:text-amber-500"
                      onClick={() => handleSetDefault(template)}
                    >
                      <Star className={cn("h-5 w-5", template.isDefault && "fill-amber-400 text-amber-500")} />
                      <span className="sr-only">Marcar como padrão</span>
                    </Button>
                  )}
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-sm text-muted-foreground line-clamp-3">{template.body}</p>
              </CardContent>
              <CardFooter className="flex justify-between items-center bg-muted/50 p-4 border-t">
                  <Button variant="outline" size="sm" onClick={() => handleSendTest(template)}>
                    <Send className="mr-2 h-4 w-4" />
                    Teste
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                          <Link href={`/templates/edit/${template.id}`} className="cursor-pointer">
                              <Pencil className="mr-2 h-4 w-4" />
                              Editar
                          </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDuplicateTemplate(template)}>
                        <Copy className="mr-2 h-4 w-4" />
                        Duplicar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDeleteTemplate(template.id)} className="text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        renderEmptyState()
      )}
    </>
  )
}
