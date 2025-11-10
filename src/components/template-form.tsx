"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { FileUp } from "lucide-react"
import { collection, doc } from "firebase/firestore"
import { type Template } from "@/lib/types"

import { useUser, useFirestore } from "@/firebase/provider"
import { addDocumentNonBlocking, setDocumentNonBlocking } from "@/firebase/non-blocking-updates"

type TemplateFormProps = {
  template: Template | null;
  onSave: () => void;
  onCancel: () => void;
};

export function TemplateForm({ template, onSave, onCancel }: TemplateFormProps) {
    const { user } = useUser();
    const firestore = useFirestore();
    
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");

    useEffect(() => {
        if (template) {
            setTitle(template.title);
            setContent(template.content);
        } else {
            setTitle("");
            setContent("");
        }
    }, [template]);

    const handleSave = () => {
        if (!user) return;
        const templatesCollection = collection(firestore, `users/${user.uid}/messageTemplates`);
        
        const templateData = {
            title,
            content,
            userId: user.uid,
        };

        if (template) {
            const templateDoc = doc(firestore, `users/${user.uid}/messageTemplates/${template.id}`);
            setDocumentNonBlocking(templateDoc, templateData, { merge: true });
        } else {
            addDocumentNonBlocking(templatesCollection, templateData);
        }
        onSave();
    };

    return (
        <div className="space-y-4">
            <div className="grid gap-2">
                <Label htmlFor="title">Título do Template</Label>
                <Input id="title" placeholder="Ex: Lembrete de Consulta" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="content">Conteúdo da Mensagem</Label>
                <Textarea
                    id="content"
                    placeholder="Olá {{NOME_CLIENTE}}, sua consulta está marcada para..."
                    className="min-h-[150px]"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                    Use variáveis como {"{{NOME_CLIENTE}}"} que serão substituídas automaticamente.
                </p>
            </div>
            <div className="grid gap-2">
                <Label>Anexos (Opcional)</Label>
                <div className="flex items-center gap-4">
                    <Button variant="outline" asChild>
                        <label htmlFor="file-upload" className="cursor-pointer">
                            <FileUp className="mr-2 h-4 w-4" />
                            Imagem/Documento
                        </label>
                    </Button>
                    <input id="file-upload" type="file" className="hidden" />
                    <p className="text-sm text-muted-foreground">Nenhum arquivo selecionado.</p>
                </div>
            </div>

            <div className="flex justify-end gap-2">
                 <Button variant="outline" onClick={onCancel}>Cancelar</Button>
                 <Button onClick={handleSave}>Salvar Template</Button>
            </div>
        </div>
    )
}
