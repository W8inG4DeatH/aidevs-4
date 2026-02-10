import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { lastValueFrom } from 'rxjs';
import { OpenAiAgentService } from 'src/app/ai-agents/openai-agent/openai-agent.service';

const DELAY_MS = 3000;
const API = `${environment.apiUrl}/lessons/s00e01`;

@Component({
  selector: 'app-lesson-s00e01',
  templateUrl: './lesson-s00e01.component.html',
  styleUrls: ['./lesson-s00e01.component.scss'],
  standalone: false
})
export class LessonS00E01Component {

  logs: string[] = [];
  result: any = null;
  loading = false;

  constructor(
    private http: HttpClient,
    private openAiAgentService: OpenAiAgentService
  ) { }

  private parseJsonArray(raw: string): string[] {
    const s = (raw || '').trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/, '')
      .trim();
    try {
      const arr = JSON.parse(s);
      return Array.isArray(arr) ? arr.map((x: any) => String(x ?? '').trim()) : [];
    } catch {
      return s ? [s] : [];
    }
  }

  async processLesson() {
    this.logs = [];
    this.result = null;
    this.loading = true;
    const delay = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

    try {
      this.logs.push('Pobieram pytania i token (GET weryfikacja)...');
      const weryf = await lastValueFrom(this.http.get<{ pytania: string[]; token: string }>(`${API}/weryfikacja`));
      const pytania = weryf.pytania || [];
      const token = weryf.token || '';
      this.logs.push('Otrzymano ' + pytania.length + ' pytań, token (15s).');

      if (pytania.length === 0) {
        this.logs.push('Brak pytań.');
        return;
      }

      // 1. Jedno wywołanie AI: tablica pytań → tablica słów kluczowych
      pytania.forEach((p, i) => this.logs.push('  Pytanie ' + (i + 1) + ' (pełna treść): ' + p));
      const questionsBlock = pytania.map((p, i) => `${i + 1}. ${p}`).join('\n');
      const keywordPrompt = `Dla każdego pytania podaj dokładnie JEDNO słowo. Słowo powinno być tagiem jak najlepiej opisującym całe pytanie, ale musi występować w pytaniu i musi być bez odmiany. Zwróć tylko tablicę JSON w tej samej kolejności, np. ["słowo1", "słowo2", "słowo3", "słowo4"]. Tylko tablica JSON.

Pytania:
${questionsBlock}`;

      this.logs.push('AI: wyciągam słowa kluczowe dla wszystkich pytań...');
      const kwRes = await lastValueFrom(
        this.openAiAgentService.sendPrompt({
          openAiModel: 'gpt-5-mini',
          myAIPrompt: keywordPrompt,
        })
      );
      const rawKeywords = (kwRes?.choices?.[0]?.message?.content ?? '').trim();
      let keywords = this.parseJsonArray(rawKeywords);
      while (keywords.length < pytania.length) {
        keywords.push(pytania[keywords.length].slice(0, 50));
      }
      keywords = keywords.slice(0, pytania.length);
      keywords = keywords.map(k => {
        const s = k.replace(/_/g, ' ').trim();
        return s.includes(' ') ? s.split(' ')[0] : s;
      });
      keywords.forEach((k, i) => this.logs.push('  słowo kluczowe ' + (i + 1) + ': ' + k));

      // 2. Zapytania do bazy (z opóźnieniem – limit 4/10s)
      const fragmenty: string[] = [];
      for (let i = 0; i < pytania.length; i++) {
        if (i > 0) await delay(DELAY_MS);
        const q = encodeURIComponent(keywords[i] || pytania[i].slice(0, 50));
        try {
          const w = await lastValueFrom(this.http.get<{ hint?: string } | string>(`${API}/wiedza/${q}`));
          if (typeof w === 'object' && w != null && 'hint' in w && typeof (w as { hint: string }).hint === 'string') {
            fragmenty.push((w as { hint: string }).hint);
          } else if (typeof w === 'string') {
            fragmenty.push(w);
          } else {
            fragmenty.push(typeof w === 'object' ? JSON.stringify(w) : String(w));
          }
        } catch {
          fragmenty.push('');
        }
        this.logs.push('  Fragment ' + (i + 1) + ' (pełna treść):');
        this.logs.push(fragmenty[i] || '(brak)');
      }

      // 3. Jedno wywołanie AI: pytania + fragmenty → tablica skróconych odpowiedzi
      const qaBlock = pytania.map((p, i) => `Pytanie ${i + 1}: ${p}\nOdpowiedz ${i + 1}: ${fragmenty[i] || '(brak)'}`).join('\n\n');
      const answerPrompt = `Na podstawie par (Pytanie i Odpowiedz), podaj tylko słowo lub frazę, które jest możliwie najkrószą ale dokładną odpowiedzią na pytanie. Zwróć tylko tablicę JSON w tej samej kolejności, np. ["odpowiedź1", "odpowiedź2", "odpowiedź3", "odpowiedź4"]. Tylko tablica JSON.

${qaBlock}`;

      this.logs.push('AI: skracam odpowiedzi dla wszystkich pytań...');
      const ansRes = await lastValueFrom(
        this.openAiAgentService.sendPrompt({
          openAiModel: 'gpt-5-mini',
          myAIPrompt: answerPrompt,
        })
      );
      const rawAnswers = (ansRes?.choices?.[0]?.message?.content ?? '').trim();
      let odpowiedzi = this.parseJsonArray(rawAnswers);
      while (odpowiedzi.length < pytania.length) {
        odpowiedzi.push(fragmenty[odpowiedzi.length]?.slice(0, 50) || '');
      }
      odpowiedzi = odpowiedzi.slice(0, pytania.length);
      odpowiedzi.forEach((a, i) => this.logs.push('  odpowiedź ' + (i + 1) + ': ' + a));

      this.logs.push('Wysyłam POST weryfikacja (odpowiedzi + token)...');
      this.result = await lastValueFrom(
        this.http.post<object>(`${API}/weryfikacja`, { odpowiedzi, token })
      );
      this.logs.push('Odpowiedź: ' + JSON.stringify(this.result));
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      this.logs.push('Błąd: ' + msg);
      this.result = e?.error && typeof e.error === 'object' ? e.error : { error: msg };
    } finally {
      this.loading = false;
    }
  }
}
