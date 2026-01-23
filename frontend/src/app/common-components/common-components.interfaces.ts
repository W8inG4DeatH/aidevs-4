export interface IAiFile {
  Name: string;
  FullPath: string;
  BackendFullPath?: string;
  UpdateTime?: Date;
  Content?: string;
  InputTokens?: number;
  OutputTokens?: number;
  CostInDollars?: number;
  Selected?: boolean;
  Processed?: boolean;
  Done?: boolean;
}

/* =========================
 MODELE
========================= */

export enum IOpenAIModel {
  GPT5Nano = 'gpt-5-nano',
  GPT5Mini = 'gpt-5-mini',
  GPT5 = 'gpt-5',
  GPT5Codex = 'gpt-5-codex',
  GPT5Pro = 'gpt-5-pro',
  DallE3 = 'dall-e-3',
  SpeechToText = 'whisper-1',
}

/* =========================
 IMAGE MODELS
========================= */

export enum ImageModelSizeEnum {
  Landscape = '1792x1024',
  Quad = '1024x1024',
  Portrait = '1024x1792',
}

export enum ImageModelQualityEnum {
  Standard = 'standard',
  HD = 'hd',
}

/* =========================
 AI TEXT / REASONING OPTIONS
========================= */

/**
* Dozwolone poziomy "rozumowania" (reasoning effort)
* Mapowalne 1:1 na backend (OpenAI Responses API)
*/
export enum AiReasoningEffortEnum {
  Minimal = 'minimal',
  Low = 'low',
  Medium = 'medium',
  High = 'high',
}

/**
* Kontrola rozwlekłości odpowiedzi tekstowej
*/
export enum AiTextVerbosityEnum {
  Low = 'low',
  Medium = 'medium',
  High = 'high',
}

/**
* Predefiniowane temperatury (zamiast "magicznych liczb")
* Backend może je zignorować – UI nadal jest spójne
*/
export enum AiTemperatureEnum {
  Deterministic = 0.0,
  VeryLow = 0.2,
  Medium = 0.5,
  Creative = 0.8,
  VeryCreative = 1.0,
}

/**
* Sensowne limity tokenów – łatwe do kontroli kosztów
*/
export enum AiMaxTokensEnum {
  XS = 256,
  S = 512,
  M = 1024,
  L = 2048,
  XL = 4096,
}
