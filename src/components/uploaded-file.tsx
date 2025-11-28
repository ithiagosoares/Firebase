
import { Paperclip, X, Download } from 'lucide-react';
import { Button } from './ui/button';

interface UploadedFileProps {
  fileName?: string;
  fileSize?: number;
  downloadUrl?: string;
  onRemove: () => void;
}

export function UploadedFile({ fileName, fileSize, downloadUrl, onRemove }: UploadedFileProps) {
  const formatBytes = (bytes?: number) => {
    if (bytes === undefined) return '';
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  return (
    <div className="flex items-center justify-between p-2.5 rounded-md border border-muted bg-muted/50">
        <div className="flex items-center gap-3 truncate">
            <Paperclip className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
            <div className="truncate">
                <p className="text-sm font-medium truncate">{fileName || 'Arquivo anexado'}</p>
                <p className="text-xs text-muted-foreground">{formatBytes(fileSize)}</p>
            </div>
        </div>
        <div className="flex items-center gap-1">
            {downloadUrl && (
                <Button asChild variant="ghost" size="icon">
                    <a href={downloadUrl} target="_blank" rel="noopener noreferrer">
                        <Download className="h-4 w-4" />
                    </a>
                </Button>
            )}
            <Button variant="ghost" size="icon" onClick={onRemove}>
                <X className="h-4 w-4" />
            </Button>
        </div>
    </div>
  );
}
