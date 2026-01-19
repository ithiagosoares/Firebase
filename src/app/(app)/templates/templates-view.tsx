"use client"

import { useState } from "react"
import { PlusCircle, Loader2, Pencil, Copy, Send, Trash2, MoreVertical, Star, Sparkles, BookTemplate } from "lucide-react"
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

import { TemplateLibraryDialog } from "@/components/template-library-dialog"

export default function TemplatesView() {
  const { firestore, user } = useFirebase()
  const { toast } = useToast()
  
  const [isLibraryOpen, setIsLibraryOpen] = useState(false)

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
          description: "O template foi copiado com sucesso."
        })
    } catch(error) {
        console.error("Erro ao duplicar:", error)
        toast({ title: "Erro", description: "Falha ao duplicar o template.", variant: "destructive" })
    }
  }
  
  const handleSendTest = (template: WithId<Template>) => {
    toast({
      title: "Funcionalidade não implementada",
      description: `O envio de teste para "${template.title}" ainda não está ativo.`,
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
            description: `"${templateToSet.title}" é agora o template padrão.`
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
    <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm mt-8 min-h-[300px]">
      <div className="flex flex-col items-center gap-3 text-center p-8 max-w-md">
        <div className="bg-primary/10 p-4 rounded-full">
            <Sparkles className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-2xl font-bold tracking-tight">Comece com templates prontos</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Nossa galeria possui modelos testados para confirmação, lembretes e marketing.
        </p>
        
        <div className="flex flex-col gap-3 w-full justify-center items-center">
            <Button onClick={() => setIsLibraryOpen(true)} className="w-full sm:w-auto">
                <BookTemplate className="mr-2 h-4 w-4" />
                Abrir Galeria de Modelos
            </Button>
            
            <Button asChild variant="link" className="text-muted-foreground">
                <Link href="/templates/new">
                   ou criar do zero
                </Link>
            </Button>
        </div>
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
            <h2 className="text-2xl font-bold tracking-tight">Meus Templates</h2>
            <p className="text-muted-foreground">Gerencie as mensagens automáticas do sistema.</p>
        </div>
        {/* 
        <div className="flex gap-2 w-full sm:w-auto">
            <Button onClick={() => setIsLibraryOpen(true)} className="flex-1 sm:flex-none">
                <BookTemplate className="mr-2 h-4 w-4" />
                Galeria
            </Button>

            <Button asChild variant="outline" className="flex-1 sm:flex-none">
                <Link href="/templates/new">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Novo
                </Link>
            </Button>
        </div>
        */} 
      </div>
         
      {templates && templates.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Card key={template.id} className="flex flex-col hover:border-primary/40 transition-colors group relative">
              <CardHeader className="flex flex-row items-start justify-between gap-4 pb-2">
                  {/* --- CORREÇÃO AQUI: Adicionado flex-1 e min-w-0 --- */}
                  <div className="space-y-1 flex-1 min-w-0">
                      {/* Adicionado title={} para mostrar o nome completo ao passar o mouse */}
                      <CardTitle className="truncate text-base" title={template.title}>
                        {template.title}
                      </CardTitle>
                      <div className="flex gap-2">
                          <span className={cn(
                              "text-[10px] px-2 py-0.5 rounded-full font-medium border",
                              template.category === 'MARKETING' 
                                ? "bg-purple-100 text-purple-700 border-purple-200" 
                                : template.category === 'Financeiro'
                                ? "bg-green-100 text-green-700 border-green-200"
                                : "bg-blue-100 text-blue-700 border-blue-200"
                          )}>
                              {template.category || 'GERAL'}
                          </span>
                      </div>
                  </div>
                  {/* O botão de estrela tem shrink-0, garantindo que ele nunca seja esmagado */}
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className={cn(
                        "shrink-0 h-8 w-8", 
                        template.isDefault ? "text-amber-500 hover:text-amber-600" : "text-muted-foreground hover:text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    )}
                    onClick={() => handleSetDefault(template)}
                  >
                    <Star className={cn("h-4 w-4", template.isDefault && "fill-amber-400")} />
                  </Button>
              </CardHeader>
              <CardContent className="flex-grow pt-2">
                <p className="text-sm text-muted-foreground line-clamp-3 bg-muted/30 p-2 rounded-md italic border border-transparent group-hover:border-border/50 transition-colors">
                    &quot;{template.body || "..."}&quot;
                </p>
              </CardContent>
              <CardFooter className="flex justify-between items-center pt-0 pb-4 px-6">
                  <Button variant="ghost" size="sm" className="text-xs h-8" onClick={() => handleSendTest(template)}>
                    <Send className="mr-2 h-3 w-3" />
                    Testar
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

      <TemplateLibraryDialog 
        open={isLibraryOpen} 
        onOpenChange={setIsLibraryOpen} 
      />
    </>
  )
}