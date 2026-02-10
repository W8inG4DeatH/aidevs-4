import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface SendPromptPayload {
  openAiModel: string;
  myAIPrompt: string;
  temperature?: number;
  maxTokens?: number;
  reasoning?: string;
  text?: string;
  responseFileName?: string;
  withCleanedRaw?: boolean;
}

export interface SendPromptResponse {
  choices: Array<{ message: { content: string } }>;
}

const DEFAULT_MAX_TOKENS = 1024;

@Injectable({ providedIn: 'root' })
export class OpenAiAgentService {

  private readonly url = `${environment.apiUrl}/ai_agents/openai_agent/send-prompt`;

  constructor(private http: HttpClient) {}

  sendPrompt(payload: SendPromptPayload): Observable<SendPromptResponse> {
    const body: SendPromptPayload = {
      ...payload,
      maxTokens: payload.maxTokens ?? DEFAULT_MAX_TOKENS,
    };
    return this.http.post<SendPromptResponse>(this.url, body);
  }
}
