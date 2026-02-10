import { Component, OnInit } from '@angular/core';
import { IMainMenuElement } from 'src/app/areas/areas.interfaces';

@Component({
    selector: 'main-menu',
    templateUrl: './main-menu.component.html',
    styleUrls: ['./main-menu.component.scss'],
    standalone: false
})
export class MainMenuComponent implements OnInit {
    public mainMenu: Array<IMainMenuElement> = [];

    constructor() {}

    ngOnInit(): void {
        this.InitMainMenu();
    }

    InitMainMenu() {
        this.mainMenu = [
            {
                DisplayName: 'Dashboard',
                RouterLink: '/dashboard',
            },
            {
                DisplayName: 'Lesson s00e03',
                RouterLink: '/lessons/lesson-s00e01',
            },
            {
                DisplayName: 'Lesson s01e01',
                RouterLink: '/lessons/lesson-s01e01',
            },
            {
                DisplayName: 'OpenAI Agent',
                RouterLink: '/ai-agents/openai-agent',
            },
        ];
    }
}
