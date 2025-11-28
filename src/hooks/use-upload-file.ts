
import { useState } from 'react';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { useFirebase } from '@/firebase/provider';

export function useUploadFile() {
  // CORREÇÃO: Pega a instância do storage diretamente do provider.
  const { storage } = useFirebase(); 
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File) => {
    if (!storage) {
      setError("Firebase Storage não foi inicializado.");
      return null;
    }

    setIsUploading(true);
    setError(null);

    try {
      const storageRef = ref(storage, `attachments/${Date.now()}_${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      return new Promise<{ name: string; url: string } | null>((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            // Opcional: pode-se adicionar lógica de progresso aqui
          },
          (error) => {
            console.error("Erro no upload:", error);
            setError("Falha ao enviar o arquivo.");
            setIsUploading(false);
            reject(null); // Rejeita a promise em caso de erro
          },
          async () => {
            try {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                setIsUploading(false);
                resolve({ name: file.name, url: downloadURL });
            } catch (e) {
                console.error(e);
                setError("Falha ao obter a URL de download.");
                setIsUploading(false);
                reject(null); // Rejeita a promise em caso de erro
            }
          }
        );
      });
    } catch (e) {
      console.error(e);
      setError("Ocorreu um erro inesperado durante o upload.");
      setIsUploading(false);
      return null;
    }
  };

  return { upload, isUploading, error };
}
