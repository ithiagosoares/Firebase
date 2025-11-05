'use server';

/**
 * @fileOverview A flow for generating message templates using AI.
 *
 * - generateMessageTemplates - A function that generates message templates.
 * - GenerateMessageTemplatesInput - The input type for the generateMessageTemplates function.
 * - GenerateMessageTemplatesOutput - The return type for the generateMessageTemplates function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateMessageTemplatesInputSchema = z.object({
  patientDetails: z
    .string()
    .describe('Details about the patient, including their name and condition.'),
  messageContext: z
    .string()
    .describe(
      'Context for the message, such as appointment reminders or follow-up messages.'
    ),
  tone: z
    .string()
    .describe(
      'The desired tone of the message (e.g., friendly, professional, urgent).'
    ),
});
export type GenerateMessageTemplatesInput = z.infer<
  typeof GenerateMessageTemplatesInputSchema
>;

const GenerateMessageTemplatesOutputSchema = z.object({
  templates: z.array(
    z.object({
      title: z.string().describe('The title of the template.'),
      content: z.string().describe('The content of the message template.'),
    })
  ).describe('An array of generated message templates.'),
});
export type GenerateMessageTemplatesOutput = z.infer<
  typeof GenerateMessageTemplatesOutputSchema
>;

export async function generateMessageTemplates(
  input: GenerateMessageTemplatesInput
): Promise<GenerateMessageTemplatesOutput> {
  return generateMessageTemplatesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateMessageTemplatesPrompt',
  input: {schema: GenerateMessageTemplatesInputSchema},
  output: {schema: GenerateMessageTemplatesOutputSchema},
  prompt: `You are an AI assistant that generates message templates for healthcare providers.

  Based on the patient details, message context, and desired tone, generate up to 10 message templates.

  Patient Details: {{{patientDetails}}}
  Message Context: {{{messageContext}}}
  Tone: {{{tone}}}

  Ensure that the templates are engaging and relevant to the patient's needs.

  Output the templates in a JSON format, with a title and content for each template.

  Here is the JSON:
  `,
});

const generateMessageTemplatesFlow = ai.defineFlow(
  {
    name: 'generateMessageTemplatesFlow',
    inputSchema: GenerateMessageTemplatesInputSchema,
    outputSchema: GenerateMessageTemplatesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
