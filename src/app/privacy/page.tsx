
"use client";

import { LandingHeader } from "@/components/landing/landing-header";
import { Footer } from "@/components/landing/footer";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PrivacyPolicyPage() {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50 text-gray-800 font-sans">
      <LandingHeader />
      <main className="flex-1 py-12 md:py-20">
        <div className="container mx-auto px-4 md:px-6">
          <PageHeader title="Política de Privacidade" />
          <Card>
            <CardHeader>
              <CardTitle>Última atualização: {new Date().toLocaleDateString('pt-BR')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 text-muted-foreground">
              <p>
                A sua privacidade é importante para nós. É política do VitalLink respeitar a sua privacidade em relação a qualquer informação sua que possamos coletar no site VitalLink, e outros sites que possuímos e operamos.
              </p>

              <div className="space-y-2">
                <h3 className="font-semibold text-lg text-foreground">1. Dados que Coletamos</h3>
                <p>
                  Solicitamos informações pessoais apenas quando realmente precisamos delas para lhe fornecer um serviço. Fazemo-lo por meios justos e legais, com o seu conhecimento e consentimento. Também informamos por que estamos coletando e como será usado.
                </p>
                <p>
                  Coletamos os seguintes tipos de informações:
                </p>
                <ul className="list-disc pl-6 space-y-1">
                  <li><strong>Dados de Conta:</strong> Nome, e-mail e senha para criar e gerenciar sua conta de profissional.</li>
                  <li><strong>Dados de Pacientes:</strong> Nome, e-mail, telefone e datas de consulta, que você insere na plataforma para gerenciamento e comunicação. Estes dados pertencem a você e são processados sob sua responsabilidade.</li>
                  <li><strong>Dados de Uso:</strong> Informações sobre como você utiliza nossa plataforma, como funcionalidades acessadas e frequência de uso, para melhorarmos nosso serviço.</li>
                </ul>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold text-lg text-foreground">2. Como Usamos Seus Dados</h3>
                <p>
                  Usamos os dados coletados para:
                </p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Operar e manter nossa plataforma.</li>
                  <li>Permitir a comunicação automática com seus pacientes via WhatsApp, sob sua configuração e comando.</li>
                  <li>Melhorar e personalizar nosso serviço.</li>
                  <li>Comunicar com você, incluindo para fins de suporte e marketing, sempre com a opção de cancelamento.</li>
                </ul>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold text-lg text-foreground">3. Segurança dos Dados</h3>
                 <p>
                  Apenas retemos as informações coletadas pelo tempo necessário para fornecer o serviço solicitado. Quando armazenamos dados, protegemos dentro de meios comercialmente aceitáveis ​​para evitar perdas e roubos, bem como acesso, divulgação, cópia, uso ou modificação não autorizados.
                </p>
                <p>
                  Não compartilhamos informações de identificação pessoal publicamente ou com terceiros, exceto quando exigido por lei.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold text-lg text-foreground">4. Seus Direitos (LGPD)</h3>
                <p>
                  Você tem o direito de acessar, corrigir, anonimizar ou excluir seus dados pessoais. Você também pode solicitar a portabilidade dos seus dados para outro fornecedor de serviço. Para exercer esses direitos, por favor, visite nossa página de <a href="/data-request" className="text-primary underline">Solicitação de Dados</a>.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold text-lg text-foreground">5. Cookies</h3>
                <p>
                  Utilizamos cookies para melhorar a experiência de navegação. Um cookie é um pequeno arquivo de texto que um site armazena no seu computador ou dispositivo móvel quando você visita o site. Ao continuar a usar nosso site, você concorda com o uso de cookies.
                </p>
              </div>

               <div className="space-y-2">
                <h3 className="font-semibold text-lg text-foreground">6. Compromisso do Usuário</h3>
                <p>
                    O usuário se compromete a fazer uso adequado dos conteúdos e da informação que o VitalLink oferece no site e com caráter enunciativo, mas não limitativo:
                </p>
                 <ul className="list-disc pl-6 space-y-1">
                    <li>A) Não se envolver em atividades que sejam ilegais ou contrárias à boa fé e à ordem pública;</li>
                    <li>B) Não difundir propaganda ou conteúdo de natureza racista, xenofóbica, ou sobre azar, qualquer tipo de pornografia ilegal, de apologia ao terrorismo ou contra os direitos humanos;</li>
                    <li>C) Não causar danos aos sistemas físicos (hardwares) e lógicos (softwares) do VitalLink, de seus fornecedores ou terceiros, para introduzir ou disseminar vírus informáticos ou quaisquer outros sistemas de hardware ou software que sejam capazes de causar os danos anteriormente mencionados.</li>
                </ul>
              </div>

              <p className="pt-4 border-t">
                Se tiver alguma dúvida sobre como lidamos com dados do usuário e informações pessoais, entre em contato conosco através do e-mail <a href="mailto:suporte@vitallink.clinic" className="text-primary">suporte@vitallink.clinic</a>.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
