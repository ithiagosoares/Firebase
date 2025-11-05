'use server';
/**
 * @fileOverview This file defines a Genkit flow that improves a given message template using AI.
 *
 * The flow takes a template string as input and returns an improved template string.
 * @fileOverview A flow to improve message templates with AI.
 *
 * - `improveTemplate`: Improves a given template using AI.
 * - `ImproveTemplateInput`: The input type for the `improveTemplate` function.
 * - `ImproveTemplateOutput`: The output type for the `improveTemplate` function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ImproveTemplateInputSchema = z.object({
  template: z.string().describe('The message template to improve.'),
});
export type ImproveTemplateInput = z.infer<typeof ImproveTemplateInputSchema>;

const ImproveTemplateOutputSchema = z.object({
  improvedTemplate: z.string().describe('The improved message template.'),
});
export type ImproveTemplateOutput = z.infer<typeof ImproveTemplateOutputSchema>;

/**
 * Improves a given message template using AI.
 * @param input The input containing the template to improve.
 * @returns The improved message template.
 */
export async function improveTemplate(input: ImproveTemplateInput): Promise<ImproveTemplateOutput> {
  return improveTemplateFlow(input);
}

const improveTemplatePrompt = ai.definePrompt({
  name: 'improveTemplatePrompt',
  input: {schema: ImproveTemplateInputSchema},
  output: {schema: ImproveTemplateOutputSchema},
  prompt: `You are an expert marketing message improver.

  Given the following message template, improve it to be more engaging and effective for potential patients.

  Original Template: {{{template}}}

  Improved Template:`, // Ensure the model only returns the improved template.
});

const improveTemplateFlow = ai.defineFlow(
  {
    name: 'improveTemplateFlow',
    inputSchema: ImproveTemplateInputSchema,
    outputSchema: ImproveTemplateOutputSchema,
  },
  async input => {
    const {output} = await improveTemplatePrompt(input);
    return output!;
  }
);
