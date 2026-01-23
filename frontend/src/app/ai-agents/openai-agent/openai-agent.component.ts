import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  IAiFile,
  IOpenAIModel,
  AiReasoningEffortEnum,
  AiTextVerbosityEnum,
  AiTemperatureEnum,
  AiMaxTokensEnum
} from 'src/app/common-components/common-components.interfaces';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'openai-agent',
  templateUrl: './openai-agent.component.html',
  styleUrls: ['./openai-agent.component.scss'],
  standalone: false
})
export class OpenAiAgentComponent implements OnInit {
  public openAiModels = Object.values(IOpenAIModel);
  public aiProcessing: boolean = false;
  public aiResponse: string = 'Tutaj będzie odpowiedź AI.';
  public openAiModel: IOpenAIModel = IOpenAIModel.GPT5Mini;
  public myAIPrompt: string = '';

  // NEW OPTIONS
  public temperature: AiTemperatureEnum = AiTemperatureEnum.VeryLow;  // backend ignores this for GPT-5 Responses (per your error), but keep for future
  public maxTokens: AiMaxTokensEnum = AiMaxTokensEnum.M;
  public reasoning: AiReasoningEffortEnum = AiReasoningEffortEnum.Minimal;
  public textVerbosity: AiTextVerbosityEnum = AiTextVerbosityEnum.Medium;
  public responseFileName: string = '';      // optional: without ".txt"
  public withCleanedRaw: boolean = true;     // keep previous behavior

  constructor(private http: HttpClient) { }

  ngOnInit() { }

  sendPrompt() {
    if (this.myAIPrompt?.length > 0) {
      this.aiProcessing = true;

      const payload = {
        openAiModel: this.openAiModel,
        myAIPrompt: this.myAIPrompt,

        temperature: this.temperature,
        maxTokens: this.maxTokens,
        reasoning: this.reasoning,
        text: this.textVerbosity,
        responseFileName: this.responseFileName,
        withCleanedRaw: this.withCleanedRaw
      };

      this.http.post<{ choices: Array<{ message: { content: string } }> }>(
        `${environment.apiUrl}/ai_agents/openai_agent/send-prompt`,
        payload
      ).subscribe({
        next: (response) => {
          console.log('Response:', response);

          const content = response?.choices?.[0]?.message?.content;
          if (content) {
            this.aiResponse = content;
          } else {
            this.aiResponse = '(brak content w odpowiedzi)';
            console.warn('No content in response:', response);
          }
          this.aiProcessing = false;
        },
        error: (error: any) => {
          console.error('Error sending prompt:', error);
          this.aiProcessing = false;
        },
      });
    }
  }

  selectPrompt(prompt: IAiFile | null): void {
    this.myAIPrompt = prompt?.Content ?? '';
  }

  addToPrompt(promptPart: string | null): void {
    this.myAIPrompt += '\n\n' + '################################' + '\n\n' + (promptPart ?? '');
  }
}
