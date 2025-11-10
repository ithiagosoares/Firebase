
"use client";

import { LandingHeader } from "@/components/landing/landing-header";
import { Footer } from "@/components/landing/footer";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TermsOfServicePage() {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50 text-gray-800 font-sans">
      <LandingHeader />
      <main className="flex-1 py-12 md:py-20">
        <div className="container mx-auto px-4 md:px-6">
          <PageHeader title="Termos de Uso" />
          <Card>
            <CardHeader>
                <CardTitle>Última atualização: {new Date().toLocaleDateString('pt-BR')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 text-muted-foreground">
              <p>
                Ao acessar ao site VitalLink, concorda em cumprir estes termos de serviço, todas as leis e regulamentos aplicáveis ​​e concorda que é responsável pelo cumprimento de todas as leis locais aplicáveis. Se você não concordar com algum desses termos, está proibido de usar ou acessar este site. Os materiais contidos neste site são protegidos pelas leis de direitos autorais e marcas comerciais aplicáveis.
              </p>

              <div className="space-y-2">
                <h3 className="font-semibold text-lg text-foreground">1. Uso da Licença</h3>
                <p>
                  É concedida permissão para baixar temporariamente uma cópia dos materiais (informações ou software) no site VitalLink, apenas para visualização transitória pessoal e não comercial. Esta é a concessão de uma licença, não uma transferência de título e, sob esta licença, você não pode:
                </p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Modificar ou copiar os materiais;</li>
                  <li>Usar os materiais para qualquer finalidade comercial ou para exibição pública (comercial ou não comercial);</li>
                  <li>Tentar descompilar ou fazer engenharia reversa de qualquer software contido no site VitalLink;</li>
                  <li>Remover quaisquer direitos autorais ou outras notações de propriedade dos materiais; ou</li>
                  <li>Transferir os materiais para outra pessoa ou 'espelhar' os materiais em qualquer outro servidor.</li>
                </ul>
                <p>
                  Esta licença será automaticamente rescindida se você violar alguma dessas restrições e poderá ser rescindida por VitalLink a qualquer momento.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold text-lg text-foreground">2. Isenção de Responsabilidade</h3>
                <p>
                  Os materiais no site da VitalLink são fornecidos 'como estão'. VitalLink não oferece garantias, expressas ou implícitas, e, por este meio, isenta e nega todas as outras garantias, incluindo, sem limitação, garantias implícitas ou condições de comercialização, adequação a um fim específico ou não violação de propriedade intelectual ou outra violação de direitos.
                </p>
                <p>
                  Além disso, o VitalLink não garante ou faz qualquer representação relativa à precisão, aos resultados prováveis ​​ou à confiabilidade do uso dos materiais em seu site ou de outra forma relacionado a esses materiais ou em sites vinculados a este site.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold text-lg text-foreground">3. Limitações</h3>
                <p>
                  Em nenhum caso o VitalLink ou seus fornecedores serão responsáveis ​​por quaisquer danos (incluindo, sem limitação, danos por perda de dados ou lucro ou devido a interrupção dos negócios) decorrentes do uso ou da incapacidade de usar os materiais em VitalLink, mesmo que VitalLink ou um representante autorizado da VitalLink tenha sido notificado oralmente ou por escrito da possibilidade de tais danos.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold text-lg text-foreground">4. Modificações</h3>
                <p>
                  O VitalLink pode revisar estes termos de serviço do site a qualquer momento, sem aviso prévio. Ao usar este site, você concorda em ficar vinculado à versão atual desses termos de serviço.
                </p>
              </div>

               <div className="space-y-2">
                <h3 className="font-semibold text-lg text-foreground">5. Lei aplicável</h3>
                <p>
                    Estes termos e condições são regidos e interpretados de acordo com as leis do Brasil e você se submete irrevogavelmente à jurisdição exclusiva dos tribunais naquele estado ou localidade.
                </p>
              </div>

              <p className="pt-4 border-t">
                Se tiver alguma dúvida sobre estes termos, entre em contato conosco através do e-mail <a href="mailto:suporte@vitallink.clinic" className="text-primary">suporte@vitallink.clinic</a>.
              </p>

            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
