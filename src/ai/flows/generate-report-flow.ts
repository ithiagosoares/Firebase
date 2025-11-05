'use server';
/**
 * @fileOverview A flow for generating performance reports using AI.
 *
 * - generatePerformanceReport - Generates a performance report based on clinic data and plan type.
 * - GenerateReportInput - The input type for the report generation.
 * - GenerateReportOutput - The output type for the report generation.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

export const GenerateReportInputSchema = z.object({
  stats: z.object({
    totalPatients: z.number(),
    sentMessages: z.number(),
    failedMessages: z.number(),
    newPatients: z.number(),
  }),
  plan: z.enum(['Trial', 'Profissional', 'Equipe']),
});
export type GenerateReportInput = z.infer<typeof GenerateReportInputSchema>;

export const GenerateReportOutputSchema = z.object({
  report: z.string().describe('The generated performance report in markdown format.'),
});
export type GenerateReportOutput = z.infer<typeof GenerateReportOutputSchema>;

export async function generatePerformanceReport(
  input: GenerateReportInput
): Promise<GenerateReportOutput> {
  return generateReportFlow(input);
}

const professionalPrompt = ai.definePrompt({
  name: 'professionalReportPrompt',
  input: {schema: GenerateReportInputSchema},
  output: {schema: GenerateReportOutputSchema},
  prompt: `
    You are a business intelligence analyst for healthcare clinics.
    Generate a concise performance report in markdown format based on the following data:
    - Total Patients: {{{stats.totalPatients}}}
    - Sent Messages: {{{stats.sentMessages}}}
    - Failed Messages: {{{stats.failedMessages}}}
    - New Patients This Period: {{{stats.newPatients}}}

    The report should be encouraging and professional.
    Focus on the positive aspects and suggest one simple area for improvement.
    Keep it brief, around 3-4 paragraphs.
  `,
});

const teamPrompt = ai.definePrompt({
  name: 'teamReportPrompt',
  input: {schema: GenerateReportInputSchema},
  output: {schema: GenerateReportOutputSchema},
  prompt: `
    You are a top-tier business intelligence analyst for growing healthcare clinics.
    Generate a detailed, in-depth performance report in markdown format based on the following data:
    - Total Patients: {{{stats.totalPatients}}}
    - Sent Messages: {{{stats.sentMessages}}}
    - Failed Messages: {{{stats.failedMessages}}}
    - New Patients This Period: {{{stats.newPatients}}}

    The report must be comprehensive and data-driven. Use markdown for structure (headings, bold text, lists).
    1.  Start with a powerful executive summary.
    2.  Provide a detailed breakdown and analysis of each metric.
    3.  Calculate key performance indicators (KPIs) like message success rate and patient growth rate.
    4.  Identify at least two key strengths and two areas for strategic improvement.
    5.  Conclude with actionable recommendations for the next month to boost patient engagement and growth.
  `,
});

const generateReportFlow = ai.defineFlow(
  {
    name: 'generateReportFlow',
    inputSchema: GenerateReportInputSchema,
    outputSchema: GenerateReportOutputSchema,
  },
  async input => {
    if (input.plan === 'Equipe') {
      const {output} = await teamPrompt(input);
      return output!;
    }
    // Default to professional for 'Profissional' and 'Trial'
    const {output} = await professionalPrompt(input);
    return output!;
  }
);
