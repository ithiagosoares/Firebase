
"use client"

import { PlusCircle, Loader2, FileText, Pencil, Copy, Send, Trash2, MoreVertical, Star } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { type Template, WithId } from "@/lib/types"
import { collection, doc, writeBatch, query, where, getDocs, deleteDoc, addDoc } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

import { useFirebase, useMemoFirebase } from "@/firebase/provider"
import { useCollection } from "@/firebase/firestore/use-collection"

export default function TemplatesView() {
  const { firestore, user } = useFirebase()
  const { toast } = useToast()

  const templatesCollection = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return collection(firestore, `users/${user.uid}/messageTemplates`)
  }, [firestore, user]);

  const { data: templates, isLoading } = useCollection<Template>(templatesCollection);

  const handleDeleteTemplate = async (templateId: string) => {
    if (!firestore || !user) return;
    const templateDocRef = doc(firestore, `users/${user.uid}/messageTemplates/${templateId}`);
    try {
      await deleteDoc(templateDocRef);
      toast({
        title: "Template excluído",
        description: "O modelo de mensagem foi removido.",
      })
    } catch (error) {
       console.error("Erro ao excluir:", error)
       toast({ title: "Erro", description: "Falha ao excluir o template.", variant: "destructive" })
    }
  };
  
  const handleDuplicateTemplate = async (template: WithId<Template>) => {
    if (!firestore || !user || !templatesCollection) return;
    const { id, ...templateData } = template;
    const newTemplate = {
      ...templateData,
      title: `${template.title} (Cópia)`,
      isDefault: false,
    };
    
    try {
        await addDoc(templatesCollection, newTemplate);
        toast({
          title: "Template duplicado!",
          description: `O template foi copiado com sucesso.`
        })
    } catch(error) {
        console.error("Erro ao duplicar:", error)
        toast({ title: "Erro", description: "Falha ao duplicar o template.", variant: "destructive" })
    }
  }
  
  const handleSendTest = (template: WithId<Template>) => {
    toast({
      title: "Funcionalidade não implementada",
      description: `O envio de teste para \"${template.title}\" ainda não está ativo.`,
    })
  }

  const handleSetDefault = async (templateToSet: WithId<Template>) => {
    if (!firestore || !user) return;

    const batch = writeBatch(firestore);
    const collectionPath = `users/${user.uid}/messageTemplates`;
    const templatesRef = collection(firestore, collectionPath);
    const q = query(templatesRef, where("isDefault", "==", true));
    
    try {
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((doc) => {
            batch.update(doc.ref, { isDefault: false });
        });
        
        const newDefaultRef = doc(firestore, collectionPath, templateToSet.id);
        batch.update(newDefaultRef, { isDefault: true });

        await batch.commit();
        toast({
            title: "Template Padrão Atualizado",
            description: `\"${templateToSet.title}\" é agora o template padrão.`
        });
    } catch (error) {
        console.error("Erro ao definir padrão: ", error);
        toast({
            variant: "destructive",
            title: "Erro",
            description: "Não foi possível definir o template padrão."
        });
    }
  };

  const renderEmptyState = () => (
    <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm mt-8">
      <div className="flex flex-col items-center gap-2 text-center p-8">
        <FileText className="h-12 w-12 text-muted-foreground" />
        <h3 className="text-2xl font-bold tracking-tight">Nenhum template encontrado</h3>
        <p className="text-sm text-muted-foreground">Comece criando seu primeiro modelo de mensagem.</p>
        <Button className="mt-4" asChild>
          <Link href="/templates/new"><PlusCircle className="mr-2 h-4 w-4" />Criar Template</Link>
        </Button>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
    )
  }

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button asChild>
          <Link href="/templates/new"><PlusCircle className="mr-2 h-4 w-4" />Criar Template</Link>
        </Button>
      </div>

      {templates && templates.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Card key={template.id} className="flex flex-col">
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                  <CardTitle className="truncate">{template.title}</CardTitle>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="shrink-0 text-muted-foreground hover:text-amber-500"
                    onClick={() => handleSetDefault(template)}
                  >
                    <Star className={cn("h-5 w-5", template.isDefault && "fill-amber-400 text-amber-500")} />
                    <span className="sr-only">Marcar como padrão</span>
                  </Button>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-sm text-muted-foreground line-clamp-3">{template.body || "Este template não possui conteúdo."}</p>
              </CardContent>
              <CardFooter className="flex justify-between items-center bg-muted/50 p-4 border-t">
                  <Button variant="outline" size="sm" onClick={() => handleSendTest(template)}>
                    <Send className="mr-2 h-4 w-4" />
                    Teste
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                          <Link href={`/templates/edit/${template.id}`} className="cursor-pointer">
                              <Pencil className="mr-2 h-4 w-4" />Editar
                          </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDuplicateTemplate(template)}>
                        <Copy className="mr-2 h-4 w-4" />Duplicar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDeleteTemplate(template.id)} className="text-destructive focus:text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" />Excluir
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
