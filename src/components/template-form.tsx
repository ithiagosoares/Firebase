'use client'

import { useState, useEffect, useCallback } from "react"
import { FileUp } from "lucide-react"
import { useDropzone } from 'react-dropzone'

import { type Template, WithId } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useUploadFile } from "@/hooks/use-upload-file"
import { UploadedFile } from "@/components/uploaded-file"

export type TemplateFormData = {
  title: string;
  body: string; 
  variables?: string[];
  attachment?: {
    name: string;
    url: string;
  } | null;
}

export type TemplateFormProps = {
  template?: WithId<Template> | null;
  onSave: (data: TemplateFormData) => Promise<void>;
  onCancel: () => void;
};

export function TemplateForm({ template, onSave, onCancel }: TemplateFormProps) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [variables, setVariables] = useState<string[]>([]);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [existingAttachment, setExistingAttachment] = useState(template?.attachment || null)
  const [previewName, setPreviewName] = useState("Maria"); // State for live preview

  const { upload, isUploading, error: uploadError } = useUploadFile();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
        setAttachment(acceptedFiles[0]);
        setExistingAttachment(null)
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop, 
    multiple: false, 
    accept: {
      'image/*': ['.png', '.gif', '.jpeg', '.jpg'],
      'application/pdf': ['.pdf'],
    }
  });

  useEffect(() => {
    if (template) {
      setTitle(template.title);
      setBody(template.body);
      setVariables(template.variables || []);
      setExistingAttachment(template.attachment || null);
    }
  }, [template]);

  const handleSave = async () => {
    let attachmentData = existingAttachment;

    if (attachment) {
        const uploadedFile = await upload(attachment);
        if (uploadedFile) {
            attachmentData = uploadedFile;
        }
    }

    const data: TemplateFormData = { 
        title, 
        body, 
        variables: variables || [], 
        attachment: attachmentData 
    };
    await onSave(data);
  };

  const removeAttachment = () => {
    setAttachment(null)
    setExistingAttachment(null)
  }

  return (
    <div className="space-y-8"> 
        <div className="grid gap-2">
            <Label htmlFor="title">Título do Template</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>

        <div className="grid gap-2">
            <Label htmlFor="body">Conteúdo da Mensagem</Label>
            <Textarea id="body" value={body} onChange={(e) => setBody(e.target.value)} rows={5} />
            <p className="text-sm text-muted-foreground">
                {'Use chaves para variáveis, como {{cliente}}.'}
            </p>
        </div>

        {/* Live Preview Section */}
        <div className="grid gap-4 rounded-lg border bg-muted/40 p-4">
            <div className="flex items-center gap-2">
                <Label htmlFor="preview-name" className="text-sm font-semibold whitespace-nowrap">
                    Exemplo com o nome:
                </Label>
                <Input 
                    id="preview-name" 
                    value={previewName} 
                    onChange={(e) => setPreviewName(e.target.value)}
                    className="h-8 w-auto flex-1"
                    placeholder="Ex: João, Maria..."
                />
            </div>
            <p className="text-sm font-semibold">Pré-visualização:</p>
            <div className="rounded-md border bg-background p-3 text-sm min-h-[60px]">
                {body.replace(/\{\{cliente\}\}/g, previewName || '...')}
            </div>
        </div>

        <div 
            {...getRootProps()} 
            className={`border-2 border-dashed rounded-md p-6 text-center cursor-pointer 
                        ${isDragActive ? 'border-primary bg-primary/10' : 'border-border'}`}>
            <input {...getInputProps()} />
            <FileUp className="mx-auto h-8 w-8 text-muted-foreground" />
            {isDragActive ?
                <p className="mt-2 text-sm text-primary">Solte o arquivo aqui...</p> : 
                <p className="mt-2 text-sm text-muted-foreground">Arraste e solte um anexo, ou clique para selecionar</p>
            }
        </div>

        {(attachment || existingAttachment) && (
            <div>
                <Label>Anexo</Label>
                <UploadedFile 
                    fileName={attachment?.name || existingAttachment?.name}
                    fileSize={attachment?.size}
                    downloadUrl={existingAttachment?.url}
                    onRemove={removeAttachment}
                />
            </div>
        )}
        
        {uploadError && <p className="text-sm text-destructive">{uploadError}</p>}

        <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onCancel}>Cancelar</Button>
            <Button onClick={handleSave} disabled={isUploading}>
                {isUploading ? 'Salvando...' : 'Salvar Template'}
            </Button>
        </div>
    </div>
  )
}
