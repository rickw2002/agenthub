export type PromptLevel = "Beginner" | "Intermediate" | "Advanced";

export type PromptCategory = string;

export type PromptExplanation =
  | string
  | {
      sections: {
        title: string;
        body: string;
      }[];
    };

export interface Prompt {
  id: string;
  title: string;
  shortDescription: string;
  category: PromptCategory;
  useCases: string[];
  level: PromptLevel;
  fullPrompt: string;
  explanation: PromptExplanation;
}


