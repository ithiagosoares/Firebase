"use client";

export function AboutHero() {
  return (
    <section className="w-full py-12 md:py-24 lg:py-28 bg-white border-b border-gray-100">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-6 text-center max-w-3xl mx-auto">
          <div className="inline-block rounded-lg bg-gray-100 px-3 py-1 text-sm font-medium text-gray-800">
            Nossa História
          </div>
          <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl text-gray-900 leading-tight">
            Sobre o VitalLink
          </h1>
          <p className="text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
            Nascemos para resolver um dos maiores problemas das clínicas de saúde: as faltas dos pacientes e a ineficiência na comunicação diária.
          </p>
        </div>
      </div>
    </section>
  );
}
