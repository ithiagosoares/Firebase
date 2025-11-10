"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { doc } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { type Template } from "@/lib/types"
import { Loader2, FileImage, FileText, Paperclip, X } from "lucide-react"

import { useUser, useFirestore, useMemoFirebase } from "@/firebase/provider"
import { useDoc } from "@/firebase/firestore/use-doc"
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates"

export default function EditTemplatePage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string;
  const { toast } = useToast()
  const { user } = useUser()
  const firestore = useFirestore()

  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [imageAttachment, setImageAttachment] = useState<File | null>(null);
  const [docAttachment, setDocAttachment] = useState<File | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  const templateDocRef = useMemoFirebase(() => {
    if (!user || !id) return null;
    return doc(firestore, `users/${user.uid}/messageTemplates/${id}`);
  }, [firestore, user, id]);

  const { data: template, isLoading } = useDoc<Template>(templateDocRef);

  useEffect(() => {
    if (template) {
      setTitle(template.title)
      setContent(template.content)
    }
  }, [template])

  const handleSave = () => {
    if (!templateDocRef) return;
    
    if (!title || !content) {
      toast({
        variant: "destructive",
        title: "Campos obrigatórios",
        description: "O título e o conteúdo do template não podem estar vazios.",
      })
      return
    }

    const updatedTemplate = {
      title,
      content,
      // In a real scenario, you'd upload files and save URLs here
      hasImage: !!imageAttachment,
      hasDocument: !!docAttachment,
    }
    
    setDocumentNonBlocking(templateDocRef, updatedTemplate, { merge: true })
    toast({
      title: "Template atualizado!",
      description: "Suas alterações foram salvas com sucesso.",
    })
    router.push("/templates")
  }

  const handleCancel = () => {
    router.push("/templates")
  }
  
  const availableVariables = [
    { name: "{{NOME_CLIENTE}}", description: "O nome completo do paciente." },
    { name: "{{DATA_CONSULTA}}", description: "A data da consulta agendada." },
    { name: "{{HORA_CONSULTA}}", description: "A hora da consulta agendada." },
  ]

  const handleVariableClick = (variable: string) => {
    const textarea = contentRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newContent = content.substring(0, start) + variable + content.substring(end);
      setContent(newContent);
      
      setTimeout(() => {
        textarea.focus();
        textarea.selectionStart = textarea.selectionEnd = start + variable.length;
      }, 0);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!template) {
      return (
          <div className="text-center">
              <p>Template não encontrado.</p>
          </div>
      )
  }


  return (
    <>
      <PageHeader title={`Editar Template: ${template.title}`} />
      <div className="grid md:grid-cols-2 gap-8 items-start">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Conteúdo do Template</CardTitle>
              <CardDescription>Ajuste o conteúdo da sua mensagem. Use as variáveis disponíveis para personalização.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título do Template</Label>
                <Input id="title" placeholder="Ex: Lembrete de Consulta" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="content">Conteúdo da Mensagem</Label>
                <Textarea
                  id="content"
                  ref={contentRef}
                  placeholder="Olá {{NOME_CLIENTE}}, sua consulta está marcada para..."
                  className="min-h-[200px]"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Variáveis Clicáveis</Label>
                <div className="flex flex-wrap gap-2">
                  {availableVariables.map(variable => (
                    <Button 
                      key={variable.name}
                      variant="outline" 
                      size="sm" 
                      className="font-mono text-xs"
                      onClick={() => handleVariableClick(variable.name)}
                    >
                      {variable.name}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
             <CardHeader>
                <CardTitle>Anexos</CardTitle>
                <CardDescription>Adicione imagens ou documentos à sua mensagem (opcional).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                    <Button variant="outline" onClick={() => imageInputRef.current?.click()}>
                        <FileImage className="mr-2 h-4 w-4" />
                        Anexar Imagem
                    </Button>
                    <input
                        type="file"
                        ref={imageInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => setImageAttachment(e.target.files?.[0] || null)}
                    />
                    {imageAttachment && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Paperclip className="h-4 w-4" />
                            <span>{imageAttachment.name}</span>
                            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setImageAttachment(null)}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-4">
                    <Button variant="outline" onClick={() => docInputRef.current?.click()}>
                        <FileText className="mr-2 h-4 w-4" />
                        Anexar Documento
                    </Button>
                     <input
                        type="file"
                        ref={docInputRef}
                        className="hidden"
                        accept=".pdf,.doc,.docx"
                        onChange={(e) => setDocAttachment(e.target.files?.[0] || null)}
                    />
                    {docAttachment && (
                         <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Paperclip className="h-4 w-4" />
                            <span>{docAttachment.name}</span>
                             <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setDocAttachment(null)}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    )}
                </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="space-y-6 sticky top-8">
           <Card>
            <CardHeader>
              <CardTitle>Pré-visualização</CardTitle>
            </CardHeader>
            <CardContent>
               <div className="bg-black border-black border-4 rounded-2xl w-full max-w-sm mx-auto shadow-xl">
                  <div className="bg-white p-4 rounded-lg min-h-[400px] flex flex-col">
                    <div className="flex-grow flex flex-col justify-end">
                      <div className="bg-green-200 p-2.5 rounded-lg max-w-[85%] self-end">
                        {(imageAttachment || docAttachment) && (
                            <div className="p-2 rounded-md bg-green-300/50 mb-2 flex items-center gap-2">
                                {imageAttachment && <FileImage className="h-5 w-5 text-green-900" />}
                                {docAttachment && <FileText className="h-5 w-5 text-green-900" />}
                                <span className="text-xs text-green-900 font-medium truncate">
                                    {imageAttachment?.name || docAttachment?.name}
                                </span>
                            </div>
                        )}
                        <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">{content || "Sua mensagem aparecerá aqui..."}</p>
                        <p className="text-xs text-right text-gray-500 mt-1">10:30</p>
                      </div>
                    </div>
                  </div>
                </div>
            </CardContent>
          </Card>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleCancel}>Cancelar</Button>
            <Button onClick={handleSave}>Salvar Alterações</Button>
          </div>
        </div>
      </div>
    </>
  )
}
